import { QWEN_WORKER_URL, state, $id, log, tryRepairJson, validateTotalDemolition, findBestMatch, getSimilarity, getSimilarityAlphaNum } from './ocr-shared.js';
import { render } from './ocr-render.js';
import { saveData } from './ocr-dashboard.js';
import { getDb } from './firebase.js';

async function processFiles(files) {
  if (state._ocrProcessing) { log('OCR is already running. Please wait...', 'warn'); return; }
  state._ocrProcessing = true;
  const valid = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
  if (!valid.length) { state._ocrProcessing = false; return; }

  $id('dashProgress').classList.remove('hidden');
  log(`Preparing to scan ${valid.length} screenshots...`, 'info');

  const allJson = [];
  for (let i = 0; i < valid.length; i++) {
    const f = valid[i];
    $id('dashProgressText').textContent = `Scanning image ${i+1}/${valid.length}...`;
    const base64 = await new Promise(res => {
      const r = new FileReader(); r.onload = e => res(e.target.result.split(',')[1]); r.readAsDataURL(f);
    });

    try {
      const before = performance.now();
      let data = null;

      let localKey = localStorage.getItem('qwen_api_key');
      if (!localKey) {
        throw new Error('No API key provided. Please enter your API key in the top bar and click Confirm.');
      }

      const promptTxt = `You are an expert game data analyzer. Analyze this screenshot of an attack/demolition report.
Extract ALL visible player entries accurately.

RULES FOR EXTRACTION:
1. 'structure_name': the name of the attacked building (e.g. Capital, Stronghold, Temple, Gates, City, Town). This is usually located at the very top of the report in the header or title. Look carefully. Even if partially cut off or obscured, provide your best guess. Only return null if it is completely missing from the image.
2. 'structure_level': the integer level of the structure (e.g. "5" from "Lv.5"). Look closely at the header next to the structure name. Provide your best guess if partially obscured. Only return null if completely missing.
3. 'timestamp': the date/time shown, formatted strictly as 'YYYY-MM-DD HH:MM:SS'. If not visible, null.
4. 'start_time': the "Start Time" of the attack if clearly visible (e.g., "14:30"). If not visible, null.
5. 'players': an array of objects, each containing exactly two keys: 'name' and 'value'.
   - 'name' (string): Extract the player's FULL name exactly as written. INCLUDE any alliance tags (e.g., "[ABC]Player"), numbers, and special characters. Do NOT truncate or simplify.
   - 'value' (integer): Extract the Demolition damage score or points for the player. Remove any commas (e.g., convert "1,234,567" to 1234567). Only extract the demolition score, NOT troop counts or power levels.

CRITICAL JSON FORMATTING RULES:
- Output ONLY valid, raw JSON.
- Do NOT wrap the JSON in markdown blocks (no \`\`\`json).
- Do NOT include any commentary, explanations, or text outside the JSON object.

EXPECTED JSON SCHEMA:
{
  "structure_name": "Capital",
  "structure_level": "5",
  "timestamp": "2026-06-12 14:13:00",
  "start_time": "14:00",
  "players": [
    {"name": "[VTS]Lord_IKR", "value": 81357},
    {"name": "Gamer123", "value": 1500}
  ]
}`;

      let maxRetries = 3;
      let raw = null;
      let res = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          res = await fetch(QWEN_WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localKey}` },
            body: JSON.stringify({
              model: 'qwen-vl-plus',
              messages: [{ role: 'user', content: [
                { type: 'text', text: promptTxt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
              ]}]
            })
          });
          raw = await res.json();
          if (!res.ok) throw new Error(raw.error?.message || `Qwen API Error (HTTP ${res.status})`);
          break;
        } catch (err) {
          if (attempt === maxRetries) throw err;
          log(`Rate limit or network error, retrying (${attempt}/${maxRetries})...`, 'warn', f.name);
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }

      let text = raw.choices[0].message.content;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      data = tryRepairJson(text);

      const elapsed = ((performance.now() - before) / 1000).toFixed(1);
      const pCount = data.players ? data.players.length : 0;
      if (pCount < 10) {
        log(`Warning: Only ${pCount} players found. Check extraction logic. Snippet: ${text.substring(0, 50)}...`, 'warn', f.name);
      }
      log(`Successfully read screenshot ${i+1}/${valid.length} — ${data.structure_name || '?'} ${data.structure_level || '?'}, found ${pCount} players.`, 'success', f.name);
      allJson.push({ filename: f.name, json: data });

      if (data) {
        const progressiveParsed = parseOcrResults([{ filename: f.name, json: data }]);
        if (progressiveParsed) {
          await saveData(progressiveParsed);
          render();
        }
      }
    } catch (e) {
      log(`Network error: ${e.message}`, 'err', f.name);
    }
    $id('dashProgressFill').style.width = `${((i+1)/valid.length)*100}%`;
  }

  if (!allJson.length) { log(`No valid data extracted.`, 'err'); state._ocrProcessing = false; return; }

  log(`Analyzing and merging results...`, 'info');
  const parsed = parseOcrResults(allJson);

  if (parsed) {
    const mismatched = parsed.attacks.filter(att => {
      const val = validateTotalDemolition(att.structure_name, att.structure_level, att.total_demolition);
      return val && !val.match;
    });
    for (const att of mismatched) {
      const val = validateTotalDemolition(att.structure_name, att.structure_level, att.total_demolition);
      if (!val) continue;
      const shortfall = val.expected - att.total_demolition;
      const msg = `${att.structure_name} ${att.structure_level}: got ${(att.total_demolition||0).toLocaleString()} / expected ${val.expected.toLocaleString()} (missing ${shortfall.toLocaleString()}). All screenshots uploaded?`;
      log(`Confirm: ${msg}`, 'warn');
      if (confirm(`📊 ${msg}\n\nCancel = Missing data, wait for more uploads.\nOK = Ignore and save anyway.`)) {
        log(`User ignored missing data for ${att.structure_name} ${att.structure_level}.`, 'warn');
      } else {
        log(`Waiting for more uploads for ${att.structure_name} ${att.structure_level}.`, 'warn');
      }
    }
    saveData(parsed); render();
    log(`Success! ${parsed.attacks.length} sessions updated`, 'success');
    log(`Total players in leaderboard: ${parsed.players_summary.length}`, 'info');
    log(`Cloud sync status: ${getDb() ? 'active' : 'local-only'}`, 'info');
  } else log(`Failed to parse extracted reports.`, 'err');

  state._ocrProcessing = false; setTimeout(() => $id('dashProgress').classList.add('hidden'), 2000);
}

function normalizeStructureName(name) {
  if (!name) return name;
  let cleaned = name.trim().replace(/\s+unknown$/i, '');
  const corrections = { 'capita1': 'Capital', 'capitol': 'Capital', 'cates': 'Gates', 'gate5': 'Gates', 'cily': 'City', 'temp1e': 'Temple', 'tempi': 'Temple', 'strongho1d': 'Stronghold', 'ruln': 'Ruins', 'ruin5': 'Ruins', 'structure': 'Stronghold' };
  const lower = cleaned.toLowerCase().trim();
  return corrections[lower] || cleaned;
}

function fmtDate(d) { const p = n => String(n).padStart(2, '0'); const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}, ${days[d.getDay()]}, ${p(d.getHours())}:${p(d.getMinutes())} GT`; }

function displayGameTime(gt) {
  if (!gt) return '';
  const m = gt.match(/^(\d{4})-(\d{2})-(\d{2}),\s*(\d{2}:\d{2})$/);
  if (m) {
     const dt = new Date(+m[1], m[2]-1, +m[3]);
     const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
     return `${m[3]}/${m[2]}/${m[1]}, ${days[dt.getDay()]}, ${m[4]} GT`;
  }
  return gt.includes(',') ? gt : (gt.split(' ').slice(0,2).join(' ').replace(/-/g,'/') + ' GT');
}

function parseOcrResults(results) {
  const groups = [];
  for (const item of results) {
    const j = item.json;
    let dt = new Date();
    if (j.timestamp) {
       const m = j.timestamp.match(/(\d{4})[-./](\d{2})[-./](\d{2})\s+(\d{2})[-.:](\d{2})/);
       if (m) dt = new Date(+m[1], m[2]-1, +m[3], +m[4], +m[5]);
    }

    const sN = normalizeStructureName(j.structure_name) || null;
    let sL = j.structure_level ? String(j.structure_level).replace(/^(?:Lv|Level)\s*/i, '').trim() : null;
    if (sL) sL = 'Lv' + sL.replace(/[^0-9]/g, '');

    let start_time = j.start_time || null;

    let f = false;
    for (const g of groups) {
      const nameMatch = (!g.sN || !sN || getSimilarity(g.sN, sN) > 0.8);
      const levelMatch = (!g.sL || !sL || g.sL === sL);
      if (Math.abs(g.dt - dt) < 600000 && nameMatch && levelMatch) {
        if (j.players) g.players.push(...j.players);
        if (!g.sN && sN) g.sN = sN;
        if (!g.sL && sL) g.sL = sL;
        if (!g.start_time && start_time) g.start_time = start_time;
        f = true; break;
      }
    }
    if (!f) groups.push({ dt, sN, sL, start_time, players: j.players ? [...j.players] : [] });
  }

  log(`Grouped ${results.length} images into ${groups.length} session(s)`, 'info');

  const attacks = [];
  groups.forEach((g) => {
    let sN = g.sN || 'Structure';
    let sL = g.sL || 'Unknown';

    const pMap = new Map();
    g.players.forEach(p => {
      if (!p.name || !p.value) return;
      p.value = Number(p.value);
      const fuzzyMatch = [...pMap.values()].find(v => (getSimilarity(v.name, p.name) > 0.8 || getSimilarityAlphaNum(v.name, p.name) > 0.8) && Math.abs(v.value - p.value) <= 100);
      if (!fuzzyMatch) pMap.set(`${p.name}_${p.value}`, p);
      else if (pMap.get(`${fuzzyMatch.name}_${fuzzyMatch.value}`).value < p.value) {
         pMap.set(`${p.name}_${p.value}`, p);
         pMap.delete(`${fuzzyMatch.name}_${fuzzyMatch.value}`);
      }
    });

    const deduped = [...pMap.values()].sort((a,b) => b.value - a.value);
    deduped.forEach((p, rank) => p.rank = rank + 1);

    const id = `${sN.replace(/\s+/g,'_')}_${sL}_${g.dt.getTime()}`;
    if (deduped.length > 0) {
      attacks.push({
        id,
        game_time: displayGameTime(fmtDate(new Date(g.dt.getTime() + (g.dt.getTimezoneOffset() - 120) * 60000))),
        start_time: g.start_time || null,
        structure_name: sN,
        structure_level: sL,
        players: deduped,
        players_count: deduped.length,
        total_demolition: deduped.reduce((sum, p) => sum + p.value, 0)
      });
    }
  });

  const merged = state.dashData?.attacks ? Object.fromEntries(state.dashData.attacks.map(a => [a.id, a])) : {};
  attacks.forEach(a => {
    const ts = a.id.split('_').pop();
    const existing = Object.values(merged).find(x => x.id.split('_').pop() === ts);
    if (existing) {
       const pMap = new Map();
        existing.players.forEach(p => { p.value = Number(p.value); pMap.set(`${p.name}_${p.value}`, p); });
        a.players.forEach(p => {
          p.value = Number(p.value);
          const fuzzyMatch = [...pMap.values()].find(v => (getSimilarity(v.name, p.name) > 0.8 || getSimilarityAlphaNum(v.name, p.name) > 0.8) && Math.abs(v.value - p.value) <= 100);
         if (!fuzzyMatch) pMap.set(`${p.name}_${p.value}`, p);
       });
       existing.players = [...pMap.values()].sort((x,y) => y.value - x.value);
       existing.players.forEach((p,i) => p.rank = i+1);
       existing.players_count = existing.players.length;
       existing.total_demolition = existing.players.reduce((s,p) => s + p.value, 0);

       if (existing.structure_name.includes('Structure') && !a.structure_name.includes('Structure')) {
         existing.structure_name = a.structure_name;
         existing.structure_level = a.structure_level;
         const oldId = existing.id;
         existing.id = a.id;
         merged[a.id] = existing;
         delete merged[oldId];
       }
    } else {
       merged[a.id] = { ...a };
    }
  });

  const sorted = Object.values(merged).sort((a,b) => b.game_time.localeCompare(a.game_time));
  const sum = {}; sorted.forEach(a => {
    const seen = new Set();
    a.players.forEach(p => {
      const n = findBestMatch(p.name);
      if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [], unique_structures: new Set() };
      sum[n].total_demolition += p.value;
      if (!seen.has(n)) { sum[n].participation_count++; seen.add(n); sum[n].unique_structures.add((a.structure_name||'') + '_' + (a.structure_level||'')); }
      sum[n].attacks.push({ id: a.id, name: a.structure_name, structure_level: a.structure_level, game_time: a.game_time, val: p.value, rank: p.rank });
    });
  });

  return { last_updated: fmtDate(new Date()), total_attacks: sorted.length, attacks: sorted, players_summary: Object.values(sum).map(p => { p.unique_structures = p.unique_structures.size; return p; }).sort((a,b) => b.total_demolition - a.total_demolition) };
}

export { processFiles, normalizeStructureName, parseOcrResults, fmtDate, displayGameTime };
