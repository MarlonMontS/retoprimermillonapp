import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { listarLideresEstado, listarPerfiles } from "@/lib/data/equipo";
import { FormNuevoUsuario } from "@/components/equipo/form-usuario";
import { Badge, Card, CardTitle, PageHeader, Table, Td, Th } from "@/components/ui";
import { CIUDAD_LABEL } from "@/lib/types";
import { appUrl } from "@/lib/utils";
import { formatearWhatsapp } from "@/lib/phone";

export const metadata: Metadata = { title: "Gerentes" };
export const dynamic = "force-dynamic";

export default async function GerentesPage() {
  await requirePerfil(["admin"]);
  const [todos, lideres] = await Promise.all([listarLideresEstado({ incluirGerentes: true }), listarPerfiles("lider")]);
  const gerentes = todos.filter((p) => p.rol === "gerente").sort((a, b) => a.nombre.localeCompare(b.nombre));
  const porGerente = new Map<string, { lideres: number; calificados: number; registrados: number }>();
  for (const l of todos.filter((p) => p.rol === "lider")) {
    if (!l.gerente_id) continue;
    const g = porGerente.get(l.gerente_id) ?? { lideres: 0, calificados: 0, registrados: 0 };
    g.lideres++;
    g.calificados += l.calificados;
    g.registrados += l.registrados;
    porGerente.set(l.gerente_id, g);
  }
  const sinGerente = lideres.filter((l) => !l.gerente_id).length;

  return (
    <>
      <PageHeader title="Gerentes" subtitle={`${gerentes.length} gerentes · ${sinGerente} líder${sinGerente === 1 ? "" : "es"} sin gerente asignado`} />
      <Table>
        <thead>
          <tr>
            <Th>Gerente</Th>
            <Th>Contacto</Th>
            <Th className="text-right">Líderes</Th>
            <Th className="text-right">Registrados del equipo</Th>
            <Th className="text-right">Calificados del equipo</Th>
            <Th className="text-right">Invitados propios</Th>
          </tr>
        </thead>
        <tbody>
          {gerentes.map((g) => {
            const t = porGerente.get(g.id) ?? { lideres: 0, calificados: 0, registrados: 0 };
            return (
              <tr key={g.id} className="hover:bg-surface-2/60">
                <Td>
                  <Link href={`/app/lideres/${g.id}`} className="font-medium hover:text-accent">
                    {g.nombre}
                  </Link>
                  <div className="text-xs text-dim">
                    {g.ciudad ? CIUDAD_LABEL[g.ciudad] : ""}
                    {!g.activo && <Badge tone="danger" className="ml-2">Inactivo</Badge>}
                  </div>
                </Td>
                <Td className="text-muted">
                  {g.email}
                  {g.telefono && <div className="text-xs">{formatearWhatsapp(g.telefono)}</div>}
                </Td>
                <Td className="text-right tabular-nums">{t.lideres}</Td>
                <Td className="text-right tabular-nums text-muted">{t.registrados}</Td>
                <Td className="text-right tabular-nums text-accent">{t.calificados}</Td>
                <Td className="text-right tabular-nums text-muted">
                  {g.registrados} <span className="text-dim">/ {g.calificados} calif.</span>
                </Td>
              </tr>
            );
          })}
          {gerentes.length === 0 && (
            <tr>
              <Td className="py-8 text-center text-muted" colSpan={6}>
                Todavía no hay gerentes. Crea el primero aquí abajo.
              </Td>
            </tr>
          )}
        </tbody>
      </Table>

      <Card className="mt-6">
        <CardTitle>Nuevo gerente</CardTitle>
        <FormNuevoUsuario rolFijo="gerente" gerentes={[]} appUrl={appUrl()} />
      </Card>
    </>
  );
}
