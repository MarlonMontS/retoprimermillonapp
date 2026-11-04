import { createAdminClient } from "@/lib/supabase/admin";
import type { Perfil } from "@/lib/types";

export interface Metricas {
  destinatarios: number;
  programados: number;
  enviados: number;
  entregados: number;
  abiertos: number;
  clics: number;
  rebotes: number;
  quejas: number;
  fallidos: number;
  omitidos: number;
}

interface FilaEnvio {
  campana_id: string;
  paso_id: string;
  email: string;
  estado: string;
  enviado_at: string | null;
  entregado_at: string | null;
  abierto_at: string | null;
  clic_at: string | null;
}

export function resumirEnvios(filas: FilaEnvio[]): Metricas {
  const m: Metricas = { destinatarios: new Set(filas.map((f) => f.email)).size, programados: 0, enviados: 0, entregados: 0, abiertos: 0, clics: 0, rebotes: 0, quejas: 0, fallidos: 0, omitidos: 0 };
  for (const f of filas) {
    if (f.estado === "pendiente" || f.estado === "enviando") m.programados++;
    if (f.enviado_at) m.enviados++;
    if (f.entregado_at) m.entregados++;
    if (f.abierto_at) m.abiertos++;
    if (f.clic_at) m.clics++;
    if (f.estado === "rebotado") m.rebotes++;
    if (f.estado === "queja") m.quejas++;
    if (f.estado === "fallido") m.fallidos++;
    if (f.estado === "omitido") m.omitidos++;
  }
  return m;
}

export const tasa = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 1000) / 10}%` : "—");

const CAMPOS = "campana_id, paso_id, email, estado, enviado_at, entregado_at, abierto_at, clic_at";

export async function listarCampanas(perfil: Perfil) {
  const db = createAdminClient();
  let q = db
    .from("mail_campanas")
    .select("id, nombre, intencion, estado, created_at, lanzada_at, frecuencia_dias, perfil_id, perfiles(nombre), mail_listas(nombre)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (perfil.rol !== "admin") q = q.eq("perfil_id", perfil.id);
  const { data: campanas } = await q;
  const ids = (campanas ?? []).map((c) => c.id);
  const { data: envios } = ids.length ? await db.from("mail_envios").select(CAMPOS).in("campana_id", ids).limit(50000) : { data: [] };
  return (campanas ?? []).map((c) => ({
    ...c,
    perfiles: c.perfiles as unknown as { nombre: string } | null,
    mail_listas: c.mail_listas as unknown as { nombre: string } | null,
    metricas: resumirEnvios(((envios ?? []) as FilaEnvio[]).filter((e) => e.campana_id === c.id)),
  }));
}

export async function obtenerCampana(id: string, perfil: Perfil) {
  const db = createAdminClient();
  const { data: c } = await db
    .from("mail_campanas")
    .select("*, perfiles(nombre), mail_listas(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!c || (perfil.rol !== "admin" && c.perfil_id !== perfil.id)) return null;
  const [{ data: pasos }, { data: envios }, { data: bajas }] = await Promise.all([
    db.from("mail_pasos").select("*").eq("campana_id", id).order("orden"),
    db.from("mail_envios").select(`${CAMPOS}, nombre, apellido, motivo, programado_para, aperturas, clics, error, created_at`).eq("campana_id", id).order("created_at").limit(50000),
    db.from("mail_bajas").select("email", { count: "exact" }).eq("campana_id", id).eq("motivo", "baja"),
  ]);
  const filas = (envios ?? []) as (FilaEnvio & { nombre: string | null; apellido: string | null; motivo: string | null; programado_para: string; aperturas: number; clics: number; error: string | null })[];
  return {
    campana: { ...c, perfiles: c.perfiles as unknown as { nombre: string } | null, mail_listas: c.mail_listas as unknown as { nombre: string } | null },
    pasos: (pasos ?? []).map((p) => ({ ...p, metricas: resumirEnvios(filas.filter((f) => f.paso_id === p.id)) })),
    envios: filas,
    metricas: resumirEnvios(filas),
    bajas: bajas?.length ?? 0,
  };
}

export async function listarListas(perfilId: string) {
  const db = createAdminClient();
  const { data: listas } = await db.from("mail_listas").select("id, nombre, created_at").eq("perfil_id", perfilId).order("created_at", { ascending: false });
  const res = [];
  for (const l of listas ?? []) {
    const { count } = await db.from("mail_contactos").select("id", { count: "exact", head: true }).eq("lista_id", l.id);
    res.push({ ...l, contactos: count ?? 0 });
  }
  return res;
}
