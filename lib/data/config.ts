import { createAdminClient } from "@/lib/supabase/admin";

export interface Config {
  cuota_minima: number;
  ruleta_activa: boolean;
  ciudad_estricta: boolean;
  preguntas_filtro: string[];
  aviso_privacidad_url: string;
}

const DEFAULTS: Config = {
  cuota_minima: 5,
  ruleta_activa: true,
  ciudad_estricta: true,
  preguntas_filtro: [],
  aviso_privacidad_url: "",
};

/** Regla por ciudad: "En línea" es compatible con cualquier ciudad; sin ciudad se considera compatible. */
export function ciudadCompatible(
  estricta: boolean,
  ciudadLead: string | null | undefined,
  ciudadResponsable: string | null | undefined
): boolean {
  if (!estricta || !ciudadLead || !ciudadResponsable) return true;
  if (ciudadLead === "en_linea" || ciudadResponsable === "en_linea") return true;
  return ciudadLead === ciudadResponsable;
}

export async function getConfig(): Promise<Config> {
  const admin = createAdminClient();
  const { data } = await admin.from("config").select("clave, valor");
  const cfg: Config = { ...DEFAULTS };
  for (const row of data ?? []) {
    const k = row.clave as keyof Config;
    if (k in cfg) (cfg as unknown as Record<string, unknown>)[k] = row.valor;
  }
  return cfg;
}

export async function setConfig<K extends keyof Config>(clave: K, valor: Config[K]) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("config")
    .upsert({ clave, valor, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
