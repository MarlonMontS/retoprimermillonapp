import { CIUDAD_LABEL, type Ciudad, type Etapa } from "@/lib/types";

/** Tipos, etiquetas y utilidades del seguimiento. Sin acceso a datos: se usa también en el navegador. */
export type VentaTipo = "terreno" | "casa";

export type VentaEstatus = "apartado" | "cerrada" | "cancelada";

export const VENTA_TIPO_LABEL: Record<VentaTipo, string> = { terreno: "Terreno", casa: "Casa" };

export const VENTA_ESTATUS_LABEL: Record<VentaEstatus, string> = { apartado: "Apartado", cerrada: "Cerrada", cancelada: "Cancelada" };

export interface Sesion {
  id: string;
  nombre: string;
  fecha: string; // AAAA-MM-DD
  hora: string | null;
  sede: Ciudad | null;
  orden: number;
}

export interface Venta {
  id: string;
  lead_id: string;
  fecha: string;
  tipo: VentaTipo;
  desarrollo: string | null;
  monto: number;
  estatus: VentaEstatus;
  notas: string | null;
  created_at: string;
}

export interface Participante {
  id: string;
  nombre: string;
  apellido: string | null;
  whatsapp: string;
  ciudad: Ciudad | null;
  etapa: Etapa | null;
  lider: { id: string; nombre: string } | null;
}

/** Hoy en la zona de Tijuana, que es la más tardía de las sedes. */
export function hoyIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Tijuana" });
}

/** La sesión aplica a una persona si es para todas las sedes o para la suya. */
export function aplicaA(sesion: Pick<Sesion, "sede">, ciudad: Ciudad | null) {
  return sesion.sede === null || sesion.sede === ciudad;
}

export function pesos(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

/** "jue 20 nov · 7:00 p.m. · Tijuana" */
export function fechaSesion(s: Pick<Sesion, "fecha" | "hora" | "sede">) {
  const f = new Date(`${s.fecha}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  return [f, s.hora, s.sede ? CIUDAD_LABEL[s.sede] : "Todas las sedes"].filter(Boolean).join(" · ");
}
