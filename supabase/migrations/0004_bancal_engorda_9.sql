-- El invernadero tiene en realidad 9 bancales de engorda (no 8): agrega el
-- que faltaba al catálogo fijo de ubicaciones físicas.
insert into public.bancales (id, tipo, numero, capacidad_tubos)
values ('eng_9', 'engorda', 9, 20)
on conflict (id) do nothing;
