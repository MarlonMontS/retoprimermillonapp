import Link from "next/link";
import { contarBolsaSinAsignar, leadsLigeros, listarLeads } from "@/lib/data/leads";
import { listarLideresEstado } from "@/lib/data/equipo";
import { resumir } from "@/lib/metrics";
import { BarrasHorizontales, BarrasPorDia } from "@/components/charts";
import { LeadsTabla } from "@/components/leads-tabla";
import { RankingTabla } from "@/components/tableros/ranking-tabla";
import { Card, CardTitle, PageHeader, Stat } from "@/components/ui";

export async function TableroAdmin() {
  const scope = { tipo: "todos" as const };
  const [ligeros, lideres, sinAsignar, recientes] = await Promise.all([
    leadsLigeros(scope),
    listarLideresEstado(),
    contarBolsaSinAsignar(),
    listarLeads(scope, { limit: 10 }),
  ]);
  const r = resumir(ligeros);
  const desbloqueados = lideres.filter((l) => l.desbloqueado && l.activo).length;
  const activos = lideres.filter((l) => l.activo).length;

  return (
    <>
      <PageHeader title="Tablero" subtitle="Vista general del Reto Primer Millón" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Registros" value={r.total} hint={`${r.hoy} hoy`} />
        <Stat label="Calificados" value={r.calificados} tone="accent" hint={r.total ? `${Math.round((r.calificados / r.total) * 100)}% del total` : undefined} />
        <Stat label="Por llamar" value={r.pendientes} hint="nuevos, en contacto, no contesta" />
        <Stat label="Descartados" value={r.descartados} hint="no calificados y descartados" />
        <Stat label="Bolsa sin asignar" value={sinAsignar} hint={r.bolsa ? `${r.bolsa} ya repartidos` : "esperando líderes desbloqueados"} />
        <Stat label="Líderes desbloqueados" value={`${desbloqueados}/${activos}`} hint="cumplieron la cuota" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle>Registros por día · últimos 14 días</CardTitle>
          <BarrasPorDia datos={r.porDia} />
        </Card>
        <Card>
          <CardTitle>Por estatus</CardTitle>
          <BarrasHorizontales filas={r.porEstatus} porEstatus />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Por ciudad</CardTitle>
          <BarrasHorizontales filas={r.porCiudad} />
        </Card>
        <Card>
          <CardTitle>Por tipo de fuente</CardTitle>
          <BarrasHorizontales filas={r.porFuente} />
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ranking de líderes</h2>
          <Link href="/app/lideres" className="text-sm text-muted hover:text-fg">
            Ver todos →
          </Link>
        </div>
        <RankingTabla lideres={lideres.filter((l) => l.activo)} conEnlaces mostrarGerente limite={10} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimos registros</h2>
          <Link href="/app/leads" className="text-sm text-muted hover:text-fg">
            Ver todos →
          </Link>
        </div>
        <LeadsTabla leads={recientes.leads} compacta />
      </div>
    </>
  );
}
