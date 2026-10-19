import { getConfig } from "@/lib/data/config";

export type SearchParams = Record<string, string | string[] | undefined>;

export function leerUtm(sp: SearchParams): Record<string, string> {
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = sp[k];
    if (typeof v === "string" && v.trim()) utm[k] = v.trim().slice(0, 120);
  }
  return utm;
}

export function esEmbed(sp: SearchParams): boolean {
  return sp.embed === "1" || sp.embed === "true";
}

export function tema(sp: SearchParams): string | undefined {
  return typeof sp.tema === "string" ? sp.tema : undefined;
}

export async function urlAviso(): Promise<string> {
  const cfg = await getConfig();
  return cfg.aviso_privacidad_url?.trim() || "/privacidad";
}
