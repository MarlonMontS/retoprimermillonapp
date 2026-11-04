-- Los participantes venden terrenos o casas de Ciudad Maderas, no solo terrenos.
update public.config
set valor = replace(valor::text, 'vender terrenos de Ciudad Maderas', 'vender terrenos o casas de Ciudad Maderas')::jsonb,
    updated_at = now()
where clave = 'preguntas_filtro';
