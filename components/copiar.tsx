"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function BotonCopiar({ texto, etiqueta = "Copiar", size = "sm" }: { texto: string; etiqueta?: string; size?: "sm" | "md" }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 1800);
        } catch {
          window.prompt("Copia el texto:", texto);
        }
      }}
    >
      {ok ? "Copiado ✓" : etiqueta}
    </Button>
  );
}

export function BotonWhatsapp({ texto, etiqueta = "Compartir por WhatsApp" }: { texto: string; etiqueta?: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-2"
    >
      {etiqueta}
    </a>
  );
}
