-- Un lote puede necesitar más de una banderita física asociada (ej. lotes
-- fusionados, o casos donde se le suma una segunda bandera). Se agrega la
-- columna `banderas` (array) y se migran los valores existentes de la
-- columna `bandera` (un solo número). La columna `bandera` se deja intacta
-- por ahora (no se lee ni se escribe desde la app) para no romper ninguna
-- sesión que siga corriendo el código anterior durante el despliegue; se
-- puede eliminar en una migración aparte más adelante.

alter table lotes add column if not exists banderas integer[] not null default '{}';

update lotes
set banderas = array[bandera]
where bandera > 0 and (banderas is null or banderas = '{}');
