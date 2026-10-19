import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerfil } from "@/lib/auth";
import { scopeDe } from "@/lib/data/scope";
import { obtenerLead } from "@/lib/data/leads";
import { listarLideresEstado } from "@/lib/data/equipo";
import { getConfig } from "@/lib/data/config";
import { Alert, Badge, Card, CardTitle, EstatusBadge, PageHeader } from "@/components/ui";
import { FormEditar, FormLlamada, FormNota, FormReasignar } from "./acciones";
import { CIUDAD_LABEL, ETAPA_LABEL, EXPERIENCIA_OPCIONES, FUENTE_TIPO_LABEL } from "@/lib/types";
import { fechaHora, nombreCompleto } from "@/lib/utils";
import { formatearWhatsapp, linkWhatsapp } from "@/lib/phone";
import { accionEliminar } from "../actions";

export const metadata: Metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

const TIPO_EVENTO: Record<string, string> = {
  registro: "Se registró",
  llamada: "Llamada",
  calificado: "Calificado",
  duplicado: "Marcado como duplicado",
  asignacion_ruleta: "Asignado por la ruleta de la bolsa",
  reasignacion: "Reasignado",
  nota: "Nota",
  edicion: "Datos editados",
  import: "Importado desde GoHighLevel",
};

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await requirePerfil();
  const scope = await scopeDe(perfil);
  const [lead, config] = await Promise.all([obtenerLead(id, scope), getConfig()]);
  if (!lead) notFound();

  const puedeActuar = perfil.rol === "admin" || perfil.rol === "gerente";
  const opcionesReasignar = puedeActuar
    ? (await listarLideresEstado({ gerenteId: perfil.rol === "gerente" ? perfil.id : undefined, incluirGerentes: true, soloActivos: true })).map((l) => ({
        id: l.id,
        nombre: l.nombre,
        detalle: l.rol === "gerente" ? "Gerente" : l.gerente_nombre ?? undefined,
      }))
    : [];

  const experiencia = EXPERIENCIA_OPCIONES.find((o) => o.value === lead.experiencia)?.label ?? lead.experiencia;
  const utms = [lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content].filter(Boolean).join(" · ");

  return (
    <>
      <div className="mb-4">
        <Link href="/app/leads" className="text-sm text-muted hover:text-fg">
          ← Volver a leads
        </Link>
      </div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {nombreCompleto(lead)} <EstatusBadge estatus={lead.estatus} />
            {lead.desde_bolsa && <Badge tone="dim">Bolsa común</Badge>}
          </span>
        }
        subtitle={`Registrado ${fechaHora(lead.created_at)} · ${lead.intentos} llamada${lead.intentos === 1 ? "" : "s"}`}
        actions={
          <>
            <a href={linkWhatsapp(lead.whatsapp, `Hola ${lead.nombre}, te escribo del equipo del Reto Primer Millón.`)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-2">
              WhatsApp
            </a>
            <a href={`tel:${lead.whatsapp}`} className="inline-flex h-10 items-center rounded-xl border border-line bg-surface-2 px-4 text-sm font-medium hover:bg-surface-3">
              Llamar {formatearWhatsapp(lead.whatsapp)}
            </a>
          </>
        }
      />

      {lead.posible_duplicado && (
        <Alert tone="warn" className="mb-4">
          Este WhatsApp también está registrado con otro responsable. Gana quien lo califique primero; la otra copia quedará como duplicado.
        </Alert>
      )}
      {lead.estatus === "duplicado" && lead.duplicado_de && (
        <Alert tone="info" className="mb-4">
          Este registro es duplicado de{" "}
          <Link href={`/app/leads/${lead.duplicado_de}`} className="underline">
            otro lead
          </Link>
          . No cuenta para ninguna cuota.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardTitle>Datos del prospecto</CardTitle>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Dato k="WhatsApp" v={formatearWhatsapp(lead.whatsapp)} />
              <Dato k="Correo" v={lead.email} />
              <Dato k="Ciudad" v={lead.ciudad ? CIUDAD_LABEL[lead.ciudad] : null} />
              <Dato k="Experiencia" v={experiencia} />
              <Dato k="¿Cómo se enteró?" v={lead.como_se_entero} />
              <Dato k="Etapa en el Reto" v={lead.etapa ? ETAPA_LABEL[lead.etapa] : null} />
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-dim">Por qué quiere participar</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-muted">{lead.motivo || "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardTitle>Atribución</CardTitle>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Dato k="Responsable" v={lead.lider ? lead.lider.nombre : "Bolsa común, sin asignar"} />
              <Dato k="Fuente" v={lead.fuente ? `${lead.fuente.nombre} (${FUENTE_TIPO_LABEL[lead.fuente.tipo]})` : "Sin fuente"} />
              <Dato k="Origen del registro" v={{ link: "Enlace de invitación", selector: "Formulario general", import: "Importado", manual: "Captura manual", form: "Formulario" }[lead.origen_registro] ?? lead.origen_registro} />
              <Dato k="Campaña (UTM)" v={utms || null} />
              {lead.desde_bolsa && <Dato k="Asignado por ruleta" v={fechaHora(lead.asignado_at)} />}
              {lead.calificado_at && <Dato k="Calificado" v={`${fechaHora(lead.calificado_at)}${lead.calificador ? ` por ${lead.calificador.nombre}` : ""}`} />}
            </dl>
            {lead.copias.length > 0 && (
              <div className="mt-4 border-t border-line pt-3 text-sm">
                <p className="mb-1 text-xs uppercase tracking-wide text-dim">Otros registros con este WhatsApp</p>
                <ul className="space-y-1">
                  {lead.copias.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-2">
                      <Link href={`/app/leads/${c.id}`} className="underline-offset-2 hover:underline">
                        {nombreCompleto(c)}
                      </Link>
                      <span className="text-muted">· {c.lider?.nombre ?? "Bolsa"}</span>
                      <EstatusBadge estatus={c.estatus} />
                      <span className="text-xs text-dim">{fechaHora(c.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {lead.respuestas_filtro && Object.keys(lead.respuestas_filtro).length > 0 && (
            <Card>
              <CardTitle>Respuestas del filtro</CardTitle>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(lead.respuestas_filtro).map(([p, r]) => (
                  <li key={p} className="flex items-start justify-between gap-4">
                    <span className="text-muted">{p}</span>
                    <span className="font-medium">{{ si: "Sí", no: "No", na: "No aplica" }[r] ?? r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardTitle>Bitácora</CardTitle>
            {puedeActuar && (
              <div className="mb-4">
                <FormNota leadId={lead.id} />
              </div>
            )}
            <ol className="space-y-3 text-sm">
              {lead.eventos.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-line-2" />
                  <div>
                    <p>
                      <span className="font-medium">{TIPO_EVENTO[ev.tipo] ?? ev.tipo}</span>
                      {ev.tipo === "llamada" && ev.detalle?.resultado ? <span className="text-muted"> · {String(ev.detalle.resultado).replace("_", " ")}</span> : null}
                      {ev.actor?.nombre && <span className="text-muted"> · {ev.actor.nombre}</span>}
                    </p>
                    {ev.tipo === "nota" && ev.detalle?.texto ? <p className="whitespace-pre-wrap text-muted">{String(ev.detalle.texto)}</p> : null}
                    {ev.tipo === "llamada" && ev.detalle?.notas ? <p className="whitespace-pre-wrap text-muted">{String(ev.detalle.notas)}</p> : null}
                    {ev.tipo === "calificado" && ev.detalle?.notas ? <p className="whitespace-pre-wrap text-muted">{String(ev.detalle.notas)}</p> : null}
                    <p className="text-xs text-dim">{fechaHora(ev.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          {puedeActuar ? (
            <>
              <Card>
                <CardTitle>Registrar llamada de filtro</CardTitle>
                <FormLlamada leadId={lead.id} preguntas={config.preguntas_filtro} respuestasPrevias={lead.respuestas_filtro} notasPrevias={lead.notas} />
              </Card>
              <Card>
                <CardTitle>Responsable</CardTitle>
                <FormReasignar leadId={lead.id} liderActual={lead.lider_id} desdeBolsa={lead.desde_bolsa} opciones={opcionesReasignar} puedeBolsa={perfil.rol === "admin"} />
              </Card>
              <Card>
                <CardTitle>Editar datos</CardTitle>
                <FormEditar lead={lead} />
              </Card>
              {perfil.rol === "admin" && (
                <form action={accionEliminar} className="text-right">
                  <input type="hidden" name="lead_id" value={lead.id} />
                  <button className="text-xs text-dim underline-offset-2 hover:text-danger hover:underline">Eliminar este lead definitivamente</button>
                </form>
              )}
            </>
          ) : (
            <Card>
              <CardTitle>Seguimiento</CardTitle>
              <p className="text-sm text-muted">
                Tu gerente se encarga de la llamada de filtro. Aquí verás el resultado en cuanto la registre.
              </p>
              {lead.notas && <p className="mt-3 whitespace-pre-wrap text-sm">{lead.notas}</p>}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Dato({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-dim">{k}</dt>
      <dd className="mt-0.5 text-muted">{v || "—"}</dd>
    </div>
  );
}
