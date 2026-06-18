// js/combo-counter-lookup.js - Search heroes to find their counters
import { allHeroesData } from './heroes-data.js';
import { rankedCombos } from './combos-db.js';
import { getHeroImageUrl, getComboRankInfo } from './state.js';

export function initCounterLookup(containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = `
    <div class="counter-lookup">
      <h3 class="text-sm font-bold text-sky-400 mb-2">Counter Lookup</h3>
      <input id="counterLookupSearch" type="text" class="dash-input w-full mb-3" placeholder="Search hero name..." autocomplete="off">
      <div id="counterLookupResults" class="space-y-2"></div>
    </div>
  `;

  const input = document.getElementById('counterLookupSearch');
  const results = document.getElementById('counterLookupResults');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.innerHTML = ''; return; }

    const matching = allHeroesData.filter(h => h.name.toLowerCase().includes(q));
    if (!matching.length) {
      results.innerHTML = '<p class="text-xs text-slate-500">No heroes found</p>';
      return;
    }

    let html = '';
    matching.forEach(hero => {
      const combos = rankedCombos.filter(c => c.heroes && c.heroes.includes(hero.name));
      const counterCombos = combos.filter(c => {
        const others = c.heroes.filter(h => h !== hero.name);
        return others.some(h => {
          const oc = rankedCombos.filter(oc2 => oc2.heroes && oc2.heroes.includes(h));
          return oc.some(oc2 => oc2.heroes.includes(hero.name));
        });
      });

      html += `
        <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div class="flex items-center gap-2 mb-2">
            <img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" class="w-8 h-8 rounded-full border border-slate-600 object-cover">
            <span class="font-bold text-sm text-white">${hero.name}</span>
          </div>
          <div class="text-xs text-slate-400">
            ${counterCombos.length ? counterCombos.slice(0, 3).map(c =>
              `<div class="flex items-center gap-1 py-1">
                <span class="text-sky-400">vs</span>
                ${c.heroes.filter(h => h !== hero.name).map(h =>
                  `<span class="bg-slate-700 px-2 py-0.5 rounded text-sky-300">${h}</span>`
                ).join('')}
                ${getComboRankInfo(c) ? `<span class="text-amber-400">#${getComboRankInfo(c).rank}</span>` : ''}
              </div>`
            ).join('') : '<span class="text-slate-500 italic">No direct counters found</span>'}
          </div>
        </div>
      `;
    });
    results.innerHTML = html;
  });
}
