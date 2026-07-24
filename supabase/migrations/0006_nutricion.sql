-- Módulo de Nutrición: calibraciones de pH/EC y recambios de agua por
-- estanque, más la configuración de objetivos y periodicidad de tareas.
--
-- Dos sistemas de agua físicamente separados: la mesa de plantines tiene su
-- propio estanque chico (650 L) y todos los bancales comparten un estanque
-- principal (2400 L). El catálogo de estanques es fijo, igual que "bancales"
-- en 0001_init.sql.

create table if not exists public.estanques (
  id text primary key,
  nombre text not null,
  litros integer not null
);
insert into public.estanques (id, nombre, litros) values
  ('mesa_plantines', 'Mesa de plantines', 650),
  ('principal', 'Estanque principal (bancales)', 2400)
on conflict (id) do nothing;

-- ── Configuración global (fila única) ──────────────────────────────────
create table if not exists public.nutricion_config (
  id integer primary key check (id = 1),
  ph_min numeric not null default 5.5,
  ph_max numeric not null default 6.5,
  ec_verano numeric not null default 1.6,
  ec_invierno numeric not null default 2.0
);
insert into public.nutricion_config (id, ph_min, ph_max, ec_verano, ec_invierno)
values (1, 5.5, 6.5, 1.6, 2.0)
on conflict (id) do nothing;

-- ── Periodicidad de tareas por estanque (una fila por estanque) ─────────
create table if not exists public.nutricion_estanque_config (
  estanque_id text primary key references public.estanques (id),
  periodicidad_medicion_dias integer not null default 3,
  periodicidad_recambio_dias integer not null default 14
);
insert into public.nutricion_estanque_config (estanque_id, periodicidad_medicion_dias, periodicidad_recambio_dias)
select id, 3, 14 from public.estanques
on conflict (estanque_id) do nothing;

-- ── Calibraciones (una fila por medición de pH/EC) ──────────────────────
create table if not exists public.nutricion_mediciones (
  id bigint primary key,
  estanque_id text not null references public.estanques (id),
  fecha date not null,
  ph numeric not null,
  ec numeric not null,
  litros numeric not null,
  ml_acido_por_1l numeric,
  gramos_a_por_1l numeric,
  gramos_b_por_1l numeric,
  ml_acido_sugerido numeric,
  gramos_a_sugerido numeric,
  gramos_b_sugerido numeric,
  autor text,
  created_at timestamptz not null default now()
);
create index if not exists nutricion_mediciones_estanque_fecha_idx on public.nutricion_mediciones (estanque_id, fecha);

-- ── Recambios de agua ────────────────────────────────────────────────────
create table if not exists public.nutricion_recambios (
  id bigint primary key,
  estanque_id text not null references public.estanques (id),
  fecha date not null,
  autor text,
  created_at timestamptz not null default now()
);
create index if not exists nutricion_recambios_estanque_fecha_idx on public.nutricion_recambios (estanque_id, fecha);

-- ── Row Level Security: mismo esquema compartido que el resto de la app ──
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'estanques', 'nutricion_config', 'nutricion_estanque_config',
    'nutricion_mediciones', 'nutricion_recambios'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated read" on public.%I', t);
    execute format('create policy "authenticated read" on public.%I for select to authenticated using (true)', t);
    execute format('drop policy if exists "authenticated insert" on public.%I', t);
    execute format('create policy "authenticated insert" on public.%I for insert to authenticated with check (true)', t);
    execute format('drop policy if exists "authenticated update" on public.%I', t);
    execute format('create policy "authenticated update" on public.%I for update to authenticated using (true) with check (true)', t);
    execute format('drop policy if exists "authenticated delete" on public.%I', t);
    execute format('create policy "authenticated delete" on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;
