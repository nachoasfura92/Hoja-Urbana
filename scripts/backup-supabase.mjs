// Respaldo automático local de todas las tablas de Supabase. Pensado para
// correr sin supervisión (Tarea Programada de Windows) cada 2 días.
// Usa la clave secreta (service_role) para leer todo sin necesidad de login;
// esa clave vive solo en .env.backup, que está fuera de git.
//
// Uso manual: node scripts/backup-supabase.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BACKUPS_DIR = join(ROOT, 'backups');
const LOG_FILE = join(ROOT, 'scripts', 'backup.log');
const MAX_BACKUPS = 5;

const TABLAS = [
  'variedades',
  'bancales',
  'lotes',
  'lote_movimientos',
  'bancal_slots',
  'plan_siembra',
  'inventario_cubos',
  'inventario_semillas',
  'merma',
  'historial',
  'cosechas',
];

function log(msg) {
  const linea = `[${new Date().toISOString()}] ${msg}`;
  console.log(linea);
  try {
    writeFileSync(LOG_FILE, linea + '\n', { flag: 'a' });
  } catch {
    // si no se puede escribir el log no es crítico, seguimos igual
  }
}

function leerCredenciales() {
  const envPath = join(ROOT, '.env.backup');
  const contenido = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const linea of contenido.split('\n')) {
    const m = linea.match(/^([A-Z_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  if (!vars.SUPABASE_URL || !vars.SUPABASE_SECRET_KEY) {
    throw new Error('.env.backup no tiene SUPABASE_URL o SUPABASE_SECRET_KEY');
  }
  return vars;
}

function limpiarRespaldosViejos() {
  const archivos = readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith('respaldo-') && f.endsWith('.json'))
    .map((f) => ({ f, t: statSync(join(BACKUPS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of archivos.slice(MAX_BACKUPS)) {
    unlinkSync(join(BACKUPS_DIR, f));
    log(`Respaldo viejo eliminado: ${f}`);
  }
}

async function main() {
  mkdirSync(BACKUPS_DIR, { recursive: true });
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = leerCredenciales();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

  const respaldo = { fecha: new Date().toISOString() };
  for (const tabla of TABLAS) {
    const { data, error } = await supabase.from(tabla).select('*');
    if (error) throw new Error(`Error leyendo ${tabla}: ${error.message}`);
    respaldo[tabla] = data;
  }

  const fechaArchivo = new Date().toISOString().split('T')[0];
  const destino = join(BACKUPS_DIR, `respaldo-${fechaArchivo}.json`);
  writeFileSync(destino, JSON.stringify(respaldo, null, 2), 'utf-8');

  const totalLotes = respaldo.lotes?.length ?? 0;
  log(`Respaldo guardado en ${destino} (${totalLotes} lotes)`);
  limpiarRespaldosViejos();
}

main().catch((err) => {
  log(`ERROR: ${err.message}`);
  process.exitCode = 1;
});
