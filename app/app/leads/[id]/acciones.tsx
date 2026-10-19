"use client";

import { useActionState } from "react";
import { accionEditar, accionLlamada, accionNota, accionReasignar, type AccionState } from "../actions";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { CIUDAD_LABEL, ETAPA_LABEL, type Ciudad, type Etapa, type LeadEstatus } from "@/lib/types";

const RESULTADOS: { value: LeadEstatus; label: string; desc: string }[] = [
  { value: "calificado", label: "Calificado", desc: "Pasó el filtro. Suma a la cuota del responsable." },
  { value: "en_contacto", label: "En contacto", desc: "Ya hablaron, falta definir." },
  { value: "no_contesta", label: "No contesta", desc: "Se intentó llamar sin éxito." },
  { value: "no_calificado", label: "No calificado", desc: "No cumple el perfil o no le interesa." },
  { value: "descartado", label: "Descartado", desc: "Número inválido, broma o prueba." },
];

function Mensaje({ state }: { state: AccionState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.mensaje) return <Alert tone="ok">{state.mensaje}</Alert>;
  return null;
}

export function FormLlamada({
  leadId,
  preguntas,
  respuestasPrevias,
  notasPrevias,
}: {
  leadId: string;
  preguntas: string[];
  respuestasPrevias: Record<string, string> | null;
  notasPrevias: string | null;
}) {
  const [state, action, pending] = useActionState<AccionState, FormData>(accionLlamada, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-muted">Resultado de la llamada</legend>
        {RESULTADOS.map((r) => (
          <label key={r.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input type="radio" name="resultado" value={r.value} required className="mt-1 accent-[var(--color-accent)]" />
            <span>
              <span className="block text-sm font-medium">{r.label}</span>
              <span className="block text-xs text-dim">{r.desc}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {preguntas.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-muted">Preguntas del filtro (opcional)</legend>
          {preguntas.map((p, i) => (
            <div key={i} className="grid gap-1 sm:grid-cols-[1fr_140px] sm:items-center">
              <span className="text-sm">{p}</span>
              <Select name={`pregunta:${p}`} defaultValue={respuestasPrevias?.[p] ?? ""} className="py-1.5 text-sm">
                <option value="">—</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
                <option value="na">No aplica</option>
              </Select>
            </div>
          ))}
        </fieldset>
      )}

      <Field label="Notas" htmlFor="notas">
        <Textarea id="notas" name="notas" defaultValue={notasPrevias ?? ""} placeholder="Qué dijo, cuándo volver a llamar, dudas…" />
      </Field>

      <Mensaje state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar resultado"}
      </Button>
    </form>
  );
}

export function FormNota({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<AccionState, FormData>(accionNota, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <Textarea name="texto" required placeholder="Agregar una nota a la bitácora" className="min-h-20" />
      <Mensaje state={state} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Agregar nota"}
      </Button>
    </form>
  );
}

export function FormReasignar({
  leadId,
  liderActual,
  desdeBolsa,
  opciones,
  puedeBolsa,
}: {
  leadId: string;
  liderActual: string | null;
  desdeBolsa: boolean;
  opciones: { id: string; nombre: string; detalle?: string }[];
  puedeBolsa: boolean;
}) {
  const [state, action, pending] = useActionState<AccionState, FormData>(accionReasignar, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <Field label="Responsable" htmlFor="lider_id" hint="Úsalo para corregir la atribución de un lead.">
        <Select id="lider_id" name="lider_id" defaultValue={liderActual ?? ""}>
          {puedeBolsa && <option value="">Bolsa común (sin responsable)</option>}
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
              {o.detalle ? ` · ${o.detalle}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="desde_bolsa" defaultChecked={desdeBolsa} className="accent-[var(--color-accent)]" />
        Contarlo como lead de bolsa (no suma a la cuota de invitados)
      </label>
      <Mensaje state={state} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Reasignar"}
      </Button>
    </form>
  );
}

export function FormEditar({
  lead,
}: {
  lead: {
    id: string;
    nombre: string;
    apellido: string | null;
    whatsapp: string;
    email: string | null;
    ciudad: Ciudad | null;
    etapa: Etapa | null;
    estatus: LeadEstatus;
  };
}) {
  const [state, action, pending] = useActionState<AccionState, FormData>(accionEditar, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lead_id" value={lead.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="e_nombre">
          <Input id="e_nombre" name="nombre" defaultValue={lead.nombre} required />
        </Field>
        <Field label="Apellido" htmlFor="e_apellido">
          <Input id="e_apellido" name="apellido" defaultValue={lead.apellido ?? ""} />
        </Field>
        <Field label="WhatsApp" htmlFor="e_whatsapp">
          <Input id="e_whatsapp" name="whatsapp" defaultValue={lead.whatsapp} required />
        </Field>
        <Field label="Correo" htmlFor="e_email">
          <Input id="e_email" name="email" type="email" defaultValue={lead.email ?? ""} />
        </Field>
        <Field label="Ciudad" htmlFor="e_ciudad">
          <Select id="e_ciudad" name="ciudad" defaultValue={lead.ciudad ?? ""}>
            <option value="">Sin ciudad</option>
            {(Object.keys(CIUDAD_LABEL) as Ciudad[]).map((c) => (
              <option key={c} value={c}>
                {CIUDAD_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        {lead.estatus === "calificado" && (
          <Field label="Etapa en el Reto" htmlFor="e_etapa" hint="Seguimiento después de calificar.">
            <Select id="e_etapa" name="etapa" defaultValue={lead.etapa ?? ""}>
              <option value="">Sin etapa</option>
              {(Object.keys(ETAPA_LABEL) as Etapa[]).map((e) => (
                <option key={e} value={e}>
                  {ETAPA_LABEL[e]}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Mensaje state={state} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Guardando…" : "Guardar datos"}
      </Button>
    </form>
  );
}
