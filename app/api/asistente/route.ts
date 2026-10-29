import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getPerfil } from "@/lib/auth";
import { obtenerLiderEstado } from "@/lib/data/equipo";
import { CONOCIMIENTO_RETO, contextoTexto } from "@/lib/asistente";
import { CIUDAD_LABEL, ROL_LABEL } from "@/lib/types";
import { appUrl } from "@/lib/utils";

export const maxDuration = 120;

const MODELO = process.env.ASISTENTE_MODELO || "claude-opus-5-5";

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(6000) }))
    .min(1)
    .max(40),
});

// Límite sencillo por usuario (por instancia): 20 mensajes cada 10 minutos.
const uso = new Map<string, number[]>();
function permitido(id: string): boolean {
  const ahora = Date.now();
  const ventana = (uso.get(id) ?? []).filter((t) => ahora - t < 10 * 60_000);
  if (ventana.length >= 20) return false;
  ventana.push(ahora);
  uso.set(id, ventana);
  return true;
}

export async function POST(req: Request) {
  const perfil = await getPerfil();
  if (!perfil) return new Response("No autorizado", { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return new Response("El asistente todavía no está configurado.", { status: 503 });
  if (!permitido(perfil.id)) return new Response("Llegaste al límite de preguntas por ahora. Intenta en unos minutos.", { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.messages[parsed.data.messages.length - 1].role !== "user") {
    return new Response("Mensaje inválido", { status: 400 });
  }
  // Solo los últimos turnos; el primero debe ser del usuario.
  let mensajes = parsed.data.messages.slice(-20);
  while (mensajes.length && mensajes[0].role !== "user") mensajes = mensajes.slice(1);

  const estado = perfil.rol !== "admin" ? await obtenerLiderEstado(perfil.id) : null;
  const contexto = contextoTexto({
    nombre: perfil.nombre,
    rol: ROL_LABEL[perfil.rol],
    ciudad: perfil.ciudad ? CIUDAD_LABEL[perfil.ciudad] : null,
    gerente: estado?.gerente_nombre ?? null,
    ...(perfil.rol === "lider" && estado
      ? { calificados: estado.calificados, registrados: estado.registrados, pendientes: estado.pendientes, cuota: estado.cuota, desbloqueado: estado.desbloqueado }
      : {}),
    enlace: perfil.slug ? appUrl(`/r/${perfil.slug}`) : null,
  });

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      let escribio = false;
      try {
        const stream = client.beta.messages.stream({
          model: MODELO,
          max_tokens: 8000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system: [
            { type: "text", text: CONOCIMIENTO_RETO, cache_control: { type: "ephemeral" } },
            { type: "text", text: contexto },
          ],
          messages: mensajes,
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            escribio = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal" && !escribio) {
          controller.enqueue(encoder.encode("No puedo ayudarte con eso. Si es una duda del Reto, pregúntale a tu gerente."));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n(La respuesta se cortó. Pídeme que continúe.)"));
        }
      } catch (e) {
        console.error("asistente", e);
        const msg =
          e instanceof Anthropic.RateLimitError
            ? "El asistente está muy ocupado. Intenta en un momento."
            : e instanceof Anthropic.AuthenticationError
              ? "El asistente no está bien configurado. Avísale al administrador."
              : "Hubo un problema al responder. Intenta de nuevo.";
        controller.enqueue(encoder.encode(escribio ? `\n\n${msg}` : msg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(cuerpo, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
