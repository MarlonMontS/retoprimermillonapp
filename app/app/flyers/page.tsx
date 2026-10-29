import type { Metadata } from "next";
import { requirePerfil } from "@/lib/auth";
import { listarFuentes } from "@/lib/data/fuentes";
import { PageHeader } from "@/components/ui";
import { appUrl } from "@/lib/utils";
import { GaleriaFlyers, type OpcionEnlace } from "./galeria";

export const metadata: Metadata = { title: "Flyers" };
export const dynamic = "force-dynamic";

export default async function FlyersPage() {
  const perfil = await requirePerfil();
  const opciones: OpcionEnlace[] = [];

  if (perfil.slug) opciones.push({ ref: perfil.slug, nombre: `Mi enlace (${perfil.nombre})`, enlace: appUrl(`/r/${perfil.slug}`) });
  if (perfil.rol === "admin") {
    opciones.push({ ref: null, nombre: "Formulario general (sin invitador)", enlace: appUrl("/registro") });
    const fuentes = await listarFuentes();
    for (const f of fuentes.filter((x) => x.activo && x.tipo !== "lider" && x.tipo !== "gerente")) {
      opciones.push({ ref: f.slug, nombre: `Campaña: ${f.nombre}`, enlace: appUrl(`/r/${f.slug}`) });
    }
  }
  if (opciones.length === 0) opciones.push({ ref: null, nombre: "Formulario general", enlace: appUrl("/registro") });

  return (
    <>
      <PageHeader
        title="Flyers del Reto"
        subtitle="Elige diseño y formato. El QR y el enlace del flyer llevan tu invitación, así cada registro queda en tu equipo."
      />
      <GaleriaFlyers opciones={opciones} base={appUrl()} />
    </>
  );
}
