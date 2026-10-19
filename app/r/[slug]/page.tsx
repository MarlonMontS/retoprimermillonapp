import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { RegistroForm } from "@/components/registro-form";
import { fuentePorSlug } from "@/lib/data/fuentes";
import { esEmbed, leerUtm, tema, urlAviso, type SearchParams } from "@/lib/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const fuente = await fuentePorSlug(slug);
  return { title: fuente?.perfil ? `Te invita ${fuente.perfil.nombre}` : "Registro" };
}

export default async function RegistroPorEnlace({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const fuente = await fuentePorSlug(slug);
  if (!fuente) notFound();

  const embed = esEmbed(sp);
  const aviso = await urlAviso();

  return (
    <PublicShell
      embed={embed}
      tema={tema(sp)}
      titulo={fuente.perfil ? `${fuente.perfil.nombre} te invita al Reto` : "Regístrate al Reto"}
    >
      <RegistroForm
        modo="fijo"
        fuenteSlug={fuente.slug}
        invitadorNombre={fuente.perfil?.nombre ?? null}
        utm={leerUtm(sp)}
        embed={embed}
        avisoUrl={aviso}
      />
    </PublicShell>
  );
}
