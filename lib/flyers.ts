export type Formato = "vertical" | "cuadrado" | "horizontal";
export type Plantilla = "invitacion" | "premios" | "aprende";

export const FORMATOS: Record<Formato, { ancho: number; alto: number; label: string; uso: string }> = {
  vertical: { ancho: 1080, alto: 1920, label: "Vertical", uso: "Estados de WhatsApp, historias de Instagram y Facebook" },
  cuadrado: { ancho: 1080, alto: 1080, label: "Cuadrado", uso: "Chats de WhatsApp, publicaciones de Instagram y Facebook" },
  horizontal: { ancho: 1920, alto: 1080, label: "Horizontal", uso: "Correo, presentaciones, Facebook y LinkedIn" },
};

export const PLANTILLAS: Record<Plantilla, { label: string; descripcion: string }> = {
  invitacion: { label: "Invitación", descripcion: "Qué es el Reto, fechas y cómo registrarse" },
  premios: { label: "Premios", descripcion: "Los $350,000 MXN en premios y cómo se ganan folios" },
  aprende: { label: "Lo que vas a aprender", descripcion: "Temas del programa y acompañamiento" },
};

export function esFormato(v: string | null): v is Formato {
  return v === "vertical" || v === "cuadrado" || v === "horizontal";
}
export function esPlantilla(v: string | null): v is Plantilla {
  return v === "invitacion" || v === "premios" || v === "aprende";
}

/** Mensaje que acompaña al flyer al compartirlo. */
export function textoCompartir(enlace: string, invitador?: string | null): string {
  const quien = invitador ? `Te invito` : "Te invitamos";
  return `${quien} al Reto Primer Millón: 30 días para aprender ventas, marketing, negociación y bienes raíces con acompañamiento real. Es gratis y hay $350,000 MXN en premios. Regístrate aquí: ${enlace}`;
}
