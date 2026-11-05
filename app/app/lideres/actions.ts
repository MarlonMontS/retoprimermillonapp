"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/auth";
import { actualizarPerfil, crearUsuario, listarPerfiles, obtenerPerfil, restablecerPassword } from "@/lib/data/equipo";
import { convertirEnLider, eliminarUsuario, moverEquipo, moverLeads } from "@/lib/data/movimientos";
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

/** Solo el administrador mueve o elimina gente, y nunca a otro administrador. */
async function objetivoDeAdmin(fd: FormData, roles: Rol[]) {
  const actor = await requirePerfil(["admin"]);
  const objetivo = await obtenerPerfil(String(fd.get("id")));
  if (!objetivo || !roles.includes(objetivo.rol)) throw new Error("Este usuario no se puede modificar.");
  return { actor, objetivo };
}

const mensajeError = (e: unknown, texto: string) => (e instanceof Error ? e.message : texto);
const leadsTexto = (n: number) => `${n} lead${n === 1 ? "" : "s"}`;

export async function accionCambiarGerente(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  try {
    const { objetivo } = await objetivoDeAdmin(fd, ["lider"]);
    const valor = String(fd.get("gerente_id") ?? "");
    if (valor !== "sin") {
      const gerente = await obtenerPerfil(valor);
      if (!gerente || gerente.rol !== "gerente" || !gerente.activo) return { error: "Elige un gerente activo." };
    }
    await actualizarPerfil(objetivo.id, { gerente_id: valor === "sin" ? null : valor });
    revalidar();
    return { ok: true, mensaje: "Equipo actualizado." };
  } catch (e) {
    return { error: mensajeError(e, "No se pudo mover.") };
  }
}

export async function accionMoverEquipo(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  try {
    const { objetivo } = await objetivoDeAdmin(fd, ["gerente"]);
    const n = await moverEquipo(objetivo.id, String(fd.get("destino") ?? ""));
    revalidar();
    return { ok: true, mensaje: `${n} líder${n === 1 ? "" : "es"} movido${n === 1 ? "" : "s"}.` };
  } catch (e) {
    return { error: mensajeError(e, "No se pudo mover el equipo.") };
  }
}

export async function accionConvertirEnLider(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  try {
    const { objetivo } = await objetivoDeAdmin(fd, ["gerente"]);
    await convertirEnLider(objetivo.id, String(fd.get("destino") ?? ""));
    revalidar();
    return { ok: true, mensaje: `${objetivo.nombre} ahora es líder.` };
  } catch (e) {
    return { error: mensajeError(e, "No se pudo cambiar.") };
  }
}

export async function accionMoverLeads(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  try {
    const { actor, objetivo } = await objetivoDeAdmin(fd, ["lider", "gerente"]);
    const valor = String(fd.get("destino") ?? "");
    if (!valor) return { error: "Elige un destino." };
    const { aDestino, aBolsa, destino } = await moverLeads(objetivo, valor === "bolsa" ? null : valor, actor.id);
    revalidar();
    const partes = [destino ? `${leadsTexto(aDestino)} a ${destino.nombre}` : null, aBolsa ? `${leadsTexto(aBolsa)} a la bolsa común` : null];
    return { ok: true, mensaje: `Listo: ${partes.filter(Boolean).join(", ")}.` };
  } catch (e) {
    return { error: mensajeError(e, "No se pudieron mover los leads.") };
  }
}

export async function accionEliminarUsuario(_prev: EquipoState, fd: FormData): Promise<EquipoState> {
  let rol: Rol;
  try {
    const { actor, objetivo } = await objetivoDeAdmin(fd, ["lider", "gerente"]);
    if (String(fd.get("confirmacion") ?? "").trim() !== "ELIMINAR") return { error: "Escribe ELIMINAR, en mayúsculas, para confirmar." };
    const destinoLeads = String(fd.get("destino_leads") ?? "");
    await eliminarUsuario({
      objetivo,
      actorId: actor.id,
      destinoLeads: destinoLeads && destinoLeads !== "bolsa" ? destinoLeads : null,
      destinoGerente: String(fd.get("destino_gerente") ?? "") || null,
    });
    rol = objetivo.rol;
  } catch (e) {
    return { error: mensajeError(e, "No se pudo eliminar.") };
  }
  revalidar();
  redirect(rol === "gerente" ? "/app/gerentes" : "/app/lideres");
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
