import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { listarFuentes } from "@/lib/data/fuentes";
import { BotonCopiar } from "@/components/copiar";
import { Badge, Card, CardTitle, PageHeader, Table, Td, Th } from "@/components/ui";
import { FormCampana } from "./form";
import { accionActivarFuente } from "./actions";
import { FUENTE_TIPO_LABEL } from "@/lib/types";
import { appUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Enlaces y campañas" };
export const dynamic = "force-dynamic";

export default async function FuentesPage() {
  await requirePerfil(["admin"]);
  const fuentes = await listarFuentes();
  const personas = fuentes.filter((f) => f.tipo === "lider" || f.tipo === "gerente");
  const campanas = fuentes.filter((f) => f.tipo !== "lider" && f.tipo !== "gerente");
  const base = appUrl();
  const snippet = `<iframe id="rpm-registro" src="${base}/registro?embed=1" title="Registro Reto Primer Millón" loading="lazy" style="width:100%;border:0;height:980px;border-radius:12px"></iframe>
<script>
window.addEventListener("message", function (e) {
  if (e.data && e.data.rpmHeight) {
    var f = document.getElementById("rpm-registro");
    if (f) f.style.height = e.data.rpmHeight + "px";
  }
});
</script>`;

  return (
    <>
      <PageHeader title="Enlaces y campañas" subtitle="Cada enlace deja el registro atribuido a su dueño. Comparte el general solo en la landing." />

      <Card>
        <CardTitle>Formulario general (landing)</CardTitle>
        <p className="text-sm text-muted">
          Muestra el selector «¿Quién te invitó?». Quien elija «Nadie» cae en la bolsa común. Pégalo en Framer con un bloque Embed
          reemplazando el formulario de GoHighLevel.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="break-all rounded-lg bg-surface-2 px-2 py-1 text-xs text-accent">{base}/registro</code>
          <BotonCopiar texto={`${base}/registro`} etiqueta="Copiar URL" />
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-muted hover:text-fg">Código para incrustar en Framer</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-line bg-surface-2 p-3 text-xs text-muted">{snippet}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <BotonCopiar texto={snippet} etiqueta="Copiar código" />
          </div>
          <p className="mt-2 text-xs text-dim">
            Agrega <code>&amp;tema=claro</code> a la URL del iframe si el bloque va sobre fondo claro. Los parámetros utm_source, utm_medium y utm_campaign
            de la página se pueden pasar al iframe para rastrear campañas.
          </p>
        </details>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Campañas, publicidad y colaboraciones</h2>
        <Card className="mb-4">
          <FormCampana appUrl={base} />
        </Card>
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th>Enlace</Th>
              <Th className="text-right">Leads</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody>
            {campanas.map((f) => (
              <tr key={f.id} className="hover:bg-surface-2/60">
                <Td className="font-medium">{f.nombre}</Td>
                <Td className="text-muted">{FUENTE_TIPO_LABEL[f.tipo]}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-xs text-accent">
                      {base}/r/{f.slug}
                    </code>
                    <BotonCopiar texto={`${base}/r/${f.slug}`} />
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{f.leads ?? 0}</Td>
                <Td>
                  <form action={accionActivarFuente} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="activo" value={f.activo ? "0" : "1"} />
                    {f.activo ? <Badge tone="accent">Activo</Badge> : <Badge tone="dim">Apagado</Badge>}
                    <button className="text-xs text-muted underline-offset-2 hover:underline">{f.activo ? "apagar" : "prender"}</button>
                  </form>
                </Td>
              </tr>
            ))}
            {campanas.length === 0 && (
              <tr>
                <Td className="py-8 text-center text-muted" colSpan={5}>
                  Crea un enlace por campaña o marca para saber de dónde llega cada lead.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Enlaces de líderes y gerentes</h2>
        <Table>
          <thead>
            <tr>
              <Th>Persona</Th>
              <Th>Rol</Th>
              <Th>Enlace</Th>
              <Th className="text-right">Leads</Th>
            </tr>
          </thead>
          <tbody>
            {personas.map((f) => (
              <tr key={f.id} className="hover:bg-surface-2/60">
                <Td className="font-medium">
                  {f.nombre}
                  {f.perfil && !f.perfil.activo && <Badge tone="danger" className="ml-2">Inactivo</Badge>}
                </Td>
                <Td className="text-muted">{FUENTE_TIPO_LABEL[f.tipo]}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-xs text-accent">
                      {base}/r/{f.slug}
                    </code>
                    <BotonCopiar texto={`${base}/r/${f.slug}`} />
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{f.leads ?? 0}</Td>
              </tr>
            ))}
            {personas.length === 0 && (
              <tr>
                <Td className="py-8 text-center text-muted" colSpan={4}>
                  Los enlaces se crean solos al dar de alta a cada líder o gerente.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
}
