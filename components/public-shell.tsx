"use client";

import { useEffect, type ReactNode } from "react";

/** Marco para las páginas públicas. En modo embed no muestra encabezado ni pie. */
export function PublicShell({
  children,
  embed,
  tema,
  titulo,
  subtitulo,
}: {
  children: ReactNode;
  embed: boolean;
  tema?: string;
  titulo?: string;
  subtitulo?: string;
}) {
  useEffect(() => {
    if (tema === "claro") document.body.dataset.tema = "claro";
    return () => {
      delete document.body.dataset.tema;
    };
  }, [tema]);

  if (embed) {
    return <div className="mx-auto w-full max-w-2xl p-2 sm:p-4">{children}</div>;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Reto Primer Millón</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{titulo ?? "Regístrate al Reto"}</h1>
        <p className="mt-2 text-muted">
          {subtitulo ??
            "30 días para aprender ventas, marketing, negociación y bienes raíces con acompañamiento real. Participar es gratuito."}
        </p>
      </header>
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">{children}</div>
      <footer className="mt-8 text-center text-xs text-dim">
        <a href="https://retoprimermillon.com" className="hover:text-muted">
          retoprimermillon.com
        </a>
      </footer>
    </main>
  );
}
