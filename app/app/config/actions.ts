"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/auth";
import { setConfig } from "@/lib/data/config";

export interface ConfigState {
  ok?: boolean;
  error?: string;
}

export async function accionGuardarConfig(_prev: ConfigState, fd: FormData): Promise<ConfigState> {
  await requirePerfil(["admin"]);
  try {
    const cuota = Number(fd.get("cuota_minima"));
    if (!Number.isInteger(cuota) || cuota < 0 || cuota > 100) return { error: "La cuota debe ser un número entre 0 y 100." };
    const ruleta = fd.get("ruleta_activa") === "on";
    const ciudadEstricta = fd.get("ciudad_estricta") === "on";
    const preguntas = String(fd.get("preguntas_filtro") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
    const aviso = String(fd.get("aviso_privacidad_url") ?? "").trim();
    if (aviso && !/^https?:\/\//.test(aviso)) return { error: "La URL del aviso debe empezar con http:// o https://" };

    await Promise.all([
      setConfig("cuota_minima", cuota),
      setConfig("ruleta_activa", ruleta),
      setConfig("ciudad_estricta", ciudadEstricta),
      setConfig("preguntas_filtro", preguntas),
      setConfig("aviso_privacidad_url", aviso),
    ]);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar." };
  }
}
