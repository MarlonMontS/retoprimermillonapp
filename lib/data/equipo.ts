import { createAdminClient } from "@/lib/supabase/admin";
import { generarPassword } from "@/lib/utils";
import { normalizarWhatsapp } from "@/lib/phone";
import { slugUnico } from "@/lib/data/fuentes";
import type { Ciudad, LiderEstado, Perfil, Rol } from "@/lib/types";

/** Estado de líderes (y opcionalmente gerentes) desde la vista lideres_estado. */
export async function listarLideresEstado(opts: {
  gerenteId?: string;
  incluirGerentes?: boolean;
  soloActivos?: boolean;
} = {}): Promise<LiderEstado[]> {
  const admin = createAdminClient();
  let q = admin.from("lideres_estado").select("*");
  if (!opts.incluirGerentes) q = q.eq("rol", "lider");
  if (opts.gerenteId) q = q.or(`gerente_id.eq.${opts.gerenteId},id.eq.${opts.gerenteId}`);
  if (opts.soloActivos) q = q.eq("activo", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const filas = (data ?? []) as LiderEstado[];
  // Ranking: calificados desc, registrados desc, nombre
  filas.sort(
    (a, b) =>
      b.calificados - a.calificados || b.registrados - a.registrados || a.nombre.localeCompare(b.nombre)
  );
  return filas;
}

export async function obtenerLiderEstado(id: string): Promise<LiderEstado | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("lideres_estado").select("*").eq("id", id).maybeSingle();
  return (data as LiderEstado) ?? null;
}

export async function listarPerfiles(rol?: Rol): Promise<Perfil[]> {
  const admin = createAdminClient();
  let q = admin.from("perfiles").select("*").order("nombre");
  if (rol) q = q.eq("rol", rol);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Perfil[];
}

export async function obtenerPerfil(id: string): Promise<Perfil | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("perfiles").select("*").eq("id", id).maybeSingle();
  return (data as Perfil) ?? null;
}

export interface NuevoUsuario {
  nombre: string;
  email: string;
  telefono?: string | null;
  rol: Rol;
  gerente_id?: string | null;
  ciudad?: Ciudad | null;
  password?: string;
}

/**
 * Crea el usuario en Supabase Auth, su perfil y, si es líder o gerente,
 * su fuente (enlace de invitación). Devuelve la contraseña generada.
 */
export async function crearUsuario(input: NuevoUsuario): Promise<{ perfil: Perfil; password: string }> {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const password = input.password?.trim() || generarPassword();

  const { data: creado, error: errAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: input.nombre },
  });
  if (errAuth || !creado.user) {
    throw new Error(errAuth?.message ?? "No se pudo crear el usuario");
  }

  const slug = input.rol === "admin" ? null : await slugUnico(input.nombre);

  const { data: perfil, error: errPerfil } = await admin
    .from("perfiles")
    .insert({
      id: creado.user.id,
      nombre: input.nombre.trim(),
      email,
      telefono: normalizarWhatsapp(input.telefono) ?? input.telefono ?? null,
      rol: input.rol,
      gerente_id: input.rol === "lider" ? input.gerente_id ?? null : null,
      ciudad: input.ciudad ?? null,
      slug,
    })
    .select("*")
    .single();
  if (errPerfil) {
    await admin.auth.admin.deleteUser(creado.user.id);
    throw new Error(errPerfil.message);
  }

  if (slug) {
    const { error: errFuente } = await admin.from("fuentes").insert({
      slug,
      nombre: input.nombre.trim(),
      tipo: input.rol,
      perfil_id: creado.user.id,
    });
    if (errFuente) throw new Error(errFuente.message);
  }

  return { perfil: perfil as Perfil, password };
}

export async function actualizarPerfil(
  id: string,
  patch: Partial<Pick<Perfil, "nombre" | "telefono" | "gerente_id" | "ciudad" | "activo" | "bolsa_manual" | "rol">>
) {
  const admin = createAdminClient();
  const limpio = { ...patch };
  if ("telefono" in limpio) limpio.telefono = normalizarWhatsapp(limpio.telefono) ?? limpio.telefono ?? null;
  const { error } = await admin.from("perfiles").update(limpio).eq("id", id);
  if (error) throw new Error(error.message);
  if (patch.nombre) {
    await admin.from("fuentes").update({ nombre: patch.nombre }).eq("perfil_id", id);
  }
  if (typeof patch.activo === "boolean") {
    await admin.from("fuentes").update({ activo: patch.activo }).eq("perfil_id", id);
  }
}

export async function restablecerPassword(id: string): Promise<string> {
  const admin = createAdminClient();
  const password = generarPassword();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
  return password;
}

export async function cambiarPasswordPropia(id: string, password: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
}

export async function existeAdmin(): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin.from("perfiles").select("id", { count: "exact", head: true }).eq("rol", "admin");
  return (count ?? 0) > 0;
}
