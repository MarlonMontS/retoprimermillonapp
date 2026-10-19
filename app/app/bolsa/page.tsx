import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { listarLeads } from "@/lib/data/leads";
import { listarLideresEstado } from "@/lib/data/equipo";
import { getConfig } from "@/lib/data/config";
import { LeadsTabla } from "@/components/leads-tabla";
import { Alert, Button, Card, CardTitle, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { accionRepartir } from "./actions";
import type { SearchParams } from "@/lib/public";

export const metadata: Metadata = { title: "Bolsa común" };
export const dynamic = "force-dynamic";

export default async function BolsaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePerfil(["admin"]);
  const sp = await searchParams;
  const [config, sinAsignar, lideres] = await Promise.all([
    getConfig(),
    listarLeads({ tipo: "todos" }, { bolsa: "sin_asignar", limit: 200, orden: "antiguos" }),
    listarLideresEstado({ soloActivos: true }),
  ]);
  const desbloqueados = lideres.filter((l) => l.desbloqueado);
  const repartibles = sinAsignar.leads.filter((l) => !["duplicado", "descartado", "no_calificado"].includes(l.estatus));
  const repartidos = typeof sp.repartidos === "string" ? Number(sp.repartidos) : null;

  return (
    <>
      <PageHeader
        title="Bolsa común"
        subtitle="Leads de publicidad, colaboraciones y del formulario general sin invitador. La ruleta los reparte entre los líderes que ya cumplieron su cuota."
        actions={
          <form action={accionRepartir}>
            <Button type="submit" disabled={repartibles.length === 0 || desbloqueados.length === 0}>
              Repartir ahora ({repartibles.length})
            </Button>
          </form>
        }
      />

      {repartidos !== null && (
        <Alert tone={repartidos > 0 ? "ok" : "info"} className="mb-4">
          {repartidos > 0 ? `Se repartieron ${repartidos} lead${repartidos === 1 ? "" : "s"}.` : "No había nada que repartir o no hay líderes desbloqueados."}
        </Alert>
      )}
      {!config.ruleta_activa && (
        <Alert tone="warn" className="mb-4">
          La ruleta está apagada en Configuración: los leads nuevos de la bolsa se quedan sin asignar hasta que la prendas o repartas a mano.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Sin asignar" value={repartibles.length} hint="esperando reparto" />
        <Stat label="Líderes desbloqueados" value={desbloqueados.length} hint={`de ${lideres.length} activos`} />
        <Stat label="Ya repartidos" value={lideres.reduce((s, l) => s + l.bolsa_recibidos, 0)} hint="en total" />
      </div>

      <Card className="mt-4">
        <CardTitle>Cómo funciona la ruleta</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Cada lead sin invitador se asigna al azar entre los líderes desbloqueados que menos leads de bolsa han recibido, así el reparto queda parejo.</li>
          <li>Corre solo cuando llega un lead nuevo a la bolsa y cuando un líder se desbloquea. También puedes forzarla con el botón «Repartir ahora».</li>
          <li>Si nadie ha cumplido la cuota, los leads esperan aquí. Los leads de bolsa no cuentan para la cuota de invitados del líder que los recibe.</li>
          <li>Un lead importado sin responsable también entra a la bolsa, pero no se reparte hasta que corra la ruleta.</li>
        </ul>
      </Card>

      {desbloqueados.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Reparto por líder</h2>
          <Table>
            <thead>
              <tr>
                <Th>Líder</Th>
                <Th>Gerente</Th>
                <Th className="text-right">Recibidos de bolsa</Th>
                <Th className="text-right">Calificados de bolsa</Th>
                <Th className="text-right">Invitados calificados</Th>
              </tr>
            </thead>
            <tbody>
              {desbloqueados
                .sort((a, b) => b.bolsa_recibidos - a.bolsa_recibidos)
                .map((l) => (
                  <tr key={l.id}>
                    <Td className="font-medium">{l.nombre}</Td>
                    <Td className="text-muted">{l.gerente_nombre ?? "—"}</Td>
                    <Td className="text-right tabular-nums">{l.bolsa_recibidos}</Td>
                    <Td className="text-right tabular-nums text-accent">{l.bolsa_calificados}</Td>
                    <Td className="text-right tabular-nums text-muted">{l.calificados}</Td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Leads sin asignar</h2>
        <LeadsTabla leads={sinAsignar.leads} />
      </div>
    </>
  );
}
