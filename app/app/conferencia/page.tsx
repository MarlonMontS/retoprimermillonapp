import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { listarConferencia } from "@/lib/data/conferencia";
import { BotonCopiar } from "@/components/copiar";
import { DialogoAccion } from "@/components/dialogo-accion";
import { Button, ButtonLink, Card, CardTitle, Empty, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { appUrl, fechaHora } from "@/lib/utils";
import { formatearWhatsapp, linkWhatsapp } from "@/lib/phone";
import { accionEliminarRegistro } from "./actions";

export const metadata: Metadata = { title: "Conferencia Monterrey" };
export const dynamic = "force-dynamic";

const diaMty = (iso: string | Date) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Monterrey" });

export default async function ConferenciaAdminPage() {
  await requirePerfil(["admin"]);
  const registros = await listarConferencia();
  const hoy = diaMty(new Date());
  const deHoy = registros.filter((r) => diaMty(r.created_at) === hoy).length;
  const enlace = appUrl("/conferencia-mty");

  return (
    <>
      <PageHeader
        title="Conferencia de apertura · Monterrey"
        subtitle="Público general registrado a la conferencia. Están separados del Reto: no son leads y no cuentan para nada del Reto."
        actions={
          registros.length > 0 ? (
            <ButtonLink href="/api/export/conferencia" variant="secondary">
              Descargar CSV
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Registrados" value={registros.length} tone="accent" />
        <Stat label="Hoy" value={deHoy} />
      </div>

      <Card className="mt-4">
        <CardTitle>Formulario de registro</CardTitle>
        <p className="break-all rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-sm text-accent">{enlace}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <BotonCopiar texto={enlace} etiqueta="Copiar enlace" />
          <ButtonLink href="/conferencia-mty" variant="secondary" size="sm" target="_blank" rel="noreferrer">
            Ver formulario
          </ButtonLink>
        </div>
        <p className="mt-3 text-xs text-dim">Para insertarlo en Framer usa el mismo enlace con ?embed=1 al final.</p>
      </Card>

      <div className="mt-6">
        {registros.length === 0 ? (
          <Empty title="Todavía no hay registros">Cuando alguien se registre en el formulario aparecerá aquí.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Correo</Th>
                <Th>WhatsApp</Th>
                <Th>Registrado</Th>
                <Th className="text-right">
                  <span className="sr-only">Acciones</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.nombre}</Td>
                  <Td className="text-muted">{r.email}</Td>
                  <Td>
                    <a href={linkWhatsapp(r.whatsapp)} target="_blank" rel="noreferrer" className="text-muted hover:text-accent">
                      {formatearWhatsapp(r.whatsapp)}
                    </a>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{fechaHora(r.created_at)}</Td>
                  <Td className="text-right">
                    <DialogoAccion etiqueta="Eliminar" titulo={`Eliminar a ${r.nombre}`} peligro>
                      <form action={accionEliminarRegistro} className="space-y-3">
                        <input type="hidden" name="id" value={r.id} />
                        <p className="text-sm text-muted">Se borra su registro a la conferencia. No se puede deshacer.</p>
                        <Button type="submit" variant="danger" className="w-full">
                          Eliminar registro
                        </Button>
                      </form>
                    </DialogoAccion>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
