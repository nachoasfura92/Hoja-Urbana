-- Historial de podas (cosecha de hoja suelta por tubo, sin sacar la planta).
-- Cada fila es un corte puntual de un tubo de un lote; un mismo tubo puede
-- tener muchas filas a lo largo del tiempo (una por cada poda).
create table if not exists public.lote_podas (
  id bigint primary key,
  lote_id bigint not null references public.lotes (id) on delete cascade,
  tubo integer not null check (tubo > 0),
  fecha date not null,
  autor text,
  created_at timestamptz not null default now()
);

create index if not exists lote_podas_lote_id_idx on public.lote_podas (lote_id);

-- ── Row Level Security: mismo esquema compartido que el resto de la app ──
do $$
declare
  t text;
begin
  for t in select unnest(array['lote_podas'])
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
