// Combos Planner page. Loads the combo database from the local planner server,
// lets you place X8 lanes between the fixed S0-X2 lanes, and saves the result
// back to js/combos-db.js. Run with: npm run combos:plan
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const slug = (heroes, skin) =>
    'n-' +
    heroes
      .map((n) =>
        n
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )
      .join('_') +
    (skin ? '-' + skin : '');

  let H = {};
  let BASE = [];
  let baseIndex = new Map();
  let lanes = new Map();
  let holding = null;
  let trayMode = 'unplaced';
  let dirty = false;

  const isX8Hero = (n) => H[n] && H[n].s === 'X8';
  const tierOf = (note) => {
    const m = /([SABCD]) tier \(source score ([\d.]+)\)/.exec(note || '');
    return m ? { tier: m[1], score: Number(m[2]) } : { tier: '', score: null };
  };

  function load(data) {
    H = data.heroes;
    BASE = data.base;
    baseIndex = new Map(BASE.map((b, i) => [b.id, i]));
    lanes = new Map();
    const slots = new Map();
    for (const l of data.x8) {
      const n = (slots.get(l.anchor) || 0) + 1;
      slots.set(l.anchor, n);
      lanes.set(l.id, { ...l, ...tierOf(l.note), slot: n, added: !!l.queued });
    }
    $('heroNames').innerHTML = Object.keys(H)
      .sort()
      .map((n) => '<option value="' + esc(n) + '"></option>')
      .join('');
    setDirty(false);
    render();
    if (data.skipped && data.skipped.length) {
      setStatus('Skipped in x8-queue.json: ' + data.skipped.join('; '));
      return true;
    }
    return false;
  }

  function setDirty(value) {
    dirty = value;
    $('dirty').hidden = !value;
    $('saveBtn').disabled = !value;
    $('revertBtn').disabled = !value;
  }
  function setStatus(msg) {
    $('status').textContent = msg;
  }

  const allLanes = () => [...lanes.values()];
  const hasPaid = (heroes) => heroes.some((n) => H[n] && H[n].p);
  function rowClass(heroes) {
    return ' troop-' + troopOf(heroes) + (hasPaid(heroes) ? ' paid' : ' free');
  }
  function kindBadge(heroes) {
    return hasPaid(heroes)
      ? '<span class="kind paid" title="Uses at least one paid hero">Paid</span>'
      : '<span class="kind free" title="Free heroes only">Free</span>';
  }
  function troopOf(heroes) {
    const t = new Set(heroes.map((n) => H[n] && H[n].t).filter((x) => x && x !== 'All'));
    return t.size === 1 ? [...t][0] : t.size === 0 ? 'All' : 'Mixed';
  }

  function merged(excludeId) {
    const by = new Map();
    for (const l of allLanes()) {
      if (!l.anchor || l.id === excludeId) continue;
      if (!by.has(l.anchor)) by.set(l.anchor, []);
      by.get(l.anchor).push(l);
    }
    for (const arr of by.values()) arr.sort((x, y) => x.slot - y.slot);
    const out = [];
    BASE.forEach((b, i) => {
      for (const l of by.get(b.id) || []) out.push({ type: 'x8', lane: l, above: i + 1 });
      out.push({ type: 'base', b, rank: i + 1 });
    });
    return out;
  }

  // Where a lane lands when dropped in the gap before list[j] (j === length: unplaced tail).
  function placementAt(list, j) {
    if (j >= list.length) return { anchor: '', slot: 0 };
    const e = list[j];
    const prev = list[j - 1];
    if (e.type === 'base') {
      const slot =
        prev && prev.type === 'x8' && prev.lane.anchor === e.b.id ? prev.lane.slot + 1 : 1;
      return { anchor: e.b.id, slot };
    }
    const slot =
      prev && prev.type === 'x8' && prev.lane.anchor === e.lane.anchor
        ? (prev.lane.slot + e.lane.slot) / 2
        : e.lane.slot - 1;
    return { anchor: e.lane.anchor, slot };
  }

  function update(id, patch) {
    lanes.set(id, { ...lanes.get(id), ...patch });
    setDirty(true);
    setStatus('Not saved yet. Press Save to write js/combos-db.js.');
    render();
  }

  function placeHolding(j) {
    if (!holding) return;
    const id = holding;
    const p = placementAt(merged(id), j);
    stopHolding();
    update(id, p);
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-row="' + CSS.escape(id) + '"]');
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }
    });
  }
  function startHolding(id) {
    holding = id;
    document.body.classList.add('placing');
    $('banner').hidden = false;
    $('bannerText').textContent =
      'Placing ' + lanes.get(id).heroes.join(' / ') + ': tap the gap where it belongs.';
    render();
  }
  function stopHolding() {
    holding = null;
    document.body.classList.remove('placing');
    $('banner').hidden = true;
    render();
  }
  function moveBy(id, delta) {
    const list = merged(id);
    const k = merged().findIndex((e) => e.type === 'x8' && e.lane.id === id);
    const j = Math.max(0, Math.min(list.length - 1, k + (delta < 0 ? -1 : 1)));
    update(id, placementAt(list, j));
  }

  function heroHtml(n) {
    const h = H[n] || {};
    return (
      '<span class="hero' +
      (h.s === 'X8' ? ' isx8' : '') +
      '">' +
      (h.i
        ? '<img class="portrait" src="' +
          esc(h.i) +
          '" alt="" loading="lazy" width="32" height="32">'
        : '') +
      '<span class="dot ' +
      esc(h.t || 'All') +
      '" title="' +
      esc(h.t || '') +
      '"></span>' +
      esc(n) +
      (h.p ? ' <span class="chip paid" title="Paid hero">$</span>' : '') +
      '</span>'
    );
  }
  function lineupHtml(heroes, skin) {
    return (
      '<div class="lineup">' +
      heroes.map(heroHtml).join('<span class="sep">/</span>') +
      (skin
        ? ' <span class="chip skin" title="Skin code: 3 must, 2 recommended, 1 optional">skin ' +
          esc(skin) +
          '</span>'
        : '') +
      '</div>'
    );
  }

  function visibleSet(full) {
    const q = $('listSearch').value.trim().toLowerCase();
    const troop = $('troop').value;
    const near = $('near').value === 'near';
    const match = (heroes) =>
      (!q || heroes.some((n) => n.toLowerCase().includes(q))) &&
      (!troop || troopOf(heroes) === troop) &&
      (!$('cost').value || ($('cost').value === 'paid') === hasPaid(heroes));
    const vis = full.map((e) => match(e.type === 'x8' ? e.lane.heroes : e.b.heroes));
    if (!near) return vis;
    const keep = full.map(() => false);
    full.forEach((e, i) => {
      if (e.type === 'x8') for (let d = -4; d <= 4; d++) if (full[i + d]) keep[i + d] = true;
    });
    return vis.map((v, i) => v && keep[i]);
  }

  function renderList() {
    const full = merged();
    const list = holding ? merged(holding) : full;
    const indexIn = new Map(list.map((e, i) => [e.type === 'base' ? e.b.id : e.lane.id, i]));
    const vis = visibleSet(full);
    const parts = [];
    let shown = 0;
    full.forEach((e, i) => {
      if (!vis[i]) return;
      shown++;
      const key = e.type === 'base' ? e.b.id : e.lane.id;
      if (indexIn.has(key)) {
        parts.push(
          '<button type="button" class="gap" data-gap="' +
            indexIn.get(key) +
            '" aria-label="Place here"><span>Place here</span></button>'
        );
      }
      if (e.type === 'base') {
        parts.push(
          '<div class="row base' +
            rowClass(e.b.heroes) +
            '"><div class="rank">#' +
            e.rank +
            '</div>' +
            lineupHtml(e.b.heroes, e.b.skin) +
            '<div class="actions">' +
            kindBadge(e.b.heroes) +
            '</div></div>'
        );
        return;
      }
      const l = e.lane;
      parts.push(
        '<div class="row x8' +
          rowClass(l.heroes) +
          (l.id === holding ? ' holding' : '') +
          '" draggable="true" tabindex="0" data-row="' +
          esc(l.id) +
          '">' +
          '<div class="rank">X8<br><small>above #' +
          e.above +
          '</small></div>' +
          lineupHtml(l.heroes, l.skin) +
          '<div class="actions">' +
          kindBadge(l.heroes) +
          '<button type="button" data-up="' +
          esc(l.id) +
          '" aria-label="Move up">▲</button>' +
          '<button type="button" data-down="' +
          esc(l.id) +
          '" aria-label="Move down">▼</button>' +
          '<button type="button" data-move="' +
          esc(l.id) +
          '">Move</button>' +
          '<button type="button" data-unplace="' +
          esc(l.id) +
          '">Unplace</button></div></div>'
      );
    });
    parts.push(
      '<button type="button" class="gap" data-gap="' +
        list.length +
        '" aria-label="Leave unplaced in the X8 block"><span>Leave in the X8 block at the end</span></button>'
    );
    $('list').innerHTML = shown
      ? parts.join('')
      : '<div class="empty">No lineups match these filters.</div>';
  }

  function renderTray() {
    const q = $('traySearch').value.trim().toLowerCase();
    const aboveOf = new Map(
      merged()
        .filter((e) => e.type === 'x8')
        .map((e) => [e.lane.id, e.above])
    );
    let items = allLanes().filter((l) =>
      trayMode === 'all' ? true : trayMode === 'placed' ? !!l.anchor : !l.anchor
    );
    if (q) items = items.filter((l) => l.heroes.some((n) => n.toLowerCase().includes(q)));
    items.sort((a, b) => b.added - a.added || (b.score ?? 0) - (a.score ?? 0));
    $('cards').innerHTML = items.length
      ? items
          .map((l) => {
            const placed = !!l.anchor;
            const where = placed
              ? 'above #' + aboveOf.get(l.id)
              : l.queued
                ? 'in x8-queue.json'
                : l.added
                  ? 'new, not saved'
                  : 'in the X8 block';
            return (
              '<div class="card' +
              rowClass(l.heroes) +
              (placed ? ' placed' : '') +
              (l.id === holding ? ' holding' : '') +
              '" draggable="true" data-card="' +
              esc(l.id) +
              '">' +
              lineupHtml(l.heroes, l.skin) +
              '<div class="meta">' +
              (l.tier
                ? '<span class="chip tier" title="ROC Academy tier and score">' +
                  esc(l.tier) +
                  (l.score != null ? ' · ' + l.score : '') +
                  '</span>'
                : '') +
              (l.added ? '<span class="chip">new</span>' : '') +
              '<span>' +
              where +
              '</span><span style="flex:1"></span>' +
              (placed ? '<button type="button" data-show="' + esc(l.id) + '">Show</button>' : '') +
              '<button type="button" data-move="' +
              esc(l.id) +
              '">' +
              (placed ? 'Move' : 'Place') +
              '</button>' +
              (l.added
                ? '<button type="button" data-delete="' + esc(l.id) + '">Delete</button>'
                : '') +
              '</div></div>'
            );
          })
          .join('')
      : '<div class="empty">' +
        (trayMode === 'unplaced' ? 'Every X8 lineup is placed.' : 'Nothing here yet.') +
        '</div>';
  }

  function renderStats() {
    const all = allLanes();
    const placed = all.filter((l) => l.anchor).length;
    $('stats').innerHTML =
      '<div class="stat"><b>' +
      BASE.length +
      '</b><span>S0–X2 lineups (fixed)</span></div>' +
      '<div class="stat"><b>' +
      placed +
      '</b><span>X8 placed</span></div>' +
      '<div class="stat"><b>' +
      (all.length - placed) +
      '</b><span>X8 in the end block</span></div>';
  }

  function render() {
    renderStats();
    renderTray();
    renderList();
  }

  async function save() {
    const order = [
      ...merged()
        .filter((e) => e.type === 'x8')
        .map((e) => ({ id: e.lane.id, anchor: e.lane.anchor })),
      ...allLanes()
        .filter((l) => !l.anchor)
        .map((l) => ({ id: l.id, anchor: '' })),
    ];
    const added = allLanes()
      .filter((l) => l.added)
      .map((l) => ({ id: l.id, heroes: l.heroes, skin: l.skin }));
    $('saveBtn').disabled = true;
    setStatus('Saving…');
    try {
      const res = await fetch('/api/combos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ order, added }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'save failed');
      if (!load(data))
        setStatus(
          'Saved js/combos-db.js and x8-queue.json. Check them with git diff, then commit and push.'
        );
    } catch (err) {
      $('saveBtn').disabled = false;
      setStatus('Not saved: ' + err.message);
    }
  }

  async function fetchCombos() {
    setStatus('Loading js/combos-db.js…');
    try {
      const res = await fetch('/api/combos', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'load failed');
      if (!load(data)) {
        const queued = data.x8.filter((l) => l.queued).length;
        setStatus(
          'Loaded ' +
            data.base.length +
            ' S0–X2 and ' +
            data.x8.length +
            ' X8 lineups (' +
            queued +
            ' from x8-queue.json).'
        );
      }
    } catch (err) {
      setStatus(
        'Could not load the combo database: ' +
          err.message +
          '. Is npm run combos:plan still running?'
      );
    }
  }

  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (d.gap != null) return placeHolding(Number(d.gap));
    if (d.move) return holding === d.move ? stopHolding() : startHolding(d.move);
    if (d.up) return moveBy(d.up, -1);
    if (d.down) return moveBy(d.down, 1);
    if (d.unplace) return update(d.unplace, { anchor: '', slot: 0 });
    if (d.show) {
      $('listSearch').value = '';
      $('troop').value = '';
      $('cost').value = '';
      $('near').value = 'all';
      renderList();
      const el = document.querySelector('[data-row="' + CSS.escape(d.show) + '"]');
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus({ preventScroll: true });
      }
      return;
    }
    if (d.delete) {
      lanes.delete(d.delete);
      setDirty(true);
      return render();
    }
    if (d.tray) {
      trayMode = d.tray;
      document
        .querySelectorAll('[data-tray]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      renderTray();
    }
  });
  // A portrait that fails to load shows the site's placeholder instead of a broken image.
  document.addEventListener(
    'error',
    (ev) => {
      const img = ev.target;
      if (
        img instanceof HTMLImageElement &&
        img.classList.contains('portrait') &&
        !img.dataset.fallback
      ) {
        img.dataset.fallback = '1';
        img.src = '/images/heroes/portrait-unavailable.svg';
      }
    },
    true
  );
  $('cancelPlace').addEventListener('click', stopHolding);
  $('saveBtn').addEventListener('click', save);
  $('revertBtn').addEventListener('click', fetchCombos);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && holding) stopHolding();
  });
  ['listSearch', 'troop', 'cost', 'near'].forEach((id) =>
    $(id).addEventListener('input', renderList)
  );
  $('traySearch').addEventListener('input', renderTray);
  window.addEventListener('beforeunload', (ev) => {
    if (dirty) ev.preventDefault();
  });

  let dropped = false;
  document.addEventListener('dragstart', (ev) => {
    const src = ev.target.closest('[data-card],[data-row]');
    if (!src) return;
    dropped = false;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', src.dataset.card || src.dataset.row);
    startHolding(src.dataset.card || src.dataset.row);
  });
  document.addEventListener('dragover', (ev) => {
    const g = ev.target.closest('.gap');
    if (!g || !holding) return;
    ev.preventDefault();
    document.querySelectorAll('.gap.over').forEach((x) => x !== g && x.classList.remove('over'));
    g.classList.add('over');
  });
  document.addEventListener('dragleave', (ev) => {
    const g = ev.target.closest('.gap');
    if (g) g.classList.remove('over');
  });
  document.addEventListener('drop', (ev) => {
    const g = ev.target.closest('.gap');
    if (!g || !holding) return;
    ev.preventDefault();
    dropped = true;
    placeHolding(Number(g.dataset.gap));
  });
  document.addEventListener('dragend', () => {
    if (!dropped && holding) stopHolding();
  });

  $('addForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const find = (v) => Object.keys(H).find((n) => n.toLowerCase() === v.trim().toLowerCase());
    const raw = [$('addFront').value, $('addMiddle').value, $('addBack').value];
    const heroes = raw.map(find);
    const msg = $('addMsg');
    const bad = raw.filter((v, i) => !heroes[i]);
    if (bad.length)
      return (msg.textContent =
        'Unknown hero: ' +
        bad.map((v) => v || '(empty)').join(', ') +
        '. Pick names from the list.');
    if (new Set(heroes).size < 3)
      return (msg.textContent = 'A lineup needs three different heroes.');
    if (!heroes.some(isX8Hero))
      return (msg.textContent = 'This lineup has no X8 hero, so it belongs in the S0–X2 list.');
    const skin = $('addSkin').value.trim();
    if (skin && !/^[123]{3}$/.test(skin))
      return (msg.textContent = 'Skin code is three digits of 1, 2 or 3, e.g. 222.');
    const key = heroes.join('|') + '#' + skin;
    if (
      allLanes().some((l) => l.heroes.join('|') + '#' + (l.skin || '') === key) ||
      BASE.some((b) => b.heroes.join('|') + '#' + (b.skin || '') === key)
    ) {
      return (msg.textContent = 'That lineup is already in the database.');
    }
    const id = slug(heroes, skin);
    lanes.set(id, {
      id,
      heroes,
      skin,
      note: '',
      tier: '',
      score: null,
      anchor: '',
      slot: 0,
      added: true,
    });
    ['addFront', 'addMiddle', 'addBack', 'addSkin'].forEach((f) => ($(f).value = ''));
    msg.textContent = 'Added. Place it now, or Save to keep it in x8-queue.json for later.';
    setDirty(true);
    trayMode = 'unplaced';
    document
      .querySelectorAll('[data-tray]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tray === 'unplaced')));
    render();
  });

  fetchCombos();
})();
