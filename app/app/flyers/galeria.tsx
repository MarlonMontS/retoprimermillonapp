"use client";

import { useState } from "react";
import { Button, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { FORMATOS, PLANTILLAS, etiquetaSesion, textoCompartir, type Formato, type Plantilla } from "@/lib/flyers";

export interface OpcionEnlace {
  ref: string | null;
  nombre: string;
  enlace: string;
}

export function GaleriaFlyers({ opciones, base, sesiones }: { opciones: OpcionEnlace[]; base: string; sesiones: string[] }) {
  const [plantilla, setPlantilla] = useState<Plantilla>("registro");
  const [formato, setFormato] = useState<Formato>("vertical");
  const [idx, setIdx] = useState(0);
  const [estado, setEstado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sesion, setSesion] = useState<string>(sesiones[0] ?? "");

  const op = opciones[idx];
  const qs = new URLSearchParams({ plantilla, formato });
  if (op.ref) qs.set("ref", op.ref);
  if (plantilla === "sesion" && sesion) qs.set("sesion", sesion);
  const src = `/api/flyer?${qs.toString()}`;
  const urlPublica = `${base}/api/flyer?${qs.toString()}`;
  const nombreArchivo = `reto-tu-primer-millon-${plantilla}-${formato}.png`;
  const texto = textoCompartir(op.enlace, { invitador: op.ref ? op.nombre : null, plantilla, sesion: plantilla === "sesion" ? sesion : null });
  const { ancho, alto } = FORMATOS[formato];

  async function compartir() {
    setEstado(null);
    try {
      const blob = await (await fetch(src)).blob();
      const archivo = new File([blob], nombreArchivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], text: texto, title: "Reto Primer Millón" });
        return;
      }
      setEstado("Tu navegador no permite compartir la imagen directo. Descárgala y adjúntala, o usa el botón de WhatsApp.");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setEstado("No se pudo compartir. Intenta descargarla.");
    }
  }

  async function copiarImagen() {
    setEstado(null);
    try {
      const blob = await (await fetch(src)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setEstado("Imagen copiada. Pégala en WhatsApp Web o en tu correo.");
    } catch {
      setEstado("Tu navegador no permite copiar imágenes. Descárgala.");
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${texto}\n\nFlyer: ${urlPublica}`)}`;
  const correo = `mailto:?subject=${encodeURIComponent(plantilla === "sesion" ? "Sesión informativa del Reto Tu Primer Millón" : "Te invito al Reto Tu Primer Millón")}&body=${encodeURIComponent(`${texto}\n\nVer el flyer: ${urlPublica}`)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Diseño</p>
          <div className="space-y-2">
            {(Object.keys(PLANTILLAS) as Plantilla[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setPlantilla(p); setCargando(true); }}
                className={cn("w-full rounded-xl border px-3 py-2.5 text-left", plantilla === p ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-line-2")}
              >
                <span className="block text-sm font-medium">{PLANTILLAS[p].label}</span>
                <span className="block text-xs text-dim">{PLANTILLAS[p].descripcion}</span>
              </button>
            ))}
          </div>
        </div>

        {plantilla === "sesion" && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Sesión</p>
            {sesiones.length ? (
              <Select value={sesion} onChange={(e) => { setSesion(e.target.value); setCargando(true); }}>
                {sesiones.map((x) => (
                  <option key={x} value={x}>
                    {etiquetaSesion(x).larga} · 7:00 p.m. TJ / 8:00 p.m. Centro
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-xs text-dim">Ya no hay sesiones informativas próximas.</p>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-muted">Formato</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FORMATOS) as Formato[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setFormato(f); setCargando(true); }}
                className={cn("rounded-xl border px-2 py-2 text-sm font-medium", formato === f ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface-2 hover:border-line-2")}
              >
                {FORMATOS[f].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-dim">
            {FORMATOS[formato].ancho} × {FORMATOS[formato].alto} px · {FORMATOS[formato].uso}
          </p>
        </div>

        {opciones.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Enlace del QR</p>
            <Select value={idx} onChange={(e) => { setIdx(Number(e.target.value)); setCargando(true); }}>
              {opciones.map((o, i) => (
                <option key={o.ref ?? "general"} value={i}>
                  {o.nombre}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <a
            href={`${src}&descargar=1`}
            download={nombreArchivo}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-medium text-on-accent hover:bg-accent-2"
          >
            Descargar PNG
          </a>
          <Button type="button" variant="secondary" className="w-full" onClick={compartir}>
            Compartir imagen (celular)
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <a href={whatsapp} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-sm font-medium hover:bg-surface-3">
              WhatsApp
            </a>
            <a href={correo} className="flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-sm font-medium hover:bg-surface-3">
              Correo
            </a>
          </div>
          <Button type="button" variant="ghost" className="w-full" onClick={copiarImagen}>
            Copiar imagen
          </Button>
          {estado && <p className="text-xs text-muted">{estado}</p>}
          <p className="text-xs text-dim">
            En el celular, «Compartir imagen» abre WhatsApp, correo o cualquier app con el flyer adjunto. Los botones de WhatsApp y Correo mandan el texto con tu enlace y un link al flyer.
          </p>
        </div>
      </div>

      <div className="flex items-start justify-center rounded-2xl border border-line bg-surface p-4">
        <div className="relative w-full" style={{ maxWidth: formato === "vertical" ? 380 : formato === "cuadrado" ? 560 : 900, aspectRatio: `${ancho} / ${alto}` }}>
          {cargando && <div className="absolute inset-0 animate-pulse rounded-xl bg-surface-3" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt={`Flyer ${PLANTILLAS[plantilla].label} ${FORMATOS[formato].label}`}
            className="relative z-10 h-full w-full rounded-xl object-contain shadow-lg"
            onLoad={() => setCargando(false)}
            onError={() => { setCargando(false); setEstado("No se pudo generar el flyer. Recarga la página."); }}
          />
        </div>
      </div>
    </div>
  );
}
