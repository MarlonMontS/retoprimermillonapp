import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { darDeBaja } from "@/lib/correos/motor";

interface Evento {
  type: string;
  created_at?: string;
  data?: { email_id?: string; created_at?: string };
}

/** Recibe de Resend entregas, aperturas, clics, rebotes y quejas. */
export async function POST(req: Request) {
  const secreto = process.env.RESEND_WEBHOOK_SECRET;
  if (!secreto) return new Response("Sin configurar", { status: 503 });
  const payload = await req.text();
  let ev: Evento;
  try {
    ev = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secreto,
    }) as unknown as Evento;
  } catch {
    return new Response("Firma inválida", { status: 400 });
  }

  const resendId = ev.data?.email_id;
  if (!resendId) return Response.json({ ok: true });
  const db = createAdminClient();
  const { data: envio } = await db
    .from("mail_envios")
    .select("id, email, campana_id, estado, entregado_at, abierto_at, aperturas, clic_at, clics")
    .eq("resend_id", resendId)
    .maybeSingle();
  if (!envio) return Response.json({ ok: true });

  const cuando = ev.created_at ?? new Date().toISOString();
  switch (ev.type) {
    case "email.delivered":
      await db.from("mail_envios").update({ estado: "entregado", entregado_at: envio.entregado_at ?? cuando }).eq("id", envio.id);
      break;
    case "email.opened":
      await db.from("mail_envios").update({ abierto_at: envio.abierto_at ?? cuando, aperturas: envio.aperturas + 1 }).eq("id", envio.id);
      break;
    case "email.clicked":
      await db
        .from("mail_envios")
        .update({ clic_at: envio.clic_at ?? cuando, clics: envio.clics + 1, abierto_at: envio.abierto_at ?? cuando })
        .eq("id", envio.id);
      break;
    case "email.bounced":
      await db.from("mail_envios").update({ estado: "rebotado" }).eq("id", envio.id);
      await darDeBaja(envio.email, "rebote", envio.campana_id);
      break;
    case "email.complained":
      await db.from("mail_envios").update({ estado: "queja" }).eq("id", envio.id);
      await darDeBaja(envio.email, "queja", envio.campana_id);
      break;
    case "email.failed":
    case "email.suppressed":
      await db.from("mail_envios").update({ estado: "fallido", error: ev.type }).eq("id", envio.id);
      break;
  }
  return Response.json({ ok: true });
}
