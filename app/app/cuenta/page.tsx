import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { FormPassword } from "./form";
import { CIUDAD_LABEL, ROL_LABEL } from "@/lib/types";
import { appUrl } from "@/lib/utils";
import { BotonCopiar } from "@/components/copiar";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const perfil = await requirePerfil();
  return (
    <>
      <PageHeader title="Mi cuenta" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Mis datos</CardTitle>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Nombre</dt>
              <dd>{perfil.nombre}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Correo</dt>
              <dd>{perfil.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Rol</dt>
              <dd>{ROL_LABEL[perfil.rol]}</dd>
            </div>
            {perfil.ciudad && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Ciudad</dt>
                <dd>{CIUDAD_LABEL[perfil.ciudad]}</dd>
              </div>
            )}
            {perfil.slug && (
              <div className="pt-2">
                <dt className="text-muted">Mi enlace de invitación</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  <code className="break-all rounded-lg bg-surface-2 px-2 py-1 text-xs text-accent">{appUrl(`/r/${perfil.slug}`)}</code>
                  <BotonCopiar texto={appUrl(`/r/${perfil.slug}`)} />
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs text-dim">Para cambiar tu nombre o tu correo, pídeselo al administrador.</p>
        </Card>
        <Card>
          <CardTitle>Cambiar contraseña</CardTitle>
          <FormPassword />
        </Card>
      </div>
    </>
  );
}
