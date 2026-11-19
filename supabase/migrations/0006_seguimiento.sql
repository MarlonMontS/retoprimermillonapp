-- Seguimiento de participantes del Reto: sesiones del programa, asistencia y ventas.
-- El estatus en el Reto (si comenzó o no) usa la columna leads.etapa que ya existía.

create table if not exists public.sesiones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  fecha date not null,
  hora text,
  sede public.ciudad,              -- null = aplica a todas las sedes
  orden int not null default 0
);
create index if not exists sesiones_fecha_idx on public.sesiones (fecha, orden);

create table if not exists public.asistencias (
  lead_id uuid not null references public.leads(id) on delete cascade,
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  asistio boolean not null,
  registrado_por uuid references public.perfiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (lead_id, sesion_id)
);
create index if not exists asistencias_sesion_idx on public.asistencias (sesion_id);

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('terreno', 'casa')),
  desarrollo text,
  monto numeric(14, 2) not null check (monto > 0),
  estatus text not null default 'apartado' check (estatus in ('apartado', 'cerrada', 'cancelada')),
  notas text,
  registrado_por uuid references public.perfiles(id) on delete set null
);
create index if not exists ventas_lead_idx on public.ventas (lead_id);

alter table public.sesiones enable row level security;
alter table public.asistencias enable row level security;
alter table public.ventas enable row level security;
