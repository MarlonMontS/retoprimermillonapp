import { createAdminClient } from "@/lib/supabase/admin";
import { incluye, type Scope } from "@/lib/data/scope";
import type { Ciudad, Lead, LeadConRelaciones, LeadEstatus, LeadEvento } from "@/lib/types";
import { ESTATUS_PENDIENTES } from "@/lib/types";

const SELECT_LEAD = `*,
  lider:perfiles!leads_lider_id_fkey(id, nombre, gerente_id, rol),
  fuente:fuentes(id, slug, nombre, tipo)`;

export interface FiltrosLeads {
  q?: string;
  estatus?: LeadEstatus | "pendientes" | "";
  ciudad?: Ciudad | "";
  lider?: string;
  gerente?: string;
  fuente?: string;
  bolsa?: "si" | "no" | "sin_asignar" | "";
  orden?: "recientes" | "antiguos";
  page?: number;
  limit?: number;
}

function sanitizar(q: string) {
  return q.replace(/[,()%]/g, " ").trim();
}

export async function listarLeads(
  scope: Scope,
  f: FiltrosLeads = {}
): Promise<{ leads: LeadConRelaciones[]; total: number; page: number; pages: number }> {
  const admin = createAdminClient();
  const limit = Math.min(Math.max(f.limit ?? 50, 10), 200);
  const page = Math.max(f.page ?? 1, 1);

  let q = admin.from("leads").select(SELECT_LEAD, { count: "exact" });

  if (scope.tipo === "ids") q = q.in("lider_id", scope.ids);

  if (f.estatus === "pendientes") q = q.in("estatus", ESTATUS_PENDIENTES);
  else if (f.estatus) q = q.eq("estatus", f.estatus);

  if (f.ciudad) q = q.eq("ciudad", f.ciudad);
  if (f.lider) q = q.eq("lider_id", f.lider);
  if (f.fuente) q = q.eq("fuente_id", f.fuente);
  if (f.bolsa === "si") q = q.eq("desde_bolsa", true);
  if (f.bolsa === "no") q = q.eq("desde_bolsa", false);
  if (f.bolsa === "sin_asignar") q = q.is("lider_id", null);

  if (f.gerente) {
    const { data: lids } = await admin.from("perfiles").select("id").eq("gerente_id", f.gerente);
    q = q.in("lider_id", [f.gerente, ...(lids ?? []).map((l) => l.id as string)]);
  }

  if (f.q) {
    const s = sanitizar(f.q);
    if (s) {
      const digits = s.replace(/\D/g, "");
      const partes = [`nombre.ilike.%${s}%`, `apellido.ilike.%${s}%`, `email.ilike.%${s}%`];
      if (digits.length >= 4) partes.push(`whatsapp.ilike.%${digits}%`);
      q = q.or(partes.join(","));
    }
  }

  const from = (page - 1) * limit;
  q = q.order("created_at", { ascending: f.orden === "antiguos" }).range(from, from + limit - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  const leads = (data ?? []) as unknown as LeadConRelaciones[];
  await marcarPosiblesDuplicados(leads);
  const total = count ?? leads.length;
  return { leads, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Marca leads cuyo WhatsApp aparece en más de un registro no duplicado. */
async function marcarPosiblesDuplicados(leads: LeadConRelaciones[]) {
  const numeros = Array.from(new Set(leads.map((l) => l.whatsapp)));
  if (numeros.length === 0) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("leads")
    .select("whatsapp")
    .in("whatsapp", numeros)
    .neq("estatus", "duplicado");
  const conteo = new Map<string, number>();
  for (const r of data ?? []) conteo.set(r.whatsapp, (conteo.get(r.whatsapp) ?? 0) + 1);
  for (const l of leads) l.posible_duplicado = (conteo.get(l.whatsapp) ?? 0) > 1;
}

export interface LeadDetalle extends LeadConRelaciones {
  eventos: LeadEvento[];
  copias: LeadConRelaciones[];
  calificador: { id: string; nombre: string } | null;
}

export async function obtenerLead(id: string, scope: Scope): Promise<LeadDetalle | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leads")
    .select(`${SELECT_LEAD}, calificador:perfiles!leads_calificado_por_fkey(id, nombre)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const lead = data as unknown as LeadDetalle;
  if (!incluye(scope, lead.lider_id)) return null;

  const [{ data: eventos }, { data: copias }] = await Promise.all([
    admin
      .from("lead_eventos")
      .select("*, actor:perfiles(id, nombre)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    admin.from("leads").select(SELECT_LEAD).eq("whatsapp", lead.whatsapp).neq("id", id),
  ]);
  lead.eventos = (eventos ?? []) as unknown as LeadEvento[];
  lead.copias = (copias ?? []) as unknown as LeadConRelaciones[];
  lead.posible_duplicado = lead.copias.some((c) => c.estatus !== "duplicado") && lead.estatus !== "duplicado";
  return lead;
}

/** Lead "ligero" para métricas. */
export interface LeadLigero {
  id: string;
  estatus: LeadEstatus;
  ciudad: Ciudad | null;
  created_at: string;
  lider_id: string | null;
  desde_bolsa: boolean;
  fuente: { tipo: string; nombre: string } | null;
}

export async function leadsLigeros(scope: Scope): Promise<LeadLigero[]> {
  const admin = createAdminClient();
  let q = admin
    .from("leads")
    .select("id, estatus, ciudad, created_at, lider_id, desde_bolsa, fuente:fuentes(tipo, nombre)")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (scope.tipo === "ids") q = q.in("lider_id", scope.ids);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadLigero[];
}

export async function contarBolsaSinAsignar(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("lider_id", null)
    .not("estatus", "in", "(duplicado,descartado,no_calificado)");
  return count ?? 0;
}

// ---------- Mutaciones ----------

export async function registrarLlamada(input: {
  leadId: string;
  actorId: string;
  resultado: LeadEstatus;
  notas?: string | null;
  respuestas?: Record<string, string> | null;
}): Promise<Lead> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("registrar_llamada", {
    p_lead: input.leadId,
    p_actor: input.actorId,
    p_resultado: input.resultado,
    p_notas: input.notas ?? null,
    p_respuestas: input.respuestas ?? null,
  });
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function reasignarLead(input: {
  leadId: string;
  actorId: string;
  liderId: string | null;
  desdeBolsa?: boolean;
}): Promise<Lead> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reasignar_lead", {
    p_lead: input.leadId,
    p_actor: input.actorId,
    p_lider: input.liderId,
    p_desde_bolsa: input.desdeBolsa ?? false,
  });
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function repartirBolsa(actorId: string | null): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("repartir_bolsa", { p_actor: actorId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function agregarNota(leadId: string, actorId: string, texto: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("lead_eventos").insert({
    lead_id: leadId,
    actor_id: actorId,
    tipo: "nota",
    detalle: { texto },
  });
  if (error) throw new Error(error.message);
  await admin.from("leads").update({ notas: texto }).eq("id", leadId);
}

export async function actualizarLead(
  leadId: string,
  actorId: string,
  patch: Partial<Pick<Lead, "nombre" | "apellido" | "whatsapp" | "email" | "ciudad" | "experiencia" | "motivo" | "como_se_entero" | "etapa" | "notas">>
) {
  const admin = createAdminClient();
  const { error } = await admin.from("leads").update(patch).eq("id", leadId);
  if (error) throw new Error(error.message);
  await admin.from("lead_eventos").insert({
    lead_id: leadId,
    actor_id: actorId,
    tipo: "edicion",
    detalle: { campos: Object.keys(patch) },
  });
}

export interface RegistroPublico {
  nombre: string;
  apellido: string | null;
  whatsapp: string;
  email: string | null;
  ciudad: Ciudad | null;
  experiencia: string | null;
  motivo: string | null;
  como_se_entero: string | null;
  fuente_slug: string | null;
  lider_id: string | null;
  utm: Record<string, string>;
  origen: "link" | "selector" | "manual";
  consentimiento: boolean;
}

export async function registrarLead(r: RegistroPublico): Promise<Lead> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("registrar_lead", {
    p_nombre: r.nombre,
    p_apellido: r.apellido,
    p_whatsapp: r.whatsapp,
    p_email: r.email,
    p_ciudad: r.ciudad,
    p_experiencia: r.experiencia,
    p_motivo: r.motivo,
    p_como_se_entero: r.como_se_entero,
    p_fuente_slug: r.fuente_slug,
    p_lider_id: r.lider_id,
    p_utm: r.utm,
    p_origen: r.origen,
    p_consentimiento: r.consentimiento,
  });
  if (error) throw new Error(error.message);
  return data as Lead;
}

/** Inserción directa para migraciones (no corre la ruleta). */
export interface FilaImportada {
  nombre: string;
  apellido: string | null;
  whatsapp: string;
  email: string | null;
  ciudad: Ciudad | null;
  experiencia: string | null;
  motivo: string | null;
  como_se_entero: string | null;
  created_at: string | null;
  external_id: string | null;
  lider_id: string | null;
}

export async function importarLeads(
  filas: FilaImportada[],
  actorId: string,
  opts: { omitirWhatsappExistente: boolean }
): Promise<{ insertados: number; omitidos: number; aBolsaPorCiudad: number; errores: string[] }> {
  const admin = createAdminClient();
  let insertados = 0;
  let omitidos = 0;
  let aBolsaPorCiudad = 0;
  const errores: string[] = [];

  // Regla por ciudad: una fila con responsable de otra ciudad entra sin responsable (bolsa)
  const { getConfig, ciudadCompatible } = await import("@/lib/data/config");
  const cfg = await getConfig();
  const liderIds = Array.from(new Set(filas.map((f) => f.lider_id).filter(Boolean))) as string[];
  const ciudadLider = new Map<string, Ciudad | null>();
  if (liderIds.length) {
    const { data } = await admin.from("perfiles").select("id, ciudad").in("id", liderIds);
    for (const p of data ?? []) ciudadLider.set(p.id as string, (p.ciudad as Ciudad | null) ?? null);
  }
  for (const f of filas) {
    if (f.lider_id && !ciudadCompatible(cfg.ciudad_estricta, f.ciudad, ciudadLider.get(f.lider_id))) {
      f.lider_id = null;
      aBolsaPorCiudad++;
    }
  }

  const numeros = filas.map((f) => f.whatsapp);
  const externos = filas.map((f) => f.external_id).filter(Boolean) as string[];
  const [{ data: porNumero }, { data: porExterno }] = await Promise.all([
    numeros.length ? admin.from("leads").select("whatsapp").in("whatsapp", numeros) : { data: [] },
    externos.length ? admin.from("leads").select("external_id").in("external_id", externos) : { data: [] },
  ]);
  const existentes = new Set((porNumero ?? []).map((r) => r.whatsapp as string));
  const externosExistentes = new Set((porExterno ?? []).map((r) => r.external_id as string));
  const vistos = new Set<string>();

  for (const f of filas) {
    if (f.external_id && externosExistentes.has(f.external_id)) { omitidos++; continue; }
    if (opts.omitirWhatsappExistente && (existentes.has(f.whatsapp) || vistos.has(f.whatsapp))) { omitidos++; continue; }
    vistos.add(f.whatsapp);
    const { data, error } = await admin
      .from("leads")
      .insert({
        nombre: f.nombre,
        apellido: f.apellido,
        whatsapp: f.whatsapp,
        email: f.email,
        ciudad: f.ciudad,
        experiencia: f.experiencia,
        motivo: f.motivo,
        como_se_entero: f.como_se_entero,
        created_at: f.created_at ?? new Date().toISOString(),
        external_id: f.external_id,
        lider_id: f.lider_id,
        origen_registro: "import",
        consentimiento: true,
      })
      .select("id")
      .single();
    if (error) { errores.push(`${f.nombre} (${f.whatsapp}): ${error.message}`); continue; }
    await admin.from("lead_eventos").insert({
      lead_id: data.id,
      actor_id: actorId,
      tipo: "import",
      detalle: { external_id: f.external_id, lider_id: f.lider_id },
    });
    insertados++;
  }
  return { insertados, omitidos, aBolsaPorCiudad, errores };
}
