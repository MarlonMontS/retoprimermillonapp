import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { listarListas } from "@/lib/correos/datos";
import { correoConfigurado } from "@/lib/correos/motor";
import { PageHeader } from "@/components/ui";
import { FlujoCampana } from "./flujo";

export const metadata: Metadata = { title: "Nueva campaña" };
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function NuevaCampanaPage() {
  const perfil = await requirePerfil();
  const listas = await listarListas(perfil.id);
  return (
    <>
      <div className="mb-4">
        <Link href="/app/correos" className="text-sm text-muted hover:text-fg">
          ← Volver a campañas
        </Link>
      </div>
      <PageHeader title="Nueva campaña" subtitle="Dime qué quieres lograr y te propongo los correos." />
      <FlujoCampana listas={listas} configurado={correoConfigurado()} />
    </>
  );
}
