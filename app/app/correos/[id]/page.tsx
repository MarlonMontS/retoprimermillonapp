import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerfil } from "@/lib/auth";
import { obtenerCampana, tasa } from "@/lib/correos/datos";
import { LIMITE_DIARIO } from "@/lib/correos/motor";
import { Alert, Badge, Button, Card, CardTitle, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { fechaHora, nombreCompleto } from "@/lib/utils";
import { accionCambiarEstado } from "../actions";

export const metadata: Metadata = { title: "Campaña" };
export const dynamic = "force-dynamic";

const ETIQUETA: Record<string, [string, "dim" | "info" | "accent" | "danger" | "warn" | "neutral"]> = {
  pendiente: ["Programado", "dim"],
  enviando: ["Enviando", "info"],
  enviado: ["Enviado", "info"],
  entregado: ["Entregado", "accent"],
  rebotado: ["Rebotó", "danger"],
  queja: ["Marcó spam", "danger"],
  fallido: ["Falló", "danger"],
  omitido: ["Omitido", "neutral"],
};

export default async function CampanaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await requirePerfil();
  const d = await obtenerCampana(id, perfil);
  if (!d) notFound();
  const { campana: c, pasos, envios, metricas: m, bajas } = d;
  const ordenPaso = new Map(pasos.map((p) => [p.id, p.orden as number]));
  const activa = c.estado === "activa";
  const puedePausar = c.estado === "activa" || c.estado === "pausada";

  return (
    <>
      <div className="mb-4">
        <Link href="/app/correos" className="text-sm text-muted hover:text-fg">
          ← Volver a campañas
        </Link>
      </div>
      <PageHeader
        title={c.nombre}
        subtitle={`${c.mail_listas?.nombre ?? "Lista eliminada"} · ${pasos.length} correo${pasos.length === 1 ? "" : "s"}${pasos.length > 1 ? `, cada ${c.frecuencia_dias} día${c.frecuencia_dias === 1 ? "" : "s"}` : ""}${c.perfiles && c.perfil_id !== perfil.id ? ` · de ${c.perfiles.nombre}` : ""}`}
        actions={
          puedePausar ? (
            <form action={accionCambiarEstado}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="estado" value={activa ? "pausada" : "activa"} />
              <Button type="submit" variant="secondary">
                {activa ? "Pausar campaña" : "Reanudar campaña"}
              </Button>
            </form>
          ) : (
            <Badge tone="neutral">Terminada</Badge>
          )
        }
      />

      {m.programados > 0 && activa && (
        <Alert tone="info" className="mb-4">
          Hay {m.programados} correos programados. Salen conforme llega su fecha, con un tope de {LIMITE_DIARIO} correos al día para toda la app.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Enviados" value={m.enviados} hint={`${m.destinatarios} contactos`} />
        <Stat label="Tasa de entrega" value={tasa(m.entregados, m.enviados)} hint={`${m.entregados} entregados`} tone="accent" />
        <Stat label="Tasa de apertura" value={tasa(m.abiertos, m.entregados)} hint={`${m.abiertos} abiertos`} tone="accent" />
        <Stat label="Tasa de clics" value={tasa(m.clics, m.entregados)} hint={`${m.clics} con clic`} />
        <Stat label="Rebotes" value={m.rebotes} hint={tasa(m.rebotes, m.enviados)} />
        <Stat label="Marcados como spam" value={m.quejas} hint={tasa(m.quejas, m.enviados)} />
        <Stat label="Bajas" value={bajas} hint="pidieron no recibir más" />
        <Stat label="Omitidos" value={m.omitidos} hint="ya abrieron, se registraron o baja" />
      </div>
      <p className="mt-2 text-xs text-dim">
        Las aperturas son aproximadas: Apple Mail abre los correos automáticamente y algunos clientes bloquean las imágenes de seguimiento. Los clics son el dato más confiable.
      </p>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Por correo de la secuencia</h2>
        <Table>
          <thead>
            <tr>
              <Th>Correo</Th>
              <Th>Asunto</Th>
              <Th className="text-right">Enviados</Th>
              <Th className="text-right">Entregados</Th>
              <Th className="text-right">Abiertos</Th>
              <Th className="text-right">Clics</Th>
              <Th className="text-right">Programados</Th>
            </tr>
          </thead>
          <tbody>
            {pasos.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap font-medium">{p.orden === 1 ? "Inicial" : `Seguimiento ${p.orden - 1}`}</Td>
                <Td className="max-w-72 truncate text-muted">{p.asunto}</Td>
                <Td className="text-right tabular-nums">{p.metricas.enviados}</Td>
                <Td className="text-right tabular-nums text-muted">{p.metricas.entregados}</Td>
                <Td className="text-right tabular-nums text-muted">{p.metricas.abiertos}</Td>
                <Td className="text-right tabular-nums text-muted">{p.metricas.clics}</Td>
                <Td className="text-right tabular-nums text-muted">{p.metricas.programados}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-lg font-semibold">Contenido de los correos</summary>
        <div className="mt-3 space-y-3">
          {pasos.map((p) => (
            <Card key={p.id}>
              <CardTitle>{p.orden === 1 ? "Inicial" : `Seguimiento ${p.orden - 1}`}: {p.asunto}</CardTitle>
              <p className="whitespace-pre-wrap text-sm text-muted">{p.cuerpo}</p>
            </Card>
          ))}
        </div>
      </details>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Detalle por contacto</h2>
        <Table>
          <thead>
            <tr>
              <Th>Contacto</Th>
              <Th>Correo</Th>
              <Th>Estado</Th>
              <Th className="text-right">Aperturas</Th>
              <Th className="text-right">Clics</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {envios.slice(0, 500).map((e, i) => {
              const [label, tone] = ETIQUETA[e.estado] ?? [e.estado, "dim"];
              const orden = ordenPaso.get(e.paso_id) ?? 1;
              return (
                <tr key={i}>
                  <Td>
                    {nombreCompleto({ nombre: e.nombre ?? "", apellido: e.apellido }) || "—"}
                    <div className="text-xs text-dim">{e.email}</div>
                  </Td>
                  <Td className="text-muted">{orden === 1 ? "Inicial" : `Seguimiento ${orden - 1}`}</Td>
                  <Td>
                    <Badge tone={tone}>{label}</Badge>
                    {e.motivo && <div className="mt-0.5 text-xs text-dim">{e.motivo}</div>}
                  </Td>
                  <Td className="text-right tabular-nums text-muted">{e.aperturas}</Td>
                  <Td className="text-right tabular-nums text-muted">{e.clics}</Td>
                  <Td className="whitespace-nowrap text-muted">{fechaHora(e.enviado_at ?? e.programado_para)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </>
  );
}
