"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePerfil } from "@/lib/auth";
import { repartirBolsa } from "@/lib/data/leads";

export async function accionRepartir() {
  const perfil = await requirePerfil(["admin"]);
  const n = await repartirBolsa(perfil.id);
  revalidatePath("/app", "layout");
  redirect(`/app/bolsa?repartidos=${n}`);
}
