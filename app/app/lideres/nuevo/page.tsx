import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { listarPerfiles } from "@/lib/data/equipo";
import { FormNuevoUsuario } from "@/components/equipo/form-usuario";
import { Card, PageHeader } from "@/components/ui";
import { appUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Nuevo líder" };
export const dynamic = "force-dynamic";

export default async function NuevoLiderPage() {
  const perfil = await requirePerfil(["admin", "gerente"]);
  const gerentes = perfil.rol === "admin" ? await listarPerfiles("gerente") : [];
  return (
    <>
      <div className="mb-4">
        <Link href="/app/lideres" className="text-sm text-muted hover:text-fg">
          ← Volver a líderes
        </Link>
      </div>
      <PageHeader title="Nuevo líder de equipo" subtitle="Se crea su acceso y su enlace de invitación. Compártele usuario y contraseña por WhatsApp." />
      <Card>
        <FormNuevoUsuario
          rolFijo="lider"
          gerentes={gerentes.map((g) => ({ id: g.id, nombre: g.nombre }))}
          gerenteFijo={perfil.rol === "gerente" ? perfil.id : undefined}
          appUrl={appUrl()}
        />
      </Card>
    </>
  );
}
