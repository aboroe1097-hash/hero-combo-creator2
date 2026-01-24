// js/combo-generator.js - Fixed for Unique Hero Selection
import { rankedCombos } from './combos-db.js';
import { translations as baseTranslations } from './translations.js';

const translations = baseTranslations;

export function initComboGenerator(allHeroesData, getCurrentLanguage) {
  const ownedListEl = document.getElementById('ownedHeroesList');
  const resultsEl = document.getElementById('generatorResults');
  const selectAllBtn = document.getElementById('selectAllHeroesBtn');
  const clearAllBtn = document.getElementById('clearAllHeroesBtn');
  const generateBtn = document.getElementById('generateCombosBtn');

  if (!ownedListEl || !resultsEl) return;

  let ownedHeroes = new Set();

  // ... (renderOwnedHeroList and initial logic remains the same) ...

  function generateBestCombos() {
    const t = translations[getCurrentLanguage()] || translations.en;

    if (ownedHeroes.size === 0) {
      resultsEl.innerHTML = `<p class="text-sm text-red-400">${t.generatorNoHeroesSelected}</p>`;
      return;
    }

    // 1. Filter ALL buildable combos first
    let buildable = rankedCombos.filter((combo) =>
      combo.heroes.every((h) => ownedHeroes.has(h))
    );

    if (buildable.length === 0) {
      resultsEl.innerHTML = `<p class="text-sm text-yellow-400">${t.generatorNoCombosAvailable}</p>`;
      return;
    }

    // 2. Sort them once by priority (Score/Rank)
    buildable.sort((a, b) => (b.score || 0) - (a.score || 0));

    // 3. Selection Logic: Pick unique heroes only
    const finalSelection = [];
    const usedHeroesGlobal = new Set();

    for (const combo of buildable) {
      if (finalSelection.length >= 5) break;

      // Check if ANY hero in this combo is already used in a previous combo
      const hasConflict = combo.heroes.some(hero => usedHeroesGlobal.has(hero));

      if (!hasConflict) {
        finalSelection.push(combo);
        // Mark these 3 heroes as used so they don't appear in the next 4 slots
        combo.heroes.forEach(hero => usedHeroesGlobal.add(hero));
      }
    }

    // 4. Render results (Same rendering code as before, but using finalSelection)
    resultsEl.innerHTML = '';
    
    if (finalSelection.length === 0) {
        resultsEl.innerHTML = `<p class="text-sm text-yellow-400">${t.generatorNoCombosAvailable}</p>`;
        return;
    }

    finalSelection.forEach((combo, index) => {
      const card = document.createElement('div');
      card.className = 'bg-gray-800 rounded-xl p-4 mb-3 shadow-md border border-gray-700';

      // ... (Rest of your rendering logic for titleRow, heroesRow, etc.)
      const titleRow = document.createElement('div');
      titleRow.className = 'flex items-center justify-between mb-2';
      titleRow.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-xs font-bold">#${index + 1}</span>
          <span class="font-semibold text-sm">${t.generatorComboLabel}</span>
        </div>
        <span class="text-xs text-sky-400 font-bold">${t.generatorScoreLabel} ${combo.score}</span>
      `;
      
      const heroesRow = document.createElement('div');
      heroesRow.className = 'flex flex-wrap gap-2 mb-2';
      combo.heroes.forEach((heroName) => {
        const heroData = allHeroesData.find((h) => h.name === heroName);
        const heroCard = document.createElement('div');
        heroCard.className = 'flex items-center gap-1 bg-gray-900 rounded-lg px-2 py-1 text-xs';
        heroCard.innerHTML = `
          <img src="${heroData ? heroData.imageUrl : ''}" alt="${heroName}" width="28" height="28" class="rounded">
          <span>${heroName}</span>
        `;
        heroesRow.appendChild(heroCard);
      });

      card.appendChild(titleRow);
      card.appendChild(heroesRow);
      resultsEl.appendChild(card);
    });
  }

  // Event Listeners
  generateBtn.addEventListener('click', generateBestCombos);
  // ... (selectAllBtn / clearAllBtn listeners)
}
