"use client";

import { useActionState, type ReactNode } from "react";
import {
  accionCambiarGerente,
  accionConvertirEnGerente,
  accionConvertirEnLead,
  accionConvertirEnLider,
  accionEliminarUsuario,
  accionMoverEquipo,
  accionMoverLeads,
  type EquipoState,
} from "../actions";
import { DialogoAccion, enviarSinReiniciar } from "@/components/dialogo-accion";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import type { ResumenPerfil } from "@/lib/data/movimientos";
import type { Perfil } from "@/lib/types";

export interface Opcion {
  id: string;
  nombre: string;
  detalle?: string;
}

type Accion = (prev: EquipoState, fd: FormData) => Promise<EquipoState>;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const sus = (n: number, uno: string, varios: string) => (n === 1 ? `su ${uno}` : `sus ${n} ${varios}`);

function Opciones({ lista }: { lista: Opcion[] }) {
  return lista.map((o) => (
    <option key={o.id} value={o.id}>
      {o.nombre}
      {o.detalle ? ` · ${o.detalle}` : ""}
    </option>
  ));
}

function Fila({ titulo, texto, accion }: { titulo: string; texto: string; accion: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-sm text-muted">{texto}</p>
      </div>
      <div className="shrink-0">{accion}</div>
    </div>
  );
}

function AccionMover({
  id,
  accion,
  etiqueta,
  titulo,
  aviso,
  confirmar,
  campo,
  nombreCampo,
  fila,
  defaultValue,
  oculto,
  children,
}: {
  id: string;
  accion: Accion;
  etiqueta: string;
  titulo: string;
  aviso: string;
  confirmar: string;
  campo?: string;
  nombreCampo?: string;
  fila: { titulo: string; texto: string };
  defaultValue?: string;
  /** Sin nada que mover ya no hay botón, pero el mensaje del resultado sigue visible. */
  oculto?: boolean;
  children?: ReactNode;
}) {
  const [state, action, pending] = useActionState<EquipoState, FormData>(accion, {});
  const campoId = `${nombreCampo}-${confirmar.replace(/\s/g, "-")}`;
  return (
    <>
      {!oculto && (
        <Fila
          {...fila}
          accion={
            <DialogoAccion etiqueta={etiqueta} titulo={titulo} cerrarSi={state}>
              <form action={action} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                <p className="text-sm text-muted">{aviso}</p>
                {campo && (
                  <Field label={campo} htmlFor={campoId}>
                    <Select id={campoId} name={nombreCampo} defaultValue={defaultValue ?? ""} required>
                      {children}
                    </Select>
                  </Field>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Guardando…" : confirmar}
                </Button>
              </form>
            </DialogoAccion>
          }
        />
      )}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.mensaje && <Alert tone="ok">{state.mensaje}</Alert>}
    </>
  );
}

function QuitarUsuario({
  modo,
  perfil,
  resumen,
  gerentes,
  responsables,
}: {
  modo: "eliminar" | "lead";
  perfil: Perfil;
  resumen: ResumenPerfil;
  gerentes: Opcion[];
  responsables: Opcion[];
}) {
  const esLead = modo === "lead";
  const palabra = esLead ? "CONVERTIR" : "ELIMINAR";
  const [state, action, pending] = useActionState<EquipoState, FormData>(esLead ? accionConvertirEnLead : accionEliminarUsuario, {});
  return (
    <Fila
      titulo={esLead ? "Convertir en lead" : "Eliminar usuario"}
      texto={esLead ? "Pierde su usuario y vuelve a la lista de leads." : "Definitivo. Sus leads y su equipo no se pierden: pasan a quien elijas."}
      accion={
        <DialogoAccion etiqueta={esLead ? "Convertir en lead" : "Eliminar"} titulo={`${esLead ? "Convertir en lead a" : "Eliminar a"} ${perfil.nombre}`} peligro>
          <form onSubmit={enviarSinReiniciar(action)} className="space-y-3">
            <input type="hidden" name="id" value={perfil.id} />
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Esto no se puede deshacer. Su acceso y su enlace de invitación dejan de funcionar.</li>
              {resumen.calificados > 0 && <li>{plural(resumen.calificados, "calificado pasa", "calificados pasan")} a contar para quien los reciba.</li>}
              {resumen.campanas + resumen.listas > 0 && (
                <li>
                  Se borran de sus correos: {plural(resumen.listas, "lista", "listas")} y {plural(resumen.campanas, "campaña", "campañas")}
                  {resumen.campanasActivas > 0 ? `, y ${resumen.campanasActivas === 1 ? "la activa deja" : `las ${resumen.campanasActivas} activas dejan`} de enviar` : ""}.
                </li>
              )}
              <li>Si solo quieres quitarle el acceso, mejor desactívalo en Datos.</li>
            </ul>
            {esLead && (
              <>
                <Field label="Su WhatsApp" htmlFor="q_whatsapp">
                  <Input id="q_whatsapp" name="whatsapp" defaultValue={perfil.telefono ?? ""} required />
                </Field>
                <Field label="¿Quién queda como su responsable?" htmlFor="q_responsable" hint="Si es de otra ciudad, queda en la bolsa común. Si ya existe como lead, se conserva ese registro.">
                  <Select id="q_responsable" name="responsable" defaultValue="" required>
                    <option value="" disabled>
                      Elige un responsable
                    </option>
                    <option value="bolsa">Bolsa común (sin responsable)</option>
                    <Opciones lista={responsables} />
                  </Select>
                </Field>
              </>
            )}
            {resumen.lideres > 0 && (
              <Field label={`¿A qué gerente ${resumen.lideres === 1 ? "pasa" : "pasan"} ${sus(resumen.lideres, "líder", "líderes")}?`} htmlFor={`destino_gerente-${modo}`}>
                <Select id={`destino_gerente-${modo}`} name="destino_gerente" defaultValue="" required>
                  <option value="" disabled>
                    Elige un gerente
                  </option>
                  <Opciones lista={gerentes} />
                </Select>
              </Field>
            )}
            {resumen.leads > 0 && (
              <Field label={`¿Quién recibe ${sus(resumen.leads, "lead", "leads")}?`} htmlFor={`destino_leads-${modo}`} hint="Los de otra ciudad se van a la bolsa común.">
                <Select id={`destino_leads-${modo}`} name="destino_leads" defaultValue="" required>
                  <option value="" disabled>
                    Elige un responsable
                  </option>
                  <option value="bolsa">Bolsa común (sin responsable)</option>
                  <Opciones lista={responsables} />
                </Select>
              </Field>
            )}
            <Field label={`Escribe ${palabra} para confirmar`} htmlFor={`confirmacion-${modo}`}>
              <Input id={`confirmacion-${modo}`} name="confirmacion" required autoComplete="off" pattern={palabra} title={`Escribe ${palabra}, en mayúsculas`} />
            </Field>
            {state.error && <Alert tone="danger">{state.error}</Alert>}
            <Button type="submit" variant="danger" className="w-full" disabled={pending}>
              {pending ? "Guardando…" : esLead ? "Convertir en lead" : "Eliminar definitivamente"}
            </Button>
          </form>
        </DialogoAccion>
      }
    />
  );
}

export function MoverEliminar({
  perfil,
  resumen,
  gerentes,
  responsables,
}: {
  perfil: Perfil;
  resumen: ResumenPerfil;
  gerentes: Opcion[];
  responsables: Opcion[];
}) {
  const nombre = perfil.nombre.split(" ")[0];
  const otrosGerentes = gerentes.filter((g) => g.id !== perfil.id);
  const otrosResponsables = responsables.filter((r) => r.id !== perfil.id);
  return (
    <div>
      {perfil.rol === "lider" && (
        <AccionMover
          id={perfil.id}
          accion={accionCambiarGerente}
          etiqueta="Mover de equipo"
          titulo={`Mover a ${nombre} de equipo`}
          aviso="Sus leads se van con esta persona y su nuevo gerente hará las llamadas de filtro."
          confirmar="Mover"
          campo="Nuevo gerente"
          nombreCampo="gerente_id"
          defaultValue={perfil.gerente_id ?? "sin"}
          fila={{ titulo: "Equipo", texto: "Cámbialo a otro gerente." }}
        >
          <option value="sin">Sin gerente</option>
          <Opciones lista={gerentes} />
        </AccionMover>
      )}
      {perfil.rol === "lider" && (
        <AccionMover
          id={perfil.id}
          accion={accionConvertirEnGerente}
          etiqueta="Convertir en gerente"
          titulo={`Convertir a ${nombre} en gerente`}
          aviso={`${nombre} conserva sus leads y su enlace, deja de competir por la cuota de líder y podrá tener su propio equipo.`}
          confirmar="Convertir en gerente"
          fila={{ titulo: "Rol", texto: "Pasa de líder a gerente." }}
        />
      )}
      {perfil.rol === "gerente" && (
        <AccionMover
          oculto={resumen.lideres === 0}
          id={perfil.id}
          accion={accionMoverEquipo}
          etiqueta="Mover equipo"
          titulo={`Mover el equipo de ${nombre}`}
          aviso={`${plural(resumen.lideres, "líder pasa", "líderes pasan")} al gerente que elijas, con sus leads. ${nombre} sigue como gerente.`}
          confirmar="Mover equipo"
          campo="Nuevo gerente"
          nombreCampo="destino"
          fila={{ titulo: "Su equipo", texto: `Pasa ${sus(resumen.lideres, "líder", "líderes")} a otro gerente.` }}
        >
          <option value="" disabled>
            Elige un gerente
          </option>
          <Opciones lista={otrosGerentes} />
        </AccionMover>
      )}
      {perfil.rol === "gerente" && (
        <AccionMover
          id={perfil.id}
          accion={accionConvertirEnLider}
          etiqueta="Convertir en líder"
          titulo={`Convertir a ${nombre} en líder`}
          aviso={`${nombre} queda como líder en el equipo que elijas, conserva sus leads y su enlace, y deja de ver a su equipo.${resumen.lideres > 0 ? ` ${resumen.lideres === 1 ? "Su líder se va" : `Sus ${resumen.lideres} líderes se van`} al mismo gerente.` : ""}`}
          confirmar="Convertir en líder"
          campo="Queda en el equipo de"
          nombreCampo="destino"
          fila={{ titulo: "Rol", texto: "Pasa de gerente a líder en el equipo de otro gerente." }}
        >
          <option value="" disabled>
            Elige un gerente
          </option>
          <Opciones lista={otrosGerentes} />
        </AccionMover>
      )}
      <AccionMover
        oculto={resumen.leads === 0}
        id={perfil.id}
        accion={accionMoverLeads}
        etiqueta="Mover leads"
        titulo={`Mover los leads de ${nombre}`}
        aviso={`${plural(resumen.leads, "lead pasa", "leads pasan")} al destino que elijas${resumen.calificados > 0 ? `, y ${plural(resumen.calificados, "calificado deja", "calificados dejan")} de contar para la cuota de ${nombre}` : ""}. Los de otra ciudad se van a la bolsa común.`}
        confirmar="Mover leads"
        campo="Nuevo responsable"
        nombreCampo="destino"
        fila={{ titulo: "Sus leads", texto: `Pasa ${sus(resumen.leads, "lead", "leads")} a otra persona. Para mover solo uno, ábrelo en Leads.` }}
        >
        <option value="" disabled>
          Elige un responsable
        </option>
        <option value="bolsa">Bolsa común (sin responsable)</option>
        <Opciones lista={otrosResponsables} />
      </AccionMover>
      <QuitarUsuario modo="lead" perfil={perfil} resumen={resumen} gerentes={otrosGerentes} responsables={otrosResponsables} />
      <QuitarUsuario modo="eliminar" perfil={perfil} resumen={resumen} gerentes={otrosGerentes} responsables={otrosResponsables} />
    </div>
  );
}
