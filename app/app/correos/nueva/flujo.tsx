"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { accionLanzar, accionPrueba, accionProponer } from "../actions";
import { SubirLista } from "../listas/subir";
import { Alert, Button, Card, CardTitle, Field, Input, Select, Textarea } from "@/components/ui";
import { FRECUENCIAS, INTENCIONES, VARIABLES, type Intencion } from "@/lib/correos/render";
import { cn } from "@/lib/utils";

interface Paso {
  asunto: string;
  cuerpo: string;
}
interface Lista {
  id: string;
  nombre: string;
  contactos: number;
}

const ETAPAS = ["Objetivo", "Correos", "Contactos", "Lanzar"];

export function FlujoCampana({ listas: iniciales, configurado }: { listas: Lista[]; configurado: boolean }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(0);
  const [intencion, setIntencion] = useState<Intencion>("invitar_reto");
  const [instrucciones, setInstrucciones] = useState("");
  const [sede, setSede] = useState("Tijuana y Monterrey");
  const [nSeguimientos, setNSeguimientos] = useState(2);
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [frecuencia, setFrecuencia] = useState(3);
  const [soloNoAbrieron, setSoloNoAbrieron] = useState(true);
  const [listas, setListas] = useState(iniciales);
  const [listaId, setListaId] = useState(iniciales[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ ok?: string; error?: string }>({});

  const lista = listas.find((l) => l.id === listaId);

  async function proponer() {
    setOcupado(true);
    setAviso({});
    try {
      const p = await accionProponer({ intencion, instrucciones, sede, seguimientos: nSeguimientos });
      setPasos([p.inicial, ...p.seguimientos]);
      if (!nombre) setNombre(INTENCIONES[intencion].label);
      setEtapa(1);
    } catch {
      setAviso({ error: "No pude generar la propuesta. Intenta de nuevo." });
    } finally {
      setOcupado(false);
    }
  }

  const editar = (i: number, cambio: Partial<Paso>) => setPasos(pasos.map((p, j) => (j === i ? { ...p, ...cambio } : p)));

  async function prueba(i: number) {
    setOcupado(true);
    setAviso({});
    const r = await accionPrueba(pasos[i]);
    setOcupado(false);
    setAviso(r.error ? { error: r.error } : { ok: `Prueba enviada a ${r.a}.` });
  }

  async function lanzar() {
    setOcupado(true);
    setAviso({});
    const r = await accionLanzar({ nombre, intencion, lista_id: listaId, frecuencia_dias: frecuencia, solo_no_abrieron: soloNoAbrieron, consentimiento, pasos });
    if (r.error) {
      setAviso({ error: r.error });
      setOcupado(false);
      return;
    }
    router.push(`/app/correos/${r.id}`);
  }

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-2">
        {ETAPAS.map((e, i) => (
          <li key={e} className={cn("rounded-full border px-3 py-1 text-sm", i === etapa ? "border-accent bg-accent/10 text-accent" : "border-line text-muted")}>
            {i + 1}. {e}
          </li>
        ))}
      </ol>

      {etapa === 0 && (
        <Card className="space-y-4">
          <CardTitle>¿Qué quieres lograr con este correo?</CardTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(INTENCIONES) as Intencion[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setIntencion(k)}
                className={cn("rounded-xl border px-3 py-2.5 text-left", intencion === k ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-line-2")}
              >
                <span className="block text-sm font-medium">{INTENCIONES[k].label}</span>
                <span className="block text-xs text-dim">{INTENCIONES[k].descripcion}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tus contactos son de" htmlFor="sede">
              <Select id="sede" value={sede} onChange={(e) => setSede(e.target.value)}>
                <option>Tijuana y Monterrey</option>
                <option>Tijuana</option>
                <option>Monterrey</option>
                <option>En línea, de cualquier ciudad</option>
              </Select>
            </Field>
            <Field label="Correos de seguimiento" htmlFor="ns" hint="Se envían solos después del primero.">
              <Select id="ns" value={nSeguimientos} onChange={(e) => setNSeguimientos(Number(e.target.value))}>
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "Sin seguimiento" : `${n} seguimiento${n === 1 ? "" : "s"}`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={intencion === "otro" ? "Describe qué quieres lograr" : "Algo que quieras agregar (opcional)"} htmlFor="ins" hint="Por ejemplo: de dónde conoces a estos contactos o qué tono prefieres.">
            <Textarea id="ins" value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)} maxLength={1500} />
          </Field>
          {aviso.error && <Alert tone="danger">{aviso.error}</Alert>}
          <Button type="button" onClick={proponer} disabled={ocupado || (intencion === "otro" && !instrucciones.trim())}>
            {ocupado ? "Escribiendo tu propuesta…" : "Proponerme los correos"}
          </Button>
        </Card>
      )}

      {etapa === 1 && (
        <>
          <Alert tone="info">
            Edita lo que quieras. Puedes personalizar con: {VARIABLES.map((v) => `${v.clave} (${v.label.toLowerCase()})`).join(", ")}.
          </Alert>
          {pasos.map((p, i) => (
            <Card key={i} className="space-y-3">
              <CardTitle
                actions={
                  configurado ? (
                    <Button type="button" variant="ghost" size="sm" disabled={ocupado} onClick={() => prueba(i)}>
                      Enviarme una prueba
                    </Button>
                  ) : undefined
                }
              >
                {i === 0 ? "Correo inicial" : `Seguimiento ${i} · ${frecuencia * i} día${frecuencia * i === 1 ? "" : "s"} después (aprox. ${new Date(Date.now() + frecuencia * i * 86_400_000).toLocaleDateString("es-MX", { day: "numeric", month: "short" })})`}
              </CardTitle>
              <Field label="Asunto" htmlFor={`a${i}`}>
                <Input id={`a${i}`} value={p.asunto} onChange={(e) => editar(i, { asunto: e.target.value })} maxLength={150} />
              </Field>
              <Field label="Mensaje" htmlFor={`c${i}`}>
                <Textarea id={`c${i}`} value={p.cuerpo} onChange={(e) => editar(i, { cuerpo: e.target.value })} className="min-h-56" maxLength={6000} />
              </Field>
              {i > 0 && (
                <button type="button" onClick={() => setPasos(pasos.filter((_, j) => j !== i))} className="text-xs text-dim underline-offset-2 hover:text-danger hover:underline">
                  Quitar este seguimiento
                </button>
              )}
            </Card>
          ))}
          {pasos.length > 1 && (
            <Card className="space-y-3">
              <CardTitle>Secuencia de seguimiento</CardTitle>
              <Field label="Frecuencia entre correos" htmlFor="fr" hint="Los seguimientos salen una vez al día, alrededor de las 11:00 a.m. del centro.">
                <Select id="fr" value={frecuencia} onChange={(e) => setFrecuencia(Number(e.target.value))} className="max-w-xs">
                  {FRECUENCIAS.map((f) => (
                    <option key={f} value={f}>
                      Cada {f === 1 ? "día" : f === 7 ? "semana" : f === 14 ? "2 semanas" : `${f} días`}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={soloNoAbrieron} onChange={(e) => setSoloNoAbrieron(e.target.checked)} className="mt-1 accent-[var(--color-accent)]" />
                <span>
                  Enviar seguimientos solo a quienes no han abierto
                  <span className="block text-xs text-dim">La secuencia también se detiene sola si la persona se registra al Reto o se da de baja.</span>
                </span>
              </label>
            </Card>
          )}
          {aviso.error && <Alert tone="danger">{aviso.error}</Alert>}
          {aviso.ok && <Alert tone="ok">{aviso.ok}</Alert>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setEtapa(0)}>
              Atrás
            </Button>
            <Button type="button" onClick={() => { setAviso({}); setEtapa(2); }}>
              Continuar
            </Button>
          </div>
        </>
      )}

      {etapa === 2 && (
        <Card className="space-y-4">
          <CardTitle>¿A quién le escribes?</CardTitle>
          {listas.length > 0 && (
            <Field label="Lista de contactos" htmlFor="li">
              <Select id="li" value={listaId} onChange={(e) => setListaId(e.target.value)}>
                {listas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre} · {l.contactos} contactos
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <details open={listas.length === 0}>
            <summary className="cursor-pointer text-sm font-medium text-muted hover:text-fg">Subir una lista nueva</summary>
            <div className="mt-3">
              <SubirLista
                alCrear={(id, n, total) => {
                  setListas([{ id, nombre: n, contactos: total }, ...listas]);
                  setListaId(id);
                }}
              />
            </div>
          </details>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setEtapa(1)}>
              Atrás
            </Button>
            <Button type="button" disabled={!listaId} onClick={() => setEtapa(3)}>
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {etapa === 3 && (
        <Card className="space-y-4">
          <CardTitle>Revisa y lanza</CardTitle>
          <Field label="Nombre de la campaña (solo tú lo ves)" htmlFor="nom">
            <Input id="nom" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} />
          </Field>
          <ul className="space-y-1 text-sm text-muted">
            <li>Lista: <span className="text-fg">{lista?.nombre} ({lista?.contactos} contactos)</span></li>
            <li>Correos: <span className="text-fg">{pasos.length === 1 ? "1 correo sin seguimiento" : `1 inicial y ${pasos.length - 1} de seguimiento, cada ${frecuencia} día${frecuencia === 1 ? "" : "s"}`}</span></li>
          </ul>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
            <input type="checkbox" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} className="mt-1 accent-[var(--color-accent)]" />
            <span>
              Confirmo que conozco a estos contactos y que aceptaron recibir correos míos. No es una base comprada ni copiada de internet.
              <span className="block text-xs text-dim">Las listas compradas generan rebotes y quejas que pueden bloquear los correos de todo el equipo.</span>
            </span>
          </label>
          {!configurado && <Alert tone="warn">El envío de correos todavía no está activado. Avísale al administrador.</Alert>}
          {aviso.error && <Alert tone="danger">{aviso.error}</Alert>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setEtapa(2)}>
              Atrás
            </Button>
            <Button type="button" onClick={lanzar} disabled={ocupado || !consentimiento || !configurado || nombre.trim().length < 2}>
              {ocupado ? "Lanzando…" : "Lanzar campaña"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
