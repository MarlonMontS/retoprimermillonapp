import { createAdminClient } from "@/lib/supabase/admin";
import { ciudadCompatible, getConfig } from "@/lib/data/config";
import { crearUsuario, obtenerPerfil } from "@/lib/data/equipo";
import { reasignarLead } from "@/lib/data/leads";
import type { Ciudad, Lead, Perfil } from "@/lib/types";

/** Lo que se afecta si se mueve o elimina a esta persona. */
export interface ResumenPerfil {
  leads: number;
  calificados: number;
  lideres: number;
  listas: number;
  campanas: number;
  campanasActivas: number;
}

export async function resumenPerfil(id: string): Promise<ResumenPerfil> {
  const admin = createAdminClient();
  const contar = async (tabla: string, filtro: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { count, error } = await filtro(admin.from(tabla).select("id", { count: "exact", head: true }));
    if (error) throw new Error(error.message);
    return (count ?? 0) as number;
  };
  const [leads, calificados, lideres, listas, campanas, campanasActivas] = await Promise.all([
    contar("leads", (q) => q.eq("lider_id", id)),
    contar("leads", (q) => q.eq("lider_id", id).eq("estatus", "calificado")),
    contar("perfiles", (q) => q.eq("gerente_id", id)),
    contar("mail_listas", (q) => q.eq("perfil_id", id)),
    contar("mail_campanas", (q) => q.eq("perfil_id", id)),
    contar("mail_campanas", (q) => q.eq("perfil_id", id).eq("estado", "activa")),
  ]);
  return { leads, calificados, lideres, listas, campanas, campanasActivas };
}

async function destinoValido(id: string, roles: Perfil["rol"][], origen: string): Promise<Perfil> {
  const destino = await obtenerPerfil(id);
  if (!destino || !destino.activo || !roles.includes(destino.rol) || destino.id === origen) {
    throw new Error("Elige un destino válido.");
  }
  return destino;
}

/**
 * Pasa todos los leads de una persona a otra, o a la bolsa común si destinoId es null.
 * Los de una ciudad incompatible con el destino se van a la bolsa, por la regla de ciudad.
 */
export async function moverLeads(origen: Perfil, destinoId: string | null, actorId: string) {
  const admin = createAdminClient();
  const destino = destinoId ? await destinoValido(destinoId, ["lider", "gerente"], origen.id) : null;
  const config = await getConfig();

  const { data, error } = await admin.from("leads").select("id, ciudad, desde_bolsa").eq("lider_id", origen.id);
  if (error) throw new Error(error.message);
  const leads = (data ?? []) as { id: string; ciudad: Ciudad | null; desde_bolsa: boolean }[];

  let aDestino = 0;
  let aBolsa = 0;
  const LOTE = 8;
  for (let i = 0; i < leads.length; i += LOTE) {
    await Promise.all(
      leads.slice(i, i + LOTE).map(async (l) => {
        const cabe = destino !== null && ciudadCompatible(config.ciudad_estricta, l.ciudad, destino.ciudad);
        await reasignarLead({ leadId: l.id, actorId, liderId: cabe ? destino.id : null, desdeBolsa: l.desde_bolsa });
        if (cabe) aDestino++;
        else aBolsa++;
      })
    );
  }

  if (leads.length > 0) {
    await admin.from("lead_eventos").insert(
      leads.map((l) => ({
        lead_id: l.id,
        actor_id: actorId,
        tipo: "nota",
        detalle: { texto: `Antes era responsable ${origen.nombre}.` },
      }))
    );
  }
  return { aDestino, aBolsa, destino };
}

export async function moverEquipo(gerenteId: string, destinoId: string): Promise<number> {
  await destinoValido(destinoId, ["gerente"], gerenteId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("perfiles")
    .update({ gerente_id: destinoId })
    .eq("gerente_id", gerenteId)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/** El gerente queda como líder en otro equipo, junto con los líderes que tenía. */
export async function convertirEnLider(gerenteId: string, destinoId: string) {
  const lideres = await moverEquipo(gerenteId, destinoId);
  const admin = createAdminClient();
  const { error } = await admin.from("perfiles").update({ rol: "lider", gerente_id: destinoId }).eq("id", gerenteId);
  if (error) throw new Error(error.message);
  await admin.from("fuentes").update({ tipo: "lider" }).eq("perfil_id", gerenteId);
  return { lideres };
}

/**
 * Elimina a un líder o gerente sin dejar leads ni líderes huérfanos.
 * Primero lo desactiva y mueve todo; si algo falla no se ha borrado nada y se puede repetir.
 */
export async function eliminarUsuario(input: {
  objetivo: Perfil;
  actorId: string;
  destinoLeads: string | null;
  destinoGerente: string | null;
}) {
  const { objetivo, actorId, destinoLeads, destinoGerente } = input;
  if (objetivo.rol === "admin" || objetivo.id === actorId) throw new Error("Este usuario no se puede eliminar.");
  const admin = createAdminClient();
  const resumen = await resumenPerfil(objetivo.id);
  if (resumen.lideres > 0 && !destinoGerente) throw new Error("Elige a qué gerente pasan sus líderes.");

  if (destinoLeads) await destinoValido(destinoLeads, ["lider", "gerente"], objetivo.id);
  if (destinoGerente) await destinoValido(destinoGerente, ["gerente"], objetivo.id);

  await admin.from("perfiles").update({ activo: false }).eq("id", objetivo.id);
  await admin.from("fuentes").update({ activo: false }).eq("perfil_id", objetivo.id);

  if (resumen.lideres > 0 && destinoGerente) await moverEquipo(objetivo.id, destinoGerente);
  const movidos = await moverLeads(objetivo, destinoLeads, actorId);

  // Por si entró un lead mientras se movían: nunca borrar a alguien con leads a su nombre.
  const pendiente = await resumenPerfil(objetivo.id);
  if (pendiente.leads > 0 || pendiente.lideres > 0) {
    throw new Error("Aún le quedan leads o líderes. Inténtalo de nuevo.");
  }

  const { error } = await admin.auth.admin.deleteUser(objetivo.id);
  if (error) throw new Error(error.message);
  return movidos;
}

/** Un líder pasa a gerente: conserva sus leads y su enlace, y deja de tener gerente. */
export async function convertirEnGerente(liderId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("perfiles").update({ rol: "gerente", gerente_id: null }).eq("id", liderId);
  if (error) throw new Error(error.message);
  await admin.from("fuentes").update({ tipo: "gerente" }).eq("perfil_id", liderId);
}

/**
 * Un líder o gerente vuelve a ser lead: se crea su registro y se elimina su usuario.
 * Si ya existe un lead con ese WhatsApp se reutiliza, para no duplicar a la persona.
 */
export async function convertirEnLead(input: {
  objetivo: Perfil;
  actorId: string;
  whatsapp: string;
  responsableId: string | null;
  destinoLeads: string | null;
  destinoGerente: string | null;
}): Promise<string> {
  const { objetivo, actorId, whatsapp, responsableId } = input;
  const admin = createAdminClient();
  const responsable = responsableId ? await destinoValido(responsableId, ["lider", "gerente"], objetivo.id) : null;

  const { data: existente } = await admin.from("leads").select("id").eq("whatsapp", whatsapp).neq("estatus", "duplicado").limit(1).maybeSingle();
  let leadId = existente?.id as string | undefined;
  const creado = !leadId;

  if (!leadId) {
    const config = await getConfig();
    const cabe = responsable !== null && ciudadCompatible(config.ciudad_estricta, objetivo.ciudad, responsable.ciudad);
    const [nombre, ...resto] = objetivo.nombre.trim().split(/\s+/);
    const { data, error } = await admin
      .from("leads")
      .insert({
        nombre,
        apellido: resto.join(" ") || null,
        whatsapp,
        email: objetivo.email,
        ciudad: objetivo.ciudad,
        lider_id: cabe ? responsable.id : null,
        asignado_at: cabe ? new Date().toISOString() : null,
        origen_registro: "manual",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    leadId = data.id as string;
  }

  try {
    await eliminarUsuario(input);
  } catch (e) {
    if (creado) await admin.from("leads").delete().eq("id", leadId);
    throw e;
  }
  await admin.from("lead_eventos").insert({
    lead_id: leadId,
    actor_id: actorId,
    tipo: "nota",
    detalle: { texto: `Antes era ${objetivo.rol === "gerente" ? "gerente" : "líder"} del equipo.` },
  });
  return leadId;
}

/**
 * Un lead se vuelve líder o gerente. Si conservar es true su registro sigue contando
 * para quien lo invitó; si no, deja de ser lead.
 */
export async function convertirLeadEnUsuario(input: {
  lead: Pick<Lead, "id" | "nombre" | "apellido" | "whatsapp" | "ciudad">;
  actorId: string;
  rol: "lider" | "gerente";
  email: string;
  gerenteId: string | null;
  conservar: boolean;
}) {
  const { lead, actorId, rol, email, gerenteId, conservar } = input;
  if (rol === "lider") {
    if (!gerenteId) throw new Error("Elige su gerente.");
    await destinoValido(gerenteId, ["gerente"], lead.id);
  }
  const creado = await crearUsuario({
    nombre: [lead.nombre, lead.apellido].filter(Boolean).join(" "),
    email,
    telefono: lead.whatsapp,
    rol,
    gerente_id: rol === "lider" ? gerenteId : null,
    ciudad: lead.ciudad,
  });
  const admin = createAdminClient();
  if (conservar) {
    await admin.from("lead_eventos").insert({
      lead_id: lead.id,
      actor_id: actorId,
      tipo: "nota",
      detalle: { texto: `Ahora es ${rol === "gerente" ? "gerente" : "líder"} del equipo.` },
    });
  } else {
    const { error } = await admin.from("leads").delete().eq("id", lead.id);
    if (error) throw new Error(error.message);
  }
  return creado;
}
