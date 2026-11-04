import { procesarCola } from "@/lib/correos/motor";

export const maxDuration = 120;

/** Vercel Cron: envía los seguimientos que ya tocan. Protegido con CRON_SECRET. */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return new Response("No autorizado", { status: 401 });
  }
  return Response.json(await procesarCola());
}
