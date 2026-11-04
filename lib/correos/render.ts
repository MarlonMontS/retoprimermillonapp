export const INTENCIONES = {
  invitar_reto: { label: "Invitar al Reto", descripcion: "Presentar el programa y que se registren" },
  sesion_informativa: { label: "Invitar a la sesión informativa", descripcion: "Que se conecten a la sesión por Zoom" },
  seguimiento: { label: "Dar seguimiento a interesados", descripcion: "Retomar con quien ya mostró interés" },
  recordatorio: { label: "Recordatorio de fecha", descripcion: "Avisar que se acerca el Día Cero o una sesión" },
  ultimo_llamado: { label: "Último llamado", descripcion: "Cierre de registro con urgencia honesta" },
  otro: { label: "Otro objetivo", descripcion: "Descríbelo con tus palabras" },
} as const;
export type Intencion = keyof typeof INTENCIONES;

export const VARIABLES = [
  { clave: "{{nombre}}", label: "Nombre del contacto" },
  { clave: "{{apellido}}", label: "Apellido del contacto" },
  { clave: "{{mi_nombre}}", label: "Tu nombre" },
  { clave: "{{mi_enlace}}", label: "Tu enlace de registro" },
] as const;

export const FRECUENCIAS = [1, 2, 3, 5, 7, 14] as const;

export const DOMICILIO_REMITENTE = "Reto Tu Primer Millón · Blvd. Salinas 10650-7, Col. Aviación, C.P. 22014, Tijuana, B.C., México";

export interface Valores {
  nombre?: string | null;
  apellido?: string | null;
  mi_nombre: string;
  mi_enlace: string;
}

/** Sustituye variables. Si falta el nombre, limpia saludos como "Hola , ..." */
export function personalizar(texto: string, v: Valores): string {
  return texto
    .replace(/\{\{\s*nombre\s*\}\}/gi, (v.nombre ?? "").trim())
    .replace(/\{\{\s*apellido\s*\}\}/gi, (v.apellido ?? "").trim())
    .replace(/\{\{\s*mi_nombre\s*\}\}/gi, v.mi_nombre)
    .replace(/\{\{\s*mi_enlace\s*\}\}/gi, v.mi_enlace)
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g;

function parrafoHtml(p: string): string {
  const limpio = p.trim();
  if (/^https?:\/\/\S+$/.test(limpio)) {
    const u = esc(limpio);
    return `<p style="margin:24px 0"><a href="${u}" style="background:#c6ff3a;color:#090b0a;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">Quiero registrarme</a></p>`;
  }
  const html = esc(limpio).replace(URL_RE, (u) => `<a href="${u}" style="color:#3f7d00">${u}</a>`).replace(/\n/g, "<br>");
  return `<p style="margin:0 0 16px">${html}</p>`;
}

export function correoHtml(cuerpo: string, urlBaja: string): string {
  const parrafos = cuerpo.split(/\n\s*\n/).filter((p) => p.trim()).map(parrafoHtml).join("");
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f4f5f0"><div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#1a1f1b"><div style="background:#ffffff;border-radius:12px;padding:26px">${parrafos}</div><p style="font-size:12px;line-height:1.5;color:#6b736c;margin:18px 6px 0">${esc(DOMICILIO_REMITENTE)}<br>Si no quieres recibir más correos, <a href="${esc(urlBaja)}" style="color:#6b736c">date de baja aquí</a>.</p></div></body></html>`;
}

export function correoTexto(cuerpo: string, urlBaja: string): string {
  return `${cuerpo.trim()}\n\n--\n${DOMICILIO_REMITENTE}\nDarte de baja: ${urlBaja}`;
}

export const esEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s);
