export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Contraseña legible de 10 caracteres, sin caracteres confusos. */
export function generarPassword(): string {
  const alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

const fmtFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Mexico_City",
});
const fmtFechaHora = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

export function fecha(iso: string | null | undefined): string {
  if (!iso) return "";
  return fmtFecha.format(new Date(iso));
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "";
  return fmtFechaHora.format(new Date(iso));
}

export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export function nombreCompleto(l: { nombre: string; apellido?: string | null }): string {
  return [l.nombre, l.apellido].filter(Boolean).join(" ");
}

/** Detecta la ciudad del Reto a partir de un texto libre. */
export function detectarCiudad(txt: string | undefined | null): "tijuana" | "monterrey" | "en_linea" | null {
  const t = (txt ?? "").toLowerCase();
  if (t.includes("tijuana")) return "tijuana";
  if (t.includes("monterrey")) return "monterrey";
  if (t.includes("línea") || t.includes("linea") || t.includes("online") || t.includes("virtual")) return "en_linea";
  return null;
}
