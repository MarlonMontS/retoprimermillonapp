import { Button, ButtonLink, Input, Select } from "@/components/ui";
import { CIUDAD_LABEL, ESTATUS_LABEL, ESTATUS_ORDEN, type Ciudad } from "@/lib/types";
import type { FiltrosLeads } from "@/lib/data/leads";

export function LeadsFiltros({
  filtros,
  responsables,
  mostrarBolsa,
  exportHref,
}: {
  filtros: FiltrosLeads;
  responsables: { id: string; nombre: string }[];
  mostrarBolsa: boolean;
  exportHref?: string;
}) {
  return (
    <form method="get" className="mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto]">
      <Input name="q" defaultValue={filtros.q ?? ""} placeholder="Buscar por nombre, WhatsApp o correo" />
      <Select name="estatus" defaultValue={filtros.estatus ?? ""} className="md:w-44">
        <option value="">Todos los estatus</option>
        <option value="pendientes">Pendientes de llamar</option>
        {ESTATUS_ORDEN.map((e) => (
          <option key={e} value={e}>
            {ESTATUS_LABEL[e]}
          </option>
        ))}
      </Select>
      <Select name="ciudad" defaultValue={filtros.ciudad ?? ""} className="md:w-36">
        <option value="">Toda ciudad</option>
        {(Object.keys(CIUDAD_LABEL) as Ciudad[]).map((c) => (
          <option key={c} value={c}>
            {CIUDAD_LABEL[c]}
          </option>
        ))}
      </Select>
      {responsables.length > 0 ? (
        <Select name="lider" defaultValue={filtros.lider ?? ""} className="md:w-48">
          <option value="">Todo responsable</option>
          {responsables.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </Select>
      ) : (
        <span />
      )}
      {mostrarBolsa ? (
        <Select name="bolsa" defaultValue={filtros.bolsa ?? ""} className="md:w-40">
          <option value="">Invitados y bolsa</option>
          <option value="no">Solo invitados</option>
          <option value="si">Solo de bolsa</option>
          <option value="sin_asignar">Bolsa sin asignar</option>
        </Select>
      ) : (
        <span />
      )}
      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
      {exportHref ? (
        <ButtonLink href={exportHref} variant="ghost">
          Exportar CSV
        </ButtonLink>
      ) : (
        <span />
      )}
    </form>
  );
}
