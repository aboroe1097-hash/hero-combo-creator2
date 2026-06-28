// js/combo-counter-lookup.js - Search heroes to find their counters
import { allHeroesData } from './heroes-data.js';
import { getHeroImageUrl, getComboRankInfo } from './state.js';
import { escapeHtml } from './utils.js';
import { getCombosCounteredByHero, getCountersAgainstHero, renderCounterMatchupList } from './combo-counters.js';

export function initCounterLookup(containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = `
    <div class="counter-lookup">
      <h3 class="counter-lookup-title">Counter Lookup</h3>
      <input id="counterLookupSearch" type="text" class="dash-input counter-lookup-input" placeholder="Search hero name..." autocomplete="off">
      <div id="counterLookupResults" class="counter-lookup-results"></div>
    </div>
  `;

  const input = document.getElementById('counterLookupSearch');
  const results = document.getElementById('counterLookupResults');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.innerHTML = ''; return; }

    const matching = allHeroesData.filter(h => h.name.toLowerCase().includes(q));
    if (!matching.length) {
      results.innerHTML = '<p class="counter-lookup-empty">No heroes found</p>';
      return;
    }

    let html = '';
    matching.forEach(hero => {
      const wins = getCombosCounteredByHero(hero.name);
      const losses = getCountersAgainstHero(hero.name);

      html += `
        <div class="counter-lookup-hero">
          <div class="counter-lookup-hero-row">
            <img src="${getHeroImageUrl(hero.name)}" alt="${escapeHtml(hero.name)}" class="counter-lookup-avatar">
            <span class="counter-lookup-name">${escapeHtml(hero.name)}</span>
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
