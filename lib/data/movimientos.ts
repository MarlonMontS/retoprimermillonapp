import { createAdminClient } from "@/lib/supabase/admin";
import { ciudadCompatible, getConfig } from "@/lib/data/config";
import { obtenerPerfil } from "@/lib/data/equipo";
import { reasignarLead } from "@/lib/data/leads";
import type { Ciudad, Perfil } from "@/lib/types";

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
