"use client";

import { startTransition, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui";

/** Envía el formulario sin que React lo reinicie: si hay un error, lo capturado sigue ahí. */
export function enviarSinReiniciar(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

/** Botón que abre una ventana de confirmación. Se usa para acciones difíciles de deshacer. */
export function DialogoAccion({
  etiqueta,
  titulo,
  peligro,
  size = "sm",
  cerrarSi,
  children,
}: {
  etiqueta: string;
  titulo: string;
  peligro?: boolean;
  size?: "sm" | "md";
  /** Al volverse true, la ventana se cierra (por ejemplo, cuando la acción salió bien). */
  cerrarSi?: unknown;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (cerrarSi) ref.current?.close();
  }, [cerrarSi]);

  return (
    <>
      <Button type="button" variant={peligro ? "danger" : "secondary"} size={size} onClick={() => ref.current?.showModal()}>
        {etiqueta}
      </Button>
      <dialog
        ref={ref}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-left text-fg backdrop:bg-black/70"
      >
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <div className="mt-3">{children}</div>
        <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => ref.current?.close()}>
          Cancelar
        </Button>
      </dialog>
    </>
  );
}
