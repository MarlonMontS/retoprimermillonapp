"use server";

import { requirePerfil } from "@/lib/auth";
import { cambiarPasswordPropia } from "@/lib/data/equipo";

export interface CuentaState {
  ok?: boolean;
  error?: string;
}

export async function accionCambiarPassword(_prev: CuentaState, fd: FormData): Promise<CuentaState> {
  const perfil = await requirePerfil();
  const p1 = String(fd.get("password") ?? "");
  const p2 = String(fd.get("password2") ?? "");
  if (p1.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (p1 !== p2) return { error: "Las contraseñas no coinciden." };
  try {
    await cambiarPasswordPropia(perfil.id, p1);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cambiar la contraseña." };
  }
}
