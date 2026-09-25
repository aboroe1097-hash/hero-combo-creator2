// js/admin-combos.js
// Combos admin tab (Beta): the shipped combo ranking plus the new lineups waiting
// at the end of it, with the same troop / paid / tier filters the local planner
// uses, and the hero-overlap check that answers "is this lineup already covered?".
//
// This tab reads js/combos-db.js, which ships with the site, so it cannot place or
// edit a lineup yet: that still happens in the local planner (npm run combos:plan)
// and lands as a reviewed commit. The tab exists so an admin can see and audit the
// live list, and so the next phase has its read side ready.

import { allHeroesData } from './heroes-data.js';
import { rankedCombos } from './combos-db.js';
import {
  hasPaid,
  matchOf,
  tierOf,
  troopIcon,
  troopOf,
  TROOP_LABEL,
} from './combo-lanes.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function heroTable() {
  const H = {};
  for (const hero of allHeroesData) {
    H[hero.name] = { s: hero.season, t: hero.Type, p: hero.State === 'Paid' ? 1 : 0 };
  }
  return H;
}

/**
 * Splits the shipped ranking the way the planner server does: a lineup is "new"
 * when one of its heroes belongs to the X8 season, and a new lineup sits above the
 * first current lineup that follows it (or at the end when none does). Ids mirror
 * the planner contract (b0… / x0…), so anything copied here matches the planner.
 */
function readRanking(H) {
  const isNew = (combo) => combo.heroes.some((name) => H[name] && H[name].s === 'X8');
  const lastCurrent = rankedCombos.map((combo) => !isNew(combo)).lastIndexOf(true);
  const current = [];
  const lanes = [];
  let pending = [];
  rankedCombos.forEach((combo, index) => {
    const lane = { heroes: combo.heroes, skin: combo.skin || '', note: combo.note || '' };
    if (!isNew(combo)) {
      const entry = { id: `b${current.length}`, ...lane, rank: current.length + 1 };
      current.push(entry);
      pending.forEach((above) => {
        above.anchor = entry.id;
        above.rank = entry.rank;
      });
      pending = [];
      return;
    }
    const fresh = { id: `x${lanes.length}`, ...lane, ...tierOf(combo.note), anchor: '', rank: 0 };
    lanes.push(fresh);
    if (index < lastCurrent) pending.push(fresh);
  });
  return {
    current,
    placed: lanes.filter((lane) => lane.anchor),
    atEnd: lanes.filter((lane) => !lane.anchor),
    all: [...current, ...lanes],
  };
}

function heroChips(heroes, H) {
  return heroes
    .map((name) => {
      const hero = H[name] || {};
      const troop = hero.t || 'All';
      return (
        '<span class="ac-hero' +
        (hero.s === 'X8' ? ' is-new' : '') +
        '" title="' +
        escapeHtml(name + ' — ' + (TROOP_LABEL[troop] || troop) + (hero.p ? ', paid hero' : '')) +
        '"><span class="ac-troop ' +
        escapeHtml(troop) +
        '">' +
        troopIcon(troop, 16) +
        '</span>' +
        escapeHtml(name) +
        '</span>'
      );
    })
    .join('<span class="ac-sep">/</span>');
}

const badge = (heroes, H) =>
  hasPaid(heroes, H)
    ? '<span class="ac-badge paid">Paid</span>'
    : '<span class="ac-badge free">Free</span>';

const overlapChip = (match) =>
  match.sameTrio
    ? '<span class="ac-badge same" title="Already uses these three heroes">same trio</span>'
    : '<span class="ac-badge match">' + match.shared + ' same</span>';

/**
 * Renders the Combos tab into the provided mount point.
 *
 * @param {HTMLElement} mount The DOM container to render into.
 */
export function renderCombos(mount) {
  if (!mount) return;
  const H = heroTable();
  const view = readRanking(H);
  const byId = new Map(view.all.map((lane) => [lane.id, lane]));
  let selected = null;

  mount.innerHTML =
    '<section class="admin-combos" aria-label="Combos">' +
    '<header class="ac-head">' +
    '<h2 class="ac-title">Combos <span class="ac-tag">Beta</span></h2>' +
    '<p class="ac-copy">The ranking that ships in <code>js/combos-db.js</code>. Placing and editing happen in the local planner (<code>npm run combos:plan</code>) and land as a reviewed commit, so this tab shows the live list and answers whether a new lineup is already covered.</p>' +
    '<div class="ac-stats" id="acStats"></div>' +
    '</header>' +
    '<div class="ac-controls">' +
    '<input type="search" id="acSearch" class="ac-input" placeholder="Search hero" aria-label="Search lineups by hero">' +
    '<select id="acTroop" class="ac-input" aria-label="Troop"><option value="">All troops</option><option value="Cavalry">Cavalry</option><option value="Archers">Archers</option><option value="Footmen">Footmen</option><option value="Mixed">Mixed</option></select>' +
    '<select id="acCost" class="ac-input" aria-label="Paid or free"><option value="">Paid and free</option><option value="free">Free heroes only</option><option value="paid">Has a paid hero</option></select>' +
    '<select id="acTier" class="ac-input" aria-label="Tier"><option value="">All tiers</option><option value="S">S tier</option><option value="A">A tier</option><option value="B">B tier</option><option value="C">C tier</option><option value="none">No tier yet</option></select>' +
    '<select id="acSort" class="ac-input" aria-label="Sort new lineups"><option value="position">End order</option><option value="score">Source score</option><option value="tier">Tier</option><option value="name">Name</option></select>' +
    '<button type="button" class="ac-btn" id="acClear" hidden>Clear filters</button>' +
    '</div>' +
    '<p class="ac-summary" id="acSummary"></p>' +
    '<div class="ac-lists">' +
    '<section class="ac-panel"><h3>Current lineups</h3><div class="ac-list" id="acCurrent"></div></section>' +
    '<section class="ac-panel"><h3>New lineups</h3><div class="ac-list" id="acNew"></div></section>' +
    '</div>' +
    '<div class="ac-foot">' +
    '<button type="button" class="ac-btn" id="acCopyCurrent">Copy current list (JSON)</button>' +
    '<button type="button" class="ac-btn" id="acCopyNew">Copy new lineups (JSON)</button>' +
    '<span class="ac-note" id="acNote" role="status" aria-live="polite"></span>' +
    '</div>' +
    '</section>';

  const $ = (id) => mount.querySelector('#' + id);

  function matches(heroes, tier) {
    const q = $('acSearch').value.trim().toLowerCase();
    if (q && !heroes.some((name) => name.toLowerCase().includes(q))) return false;
    const troop = $('acTroop').value;
    if (troop && troopOf(heroes, H) !== troop) return false;
    const cost = $('acCost').value;
    if (cost === 'paid' && !hasPaid(heroes, H)) return false;
    if (cost === 'free' && hasPaid(heroes, H)) return false;
    const wanted = $('acTier').value;
    if (wanted === 'none' && tier) return false;
    if (wanted && wanted !== 'none' && tier !== wanted) return false;
    return true;
  }

  function drawStats() {
    $('acStats').innerHTML =
      '<span class="ac-stat"><b>' +
      view.current.length +
      '</b> current lineups</span>' +
      '<span class="ac-stat"><b>' +
      view.placed.length +
      '</b> new lineups placed inside</span>' +
      '<span class="ac-stat"><b>' +
      view.atEnd.length +
      '</b> new lineups at the end</span>';
  }

  function drawLists() {
    const current = view.current.filter((lane) => matches(lane.heroes, ''));
    const fresh = view.atEnd
      .filter((lane) => matches(lane.heroes, lane.tier))
      .sort((a, b) => {
        const sort = $('acSort').value;
        if (sort === 'name') return a.heroes.join(' ').localeCompare(b.heroes.join(' '));
        if (sort === 'tier')
          return (a.tier || 'Z').localeCompare(b.tier || 'Z') || (b.score ?? 0) - (a.score ?? 0);
        if (sort === 'score') return (b.score ?? -1) - (a.score ?? -1);
        return view.atEnd.indexOf(a) - view.atEnd.indexOf(b);
      });
    $('acClear').hidden = !($('acSearch').value || $('acTroop').value || $('acCost').value || $('acTier').value);
    $('acSummary').textContent =
      current.length +
      ' of ' +
      view.current.length +
      ' current · ' +
      fresh.length +
      ' of ' +
      view.atEnd.length +
      ' new';
    $('acCurrent').innerHTML = current.length
      ? current
          .map(
            (lane) =>
              '<div class="ac-row base troop-' +
              troopOf(lane.heroes, H) +
              '" data-lane="' +
              escapeHtml(lane.id) +
              '"><span class="ac-rank">#' +
              lane.rank +
              '</span><span class="ac-lineup">' +
              heroChips(lane.heroes, H) +
              (lane.skin ? ' <span class="ac-chip">skin ' + escapeHtml(lane.skin) + '</span>' : '') +
              '</span><span class="ac-actions">' +
              badge(lane.heroes, H) +
              '</span></div>'
          )
          .join('')
      : '<p class="ac-empty">No current lineup matches these filters.</p>';
    $('acNew').innerHTML = fresh.length
      ? fresh
          .map(
            (lane) =>
              '<button type="button" class="ac-row new troop-' +
              troopOf(lane.heroes, H) +
              (selected === lane.id ? ' selected' : '') +
              '" data-lane="' +
              escapeHtml(lane.id) +
              '" aria-pressed="' +
              (selected === lane.id ? 'true' : 'false') +
              '"><span class="ac-rank">' +
              (lane.anchor ? 'above #' + lane.rank : 'end') +
              '</span><span class="ac-lineup">' +
              heroChips(lane.heroes, H) +
              (lane.skin ? ' <span class="ac-chip">skin ' + escapeHtml(lane.skin) + '</span>' : '') +
              '</span><span class="ac-actions">' +
              (lane.tier
                ? '<span class="ac-chip tier">' +
                  escapeHtml(lane.tier) +
                  (lane.score != null ? ' · ' + lane.score : '') +
                  '</span>'
                : '') +
              badge(lane.heroes, H) +
              '</span></button>'
          )
          .join('')
      : '<p class="ac-empty">No new lineup matches these filters.</p>';
  }

  /** Marks every lineup that shares heroes with the selected one. */
  function markOverlaps() {
    const picked = selected ? byId.get(selected) : null;
    for (const node of mount.querySelectorAll('[data-lane]')) {
      const lane = byId.get(node.dataset.lane);
      node.querySelectorAll('.ac-badge.match, .ac-badge.same').forEach((chip) => chip.remove());
      node.classList.remove('match1', 'match2', 'same-trio');
      if (!picked || !lane || lane.id === picked.id) continue;
      const match = matchOf(lane, picked);
      if (!match.shared) continue;
      node.classList.add(match.sameTrio ? 'same-trio' : 'match' + match.shared);
      const spot = node.querySelector('.ac-actions');
      if (spot) spot.insertAdjacentHTML('afterbegin', overlapChip(match));
    }
  }

  function describeSelection() {
    const note = $('acNote');
    const picked = selected ? byId.get(selected) : null;
    if (!picked) {
      note.textContent = 'Tap a new lineup to see which lineups already share its heroes.';
      return;
    }
    const others = view.all.filter((lane) => lane.id !== picked.id);
    const trio = others.filter((lane) => matchOf(lane, picked).sameTrio).length;
    const duo = others.filter((lane) => matchOf(lane, picked).shared === 2).length;
    const one = others.filter((lane) => matchOf(lane, picked).shared === 1).length;
    note.textContent =
      picked.heroes.join(' / ') +
      ' — ' +
      (trio ? trio + ' already use the same three heroes; ' : '') +
      duo +
      ' share two heroes; ' +
      one +
      ' share one.';
  }

  function draw() {
    drawStats();
    drawLists();
    markOverlaps();
    describeSelection();
  }

  for (const id of ['acSearch', 'acTroop', 'acCost', 'acTier', 'acSort'])
    $(id).addEventListener('input', draw);
  $('acClear').addEventListener('click', () => {
    for (const id of ['acSearch', 'acTroop', 'acCost', 'acTier']) $(id).value = '';
    draw();
  });
  mount.addEventListener('click', (event) => {
    const copy = event.target.closest('#acCopyCurrent, #acCopyNew');
    if (copy) {
      const list = copy.id === 'acCopyCurrent' ? view.current : view.atEnd;
      const json = JSON.stringify(
        list.map((lane) => ({ heroes: lane.heroes, skin: lane.skin || undefined })),
        null,
        2
      );
      const note = $('acNote');
      const done = () => {
        note.textContent = 'Copied ' + list.length + ' lineups as JSON.';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(done, () => {
          note.textContent = 'Could not reach the clipboard; the list was not copied.';
        });
      } else {
        note.textContent = 'This browser has no clipboard access; the list was not copied.';
      }
      return;
    }
    const row = event.target.closest('[data-lane]');
    if (!row) return;
    selected = selected === row.dataset.lane ? null : row.dataset.lane;
    draw();
  });

  draw();
}
