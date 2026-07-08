-- Reinicia los datos operativos del invernadero para partir de 0.
-- Mantiene intactas las variedades (catálogo) y los bancales (ubicaciones
-- físicas fijas); borra todo lo demás: lotes, movimientos, ocupación de
-- bancales, plan de siembra, historial, cosechas, semillas e inventario de
-- cubos (que vuelve a su valor inicial de 500) y merma (vuelve a 0).

truncate table
  public.lote_movimientos,
  public.lotes,
  public.bancal_slots,
  public.plan_siembra,
  public.historial,
  public.cosechas,
  public.inventario_semillas;

update public.inventario_cubos set cantidad = 500 where id = 1;
update public.merma set cantidad = 0;
