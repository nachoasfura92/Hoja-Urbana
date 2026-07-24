-- La calibración de pH y la de EC se hacen en instancias distintas (el
-- operador no las mide juntas): esta migración separa nutricion_mediciones
-- por tipo ('ph' | 'ec') y separa la periodicidad de tareas de pH y de EC
-- por estanque (antes era una sola "periodicidad_medicion_dias" compartida).
--
-- Se puede correr de forma segura después de 0006_nutricion.sql aunque ya
-- tenga datos: a la fecha de esta migración nutricion_mediciones no tenía
-- filas todavía, así que no hace falta backfill de `tipo`.

alter table public.nutricion_mediciones
  add column if not exists tipo text check (tipo in ('ph', 'ec'));
update public.nutricion_mediciones set tipo = 'ph' where tipo is null and ph is not null;
update public.nutricion_mediciones set tipo = 'ec' where tipo is null and ec is not null;
alter table public.nutricion_mediciones alter column tipo set not null;

alter table public.nutricion_mediciones alter column ph drop not null;
alter table public.nutricion_mediciones alter column ec drop not null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'nutricion_estanque_config' and column_name = 'periodicidad_medicion_dias'
  ) then
    alter table public.nutricion_estanque_config rename column periodicidad_medicion_dias to periodicidad_ph_dias;
  end if;
end $$;

alter table public.nutricion_estanque_config
  add column if not exists periodicidad_ec_dias integer not null default 3;
