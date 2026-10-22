import { createHash } from "node:crypto";

/**
 * API de conversiones de Meta (lado servidor).
 * Manda el evento Lead con los datos del registro hasheados y el id del lead como event_id,
 * para que Meta lo deduplique contra el mismo evento disparado por el pixel en el navegador.
 * Requiere META_CAPI_TOKEN (Administrador de eventos → Configuración → API de conversiones) y el pixel.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v25.0";

export interface EventoLead {
  eventId: string;
  email: string | null;
  whatsapp: string; // E.164
  nombre: string;
  apellido: string | null;
  ciudad: string | null;
  fuente: string | null;
  ip: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
  fbclid: string | null;
  urlOrigen: string | null;
}

function sha256(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}

function hashTexto(v: string | null | undefined): string | undefined {
  const t = (v ?? "").trim().toLowerCase();
  return t ? sha256(t) : undefined;
}

function hashTelefono(e164: string): string | undefined {
  const digitos = e164.replace(/\D/g, "");
  return digitos ? sha256(digitos) : undefined;
}

export function metaConfigurado(): boolean {
  return Boolean((process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID) && process.env.META_CAPI_TOKEN);
}

/** Envía el Lead a Meta. Nunca lanza: si falta configuración o falla la llamada, solo lo registra en consola. */
export async function enviarLeadMeta(ev: EventoLead): Promise<void> {
  const pixel = process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return;

  const fbc = ev.fbc ?? (ev.fbclid ? `fb.1.${Date.now()}.${ev.fbclid}` : undefined);
  const user_data = {
    em: ev.email ? [hashTexto(ev.email)] : undefined,
    ph: [hashTelefono(ev.whatsapp)],
    fn: [hashTexto(ev.nombre)],
    ln: ev.apellido ? [hashTexto(ev.apellido)] : undefined,
    external_id: [sha256(ev.eventId)],
    client_ip_address: ev.ip ?? undefined,
    client_user_agent: ev.userAgent ?? undefined,
    fbp: ev.fbp ?? undefined,
    fbc,
  };
  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: "website",
        event_source_url: ev.urlOrigen ?? undefined,
        user_data,
        custom_data: {
          content_name: "Reto Primer Millón",
          content_category: ev.ciudad ?? undefined,
          fuente: ev.fuente ?? undefined,
        },
      },
    ],
  };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("meta_capi", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("meta_capi", e);
  }
}
