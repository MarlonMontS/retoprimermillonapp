/**
 * Normaliza un número de WhatsApp a formato E.164.
 * - 10 dígitos → se asume México (+52)
 * - 12 dígitos que empiezan con 52 → +52...
 * - 13 dígitos que empiezan con 521 (formato viejo de celular MX) → +52 + 10 dígitos
 * - 11 dígitos que empiezan con 1 → +1 (EE. UU. / Canadá)
 * - Con "+" al inicio → se respeta el país
 * Devuelve null si no parece un número válido.
 */
export function normalizarWhatsapp(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  const plus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;

  if (plus) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("521")) return `+52${digits.slice(3)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/** +526641234567 → 664 123 4567 (para mostrar) */
export function formatearWhatsapp(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  if (d.startsWith("52") && d.length === 12) {
    const n = d.slice(2);
    return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  return e164;
}

/** Enlace para abrir una conversación de WhatsApp. */
export function linkWhatsapp(e164: string, texto?: string): string {
  const d = e164.replace(/\D/g, "");
  const q = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${d}${q}`;
}
