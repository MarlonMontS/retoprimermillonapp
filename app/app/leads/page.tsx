import type { Metadata } from "next";
import Link from "next/link";
import { requirePerfil } from "@/lib/auth";
import { scopeDe } from "@/lib/data/scope";
import { listarLeads, type FiltrosLeads } from "@/lib/data/leads";
import { listarLideresEstado } from "@/lib/data/equipo";
import { LeadsTabla } from "@/components/leads-tabla";
import { LeadsFiltros } from "@/components/leads-filtros";
import { PageHeader } from "@/components/ui";
import type { SearchParams } from "@/lib/public";
import type { Ciudad, LeadEstatus } from "@/lib/types";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

function leerFiltros(sp: SearchParams): FiltrosLeads {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return {
    q: s("q") || undefined,
    estatus: (s("estatus") as LeadEstatus | "pendientes" | "") || undefined,
    ciudad: (s("ciudad") as Ciudad | "") || undefined,
    lider: s("lider") || undefined,
    gerente: s("gerente") || undefined,
    fuente: s("fuente") || undefined,
    bolsa: (s("bolsa") as FiltrosLeads["bolsa"]) || undefined,
    page: Number(s("page") || 1) || 1,
  };
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const perfil = await requirePerfil();
  const scope = await scopeDe(perfil);
  const filtros = leerFiltros(sp);

  const [{ leads, total, page, pages }, responsables] = await Promise.all([
    listarLeads(scope, filtros),
    perfil.rol === "lider"
      ? Promise.resolve([])
      : listarLideresEstado({ gerenteId: perfil.rol === "gerente" ? perfil.id : undefined, incluirGerentes: true }),
  ]);

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") qs.set(k, v);
  const exportHref = perfil.rol === "lider" ? undefined : `/api/export?${qs.toString()}`;
  const linkPagina = (p: number) => {
    const q = new URLSearchParams(qs);
    q.set("page", String(p));
    return `/app/leads?${q.toString()}`;
  };

  const titulo = perfil.rol === "lider" ? "Mis invitados" : perfil.rol === "gerente" ? "Leads de mi equipo" : "Leads";

  return (
    <>
      <PageHeader title={titulo} subtitle={`${total} registro${total === 1 ? "" : "s"}`} />
      <LeadsFiltros
        filtros={filtros}
        responsables={responsables.map((r) => ({ id: r.id, nombre: r.nombre }))}
        mostrarBolsa={perfil.rol !== "lider"}
        exportHref={exportHref}
      />
      <LeadsTabla leads={leads} mostrarResponsable={perfil.rol !== "lider"} />
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={linkPagina(page - 1)} className="rounded-xl border border-line px-3 py-1.5 hover:bg-surface-2">
                Anterior
              </Link>
            )}
            {page < pages && (
              <Link href={linkPagina(page + 1)} className="rounded-xl border border-line px-3 py-1.5 hover:bg-surface-2">
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
