"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  accionAsistenciaPersona,
  accionEtapa,
  accionGuardarVenta,
  accionPasarLista,
  type SeguimientoState,
} from "./actions";
import { DialogoAccion, enviarSinReiniciar } from "@/components/dialogo-accion";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ETAPA_LABEL, type Etapa } from "@/lib/types";
import { VENTA_ESTATUS_LABEL, VENTA_TIPO_LABEL, type Venta } from "@/lib/seguimiento";

function Mensaje({ state }: { state: SeguimientoState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.mensaje) return <Alert tone="ok">{state.mensaje}</Alert>;
  return null;
}

/** Tres botones Sí / No / Sin registrar para una marca de asistencia. */
function Marca({ name, valor, onChange }: { name: string; valor: string; onChange: (v: string) => void }) {
  const opciones = [
    { v: "si", label: "Asistió", activo: "border-accent bg-accent/15 text-accent" },
    { v: "no", label: "Faltó", activo: "border-danger/50 bg-danger/10 text-danger" },
    { v: "", label: "—", activo: "border-line-2 bg-surface-3 text-fg" },
  ];
  return (
    <div role="radiogroup" className="inline-flex gap-1">
      <input type="hidden" name={name} value={valor} />
      {opciones.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={valor === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "h-8 min-w-11 rounded-lg border px-2.5 text-xs font-medium",
            valor === o.v ? o.activo : "border-line bg-surface-2 text-muted hover:border-line-2"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PasarLista({
  sesionId,
  personas,
}: {
  sesionId: string;
  personas: { id: string; nombre: string; detalle?: string; valor: "si" | "no" | "" }[];
}) {
  const [state, action, pending] = useActionState<SeguimientoState, FormData>(accionPasarLista, {});
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(personas.map((p) => [p.id, p.valor])));
  const asistieron = Object.values(valores).filter((v) => v === "si").length;
  return (
    <form onSubmit={enviarSinReiniciar(action)} className="space-y-3">
      <input type="hidden" name="sesion_id" value={sesionId} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {asistieron} de {personas.length} marcados como asistentes
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setValores(Object.fromEntries(personas.map((p) => [p.id, "si"])))}>
          Marcar a todos como asistentes
        </Button>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {personas.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              {p.nombre}
              {p.detalle && <span className="block text-xs text-dim">{p.detalle}</span>}
            </span>
            <Marca name={`m:${p.id}`} valor={valores[p.id] ?? ""} onChange={(v) => setValores((x) => ({ ...x, [p.id]: v }))} />
          </li>
        ))}
      </ul>
      <Mensaje state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar lista"}
      </Button>
    </form>
  );
}

export function FormEtapa({ leadId, etapa }: { leadId: string; etapa: Etapa | null }) {
  const [state, action, pending] = useActionState<SeguimientoState, FormData>(accionEtapa, {});
  return (
    <form onSubmit={enviarSinReiniciar(action)} className="space-y-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <Field label="Estatus en el Reto" htmlFor="s_etapa">
        <div className="flex gap-2">
          <Select id="s_etapa" name="etapa" defaultValue={etapa ?? "inscrito"} className="flex-1">
            {(Object.keys(ETAPA_LABEL) as Etapa[]).map((e) => (
              <option key={e} value={e}>
                {ETAPA_LABEL[e]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "…" : "Guardar"}
          </Button>
        </div>
      </Field>
      <Mensaje state={state} />
    </form>
  );
}

export function AsistenciaPersona({
  leadId,
  sesiones,
}: {
  leadId: string;
  sesiones: { id: string; nombre: string; detalle: string; valor: "si" | "no" | "" }[];
}) {
  const [state, action, pending] = useActionState<SeguimientoState, FormData>(accionAsistenciaPersona, {});
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(sesiones.map((s) => [s.id, s.valor])));
  return (
    <form onSubmit={enviarSinReiniciar(action)} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <ul className="divide-y divide-line">
        {sesiones.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              {s.nombre}
              <span className="block text-xs text-dim">{s.detalle}</span>
            </span>
            <Marca name={`s:${s.id}`} valor={valores[s.id] ?? ""} onChange={(v) => setValores((x) => ({ ...x, [s.id]: v }))} />
          </li>
        ))}
      </ul>
      <Mensaje state={state} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar asistencia"}
      </Button>
    </form>
  );
}

export function FormVenta({ leadId, venta, hoy }: { leadId: string; venta?: Venta; hoy: string }) {
  const [state, action, pending] = useActionState<SeguimientoState, FormData>(accionGuardarVenta, {});
  const sufijo = venta?.id ?? "nueva";
  const ref = useRef<HTMLFormElement>(null);
  // Una venta nueva guardada deja el formulario limpio, para no registrarla dos veces.
  useEffect(() => {
    if (state.ok && !venta) ref.current?.reset();
  }, [state, venta]);
  const formulario = (
    <form ref={ref} onSubmit={enviarSinReiniciar(action)} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      {venta && <input type="hidden" name="id" value={venta.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fecha" htmlFor={`v_fecha_${sufijo}`}>
          <Input id={`v_fecha_${sufijo}`} name="fecha" type="date" required max={hoy} defaultValue={venta?.fecha ?? hoy} />
        </Field>
        <Field label="¿Terreno o casa?" htmlFor={`v_tipo_${sufijo}`}>
          <Select id={`v_tipo_${sufijo}`} name="tipo" required defaultValue={venta?.tipo ?? ""}>
            <option value="" disabled>
              Elige una opción
            </option>
            {Object.entries(VENTA_TIPO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Desarrollo" htmlFor={`v_desarrollo_${sufijo}`}>
          <Input id={`v_desarrollo_${sufijo}`} name="desarrollo" maxLength={120} defaultValue={venta?.desarrollo ?? ""} placeholder="Nombre del desarrollo" />
        </Field>
        <Field label="Monto en pesos" htmlFor={`v_monto_${sufijo}`}>
          <Input id={`v_monto_${sufijo}`} name="monto" inputMode="decimal" required defaultValue={venta ? String(venta.monto) : ""} placeholder="850000" />
        </Field>
        <Field label="Estatus" htmlFor={`v_estatus_${sufijo}`} className="sm:col-span-2">
          <Select id={`v_estatus_${sufijo}`} name="estatus" defaultValue={venta?.estatus ?? "apartado"}>
            {Object.entries(VENTA_ESTATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notas" htmlFor={`v_notas_${sufijo}`}>
        <Textarea id={`v_notas_${sufijo}`} name="notas" maxLength={1000} defaultValue={venta?.notas ?? ""} className="min-h-16" />
      </Field>
      <Mensaje state={state} />
      <Button type="submit" disabled={pending} className={venta ? "w-full" : undefined}>
        {pending ? "Guardando…" : venta ? "Guardar cambios" : "Registrar venta"}
      </Button>
    </form>
  );
  if (!venta) return formulario;
  return (
    <DialogoAccion etiqueta="Editar" titulo="Editar venta" cerrarSi={state.ok}>
      {formulario}
    </DialogoAccion>
  );
}
