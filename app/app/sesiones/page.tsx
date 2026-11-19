import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { fechaSesion, hoyIso, listarSesiones } from "@/lib/data/seguimiento";
import { DialogoAccion } from "@/components/dialogo-accion";
import { Badge, Button, Card, CardTitle, Empty, PageHeader, Table, Td, Th } from "@/components/ui";
import { FormSesion } from "./formulario";
import { accionEliminarSesion } from "./actions";

export const metadata: Metadata = { title: "Sesiones" };
export const dynamic = "force-dynamic";

export default async function SesionesPage() {
  await requirePerfil(["admin"]);
  const sesiones = await listarSesiones();
  const hoy = hoyIso();
  return (
    <>
      <div className="mb-4">
        <Link href="/app/seguimiento" className="text-sm text-muted hover:text-fg">
          ← Volver a seguimiento
        </Link>
      </div>
      <PageHeader title="Sesiones del programa" subtitle="Los módulos y sesiones del Reto. Con esta lista los líderes pasan asistencia." />

      {sesiones.length === 0 ? (
        <Empty title="Todavía no hay sesiones">Agrega la primera aquí abajo.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Sesión</Th>
              <Th>Fecha</Th>
              <Th className="text-right">
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {sesiones.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium">
                  {s.nombre} {s.fecha > hoy && <Badge tone="dim">Próxima</Badge>}
                </Td>
                <Td className="whitespace-nowrap text-muted">{fechaSesion(s)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <FormSesion sesion={s} />
                    <DialogoAccion etiqueta="Eliminar" titulo={`Eliminar ${s.nombre}`} peligro>
                      <form action={accionEliminarSesion} className="space-y-3">
                        <input type="hidden" name="id" value={s.id} />
                        <p className="text-sm text-muted">Se borra la sesión y toda la asistencia que se haya registrado en ella. No se puede deshacer.</p>
                        <Button type="submit" variant="danger" className="w-full">
                          Eliminar sesión
                        </Button>
                      </form>
                    </DialogoAccion>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Card className="mt-6">
        <CardTitle>Agregar sesión</CardTitle>
        <FormSesion />
      </Card>
    </>
  );
}
