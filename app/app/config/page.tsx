import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { getConfig } from "@/lib/data/config";
import { Card, PageHeader } from "@/components/ui";
import { FormConfig } from "./form";

export const metadata: Metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  await requirePerfil(["admin"]);
  const config = await getConfig();
  return (
    <>
      <PageHeader title="Configuración" subtitle="Reglas del programa" />
      <Card>
        <FormConfig config={config} />
      </Card>
    </>
  );
}
