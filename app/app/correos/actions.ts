"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePerfil } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { correoConfigurado, enviarPrueba, procesarCola } from "@/lib/correos/motor";
import { proponerCorreos } from "@/lib/correos/propuesta";
import { FRECUENCIAS, INTENCIONES, esEmail, type Intencion } from "@/lib/correos/render";
import { ROL_LABEL } from "@/lib/types";
import { appUrl } from "@/lib/utils";

const MAX_CONTACTOS = 2000;
const MAX_POR_DIA_PERSONA = 3; // campañas lanzadas por persona al día

export async function accionProponer(input: { intencion: string; instrucciones: string; sede: string; seguimientos: number }) {
  const perfil = await requirePerfil();
  const intencion = (input.intencion in INTENCIONES ? input.intencion : "otro") as Intencion;
  return proponerCorreos({
    intencion,
    instrucciones: String(input.instrucciones ?? "").slice(0, 1500),
    sede: String(input.sede ?? "todas").slice(0, 30),
    seguimientos: Math.min(4, Math.max(0, Number(input.seguimientos) || 0)),
    remitente: perfil.nombre,
    rol: ROL_LABEL[perfil.rol],
  });
}

const contactoSchema = z.object({ email: z.string(), nombre: z.string().nullable(), apellido: z.string().nullable() });

export async function accionCrearLista(input: { nombre: string; contactos: unknown[] }) {
  const perfil = await requirePerfil();
  const parsed = z.array(contactoSchema).safeParse(input.contactos);
  if (!parsed.success) return { error: "El archivo no tiene el formato esperado." };
  const vistos = new Set<string>();
  const filas = parsed.data
    .map((c) => ({ ...c, email: c.email.trim().toLowerCase() }))
    .filter((c) => esEmail(c.email) && !vistos.has(c.email) && vistos.add(c.email));
  if (!filas.length) return { error: "No encontré correos válidos." };
  if (filas.length > MAX_CONTACTOS) return { error: `El máximo por lista es de ${MAX_CONTACTOS} contactos.` };

  const db = createAdminClient();
  const { data: lista, error } = await db
    .from("mail_listas")
    .insert({ perfil_id: perfil.id, nombre: String(input.nombre).trim().slice(0, 80) || "Mi lista" })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const { error: e2 } = await db.from("mail_contactos").insert(
    filas.map((c) => ({ lista_id: lista.id, email: c.email, nombre: c.nombre?.trim().slice(0, 80) || null, apellido: c.apellido?.trim().slice(0, 80) || null }))
  );
  if (e2) {
    await db.from("mail_listas").delete().eq("id", lista.id);
    return { error: e2.message };
  }
  revalidatePath("/app/correos", "layout");
  return { ok: true, id: lista.id, total: filas.length };
}

export async function accionEliminarLista(fd: FormData) {
  const perfil = await requirePerfil();
  await createAdminClient().from("mail_listas").delete().eq("id", String(fd.get("id"))).eq("perfil_id", perfil.id);
  revalidatePath("/app/correos", "layout");
}

export async function accionPrueba(input: { asunto: string; cuerpo: string }) {
  const perfil = await requirePerfil();
  if (!correoConfigurado()) return { error: "El envío de correos todavía no está activado." };
  try {
    const enlace = appUrl(perfil.slug ? `/r/${perfil.slug}` : "/registro");
    await enviarPrueba(perfil.email, input.asunto, input.cuerpo, perfil.nombre, enlace, perfil.email);
    return { ok: true, a: perfil.email };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo enviar la prueba." };
  }
}

const lanzarSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  intencion: z.string(),
  lista_id: z.uuid(),
  frecuencia_dias: z.number().refine((n) => (FRECUENCIAS as readonly number[]).includes(n)),
  solo_no_abrieron: z.boolean(),
  consentimiento: z.literal(true),
  pasos: z.array(z.object({ asunto: z.string().trim().min(3).max(150), cuerpo: z.string().trim().min(10).max(6000) })).min(1).max(5),
});

export async function accionLanzar(input: unknown) {
  const perfil = await requirePerfil();
  if (!correoConfigurado()) return { error: "El envío de correos todavía no está activado." };
  const parsed = lanzarSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisa la campaña: faltan datos, o no confirmaste que tus contactos aceptaron recibir correos." };
  const d = parsed.data;
  const db = createAdminClient();

  const { data: lista } = await db.from("mail_listas").select("id").eq("id", d.lista_id).eq("perfil_id", perfil.id).maybeSingle();
  if (!lista) return { error: "Esa lista no es tuya." };

  const hoy = new Date(Date.now() - 86_400_000).toISOString();
  const { count: recientes } = await db.from("mail_campanas").select("id", { count: "exact", head: true }).eq("perfil_id", perfil.id).gte("lanzada_at", hoy);
  if ((recientes ?? 0) >= MAX_POR_DIA_PERSONA) return { error: `Puedes lanzar hasta ${MAX_POR_DIA_PERSONA} campañas al día.` };

  const { data: contactos } = await db.from("mail_contactos").select("id, email, nombre, apellido").eq("lista_id", d.lista_id).limit(MAX_CONTACTOS);
  const { data: bajas } = await db.from("mail_bajas").select("email").in("email", (contactos ?? []).map((c) => c.email));
  const excluidos = new Set((bajas ?? []).map((b) => b.email as string));
  const destino = (contactos ?? []).filter((c) => !excluidos.has(c.email));
  if (!destino.length) return { error: "Esa lista no tiene contactos a quienes escribir." };

  const { data: campana, error } = await db
    .from("mail_campanas")
    .insert({
      perfil_id: perfil.id,
      lista_id: d.lista_id,
      nombre: d.nombre,
      intencion: d.intencion,
      estado: "activa",
      frecuencia_dias: d.frecuencia_dias,
      solo_no_abrieron: d.solo_no_abrieron,
      consentimiento_confirmado: true,
      lanzada_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { data: pasos, error: e2 } = await db
    .from("mail_pasos")
    .insert(d.pasos.map((p, i) => ({ campana_id: campana.id, orden: i + 1, asunto: p.asunto, cuerpo: p.cuerpo })))
    .select("id, orden");
  const primero = pasos?.find((p) => p.orden === 1);
  if (e2 || !primero) return { error: e2?.message ?? "No se pudo crear la secuencia." };

  const { error: e3 } = await db
    .from("mail_envios")
    .insert(destino.map((c) => ({ campana_id: campana.id, paso_id: primero.id, contacto_id: c.id, email: c.email, nombre: c.nombre, apellido: c.apellido })));
  if (e3) return { error: e3.message };

  after(() => procesarCola());
  revalidatePath("/app/correos", "layout");
  return { ok: true, id: campana.id, excluidos: (contactos?.length ?? 0) - destino.length };
}

export async function accionCambiarEstado(fd: FormData) {
  const perfil = await requirePerfil();
  const id = String(fd.get("id"));
  const estado = fd.get("estado") === "pausada" ? "pausada" : "activa";
  const db = createAdminClient();
  let q = db.from("mail_campanas").update({ estado }).eq("id", id).in("estado", ["activa", "pausada"]);
  if (perfil.rol !== "admin") q = q.eq("perfil_id", perfil.id);
  await q;
  if (estado === "activa") after(() => procesarCola());
  revalidatePath(`/app/correos/${id}`);
  revalidatePath("/app/correos");
}
