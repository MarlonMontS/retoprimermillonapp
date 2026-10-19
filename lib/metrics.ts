import type { LeadLigero } from "@/lib/data/leads";
import { CIUDAD_LABEL, ESTATUS_ORDEN, FUENTE_TIPO_LABEL, type Ciudad, type FuenteTipo, type LeadEstatus } from "@/lib/types";

export interface Fila {
  clave: string;
  label: string;
  n: number;
}

export interface Resumen {
  total: number; // sin duplicados
  calificados: number;
  pendientes: number;
  descartados: number;
  duplicados: number;
  bolsa: number;
  hoy: number;
  porEstatus: Fila[];
  porCiudad: Fila[];
  porFuente: Fila[];
  porDia: { dia: string; etiqueta: string; n: number }[];
}

const TZ = "America/Mexico_City";
const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtEtiqueta = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, day: "2-digit", month: "short" });

function claveDia(d: Date) {
  return fmtDia.format(d); // YYYY-MM-DD
}

export function resumir(leads: LeadLigero[], dias = 14): Resumen {
  const porEstatus = new Map<LeadEstatus, number>();
  const porCiudad = new Map<string, number>();
  const porFuente = new Map<string, number>();
  const porDia = new Map<string, number>();

  const hoy = claveDia(new Date());
  let total = 0, calificados = 0, pendientes = 0, descartados = 0, duplicados = 0, bolsa = 0, nHoy = 0;

  for (const l of leads) {
    porEstatus.set(l.estatus, (porEstatus.get(l.estatus) ?? 0) + 1);
    if (l.estatus === "duplicado") { duplicados++; continue; }
    total++;
    if (l.estatus === "calificado") calificados++;
    if (l.estatus === "nuevo" || l.estatus === "en_contacto" || l.estatus === "no_contesta") pendientes++;
    if (l.estatus === "no_calificado" || l.estatus === "descartado") descartados++;
    if (l.desde_bolsa) bolsa++;

    const c = l.ciudad ?? "sin_ciudad";
    porCiudad.set(c, (porCiudad.get(c) ?? 0) + 1);
    const f = l.fuente?.tipo ?? (l.lider_id ? "lider" : "organico");
    porFuente.set(f, (porFuente.get(f) ?? 0) + 1);
    const d = claveDia(new Date(l.created_at));
    porDia.set(d, (porDia.get(d) ?? 0) + 1);
    if (d === hoy) nHoy++;
  }

  const serieDias: Resumen["porDia"] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = claveDia(d);
    serieDias.push({ dia: k, etiqueta: fmtEtiqueta.format(d), n: porDia.get(k) ?? 0 });
  }

  return {
    total, calificados, pendientes, descartados, duplicados, bolsa, hoy: nHoy,
    porEstatus: ESTATUS_ORDEN.map((e) => ({ clave: e, label: labelEstatus(e), n: porEstatus.get(e) ?? 0 })).filter((f) => f.n > 0),
    porCiudad: Array.from(porCiudad, ([k, n]) => ({ clave: k, label: k === "sin_ciudad" ? "Sin ciudad" : CIUDAD_LABEL[k as Ciudad], n })).sort((a, b) => b.n - a.n),
    porFuente: Array.from(porFuente, ([k, n]) => ({ clave: k, label: FUENTE_TIPO_LABEL[k as FuenteTipo] ?? k, n })).sort((a, b) => b.n - a.n),
    porDia: serieDias,
  };
}

function labelEstatus(e: LeadEstatus) {
  const m: Record<LeadEstatus, string> = {
    nuevo: "Nuevo", en_contacto: "En contacto", no_contesta: "No contesta", calificado: "Calificado",
    no_calificado: "No calificado", duplicado: "Duplicado", descartado: "Descartado",
  };
  return m[e];
}
