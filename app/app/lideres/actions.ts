"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/auth";
import { actualizarPerfil, crearUsuario, listarPerfiles, obtenerPerfil, restablecerPassword } from "@/lib/data/equipo";
import { detectarCiudad } from "@/lib/utils";
import type { Ciudad, Perfil, Rol } from "@/lib/types";

export interface EquipoState {
  ok?: boolean;
  error?: string;
  mensaje?: string;
  credenciales?: { nombre: string; email: string; password: string }[];
  errores?: string[];
}

function revalidar() {
  revalidatePath("/app", "layout");
}

/** ¿Puede este usuario administrar a ese perfil? */
async function puedeAdministrar(actor: Perfil, objetivo: Perfil | null): Promise<boolean> {
  if (!objetivo) return false;
  if (actor.rol === "admin") return true;
  if (actor.rol === "gerente") return objetivo.rol === "lider" && objetivo.gerente_id === actor.id;
  return false;
}

export async function accionCrearUsuario(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  const actor = await requirePerfil(["admin", "gerente"]);
  try {
    let rol = String(fd.get("rol") ?? "lider") as Rol;
    let gerente_id = String(fd.get("gerente_id") ?? "") || null;
    if (actor.rol === "gerente") {
      rol = "lider";
      gerente_id = actor.id;
    }
    const nombre = String(fd.get("nombre") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (nombre.length < 2) return { error: "Escribe el nombre." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Revisa el correo." };

    const { perfil, password } = await crearUsuario({
      nombre,
      email,
      telefono: String(fd.get("telefono") ?? "").trim() || null,
      rol,
      gerente_id: rol === "lider" ? gerente_id : null,
      ciudad: (String(fd.get("ciudad") ?? "") as Ciudad) || null,
      password: String(fd.get("password") ?? "").trim() || undefined,
    });
    revalidar();
    return { ok: true, credenciales: [{ nombre: perfil.nombre, email: perfil.email, password }] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear el usuario.";
    return { error: /already|registered|exists/i.test(msg) ? "Ya existe un usuario con ese correo." : msg };
  }
}

export async function accionResetPassword(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  const actor = await requirePerfil(["admin", "gerente"]);
  const id = String(fd.get("id"));
  const objetivo = await obtenerPerfil(id);
  if (!(await puedeAdministrar(actor, objetivo)) || !objetivo) return { error: "Sin permiso." };
  try {
    const password = await restablecerPassword(id);
    return { ok: true, credenciales: [{ nombre: objetivo.nombre, email: objetivo.email, password }] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo generar la contraseña." };
  }
}

export async function accionActualizarPerfil(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  const actor = await requirePerfil(["admin", "gerente"]);
  const id = String(fd.get("id"));
  const objetivo = await obtenerPerfil(id);
  if (!(await puedeAdministrar(actor, objetivo)) || !objetivo) return { error: "Sin permiso." };
  try {
    const patch: Parameters<typeof actualizarPerfil>[1] = {
      nombre: String(fd.get("nombre") ?? "").trim() || objetivo.nombre,
      telefono: String(fd.get("telefono") ?? "").trim() || null,
      ciudad: (String(fd.get("ciudad") ?? "") as Ciudad) || null,
    };
    if (actor.rol === "admin") {
      if (objetivo.rol === "lider") patch.gerente_id = String(fd.get("gerente_id") ?? "") || null;
      patch.activo = fd.get("activo") === "on";
      const bolsa = String(fd.get("bolsa_manual") ?? "auto");
      patch.bolsa_manual = bolsa === "auto" ? null : bolsa === "abierta";
    }
    await actualizarPerfil(id, patch);
    revalidar();
    return { ok: true, mensaje: "Datos guardados." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}

/**
 * Importa líderes pegados desde una hoja de cálculo.
 * Columnas (separadas por tabulador o coma): nombre, correo, teléfono, ciudad, gerente (correo o nombre)
 */
export async function accionImportarEquipo(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  await requirePerfil(["admin"]);
  const texto = String(fd.get("texto") ?? "").trim();
  const rolDefault = (String(fd.get("rol") ?? "lider") as Rol) === "gerente" ? "gerente" : "lider";
  if (!texto) return { error: "Pega al menos una fila." };

  const gerentes = await listarPerfiles("gerente");
  const porEmail = new Map(gerentes.map((g) => [g.email.toLowerCase(), g.id]));
  const porNombre = new Map(gerentes.map((g) => [g.nombre.trim().toLowerCase(), g.id]));

  const credenciales: EquipoState["credenciales"] = [];
  const errores: string[] = [];

  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [i, linea] of lineas.entries()) {
    const cols = (linea.includes("\t") ? linea.split("\t") : linea.split(/[,;]/)).map((c) => c.trim());
    const [nombre, email, telefono, ciudadTxt, gerenteTxt] = cols;
    if (i === 0 && /^(nombre|name)$/i.test(nombre ?? "")) continue; // encabezado
    if (!nombre || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errores.push(`Fila ${i + 1}: falta nombre o correo válido (${linea.slice(0, 60)})`);
      continue;
    }
    const ciudad = detectarCiudad(ciudadTxt);
    let gerente_id: string | null = null;
    if (rolDefault === "lider" && gerenteTxt) {
      gerente_id = porEmail.get(gerenteTxt.toLowerCase()) ?? porNombre.get(gerenteTxt.toLowerCase()) ?? null;
      if (!gerente_id) errores.push(`Fila ${i + 1}: no encontré al gerente "${gerenteTxt}"; ${nombre} quedó sin gerente.`);
    }
    try {
      const { perfil, password } = await crearUsuario({
        nombre,
        email: email.toLowerCase(),
        telefono: telefono || null,
        rol: rolDefault,
        gerente_id,
        ciudad,
      });
      credenciales.push({ nombre: perfil.nombre, email: perfil.email, password });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      errores.push(`Fila ${i + 1} (${email}): ${/already|registered|exists/i.test(msg) ? "ya existe un usuario con ese correo" : msg}`);
    }
  }
  revalidar();
  return { ok: credenciales.length > 0, credenciales, errores, mensaje: `${credenciales.length} usuario${credenciales.length === 1 ? "" : "s"} creado${credenciales.length === 1 ? "" : "s"}.` };
}
