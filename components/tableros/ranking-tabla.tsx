import Link from "next/link";
import { Badge, Progress, Table, Td, Th } from "@/components/ui";
import { CIUDAD_LABEL, type LiderEstado } from "@/lib/types";

export function RankingTabla({
  lideres,
  resaltar,
  conEnlaces = false,
  mostrarGerente = false,
  limite,
}: {
  lideres: LiderEstado[];
  resaltar?: string;
  conEnlaces?: boolean;
  mostrarGerente?: boolean;
  limite?: number;
}) {
  const filas = limite ? lideres.slice(0, limite) : lideres;
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-10 text-right">#</Th>
          <Th>Líder</Th>
          {mostrarGerente && <Th>Gerente</Th>}
          <Th className="min-w-44">Calificados</Th>
          <Th className="text-right">Registrados</Th>
          <Th className="text-right">Pendientes</Th>
          <Th className="text-right">Bolsa</Th>
          <Th>Estado</Th>
        </tr>
      </thead>
      <tbody>
        {filas.map((l, i) => {
          const propio = l.id === resaltar;
          const faltan = Math.max(0, l.cuota - l.calificados);
          return (
            <tr key={l.id} className={propio ? "bg-accent/5" : "hover:bg-surface-2/60"}>
              <Td className="text-right tabular-nums text-dim">{i + 1}</Td>
              <Td>
                {conEnlaces ? (
                  <Link href={`/app/lideres/${l.id}`} className="font-medium hover:text-accent">
                    {l.nombre}
                  </Link>
                ) : (
                  <span className="font-medium">{l.nombre}</span>
                )}
                {propio && <span className="ml-2 text-xs text-accent">tú</span>}
                <div className="text-xs text-dim">
                  {l.ciudad ? CIUDAD_LABEL[l.ciudad] : ""}
                  {!l.activo && " · inactivo"}
                </div>
              </Td>
              {mostrarGerente && <Td className="text-muted">{l.gerente_nombre ?? "—"}</Td>}
              <Td>
                <div className="flex items-center gap-3">
                  <span className="w-12 tabular-nums">
                    {l.calificados}
                    <span className="text-dim">/{l.cuota}</span>
                  </span>
                  <Progress value={l.calificados} max={l.cuota} className="w-24" />
                </div>
              </Td>
              <Td className="text-right tabular-nums text-muted">{l.registrados}</Td>
              <Td className="text-right tabular-nums text-muted">{l.pendientes}</Td>
              <Td className="text-right tabular-nums text-muted">{l.bolsa_recibidos}</Td>
              <Td>
                {l.desbloqueado ? (
                  <Badge tone="accent">Bolsa desbloqueada</Badge>
                ) : (
                  <Badge tone="dim">
                    Faltan {faltan}
                  </Badge>
                )}
                {l.bolsa_manual !== null && <span className="ml-1 text-xs text-dim">manual</span>}
              </Td>
            </tr>
          );
        })}
        {filas.length === 0 && (
          <tr>
            <Td className="py-8 text-center text-muted" colSpan={mostrarGerente ? 8 : 7}>
              Todavía no hay líderes registrados.
            </Td>
          </tr>
        )}
      </tbody>
    </Table>
  );
}
