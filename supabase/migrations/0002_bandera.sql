-- Agrega el identificador de "banderita" reciclable por lote.
alter table public.lotes add column if not exists bandera integer not null default 0;
