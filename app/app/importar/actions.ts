"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePerfil } from "@/lib/auth";
import { importarLeads, type FilaImportada } from "@/lib/data/leads";

const fila = z.object({
  nombre: z.string().trim().min(1).max(80),
  apellido: z.string().trim().max(80).nullable(),
  whatsapp: z.string().regex(/^\+\d{10,15}$/),
  email: z.string().trim().max(120).nullable(),
  ciudad: z.enum(["tijuana", "monterrey", "en_linea"]).nullable(),
  experiencia: z.string().trim().max(200).nullable(),
  motivo: z.string().trim().max(2000).nullable(),
  como_se_entero: z.string().trim().max(200).nullable(),
  created_at: z.string().nullable(),
  external_id: z.string().trim().max(80).nullable(),
});

const schema = z.object({
  filas: z.array(fila).min(1).max(3000),
  lider_id: z.uuid().nullable(),
  omitirWhatsappExistente: z.boolean(),
});

export async function accionImportarLeads(input: unknown) {
  const perfil = await requirePerfil(["admin"]);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos: " + (parsed.error.issues[0]?.message ?? "") };
  const filas: FilaImportada[] = parsed.data.filas.map((f) => ({ ...f, lider_id: parsed.data.lider_id }));
  const res = await importarLeads(filas, perfil.id, { omitirWhatsappExistente: parsed.data.omitirWhatsappExistente });
  revalidatePath("/app", "layout");
  return res;
}
