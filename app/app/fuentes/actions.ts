"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/auth";
import { activarFuente, crearFuenteCampana } from "@/lib/data/fuentes";
import type { FuenteTipo } from "@/lib/types";

export interface FuenteState {
  ok?: boolean;
  error?: string;
  slug?: string;
}

export async function accionCrearCampana(_prev: FuenteState, fd: FormData): Promise<FuenteState> {
  await requirePerfil(["admin"]);
  const nombre = String(fd.get("nombre") ?? "").trim();
  const tipo = String(fd.get("tipo") ?? "publicidad") as FuenteTipo;
  const slug = String(fd.get("slug") ?? "").trim() || undefined;
  if (nombre.length < 2) return { error: "Escribe el nombre de la campaña o marca." };
  if (!["publicidad", "colaboracion", "contenido", "organico", "otro"].includes(tipo)) return { error: "Tipo no válido." };
  try {
    const f = await crearFuenteCampana({ nombre, tipo, slug });
    revalidatePath("/app/fuentes");
    return { ok: true, slug: f.slug };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear." };
  }
}

export async function accionActivarFuente(fd: FormData) {
  await requirePerfil(["admin"]);
  const id = String(fd.get("id"));
  const activo = fd.get("activo") === "1";
  await activarFuente(id, activo);
  revalidatePath("/app/fuentes");
}
