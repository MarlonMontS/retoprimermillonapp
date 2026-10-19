"use client";

import { useActionState } from "react";
import { accionCrearCampana, type FuenteState } from "./actions";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

export function FormCampana({ appUrl }: { appUrl: string }) {
  const [state, action, pending] = useActionState<FuenteState, FormData>(accionCrearCampana, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_180px_180px_auto] sm:items-end">
      <Field label="Nombre" htmlFor="c_nombre">
        <Input id="c_nombre" name="nombre" required placeholder="Meta Ads noviembre, Colab Marca X…" />
      </Field>
      <Field label="Tipo" htmlFor="c_tipo">
        <Select id="c_tipo" name="tipo" defaultValue="publicidad">
          <option value="publicidad">Publicidad</option>
          <option value="colaboracion">Colaboración</option>
          <option value="contenido">Contenido</option>
          <option value="organico">Orgánico</option>
          <option value="otro">Otro</option>
        </Select>
      </Field>
      <Field label="Slug (opcional)" htmlFor="c_slug">
        <Input id="c_slug" name="slug" placeholder="meta-nov" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear enlace"}
      </Button>
      {state.error && (
        <div className="sm:col-span-4">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}
      {state.ok && state.slug && (
        <div className="sm:col-span-4">
          <Alert tone="ok">
            Enlace creado: <code className="text-accent">{appUrl}/r/{state.slug}</code>
          </Alert>
        </div>
      )}
    </form>
  );
}
