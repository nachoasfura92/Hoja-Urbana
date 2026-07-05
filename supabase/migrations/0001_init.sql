-- Hoja Urbana — estado del invernadero
-- Reemplaza la hoja de Google Sheets del proyecto original: se guarda como un
-- único JSON compartido (misma estructura que devolvía server.js), en una fila
-- fija ('default'). Todos los usuarios autenticados leen y escriben esa misma fila.

create table if not exists public.greenhouse_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Fila inicial con el mismo estado por defecto que usaba la app original (defS()).
insert into public.greenhouse_state (id, data)
values (
  'default',
  '{
    "vars": [
      {"id": 1, "nombre": "Española", "marca": "Hazera", "tipo": "Verde"},
      {"id": 2, "nombre": "Lolo Bionda", "marca": "Rijk Zwaan", "tipo": "Bionda"},
      {"id": 3, "nombre": "Hoja Roble", "marca": "Clause", "tipo": "Verde"}
    ],
    "lotes": [],
    "bancales": {},
    "plan": [],
    "inventario": {"cubos": 500, "semillas": {}},
    "merma": {"plantines": 0, "engorda": 0, "adulto": 0},
    "historial": [],
    "nextId": 1
  }'::jsonb
)
on conflict (id) do nothing;

alter table public.greenhouse_state enable row level security;

-- Cualquier usuario autenticado (dado de alta manualmente, ver README) puede
-- leer y actualizar el estado compartido. Nadie puede insertar/borrar filas
-- nuevas: siempre existe una única fila 'default'.
create policy "authenticated users can read greenhouse state"
  on public.greenhouse_state for select
  to authenticated
  using (true);

create policy "authenticated users can update greenhouse state"
  on public.greenhouse_state for update
  to authenticated
  using (true)
  with check (true);
