"use client";

import { useActionState } from "react";
import { accionCrearUsuario, type EquipoState } from "@/app/app/lideres/actions";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { Credenciales } from "@/components/equipo/credenciales";
import { CIUDAD_LABEL, type Ciudad, type Rol } from "@/lib/types";

export function FormNuevoUsuario({
  rolFijo,
  gerentes,
  gerenteFijo,
  appUrl,
}: {
  rolFijo?: Rol;
  gerentes: { id: string; nombre: string }[];
  gerenteFijo?: string;
  appUrl: string;
}) {
  const [state, action, pending] = useActionState<EquipoState, FormData>(accionCrearUsuario, {});
  const rol = rolFijo ?? "lider";

  return (
    <form action={action} className="space-y-4">
      {rolFijo && <input type="hidden" name="rol" value={rolFijo} />}
      {gerenteFijo && <input type="hidden" name="gerente_id" value={gerenteFijo} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" htmlFor="u_nombre">
          <Input id="u_nombre" name="nombre" required placeholder="María López" />
        </Field>
        <Field label="Correo (será su usuario)" htmlFor="u_email">
          <Input id="u_email" name="email" type="email" required placeholder="maria@correo.com" />
        </Field>
        <Field label="WhatsApp" htmlFor="u_tel">
          <Input id="u_tel" name="telefono" type="tel" placeholder="664 123 4567" />
        </Field>
        <Field label="Ciudad" htmlFor="u_ciudad">
          <Select id="u_ciudad" name="ciudad" defaultValue="">
            <option value="">Sin ciudad</option>
            {(Object.keys(CIUDAD_LABEL) as Ciudad[]).map((c) => (
              <option key={c} value={c}>
                {CIUDAD_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        {!rolFijo && (
          <Field label="Rol" htmlFor="u_rol">
            <Select id="u_rol" name="rol" defaultValue="lider">
              <option value="lider">Líder de equipo</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Administrador</option>
            </Select>
          </Field>
        )}
        {rol === "lider" && !gerenteFijo && (
          <Field label="Gerente responsable" htmlFor="u_gerente">
            <Select id="u_gerente" name="gerente_id" defaultValue="">
              <option value="">Sin gerente</option>
              {gerentes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Contraseña (opcional)" htmlFor="u_pass" hint="Si la dejas vacía se genera una.">
          <Input id="u_pass" name="password" type="text" autoComplete="off" minLength={8} placeholder="Se genera automáticamente" />
        </Field>
      </div>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.credenciales && <Credenciales credenciales={state.credenciales} appUrl={appUrl} />}
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}
