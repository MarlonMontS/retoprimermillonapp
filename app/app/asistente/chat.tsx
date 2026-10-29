"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

export function Chat({ sugerencias, nombre }: { sugerencias: string[]; nombre: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [mensajes]);

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || enviando) return;
    const historial: Mensaje[] = [...mensajes, { role: "user", content: limpia }];
    setMensajes([...historial, { role: "assistant", content: "" }]);
    setTexto("");
    setEnviando(true);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: historial.filter((m) => m.content.trim()) }),
      });
      if (!res.ok || !res.body) {
        const msg = (await res.text().catch(() => "")) || "No pude responder. Intenta de nuevo.";
        setMensajes([...historial, { role: "assistant", content: msg }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        setMensajes([...historial, { role: "assistant", content: acumulado }]);
      }
    } catch {
      setMensajes([...historial, { role: "assistant", content: "Sin conexión. Revisa tu internet e intenta de nuevo." }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[480px] flex-col rounded-2xl border border-line bg-surface">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {mensajes.length === 0 && (
          <div className="mx-auto max-w-xl py-6 text-center">
            <p className="text-lg font-semibold">Hola, {nombre.split(" ")[0]}. ¿En qué te ayudo?</p>
            <p className="mt-1 text-sm text-muted">Pregúntame del Reto, de la app, o pídeme ayuda para invitar y vender.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {sugerencias.map((s) => (
                <button key={s} type="button" onClick={() => enviar(s)} className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-fg">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                m.role === "user" ? "bg-accent text-on-accent" : "bg-surface-2 text-fg"
              )}
            >
              {m.content || <span className="inline-block animate-pulse text-muted">Escribiendo…</span>}
            </div>
          </div>
        ))}
        <div ref={fin} />
      </div>
      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          placeholder="Escribe tu pregunta"
          maxLength={6000}
          className="min-h-11 flex-1 resize-none"
          rows={1}
        />
        <Button type="submit" disabled={enviando || !texto.trim()} className="h-11">
          {enviando ? "…" : "Enviar"}
        </Button>
        {mensajes.length > 0 && (
          <Button type="button" variant="ghost" className="h-11" disabled={enviando} onClick={() => setMensajes([])}>
            Nuevo
          </Button>
        )}
      </form>
    </div>
  );
}
