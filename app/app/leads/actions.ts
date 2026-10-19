"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/auth";
import { incluye, scopeDe } from "@/lib/data/scope";
import {
  actualizarLead,
  agregarNota,
  obtenerLead,
  reasignarLead,
  registrarLlamada,
} from "@/lib/data/leads";
import { normalizarWhatsapp } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Ciudad, Etapa, LeadEstatus } from "@/lib/types";

export interface AccionState {
  ok?: boolean;
  mensaje?: string;
  error?: string;
}

async function leadConPermiso(leadId: string) {
  const perfil = await requirePerfil(["admin", "gerente"]);
  const scope = await scopeDe(perfil);
  const lead = await obtenerLead(leadId, scope);
  if (!lead) throw new Error("No tienes permiso sobre este lead.");
  return { perfil, scope, lead };
}

function revalidar(leadId: string) {
  revalidatePath("/app");
  revalidatePath("/app/leads");
  revalidatePath(`/app/leads/${leadId}`);
  revalidatePath("/app/lideres");
  revalidatePath("/app/bolsa");
}

export async function accionLlamada(_prev: AccionState, fd: FormData): Promise<AccionState> {
  try {
    const leadId = String(fd.get("lead_id"));
    const resultado = String(fd.get("resultado")) as LeadEstatus;
    const notas = String(fd.get("notas") ?? "").trim() || null;
    const { perfil } = await leadConPermiso(leadId);

    const respuestas: Record<string, string> = {};
    for (const [k, v] of fd.entries()) {
      if (k.startsWith("pregunta:") && typeof v === "string" && v) respuestas[k.slice(9)] = v;
    }

    const lead = await registrarLlamada({
      leadId,
      actorId: perfil.id,
      resultado,
      notas,
      respuestas: Object.keys(respuestas).length ? respuestas : null,
    });
    revalidar(leadId);

    if (resultado === "calificado" && lead.estatus === "duplicado") {
      return {
        ok: false,
        error: "Esta persona ya fue calificada antes con otro responsable. El registro quedó marcado como duplicado.",
      };
    }
    const msgs: Partial<Record<LeadEstatus, string>> = {
      calificado: "Lead calificado. Ya cuenta para la cuota del responsable.",
      en_contacto: "Guardado como En contacto.",
      no_contesta: "Guardado como No contesta.",
      no_calificado: "Guardado como No calificado.",
      descartado: "Lead descartado.",
      nuevo: "Regresado a Nuevo.",
    };
    return { ok: true, mensaje: msgs[resultado] ?? "Guardado." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar." };
  }
}

export async function accionNota(_prev: AccionState, fd: FormData): Promise<AccionState> {
  try {
    const leadId = String(fd.get("lead_id"));
    const texto = String(fd.get("texto") ?? "").trim();
    if (!texto) return { error: "Escribe la nota." };
    const { perfil } = await leadConPermiso(leadId);
    await agregarNota(leadId, perfil.id, texto);
    revalidar(leadId);
    return { ok: true, mensaje: "Nota guardada." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al guardar." };
  }
}

export async function accionReasignar(_prev: AccionState, fd: FormData): Promise<AccionState> {
  try {
    const leadId = String(fd.get("lead_id"));
    const nuevo = String(fd.get("lider_id") ?? "");
    const desdeBolsa = fd.get("desde_bolsa") === "on";
    const { perfil, scope } = await leadConPermiso(leadId);
    const liderId = nuevo === "" ? null : nuevo;
    if (perfil.rol !== "admin") {
      // Un gerente solo mueve leads dentro de su propio equipo
      if (liderId === null || !incluye(scope, liderId)) return { error: "Solo puedes reasignar dentro de tu equipo." };
    }
    await reasignarLead({ leadId, actorId: perfil.id, liderId, desdeBolsa });
    revalidar(leadId);
    return { ok: true, mensaje: liderId ? "Responsable actualizado." : "El lead regresó a la bolsa común." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al reasignar." };
  }
}

export async function accionEditar(_prev: AccionState, fd: FormData): Promise<AccionState> {
  try {
    const leadId = String(fd.get("lead_id"));
    const { perfil } = await leadConPermiso(leadId);
    const whatsapp = normalizarWhatsapp(String(fd.get("whatsapp") ?? ""));
    if (!whatsapp) return { error: "Revisa el número de WhatsApp." };
    const ciudad = String(fd.get("ciudad") ?? "") as Ciudad | "";
    const etapa = String(fd.get("etapa") ?? "") as Etapa | "";
    await actualizarLead(leadId, perfil.id, {
      nombre: String(fd.get("nombre") ?? "").trim(),
      apellido: String(fd.get("apellido") ?? "").trim() || null,
      whatsapp,
      email: String(fd.get("email") ?? "").trim().toLowerCase() || null,
      ciudad: ciudad || null,
      etapa: etapa || null,
    });
    revalidar(leadId);
    return { ok: true, mensaje: "Datos actualizados." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al guardar." };
  }
}

export async function accionEliminar(fd: FormData): Promise<void> {
  const perfil = await requirePerfil(["admin"]);
  const leadId = String(fd.get("lead_id"));
  const admin = createAdminClient();
  await admin.from("leads").delete().eq("id", leadId);
  void perfil;
  revalidatePath("/app/leads");
}
