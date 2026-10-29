export type Formato = "vertical" | "cuadrado" | "horizontal";
export type Plantilla = "registro" | "sesion";

export const FORMATOS: Record<Formato, { ancho: number; alto: number; label: string; uso: string }> = {
  vertical: { ancho: 1080, alto: 1920, label: "Vertical", uso: "Estados de WhatsApp, historias de Instagram y Facebook" },
  cuadrado: { ancho: 1080, alto: 1080, label: "Cuadrado", uso: "Chats de WhatsApp, publicaciones de Instagram y Facebook" },
  horizontal: { ancho: 1920, alto: 1080, label: "Horizontal", uso: "Correo, presentaciones, Facebook y LinkedIn" },
};

export const PLANTILLAS: Record<Plantilla, { label: string; descripcion: string }> = {
  registro: { label: "Registro al Reto", descripcion: "El programa, premios y tu QR para registrarse" },
  sesion: { label: "Sesión informativa", descripcion: "Invitación a la sesión por Zoom con fecha y horario" },
};

export type Sede = "en_linea" | "tijuana" | "monterrey";

export const SEDES: Record<Sede, { label: string; titulo: string; detalle: string; equipo: "duo" | "trio" }> = {
  en_linea: { label: "En línea", titulo: "MODALIDAD EN LÍNEA", detalle: "Participa desde cualquier ciudad de México", equipo: "duo" },
  tijuana: { label: "Tijuana", titulo: "TIJUANA, B.C. · PRESENCIAL", detalle: "Del 13 de noviembre al 15 de diciembre de 2026", equipo: "duo" },
  monterrey: { label: "Monterrey", titulo: "MONTERREY, N.L. · PRESENCIAL", detalle: "Del 14 de noviembre al 17 de diciembre de 2026", equipo: "trio" },
};

export function esSede(v: string | null): v is Sede {
  return v === "en_linea" || v === "tijuana" || v === "monterrey";
}

/** Sesiones informativas generales por Zoom. Hora: 7:00 p.m. Tijuana / 8:00 p.m. Centro. */
export const SESIONES = ["2026-10-29", "2026-11-06", "2026-11-10"] as const;

export function etiquetaSesion(iso: string) {
  const d = new Date(`${iso}T12:00:00-06:00`);
  const dia = d.toLocaleDateString("es-MX", { weekday: "long", timeZone: "America/Mexico_City" });
  const fecha = d.toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "America/Mexico_City" });
  return { dia: dia.charAt(0).toUpperCase() + dia.slice(1), fecha, larga: `${dia} ${fecha}` };
}

/** Sesiones de hoy en adelante (hora de México). */
export function sesionesVigentes(): string[] {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return SESIONES.filter((s) => s >= hoy);
}

export function esFormato(v: string | null): v is Formato {
  return v === "vertical" || v === "cuadrado" || v === "horizontal";
}
export function esPlantilla(v: string | null): v is Plantilla {
  return v === "registro" || v === "sesion";
}

/** Mensaje que acompaña al flyer al compartirlo. */
export function textoCompartir(enlace: string, opts: { invitador?: string | null; plantilla: Plantilla; sesion?: string | null; sede?: Sede }): string {
  const quien = opts.invitador ? "Te invito" : "Te invitamos";
  const sede = opts.sede ? SEDES[opts.sede] : null;
  const donde = !sede ? "" : opts.sede === "en_linea" ? " Lo puedes tomar en línea desde cualquier ciudad." : ` En ${sede.label}: ${sede.detalle.charAt(0).toLowerCase()}${sede.detalle.slice(1)}.`;
  if (opts.plantilla === "sesion" && opts.sesion) {
    const s = etiquetaSesion(opts.sesion);
    return `${quien} a la sesión informativa del Reto Tu Primer Millón: ${s.larga}, 7:00 p.m. Tijuana / 8:00 p.m. Centro, vía Zoom.${donde} Es gratis y hay $350,000 MXN en premios. Regístrate aquí: ${enlace}`;
  }
  return `${quien} al Reto Tu Primer Millón: 30 días para aprender ventas, marketing, negociación y bienes raíces con acompañamiento real.${donde} Es gratis, con atractivas comisiones y $350,000 MXN en premios. Regístrate aquí: ${enlace}`;
}
