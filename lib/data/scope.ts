import { createAdminClient } from "@/lib/supabase/admin";
import type { Perfil } from "@/lib/types";

/**
 * Alcance de datos de un usuario:
 * - admin: todo, incluida la bolsa sin asignar
 * - gerente: los leads de sus líderes y los suyos propios
 * - líder: solo los leads de los que es responsable
 */
export type Scope = { tipo: "todos" } | { tipo: "ids"; ids: string[] };

export async function scopeDe(perfil: Perfil): Promise<Scope> {
  if (perfil.rol === "admin") return { tipo: "todos" };
  if (perfil.rol === "gerente") {
    const admin = createAdminClient();
    const { data } = await admin.from("perfiles").select("id").eq("gerente_id", perfil.id);
    return { tipo: "ids", ids: [perfil.id, ...(data ?? []).map((d) => d.id as string)] };
  }
  return { tipo: "ids", ids: [perfil.id] };
}

/** ¿El alcance incluye a un lead cuyo responsable es liderId? */
export function incluye(scope: Scope, liderId: string | null): boolean {
  if (scope.tipo === "todos") return true;
  return liderId !== null && scope.ids.includes(liderId);
}
