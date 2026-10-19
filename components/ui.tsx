import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { ESTATUS_LABEL, type LeadEstatus } from "@/lib/types";

/* ---------- Botones ---------- */

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const btnVariants = {
  primary: "bg-accent text-on-accent hover:bg-accent-2",
  secondary: "border border-line bg-surface-2 text-fg hover:border-line-2 hover:bg-surface-3",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
} as const;
const btnSizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
} as const;

type BtnVariant = keyof typeof btnVariants;
type BtnSize = keyof typeof btnSizes;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return <button className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: BtnVariant;
  size?: BtnSize;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <Link href={href} className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}

/* ---------- Campos ---------- */

export const inputClass =
  "w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[15px] text-fg placeholder:text-dim focus:border-accent focus:outline-none disabled:opacity-60";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, "appearance-none bg-no-repeat pr-9", className)} style={selectArrow} {...props}>
      {children}
    </select>
  );
}

const selectArrow = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23abb5ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
  backgroundPosition: "right 0.75rem center",
};

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-24 resize-y", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-dim">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/* ---------- Contenedores ---------- */

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, actions }: { children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {actions}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "ok" | "warn" | "danger";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-info/30 bg-info/10 text-fg",
    ok: "border-accent/30 bg-accent/10 text-fg",
    warn: "border-warn/30 bg-warn/10 text-fg",
    danger: "border-danger/30 bg-danger/10 text-fg",
  };
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>{children}</div>;
}

export function Empty({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  );
}

/* ---------- Etiquetas ---------- */

type Tone = "neutral" | "accent" | "warn" | "danger" | "info" | "violet" | "dim";
const badgeTones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-fg border-line-2",
  accent: "bg-accent/15 text-accent border-accent/30",
  warn: "bg-warn/15 text-warn border-warn/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  info: "bg-info/15 text-info border-info/30",
  violet: "bg-violet/15 text-violet border-violet/30",
  dim: "bg-surface-2 text-muted border-line",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export const ESTATUS_TONE: Record<LeadEstatus, Tone> = {
  nuevo: "info",
  en_contacto: "warn",
  no_contesta: "dim",
  calificado: "accent",
  no_calificado: "danger",
  duplicado: "violet",
  descartado: "dim",
};

export function EstatusBadge({ estatus }: { estatus: LeadEstatus }) {
  return <Badge tone={ESTATUS_TONE[estatus]}>{ESTATUS_LABEL[estatus]}</Badge>;
}

/* ---------- Tablas ---------- */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn("whitespace-nowrap bg-surface-2 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted first:pl-4 last:pr-4", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("border-t border-line px-3 py-2.5 align-middle first:pl-4 last:pr-4", className)}>
      {children}
    </td>
  );
}

/* ---------- Métricas ---------- */

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums tracking-tight", tone === "accent" && "text-accent")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-dim">{hint}</p>}
    </div>
  );
}

export function Progress({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-accent" : "bg-accent/70")} style={{ width: `${pct}%` }} />
    </div>
  );
}
