import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/utils";
import { correoHtml, correoTexto, personalizar } from "@/lib/correos/render";

/** Tope diario de toda la app (plan gratuito de Resend: 100). Lo que no alcanza sale al día siguiente. */
export const LIMITE_DIARIO = Number(process.env.MAIL_LIMITE_DIARIO || 100);
const TAM_LOTE = 100;

export function correoConfigurado() {
  return Boolean((process.env.RESEND_API_KEY && process.env.MAIL_FROM) || process.env.MAIL_SIMULADO);
}

function remitente(nombre: string) {
  const limpio = nombre.replace(/["<>]/g, "").trim();
  return `${limpio} vía Reto Tu Primer Millón <${process.env.MAIL_FROM}>`;
}

interface Salida {
  from: string;
  to: string;
  reply_to?: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

async function enviarLote(correos: Salida[]): Promise<{ ids?: string[]; error?: string; reintentar?: boolean }> {
  if (process.env.MAIL_SIMULADO) return { ids: correos.map(() => `sim-${crypto.randomUUID()}`) };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.batch.send(correos.map((c) => ({ ...c, replyTo: c.reply_to, reply_to: undefined })));
  if (error) return { error: error.message, reintentar: /rate|limit|quota/i.test(`${error.name} ${error.message}`) };
  return { ids: (data?.data ?? []).map((d) => d.id) };
}

export async function enviarPrueba(a: string, asunto: string, cuerpo: string, miNombre: string, miEnlace: string, responderA: string) {
  const valores = { nombre: miNombre.split(" ")[0], apellido: "", mi_nombre: miNombre, mi_enlace: miEnlace };
  const texto = personalizar(cuerpo, valores);
  const baja = appUrl("/baja/prueba");
  const r = await enviarLote([
    { from: remitente(miNombre), to: a, reply_to: responderA, subject: `[Prueba] ${personalizar(asunto, valores)}`, html: correoHtml(texto, baja), text: correoTexto(texto, baja), headers: {} },
  ]);
  if (r.error) throw new Error(r.error);
}

type Fila = {
  id: string;
  token: string;
  campana_id: string;
  paso_id: string;
  contacto_id: string | null;
  email: string;
  nombre: string | null;
  apellido: string | null;
  mail_pasos: { orden: number; asunto: string; cuerpo: string };
  mail_campanas: { id: string; estado: string; frecuencia_dias: number; solo_no_abrieron: boolean; perfiles: { nombre: string; email: string; slug: string | null } };
};

/** Envía lo que ya toca, respetando el tope diario. Es seguro correrlo en paralelo. */
export async function procesarCola(): Promise<{ enviados: number; omitidos: number; fallidos: number }> {
  const res = { enviados: 0, omitidos: 0, fallidos: 0 };
  if (!correoConfigurado()) return res;
  const db = createAdminClient();
  const ahora = new Date();

  // Recupera envíos que quedaron a medias por una caída
  await db
    .from("mail_envios")
    .update({ estado: "pendiente", tomado_at: null })
    .eq("estado", "enviando")
    .is("resend_id", null)
    .lt("tomado_at", new Date(ahora.getTime() - 30 * 60_000).toISOString());

  for (let vuelta = 0; vuelta < 30; vuelta++) {
    const inicioDia = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "UTC" }) + "T00:00:00Z").toISOString();
    const { count } = await db.from("mail_envios").select("id", { count: "exact", head: true }).gte("enviado_at", inicioDia);
    const cupo = LIMITE_DIARIO - (count ?? 0);
    if (cupo <= 0) break;

    const { data: candidatos } = await db
      .from("mail_envios")
      .select("id, mail_campanas!inner(estado)")
      .eq("estado", "pendiente")
      .eq("mail_campanas.estado", "activa")
      .lte("programado_para", new Date().toISOString())
      .order("programado_para")
      .limit(Math.min(cupo, TAM_LOTE));
    if (!candidatos?.length) break;

    // Reclamo atómico: si otro proceso ya los tomó, no se duplican
    const { data: tomados } = await db
      .from("mail_envios")
      .update({ estado: "enviando", tomado_at: new Date().toISOString() })
      .in("id", candidatos.map((c) => c.id))
      .eq("estado", "pendiente")
      .select(
        "id, token, campana_id, paso_id, contacto_id, email, nombre, apellido, mail_pasos(orden, asunto, cuerpo), mail_campanas(id, estado, frecuencia_dias, solo_no_abrieron, perfiles(nombre, email, slug))"
      );
    const filas = (tomados ?? []) as unknown as Fila[];
    if (!filas.length) continue;

    const emails = filas.map((f) => f.email);
    const [{ data: bajas }, { data: registrados }] = await Promise.all([
      db.from("mail_bajas").select("email").in("email", emails),
      db.from("leads").select("email").in("email", emails),
    ]);
    const enBaja = new Set((bajas ?? []).map((b) => b.email as string));
    const yaRegistrados = new Set((registrados ?? []).map((l) => l.email as string));

    const salen: { fila: Fila; correo: Salida }[] = [];
    for (const f of filas) {
      const c = f.mail_campanas;
      let motivo: string | null = null;
      if (enBaja.has(f.email)) motivo = "dado de baja";
      else if (f.mail_pasos.orden > 1 && yaRegistrados.has(f.email)) motivo = "ya se registró";
      else if (f.mail_pasos.orden > 1 && c.solo_no_abrieron) {
        const { count: abiertos } = await db
          .from("mail_envios")
          .select("id", { count: "exact", head: true })
          .eq("campana_id", f.campana_id)
          .eq("email", f.email)
          .not("abierto_at", "is", null);
        if ((abiertos ?? 0) > 0) motivo = "ya abrió un correo";
      }
      if (motivo) {
        await db.from("mail_envios").update({ estado: "omitido", motivo }).eq("id", f.id);
        res.omitidos++;
        continue;
      }
      const dueno = c.perfiles;
      const enlace = `${appUrl(dueno.slug ? `/r/${dueno.slug}` : "/registro")}?utm_source=correo&utm_medium=email&utm_campaign=${c.id}`;
      const valores = { nombre: f.nombre, apellido: f.apellido, mi_nombre: dueno.nombre, mi_enlace: enlace };
      const cuerpo = personalizar(f.mail_pasos.cuerpo, valores);
      const baja = appUrl(`/baja/${f.token}`);
      salen.push({
        fila: f,
        correo: {
          from: remitente(dueno.nombre),
          to: f.email,
          reply_to: dueno.email,
          subject: personalizar(f.mail_pasos.asunto, valores),
          html: correoHtml(cuerpo, baja),
          text: correoTexto(cuerpo, baja),
          headers: {
            "List-Unsubscribe": `<${appUrl(`/api/correos/baja?t=${f.token}`)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
      });
    }
    if (!salen.length) continue;

    const r = await enviarLote(salen.map((s) => s.correo));
    if (r.error) {
      const ids = salen.map((s) => s.fila.id);
      if (r.reintentar) {
        await db.from("mail_envios").update({ estado: "pendiente", tomado_at: null, error: r.error }).in("id", ids);
        break;
      }
      await db.from("mail_envios").update({ estado: "fallido", error: r.error }).in("id", ids);
      res.fallidos += ids.length;
      continue;
    }

    const enviadoAt = new Date();
    await Promise.all(
      salen.map((s, i) => db.from("mail_envios").update({ estado: "enviado", enviado_at: enviadoAt.toISOString(), resend_id: r.ids?.[i] ?? null, error: null }).eq("id", s.fila.id))
    );
    res.enviados += salen.length;
    await programarSiguientes(salen.map((s) => s.fila), enviadoAt);
    await new Promise((ok) => setTimeout(ok, 600));
  }

  await cerrarTerminadas();
  return res;
}

/** Tras enviar un paso, deja programado el siguiente para ese contacto. */
async function programarSiguientes(filas: Fila[], enviadoAt: Date) {
  const db = createAdminClient();
  const campanas = Array.from(new Set(filas.map((f) => f.campana_id)));
  const { data: pasos } = await db.from("mail_pasos").select("id, campana_id, orden").in("campana_id", campanas);
  const nuevos = [];
  for (const f of filas) {
    const siguiente = (pasos ?? []).find((p) => p.campana_id === f.campana_id && p.orden === f.mail_pasos.orden + 1);
    if (!siguiente) continue;
    const cuando = new Date(enviadoAt.getTime() + f.mail_campanas.frecuencia_dias * 86_400_000);
    nuevos.push({ campana_id: f.campana_id, paso_id: siguiente.id, contacto_id: f.contacto_id, email: f.email, nombre: f.nombre, apellido: f.apellido, programado_para: cuando.toISOString() });
  }
  if (nuevos.length) await db.from("mail_envios").upsert(nuevos, { onConflict: "paso_id,contacto_id", ignoreDuplicates: true });
}

async function cerrarTerminadas() {
  const db = createAdminClient();
  const { data: activas } = await db.from("mail_campanas").select("id").eq("estado", "activa");
  for (const c of activas ?? []) {
    const { count } = await db.from("mail_envios").select("id", { count: "exact", head: true }).eq("campana_id", c.id).in("estado", ["pendiente", "enviando"]);
    if (!count) await db.from("mail_campanas").update({ estado: "terminada" }).eq("id", c.id);
  }
}

/** Da de baja un correo para toda la app y cancela lo que tuviera pendiente. */
export async function darDeBaja(email: string, motivo: "baja" | "rebote" | "queja", campanaId: string | null) {
  const db = createAdminClient();
  await db.from("mail_bajas").upsert({ email, motivo, campana_id: campanaId }, { onConflict: "email", ignoreDuplicates: true });
  await db.from("mail_envios").update({ estado: "omitido", motivo: "dado de baja" }).eq("email", email).eq("estado", "pendiente");
}
