// js/combo-counter-lookup.js - Search heroes to find their counters
import { allHeroesData } from './heroes-data.js';
import { getHeroImageUrl, getComboRankInfo } from './state.js';
import { escapeHtml } from './utils.js';
import { getCombosCounteredByHero, getCountersAgainstHero, renderCounterMatchupList } from './combo-counters.js';

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
      const wins = getCombosCounteredByHero(hero.name);
      const losses = getCountersAgainstHero(hero.name);

      html += `
        <div class="counter-lookup-hero bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div class="flex items-center gap-2 mb-2">
            <img src="${getHeroImageUrl(hero.name)}" alt="${escapeHtml(hero.name)}" class="w-8 h-8 rounded-full border border-slate-600 object-cover">
            <span class="font-bold text-sm text-white">${escapeHtml(hero.name)}</span>
          </div>
          <div class="counter-lookup-sections">
            <div>
              <div class="counter-lookup-subtitle">This hero counters</div>
              ${renderCounterMatchupList(wins, getComboRankInfo, getHeroImageUrl, {}, {
                limit: 3,
                label: 'Counter path',
                targetLabel: 'Target',
                counterLabel: 'Counter',
                emptyText: 'No known counter paths',
              })}
            </div>
            <div>
              <div class="counter-lookup-subtitle">This hero is countered by</div>
              ${renderCounterMatchupList(losses, getComboRankInfo, getHeroImageUrl, {}, {
                limit: 3,
                label: 'Threat',
                targetLabel: 'Your combo',
                counterLabel: 'Counter',
                emptyText: 'No known counters',
              })}
            </div>
          </div>
        </div>
      `;
    });
    results.innerHTML = html;
  });
}
