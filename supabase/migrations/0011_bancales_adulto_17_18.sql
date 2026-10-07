-- Faltaban 2 bancales de adulto en la Nave 2: el 17 (10 tubos, capacidad
-- estándar) y el 18 (5 tubos, capacidad reducida — excepción física real,
-- igual que ya existía para eng_5). El 16 ya estaba bien en esta tabla (10
-- tubos); la excepción de 5 tubos que tenía el código para adu_16 en realidad
-- correspondía al 18 y se corrige aparte en la app.
insert into public.bancales (id, tipo, numero, capacidad_tubos)
values
  ('adu_17', 'adulto', 17, 10),
  ('adu_18', 'adulto', 18, 5)
on conflict (id) do nothing;
