import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Reto Primer Millón</p>
        <h1 className="mt-3 text-3xl font-semibold">Esta página no existe</h1>
        <p className="mt-2 text-muted">El enlace puede estar mal escrito, haber caducado o no tienes acceso a él.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/app" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-2">
            Ir al panel
          </Link>
          <a href="https://retoprimermillon.com" className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2">
            Ir a la landing
          </a>
        </div>
      </div>
    </main>
  );
}
