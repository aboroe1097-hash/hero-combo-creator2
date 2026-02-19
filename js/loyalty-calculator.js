// js/loyalty-calculator.js

const upgradeCosts = {
    AC1: [700, 2500, 4000, 8000, 14000, 25000, 46000, 83000, 150000, 271000, 325000, 390000, 469000, 562000, 675000, 810000, 972000, 1167000, 1401000],
    AC2: [2000, 7000, 13000, 23000, 43000, 77000, 139000, 251000, 452000, 814000, 977000, 1173000, 1407000, 1688000, 2026000, 2431000, 2918000, 3501000, 4201000],
    AC3: [4000, 14000, 26000, 47000, 86000, 155000, 279000, 502000, 904000, 1629000, 1954000, 2345000, 2814000, 3377000, 4052000, 4863000, 5835000, 7002000, 8403000],
    AC4: [7000, 24000, 44000, 79000, 143000, 258000, 465000, 837000, 1508000, 2714000, 3257000, 3908000, 4699000, 5628000, 6753000, 8104000, 9725000, 11670000, 14004000]
};

const loyaltyThresholds = [
    { site: 'T1', loyalty: 0 }, { site: 'T2', loyalty: 0 }, { site: 'T3', loyalty: 200 },
    { site: 'T4', loyalty: 200 }, { site: 'T5', loyalty: 600 }, { site: 'T6', loyalty: 1000 },
    { site: 'T7', loyalty: 1400 }, { site: 'T8', loyalty: 1800 }, { site: 'T9', loyalty: 2700 },
    { site: 'T10', loyalty: 3300 }, { site: 'T11', loyalty: 3900 }, { site: 'T12', loyalty: 4800 },
    { site: 'T13', loyalty: 5600 }, { site: 'T14', loyalty: 6400 }, { site: 'T15', loyalty: 7200 },
    { site: 'T16', loyalty: 8000 }
].sort((a, b) => a.loyalty - b.loyalty);

function getExtractionSite(loyalty) {
    for (let i = loyaltyThresholds.length - 1; i >= 0; i--) {
        if (loyalty >= loyaltyThresholds[i].loyalty) return loyaltyThresholds[i].site;
    }
    return 'T1';
}

function formatDuration(hours) {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

function calculatePoisonPercentage(currentLoyalty) {
    let nextTier = null;
    let afterNextTier = null;

    for (let i = 0; i < loyaltyThresholds.length; i++) {
        if (currentLoyalty < loyaltyThresholds[i].loyalty) {
            if (!nextTier) nextTier = loyaltyThresholds[i];
            else if (!afterNextTier) { afterNextTier = loyaltyThresholds[i]; break; }
        } else if (currentLoyalty >= loyaltyThresholds[loyaltyThresholds.length - 1].loyalty) {
            return { next: '0.0', afterNext: '0.0' };
        }
    }

    const percentages = {};
    if (nextTier) {
        const loyaltyDifferenceNext = nextTier.loyalty - currentLoyalty;
        percentages.next = Math.min(100, (loyaltyDifferenceNext / 100) * 6.52).toFixed(1);
    } else percentages.next = '0.0';

    if (afterNextTier && nextTier) {
        const loyaltyDifferenceAfterNext = afterNextTier.loyalty - currentLoyalty;
        percentages.afterNext = Math.min(100, (loyaltyDifferenceAfterNext / 100) * 6.52).toFixed(1);
    } else percentages.afterNext = '0.0';

    return percentages;
}

export function initLoyaltyCalculator() {
    const calcBtn = document.getElementById('calcLoyaltyBtn');
    if (!calcBtn) return;

    calcBtn.addEventListener('click', () => {
        const resultContainer = document.getElementById('loyaltyResult');
        
        // Change the fallback from || 1 to || 0 so 0 is a valid input
        const ac1Level = parseInt(document.getElementById('ac1Level').value) || 0;
        const ac2Level = parseInt(document.getElementById('ac2Level').value) || 0;
        const ac3Level = parseInt(document.getElementById('ac3Level').value) || 0;
        const ac4Level = parseInt(document.getElementById('ac4Level').value) || 0;

        // Change validation to allow 0
        if ([ac1Level, ac2Level, ac3Level, ac4Level].some(l => l < 0 || l > 20)) {
            resultContainer.innerHTML = `<p class="text-red-400 font-bold p-4 bg-red-900/20 rounded-xl">Please enter valid AC levels (0-20).</p>`;
            return;
        }

        const bonusLoyalty = (parseInt(document.getElementById('bonusPoints').value) || 0) * 60;
        let savedUnits = parseInt(document.getElementById('savedUnits').value) || 0;
        const prodBuffer = Math.min(12, Math.max(0, parseFloat(document.getElementById('productionBuffer').value) || 0));

        const source1 = parseFloat(document.getElementById('source1').value) || 0;
        const source2 = parseFloat(document.getElementById('source2').value) || 0;
        const source3 = parseFloat(document.getElementById('source3').value) || 0;
        const source4 = parseFloat(document.getElementById('source4').value) || 0;
        const source5 = parseFloat(document.getElementById('source5').value) || 0;
        const source6 = parseFloat(document.getElementById('source6').value) || 0;

        const bufferedHourly = (source1 + source2 + source3) * (1 + prodBuffer / 100);
        const totalHourlyProduction = bufferedHourly + (source4 + source5 + source6);
        const adjustedDailyProduction = totalHourlyProduction * 24;

        const p_hours = parseFloat(document.getElementById('processingHours').value) || 0;
        const p_mins = parseFloat(document.getElementById('processingMinutes').value) || 0;
        const p_secs = parseFloat(document.getElementById('processingSeconds').value) || 0;
        const processingTime = p_hours + (p_mins / 60) + (p_secs / 3600);

        if (processingTime <= 0) {
            resultContainer.innerHTML = `<p class="text-red-400 font-bold p-4 bg-red-900/20 rounded-xl">Processing time must be > 0.</p>`;
            return;
        }

        const unitsPerPatch = parseFloat(document.getElementById('totalUnitsPerPatch').value) || 0;
        const numPatches = parseInt(document.getElementById('numPatches').value) || 0;

        const hourlyRatePerPatch = unitsPerPatch / processingTime;
        const possibleProcessingDaily = hourlyRatePerPatch * numPatches * 24;

        if (possibleProcessingDaily <= 0) {
            resultContainer.innerHTML = `<p class="text-red-400 font-bold p-4 bg-red-900/20 rounded-xl">Processing rate is zero. Check patch values.</p>`;
            return;
        }

        // Logic loop
        let levels = { AC1: ac1Level, AC2: ac2Level, AC3: ac3Level, AC4: ac4Level };
        let currentLoyalty = (ac1Level + ac2Level + ac3Level + ac4Level) * 100 + bonusLoyalty;
        let upgradeSequence = [];
        let cumulativeTime = 0;

        while (Object.values(levels).some(l => l < 20)) {
            let minCost = Infinity;
            let nextUpgrade = null;

        for (const building in levels) {
                const lvl = levels[building];
                if (lvl < 20) {
                    // SAFEGUARD: If level is 0, cost to build to 1 is set to 0 units (or you can put a custom number here)
                    const cost = lvl === 0 ? 0 : upgradeCosts[building][lvl - 1];
                    
                    if (cost < minCost) {
                        minCost = cost;
                        nextUpgrade = { building, level: lvl + 1, cost };
                    }
                }
            }

            if (!nextUpgrade) break;

            let effectiveCost = Math.max(0, nextUpgrade.cost - savedUnits);
            savedUnits = Math.max(0, savedUnits - nextUpgrade.cost);

            const hoursNeeded = effectiveCost / (hourlyRatePerPatch * numPatches);
            cumulativeTime += hoursNeeded;

            const newLoyalty = currentLoyalty + 100;
            const extractionSite = getExtractionSite(newLoyalty);
            const poison = calculatePoisonPercentage(currentLoyalty);

            upgradeSequence.push({
                ...nextUpgrade,
                hours: hoursNeeded,
                cumulativeTime: cumulativeTime,
                currentLoyalty: currentLoyalty,
                newLoyalty: newLoyalty,
                extractionSite: extractionSite,
                poisonNext: poison.next,
                poisonAfterNext: poison.afterNext
            });

            levels[nextUpgrade.building]++;
            currentLoyalty = newLoyalty;
        }

        // Render Results
        const isSurplus = adjustedDailyProduction >= possibleProcessingDaily;
        const diff = Math.abs(adjustedDailyProduction - possibleProcessingDaily);
        
        let html = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
                    <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Max Processing (Daily)</p>
                    <p class="text-xl font-black text-blue-400">${Math.round(possibleProcessingDaily).toLocaleString()} units</p>
                    <p class="text-[10px] text-slate-500 mt-1">${Math.round(hourlyRatePerPatch).toLocaleString()}/hr per patch</p>
                </div>
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
                    <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Production vs Processing</p>
                    <p class="text-lg font-black ${isSurplus ? 'text-emerald-400' : 'text-red-400'}">
                        ${isSurplus ? 'Surplus' : 'Deficit'} of ${Math.round(diff).toLocaleString()}
                    </p>
                    <p class="text-[10px] text-slate-500 mt-1">Total Daily Prod: ${Math.round(adjustedDailyProduction).toLocaleString()}</p>
                </div>
                <div class="bg-slate-800 p-4 rounded-xl border border-amber-700/50 shadow-md relative overflow-hidden">
                    <div class="absolute -right-4 -bottom-4 opacity-10"><img src="https://placehold.co/100x100?text=Time" width="80"></div>
                    <p class="text-xs text-amber-500 uppercase tracking-widest mb-1">Time to Max Loyalty (8000)</p>
                    <p class="text-xl font-black text-amber-400">${formatDuration(cumulativeTime)}</p>
                </div>
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-700 shadow-lg">
                <table class="w-full text-sm text-left text-slate-300">
                    <thead class="text-xs text-slate-400 uppercase bg-slate-800 border-b border-slate-700">
                        <tr>
                            <th class="px-4 py-3">Step</th>
                            <th class="px-4 py-3">Upgrade</th>
                            <th class="px-4 py-3">Cost</th>
                            <th class="px-4 py-3">Time Needed</th>
                            <th class="px-4 py-3">Cumul. Time</th>
                            <th class="px-4 py-3">Loyalty Shift</th>
                            <th class="px-4 py-3">Poison %</th>
                            <th class="px-4 py-3">Site Unlock</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        upgradeSequence.forEach((up, idx) => {
            html += `
                <tr class="border-b border-slate-700/50 hover:bg-slate-800/50 transition">
                    <td class="px-4 py-3 font-bold text-slate-500">${idx + 1}</td>
                    <td class="px-4 py-3"><span class="font-bold text-white">${up.building}</span> <span class="text-slate-400">Lvl ${up.level}</span></td>
                    <td class="px-4 py-3 text-red-300 font-semibold">${up.cost.toLocaleString()}</td>
                    <td class="px-4 py-3 text-sky-300">${formatDuration(up.hours)}</td>
                    <td class="px-4 py-3 text-amber-300">${formatDuration(up.cumulativeTime)}</td>
                    <td class="px-4 py-3">
                        <span class="text-slate-400">${up.currentLoyalty}</span> 
                        <span class="mx-1 text-slate-600">→</span> 
                        <span class="text-emerald-400 font-bold">${up.newLoyalty}</span>
                    </td>
                    <td class="px-4 py-3 text-[11px]">
                        Next: <span class="text-purple-400">${up.poisonNext}%</span><br>
                        After: <span class="text-purple-400/60">${up.poisonAfterNext}%</span>
                    </td>
                    <td class="px-4 py-3 font-black text-amber-500">${up.extractionSite}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        resultContainer.innerHTML = html;
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}
