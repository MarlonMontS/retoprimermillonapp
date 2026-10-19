import Link from "next/link";
import { listarLeads } from "@/lib/data/leads";
import { listarLideresEstado, obtenerLiderEstado } from "@/lib/data/equipo";
import { LeadsTabla } from "@/components/leads-tabla";
import { BotonCopiar, BotonWhatsapp } from "@/components/copiar";
import { Alert, Card, CardTitle, PageHeader, Progress, Stat } from "@/components/ui";
import { appUrl } from "@/lib/utils";
import type { Perfil } from "@/lib/types";

export function mensajeInvitacion(url: string) {
  return `¡Hola! Te invito al Reto Primer Millón: 30 días para aprender ventas, marketing, negociación y bienes raíces con acompañamiento real. Es gratis y hay premios. Regístrate con mi enlace: ${url}`;
}

export async function TableroLider({ perfil }: { perfil: Perfil }) {
  const [estado, ranking, { leads }] = await Promise.all([
    obtenerLiderEstado(perfil.id),
    listarLideresEstado({ soloActivos: true }),
    listarLeads({ tipo: "ids", ids: [perfil.id] }, { limit: 100 }),
  ]);
  const cuota = estado?.cuota ?? 5;
  const calificados = estado?.calificados ?? 0;
  const faltan = Math.max(0, cuota - calificados);
  const posicion = ranking.findIndex((l) => l.id === perfil.id) + 1;
  const url = appUrl(`/r/${perfil.slug ?? ""}`);
  const invitados = leads.filter((l) => !l.desde_bolsa);
  const deBolsa = leads.filter((l) => l.desde_bolsa);

  return (
    <>
      <PageHeader title={`Hola, ${perfil.nombre.split(" ")[0]}`} subtitle="Tu avance en el Reto Primer Millón" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={estado?.desbloqueado ? "border-accent/40" : undefined}>
          <CardTitle>Tu cuota de invitados calificados</CardTitle>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-semibold tabular-nums tracking-tight">{calificados}</span>
            <span className="pb-2 text-muted">de {cuota}</span>
          </div>
          <Progress value={calificados} max={cuota} className="mt-3" />
          <p className="mt-3 text-sm text-muted">
            {estado?.desbloqueado ? (
              <>
                <span className="font-medium text-accent">¡Bolsa común desbloqueada!</span> Ya recibes leads de publicidad y
                colaboraciones por la ruleta, además de tus invitados.
              </>
            ) : (
              <>
                Te faltan <span className="font-medium text-fg">{faltan}</span> invitado{faltan === 1 ? "" : "s"} calificado
                {faltan === 1 ? "" : "s"} para desbloquear la bolsa común. Un invitado cuenta cuando tu gerente confirma la
                llamada de filtro.
              </>
            )}
          </p>
          {posicion > 0 && (
            <p className="mt-2 text-xs text-dim">
              Vas en el lugar {posicion} de {ranking.length}.{" "}
              <Link href="/app/ranking" className="underline-offset-2 hover:underline">
                Ver ranking
              </Link>
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>Tu enlace de invitación</CardTitle>
          {perfil.slug ? (
            <>
              <p className="break-all rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-sm text-accent">{url}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <BotonCopiar texto={url} etiqueta="Copiar enlace" />
                <BotonWhatsapp texto={mensajeInvitacion(url)} />
              </div>
              <p className="mt-3 text-xs text-dim">
                Todo el que se registre con este enlace queda en tu equipo. No compartas el formulario general de la landing: ahí
                tendrían que elegir tu nombre a mano.
              </p>
            </>
          ) : (
            <Alert tone="warn">Aún no tienes enlace. Pídele al administrador que lo genere.</Alert>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Registrados" value={estado?.registrados ?? 0} hint="invitados tuyos" />
        <Stat label="Pendientes de llamada" value={estado?.pendientes ?? 0} />
        <Stat label="Calificados" value={calificados} tone="accent" />
        <Stat label="No calificados" value={estado?.descartados ?? 0} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mis invitados</h2>
          <Link href="/app/leads" className="text-sm text-muted hover:text-fg">
            Ver todos →
          </Link>
        </div>
        <LeadsTabla leads={invitados.slice(0, 20)} mostrarResponsable={false} />
      </div>

      {deBolsa.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Leads que recibí de la bolsa común</h2>
          <LeadsTabla leads={deBolsa} mostrarResponsable={false} />
        </div>
      )}
    </>
  );
}
