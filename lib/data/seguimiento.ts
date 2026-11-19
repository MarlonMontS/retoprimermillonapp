import { createAdminClient } from "@/lib/supabase/admin";
import type { Scope } from "@/lib/data/scope";
import type { Etapa } from "@/lib/types";
import { pesos, VENTA_ESTATUS_LABEL, VENTA_TIPO_LABEL, type Participante, type Sesion, type Venta } from "@/lib/seguimiento";

export * from "@/lib/seguimiento";

/**
 * Seguimiento de participantes del Reto (invitados calificados):
 * estatus (leads.etapa), asistencia a sesiones y ventas.
 */

/** Lee todas las filas de una consulta, de mil en mil. */
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return filas;
  }
}

export async function listarSesiones(): Promise<Sesion[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("sesiones").select("id, nombre, fecha, hora, sede, orden").order("fecha").order("orden").order("nombre");
  if (error) throw new Error(error.message);
  return (data ?? []) as Sesion[];
}

export async function guardarSesion(s: Omit<Sesion, "id"> & { id?: string }) {
  const admin = createAdminClient();
  const fila = { nombre: s.nombre, fecha: s.fecha, hora: s.hora, sede: s.sede, orden: s.orden };
  const { error } = s.id ? await admin.from("sesiones").update(fila).eq("id", s.id) : await admin.from("sesiones").insert(fila);
  if (error) throw new Error(error.message);
}

export async function eliminarSesion(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("sesiones").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Participantes (calificados) dentro del alcance del usuario. */
export async function listarParticipantes(scope: Scope): Promise<Participante[]> {
  const admin = createAdminClient();
  return todas<Participante>((desde, hasta) => {
    let q = admin
      .from("leads")
      .select("id, nombre, apellido, whatsapp, ciudad, etapa, lider:perfiles!leads_lider_id_fkey(id, nombre)")
      .eq("estatus", "calificado")
      .order("nombre")
      .range(desde, hasta);
    if (scope.tipo === "ids") q = q.in("lider_id", scope.ids);
    return q;
  });
}

/** Asistencias de un conjunto de participantes: mapa lead -> sesión -> asistió. */
export async function asistenciasDe(leadIds: string[]) {
  const admin = createAdminClient();
  const ids = new Set(leadIds);
  const filas = await todas<{ lead_id: string; sesion_id: string; asistio: boolean }>((desde, hasta) =>
    admin.from("asistencias").select("lead_id, sesion_id, asistio").range(desde, hasta)
  );
  const mapa = new Map<string, Map<string, boolean>>();
  for (const f of filas) {
    if (!ids.has(f.lead_id)) continue;
    if (!mapa.has(f.lead_id)) mapa.set(f.lead_id, new Map());
    mapa.get(f.lead_id)!.set(f.sesion_id, f.asistio);
  }
  return mapa;
}

export async function ventasDe(leadIds: string[]): Promise<Venta[]> {
  const admin = createAdminClient();
  const ids = new Set(leadIds);
  const filas = await todas<Venta>((desde, hasta) =>
    admin.from("ventas").select("id, lead_id, fecha, tipo, desarrollo, monto, estatus, notas, created_at").order("fecha", { ascending: false }).range(desde, hasta)
  );
  return filas.filter((v) => ids.has(v.lead_id)).map((v) => ({ ...v, monto: Number(v.monto) }));
}

/** Guarda la lista de una sesión. valor vacío borra la marca. */
export async function guardarLista(sesionId: string, marcas: { leadId: string; valor: "si" | "no" | "" }[], actorId: string) {
  const admin = createAdminClient();
  const poner = marcas.filter((m) => m.valor);
  const quitar = marcas.filter((m) => !m.valor).map((m) => m.leadId);
  if (poner.length) {
    const { error } = await admin.from("asistencias").upsert(
      poner.map((m) => ({ lead_id: m.leadId, sesion_id: sesionId, asistio: m.valor === "si", registrado_por: actorId, updated_at: new Date().toISOString() })),
      { onConflict: "lead_id,sesion_id" }
    );
    if (error) throw new Error(error.message);
  }
  if (quitar.length) {
    const { error } = await admin.from("asistencias").delete().eq("sesion_id", sesionId).in("lead_id", quitar);
    if (error) throw new Error(error.message);
  }
}

export async function cambiarEtapa(leadId: string, etapa: Etapa, actorId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("leads").update({ etapa }).eq("id", leadId);
  if (error) throw new Error(error.message);
  await admin.from("lead_eventos").insert({ lead_id: leadId, actor_id: actorId, tipo: "edicion", detalle: { etapa } });
}

export async function guardarVenta(v: Omit<Venta, "id" | "created_at"> & { id?: string }, actorId: string) {
  const admin = createAdminClient();
  const fila = {
    lead_id: v.lead_id,
    fecha: v.fecha,
    tipo: v.tipo,
    desarrollo: v.desarrollo,
    monto: v.monto,
    estatus: v.estatus,
    notas: v.notas,
    updated_at: new Date().toISOString(),
  };
  const { error } = v.id
    ? await admin.from("ventas").update(fila).eq("id", v.id).eq("lead_id", v.lead_id)
    : await admin.from("ventas").insert({ ...fila, registrado_por: actorId });
  if (error) throw new Error(error.message);
  await admin.from("lead_eventos").insert({
    lead_id: v.lead_id,
    actor_id: actorId,
    tipo: "nota",
    detalle: { texto: `${v.id ? "Venta actualizada" : "Venta registrada"}: ${VENTA_TIPO_LABEL[v.tipo]}${v.desarrollo ? ` en ${v.desarrollo}` : ""}, ${pesos(v.monto)} (${VENTA_ESTATUS_LABEL[v.estatus].toLowerCase()}).` },
  });
}

export async function eliminarVenta(id: string, leadId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("ventas").delete().eq("id", id).eq("lead_id", leadId);
  if (error) throw new Error(error.message);
}
