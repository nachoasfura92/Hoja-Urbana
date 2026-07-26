-- Módulo de Clientes: datos de facturación/contacto por cliente, y sus
-- pedidos (variedad, cantidad, único o recurrente). La demanda agregada de
-- los pedidos recurrentes es lo que se usa para armar el plan de siembra
-- (ver calcularDemandaAgregada en src/lib/greenhouse/helpers.ts).

create table if not exists public.clientes (
  id bigint primary key,
  nombre text not null,
  rut text,
  direccion_facturacion text,
  direccion_entrega text,
  correo text,
  telefono text,
  notas text,
  created_at timestamptz not null default now()
);

create table if not exists public.pedidos_clientes (
  id bigint primary key,
  cliente_id bigint not null references public.clientes (id) on delete cascade,
  variedad_id bigint not null,
  plantas integer not null check (plantas > 0),
  periodicidad text not null check (periodicidad in ('unico', 'recurrente')),
  frecuencia_dias integer,
  dias_plantines integer not null,
  dias_engorda integer not null,
  dias_adulto integer not null,
  fecha_entrega date not null,
  cumplido boolean not null default false,
  notas text,
  created_at timestamptz not null default now()
);
create index if not exists pedidos_clientes_cliente_id_idx on public.pedidos_clientes (cliente_id);
create index if not exists pedidos_clientes_variedad_id_idx on public.pedidos_clientes (variedad_id);

-- ── Row Level Security: mismo esquema compartido que el resto de la app ──
do $$
declare
  t text;
begin
  for t in select unnest(array['clientes', 'pedidos_clientes'])
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
