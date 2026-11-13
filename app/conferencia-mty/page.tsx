import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { ConferenciaForm } from "@/components/conferencia-form";
import { esEmbed, leerUtm, tema, urlAviso, type SearchParams } from "@/lib/public";

export const metadata: Metadata = { title: "Conferencia de apertura en Monterrey" };
export const dynamic = "force-dynamic";

/** Registro a la conferencia de apertura en Monterrey. Es público en general, no participantes del Reto. */
export default async function ConferenciaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const embed = esEmbed(sp);
  return (
    <PublicShell
      embed={embed}
      tema={tema(sp)}
      pixel={false}
      titulo="Conferencia de apertura en Monterrey"
      subtitulo="Sábado 14 de noviembre · 7:00 p.m. Regístrate para asistir a la conferencia de apertura del Reto Tu Primer Millón en Monterrey. La entrada es gratuita y abierta al público."
    >
      <ConferenciaForm utm={leerUtm(sp)} embed={embed} avisoUrl={await urlAviso()} />
    </PublicShell>
  );
}
