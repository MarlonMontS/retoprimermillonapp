import { NextResponse } from "next/server";
import { z } from "zod";
import { crearUsuario, existeAdmin } from "@/lib/data/equipo";

const schema = z.object({
  secret: z.string().min(1),
  nombre: z.string().min(2),
  email: z.email(),
  password: z.string().min(8).optional(),
});

/**
 * Crea el primer administrador. Solo funciona mientras no exista ninguno
 * y con el SETUP_SECRET correcto.
 *
 * curl -X POST https://.../api/setup -H "content-type: application/json" \
 *   -d '{"secret":"...","nombre":"Marlon","email":"marlon@...","password":"..."}'
 */
export async function POST(req: Request) {
  const expected = process.env.SETUP_SECRET;
  if (!expected) return NextResponse.json({ error: "SETUP_SECRET no configurado" }, { status: 500 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  if (body.data.secret !== expected) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (await existeAdmin()) {
    return NextResponse.json({ error: "Ya existe un administrador. Usa la app para crear más usuarios." }, { status: 409 });
  }

  const { perfil, password } = await crearUsuario({
    nombre: body.data.nombre,
    email: body.data.email,
    rol: "admin",
    password: body.data.password,
  });

  return NextResponse.json({ ok: true, id: perfil.id, email: perfil.email, password });
}
