"use client";

import { useActionState } from "react";
import { accionActualizarPerfil, accionResetPassword, type EquipoState } from "../actions";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { Credenciales } from "@/components/equipo/credenciales";
import { CIUDAD_LABEL, type Ciudad, type Perfil } from "@/lib/types";

export function FormEditarPerfil({
  perfil,
  gerentes,
  esAdmin,
}: {
  perfil: Perfil;
  gerentes: { id: string; nombre: string }[];
  esAdmin: boolean;
}) {
  const [state, action, pending] = useActionState<EquipoState, FormData>(accionActualizarPerfil, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={perfil.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="p_nombre">
          <Input id="p_nombre" name="nombre" defaultValue={perfil.nombre} required />
        </Field>
        <Field label="WhatsApp" htmlFor="p_tel">
          <Input id="p_tel" name="telefono" defaultValue={perfil.telefono ?? ""} />
        </Field>
        <Field label="Ciudad" htmlFor="p_ciudad">
          <Select id="p_ciudad" name="ciudad" defaultValue={perfil.ciudad ?? ""}>
            <option value="">Sin ciudad</option>
            {(Object.keys(CIUDAD_LABEL) as Ciudad[]).map((c) => (
              <option key={c} value={c}>
                {CIUDAD_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        {esAdmin && perfil.rol === "lider" && (
          <Field label="Gerente responsable" htmlFor="p_gerente">
            <Select id="p_gerente" name="gerente_id" defaultValue={perfil.gerente_id ?? ""}>
              <option value="">Sin gerente</option>
              {gerentes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {esAdmin && perfil.rol === "lider" && (
          <Field label="Bolsa común" htmlFor="p_bolsa" hint="Normalmente se desbloquea sola al cumplir la cuota.">
            <Select id="p_bolsa" name="bolsa_manual" defaultValue={perfil.bolsa_manual === null ? "auto" : perfil.bolsa_manual ? "abierta" : "cerrada"}>
              <option value="auto">Automática según cuota</option>
              <option value="abierta">Forzar abierta</option>
              <option value="cerrada">Forzar cerrada</option>
            </Select>
          </Field>
        )}
      </div>
      {esAdmin && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={perfil.activo} className="accent-[var(--color-accent)]" />
          Usuario activo (si lo desactivas no podrá entrar y su enlace deja de funcionar)
        </label>
      )}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.mensaje && <Alert tone="ok">{state.mensaje}</Alert>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

export function FormResetPassword({ id, appUrl }: { id: string; appUrl: string }) {
  const [state, action, pending] = useActionState<EquipoState, FormData>(accionResetPassword, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-muted">Genera una contraseña nueva si la persona la olvidó. La anterior deja de funcionar.</p>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.credenciales && <Credenciales credenciales={state.credenciales} appUrl={appUrl} />}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Generando…" : "Generar nueva contraseña"}
      </Button>
    </form>
  );
}
