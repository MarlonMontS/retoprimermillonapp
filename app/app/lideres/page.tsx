import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { listarLideresEstado } from "@/lib/data/equipo";
import { RankingTabla } from "@/components/tableros/ranking-tabla";
import { ButtonLink, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Líderes" };
export const dynamic = "force-dynamic";

export default async function LideresPage() {
  const perfil = await requirePerfil(["admin", "gerente"]);
  const esAdmin = perfil.rol === "admin";
  const lideres = await listarLideresEstado({ gerenteId: esAdmin ? undefined : perfil.id });
  const activos = lideres.filter((l) => l.activo);
  const desbloqueados = activos.filter((l) => l.desbloqueado).length;

  return (
    <>
      <PageHeader
        title={esAdmin ? "Líderes de equipo" : "Mi equipo"}
        subtitle={`${activos.length} activos · ${desbloqueados} con la bolsa desbloqueada`}
        actions={
          <>
            <ButtonLink href="/app/lideres/nuevo">Nuevo líder</ButtonLink>
            {esAdmin && (
              <ButtonLink href="/app/lideres/importar" variant="secondary">
                Importar equipo
              </ButtonLink>
            )}
          </>
        }
      />
      <RankingTabla lideres={lideres} conEnlaces mostrarGerente={esAdmin} />
    </>
  );
}
