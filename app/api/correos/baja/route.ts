import { createAdminClient } from "@/lib/supabase/admin";
import { darDeBaja } from "@/lib/correos/motor";

/** Baja en un clic (List-Unsubscribe-Post) que usan Gmail y otros clientes. */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("t");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return new Response("Enlace inválido", { status: 400 });
  const { data } = await createAdminClient().from("mail_envios").select("email, campana_id").eq("token", token).maybeSingle();
  if (data) await darDeBaja(data.email, "baja", data.campana_id);
  return new Response("ok");
}
