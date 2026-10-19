import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { listarLideresEstado } from "@/lib/data/equipo";
import { RankingTabla } from "@/components/tableros/ranking-tabla";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Ranking" };
export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const perfil = await requirePerfil();
  const lideres = await listarLideresEstado({ soloActivos: true });
  const desbloqueados = lideres.filter((l) => l.desbloqueado).length;
  return (
    <>
      <PageHeader
        title="Ranking de líderes"
        subtitle={`${desbloqueados} de ${lideres.length} líderes ya desbloquearon la bolsa común. Se ordena por invitados calificados.`}
      />
      <RankingTabla lideres={lideres} resaltar={perfil.id} />
    </>
  );
}
