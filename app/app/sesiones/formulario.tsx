"use client";

import { useActionState, useEffect, useRef } from "react";
import { accionGuardarSesion, type SesionState } from "./actions";
import { DialogoAccion, enviarSinReiniciar } from "@/components/dialogo-accion";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { CIUDAD_LABEL, type Ciudad } from "@/lib/types";
import type { Sesion } from "@/lib/seguimiento";

export function FormSesion({ sesion }: { sesion?: Sesion }) {
  const [state, action, pending] = useActionState<SesionState, FormData>(accionGuardarSesion, {});
  const s = sesion?.id ?? "nueva";
  const ref = useRef<HTMLFormElement>(null);
  // Al agregar bien una sesión, deja el formulario limpio para la siguiente.
  useEffect(() => {
    if (state.ok && !sesion) ref.current?.reset();
  }, [state, sesion]);
  const formulario = (
    <form ref={ref} onSubmit={enviarSinReiniciar(action)} className="space-y-3">
      {sesion && <input type="hidden" name="id" value={sesion.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre de la sesión o módulo" htmlFor={`s_nombre_${s}`} className="sm:col-span-2">
          <Input id={`s_nombre_${s}`} name="nombre" required maxLength={120} defaultValue={sesion?.nombre ?? ""} placeholder="Módulo 1: Mentalidad de ventas" />
        </Field>
        <Field label="Fecha" htmlFor={`s_fecha_${s}`}>
          <Input id={`s_fecha_${s}`} name="fecha" type="date" required defaultValue={sesion?.fecha ?? ""} />
        </Field>
        <Field label="Hora (opcional)" htmlFor={`s_hora_${s}`}>
          <Input id={`s_hora_${s}`} name="hora" maxLength={40} defaultValue={sesion?.hora ?? ""} placeholder="7:00 p.m." />
        </Field>
        <Field label="Sede" htmlFor={`s_sede_${s}`} hint="Quién debe asistir.">
          <Select id={`s_sede_${s}`} name="sede" defaultValue={sesion?.sede ?? ""}>
            <option value="">Todas las sedes</option>
            {(Object.keys(CIUDAD_LABEL) as Ciudad[]).map((c) => (
              <option key={c} value={c}>
                {CIUDAD_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Orden (opcional)" htmlFor={`s_orden_${s}`} hint="Para sesiones del mismo día.">
          <Input id={`s_orden_${s}`} name="orden" type="number" min={0} max={99} defaultValue={sesion?.orden ?? 0} />
        </Field>
      </div>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.mensaje && <Alert tone="ok">{state.mensaje}</Alert>}
      <Button type="submit" disabled={pending} className={sesion ? "w-full" : undefined}>
        {pending ? "Guardando…" : sesion ? "Guardar cambios" : "Agregar sesión"}
      </Button>
    </form>
  );
  if (!sesion) return formulario;
  return (
    <DialogoAccion etiqueta="Editar" titulo="Editar sesión" cerrarSi={state.ok}>
      {formulario}
    </DialogoAccion>
  );
}
