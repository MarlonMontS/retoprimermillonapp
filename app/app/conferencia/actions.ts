"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/auth";
import { eliminarRegistroConferencia } from "@/lib/data/conferencia";

export async function accionEliminarRegistro(fd: FormData) {
  await requirePerfil(["admin"]);
  await eliminarRegistroConferencia(String(fd.get("id")));
  revalidatePath("/app/conferencia");
}
