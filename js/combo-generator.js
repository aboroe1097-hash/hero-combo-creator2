// js/combo-generator.js
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

  // local state
  let ownedHeroes = new Set();

  // Render ALL heroes as checkboxes
  function renderOwnedHeroList() {
    ownedListEl.innerHTML = '';
    const t = translations[getCurrentLanguage()] || translations.en;

    allHeroesData.forEach((hero) => {
      const wrapper = document.createElement('label');
      wrapper.className =
        'flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1 cursor-pointer text-xs sm:text-sm';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'form-checkbox h-4 w-4 text-blue-500';
      checkbox.value = hero.name;

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          ownedHeroes.add(hero.name);
        } else {
          ownedHeroes.delete(hero.name);
        }
      });

      const img = document.createElement('img');
      img.src = hero.imageUrl;
      img.alt = hero.name;
      img.loading = 'lazy';
      img.width = 32;
      img.height = 32;
      img.className = 'rounded';

      const text = document.createElement('span');
      text.textContent = hero.name;

      wrapper.appendChild(checkbox);
      wrapper.appendChild(img);
      wrapper.appendChild(text);
      ownedListEl.appendChild(wrapper);
    });
  }

  function generateBestCombos() {
    const t = translations[getCurrentLanguage()] || translations.en;

    if (ownedHeroes.size === 0) {
      resultsEl.innerHTML = `<p class="text-sm text-red-400">${t.generatorNoHeroesSelected}</p>`;
      return;
    }

    // Filter combos that are fully available
    const ownedArray = Array.from(ownedHeroes);

    const buildable = rankedCombos.filter((combo) =>
      combo.heroes.every((h) => ownedHeroes.has(h))
    );

    if (buildable.length === 0) {
      resultsEl.innerHTML = `<p class="text-sm text-yellow-400">${t.generatorNoCombosAvailable}</p>`;
      return;
    }

    // sort by rank ASC then score DESC (if both fields exist)
    buildable.sort((a, b) => {
      if (a.rank != null && b.rank != null && a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      if (a.score != null && b.score != null && a.score !== b.score) {
        return b.score - a.score;
      }
      return 0;
    });

    const top = buildable.slice(0, 5);

    // Render results
    resultsEl.innerHTML = '';
    top.forEach((combo, index) => {
      const card = document.createElement('div');
      card.className =
        'bg-gray-800 rounded-xl p-4 mb-3 shadow-md border border-gray-700';

      const titleRow = document.createElement('div');
      titleRow.className = 'flex items-center justify-between mb-2';

      const title = document.createElement('div');
      title.className = 'flex items-center gap-2';
      title.innerHTML = `
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-xs font-bold">
          #${index + 1}
        </span>
        <span class="font-semibold text-sm">
          ${t.generatorComboLabel} ${combo.rank ?? ''}
        </span>
      `;

      const scoreEl = document.createElement('span');
      if (combo.score != null) {
        scoreEl.className = 'text-xs text-gray-300';
        scoreEl.textContent = `${t.generatorScoreLabel} ${combo.score}`;
      }

      titleRow.appendChild(title);
      if (combo.score != null) titleRow.appendChild(scoreEl);

      const heroesRow = document.createElement('div');
      heroesRow.className = 'flex flex-wrap gap-2 mb-2';
      combo.heroes.forEach((heroName) => {
        const heroCard = document.createElement('div');
        heroCard.className =
          'flex items-center gap-1 bg-gray-900 rounded-lg px-2 py-1 text-xs';

        const heroData = allHeroesData.find((h) => h.name === heroName);

        if (heroData) {
          const img = document.createElement('img');
          img.src = heroData.imageUrl;
          img.alt = heroName;
          img.loading = 'lazy';
          img.width = 28;
          img.height = 28;
          img.className = 'rounded';
          heroCard.appendChild(img);
        }

        const label = document.createElement('span');
        label.textContent = heroName;
        heroCard.appendChild(label);
        heroesRow.appendChild(heroCard);
      });

      const metaRow = document.createElement('div');
      metaRow.className = 'flex flex-wrap gap-2 text-xs text-gray-300 mb-1';

      if (combo.tags && combo.tags.length) {
        combo.tags.forEach((tag) => {
          const badge = document.createElement('span');
          badge.className =
            'inline-block px-2 py-0.5 rounded-full bg-gray-700 text-gray-100';
          badge.textContent = tag;
          metaRow.appendChild(badge);
        });
      }

      const notes = document.createElement('p');
      notes.className = 'text-xs text-gray-300 mt-1';
      notes.textContent = combo.notes || '';

      card.appendChild(titleRow);
      card.appendChild(heroesRow);
      if (combo.tags && combo.tags.length) card.appendChild(metaRow);
      if (combo.notes) card.appendChild(notes);

      resultsEl.appendChild(card);
    });
  }

  // Buttons
  selectAllBtn.addEventListener('click', () => {
    ownedHeroes = new Set(allHeroesData.map((h) => h.name));
    ownedListEl
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = true));
  });

  clearAllBtn.addEventListener('click', () => {
    ownedHeroes.clear();
    ownedListEl
      .querySelectorAll('input[type="checkbox"]')
      .forEach((cb) => (cb.checked = false));
  });

  generateBtn.addEventListener('click', generateBestCombos);

  // initial render
  renderOwnedHeroList();
}
