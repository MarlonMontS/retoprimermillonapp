"use client";

import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui";

/** Cambia la versión para volver a mostrarle un aviso nuevo a todos. */
const VERSION = "correos-flyers-1";

const NOVEDADES = [
  {
    titulo: "Manda tu mailing",
    texto: "Sube tu lista de contactos y elige tu objetivo. Te proponemos los correos y los seguimientos salen solos.",
    href: "/app/correos",
    accion: "Ir a Correos",
  },
  {
    titulo: "Genera tus flyers",
    texto: "Elige diseño y formato. El QR lleva tu invitación, así cada registro queda en tu equipo.",
    href: "/app/flyers",
    accion: "Ir a Flyers",
  },
];

export function AvisoNovedades({ usuarioId }: { usuarioId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const clave = `reto-aviso-${VERSION}-${usuarioId}`;

  useEffect(() => {
    let visto = false;
    try {
      visto = localStorage.getItem(clave) === "1";
    } catch {}
    if (!visto && ref.current && !ref.current.open) ref.current.showModal();
  }, [clave]);

  function guardarVisto() {
    try {
      localStorage.setItem(clave, "1");
    } catch {}
  }

  function cerrar() {
    guardarVisto();
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      onCancel={guardarVisto}
      aria-labelledby="aviso-novedades-titulo"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-fg backdrop:bg-black/70"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Novedades</p>
      <h2 id="aviso-novedades-titulo" className="mt-2 text-xl font-semibold">
        Ya puedes hacer esto desde tu app
      </h2>
      <div className="mt-4 space-y-3">
        {NOVEDADES.map((n) => (
          <div key={n.href} className="rounded-xl border border-line bg-surface-2 p-4">
            <h3 className="font-semibold">{n.titulo}</h3>
            <p className="mt-1 text-sm text-muted">{n.texto}</p>
            <ButtonLink href={n.href} variant="secondary" size="sm" className="mt-3" onClick={cerrar}>
              {n.accion}
            </ButtonLink>
          </div>
        ))}
      </div>
      <Button type="button" className="mt-4 w-full" onClick={cerrar}>
        Entendido
      </Button>
    </dialog>
  );
}
