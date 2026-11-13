import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Registros a la conferencia de apertura en Monterrey.
 * Viven en su propia tabla y nunca se cruzan con los leads del Reto.
 */
export const EVENTO_CONFERENCIA = "apertura_mty_2026";

export interface RegistroConferencia {
  id: string;
  created_at: string;
  updated_at: string;
  nombre: string;
  email: string;
  whatsapp: string;
}

/** Si el mismo correo se registra dos veces, se actualizan sus datos en vez de duplicarlo. */
export async function registrarConferencia(r: { nombre: string; email: string; whatsapp: string; utm: Record<string, string>; pagina: string | null }) {
  const admin = createAdminClient();
  const { error } = await admin.from("conferencia_registros").upsert(
    {
      evento: EVENTO_CONFERENCIA,
      nombre: r.nombre,
      email: r.email,
      whatsapp: r.whatsapp,
      utm: Object.keys(r.utm).length ? r.utm : null,
      pagina: r.pagina,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "evento,email" }
  );
  if (error) throw new Error(error.message);
}

export async function listarConferencia(): Promise<RegistroConferencia[]> {
  const admin = createAdminClient();
  const filas: RegistroConferencia[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await admin
      .from("conferencia_registros")
      .select("id, created_at, updated_at, nombre, email, whatsapp")
      .eq("evento", EVENTO_CONFERENCIA)
      .order("created_at", { ascending: false })
      .range(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...((data ?? []) as RegistroConferencia[]));
    if (!data || data.length < 1000) return filas;
  }
}

export async function eliminarRegistroConferencia(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("conferencia_registros").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
