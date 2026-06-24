import {
  state,
  $id,
  log,
  qwenVisionRequest,
  describeOcrRequestError,
  getOcrRetryDelayMs,
  isRetryableOcrRequestError,
  tryRepairJson,
  validateTotalDemolition,
  getProtectedPlayerIdentity,
  getSimilarity,
  getSimilarityAlphaNum,
  findBestMatch,
  resolvePlayerNameForAttack,
  formatStructureLabel,
  normalizeStructureLevelForName,
  normalizeStructureName,
  normalizeStructureTarget,
  getSupportedOcrImageFiles,
  describeRejectedOcrImageFiles,
  readOcrImageDataUrl
} from './ocr-shared.js';

async function saveParsedData(data, options = {}) {
  const { saveData } = await import('./ocr-dashboard.js');
  return saveData(data, options);
}

async function renderDashboard() {
  const { render } = await import('./ocr-render.js');
  render();
}

async function getCloudDb() {
  const { getDb } = await import('./firebase.js');
  return getDb();
}

function isSamePlayerForOcrDedup(existing, incoming) {
  const existingProtected = getProtectedPlayerIdentity(existing?.name);
  const incomingProtected = getProtectedPlayerIdentity(incoming?.name);
  if (existingProtected || incomingProtected) {
    return Boolean(existingProtected && incomingProtected && existingProtected === incomingProtected);
  }
  return getSimilarity(existing.name, incoming.name) > 0.8 || getSimilarityAlphaNum(existing.name, incoming.name) > 0.8;
}

async function processFiles(files) {
  if (state._ocrProcessing) { log('OCR is already running. Please wait...', 'warn'); return; }
  state._ocrProcessing = true;
  state._ocrCancelRequested = false;
  state._ocrAbortController = new AbortController();
  const valid = getSupportedOcrImageFiles(files);
  if (!valid.length) {
    const rejected = describeRejectedOcrImageFiles(files);
    log(
      rejected.length
        ? `No supported screenshots selected. Use PNG, JPG, or WebP images. Rejected: ${rejected.slice(0, 3).join(', ')}`
        : 'No screenshots selected.',
      'warn'
    );
    state._ocrProcessing = false;
    state._ocrAbortController = null;
    return;
  }

  $id('dashProgress').classList.remove('hidden');
  const cancelBtn = $id('dashCancelOcrBtn');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  $id('dashProgressFill').style.width = '0%';
  log(`Preparing to scan ${valid.length} screenshots...`, 'info');

  const allJson = [];
  for (let i = 0; i < valid.length; i++) {
    if (state._ocrCancelRequested) break;
    const f = valid[i];
    const startedAt = performance.now();
    $id('dashProgressText').textContent = `Scanning image ${i+1}/${valid.length} - preparing...`;
    const imageUrl = await readOcrImageDataUrl(f);

    try {
      const before = performance.now();
      let data = null;

      const promptTxt = `You are an expert game data analyzer. Analyze this screenshot of an attack/demolition report.
Extract ALL visible player entries accurately.

RULES FOR EXTRACTION:
1. 'structure_name': the name of the attacked building (e.g. Capital, Stronghold, Temple, Gates, City, Town, Check Point). This is usually located at the very top of the report in the header or title. Look carefully. Even if partially cut off or obscured, provide your best guess. Only return null if it is completely missing from the image.
2. 'structure_level': the integer level of the structure (e.g. "5" from "Lv.5"). Stronghold is name-only, so return null for Stronghold even if the UI implies a level. Check Point means Gates in our terminology, except level 1 Check Point should be Bridge Lv1. Town Lv4 / Town 4 should be treated as Large Town Lv4. For every other structure, look closely at the header next to the structure name and provide your best guess if partially obscured. Only return null if completely missing.
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
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (state._ocrCancelRequested) throw new DOMException('OCR cancelled', 'AbortError');
        try {
          $id('dashProgressText').textContent = `Scanning image ${i+1}/${valid.length} - Qwen OCR attempt ${attempt}/${maxRetries}...`;
          raw = await qwenVisionRequest([{ role: 'user', content: [
            { type: 'text', text: promptTxt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]}], { signal: state._ocrAbortController?.signal });
          break;
        } catch (err) {
          if (err?.name === 'AbortError' || state._ocrCancelRequested) throw err;
          if (attempt === maxRetries || !isRetryableOcrRequestError(err)) throw err;
          const delayMs = getOcrRetryDelayMs(err, attempt);
          const delaySeconds = Math.max(1, Math.ceil(delayMs / 1000));
          log(`Qwen request failed: ${describeOcrRequestError(err)}. Retrying in ${delaySeconds}s (${attempt}/${maxRetries})...`, 'warn', f.name);
          await new Promise(r => setTimeout(r, delayMs));
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
      const structureLabel = formatStructureLabel(data.structure_name || '?', data.structure_level || '');
      log(`Successfully read screenshot ${i+1}/${valid.length} — ${structureLabel}, found ${pCount} players in ${elapsed}s.`, 'success', f.name);
      allJson.push({ filename: f.name, json: data });

      if (data) {
        const progressiveParsed = parseOcrResults([{ filename: f.name, json: data }]);
        if (progressiveParsed) {
          await saveParsedData(progressiveParsed, { cloud: false });
          await renderDashboard();
        }
      }
    } catch (e) {
      if (e?.name === 'AbortError' || state._ocrCancelRequested) {
        log(`OCR cancelled after ${i}/${valid.length} screenshots.`, 'warn');
        break;
      }
      log(`OCR error: ${describeOcrRequestError(e)}`, 'error', f.name);
    }
    const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
    $id('dashProgressText').textContent = `Finished image ${i+1}/${valid.length} in ${elapsed}s`;
    $id('dashProgressFill').style.width = `${((i+1)/valid.length)*100}%`;
  }

  if (state._ocrCancelRequested) {
    state._ocrProcessing = false;
    state._ocrAbortController = null;
    if (cancelBtn) cancelBtn.classList.add('hidden');
    setTimeout(() => $id('dashProgress').classList.add('hidden'), 800);
    return;
  }

  if (!allJson.length) {
    log(`No valid data extracted.`, 'error');
    state._ocrProcessing = false;
    state._ocrAbortController = null;
    if (cancelBtn) cancelBtn.classList.add('hidden');
    return;
  }

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
      const msg = `${formatStructureLabel(att.structure_name, att.structure_level)}: got ${(att.total_demolition||0).toLocaleString()} / expected ${val.expected.toLocaleString()} (missing ${shortfall.toLocaleString()}). All screenshots uploaded?`;
      log(`⚠ ${msg} — auto-saved. Check terminal for details.`, 'warn');
    }
    await saveParsedData(parsed, { immediate: true, awaitCloud: true });
    await renderDashboard();
    log(`Success! ${parsed.attacks.length} sessions updated`, 'success');
    log(`Total players in leaderboard: ${parsed.players_summary.length}`, 'info');
    log(`Cloud sync status: ${(await getCloudDb()) ? 'active' : 'local-only'}`, 'info');
  } else log(`Failed to parse extracted reports.`, 'error');

  state._ocrProcessing = false;
  state._ocrAbortController = null;
  if (cancelBtn) cancelBtn.classList.add('hidden');
  setTimeout(() => $id('dashProgress').classList.add('hidden'), 2000);
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

    const rawStructureName = j.structure_name || null;
    const rawStructureLevel = j.structure_level || '';
    const target = normalizeStructureTarget(rawStructureName, rawStructureLevel);
    const sN = target.structure_name || null;
    const sL = target.structure_level || '';

    let start_time = j.start_time || null;

    let f = false;
    for (const g of groups) {
      const nameMatch = (!g.sN || !sN || getSimilarity(g.sN, sN) > 0.8);
      const levelMatch = (!g.sL || !sL || g.sL === sL);
      if (Math.abs(g.dt - dt) < 600000 && nameMatch && levelMatch) {
        if (j.players) g.players.push(...j.players);
        if (!g.sN && sN) g.sN = sN;
        if (!g.sL && sL) g.sL = sL;
        if ((!g.rawStructureName || /^structure$/i.test(String(g.rawStructureName))) && rawStructureName) g.rawStructureName = rawStructureName;
        if (!g.rawStructureLevel && rawStructureLevel) g.rawStructureLevel = rawStructureLevel;
        if (!g.start_time && start_time) g.start_time = start_time;
        f = true; break;
      }
    }
    if (!f) groups.push({
      dt,
      sN,
      sL,
      rawStructureName,
      rawStructureLevel,
      start_time,
      players: j.players ? [...j.players] : []
    });
  }

  log(`Grouped ${results.length} images into ${groups.length} session(s)`, 'info');

  const attacks = [];
  groups.forEach((g) => {
    let sN = g.sN || 'Structure';
    let sL = g.sL || '';

    const pMap = new Map();
    g.players.forEach(p => {
      if (!p.name || !p.value) return;
      p.value = Number(p.value);
      const fuzzyMatch = [...pMap.values()].find(v => isSamePlayerForOcrDedup(v, p) && Math.abs(v.value - p.value) <= 100);
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
        raw_structure_name: g.rawStructureName || sN,
        raw_structure_level: g.rawStructureLevel || sL,
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
          const fuzzyMatch = [...pMap.values()].find(v => isSamePlayerForOcrDedup(v, p) && Math.abs(v.value - p.value) <= 100);
         if (!fuzzyMatch) pMap.set(`${p.name}_${p.value}`, p);
       });
       existing.players = [...pMap.values()].sort((x,y) => y.value - x.value);
       existing.players.forEach((p,i) => p.rank = i+1);
       existing.players_count = existing.players.length;
       existing.total_demolition = existing.players.reduce((s,p) => s + p.value, 0);

       if (existing.structure_name.includes('Structure') && !a.structure_name.includes('Structure')) {
         existing.structure_name = a.structure_name;
         existing.structure_level = a.structure_level;
         existing.raw_structure_name = a.raw_structure_name || a.structure_name;
         existing.raw_structure_level = a.raw_structure_level || a.structure_level;
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
    const players = a.players || [];
    players.forEach(p => {
      const displayName = resolvePlayerNameForAttack(p, players);
      const n = displayName || findBestMatch(p.name) || String(p.name || '').trim() || 'Unknown Player';
      if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [], unique_structures: new Set() };
      sum[n].total_demolition += p.value;
      const level = normalizeStructureLevelForName(a.structure_name, a.structure_level);
      if (!seen.has(n)) { sum[n].participation_count++; seen.add(n); sum[n].unique_structures.add((a.structure_name||'') + '_' + level); }
      sum[n].attacks.push({
        id: a.id,
        name: a.structure_name,
        structure_name: a.structure_name,
        structure_level: level,
        raw_structure_name: a.raw_structure_name,
        raw_structure_level: a.raw_structure_level,
        game_time: a.game_time,
        player_name: n,
        display_player_name: displayName,
        raw_player_name: p.name || '',
        val: p.value,
        rank: p.rank
      });
    });
  });

  return {
    last_updated: fmtDate(new Date()),
    total_attacks: sorted.length,
    attacks: sorted,
    players_summary: Object.values(sum).map(p => {
      const uniqueCount = p.unique_structures.size;
      return {
        ...p,
        unique_structures: uniqueCount,
        unique_structures_count: uniqueCount,
      };
    }).sort((a,b) => b.total_demolition - a.total_demolition)
  };
}

export { processFiles, normalizeStructureName, normalizeStructureTarget, parseOcrResults, fmtDate, displayGameTime };
