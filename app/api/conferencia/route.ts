import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizarWhatsapp } from "@/lib/phone";
import { registrarConferencia } from "@/lib/data/conferencia";

const schema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(120),
  email: z.string().trim().max(120),
  whatsapp: z.string().trim().min(10, "Revisa tu número de WhatsApp").max(25),
  utm: z.record(z.string(), z.string().max(120)).optional().default({}),
  pagina: z.string().trim().max(500).optional().default(""),
  empresa: z.string().optional().default(""),
});

/** Registro público a la conferencia de apertura en Monterrey. No crea leads del Reto. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." }, { status: 400 });
  }
  const d = parsed.data;
  if (d.empresa) return NextResponse.json({ ok: true }); // campo trampa para bots

  const email = d.email.toLowerCase();
  if (!z.email().safeParse(email).success) return NextResponse.json({ error: "Revisa tu correo." }, { status: 400 });
  const whatsapp = normalizarWhatsapp(d.whatsapp);
  if (!whatsapp) return NextResponse.json({ error: "Revisa tu número de WhatsApp (10 dígitos)." }, { status: 400 });

  try {
    await registrarConferencia({ nombre: d.nombre, email, whatsapp, utm: d.utm, pagina: d.pagina || req.headers.get("referer") });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("conferencia", e);
    return NextResponse.json({ error: "No pudimos guardar tu registro. Intenta de nuevo." }, { status: 500 });
  }
}
