import { cn } from "@/lib/utils";
import type { Fila } from "@/lib/metrics";
import { ESTATUS_TONE } from "@/components/ui";
import type { LeadEstatus } from "@/lib/types";

/** Barras por día: una sola serie, un solo tono, etiquetas solo en el máximo y el último día. */
export function BarrasPorDia({ datos }: { datos: { dia: string; etiqueta: string; n: number }[] }) {
  const W = 600, H = 150, padX = 8, padTop = 22, padBottom = 26;
  const max = Math.max(1, ...datos.map((d) => d.n));
  const n = datos.length;
  const gap = 6;
  const bw = (W - padX * 2 - gap * (n - 1)) / n;
  const altoUtil = H - padTop - padBottom;
  const iMax = datos.reduce((best, d, i) => (d.n > datos[best].n ? i : best), 0);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Registros por día">
        <line x1={padX} x2={W - padX} y1={H - padBottom + 0.5} y2={H - padBottom + 0.5} stroke="var(--color-line-2)" />
        {datos.map((d, i) => {
          const h = d.n === 0 ? 2 : Math.max(4, (d.n / max) * altoUtil);
          const x = padX + i * (bw + gap);
          const y = H - padBottom - h;
          const etiquetar = d.n > 0 && (i === iMax || i === n - 1);
          return (
            <g key={d.dia}>
              <title>{`${d.etiqueta}: ${d.n} registro${d.n === 1 ? "" : "s"}`}</title>
              <rect x={x} y={y} width={bw} height={h} rx={3} fill={d.n === 0 ? "var(--color-line-2)" : "var(--color-accent)"} opacity={d.n === 0 ? 0.6 : 0.9} />
              {etiquetar && (
                <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="var(--color-fg)" className="tabular-nums">
                  {d.n}
                </text>
              )}
              {(i % 2 === n % 2 || n <= 8) && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-dim)">
                  {d.etiqueta.replace(".", "")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Lista de barras horizontales en un solo tono; el nombre de la fila carga la identidad. */
export function BarrasHorizontales({
  filas,
  porEstatus = false,
  vacio = "Sin datos todavía",
}: {
  filas: Fila[];
  porEstatus?: boolean;
  vacio?: string;
}) {
  const total = filas.reduce((s, f) => s + f.n, 0);
  if (total === 0) return <p className="text-sm text-dim">{vacio}</p>;
  const max = Math.max(...filas.map((f) => f.n));
  return (
    <ul className="space-y-2.5">
      {filas.map((f) => {
        const tone = porEstatus ? ESTATUS_TONE[f.clave as LeadEstatus] : "accent";
        const color = {
          accent: "bg-accent",
          info: "bg-info",
          warn: "bg-warn",
          danger: "bg-danger",
          violet: "bg-violet",
          dim: "bg-dim",
          neutral: "bg-muted",
        }[tone];
        return (
          <li key={f.clave} title={`${f.label}: ${f.n} (${Math.round((f.n / total) * 100)}%)`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-muted">{f.label}</span>
              <span className="tabular-nums">
                {f.n} <span className="text-xs text-dim">· {Math.round((f.n / total) * 100)}%</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-3">
              <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(2, (f.n / max) * 100)}%`, opacity: 0.9 }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
