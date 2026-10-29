-- Regla por ciudad: un responsable (líder o gerente) solo puede tener leads de su misma ciudad.
-- "En línea" es compatible con cualquier ciudad. Un lead sin ciudad no entra a la ruleta.
-- Se puede apagar con config.ciudad_estricta = false.

insert into public.config (clave, valor) values ('ciudad_estricta', 'true') on conflict (clave) do nothing;

create or replace function public.ciudad_etiqueta(p public.ciudad)
returns text language sql immutable as $$
  select case p when 'tijuana' then 'Tijuana' when 'monterrey' then 'Monterrey' when 'en_linea' then 'En línea' else 'sin ciudad' end
$$;

create or replace function public.ciudad_compatible(p_lead public.ciudad, p_responsable public.ciudad)
returns boolean language sql stable as $$
  select not coalesce((select (valor)::boolean from public.config where clave = 'ciudad_estricta'), true)
      or p_lead is null or p_responsable is null
      or p_lead = 'en_linea' or p_responsable = 'en_linea'
      or p_lead = p_responsable
$$;

-- ---------- Ruleta: solo líderes desbloqueados de la misma ciudad ----------
create or replace function public.repartir_bolsa(p_actor uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activa boolean;
  v_estricta boolean;
  v_lead record;
  v_lider uuid;
  v_count int := 0;
begin
  select (valor)::boolean into v_activa from public.config where clave = 'ruleta_activa';
  if not coalesce(v_activa, true) then
    return 0;
  end if;
  select (valor)::boolean into v_estricta from public.config where clave = 'ciudad_estricta';
  v_estricta := coalesce(v_estricta, true);

  for v_lead in
    select id, ciudad from public.leads
    where lider_id is null
      and estatus not in ('duplicado', 'descartado', 'no_calificado')
      and (not v_estricta or ciudad is not null)
    order by created_at
    for update skip locked
  loop
    select e.id into v_lider
    from public.lideres_estado e
    where e.rol = 'lider' and e.activo and e.desbloqueado
      and public.ciudad_compatible(v_lead.ciudad, e.ciudad)
    order by e.bolsa_recibidos asc, random()
    limit 1;

    if v_lider is null then
      continue;  -- no hay líder desbloqueado de esa ciudad: el lead espera
    end if;

    update public.leads
      set lider_id = v_lider, desde_bolsa = true, asignado_at = now()
      where id = v_lead.id;
    insert into public.lead_eventos (lead_id, actor_id, tipo, detalle)
      values (v_lead.id, p_actor, 'asignacion_ruleta', jsonb_build_object('lider_id', v_lider, 'ciudad', v_lead.ciudad));
    v_count := v_count + 1;
  end loop;

  return v_count;
end
$$;

-- ---------- Registro: una invitación de otra ciudad cae en la bolsa ----------
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
  v_ciudad_lider public.ciudad;
  v_invitador_otra_ciudad uuid;
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
  if v_lider is not null and not exists (
    select 1 from public.perfiles where id = v_lider and activo and rol in ('lider', 'gerente')
  ) then
    v_lider := null;
  end if;

  -- Regla por ciudad: si quien invita es de otra ciudad, el lead va a la bolsa de su ciudad
  if v_lider is not null then
    select ciudad into v_ciudad_lider from public.perfiles where id = v_lider;
    if not public.ciudad_compatible(p_ciudad, v_ciudad_lider) then
      v_invitador_otra_ciudad := v_lider;
      v_lider := null;
    end if;
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

  if v_invitador_otra_ciudad is not null then
    insert into public.lead_eventos (lead_id, tipo, detalle)
      values (v_lead.id, 'ciudad_distinta', jsonb_build_object(
        'invitador_id', v_invitador_otra_ciudad,
        'invitador', (select nombre from public.perfiles where id = v_invitador_otra_ciudad),
        'ciudad_lead', p_ciudad, 'ciudad_invitador', v_ciudad_lider));
  end if;

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

  if v_lead.lider_id is null then
    perform public.repartir_bolsa(null);
    select * into v_lead from public.leads where id = v_lead.id;
  end if;

  return v_lead;
end
$$;

-- ---------- Reasignación: se rechaza si la ciudad no coincide ----------
create or replace function public.reasignar_lead(
  p_lead uuid,
  p_actor uuid,
  p_lider uuid,
  p_desde_bolsa boolean default false
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
  v_ciudad_lider public.ciudad;
  v_ciudad_lead public.ciudad;
begin
  if p_lider is not null then
    select ciudad into v_ciudad_lider from public.perfiles where id = p_lider;
    select ciudad into v_ciudad_lead from public.leads where id = p_lead;
    if not public.ciudad_compatible(v_ciudad_lead, v_ciudad_lider) then
      raise exception 'El lead es de % y el responsable es de %. Cambia primero la ciudad del lead si de verdad corresponde.',
        public.ciudad_etiqueta(v_ciudad_lead), public.ciudad_etiqueta(v_ciudad_lider);
    end if;
  end if;

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
