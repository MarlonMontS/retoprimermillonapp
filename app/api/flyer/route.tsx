import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fuentePorSlug } from "@/lib/data/fuentes";
import { FORMATOS, SEDES, SESIONES, esFormato, esPlantilla, esSede, etiquetaSesion, sesionesVigentes, type Formato, type Plantilla, type Sede } from "@/lib/flyers";
import { appUrl, slugify } from "@/lib/utils";

/**
 * Flyer público en PNG, estilo de la campaña (negro con verde neón y foto del equipo).
 * /api/flyer?plantilla=registro|sesion&formato=vertical|cuadrado|horizontal&sede=en_linea|tijuana|monterrey&ref=slug[&sesion=2026-11-06][&descargar=1]
 * Monterrey lleva a Bernardo, Jorge y Marco; Tijuana y En línea solo a Bernardo y Marco.
 */

const NEON = "#c6ff3a";
const FONDO = "#050806";
const BLANCO = "#ffffff";
const GRIS = "#c9cfc5";

// Recortes sin fondo (PNG) a su resolución original. Nunca se dibujan más grandes que su tamaño real.
const PERSONAS = {
  bernardo: { ancho: 741, alto: 920, nombre: ["BERNARDO", "FERNÁNDEZ TANUS"] },
  marco: { ancho: 888, alto: 900, nombre: ["MARCO", "MONTIEL"] },
  jorge: { ancho: 290, alto: 403, nombre: ["JORGE", "RAMOS"] },
} as const;
type Persona = keyof typeof PERSONAS;
// Jorge viene de una foto donde su cabeza mide ~0.54 veces la de los otros dos (en píxeles).
const ESCALA_RELATIVA: Record<Persona, number> = { bernardo: 1, marco: 1, jorge: 1.84 };

const fotos = new Map<string, Promise<string>>();
function cargarFoto(nombre: Persona) {
  let f = fotos.get(nombre);
  if (!f) {
    f = readFile(join(process.cwd(), "public", "flyers", `${nombre}.png`)).then((b) => `data:image/png;base64,${b.toString("base64")}`);
    f.catch(() => fotos.delete(nombre));
    fotos.set(nombre, f);
  }
  return f;
}

type Fuente = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };
let fuentes: Promise<Fuente[]> | null = null;

async function ttf(familia: string, peso?: number): Promise<ArrayBuffer> {
  const q = peso ? `${familia}:wght@${peso}` : familia;
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${q}&display=swap`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`No se pudo cargar ${familia}`);
  return (await fetch(url)).arrayBuffer();
}

function cargarFuentes() {
  if (!fuentes) {
    fuentes = Promise.all([ttf("Anton"), ttf("Archivo+Black"), ttf("Inter", 400), ttf("Inter", 700)]).then(([anton, archivo, inter, interB]) => [
      { name: "Anton", data: anton, weight: 400, style: "normal" },
      { name: "Archivo", data: archivo, weight: 400, style: "normal" },
      { name: "Inter", data: inter, weight: 400, style: "normal" },
      { name: "Inter", data: interB, weight: 700, style: "normal" },
    ]);
    fuentes.catch(() => {
      fuentes = null;
    });
  }
  return fuentes;
}

/* ---------- Iconos (trazo neón) ---------- */
function Icono({ tipo, size }: { tipo: "calendario" | "personas" | "grafica" | "trofeo" | "camara" | "reloj"; size: number }) {
  const p = { stroke: NEON, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {tipo === "calendario" && (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" {...p} />
          <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" {...p} />
        </>
      )}
      {tipo === "personas" && (
        <>
          <circle cx="12" cy="8" r="3" {...p} />
          <circle cx="5.5" cy="10" r="2.2" {...p} />
          <circle cx="18.5" cy="10" r="2.2" {...p} />
          <path d="M6.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5M1.5 19c0-2.2 1.7-4 4-4M22.5 19c0-2.2-1.7-4-4-4" {...p} />
        </>
      )}
      {tipo === "grafica" && <path d="M3 21h18M5 21v-5h3v5M10.5 21v-8h3v8M16 21v-11h3v11M4 12l5-4 4 2 7-6M16 4h4v4" {...p} />}
      {tipo === "trofeo" && <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 21l1-4h4l1 4" {...p} />}
      {tipo === "camara" && <path d="M3 7h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM16 11l6-3v8l-6-3" {...p} />}
      {tipo === "reloj" && (
        <>
          <circle cx="12" cy="12" r="9" {...p} />
          <path d="M12 7v5l3 2" {...p} />
        </>
      )}
    </svg>
  );
}

/* ---------- Rayos de luz diagonales ---------- */
function Rayos({ ancho, alto }: { ancho: number; alto: number }) {
  const rayos = [
    { x: 0.8, y: 0.03, l: 0.22, g: 3 },
    { x: 0.86, y: 0.1, l: 0.14, g: 2 },
    { x: -0.06, y: 0.9, l: 0.22, g: 3 },
    { x: 0.84, y: 0.86, l: 0.16, g: 2 },
  ];
  return (
    <>
      {rayos.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            position: "absolute",
            left: r.x * ancho,
            top: r.y * alto,
            width: r.l * Math.max(ancho, alto),
            height: r.g,
            background: `linear-gradient(90deg, rgba(198,255,58,0) 0%, ${NEON} 50%, rgba(198,255,58,0) 100%)`,
            transform: "rotate(-38deg)",
            boxShadow: `0 0 18px ${NEON}`,
            opacity: 0.85,
          }}
        />
      ))}
    </>
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const formato: Formato = esFormato(url.searchParams.get("formato")) ? (url.searchParams.get("formato") as Formato) : "vertical";
  const plantilla: Plantilla = esPlantilla(url.searchParams.get("plantilla")) ? (url.searchParams.get("plantilla") as Plantilla) : "registro";
  const ref = url.searchParams.get("ref");
  const descargar = url.searchParams.get("descargar") === "1";
  const pedida = url.searchParams.get("sesion");
  const sesion = pedida && (SESIONES as readonly string[]).includes(pedida) ? pedida : sesionesVigentes()[0] ?? SESIONES[SESIONES.length - 1];
  const s = etiquetaSesion(sesion);

  const fuente = ref ? await fuentePorSlug(ref) : null;
  const enlace = fuente ? appUrl(`/r/${fuente.slug}`) : appUrl("/registro");
  const enlaceCorto = enlace.replace(/^https?:\/\//, "");
  const invitador = fuente?.perfil?.nombre ?? null;

  const { ancho, alto } = FORMATOS[formato];
  const V = formato === "vertical";
  const C = formato === "cuadrado";
  const esSesion = plantilla === "sesion";

  const sedeParam = url.searchParams.get("sede");
  const sede: Sede = esSede(sedeParam) ? sedeParam : fuente?.perfil?.ciudad === "monterrey" || fuente?.perfil?.ciudad === "tijuana" ? fuente.perfil.ciudad : "en_linea";
  const infoSede = SEDES[sede];
  const trio = infoSede.equipo === "trio";

  const qr = await QRCode.toDataURL(enlace, { margin: 1, width: 720, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  const personas: Persona[] = trio ? ["jorge", "bernardo", "marco"] : ["bernardo", "marco"];
  const fotosPersonas = Object.fromEntries(await Promise.all(personas.map(async (x) => [x, await cargarFoto(x)] as const))) as Record<Persona, string>;

  const franjaSede = (k: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18 * k, background: NEON, padding: `${12 * k}px ${30 * k}px`, borderRadius: 999 }}>
      <svg width={40 * k} height={40 * k} viewBox="0 0 24 24">
        <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke={FONDO} strokeWidth={2.4} strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.6" fill="none" stroke={FONDO} strokeWidth={2.4} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{ fontFamily: "Anton", fontSize: 38 * k, color: FONDO }}>{infoSede.titulo}</span>
        <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 22 * k, color: FONDO }}>{infoSede.detalle}</span>
      </div>
    </div>
  );

  /* ----- Piezas ----- */
  const etiquetaSuperior = (k: number) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * k }}>
      <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize: 22 * k, letterSpacing: 9 * k, color: BLANCO }}>
        {esSesion ? "SESIÓN INFORMATIVA GENERAL" : "PROGRAMA DE 30 DÍAS"}
      </div>
      <div style={{ display: "flex", border: `${2 * k}px solid ${NEON}`, background: FONDO, padding: `${6 * k}px ${22 * k}px`, fontFamily: "Anton", fontSize: 30 * k, color: NEON, letterSpacing: 0.5 }}>
        CONOCE TODOS LOS DETALLES DEL PROGRAMA
      </div>
    </div>
  );

  /** Personas sin fondo flotando sobre el diseño, con nombres y resplandor. h = alto visible de la zona. */
  const fotoEquipo = (w: number, h: number) => {
    // escala base: en dúo las personas son más grandes que en trío
    const base = trio ? (h * 0.9) / 920 : (h * 1.12) / 920;
    const escala = (x: Persona) => Math.min(1, base * ESCALA_RELATIVA[x]);
    const dim = (x: Persona) => ({ w: Math.round(PERSONAS[x].ancho * escala(x)), h: Math.round(PERSONAS[x].alto * escala(x)) });
    const top = Math.round(h * 0.05);
    const pos: Partial<Record<Persona, number>> = {};
    if (trio) {
      pos.bernardo = Math.round(w * 0.01);
      pos.marco = Math.round(w - dim("marco").w - w * 0.0);
      pos.jorge = Math.round(w / 2 - dim("jorge").w / 2);
    } else {
      pos.bernardo = Math.round(w * 0.03);
      pos.marco = Math.round(w - dim("marco").w - w * 0.02);
    }
    const kNombre = h / 560;
    const etiqueta = (x: Persona, lado: "left" | "right", y: number, xPos: number) => (
      <div
        key={`n-${x}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: lado === "left" ? "flex-start" : "flex-end",
          position: "absolute",
          top: y,
          [lado]: xPos,
          fontFamily: "Anton",
          fontSize: 34 * kNombre,
          lineHeight: 1.02,
          textShadow: "0 2px 10px rgba(0,0,0,0.95)",
        }}
      >
        <span style={{ color: BLANCO }}>{PERSONAS[x].nombre[0]}</span>
        <span style={{ color: NEON }}>{PERSONAS[x].nombre[1]}</span>
        <div style={{ display: "flex", width: 70 * kNombre, height: 4 * kNombre, background: NEON, marginTop: 6 * kNombre }} />
      </div>
    );
    return (
      <div style={{ display: "flex", position: "relative", width: w, height: h, overflow: "hidden" }}>
        {personas.map((x) => {
          const d = dim(x);
          const centro = (pos[x] ?? 0) + d.w * (x === "marco" ? 0.5 : x === "bernardo" ? 0.36 : 0.5);
          return (
            <div
              key={`g-${x}`}
              style={{
                display: "flex",
                position: "absolute",
                left: centro - h * 0.42,
                top: top - h * 0.12,
                width: h * 0.84,
                height: h * 0.84,
                borderRadius: h,
                background: "radial-gradient(circle, rgba(198,255,58,0.30) 0%, rgba(198,255,58,0.08) 45%, rgba(5,8,6,0) 70%)",
              }}
            />
          );
        })}
        {personas.map((x) => {
          const d = dim(x);
          const y = x === "jorge" ? top + h * 0.03 : top;
          return (
            <div key={x} style={{ display: "flex", position: "absolute", left: pos[x], top: y, width: d.w, height: d.h }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotosPersonas[x]}
                width={d.w}
                height={d.h}
                alt=""
                style={{ maskImage: `linear-gradient(180deg, rgba(0,0,0,1) 0px, rgba(0,0,0,1) ${Math.max(0, h * 0.5 - (y - top))}px, rgba(0,0,0,0) ${Math.max(1, h * 0.9 - (y - top))}px)` }}
              />
            </div>
          );
        })}
        {etiqueta("bernardo", "left", h * (trio ? 0.5 : 0.52), w * 0.02)}
        {etiqueta("marco", "right", h * (trio ? 0.5 : 0.52), w * 0.02)}
        {trio && etiqueta("jorge", "left", h * 0.36, w / 2 - dim("jorge").w * 0.62 - 150 * kNombre)}
      </div>
    );
  };

  const titulo = (k: number, alinear: "center" | "flex-start" = "center") => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: alinear }}>
      <div style={{ display: "flex", fontFamily: "Archivo", fontSize: 250 * k, color: BLANCO, lineHeight: 0.9, letterSpacing: -4 * k, textShadow: "0 6px 24px rgba(0,0,0,0.8)" }}>RETO</div>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: 142 * k, color: NEON, lineHeight: 1.05, textShadow: `0 0 30px rgba(198,255,58,0.35)` }}>TU PRIMER MILLÓN</div>
      <div style={{ display: "flex", alignItems: "center", gap: 22 * k, marginTop: 4 * k }}>
        <div style={{ display: "flex", width: 250 * k, height: 3 * k, background: NEON }} />
        <div style={{ display: "flex", fontFamily: "Inter", fontWeight: 700, fontSize: 40 * k, color: BLANCO, letterSpacing: 26 * k }}>2026</div>
        <div style={{ display: "flex", width: 250 * k, height: 3 * k, background: NEON }} />
      </div>
    </div>
  );

  const lema = (k: number) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * k }}>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: 66 * k, gap: 22 * k }}>
        <span style={{ color: BLANCO }}>APRENDE</span>
        <span style={{ color: NEON }}>•</span>
        <span style={{ color: NEON }}>VENDE</span>
        <span style={{ color: NEON }}>•</span>
        <span style={{ color: BLANCO }}>GANA</span>
      </div>
      <div style={{ display: "flex", border: `${2 * k}px solid ${NEON}`, padding: `${10 * k}px ${40 * k}px`, fontFamily: "Inter", fontSize: 28 * k, color: BLANCO }}>
        Esto no es un curso, es una&nbsp;<span style={{ color: NEON, fontWeight: 700 }}>experiencia 100% real.</span>
      </div>
    </div>
  );

  const beneficios: [Parameters<typeof Icono>[0]["tipo"], string, string][] = [
    ["calendario", "PROGRAMA", "DE 30 DÍAS"],
    ["personas", "100%", "GRATUITO"],
    ["grafica", "ATRACTIVAS", "COMISIONES"],
    ["trofeo", "$350,000", "EN PREMIOS"],
  ];
  const filaBeneficios = (k: number, columnas: 2 | 4) => (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", width: "100%", rowGap: 20 * k }}>
      {beneficios.map(([ic, a, b], i) => (
        <div
          key={a}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14 * k,
            width: columnas === 4 ? "25%" : "50%",
            justifyContent: "center",
            borderLeft: columnas === 4 && i > 0 ? `2px solid rgba(198,255,58,0.6)` : "none",
          }}
        >
          <Icono tipo={ic} size={64 * k} />
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Anton", fontSize: 30 * k, lineHeight: 1.1 }}>
            <span style={{ color: BLANCO }}>{a}</span>
            <span style={{ color: i === 1 || i === 3 ? BLANCO : NEON }}>{b}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const cajaInfo = (k: number, contenido: React.ReactNode, flex = 1) => (
    <div style={{ display: "flex", alignItems: "center", gap: 30 * k, flex, border: `${2 * k}px solid ${NEON}`, background: "rgba(5,8,6,0.85)", padding: `${18 * k}px ${20 * k}px`, borderRadius: 6 * k }}>
      {contenido}
    </div>
  );

  const datosSesion = (k: number) => (
    <div style={{ display: "flex", gap: 16 * k, width: "100%" }}>
      {cajaInfo(
        k,
        <>
          <div style={{ display: "flex", flexShrink: 0, marginRight: 18 * k, width: 76 * k, height: 76 * k, borderRadius: 38 * k, border: `${3 * k}px solid ${NEON}`, alignItems: "center", justifyContent: "center" }}>
            <Icono tipo="camara" size={42 * k} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Anton", lineHeight: 1 }}>
            <span style={{ color: BLANCO, fontSize: 30 * k }}>VÍA</span>
            <span style={{ color: NEON, fontSize: 52 * k }}>ZOOM</span>
          </div>
        </>,
        0.9
      )}
      {cajaInfo(
        k,
        <>
          <div style={{ display: "flex", flexShrink: 0, marginRight: 18 * k, width: 76 * k, height: 76 * k, borderRadius: 38 * k, border: `${3 * k}px solid ${NEON}`, alignItems: "center", justifyContent: "center" }}>
            <Icono tipo="calendario" size={42 * k} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Anton", lineHeight: 1.02 }}>
            <span style={{ color: BLANCO, fontSize: 28 * k }}>{s.dia.toUpperCase()}</span>
            <span style={{ color: NEON, fontSize: 40 * k }}>{s.fecha.toUpperCase()}</span>
          </div>
        </>,
        1.1
      )}
      {cajaInfo(
        k,
        <>
          <div style={{ display: "flex", flexShrink: 0, marginRight: 18 * k, width: 76 * k, height: 76 * k, borderRadius: 38 * k, border: `${3 * k}px solid ${NEON}`, alignItems: "center", justifyContent: "center" }}>
            <Icono tipo="reloj" size={42 * k} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Inter", fontSize: 28 * k, lineHeight: 1.3, color: BLANCO }}>
            <span><b style={{ color: NEON }}>7:00 p.m.</b>&nbsp;Tijuana</span>
            <span><b style={{ color: NEON }}>8:00 p.m.</b>&nbsp;Centro</span>
          </div>
        </>,
        1.1
      )}
    </div>
  );

  const bloqueQr = (k: number, lado: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 36 * k }}>
      <div style={{ display: "flex", padding: 14 * k, background: BLANCO, borderRadius: 18 * k, boxShadow: `0 0 ${36 * k}px rgba(198,255,58,0.7)`, border: `${4 * k}px solid ${NEON}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} width={lado} height={lado} alt="" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * k }}>
        <div style={{ display: "flex", fontFamily: "Archivo", fontSize: 64 * k, color: BLANCO, lineHeight: 1 }}>REGÍSTRATE</div>
        <div style={{ display: "flex", fontFamily: "Archivo", fontSize: 92 * k, color: NEON, lineHeight: 1 }}>AHORA</div>
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: 30 * k, color: BLANCO, marginTop: 6 * k }}>ESCANEA EL CÓDIGO QR</div>
        {invitador ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 10 * k }}>
            <span style={{ fontFamily: "Inter", fontSize: 24 * k, color: GRIS }}>Te invita</span>
            <span style={{ fontFamily: "Anton", fontSize: 40 * k, color: NEON, lineHeight: 1.1 }}>{invitador.toUpperCase()}</span>
          </div>
        ) : null}
        <div style={{ display: "flex", fontFamily: "Inter", fontSize: 22 * k, color: GRIS, marginTop: 4 * k }}>{enlaceCorto}</div>
      </div>
    </div>
  );

  /* ----- Composición por formato ----- */
  let contenido: React.ReactNode;
  if (V) {
    contenido = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "100%", paddingTop: 56, paddingBottom: 70 }}>
        {etiquetaSuperior(1)}
        <div style={{ display: "flex", marginTop: 16 }}>{fotoEquipo(1080, 500)}</div>
        <div style={{ display: "flex", marginTop: -120 }}>{titulo(1)}</div>
        <div style={{ display: "flex", marginTop: 22 }}>{lema(1)}</div>
        <div style={{ display: "flex", marginTop: 24 }}>{franjaSede(1)}</div>
        <div style={{ display: "flex", width: 1000, marginTop: 28 }}>{filaBeneficios(1, 4)}</div>
        {esSesion && <div style={{ display: "flex", width: 1000, marginTop: 24 }}>{datosSesion(0.95)}</div>}
        <div style={{ display: "flex", flex: 1 }} />
        {bloqueQr(esSesion ? 0.86 : 1.02, esSesion ? 250 : 300)}
        <div style={{ display: "flex", flex: 1 }} />
      </div>
    );
  } else if (C) {
    contenido = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", height: "100%", paddingTop: 0, paddingBottom: 40 }}>
        <div style={{ display: "flex" }}>{fotoEquipo(1080, 430)}</div>
        <div style={{ display: "flex", marginTop: -95 }}>{titulo(0.62)}</div>
        <div style={{ display: "flex", marginTop: 16 }}>{franjaSede(0.66)}</div>
        <div style={{ display: "flex", width: 1000, marginTop: 18 }}>{esSesion ? datosSesion(0.72) : filaBeneficios(0.75, 4)}</div>
        <div style={{ display: "flex", flex: 1 }} />
        {bloqueQr(0.6, 185)}
        <div style={{ display: "flex", flex: 1 }} />
      </div>
    );
  } else {
    contenido = (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 1020, paddingTop: 50 }}>
          {etiquetaSuperior(0.85)}
          <div style={{ display: "flex", marginTop: 16 }}>{fotoEquipo(1020, 420)}</div>
          <div style={{ display: "flex", marginTop: -90 }}>{titulo(0.86)}</div>
          <div style={{ display: "flex", marginTop: 20 }}>{lema(0.8)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 32, flex: 1, paddingRight: 70, paddingLeft: 20 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>{franjaSede(0.9)}</div>
          <div style={{ display: "flex" }}>{filaBeneficios(0.95, 2)}</div>
          {esSesion && <div style={{ display: "flex" }}>{datosSesion(0.72)}</div>}
          <div style={{ display: "flex", justifyContent: "center" }}>{bloqueQr(esSesion ? 0.78 : 0.9, esSesion ? 230 : 280)}</div>
        </div>
      </div>
    );
  }

  const imagen = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          background: `radial-gradient(ellipse at 50% 30%, #17300a 0%, ${FONDO} 55%), ${FONDO}`,
          fontFamily: "Inter",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: "100%", height: "100%", background: `radial-gradient(circle at 0% 100%, rgba(198,255,58,0.18) 0%, rgba(5,8,6,0) 35%), radial-gradient(circle at 100% 0%, rgba(198,255,58,0.15) 0%, rgba(5,8,6,0) 30%)` }} />
        <Rayos ancho={ancho} alto={alto} />
        {contenido}
      </div>
    ),
    { width: ancho, height: alto, fonts: await cargarFuentes() }
  );

  const headers = new Headers(imagen.headers);
  headers.set("cache-control", "public, max-age=600, s-maxage=3600");
  if (descargar) {
    const nombre = `reto-tu-primer-millon-${plantilla}-${sede}${esSesion ? `-${sesion}` : ""}-${formato}${fuente ? `-${slugify(fuente.slug)}` : ""}.png`;
    headers.set("content-disposition", `attachment; filename="${nombre}"`);
  }
  return new Response(imagen.body, { status: 200, headers });
}
