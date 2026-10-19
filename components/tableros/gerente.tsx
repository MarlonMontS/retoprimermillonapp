import Link from "next/link";
import { scopeDe } from "@/lib/data/scope";
import { leadsLigeros, listarLeads } from "@/lib/data/leads";
import { listarLideresEstado } from "@/lib/data/equipo";
import { resumir } from "@/lib/metrics";
import { BarrasHorizontales, BarrasPorDia } from "@/components/charts";
import { LeadsTabla } from "@/components/leads-tabla";
import { RankingTabla } from "@/components/tableros/ranking-tabla";
import { Card, CardTitle, PageHeader, Stat } from "@/components/ui";
import type { Perfil } from "@/lib/types";

export async function TableroGerente({ perfil }: { perfil: Perfil }) {
  const scope = await scopeDe(perfil);
  const [ligeros, equipo, porLlamar] = await Promise.all([
    leadsLigeros(scope),
    listarLideresEstado({ gerenteId: perfil.id }),
    listarLeads(scope, { estatus: "pendientes", orden: "antiguos", limit: 15 }),
  ]);
  const r = resumir(ligeros);
  const desbloqueados = equipo.filter((l) => l.desbloqueado && l.activo).length;

  return (
    <>
      <PageHeader title={`Equipo de ${perfil.nombre}`} subtitle="Tus líderes, sus invitados y la cola de llamadas de filtro" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Leads del equipo" value={r.total} hint={`${r.hoy} hoy`} />
        <Stat label="Calificados" value={r.calificados} tone="accent" />
        <Stat label="Por llamar" value={r.pendientes} hint="te toca filtrarlos" />
        <Stat label="Líderes desbloqueados" value={`${desbloqueados}/${equipo.filter((l) => l.activo).length}`} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Por llamar</h2>
          <Link href="/app/leads?estatus=pendientes" className="text-sm text-muted hover:text-fg">
            Ver toda la cola →
          </Link>
        </div>
        <p className="mb-3 text-sm text-muted">Los más antiguos primero. Entra a cada lead para registrar el resultado de la llamada.</p>
        <LeadsTabla leads={porLlamar.leads} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mis líderes</h2>
          <Link href="/app/lideres" className="text-sm text-muted hover:text-fg">
            Ver equipo →
          </Link>
        </div>
        <RankingTabla lideres={equipo} conEnlaces />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Registros por día · últimos 14 días</CardTitle>
          <BarrasPorDia datos={r.porDia} />
        </Card>
        <Card>
          <CardTitle>Por estatus</CardTitle>
          <BarrasHorizontales filas={r.porEstatus} porEstatus />
        </Card>
      </div>
    </>
  );
}
