-- Hoja Urbana — esquema relacional completo
-- Reemplaza el enfoque de una sola tabla con un JSON por 11 tablas normalizadas.
--
-- IDs: la app asigna los ids (bigint) desde un contador compartido en el
-- cliente (mismo patrón que el "nextId" del original), por eso NO son
-- "generated always as identity": el cliente los provee en cada insert.
--
-- Referencias a variedad_id/lote_id NO llevan foreign key en todos los casos:
-- el original tolera "referencias colgantes" (ej. borrar una variedad que
-- todavía tiene lotes, o borrar un lote que ya tiene cosechas registradas) sin
-- bloquear ni encadenar el borrado. Para no romper ese comportamiento, esas
-- columnas son simples bigint indexados, sin constraint de FK.
--
-- Este script es idempotente: se puede volver a ejecutar sin error si algo
-- falla a la mitad.

-- ── Variedades ──────────────────────────────────────────────────────────
create table if not exists public.variedades (
  id bigint primary key,
  nombre text not null,
  marca text,
  tipo text,
  created_at timestamptz not null default now()
);

-- ── Bancales (catálogo fijo de ubicaciones físicas, no lo edita la app) ───
create table if not exists public.bancales (
  id text primary key,
  tipo text not null check (tipo in ('engorda', 'adulto')),
  numero integer not null,
  capacidad_tubos integer not null
);

insert into public.bancales (id, tipo, numero, capacidad_tubos)
select 'eng_' || n, 'engorda', n, 20 from generate_series(1, 8) n
on conflict (id) do nothing;

insert into public.bancales (id, tipo, numero, capacidad_tubos)
select 'adu_' || n, 'adulto', n, 10 from generate_series(1, 16) n
on conflict (id) do nothing;

-- ── Lotes ───────────────────────────────────────────────────────────────
create table if not exists public.lotes (
  id bigint primary key,
  variedad_id bigint not null,
  plantas_iniciales integer not null check (plantas_iniciales > 0),
  plantas_restantes integer not null check (plantas_restantes >= 0),
  etapa text not null check (etapa in ('plantines', 'engorda', 'adulto', 'cosechado')),
  fecha_inicio date not null,
  fecha_etapa date not null,
  dias_plantines integer not null,
  dias_engorda integer not null,
  dias_adulto integer not null,
  notas text,
  bancal_id text references public.bancales (id),
  fecha_venta date not null,
  created_at timestamptz not null default now()
);
create index if not exists lotes_variedad_id_idx on public.lotes (variedad_id);

-- ── Movimientos por lote (historial propio de cada lote) ──────────────────
create table if not exists public.lote_movimientos (
  id bigint primary key,
  lote_id bigint not null references public.lotes (id) on delete cascade,
  fecha date not null,
  accion text not null,
  detalle text not null,
  autor text
);
create index if not exists lote_movimientos_lote_id_idx on public.lote_movimientos (lote_id);

-- ── Ocupación de bancales por variedad ────────────────────────────────────
create table if not exists public.bancal_slots (
  id bigint primary key,
  bancal_id text not null references public.bancales (id),
  variedad_id bigint not null,
  plantas integer not null check (plantas >= 0),
  unique (bancal_id, variedad_id)
);
create index if not exists bancal_slots_bancal_id_idx on public.bancal_slots (bancal_id);

-- ── Plan de siembra ─────────────────────────────────────────────────────
create table if not exists public.plan_siembra (
  id bigint primary key,
  variedad_id bigint not null,
  frecuencia_dias integer not null check (frecuencia_dias > 0),
  plantas integer not null check (plantas > 0),
  dias_plantines integer not null,
  dias_engorda integer not null,
  dias_adulto integer not null,
  ultima_siembra date
);

-- ── Inventario de cubos fenológicos (fila única) ──────────────────────────
create table if not exists public.inventario_cubos (
  id integer primary key check (id = 1),
  cantidad integer not null default 0 check (cantidad >= 0)
);
insert into public.inventario_cubos (id, cantidad) values (1, 500)
on conflict (id) do nothing;

-- ── Inventario de semillas (una fila por variedad) ────────────────────────
create table if not exists public.inventario_semillas (
  variedad_id bigint primary key,
  cantidad integer not null default 0 check (cantidad >= 0)
);

-- ── Merma acumulada por etapa (3 filas fijas) ─────────────────────────────
create table if not exists public.merma (
  etapa text primary key check (etapa in ('plantines', 'engorda', 'adulto')),
  cantidad integer not null default 0 check (cantidad >= 0)
);
insert into public.merma (etapa, cantidad) values
  ('plantines', 0), ('engorda', 0), ('adulto', 0)
on conflict (etapa) do nothing;

-- ── Historial global ────────────────────────────────────────────────────
create table if not exists public.historial (
  id bigint primary key,
  fecha date not null,
  accion text not null,
  detalle text not null,
  autor text,
  created_at timestamptz not null default now()
);

-- ── Cosechas (registro estructurado para el módulo de historial) ─────────
create table if not exists public.cosechas (
  id bigint primary key,
  lote_id bigint not null,
  variedad_id bigint not null,
  fecha date not null,
  plantas integer not null check (plantas > 0),
  nota text,
  autor text,
  created_at timestamptz not null default now()
);
create index if not exists cosechas_fecha_idx on public.cosechas (fecha);
create index if not exists cosechas_variedad_id_idx on public.cosechas (variedad_id);

-- ── Variedades iniciales (igual a defS() del original) ────────────────────
insert into public.variedades (id, nombre, marca, tipo) values
  (1, 'Española', 'Hazera', 'Verde'),
  (2, 'Lolo Bionda', 'Rijk Zwaan', 'Bionda'),
  (3, 'Hoja Roble', 'Clause', 'Verde')
on conflict (id) do nothing;

-- ── Row Level Security: un solo invernadero compartido ────────────────────
-- Cualquier usuario autenticado (dado de alta manualmente) puede leer y
-- escribir todas las tablas de datos del invernadero.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'variedades', 'bancales', 'lotes', 'lote_movimientos', 'bancal_slots',
    'plan_siembra', 'inventario_cubos', 'inventario_semillas', 'merma',
    'historial', 'cosechas'
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
