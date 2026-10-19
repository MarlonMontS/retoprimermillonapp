import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { RegistroForm } from "@/components/registro-form";
import { fuentePorSlug, listarInvitadoresPublicos } from "@/lib/data/fuentes";
import { esEmbed, leerUtm, tema, urlAviso, type SearchParams } from "@/lib/public";

export const metadata: Metadata = { title: "Registro" };
export const dynamic = "force-dynamic";

export default async function RegistroPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const embed = esEmbed(sp);
  const utm = leerUtm(sp);
  const aviso = await urlAviso();
  const ref = typeof sp.ref === "string" ? sp.ref : null;

  if (ref) {
    const fuente = await fuentePorSlug(ref);
    if (fuente) {
      return (
        <PublicShell embed={embed} tema={tema(sp)}>
          <RegistroForm
            modo="fijo"
            fuenteSlug={fuente.slug}
            invitadorNombre={fuente.perfil?.nombre ?? null}
            utm={utm}
            embed={embed}
            avisoUrl={aviso}
          />
        </PublicShell>
      );
    }
  }

  const invitadores = await listarInvitadoresPublicos();
  return (
    <PublicShell embed={embed} tema={tema(sp)}>
      <RegistroForm modo="selector" invitadores={invitadores} utm={utm} embed={embed} avisoUrl={aviso} />
    </PublicShell>
  );
}
