import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Perfil, Rol } from "@/lib/types";

/** Perfil del usuario con sesión activa, o null. Se memoriza por petición. */
export const getPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin.from("perfiles").select("*").eq("id", user.id).maybeSingle();
  if (!data || !data.activo) return null;
  return data as Perfil;
});

/** Exige sesión y, opcionalmente, uno de los roles indicados. */
export async function requirePerfil(roles?: Rol[]): Promise<Perfil> {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  if (roles && !roles.includes(perfil.rol)) redirect("/app");
  return perfil;
}

export function esAdmin(p: Perfil) {
  return p.rol === "admin";
}
export function esGerente(p: Perfil) {
  return p.rol === "gerente";
}
export function esLider(p: Perfil) {
  return p.rol === "lider";
}
