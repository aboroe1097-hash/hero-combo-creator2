// js/combo-generator.js - Fixed for Unique Hero Selection & Random Logic
import { rankedCombos } from './combos-db.js';
import { translations as baseTranslations } from './translations.js';

const translations = baseTranslations;

export function initComboGenerator(allHeroesData, getCurrentLanguage) {
  const ownedListEl = document.getElementById('ownedHeroesList');
  const resultsEl = document.getElementById('generatorResults');
  const selectAllBtn = document.getElementById('selectAllHeroesBtn');
  const clearAllBtn = document.getElementById('clearAllHeroesBtn');
  const generateBtn = document.getElementById('generateCombosBtn');
  const generateRandomBtn = document.getElementById('generateRandomBtn'); // NEW BUTTON

  if (!ownedListEl || !resultsEl) return;

  let ownedHeroes = new Set();

  // ... (renderOwnedHeroList and initial logic remains the same) ...
  // Note: Ensure your existing code populates 'ownedHeroes' correctly here.

  // --- HELPER: Render the Cards ---
  function renderResults(combos, emptyMessageKey) {
    const t = translations[getCurrentLanguage()] || translations.en;
    resultsEl.innerHTML = '';

    if (!combos || combos.length === 0) {
      resultsEl.innerHTML = `<p class="text-sm text-yellow-400">${t[emptyMessageKey] || t.generatorNoCombosAvailable}</p>`;
      return;
    }

    combos.forEach((combo, index) => {
      const card = document.createElement('div');
      card.className = 'bg-gray-800 rounded-xl p-4 mb-3 shadow-md border border-gray-700';

      const titleRow = document.createElement('div');
      titleRow.className = 'flex items-center justify-between mb-2';
      
      // Handle score display (might be '?' for random)
      const scoreDisplay = combo.score !== undefined ? combo.score : '?';
      const scoreLabel = t.generatorScoreLabel || "Score:";

      titleRow.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-xs font-bold">#${index + 1}</span>
          <span class="font-semibold text-sm">${t.generatorComboLabel || "Combo"}</span>
        </div>
        <span class="text-xs text-sky-400 font-bold">${scoreLabel} ${scoreDisplay}</span>
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

  // --- LOGIC: Best Combos ---
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
      renderResults([], 'generatorNoCombosAvailable');
      return;
    }

    // 2. Sort them once by priority (Score/Rank)
    buildable.sort((a, b) => (b.score || 0) - (a.score || 0));

    // 3. Selection Logic: Pick unique heroes only
    const finalSelection = [];
    const usedHeroesGlobal = new Set();

    for (const combo of buildable) {
      if (finalSelection.length >= 5) break;

      const hasConflict = combo.heroes.some(hero => usedHeroesGlobal.has(hero));

      if (!hasConflict) {
        finalSelection.push(combo);
        combo.heroes.forEach(hero => usedHeroesGlobal.add(hero));
      }
    }

    renderResults(finalSelection, 'generatorNoCombosAvailable');
  }

  // --- LOGIC: Random Combos (Surprise Me) ---
  function generateRandomCombos() {
    const t = translations[getCurrentLanguage()] || translations.en;

    if (ownedHeroes.size < 3) {
      resultsEl.innerHTML = `<p class="text-sm text-red-400">${t.messagePleaseDrag3Heroes || "Select at least 3 heroes!"}</p>`;
      return;
    }

    let pool = Array.from(ownedHeroes);

    // 1. Fisher-Yates Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const randomSelection = [];

    // 2. Create chunks of 3
    while (pool.length >= 3 && randomSelection.length < 5) {
      const chunk = pool.splice(0, 3);
      
      // Check if this random chunk actually exists in the ranked DB
      // Note: We sort to compare because order in DB might differ, though usually DB is sorted.
      // Ideally, your DB checking logic handles order. Assuming simple inclusion here:
      const foundRanked = rankedCombos.find(rc => 
        rc.heroes.length === 3 && 
        rc.heroes.every(h => chunk.includes(h))
      );

      randomSelection.push({
        heroes: chunk,
        score: foundRanked ? foundRanked.score : '?' // Show score if lucky, else ?
      });
    }

    renderResults(randomSelection, 'generatorNoCombosAvailable');
  }

  // Event Listeners
  if (generateBtn) generateBtn.addEventListener('click', generateBestCombos);
  if (generateRandomBtn) generateRandomBtn.addEventListener('click', generateRandomCombos);
  
  // ... (selectAllBtn / clearAllBtn listeners)
}
