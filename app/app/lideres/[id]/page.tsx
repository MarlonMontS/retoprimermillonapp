import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerfil } from "@/lib/auth";
import { listarLideresEstado, obtenerLiderEstado, obtenerPerfil } from "@/lib/data/equipo";
import { resumenPerfil } from "@/lib/data/movimientos";
import { listarLeads } from "@/lib/data/leads";
import { LeadsTabla } from "@/components/leads-tabla";
import { BotonCopiar, BotonWhatsapp } from "@/components/copiar";
import { Badge, Card, CardTitle, PageHeader, Progress, Stat } from "@/components/ui";
import { FormEditarPerfil, FormResetPassword } from "./formularios";
import { MoverEliminar } from "./mover";
import { mensajeInvitacion } from "@/components/tableros/lider";
import { CIUDAD_LABEL, ROL_LABEL } from "@/lib/types";
import { appUrl } from "@/lib/utils";
import { formatearWhatsapp } from "@/lib/phone";

export const metadata: Metadata = { title: "Líder" };
export const dynamic = "force-dynamic";

export default async function LiderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePerfil(["admin", "gerente"]);
  const perfil = await obtenerPerfil(id);
  if (!perfil || perfil.rol === "admin") notFound();
  if (actor.rol === "gerente" && perfil.gerente_id !== actor.id && perfil.id !== actor.id) notFound();

  const esAdmin = actor.rol === "admin";
  const [estado, equipo, resumen, { leads }] = await Promise.all([
    obtenerLiderEstado(id),
    esAdmin ? listarLideresEstado({ incluirGerentes: true, soloActivos: true }) : Promise.resolve([]),
    esAdmin ? resumenPerfil(id) : Promise.resolve(null),
    listarLeads({ tipo: "ids", ids: [id] }, { limit: 200 }),
  ]);
  const url = appUrl(`/r/${perfil.slug ?? ""}`);
  const porNombre = [...equipo].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const responsables = porNombre.map((l) => ({ id: l.id, nombre: l.nombre, detalle: l.rol === "gerente" ? "Gerente" : l.gerente_nombre ?? undefined }));
  const gerentes = porNombre.filter((l) => l.rol === "gerente").map((l) => ({ id: l.id, nombre: l.nombre }));

  return (
    <>
      <div className="mb-4">
        <Link href="/app/lideres" className="text-sm text-muted hover:text-fg">
          ← Volver
        </Link>
      </div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {perfil.nombre}
            <Badge tone="dim">{ROL_LABEL[perfil.rol]}</Badge>
            {!perfil.activo && <Badge tone="danger">Inactivo</Badge>}
            {estado?.desbloqueado && <Badge tone="accent">Bolsa desbloqueada</Badge>}
          </span>
        }
        subtitle={[perfil.email, perfil.telefono ? formatearWhatsapp(perfil.telefono) : null, perfil.ciudad ? CIUDAD_LABEL[perfil.ciudad] : null, estado?.gerente_nombre ? `Gerente: ${estado.gerente_nombre}` : null]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Registrados" value={estado?.registrados ?? 0} />
        <Stat label="Pendientes" value={estado?.pendientes ?? 0} />
        <Stat label="Calificados" value={`${estado?.calificados ?? 0}/${estado?.cuota ?? 5}`} tone="accent" />
        <Stat label="De la bolsa" value={estado?.bolsa_recibidos ?? 0} hint={`${estado?.bolsa_calificados ?? 0} calificados`} />
      </div>
      {perfil.rol === "lider" && <Progress value={estado?.calificados ?? 0} max={estado?.cuota ?? 5} className="mt-3" />}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Enlace de invitación</CardTitle>
          {perfil.slug ? (
            <>
              <p className="break-all rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-sm text-accent">{url}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <BotonCopiar texto={url} etiqueta="Copiar enlace" />
                <BotonWhatsapp texto={mensajeInvitacion(url)} etiqueta="Mensaje de invitación" />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Este usuario no tiene enlace.</p>
          )}
        </Card>
        <Card>
          <CardTitle>Acceso</CardTitle>
          <FormResetPassword id={perfil.id} appUrl={appUrl()} />
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Datos</CardTitle>
        <FormEditarPerfil perfil={perfil} esAdmin={esAdmin} />
      </Card>

      {resumen && (
        <Card className="mt-4">
          <CardTitle>Mover, convertir y eliminar</CardTitle>
          <MoverEliminar perfil={perfil} resumen={resumen} gerentes={gerentes} responsables={responsables} />
        </Card>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Leads de {perfil.nombre.split(" ")[0]}</h2>
        <LeadsTabla leads={leads} mostrarResponsable={false} />
      </div>
    </>
  );
}
