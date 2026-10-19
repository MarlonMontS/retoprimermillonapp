"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { accionImportarLeads } from "./actions";
import { Alert, Button, Field, Select, Table, Td, Th } from "@/components/ui";
import { normalizarWhatsapp } from "@/lib/phone";
import { detectarCiudad } from "@/lib/utils";
import { CIUDAD_LABEL } from "@/lib/types";

type Campo = "nombre" | "apellido" | "whatsapp" | "email" | "ciudad" | "experiencia" | "motivo" | "como_se_entero" | "created_at" | "external_id";

const CAMPOS: { key: Campo; label: string; requerido?: boolean; patron: RegExp }[] = [
  { key: "nombre", label: "Nombre", requerido: true, patron: /first\s*name|primer\s*nombre|^nombre/i },
  { key: "apellido", label: "Apellido", patron: /last\s*name|apellido/i },
  { key: "whatsapp", label: "WhatsApp / teléfono", requerido: true, patron: /whats|phone|tel[eé]fono|celular|m[oó]vil/i },
  { key: "email", label: "Correo", patron: /e-?mail|correo/i },
  { key: "ciudad", label: "Ciudad", patron: /ciudad|city/i },
  { key: "experiencia", label: "Experiencia", patron: /experiencia|experience/i },
  { key: "motivo", label: "Por qué quiere participar", patron: /por\s*qu[eé]|motivo|plat[ií]canos|message|mensaje/i },
  { key: "como_se_entero", label: "Cómo se enteró", patron: /enteraste|enter[oó]|source|fuente|c[oó]mo/i },
  { key: "created_at", label: "Fecha de registro", patron: /created|creado|fecha|date\s*added/i },
  { key: "external_id", label: "ID del contacto (GHL)", patron: /contact\s*id|^id$/i },
];

function parseFecha(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function Importador({ lideres }: { lideres: { id: string; nombre: string; detalle?: string }[] }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapa, setMapa] = useState<Partial<Record<Campo, string>>>({});
  const [liderId, setLiderId] = useState<string>("");
  const [omitir, setOmitir] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ insertados: number; omitidos: number; errores: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResultado(null);
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = (res.meta.fields ?? []).filter(Boolean);
        setHeaders(hs);
        setRows(res.data);
        const m: Partial<Record<Campo, string>> = {};
        for (const c of CAMPOS) {
          const h = hs.find((h) => c.patron.test(h));
          if (h && !Object.values(m).includes(h)) m[c.key] = h;
        }
        setMapa(m);
      },
      error: (err) => setError(`No pude leer el archivo: ${err.message}`),
    });
  }

  const filas = useMemo(() => {
    return rows.map((r) => {
      const g = (k: Campo) => (mapa[k] ? (r[mapa[k]!] ?? "").toString().trim() : "");
      const whatsapp = normalizarWhatsapp(g("whatsapp"));
      return {
        nombre: g("nombre"),
        apellido: g("apellido") || null,
        whatsapp,
        email: g("email") || null,
        ciudad: detectarCiudad(g("ciudad")),
        experiencia: g("experiencia") || null,
        motivo: g("motivo") || null,
        como_se_entero: g("como_se_entero") || null,
        created_at: parseFecha(g("created_at")),
        external_id: g("external_id") || null,
      };
    });
  }, [rows, mapa]);

  const validas = filas.filter((f) => f.nombre && f.whatsapp);
  const invalidas = filas.length - validas.length;

  async function importar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await accionImportarLeads({
        filas: validas.map((f) => ({ ...f, whatsapp: f.whatsapp! })),
        lider_id: liderId || null,
        omitirWhatsappExistente: omitir,
      });
      if ("error" in res && res.error) setError(res.error);
      else setResultado(res as { insertados: number; omitidos: number; errores: string[] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Field label="Archivo CSV exportado de GoHighLevel (Contactos → Exportar)" htmlFor="archivo">
        <input id="archivo" type="file" accept=".csv,text/csv" onChange={onFile} className="block w-full text-sm text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-on-accent" />
      </Field>

      {headers.length > 0 && (
        <>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Columnas</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS.map((c) => (
                <Field key={c.key} label={`${c.label}${c.requerido ? " *" : ""}`} htmlFor={`m_${c.key}`}>
                  <Select id={`m_${c.key}`} value={mapa[c.key] ?? ""} onChange={(e) => setMapa({ ...mapa, [c.key]: e.target.value || undefined })}>
                    <option value="">— no importar —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Responsable de estos leads" htmlFor="lider" hint="Si vienen de distintos líderes, impórtalos sin responsable y corrige la atribución desde cada lead, o haz un CSV por líder.">
              <Select id="lider" value={liderId} onChange={(e) => setLiderId(e.target.value)}>
                <option value="">Sin responsable (bolsa común, sin repartir)</option>
                {lideres.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                    {l.detalle ? ` · ${l.detalle}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-start gap-3 self-end rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
              <input type="checkbox" checked={omitir} onChange={(e) => setOmitir(e.target.checked)} className="mt-0.5 accent-[var(--color-accent)]" />
              <span>
                Omitir los WhatsApp que ya existen
                <span className="block text-xs text-dim">Recomendado para no duplicar registros al reimportar.</span>
              </span>
            </label>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Vista previa · {validas.length} filas listas{invalidas > 0 && <span className="text-warn"> · {invalidas} sin nombre o WhatsApp válido se omitirán</span>}
            </h3>
            <Table>
              <thead>
                <tr>
                  <Th>Nombre</Th>
                  <Th>WhatsApp</Th>
                  <Th>Correo</Th>
                  <Th>Ciudad</Th>
                  <Th>Cómo se enteró</Th>
                  <Th>Fecha</Th>
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 8).map((f, i) => (
                  <tr key={i} className={!f.whatsapp || !f.nombre ? "opacity-50" : undefined}>
                    <Td>{[f.nombre, f.apellido].filter(Boolean).join(" ") || <span className="text-danger">sin nombre</span>}</Td>
                    <Td className="tabular-nums">{f.whatsapp ?? <span className="text-danger">inválido</span>}</Td>
                    <Td className="text-muted">{f.email ?? "—"}</Td>
                    <Td className="text-muted">{f.ciudad ? CIUDAD_LABEL[f.ciudad] : "—"}</Td>
                    <Td className="max-w-48 truncate text-muted">{f.como_se_entero ?? "—"}</Td>
                    <Td className="text-muted">{f.created_at ? f.created_at.slice(0, 10) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}
          {resultado && (
            <Alert tone="ok">
              <p className="font-medium">
                Importados: {resultado.insertados} · Omitidos: {resultado.omitidos}
              </p>
              {resultado.errores.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {resultado.errores.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}

          <Button type="button" onClick={importar} disabled={enviando || validas.length === 0 || !!resultado}>
            {enviando ? "Importando…" : `Importar ${validas.length} leads`}
          </Button>
        </>
      )}
    </div>
  );
}
