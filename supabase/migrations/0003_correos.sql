-- Campañas de correo: listas propias, secuencias de seguimiento, métricas y bajas.

create type public.mail_campana_estado as enum ('borrador', 'activa', 'pausada', 'terminada');
create type public.mail_envio_estado as enum ('pendiente', 'enviando', 'enviado', 'entregado', 'rebotado', 'queja', 'fallido', 'omitido');

create table public.mail_listas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);
create index mail_listas_perfil_idx on public.mail_listas (perfil_id);

create table public.mail_contactos (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.mail_listas(id) on delete cascade,
  email text not null,
  nombre text,
  apellido text,
  created_at timestamptz not null default now(),
  unique (lista_id, email)
);

create table public.mail_campanas (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  lista_id uuid references public.mail_listas(id) on delete set null,
  nombre text not null,
  intencion text not null,
  estado public.mail_campana_estado not null default 'borrador',
  frecuencia_dias int not null default 3,
  solo_no_abrieron boolean not null default false,
  consentimiento_confirmado boolean not null default false,
  lanzada_at timestamptz,
  created_at timestamptz not null default now()
);
create index mail_campanas_perfil_idx on public.mail_campanas (perfil_id, created_at desc);

create table public.mail_pasos (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.mail_campanas(id) on delete cascade,
  orden int not null,          -- 1 = correo inicial, 2 en adelante = seguimientos
  asunto text not null,
  cuerpo text not null,
  unique (campana_id, orden)
);

create table public.mail_envios (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),  -- para el enlace de baja
  campana_id uuid not null references public.mail_campanas(id) on delete cascade,
  paso_id uuid not null references public.mail_pasos(id) on delete cascade,
  contacto_id uuid references public.mail_contactos(id) on delete set null,
  email text not null,
  nombre text,
  apellido text,
  estado public.mail_envio_estado not null default 'pendiente',
  motivo text,
  programado_para timestamptz not null default now(),
  tomado_at timestamptz,
  enviado_at timestamptz,
  entregado_at timestamptz,
  abierto_at timestamptz,
  aperturas int not null default 0,
  clic_at timestamptz,
  clics int not null default 0,
  resend_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (paso_id, contacto_id)
);
create index mail_envios_cola_idx on public.mail_envios (estado, programado_para);
create index mail_envios_campana_idx on public.mail_envios (campana_id);
create index mail_envios_resend_idx on public.mail_envios (resend_id);
create index mail_envios_email_idx on public.mail_envios (email);

-- Lista global de exclusión: quien se da de baja o rebota no vuelve a recibir de nadie.
create table public.mail_bajas (
  email text primary key,
  motivo text not null,          -- baja | rebote | queja
  campana_id uuid references public.mail_campanas(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.mail_listas enable row level security;
alter table public.mail_contactos enable row level security;
alter table public.mail_campanas enable row level security;
alter table public.mail_pasos enable row level security;
alter table public.mail_envios enable row level security;
alter table public.mail_bajas enable row level security;
