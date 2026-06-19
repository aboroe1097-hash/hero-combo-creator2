import { escapeHtml } from './utils.js';
// Extracted Hero Tooltip Module
import { heroesExtendedData } from './heroes-info.js';
import { allHeroesData } from './heroes-data.js';
import { heroInfoEnabled, getTroopColorClass, getLocalizedTroop, getHeroImageUrl } from './state.js';
import { formatSkillText, getSynergies } from './app-hero-atlas.js';

const heroTooltip = document.getElementById('heroTooltip');


function showHeroTooltip(e, heroName) {
  if (!heroInfoEnabled) return; 

  const data = heroesExtendedData[heroName];
  if (!data) return; 

  const baseData = allHeroesData.find(h => h.name === heroName);
  const troopType = baseData ? baseData.Type : 'Unknown';
  const troopColorClass = getTroopColorClass(troopType);
  const localizedTroop = getLocalizedTroop(troopType);

  let skillsHtml = data.skills.map(s => {
    const formattedDesc = formatSkillText(s.desc);
    const isEnemy = s.target.toLowerCase().includes('enemy');
    const targetColor = isEnemy ? 'text-red-400' : 'text-emerald-400';

    return `
      <div class="mb-2 bg-slate-800 p-2 sm:p-2.5 rounded-lg border border-slate-700 shadow-inner hover:border-slate-500 transition-colors">
        <div class="flex justify-between items-center mb-1.5 border-b border-slate-700/50 pb-1">
          <span class="text-[10px] sm:text-xs font-black text-slate-200 bg-slate-700 px-2 py-0.5 rounded shadow-sm tracking-wider">SKILL ${s.id}</span>
          <div class="flex gap-2">
            <span class="text-[8px] sm:text-[9.5px] text-sky-300 font-bold uppercase tracking-wider">${s.type}</span>
            ${s.range !== '-' ? `<span class="text-[8px] sm:text-[9.5px] text-slate-500 font-bold uppercase">Range: <span class="text-white bg-slate-700 px-1 rounded">${s.range}</span></span>` : ''}
          </div>
        </div>
        <p class="text-[8.5px] sm:text-[10px] ${targetColor} font-bold mb-1.5 uppercase tracking-widest flex items-center gap-1">
          <svg class="w-3 h-3 opacity-70" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-5.029-5.912c.328-.521.529-1.134.529-1.788a4.991 4.991 0 00-1.854-3.791A3.99 3.99 0 0114 12H6a3.99 3.99 0 012.354-8.491A4.991 4.991 0 006.5 7.3c0 .654.2 1.267.529 1.788A5.972 5.972 0 002 15v3h14z"></path></svg>
          ${s.target}
        </p>
        <p class="text-[9.5px] sm:text-[11px] leading-relaxed text-slate-300">${formattedDesc}</p>
      </div>
    `;
  }).join('');

  let synergyHtml = '';
  const synergies = getSynergies(heroName);
  if (synergies.length > 0) {
    const synTags = synergies.map(syn => `
      <div class="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded border border-slate-700 shadow-sm">
         <img src="${getHeroImageUrl(syn)}" crossorigin="anonymous" class="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-slate-600 object-cover">
         <span class="text-[9px] sm:text-[10px] font-bold text-sky-300 truncate max-w-[70px] sm:max-w-[90px]">${escapeHtml(syn)}</span>
      </div>
    `).join('');
    
    synergyHtml = `
      <div class="mt-2 pt-2 border-t border-slate-700/50">
        <span class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Best Synergies</span>
        <div class="flex flex-wrap gap-2">
          ${synTags}
        </div>
      </div>
    `;
  }

  heroTooltip.innerHTML = `
    <div class="flex justify-between items-start border-b border-slate-700 pb-3 mb-2 shrink-0">
      <div class="flex flex-col">
        <h4 class="text-base sm:text-lg font-black text-white uppercase tracking-wider drop-shadow-md pr-2">${escapeHtml(heroName)}</h4>
        <div class="flex gap-3 mt-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 w-fit">
          <div class="flex flex-col">
            <span class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest">Placement</span>
            <span class="text-[10px] sm:text-[11px] text-emerald-400 font-bold tracking-wide">${data.placement || 'Any'}</span>
          </div>
          <div class="w-px bg-slate-700/50"></div>
          <div class="flex flex-col">
            <span class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest">Troop</span>
            <span class="text-[10px] sm:text-[11px] font-bold tracking-wide ${troopColorClass}">${localizedTroop}</span>
          </div>
        </div>
      </div>
      
      <button id="closeTooltipBtn" class="lg:hidden bg-slate-800 text-slate-400 hover:text-white hover:bg-red-500 rounded-full w-8 h-8 flex items-center justify-center border border-slate-600 shadow-md transition-colors shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="flex justify-between items-center mb-2 px-1 shrink-0">
      <p class="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Min: <span class="text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">${data.minCopies || 34} copies</span></p>
      <p class="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Max: <span class="text-sky-400 bg-sky-900/30 px-1.5 py-0.5 rounded">${data.maxCopies || 34} copies</span></p>
    </div>

    <div class="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 custom-scrollbar pb-2">
      ${skillsHtml || '<p class="text-xs text-slate-500 italic">No skill data available yet.</p>'}
      ${synergyHtml}
    </div>
  `;

  heroTooltip.classList.remove('hidden');
  requestAnimationFrame(() => {
    heroTooltip.classList.remove('opacity-0');
    heroTooltip.classList.add('opacity-100');
  });
  moveHeroTooltip(e);

  const closeBtn = document.getElementById('closeTooltipBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      hideHeroTooltip();
    });
    closeBtn.addEventListener('touchstart', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      hideHeroTooltip();
    }, { passive: false });
  }
}

function moveHeroTooltip(e) {
  if (heroTooltip.classList.contains('hidden')) return;
  const rect = heroTooltip.getBoundingClientRect();
  
  if (window.innerWidth < 1024) {
    heroTooltip.style.left = '50%';
    heroTooltip.style.top = '50%';
    heroTooltip.style.transform = 'translate(-50%, -50%)';
    heroTooltip.style.maxHeight = '90vh'; 
    return;
  }

  heroTooltip.style.transform = 'none';
  heroTooltip.style.maxHeight = '85vh';

  let clientX = e.clientX !== undefined ? e.clientX : window.innerWidth / 2;
  let clientY = e.clientY !== undefined ? e.clientY : window.innerHeight / 2;

  let x = clientX + 15;
  let y = clientY + 15;
  
  if (x + rect.width > window.innerWidth) x = clientX - rect.width - 15;
  if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 15;
  
  if (y < 10) y = 10;
  if (x < 10) x = 10;

  heroTooltip.style.left = `${x}px`;
  heroTooltip.style.top = `${y}px`;
}

function hideHeroTooltip() {
  heroTooltip.classList.remove('opacity-100');
  heroTooltip.classList.add('opacity-0');
  setTimeout(() => {
    if(heroTooltip.classList.contains('opacity-0')) heroTooltip.classList.add('hidden');
  }, 200);
}

function forceHideHeroTooltip() {
  heroTooltip.classList.add('hidden', 'opacity-0');
  heroTooltip.classList.remove('opacity-100');
}

window.showHeroTooltip = showHeroTooltip;
window.moveHeroTooltip = moveHeroTooltip;
window.hideHeroTooltip = hideHeroTooltip;
window.forceHideHeroTooltip = forceHideHeroTooltip;

export { showHeroTooltip, moveHeroTooltip, hideHeroTooltip, forceHideHeroTooltip };
