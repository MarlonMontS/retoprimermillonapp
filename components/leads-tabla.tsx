import Link from "next/link";
import { Badge, Empty, EstatusBadge, Table, Td, Th } from "@/components/ui";
import { CIUDAD_LABEL, type LeadConRelaciones } from "@/lib/types";
import { fechaHora, nombreCompleto } from "@/lib/utils";
import { formatearWhatsapp, linkWhatsapp } from "@/lib/phone";

export function LeadsTabla({
  leads,
  mostrarResponsable = true,
  compacta = false,
}: {
  leads: LeadConRelaciones[];
  mostrarResponsable?: boolean;
  compacta?: boolean;
}) {
  if (leads.length === 0) {
    return <Empty title="No hay leads con estos filtros">Prueba quitando algún filtro.</Empty>;
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>Nombre</Th>
          <Th>WhatsApp</Th>
          {!compacta && <Th>Ciudad</Th>}
          {mostrarResponsable && <Th>Responsable</Th>}
          <Th>Estatus</Th>
          {!compacta && <Th className="text-right">Llamadas</Th>}
          <Th>Registro</Th>
        </tr>
      </thead>
      <tbody>
        {leads.map((l) => (
          <tr key={l.id} className="hover:bg-surface-2/60">
            <Td>
              <Link href={`/app/leads/${l.id}`} className="font-medium hover:text-accent">
                {nombreCompleto(l)}
              </Link>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {l.posible_duplicado && l.estatus !== "duplicado" && <Badge tone="violet">Posible duplicado</Badge>}
                {l.desde_bolsa && <Badge tone="dim">Bolsa</Badge>}
                {l.origen_registro === "import" && <Badge tone="dim">Importado</Badge>}
              </div>
            </Td>
            <Td>
              <a href={linkWhatsapp(l.whatsapp)} target="_blank" rel="noreferrer" className="tabular-nums text-muted hover:text-accent">
                {formatearWhatsapp(l.whatsapp)}
              </a>
            </Td>
            {!compacta && <Td className="text-muted">{l.ciudad ? CIUDAD_LABEL[l.ciudad] : "—"}</Td>}
            {mostrarResponsable && (
              <Td className="text-muted">
                {l.lider ? l.lider.nombre : <span className="text-dim">Bolsa sin asignar</span>}
                {l.fuente && l.fuente.tipo !== "lider" && l.fuente.tipo !== "gerente" && (
                  <div className="text-xs text-dim">{l.fuente.nombre}</div>
                )}
              </Td>
            )}
            <Td>
              <EstatusBadge estatus={l.estatus} />
            </Td>
            {!compacta && <Td className="text-right tabular-nums text-muted">{l.intentos}</Td>}
            <Td className="whitespace-nowrap text-muted">{fechaHora(l.created_at)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
