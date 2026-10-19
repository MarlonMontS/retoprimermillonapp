"use client";

import { useActionState } from "react";
import { accionCambiarPassword, type CuentaState } from "./actions";
import { Alert, Button, Field, Input } from "@/components/ui";

export function FormPassword() {
  const [state, action, pending] = useActionState<CuentaState, FormData>(accionCambiarPassword, {});
  return (
    <form action={action} className="max-w-sm space-y-4">
      <Field label="Nueva contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Repite la contraseña" htmlFor="password2">
        <Input id="password2" name="password2" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && <Alert tone="ok">Contraseña actualizada.</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
