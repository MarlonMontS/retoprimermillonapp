"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { CIUDAD_LABEL, COMO_SE_ENTERO_OPCIONES, EXPERIENCIA_OPCIONES, type Ciudad } from "@/lib/types";

export interface Invitador {
  id: string;
  nombre: string;
  ciudad: Ciudad | null;
}

interface Props {
  modo: "fijo" | "selector";
  fuenteSlug?: string | null;
  invitadorNombre?: string | null;
  invitadores?: Invitador[];
  utm: Record<string, string>;
  embed: boolean;
  avisoUrl: string;
}

const SIN_INVITADOR = "__ninguno__";

export function RegistroForm({ modo, fuenteSlug, invitadorNombre, invitadores = [], utm, embed, avisoUrl }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Avisa al contenedor (Framer) la altura real para que el iframe crezca solo.
  useEffect(() => {
    if (!embed || typeof window === "undefined" || window.parent === window) return;
    const enviar = () => {
      const h = document.documentElement.scrollHeight;
      window.parent.postMessage({ rpmHeight: h }, "*");
    };
    enviar();
    const ro = new ResizeObserver(enviar);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [embed, listo, error]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const invitador = String(fd.get("invitador") ?? "");

    const payload = {
      nombre: String(fd.get("nombre") ?? ""),
      apellido: String(fd.get("apellido") ?? ""),
      whatsapp: String(fd.get("whatsapp") ?? ""),
      email: String(fd.get("email") ?? ""),
      ciudad: String(fd.get("ciudad") ?? ""),
      experiencia: String(fd.get("experiencia") ?? ""),
      motivo: String(fd.get("motivo") ?? ""),
      como_se_entero: String(fd.get("como_se_entero") ?? ""),
      fuente_slug: modo === "fijo" ? fuenteSlug ?? null : null,
      lider_id: modo === "selector" && invitador && invitador !== SIN_INVITADOR ? invitador : null,
      utm,
      origen: modo === "fijo" ? "link" : "selector",
      consentimiento: fd.get("consentimiento") === "on",
      empresa: String(fd.get("empresa") ?? ""),
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/registrar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No pudimos guardar tu registro. Intenta de nuevo.");
        return;
      }
      if (embed) {
        setListo(true);
        formRef.current?.scrollIntoView({ block: "start" });
      } else {
        router.replace("/gracias");
      }
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Registro recibido</p>
        <h2 className="mt-2 text-2xl font-semibold">¡Listo!</h2>
        <p className="mt-2 text-muted">
          En los próximos días alguien del equipo te va a contactar por WhatsApp para confirmar tu lugar.
          Registrarte no garantiza automáticamente tu lugar: hay un proceso de selección.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {modo === "fijo" && invitadorNombre && (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          Te invita <strong className="text-accent">{invitadorNombre}</strong>. Tu registro quedará en su equipo.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="nombre">
          <Input id="nombre" name="nombre" required maxLength={80} autoComplete="given-name" placeholder="Tu nombre" />
        </Field>
        <Field label="Apellido" htmlFor="apellido">
          <Input id="apellido" name="apellido" required maxLength={80} autoComplete="family-name" placeholder="Tu apellido" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WhatsApp" htmlFor="whatsapp" hint="10 dígitos, por ejemplo 664 123 4567">
          <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" required minLength={10} autoComplete="tel" placeholder="664 123 4567" />
        </Field>
        <Field label="Correo" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@correo.com" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="¿En qué ciudad te gustaría participar?" htmlFor="ciudad">
          <Select id="ciudad" name="ciudad" required defaultValue="">
            <option value="" disabled>
              Elige una opción
            </option>
            {(Object.keys(CIUDAD_LABEL) as Ciudad[]).map((c) => (
              <option key={c} value={c}>
                {CIUDAD_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="¿Tienes experiencia en bienes raíces, ventas o marketing?" htmlFor="experiencia">
          <Select id="experiencia" name="experiencia" required defaultValue="">
            <option value="" disabled>
              Elige una opción
            </option>
            {EXPERIENCIA_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {modo === "selector" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="¿Quién te invitó?" htmlFor="invitador" hint="Si nadie te invitó, elige la primera opción.">
            <Select id="invitador" name="invitador" required defaultValue="">
              <option value="" disabled>
                Elige una opción
              </option>
              <option value={SIN_INVITADOR}>Nadie, lo vi en redes o publicidad</option>
              {invitadores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                  {i.ciudad ? ` · ${CIUDAD_LABEL[i.ciudad]}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="¿Cómo te enteraste del Reto?" htmlFor="como_se_entero">
            <Select id="como_se_entero" name="como_se_entero" required defaultValue="">
              <option value="" disabled>
                Elige una opción
              </option>
              {COMO_SE_ENTERO_OPCIONES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      <Field label="Platícanos por qué quieres participar en el Reto" htmlFor="motivo">
        <Textarea id="motivo" name="motivo" maxLength={2000} placeholder="Cuéntanos en pocas líneas" />
      </Field>

      {/* Campo trampa para bots: los humanos no lo ven */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="empresa">Empresa</label>
        <input id="empresa" name="empresa" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="consentimiento" required className="mt-1 size-4 accent-[var(--color-accent)]" />
        <span>
          Acepto el{" "}
          <a href={avisoUrl} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
            aviso de privacidad
          </a>{" "}
          y que el equipo del Reto me contacte por WhatsApp o correo.
        </span>
      </label>

      {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={enviando}>
        {enviando ? "Enviando…" : "Quiero participar"}
      </Button>
      <p className="text-center text-xs text-dim">Participar es gratuito. Cupo sujeto a selección.</p>
    </form>
  );
}
