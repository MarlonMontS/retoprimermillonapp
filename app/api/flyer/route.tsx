import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { fuentePorSlug } from "@/lib/data/fuentes";
import { FORMATOS, esFormato, esPlantilla, type Formato, type Plantilla } from "@/lib/flyers";
import { appUrl, slugify } from "@/lib/utils";
import type { Ciudad } from "@/lib/types";

/**
 * Flyer público en PNG.
 * /api/flyer?plantilla=invitacion&formato=vertical&ref=maria-medina[&descargar=1]
 * Sin ref usa el formulario general.
 */

const VERDE = "#b9f65a";
const FONDO = "#090b0a";
const PANEL = "#151a17";
const TEXTO = "#f4f5f0";
const SUAVE = "#abb5ad";

let fuentes: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }[]> | null = null;

async function cargarFuente(peso: 400 | 800): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${peso}&display=swap`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error("No se pudo cargar la fuente");
  return (await fetch(url)).arrayBuffer();
}

function cargarFuentes() {
  if (!fuentes) {
    fuentes = Promise.all([cargarFuente(400), cargarFuente(800)]).then(([regular, negrita]) => [
      { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: negrita, weight: 800 as const, style: "normal" as const },
    ]);
    fuentes.catch(() => {
      fuentes = null;
    });
  }
  return fuentes;
}

const FECHAS: Record<"tijuana" | "monterrey", string> = {
  tijuana: "Tijuana · 13 nov al 15 dic 2026",
  monterrey: "Monterrey · 14 nov al 17 dic 2026",
};

function fechasPara(ciudad: Ciudad | null): string[] {
  if (ciudad === "tijuana" || ciudad === "monterrey") return [FECHAS[ciudad]];
  return [FECHAS.tijuana, FECHAS.monterrey];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const formato: Formato = esFormato(url.searchParams.get("formato")) ? (url.searchParams.get("formato") as Formato) : "vertical";
  const plantilla: Plantilla = esPlantilla(url.searchParams.get("plantilla")) ? (url.searchParams.get("plantilla") as Plantilla) : "invitacion";
  const ref = url.searchParams.get("ref");
  const descargar = url.searchParams.get("descargar") === "1";

  const fuente = ref ? await fuentePorSlug(ref) : null;
  const enlace = fuente ? appUrl(`/r/${fuente.slug}`) : appUrl("/registro");
  const enlaceCorto = enlace.replace(/^https?:\/\//, "");
  const invitador = fuente?.perfil?.nombre ?? null;
  const ciudad = fuente?.perfil?.ciudad ?? null;

  const { ancho, alto } = FORMATOS[formato];
  const horizontal = formato === "horizontal";
  const vertical = formato === "vertical";
  const escala = ancho / 1080;

  const qr = await QRCode.toDataURL(enlace, {
    margin: 1,
    width: 640,
    errorCorrectionLevel: "M",
    color: { dark: FONDO, light: "#ffffff" },
  });

  const cuadrado = formato === "cuadrado";
  const t = (n: number) => Math.round(n * (horizontal ? 0.92 : cuadrado ? 0.76 : escala));

  const encabezado = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: t(28), letterSpacing: t(8), color: VERDE, fontWeight: 800 }}>
        RETO PRIMER MILLÓN · 2026
      </div>
      <div style={{ display: "flex", fontSize: t(30), color: SUAVE, marginTop: t(10) }}>Aprende. Ejecuta. Vende. Gana.</div>
    </div>
  );

  let titulo: string;
  let cuerpo: React.ReactNode;

  if (plantilla === "premios") {
    titulo = "$350,000 MXN en premios";
    const filas: [string, string][] = [
      ["1er lugar", "$150,000"],
      ["2do lugar", "$100,000"],
      ["3er lugar", "$50,000"],
      ["Top Producer", "$50,000"],
    ];
    cuerpo = (
      <div style={{ display: "flex", flexDirection: "column", gap: t(14) }}>
        {filas.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: PANEL, borderRadius: t(18), padding: `${t(18)}px ${t(28)}px` }}>
            <div style={{ display: "flex", fontSize: t(34), color: TEXTO }}>{k}</div>
            <div style={{ display: "flex", fontSize: t(40), color: VERDE, fontWeight: 800 }}>{v}</div>
          </div>
        ))}
        {!cuadrado && <div style={{ display: "flex", fontSize: t(28), color: SUAVE, marginTop: t(6), lineHeight: 1.35 }}>
          Cada millón de pesos en producción válida te da un folio para el sorteo final.
        </div>}
      </div>
    );
  } else if (plantilla === "aprende") {
    titulo = "Aprende a vender de verdad";
    const temas = ["Ventas y prospección", "Marketing y redes sociales", "Inteligencia artificial", "Negociación y cierres", "Marca personal", "Bienes raíces con Ciudad Maderas"];
    cuerpo = (
      <div style={{ display: "flex", flexDirection: "column", gap: t(12) }}>
        {temas.map((x) => (
          <div key={x} style={{ display: "flex", alignItems: "center", gap: t(18) }}>
            <div style={{ display: "flex", width: t(16), height: t(16), borderRadius: t(8), background: VERDE }} />
            <div style={{ display: "flex", fontSize: t(36), color: TEXTO }}>{x}</div>
          </div>
        ))}
        {!cuadrado && <div style={{ display: "flex", fontSize: t(28), color: SUAVE, marginTop: t(10), lineHeight: 1.35 }}>
          30 días con capacitación, mentoría y un microequipo que te acompaña.
        </div>}
      </div>
    );
  } else {
    titulo = "¿Aceptas el reto?";
    cuerpo = (
      <div style={{ display: "flex", flexDirection: "column", gap: t(16) }}>
        <div style={{ display: "flex", fontSize: t(38), color: TEXTO, lineHeight: 1.3 }}>
          30 días para aprender ventas, marketing, negociación y bienes raíces con acompañamiento real.
        </div>
        <div style={{ display: "flex", fontSize: t(34), color: VERDE, fontWeight: 800 }}>Meta: tu primer millón en ventas</div>
        <div style={{ display: "flex", flexDirection: "column", gap: t(6), marginTop: t(6) }}>
          {fechasPara(ciudad).map((f) => (
            <div key={f} style={{ display: "flex", fontSize: t(30), color: SUAVE }}>{f}</div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: t(30), color: TEXTO }}>Gratis · $350,000 MXN en premios · Cupo sujeto a selección</div>
      </div>
    );
  }

  const tituloEl = (
    <div style={{ display: "flex", fontSize: t(horizontal ? 84 : vertical ? 104 : 96), fontWeight: 800, color: TEXTO, lineHeight: 1.02, letterSpacing: -t(2) }}>
      {titulo}
    </div>
  );

  const ladoQr = horizontal ? 360 : vertical ? 380 : 300;
  const bloqueQr = (
    <div style={{ display: "flex", alignItems: "center", gap: t(28), background: PANEL, borderRadius: t(28), padding: t(26), border: `${t(3)}px solid ${VERDE}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={t(ladoQr)} height={t(ladoQr)} style={{ borderRadius: t(14) }} alt="" />
      <div style={{ display: "flex", flexDirection: "column", gap: t(10), flex: 1 }}>
        {invitador && <div style={{ display: "flex", fontSize: t(26), color: SUAVE }}>Te invita</div>}
        {invitador && <div style={{ display: "flex", fontSize: t(40), color: TEXTO, fontWeight: 800, lineHeight: 1.1 }}>{invitador}</div>}
        <div style={{ display: "flex", fontSize: t(30), color: VERDE, fontWeight: 800, marginTop: t(6) }}>Escanea y regístrate</div>
        <div style={{ display: "flex", fontSize: t(22), color: SUAVE }}>{enlaceCorto}</div>
      </div>
    </div>
  );

  const contenido = horizontal ? (
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 90, gap: 80 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1.2 }}>
        {encabezado}
        {tituloEl}
        {cuerpo}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>{bloqueQr}</div>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: vertical ? t(90) : 64, gap: cuadrado ? 18 : 0 }}>
      {encabezado}
      {tituloEl}
      {cuerpo}
      {bloqueQr}
    </div>
  );

  const imagen = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `radial-gradient(circle at 85% 10%, #22300f 0%, ${FONDO} 55%)`,
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: t(18), height: "100%", background: VERDE }} />
        {contenido}
      </div>
    ),
    { width: ancho, height: alto, fonts: await cargarFuentes() }
  );

  const headers = new Headers(imagen.headers);
  headers.set("cache-control", "public, max-age=600, s-maxage=3600");
  if (descargar) {
    const nombre = `reto-primer-millon-${plantilla}-${formato}${fuente ? `-${slugify(fuente.slug)}` : ""}.png`;
    headers.set("content-disposition", `attachment; filename="${nombre}"`);
  }
  return new Response(imagen.body, { status: 200, headers });
}
