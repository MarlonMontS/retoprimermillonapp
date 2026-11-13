-- Registros a la conferencia de apertura en Monterrey.
-- Tabla aparte a propósito: estas personas NO son participantes del Reto,
-- no entran a leads, ni a la ruleta, ni a cuotas, ni a correos del Reto.
create table if not exists public.conferencia_registros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  evento text not null default 'apertura_mty_2026',
  nombre text not null,
  email text not null,          -- siempre en minúsculas
  whatsapp text not null,       -- E.164
  utm jsonb,
  pagina text,
  unique (evento, email)
);
create index if not exists conferencia_registros_created_idx on public.conferencia_registros (created_at desc);
alter table public.conferencia_registros enable row level security;
