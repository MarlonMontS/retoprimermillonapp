import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { listarCampanas, tasa } from "@/lib/correos/datos";
import { correoConfigurado } from "@/lib/correos/motor";
import { INTENCIONES, type Intencion } from "@/lib/correos/render";
import { Alert, Badge, ButtonLink, Empty, PageHeader, Table, Td, Th } from "@/components/ui";
import { fecha } from "@/lib/utils";

export const metadata: Metadata = { title: "Correos" };
export const dynamic = "force-dynamic";

const ESTADO = { borrador: ["Borrador", "dim"], activa: ["Activa", "accent"], pausada: ["Pausada", "warn"], terminada: ["Terminada", "neutral"] } as const;

export default async function CorreosPage() {
  const perfil = await requirePerfil();
  const campanas = await listarCampanas(perfil);
  const admin = perfil.rol === "admin";
  return (
    <>
      <PageHeader
        title="Campañas de correo"
        subtitle={admin ? "Campañas de todo el equipo." : "Escríbele a tus propios contactos con seguimiento automático."}
        actions={
          <>
            <ButtonLink href="/app/correos/nueva">Nueva campaña</ButtonLink>
            <ButtonLink href="/app/correos/listas" variant="secondary">
              Mis listas
            </ButtonLink>
          </>
        }
      />
      {!correoConfigurado() && (
        <Alert tone="warn" className="mb-4">
          El envío todavía no está activado. Ya puedes subir listas y preparar correos, pero no lanzar campañas.
        </Alert>
      )}
      {campanas.length === 0 ? (
        <Empty title="Todavía no hay campañas">Crea la primera y te propongo los correos según tu objetivo.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Campaña</Th>
              {admin && <Th>De</Th>}
              <Th>Estado</Th>
              <Th className="text-right">Enviados</Th>
              <Th className="text-right">Entrega</Th>
              <Th className="text-right">Apertura</Th>
              <Th className="text-right">Clics</Th>
              <Th>Lanzada</Th>
            </tr>
          </thead>
          <tbody>
            {campanas.map((c) => {
              const [label, tone] = ESTADO[c.estado as keyof typeof ESTADO];
              const m = c.metricas;
              return (
                <tr key={c.id} className="hover:bg-surface-2/60">
                  <Td>
                    <Link href={`/app/correos/${c.id}`} className="font-medium hover:text-accent">
                      {c.nombre}
                    </Link>
                    <div className="text-xs text-dim">
                      {INTENCIONES[c.intencion as Intencion]?.label ?? c.intencion} · {c.mail_listas?.nombre ?? "Lista eliminada"}
                    </div>
                  </Td>
                  {admin && <Td className="text-muted">{c.perfiles?.nombre}</Td>}
                  <Td>
                    <Badge tone={tone}>{label}</Badge>
                  </Td>
                  <Td className="text-right tabular-nums">{m.enviados}</Td>
                  <Td className="text-right tabular-nums text-muted">{tasa(m.entregados, m.enviados)}</Td>
                  <Td className="text-right tabular-nums text-muted">{tasa(m.abiertos, m.entregados)}</Td>
                  <Td className="text-right tabular-nums text-muted">{tasa(m.clics, m.entregados)}</Td>
                  <Td className="whitespace-nowrap text-muted">{fecha(c.lanzada_at)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
