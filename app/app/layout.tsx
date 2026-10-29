import { requirePerfil } from "@/lib/auth";
import { NavLinks, type NavItem } from "@/components/nav";
import { Badge } from "@/components/ui";
import { ROL_LABEL, type Rol } from "@/lib/types";
import { cerrarSesion } from "@/app/login/actions";

function navPara(rol: Rol): NavItem[] {
  if (rol === "admin") {
    return [
      { href: "/app", label: "Tablero" },
      { href: "/app/leads", label: "Leads" },
      { href: "/app/lideres", label: "Líderes" },
      { href: "/app/gerentes", label: "Gerentes" },
      { href: "/app/bolsa", label: "Bolsa común" },
      { href: "/app/fuentes", label: "Enlaces y campañas" },
      { href: "/app/importar", label: "Importar" },
      { href: "/app/config", label: "Configuración" },
      { href: "/app/flyers", label: "Flyers" },
      { href: "/app/asistente", label: "Asistente" },
      { href: "/app/cuenta", label: "Mi cuenta" },
      { href: "/app/ayuda", label: "Ayuda" },
    ];
  }
  if (rol === "gerente") {
    return [
      { href: "/app", label: "Tablero" },
      { href: "/app/leads", label: "Leads de mi equipo" },
      { href: "/app/lideres", label: "Mi equipo" },
      { href: "/app/flyers", label: "Flyers" },
      { href: "/app/asistente", label: "Asistente" },
      { href: "/app/cuenta", label: "Mi cuenta" },
      { href: "/app/ayuda", label: "Ayuda" },
    ];
  }
  return [
    { href: "/app", label: "Mi avance" },
    { href: "/app/leads", label: "Mis invitados" },
    { href: "/app/ranking", label: "Ranking" },
    { href: "/app/flyers", label: "Flyers" },
      { href: "/app/asistente", label: "Asistente" },
      { href: "/app/cuenta", label: "Mi cuenta" },
    { href: "/app/ayuda", label: "Ayuda" },
  ];
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requirePerfil();
  const items = navPara(perfil.rol);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface/60 px-4 py-4 md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="mb-4 flex items-center justify-between md:mb-8 md:block">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Reto Primer Millón</p>
            <p className="mt-1 truncate text-sm font-medium">{perfil.nombre}</p>
            <div className="mt-1">
              <Badge tone="dim">{ROL_LABEL[perfil.rol]}</Badge>
            </div>
          </div>
          <form action={cerrarSesion} className="md:hidden">
            <button className="rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">Salir</button>
          </form>
        </div>
        <NavLinks items={items} />
        <form action={cerrarSesion} className="mt-8 hidden md:block">
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg">
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
