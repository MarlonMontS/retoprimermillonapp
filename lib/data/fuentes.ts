import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import type { Ciudad, Fuente, FuenteTipo } from "@/lib/types";

export interface FuenteConPerfil extends Fuente {
  perfil: { id: string; nombre: string; rol: string; activo: boolean } | null;
  leads?: number;
}

/** Todas las fuentes con su conteo de leads. */
export async function listarFuentes(): Promise<FuenteConPerfil[]> {
  const admin = createAdminClient();
  const [{ data: fuentes }, { data: leads }] = await Promise.all([
    admin
      .from("fuentes")
      .select("*, perfil:perfiles(id, nombre, rol, activo)")
      .order("created_at", { ascending: true }),
    admin.from("leads").select("fuente_id").neq("estatus", "duplicado"),
  ]);
  const conteo = new Map<string, number>();
  for (const l of leads ?? []) {
    if (l.fuente_id) conteo.set(l.fuente_id, (conteo.get(l.fuente_id) ?? 0) + 1);
  }
  return ((fuentes ?? []) as FuenteConPerfil[]).map((f) => ({ ...f, leads: conteo.get(f.id) ?? 0 }));
}

/** Fuente pública por slug, con el nombre de quien invita si es un líder o gerente. */
export async function fuentePorSlug(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("fuentes")
    .select("id, slug, nombre, tipo, activo, perfil:perfiles(id, nombre, ciudad, activo)")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || !data.activo) return null;
  const perfil = (Array.isArray(data.perfil) ? data.perfil[0] : data.perfil) as
    | { id: string; nombre: string; ciudad: Ciudad | null; activo: boolean }
    | null;
  if (perfil && !perfil.activo) return null;
  return { id: data.id, slug: data.slug, nombre: data.nombre, tipo: data.tipo as FuenteTipo, perfil };
}

/** Líderes y gerentes activos para el selector "¿Quién te invitó?" (solo nombre y ciudad). */
export async function listarInvitadoresPublicos() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("perfiles")
    .select("id, nombre, ciudad, rol")
    .in("rol", ["lider", "gerente"])
    .eq("activo", true)
    .order("nombre");
  return (data ?? []) as { id: string; nombre: string; ciudad: Ciudad | null; rol: string }[];
}

/** Genera un slug único a partir de un nombre. */
export async function slugUnico(base: string): Promise<string> {
  const admin = createAdminClient();
  let slug = slugify(base) || "enlace";
  const original = slug;
  for (let i = 2; i < 100; i++) {
    const { data } = await admin.from("fuentes").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${original}-${i}`;
  }
  return `${original}-${Date.now()}`;
}

export async function crearFuenteCampana(input: { nombre: string; tipo: FuenteTipo; slug?: string }) {
  const admin = createAdminClient();
  const slug = input.slug ? await slugUnico(input.slug) : await slugUnico(input.nombre);
  const { data, error } = await admin
    .from("fuentes")
    .insert({ nombre: input.nombre, tipo: input.tipo, slug })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Fuente;
}

export async function activarFuente(id: string, activo: boolean) {
  const admin = createAdminClient();
  const { error } = await admin.from("fuentes").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);
}
