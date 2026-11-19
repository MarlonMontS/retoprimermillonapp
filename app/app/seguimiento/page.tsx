import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { scopeDe } from "@/lib/data/scope";
import {
  aplicaA,
  asistenciasDe,
  fechaSesion,
  hoyIso,
  listarParticipantes,
  listarSesiones,
  pesos,
  ventasDe,
} from "@/lib/data/seguimiento";
import { PasarLista } from "./formularios";
import { Badge, ButtonLink, Card, CardTitle, Empty, PageHeader, Select, Stat, Table, Td, Th } from "@/components/ui";
import { CIUDAD_LABEL, ETAPA_LABEL, type Ciudad, type Etapa } from "@/lib/types";
import { nombreCompleto } from "@/lib/utils";

export const metadata: Metadata = { title: "Seguimiento" };
export const dynamic = "force-dynamic";

const SIN_COMENZAR: (Etapa | null)[] = [null, "inscrito"];
const TONO_ETAPA: Partial<Record<Etapa, "accent" | "danger" | "dim" | "info">> = {
  inscrito: "dim",
  baja: "danger",
  con_venta: "accent",
  meta_cumplida: "accent",
};

export default async function SeguimientoPage({ searchParams }: { searchParams: Promise<{ sesion?: string }> }) {
  const sp = await searchParams;
  const perfil = await requirePerfil();
  const scope = await scopeDe(perfil);
  const [participantes, sesiones] = await Promise.all([listarParticipantes(scope), listarSesiones()]);
  const ids = participantes.map((p) => p.id);
  const [asistencias, ventas] = await Promise.all([asistenciasDe(ids), ventasDe(ids)]);
  const hoy = hoyIso();
  const pasadas = sesiones.filter((s) => s.fecha <= hoy);

  // Métricas
  const comenzaron = participantes.filter((p) => !SIN_COMENZAR.includes(p.etapa) && p.etapa !== "baja").length;
  const bajas = participantes.filter((p) => p.etapa === "baja").length;
  let posibles = 0;
  let asistidas = 0;
  for (const p of participantes) {
    for (const s of pasadas) {
      if (!aplicaA(s, p.ciudad)) continue;
      const marca = asistencias.get(p.id)?.get(s.id);
      if (marca === undefined) continue;
      posibles++;
      if (marca) asistidas++;
    }
  }
  const cerradas = ventas.filter((v) => v.estatus === "cerrada");
  const apartadas = ventas.filter((v) => v.estatus === "apartado");
  const suma = (lista: typeof ventas) => lista.reduce((t, v) => t + v.monto, 0);

  // Pasar lista: la sesión elegida o la más reciente que ya ocurrió.
  const elegida = sesiones.find((s) => s.id === sp.sesion) ?? pasadas.at(-1) ?? sesiones[0];
  const enLista = elegida ? participantes.filter((p) => aplicaA(elegida, p.ciudad) && p.etapa !== "baja") : [];
  const muestraLider = perfil.rol !== "lider";

  return (
    <>
      <PageHeader
        title="Seguimiento del Reto"
        subtitle={
          perfil.rol === "lider"
            ? "Registra si tus participantes ya comenzaron, quién asiste a cada sesión y las ventas que van cerrando."
            : "Estatus, asistencia y ventas de los participantes calificados."
        }
        actions={
          perfil.rol === "admin" ? (
            <ButtonLink href="/app/sesiones" variant="secondary">
              Sesiones del programa
            </ButtonLink>
          ) : undefined
        }
      />

      {participantes.length === 0 ? (
        <Empty title="Todavía no hay participantes">
          Aquí aparecen {perfil.rol === "lider" ? "tus invitados" : "los invitados"} en cuanto quedan calificados.
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Participantes" value={participantes.length} hint={bajas ? `${bajas} de baja` : undefined} />
            <Stat label="Ya comenzaron" value={comenzaron} hint={`${participantes.length - comenzaron - bajas} sin comenzar`} tone="accent" />
            <Stat label="Asistencia" value={posibles ? `${Math.round((asistidas / posibles) * 100)}%` : "—"} hint={posibles ? `${asistidas} de ${posibles} marcadas` : "Sin listas todavía"} />
            <Stat label="Ventas cerradas" value={pesos(suma(cerradas))} hint={`${cerradas.length} cerrada${cerradas.length === 1 ? "" : "s"} · ${apartadas.length} apartada${apartadas.length === 1 ? "" : "s"} por ${pesos(suma(apartadas))}`} tone="accent" />
          </div>

          <Card className="mt-6">
            <CardTitle>Pasar lista</CardTitle>
            {!elegida ? (
              <p className="text-sm text-muted">
                Todavía no hay sesiones cargadas.
                {perfil.rol === "admin" ? (
                  <>
                    {" "}
                    <Link href="/app/sesiones" className="text-accent underline underline-offset-2">
                      Agrega las sesiones del programa
                    </Link>
                    .
                  </>
                ) : (
                  " El administrador las agregará pronto."
                )}
              </p>
            ) : (
              <>
                <form className="mb-4 flex flex-wrap items-end gap-2">
                  <label className="flex-1 text-sm">
                    <span className="mb-1.5 block font-medium text-muted">Sesión</span>
                    <Select name="sesion" defaultValue={elegida.id}>
                      {sesiones.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} · {fechaSesion(s)}
                          {s.fecha > hoy ? " (próxima)" : ""}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <button className="h-10 rounded-xl border border-line bg-surface-2 px-4 text-sm font-medium hover:bg-surface-3">Abrir</button>
                </form>
                {enLista.length === 0 ? (
                  <p className="text-sm text-muted">Ningún participante de tu alcance es de la sede de esta sesión.</p>
                ) : (
                  <PasarLista
                    key={elegida.id}
                    sesionId={elegida.id}
                    personas={enLista.map((p) => {
                      const marca = asistencias.get(p.id)?.get(elegida.id);
                      return {
                        id: p.id,
                        nombre: nombreCompleto(p),
                        detalle: [muestraLider ? p.lider?.nombre : null, p.ciudad ? CIUDAD_LABEL[p.ciudad] : null].filter(Boolean).join(" · ") || undefined,
                        valor: marca === undefined ? "" : marca ? "si" : "no",
                      };
                    })}
                  />
                )}
              </>
            )}
          </Card>

          <div className="mt-6">
            <h2 className="mb-1 text-lg font-semibold">Participantes</h2>
            <p className="mb-3 text-sm text-muted">Abre a cada persona para cambiar su estatus, su asistencia o registrar una venta.</p>
            <Table>
              <thead>
                <tr>
                  <Th>Participante</Th>
                  {muestraLider && <Th>Líder</Th>}
                  <Th>Sede</Th>
                  <Th>Estatus</Th>
                  <Th className="text-right">Asistencia</Th>
                  <Th className="text-right">Ventas</Th>
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => {
                  const suyas = pasadas.filter((s) => aplicaA(s, p.ciudad));
                  const marcas = asistencias.get(p.id);
                  const fue = suyas.filter((s) => marcas?.get(s.id) === true).length;
                  const susVentas = ventas.filter((v) => v.lead_id === p.id && v.estatus !== "cancelada");
                  return (
                    <tr key={p.id} className="hover:bg-surface-2/60">
                      <Td>
                        <Link href={`/app/leads/${p.id}`} className="font-medium hover:text-accent">
                          {nombreCompleto(p)}
                        </Link>
                      </Td>
                      {muestraLider && <Td className="text-muted">{p.lider?.nombre ?? "—"}</Td>}
                      <Td className="text-muted">{p.ciudad ? CIUDAD_LABEL[p.ciudad as Ciudad] : "—"}</Td>
                      <Td>
                        <Badge tone={TONO_ETAPA[p.etapa ?? "inscrito"] ?? "info"}>{ETAPA_LABEL[p.etapa ?? "inscrito"]}</Badge>
                      </Td>
                      <Td className="text-right tabular-nums text-muted">{suyas.length ? `${fue}/${suyas.length}` : "—"}</Td>
                      <Td className="text-right tabular-nums">{susVentas.length ? `${susVentas.length} · ${pesos(susVentas.reduce((t, v) => t + v.monto, 0))}` : <span className="text-dim">—</span>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}
