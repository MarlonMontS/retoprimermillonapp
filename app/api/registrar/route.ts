import { NextResponse, after } from "next/server";
import { z } from "zod";
import { normalizarWhatsapp } from "@/lib/phone";
import { registrarLead } from "@/lib/data/leads";
import { enviarLeadMeta } from "@/lib/meta";

const schema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre").max(80),
  apellido: z.string().trim().max(80).optional().default(""),
  whatsapp: z.string().trim().min(10, "Revisa tu número de WhatsApp").max(25),
  email: z.string().trim().max(120).optional().default(""),
  ciudad: z.enum(["tijuana", "monterrey", "en_linea"]).optional().nullable(),
  experiencia: z.string().trim().max(40).optional().default(""),
  motivo: z.string().trim().max(2000).optional().default(""),
  como_se_entero: z.string().trim().max(120).optional().default(""),
  fuente_slug: z.string().trim().max(60).optional().nullable(),
  lider_id: z.uuid().optional().nullable(),
  utm: z.record(z.string(), z.string().max(120)).optional().default({}),
  origen: z.enum(["link", "selector"]).optional().default("selector"),
  consentimiento: z.boolean().optional().default(false),
  empresa: z.string().optional().default(""),
  fbclid: z.string().trim().max(200).optional().default(""),
  pagina: z.string().trim().max(500).optional().default(""),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const d = parsed.data;

  // Honeypot: un bot llenó el campo oculto. Respondemos como si todo hubiera salido bien.
  if (d.empresa) return NextResponse.json({ ok: true });

  const whatsapp = normalizarWhatsapp(d.whatsapp);
  if (!whatsapp) return NextResponse.json({ error: "Revisa tu número de WhatsApp (10 dígitos)." }, { status: 400 });

  const email = d.email && z.email().safeParse(d.email).success ? d.email.toLowerCase() : null;
  if (d.email && !email) return NextResponse.json({ error: "Revisa tu correo." }, { status: 400 });

  try {
    const lead = await registrarLead({
      nombre: d.nombre,
      apellido: d.apellido || null,
      whatsapp,
      email,
      ciudad: d.ciudad ?? null,
      experiencia: d.experiencia || null,
      motivo: d.motivo || null,
      como_se_entero: d.como_se_entero || null,
      fuente_slug: d.fuente_slug || null,
      lider_id: d.lider_id || null,
      utm: d.utm,
      origen: d.origen,
      consentimiento: d.consentimiento,
    });

    // Lead a la API de conversiones de Meta, después de responder. Los duplicados no cuentan.
    if (lead.estatus !== "duplicado") {
      const cookies = leerCookies(req.headers.get("cookie"));
      const evento = {
        eventId: lead.id,
        email,
        whatsapp,
        nombre: d.nombre,
        apellido: d.apellido || null,
        ciudad: d.ciudad ?? null,
        fuente: d.fuente_slug || null,
        ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
        fbp: cookies._fbp ?? null,
        fbc: cookies._fbc ?? null,
        fbclid: d.fbclid || null,
        urlOrigen: d.pagina || req.headers.get("referer"),
      };
      after(() => enviarLeadMeta(evento));
    }

    return NextResponse.json({ ok: true, id: lead.id, estatus: lead.estatus });
  } catch (e) {
    console.error("registrar_lead", e);
    return NextResponse.json({ error: "No pudimos guardar tu registro. Intenta de nuevo en un momento." }, { status: 500 });
  }
}

function leerCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const parte of (header ?? "").split(";")) {
    const i = parte.indexOf("=");
    if (i > 0) {
      try {
        out[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
      } catch {
        out[parte.slice(0, i).trim()] = parte.slice(i + 1).trim();
      }
    }
  }
  return out;
}
