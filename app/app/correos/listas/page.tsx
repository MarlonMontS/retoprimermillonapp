import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { listarListas } from "@/lib/correos/datos";
import { Card, CardTitle, Empty, PageHeader, Table, Td, Th } from "@/components/ui";
import { fecha } from "@/lib/utils";
import { SubirLista } from "./subir";
import { accionEliminarLista } from "../actions";

export const metadata: Metadata = { title: "Mis listas" };
export const dynamic = "force-dynamic";

export default async function ListasPage() {
  const perfil = await requirePerfil();
  const listas = await listarListas(perfil.id);
  return (
    <>
      <div className="mb-4">
        <Link href="/app/correos" className="text-sm text-muted hover:text-fg">
          ← Volver a campañas
        </Link>
      </div>
      <PageHeader title="Mis listas" subtitle="Tus contactos son solo tuyos: nadie más del equipo los ve." />
      <Card className="mb-6">
        <CardTitle>Subir una lista</CardTitle>
        <SubirLista />
      </Card>
      {listas.length === 0 ? (
        <Empty title="Todavía no tienes listas">Sube un CSV con tus contactos para empezar.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Lista</Th>
              <Th className="text-right">Contactos</Th>
              <Th>Creada</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {listas.map((l) => (
              <tr key={l.id}>
                <Td className="font-medium">{l.nombre}</Td>
                <Td className="text-right tabular-nums">{l.contactos}</Td>
                <Td className="text-muted">{fecha(l.created_at)}</Td>
                <Td className="text-right">
                  <form action={accionEliminarLista}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="text-xs text-dim underline-offset-2 hover:text-danger hover:underline">Eliminar</button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
