"use client";

import { useActionState } from "react";
import { accionImportarEquipo, type EquipoState } from "../actions";
import { Alert, Button, Field, Select, Textarea } from "@/components/ui";
import { Credenciales } from "@/components/equipo/credenciales";

export function FormImportarEquipo({ appUrl }: { appUrl: string }) {
  const [state, action, pending] = useActionState<EquipoState, FormData>(accionImportarEquipo, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Tipo de usuarios a crear" htmlFor="rol">
        <Select id="rol" name="rol" defaultValue="lider" className="max-w-xs">
          <option value="lider">Líderes de equipo</option>
          <option value="gerente">Gerentes</option>
        </Select>
      </Field>
      <Field
        label="Pega las filas desde tu hoja de cálculo"
        htmlFor="texto"
        hint="Columnas en este orden: nombre, correo, WhatsApp, ciudad, gerente (correo o nombre). Separadas por tabulador o coma, una persona por fila. Crea primero a los gerentes para poder asignarlos."
      >
        <Textarea
          id="texto"
          name="texto"
          required
          className="min-h-56 font-mono text-xs"
          placeholder={"María López\tmaria@correo.com\t6641234567\tTijuana\tgerente@correo.com\nJuan Pérez\tjuan@correo.com\t8111234567\tMonterrey\tgerente@correo.com"}
        />
      </Field>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.mensaje && state.ok && <Alert tone="ok">{state.mensaje}</Alert>}
      {state.errores && state.errores.length > 0 && (
        <Alert tone="warn">
          <p className="font-medium">Filas con problema</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {state.errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      {state.credenciales && <Credenciales credenciales={state.credenciales} appUrl={appUrl} />}
      <Button type="submit" disabled={pending}>
        {pending ? "Creando usuarios…" : "Crear usuarios"}
      </Button>
    </form>
  );
}
