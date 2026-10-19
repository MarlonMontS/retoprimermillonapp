import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { listarLideresEstado } from "@/lib/data/equipo";
import { Card, PageHeader } from "@/components/ui";
import { Importador } from "./importador";

export const metadata: Metadata = { title: "Importar leads" };
export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  await requirePerfil(["admin"]);
  const lideres = await listarLideresEstado({ incluirGerentes: true, soloActivos: true });
  return (
    <>
      <PageHeader
        title="Importar leads"
        subtitle="Trae los registros que ya cayeron en GoHighLevel. Se marcan como importados y no corren la ruleta."
      />
      <Card>
        <Importador
          lideres={lideres
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((l) => ({ id: l.id, nombre: l.nombre, detalle: l.rol === "gerente" ? "Gerente" : l.gerente_nombre ?? undefined }))}
        />
      </Card>
    </>
  );
}
