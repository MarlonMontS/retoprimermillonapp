-- Reto Primer Millón · esquema inicial
-- Se ejecuta en el SQL Editor de Supabase o con `npm run db:migrate`.

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type public.rol as enum ('admin', 'gerente', 'lider');
create type public.ciudad as enum ('tijuana', 'monterrey', 'en_linea');
create type public.lead_estatus as enum (
  'nuevo', 'en_contacto', 'no_contesta', 'calificado', 'no_calificado', 'duplicado', 'descartado'
);
create type public.fuente_tipo as enum (
  'lider', 'gerente', 'colaboracion', 'publicidad', 'contenido', 'organico', 'otro'
);
-- Etapas del participante después de calificar (capacidad para la versión 2)
create type public.etapa as enum (
  'inscrito', 'dia_cero', 'activo', 'con_citas', 'con_venta', 'meta_cumplida', 'baja'
);

-- ---------- Perfiles (1:1 con auth.users) ----------
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null unique,
  telefono text,
  rol public.rol not null default 'lider',
  gerente_id uuid references public.perfiles(id) on delete set null,
  ciudad public.ciudad,
  slug text unique,
  activo boolean not null default true,
  -- null = automático según cuota; true = bolsa forzada abierta; false = forzada cerrada
  bolsa_manual boolean,
  created_at timestamptz not null default now()
);
create index perfiles_gerente_idx on public.perfiles (gerente_id);
create index perfiles_rol_idx on public.perfiles (rol);

-- ---------- Fuentes (enlaces de invitación y campañas) ----------
create table public.fuentes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  tipo public.fuente_tipo not null,
  perfil_id uuid unique references public.perfiles(id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Leads ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  apellido text,
  whatsapp text not null,                 -- E.164, ej. +526641234567
  email text,
  ciudad public.ciudad,
  experiencia text,
  motivo text,
  como_se_entero text,
  fuente_id uuid references public.fuentes(id) on delete set null,
  lider_id uuid references public.perfiles(id) on delete set null,   -- responsable (líder o gerente)
  desde_bolsa boolean not null default false,                          -- llegó por ruleta de la bolsa
  asignado_at timestamptz,
  estatus public.lead_estatus not null default 'nuevo',
  intentos int not null default 0,
  ultimo_contacto_at timestamptz,
  calificado_at timestamptz,
  calificado_por uuid references public.perfiles(id) on delete set null,
  respuestas_filtro jsonb,
  notas text,
  duplicado_de uuid references public.leads(id) on delete set null,
  etapa public.etapa,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  origen_registro text not null default 'form',   -- link | selector | import | manual
  external_id text,                               -- id del contacto en GoHighLevel (migración)
  consentimiento boolean not null default false
);
create index leads_whatsapp_idx on public.leads (whatsapp);
create index leads_lider_idx on public.leads (lider_id);
create index leads_estatus_idx on public.leads (estatus);
create index leads_created_idx on public.leads (created_at desc);
create unique index leads_external_id_idx on public.leads (external_id) where external_id is not null;

-- ---------- Bitácora ----------
create table public.lead_eventos (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_id uuid references public.perfiles(id) on delete set null,
  tipo text not null,
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index lead_eventos_lead_idx on public.lead_eventos (lead_id, created_at desc);

-- ---------- Configuración ----------
create table public.config (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.config (clave, valor) values
  ('cuota_minima', '5'),
  ('ruleta_activa', 'true'),
  ('preguntas_filtro', '["¿Confirma que quiere participar los 30 días del Reto?", "¿Puede asistir al Día Cero presencial en su ciudad?", "¿Tiene disponibilidad de tiempo para las sesiones y la prospección?", "¿Entiende que la meta es vender terrenos de Ciudad Maderas?"]'),
  ('aviso_privacidad_url', '""');

-- ---------- Seguridad ----------
-- La app accede siempre desde el servidor con la llave service_role.
-- RLS activo sin políticas: la llave anon/publishable no puede leer ni escribir nada.
alter table public.perfiles enable row level security;
alter table public.fuentes enable row level security;
alter table public.leads enable row level security;
alter table public.lead_eventos enable row level security;
alter table public.config enable row level security;

-- ---------- Vistas ----------
create or replace view public.lider_stats as
select
  p.id as lider_id,
  count(l.id) filter (where not l.desde_bolsa and l.estatus <> 'duplicado')                           as registrados,
  count(l.id) filter (where not l.desde_bolsa and l.estatus = 'calificado')                           as calificados,
  count(l.id) filter (where not l.desde_bolsa and l.estatus in ('nuevo','en_contacto','no_contesta')) as pendientes,
  count(l.id) filter (where not l.desde_bolsa and l.estatus in ('no_calificado','descartado'))        as descartados,
  count(l.id) filter (where l.desde_bolsa)                                                            as bolsa_recibidos,
  count(l.id) filter (where l.desde_bolsa and l.estatus = 'calificado')                               as bolsa_calificados
from public.perfiles p
left join public.leads l on l.lider_id = p.id
where p.rol in ('lider', 'gerente')
group by p.id;

-- Líderes y gerentes con su estado de desbloqueo calculado
create or replace view public.lideres_estado as
select
  p.id, p.nombre, p.email, p.telefono, p.ciudad, p.slug, p.activo, p.gerente_id, p.rol, p.bolsa_manual, p.created_at,
  g.nombre as gerente_nombre,
  coalesce(s.registrados, 0)       as registrados,
  coalesce(s.calificados, 0)       as calificados,
  coalesce(s.pendientes, 0)        as pendientes,
  coalesce(s.descartados, 0)       as descartados,
  coalesce(s.bolsa_recibidos, 0)   as bolsa_recibidos,
  coalesce(s.bolsa_calificados, 0) as bolsa_calificados,
  (select (valor)::int from public.config where clave = 'cuota_minima') as cuota,
  coalesce(
    p.bolsa_manual,
    coalesce(s.calificados, 0) >= (select (valor)::int from public.config where clave = 'cuota_minima')
  ) as desbloqueado
from public.perfiles p
left join public.lider_stats s on s.lider_id = p.id
left join public.perfiles g on g.id = p.gerente_id
where p.rol in ('lider', 'gerente');

-- ---------- Ruleta de la bolsa común ----------
-- Reparte todos los leads sin responsable entre los líderes desbloqueados.
-- Para cada lead elige al azar entre los líderes que menos leads de bolsa han recibido.
create or replace function public.repartir_bolsa(p_actor uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activa boolean;
  v_lead record;
  v_lider uuid;
  v_count int := 0;
begin
  select (valor)::boolean into v_activa from public.config where clave = 'ruleta_activa';
  if not coalesce(v_activa, true) then
    return 0;
  end if;

  for v_lead in
    select id from public.leads
    where lider_id is null
      and estatus not in ('duplicado', 'descartado', 'no_calificado')
    order by created_at
    for update skip locked
  loop
    select e.id into v_lider
    from public.lideres_estado e
    where e.rol = 'lider' and e.activo and e.desbloqueado
    order by e.bolsa_recibidos asc, random()
    limit 1;

    if v_lider is null then
      exit;  -- nadie desbloqueado todavía: los leads se quedan en la bolsa
    end if;

    update public.leads
      set lider_id = v_lider, desde_bolsa = true, asignado_at = now()
      where id = v_lead.id;
    insert into public.lead_eventos (lead_id, actor_id, tipo, detalle)
      values (v_lead.id, p_actor, 'asignacion_ruleta', jsonb_build_object('lider_id', v_lider));
    v_count := v_count + 1;
  end loop;

  return v_count;
end
$$;

-- ---------- Registro público ----------
create or replace function public.registrar_lead(
  p_nombre text,
  p_apellido text,
  p_whatsapp text,
  p_email text,
  p_ciudad public.ciudad,
  p_experiencia text,
  p_motivo text,
  p_como_se_entero text,
  p_fuente_slug text,
  p_lider_id uuid,
  p_utm jsonb,
  p_origen text,
  p_consentimiento boolean
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fuente public.fuentes;
  v_lider uuid := p_lider_id;
  v_lead public.leads;
  v_ganador uuid;
  v_previo uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_whatsapp));

  if p_fuente_slug is not null then
    select * into v_fuente from public.fuentes where slug = p_fuente_slug and activo;
    if v_fuente.perfil_id is not null then
      v_lider := v_fuente.perfil_id;
    end if;
  end if;
  if v_fuente.id is null and v_lider is not null then
    select * into v_fuente from public.fuentes where perfil_id = v_lider;
  end if;
  -- Solo líderes y gerentes activos pueden ser responsables
  if v_lider is not null and not exists (
    select 1 from public.perfiles where id = v_lider and activo and rol in ('lider', 'gerente')
  ) then
    v_lider := null;
  end if;

  insert into public.leads (
    nombre, apellido, whatsapp, email, ciudad, experiencia, motivo, como_se_entero,
    fuente_id, lider_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    origen_registro, consentimiento
  ) values (
    p_nombre, p_apellido, p_whatsapp, p_email, p_ciudad, p_experiencia, p_motivo, p_como_se_entero,
    v_fuente.id, v_lider,
    p_utm->>'utm_source', p_utm->>'utm_medium', p_utm->>'utm_campaign', p_utm->>'utm_content', p_utm->>'utm_term',
    coalesce(p_origen, 'form'), coalesce(p_consentimiento, false)
  ) returning * into v_lead;

  insert into public.lead_eventos (lead_id, tipo, detalle)
    values (v_lead.id, 'registro', jsonb_build_object('fuente', v_fuente.slug, 'lider_id', v_lider, 'origen', p_origen));

  -- Ya calificado con otro responsable: este registro es duplicado desde el inicio
  select id into v_ganador from public.leads
    where whatsapp = p_whatsapp and id <> v_lead.id and estatus = 'calificado'
    order by calificado_at limit 1;
  if v_ganador is not null then
    update public.leads set estatus = 'duplicado', duplicado_de = v_ganador
      where id = v_lead.id returning * into v_lead;
    insert into public.lead_eventos (lead_id, tipo, detalle)
      values (v_lead.id, 'duplicado', jsonb_build_object('ganador', v_ganador, 'motivo', 'ya_calificado'));
    return v_lead;
  end if;

  -- Misma persona registrada dos veces con el mismo responsable (o dos veces en la bolsa)
  select id into v_previo from public.leads
    where whatsapp = p_whatsapp and id <> v_lead.id
      and coalesce(lider_id::text, '') = coalesce(v_lider::text, '')
      and estatus <> 'duplicado'
    order by created_at limit 1;
  if v_previo is not null then
    update public.leads set estatus = 'duplicado', duplicado_de = v_previo
      where id = v_lead.id returning * into v_lead;
    insert into public.lead_eventos (lead_id, tipo, detalle)
      values (v_lead.id, 'duplicado', jsonb_build_object('ganador', v_previo, 'motivo', 'mismo_responsable'));
    return v_lead;
  end if;

  -- Lead de bolsa común: intentar repartir por ruleta
  if v_lead.lider_id is null then
    perform public.repartir_bolsa(null);
    select * into v_lead from public.leads where id = v_lead.id;
  end if;

  return v_lead;
end
$$;

-- ---------- Calificación (llamada de filtro aprobada) ----------
-- Regla: si dos responsables registraron a la misma persona, gana el primero que la califica.
create or replace function public.calificar_lead(
  p_lead uuid,
  p_actor uuid,
  p_respuestas jsonb default null,
  p_notas text default null
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
  v_ganador public.leads;
begin
  select * into v_lead from public.leads where id = p_lead for update;
  if v_lead.id is null then
    raise exception 'Lead no encontrado';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_lead.whatsapp));

  select * into v_ganador from public.leads
    where whatsapp = v_lead.whatsapp and id <> v_lead.id and estatus = 'calificado'
    order by calificado_at limit 1;
  if v_ganador.id is not null then
    update public.leads
      set estatus = 'duplicado', duplicado_de = v_ganador.id, notas = coalesce(p_notas, notas)
      where id = p_lead returning * into v_lead;
    insert into public.lead_eventos (lead_id, actor_id, tipo, detalle)
      values (p_lead, p_actor, 'duplicado',
              jsonb_build_object('ganador', v_ganador.id, 'lider_ganador', v_ganador.lider_id, 'motivo', 'calificado_antes'));
    return v_lead;
  end if;

  update public.leads
    set estatus = 'calificado',
        calificado_at = now(),
        calificado_por = p_actor,
        respuestas_filtro = coalesce(p_respuestas, respuestas_filtro),
        notas = coalesce(p_notas, notas),
        etapa = coalesce(etapa, 'inscrito'),
        ultimo_contacto_at = now(),
        intentos = intentos + 1
    where id = p_lead returning * into v_lead;
  insert into public.lead_eventos (lead_id, actor_id, tipo, detalle)
    values (p_lead, p_actor, 'calificado', jsonb_build_object('respuestas', p_respuestas, 'notas', p_notas));

  -- Las demás copias pendientes de esta persona pierden
  with perdedores as (
    update public.leads set estatus = 'duplicado', duplicado_de = p_lead
      where whatsapp = v_lead.whatsapp and id <> p_lead
        and estatus in ('nuevo', 'en_contacto', 'no_contesta')
      returning id
  )
  insert into public.lead_eventos (lead_id, actor_id, tipo, detalle)
    select id, p_actor, 'duplicado', jsonb_build_object('ganador', p_lead, 'motivo', 'otro_responsable_califico_primero')
    from perdedores;

  -- Si con esto el líder se desbloqueó, la bolsa pendiente se reparte
  perform public.repartir_bolsa(p_actor);

  return v_lead;
end
$$;

-- ---------- Resultado de llamada distinto a calificado ----------
create or replace function public.registrar_llamada(
  p_lead uuid,
  p_actor uuid,
  p_resultado public.lead_estatus,
  p_notas text default null,
  p_respuestas jsonb default null
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  if p_resultado = 'calificado' then
    return public.calificar_lead(p_lead, p_actor, p_respuestas, p_notas);
  end if;
  if p_resultado not in ('en_contacto', 'no_contesta', 'no_calificado', 'descartado', 'nuevo') then
    raise exception 'Resultado no permitido: %', p_resultado;
  end if;

  update public.leads
    set estatus = p_resultado,
        intentos = case when p_resultado in ('en_contacto', 'no_contesta', 'no_calificado') then intentos + 1 else intentos end,
        ultimo_contacto_at = case when p_resultado in ('en_contacto', 'no_contesta', 'no_calificado') then now() else ultimo_contacto_at end,
        notas = coalesce(p_notas, notas),
        respuestas_filtro = coalesce(p_respuestas, respuestas_filtro),
        calificado_at = null,
        calificado_por = null
    where id = p_lead returning * into v_lead;
  insert into public.lead_eventos (lead_id, actor_id, tipo, detalle)
    values (p_lead, p_actor, 'llamada', jsonb_build_object('resultado', p_resultado, 'notas', p_notas));
  return v_lead;
end
$$;

-- ---------- Reasignar responsable (corregir atribución) ----------
create or replace function public.reasignar_lead(
  p_lead uuid,
  p_actor uuid,
  p_lider uuid,          -- null = regresar a la bolsa
  p_desde_bolsa boolean default false
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  update public.leads
    set lider_id = p_lider,
        desde_bolsa = coalesce(p_desde_bolsa, false),
        asignado_at = case when p_lider is null then null else now() end
    where id = p_lead returning * into v_lead;
  insert into public.lead_eventos (lead_id, actor_id, tipo, detalle)
    values (p_lead, p_actor, 'reasignacion', jsonb_build_object('lider_id', p_lider, 'desde_bolsa', p_desde_bolsa));
  return v_lead;
end
$$;
