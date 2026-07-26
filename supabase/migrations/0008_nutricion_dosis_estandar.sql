-- Dosis estándar de fábrica (gramos por litro) de cada polvo, para sugerirle
-- al operador cuánto pesar al preparar la solución de prueba de 1 L antes de
-- medir EC: polvo A ("Blanca", 0,83 g/L) y polvo B ("Café", 0,79 g/L).
-- Sugerida, editable en el módulo de Nutrición.

alter table public.nutricion_config
  add column if not exists dosis_a_por_litro numeric not null default 0.83;
alter table public.nutricion_config
  add column if not exists dosis_b_por_litro numeric not null default 0.79;
