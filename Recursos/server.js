const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Autenticación Google Sheets ──────────────────────────────────────────────
// Las credenciales vienen de variables de entorno (configuradas en Railway)
function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const SHEET_ID = process.env.SHEET_ID; // ID del Google Sheet

// ── Helpers ──────────────────────────────────────────────────────────────────
async function readSheet(range) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range,
  });
  return res.data.values || [];
}

async function writeSheet(range, values) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function appendSheet(range, values) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

async function clearSheet(range) {
  const auth = await getAuth().getClient();
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range,
  });
}

// ── Parsear estado desde Sheets ──────────────────────────────────────────────
// El estado completo se guarda como JSON en una sola celda (hoja "Estado")
// para simplicidad. Sheets también tiene hojas legibles por humanos.

async function cargarEstado() {
  try {
    const rows = await readSheet('Estado!A2');
    if (rows.length && rows[0][0]) {
      return JSON.parse(rows[0][0]);
    }
  } catch (e) {
    console.error('Error cargando estado:', e.message);
  }
  return null;
}

async function guardarEstado(state) {
  const json = JSON.stringify(state);
  await writeSheet('Estado!A2', [[json]]);

  // También sincronizar hojas legibles
  await sincronizarHojasLegibles(state);
}

async function sincronizarHojasLegibles(state) {
  try {
    // ── Hoja Variedades ──
    await clearSheet('Variedades!A2:Z1000');
    if (state.vars && state.vars.length) {
      await appendSheet('Variedades!A2', state.vars.map(v => [
        v.id, v.nombre, v.marca || '', v.tipo || ''
      ]));
    }

    // ── Hoja Lotes ──
    await clearSheet('Lotes!A2:Z1000');
    if (state.lotes && state.lotes.length) {
      await appendSheet('Lotes!A2', state.lotes.map(l => [
        l.id, l.varNom, l.plantas, l.plantasRestantes,
        l.etapa, l.fechaInicio, l.fechaEtapa,
        l.dp, l.de, l.da, l.bancalId || '', l.fechaVenta, l.notas || ''
      ]));
    }

    // ── Hoja Plan ──
    await clearSheet('Plan!A2:Z1000');
    if (state.plan && state.plan.length) {
      await appendSheet('Plan!A2', state.plan.map(p => [
        p.id, p.varNom, p.freq, p.plantas,
        p.dp, p.de, p.da, p.ultimaSiembra || ''
      ]));
    }

    // ── Hoja Inventario ──
    await clearSheet('Inventario!A2:Z1000');
    const invRows = [['cubos', '', state.inventario.cubos || 0]];
    if (state.inventario.semillas) {
      Object.entries(state.inventario.semillas).forEach(([vId, cant]) => {
        const v = (state.vars || []).find(x => x.id == vId);
        invRows.push(['semillas', v ? v.nombre : vId, cant]);
      });
    }
    if (invRows.length) await appendSheet('Inventario!A2', invRows);

    // ── Hoja Historial ──
    await clearSheet('Historial!A2:Z1000');
    if (state.historial && state.historial.length) {
      await appendSheet('Historial!A2', state.historial.map(h => [
        h.fecha, h.accion, h.detalle
      ]));
    }

    // ── Hoja Merma ──
    await clearSheet('Merma!A2:Z10');
    const m = state.merma || {};
    await writeSheet('Merma!A2', [
      ['plantines', m.plantines || 0],
      ['engorda', m.engorda || 0],
      ['adulto', m.adulto || 0],
    ]);
  } catch (e) {
    console.error('Error sincronizando hojas:', e.message);
  }
}

// ── Inicializar hojas si no existen ─────────────────────────────────────────
async function inicializarHojas() {
  try {
    const auth = await getAuth().getClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Obtener hojas existentes
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const existentes = meta.data.sheets.map(s => s.properties.title);

    const necesarias = [
      { title: 'Estado', headers: [['json_estado']] },
      { title: 'Variedades', headers: [['id','nombre','marca','tipo']] },
      { title: 'Lotes', headers: [['id','variedad','plantas_orig','plantas_rest','etapa','fecha_inicio','fecha_etapa','dias_plantines','dias_engorda','dias_adulto','bancal','fecha_venta','notas']] },
      { title: 'Plan', headers: [['id','variedad','frecuencia_dias','plantas','dias_plantines','dias_engorda','dias_adulto','ultima_siembra']] },
      { title: 'Inventario', headers: [['tipo','variedad','cantidad']] },
      { title: 'Historial', headers: [['fecha','accion','detalle']] },
      { title: 'Merma', headers: [['etapa','plantas']] },
    ];

    const porCrear = necesarias.filter(h => !existentes.includes(h.title));

    if (porCrear.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: porCrear.map(h => ({
            addSheet: { properties: { title: h.title } }
          }))
        }
      });

      // Escribir headers
      for (const hoja of porCrear) {
        await writeSheet(`${hoja.title}!A1`, hoja.headers);
      }

      console.log(`✅ Hojas creadas: ${porCrear.map(h => h.title).join(', ')}`);
    } else {
      console.log('✅ Todas las hojas ya existen');
    }
  } catch (e) {
    console.error('Error inicializando hojas:', e.message);
  }
}

// ── API Routes ───────────────────────────────────────────────────────────────

// Cargar estado completo
app.get('/api/state', async (req, res) => {
  try {
    const state = await cargarEstado();
    res.json({ ok: true, state });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Guardar estado completo
app.post('/api/state', async (req, res) => {
  try {
    const { state } = req.body;
    if (!state) return res.status(400).json({ ok: false, error: 'Sin estado' });
    await guardarEstado(state);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Servir index.html para cualquier otra ruta
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Arrancar servidor ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

(async () => {
  await inicializarHojas();
  app.listen(PORT, () => {
    console.log(`🌿 Hoja Urbana corriendo en puerto ${PORT}`);
  });
})();
