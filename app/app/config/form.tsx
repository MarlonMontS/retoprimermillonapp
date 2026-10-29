"use client";

import { useActionState } from "react";
import { accionGuardarConfig, type ConfigState } from "./actions";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import type { Config } from "@/lib/data/config";

export function FormConfig({ config }: { config: Config }) {
  const [state, action, pending] = useActionState<ConfigState, FormData>(accionGuardarConfig, {});
  return (
    <form action={action} className="max-w-2xl space-y-5">
      <Field label="Cuota mínima de invitados calificados" htmlFor="cuota_minima" hint="Cuántos invitados calificados necesita un líder para desbloquear la bolsa común.">
        <Input id="cuota_minima" name="cuota_minima" type="number" min={0} max={100} defaultValue={config.cuota_minima} className="max-w-32" />
      </Field>

      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <input type="checkbox" name="ruleta_activa" defaultChecked={config.ruleta_activa} className="mt-1 accent-[var(--color-accent)]" />
        <span>
          <span className="block text-sm font-medium">Ruleta de la bolsa común activa</span>
          <span className="block text-xs text-dim">
            Si la apagas, los leads de publicidad y colaboraciones se quedan sin asignar hasta que la vuelvas a prender o los repartas a mano desde Bolsa común.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
        <input type="checkbox" name="ciudad_estricta" defaultChecked={config.ciudad_estricta} className="mt-1 accent-[var(--color-accent)]" />
        <span>
          <span className="block text-sm font-medium">Regla por ciudad</span>
          <span className="block text-xs text-dim">
            Un líder o gerente solo puede tener leads de su misma ciudad, también los de la bolsa. «En línea» es compatible con cualquier ciudad. Si alguien se registra con el enlace de un líder de otra ciudad, cae en la bolsa de su propia ciudad.
          </span>
        </span>
      </label>

      <Field label="Preguntas de la llamada de filtro" htmlFor="preguntas_filtro" hint="Una por línea. Los gerentes las ven al registrar la llamada; contestarlas es opcional.">
        <Textarea id="preguntas_filtro" name="preguntas_filtro" defaultValue={config.preguntas_filtro.join("\n")} className="min-h-40" />
      </Field>

      <Field label="URL del aviso de privacidad" htmlFor="aviso_privacidad_url" hint="Si lo dejas vacío, el formulario enlaza al borrador en /privacidad.">
        <Input id="aviso_privacidad_url" name="aviso_privacidad_url" type="url" defaultValue={config.aviso_privacidad_url} placeholder="https://retoprimermillon.com/privacidad" />
      </Field>

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && <Alert tone="ok">Configuración guardada.</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
