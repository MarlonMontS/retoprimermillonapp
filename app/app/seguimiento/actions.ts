"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/auth";
import { scopeDe } from "@/lib/data/scope";
import { obtenerLead } from "@/lib/data/leads";
import {
  cambiarEtapa,
  eliminarVenta,
  guardarLista,
  guardarVenta,
  listarParticipantes,
  listarSesiones,
  type VentaEstatus,
  type VentaTipo,
} from "@/lib/data/seguimiento";
import { ETAPA_LABEL, type Etapa } from "@/lib/types";

export interface SeguimientoState {
  ok?: boolean;
  mensaje?: string;
  error?: string;
}

/** Líder, gerente o admin sobre un participante (calificado) de su alcance. */
async function participanteConPermiso(leadId: string) {
  const perfil = await requirePerfil();
  const lead = await obtenerLead(leadId, await scopeDe(perfil));
  if (!lead) throw new Error("No tienes permiso sobre esta persona.");
  if (lead.estatus !== "calificado") throw new Error("El seguimiento es solo para participantes calificados.");
  return { perfil, lead };
}

function revalidar(leadId?: string) {
  revalidatePath("/app/seguimiento");
  if (leadId) revalidatePath(`/app/leads/${leadId}`);
}

const error = (e: unknown, texto: string): SeguimientoState => ({ error: e instanceof Error ? e.message : texto });

export async function accionEtapa(_prev: SeguimientoState, fd: FormData): Promise<SeguimientoState> {
  try {
    const leadId = String(fd.get("lead_id"));
    const etapa = String(fd.get("etapa")) as Etapa;
    if (!(etapa in ETAPA_LABEL)) return { error: "Elige un estatus." };
    const { perfil } = await participanteConPermiso(leadId);
    await cambiarEtapa(leadId, etapa, perfil.id);
    revalidar(leadId);
    return { ok: true, mensaje: "Estatus guardado." };
  } catch (e) {
    return error(e, "No se pudo guardar el estatus.");
  }
}

/** Pasar lista de una sesión: campos m:<leadId> con si, no o vacío. */
export async function accionPasarLista(_prev: SeguimientoState, fd: FormData): Promise<SeguimientoState> {
  try {
    const perfil = await requirePerfil();
    const sesionId = String(fd.get("sesion_id"));
    const sesion = (await listarSesiones()).find((s) => s.id === sesionId);
    if (!sesion) return { error: "Esa sesión ya no existe." };
    const permitidos = new Set((await listarParticipantes(await scopeDe(perfil))).map((p) => p.id));
    const marcas: { leadId: string; valor: "si" | "no" | "" }[] = [];
    for (const [k, v] of fd.entries()) {
      if (!k.startsWith("m:")) continue;
      const leadId = k.slice(2);
      if (!permitidos.has(leadId)) return { error: "La lista incluye a alguien fuera de tu equipo." };
      marcas.push({ leadId, valor: v === "si" || v === "no" ? v : "" });
    }
    await guardarLista(sesionId, marcas, perfil.id);
    revalidar();
    const asistieron = marcas.filter((m) => m.valor === "si").length;
    return { ok: true, mensaje: `Lista guardada: ${asistieron} de ${marcas.length} asistieron.` };
  } catch (e) {
    return error(e, "No se pudo guardar la lista.");
  }
}

/** Asistencia de una persona a todas sus sesiones: campos s:<sesionId>. */
export async function accionAsistenciaPersona(_prev: SeguimientoState, fd: FormData): Promise<SeguimientoState> {
  try {
    const leadId = String(fd.get("lead_id"));
    const { perfil } = await participanteConPermiso(leadId);
    const sesiones = new Set((await listarSesiones()).map((s) => s.id));
    for (const [k, v] of fd.entries()) {
      if (!k.startsWith("s:") || !sesiones.has(k.slice(2))) continue;
      await guardarLista(k.slice(2), [{ leadId, valor: v === "si" || v === "no" ? v : "" }], perfil.id);
    }
    revalidar(leadId);
    return { ok: true, mensaje: "Asistencia guardada." };
  } catch (e) {
    return error(e, "No se pudo guardar la asistencia.");
  }
}

export async function accionGuardarVenta(_prev: SeguimientoState, fd: FormData): Promise<SeguimientoState> {
  try {
    const leadId = String(fd.get("lead_id"));
    const { perfil } = await participanteConPermiso(leadId);
    const tipo = String(fd.get("tipo")) as VentaTipo;
    const estatus = String(fd.get("estatus") || "apartado") as VentaEstatus;
    const fecha = String(fd.get("fecha") ?? "");
    const monto = Number(String(fd.get("monto") ?? "").replace(/[$,\s]/g, ""));
    if (tipo !== "terreno" && tipo !== "casa") return { error: "Elige si fue terreno o casa." };
    if (!["apartado", "cerrada", "cancelada"].includes(estatus)) return { error: "Elige el estatus de la venta." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Revisa la fecha." };
    if (!Number.isFinite(monto) || monto <= 0) return { error: "Escribe el monto de la venta en pesos." };
    const id = String(fd.get("id") ?? "") || undefined;
    await guardarVenta(
      {
        id,
        lead_id: leadId,
        fecha,
        tipo,
        desarrollo: String(fd.get("desarrollo") ?? "").trim().slice(0, 120) || null,
        monto: Math.round(monto * 100) / 100,
        estatus,
        notas: String(fd.get("notas") ?? "").trim().slice(0, 1000) || null,
      },
      perfil.id
    );
    revalidar(leadId);
    return { ok: true, mensaje: id ? "Venta actualizada." : "Venta registrada." };
  } catch (e) {
    return error(e, "No se pudo guardar la venta.");
  }
}

export async function accionEliminarVenta(fd: FormData) {
  const leadId = String(fd.get("lead_id"));
  await participanteConPermiso(leadId);
  await eliminarVenta(String(fd.get("id")), leadId);
  revalidar(leadId);
}
