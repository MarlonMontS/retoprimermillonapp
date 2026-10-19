import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { FormImportarEquipo } from "./form";
import { appUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Importar equipo" };

export default async function ImportarEquipoPage() {
  await requirePerfil(["admin"]);
  return (
    <>
      <div className="mb-4">
        <Link href="/app/lideres" className="text-sm text-muted hover:text-fg">
          ← Volver a líderes
        </Link>
      </div>
      <PageHeader title="Importar equipo" subtitle="Crea de golpe los accesos de gerentes y líderes a partir de tu lista." />
      <Card>
        <FormImportarEquipo appUrl={appUrl()} />
      </Card>
    </>
  );
}
