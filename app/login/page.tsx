import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Reto Primer Millón</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Panel del equipo</h1>
          <p className="mt-1 text-sm text-muted">Entra con el correo y la contraseña que te compartió el equipo.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-xs text-dim">
          ¿Olvidaste tu contraseña? Pídele a tu gerente o al administrador que te genere una nueva.
        </p>
      </div>
    </main>
  );
}
