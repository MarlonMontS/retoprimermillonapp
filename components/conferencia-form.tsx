"use client";

import { useEffect, useState } from "react";
import { Button, Field, Input } from "@/components/ui";

export function ConferenciaForm({ utm, embed, avisoUrl }: { utm: Record<string, string>; embed: boolean; avisoUrl: string }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  // Dentro de un iframe, avisa la altura para que crezca solo.
  useEffect(() => {
    if (!embed || window.parent === window) return;
    const enviar = () => window.parent.postMessage({ rpmHeight: document.documentElement.scrollHeight }, "*");
    enviar();
    const ro = new ResizeObserver(enviar);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [embed, listo, error]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    setEnviando(true);
    try {
      const res = await fetch("/api/conferencia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre: String(fd.get("nombre") ?? ""),
          email: String(fd.get("email") ?? ""),
          whatsapp: String(fd.get("whatsapp") ?? ""),
          empresa: String(fd.get("empresa") ?? ""),
          utm,
          pagina: (embed && document.referrer) || window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No pudimos guardar tu registro. Intenta de nuevo.");
        return;
      }
      setListo(true);
      if (embed && window.parent !== window) window.parent.postMessage({ rpmConferenciaRegistrado: true }, "*");
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div role="status" className="rounded-2xl border border-accent/30 bg-accent/10 p-6 text-center">
        <p className="text-xl font-semibold">¡Tu registro se ha confirmado!</p>
        <p className="mt-2 text-muted">Te recomendamos llegar con 30 minutos de anticipación por lo menos. Nos vemos en el evento:)</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nombre completo" htmlFor="nombre">
        <Input id="nombre" name="nombre" required minLength={2} maxLength={120} autoComplete="name" placeholder="Tu nombre" />
      </Field>
      <Field label="Correo" htmlFor="email">
        <Input id="email" name="email" type="email" required maxLength={120} autoComplete="email" placeholder="tu@correo.com" />
      </Field>
      <Field label="WhatsApp" htmlFor="whatsapp" hint="10 dígitos, por ejemplo 81 1234 5678">
        <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" required minLength={10} autoComplete="tel" placeholder="81 1234 5678" />
      </Field>

      {/* Campo trampa para bots: los humanos no lo ven */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="empresa">Empresa</label>
        <input id="empresa" name="empresa" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Enviando…" : "Registrarme"}
      </Button>
      <p className="text-center text-xs text-dim">
        Entrada gratuita. Al registrarte aceptas el{" "}
        <a href={avisoUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-muted">
          aviso de privacidad
        </a>
        .
      </p>
    </form>
  );
}
