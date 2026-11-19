"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/auth";
import { eliminarSesion, guardarSesion } from "@/lib/data/seguimiento";
import type { Ciudad } from "@/lib/types";

export interface SesionState {
  ok?: boolean;
  mensaje?: string;
  error?: string;
}

export async function accionGuardarSesion(_prev: SesionState, fd: FormData): Promise<SesionState> {
  try {
    await requirePerfil(["admin"]);
    const nombre = String(fd.get("nombre") ?? "").trim();
    const fecha = String(fd.get("fecha") ?? "");
    const sede = String(fd.get("sede") ?? "");
    if (nombre.length < 2) return { error: "Escribe el nombre de la sesión." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Revisa la fecha." };
    if (sede && !["tijuana", "monterrey", "en_linea"].includes(sede)) return { error: "Elige la sede." };
    const id = String(fd.get("id") ?? "") || undefined;
    await guardarSesion({
      id,
      nombre: nombre.slice(0, 120),
      fecha,
      hora: String(fd.get("hora") ?? "").trim().slice(0, 40) || null,
      sede: (sede || null) as Ciudad | null,
      orden: Number(fd.get("orden") ?? 0) || 0,
    });
    revalidatePath("/app/sesiones");
    revalidatePath("/app/seguimiento");
    return { ok: true, mensaje: id ? "Sesión actualizada." : "Sesión agregada." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar la sesión." };
  }
}

export async function accionEliminarSesion(fd: FormData) {
  await requirePerfil(["admin"]);
  await eliminarSesion(String(fd.get("id")));
  revalidatePath("/app/sesiones");
  revalidatePath("/app/seguimiento");
}
