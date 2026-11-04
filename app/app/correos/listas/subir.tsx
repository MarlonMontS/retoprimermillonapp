"use client";

import { useState } from "react";
import Papa from "papaparse";
import { accionCrearLista } from "../actions";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { esEmail } from "@/lib/correos/render";

type Campo = "email" | "nombre" | "apellido";
const PATRONES: Record<Campo, RegExp> = {
  email: /e-?mail|correo/i,
  nombre: /first\s*name|^nombre|nombre completo|^name/i,
  apellido: /last\s*name|apellido/i,
};

export function SubirLista({ alCrear }: { alCrear?: (id: string, nombre: string, total: number) => void }) {
  const [nombre, setNombre] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [filas, setFilas] = useState<Record<string, string>[]>([]);
  const [mapa, setMapa] = useState<Partial<Record<Campo, string>>>({});
  const [estado, setEstado] = useState<{ ok?: string; error?: string }>({});
  const [enviando, setEnviando] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEstado({});
    if (!nombre) setNombre(file.name.replace(/\.[^.]+$/, ""));
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => {
        const hs = (r.meta.fields ?? []).filter(Boolean);
        const m: Partial<Record<Campo, string>> = {};
        for (const c of Object.keys(PATRONES) as Campo[]) m[c] = hs.find((h) => PATRONES[c].test(h));
        setHeaders(hs);
        setFilas(r.data);
        setMapa(m);
      },
      error: (err) => setEstado({ error: `No pude leer el archivo: ${err.message}` }),
    });
  }

  const contactos = filas.map((f) => ({
    email: (mapa.email ? f[mapa.email] : "")?.trim() ?? "",
    nombre: (mapa.nombre ? f[mapa.nombre] : "")?.trim() || null,
    apellido: (mapa.apellido ? f[mapa.apellido] : "")?.trim() || null,
  }));
  const validos = contactos.filter((c) => esEmail(c.email));

  async function guardar() {
    setEnviando(true);
    setEstado({});
    const r = await accionCrearLista({ nombre, contactos: validos });
    setEnviando(false);
    if (r.error) return setEstado({ error: r.error });
    setEstado({ ok: `Lista guardada con ${r.total} contactos.` });
    setHeaders([]);
    setFilas([]);
    alCrear?.(r.id!, nombre, r.total!);
  }

  return (
    <div className="space-y-4">
      <Field label="Archivo CSV con tus contactos" htmlFor="csv" hint="Exporta tu Excel o Google Sheets como CSV. Debe traer una columna de correo; nombre y apellido son para personalizar.">
        <input id="csv" type="file" accept=".csv,text/csv" onChange={onFile} className="block w-full text-sm text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-on-accent" />
      </Field>
      {headers.length > 0 && (
        <>
          <Field label="Nombre de la lista" htmlFor="nl">
            <Input id="nl" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["email", "nombre", "apellido"] as Campo[]).map((c) => (
              <Field key={c} label={c === "email" ? "Columna de correo *" : `Columna de ${c}`} htmlFor={`c-${c}`}>
                <Select id={`c-${c}`} value={mapa[c] ?? ""} onChange={(e) => setMapa({ ...mapa, [c]: e.target.value || undefined })}>
                  <option value="">—</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
          <p className="text-sm text-muted">
            {validos.length} correos válidos de {contactos.length} filas.
          </p>
          <Button type="button" disabled={enviando || !validos.length} onClick={guardar}>
            {enviando ? "Guardando…" : `Guardar ${validos.length} contactos`}
          </Button>
        </>
      )}
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      {estado.ok && <Alert tone="ok">{estado.ok}</Alert>}
    </div>
  );
}
