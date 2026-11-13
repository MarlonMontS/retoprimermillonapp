import type { Metadata } from "next";
import Image from "next/image";
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
      <Image
        src="/conferencia/conferencia-apertura-mty.jpg"
        width={1080}
        height={1350}
        priority
        sizes="(max-width: 672px) 100vw, 600px"
        alt="Conferencia de apertura con Bernardo Feta, «¿Qué te tiene que pasar?», y Marco Montiel, «El éxito no es justo». Sábado 14 de noviembre a las 7:00 p.m. en Fiesta Inn Monterrey Tecnológico, Eugenio Garza Sada 2411, Roma, Distrito Tec, Monterrey, N.L. Evento gratuito."
        className="mb-6 h-auto w-full rounded-xl"
      />
      <ConferenciaForm utm={leerUtm(sp)} embed={embed} avisoUrl={await urlAviso()} />
    </PublicShell>
  );
}
