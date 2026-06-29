import { initFirebase, ensureAnonymousAuth } from './firebase.js';
import { importFirestore } from './firebase-sdk.js';
import { buildWeightedContributionRows } from './contribution-weighting.js';

const FS_PATH = 'vts_admin/dashboard_data';
const R5_COLLECTION_PATH = 'vts_admin/conduct_adjustments/records';

function $(id) { return document.getElementById(id); }

function esc(str) {
  if (!str) return '';
  const el = document.createElement('div');
  el.textContent = String(str);
  return el.innerHTML;
}

function valueOf(input) {
  const n = Number(input || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatSignedNumber(n) {
  if (n > 0) return `+${n}`;
  return String(n);
}

function contributionRewardLabel(reward) {
  if (!reward) return '--';
  const labels = {
    guild_master: 'Guild Master',
    core: 'Core',
    power_house: 'Power House',
    members: 'Members',
    standard: 'Standard',
    premium: 'Premium',
    review: 'Review',
    none: 'None',
  };
  return labels[reward] || reward;
}

async function loadR5Adjustments(db) {
  try {
    const { collection, getDocs } = await importFirestore();
    const snapshot = await getDocs(collection(db, R5_COLLECTION_PATH));
    const adjustments = [];
    snapshot.forEach((doc) => { adjustments.push(doc.data()); });
    return adjustments.filter(Boolean);
  } catch {
    return [];
  }
}

function renderTable(rows, recordLabel) {
  return `<div id="ocrDashboardRoot" class="dash-weighted-contribution-panel">
    <div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card">
      <div class="dash-card-hdr dash-card-hdr-wrap">
        <h2 class="dash-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span>Weighted Total Contribution</span>
        </h2>
        <div class="dash-weighted-contribution-meta">${esc(recordLabel || 'Eden X1')} &middot; View Only</div>
      </div>
      <div class="dash-contribution-compare-table-wrap dash-weighted-contribution-table-wrap">
        <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table">
          <thead><tr>
            <th>#</th>
            <th>Player</th>
            <th class="dash-weighted-detail-col">Rank</th>
            <th class="dash-weighted-detail-col">Reward</th>
            <th class="dash-weighted-detail-col" style="text-align:right">Contribution</th>
            <th class="dash-weighted-detail-col" style="text-align:right">Shield Walls</th>
            <th class="dash-weighted-detail-col" style="text-align:right">Pathers</th>
            <th class="dash-weighted-detail-col" style="text-align:right">Banners</th>
            <th class="dash-weighted-detail-col" style="text-align:right">Total</th>
            <th class="dash-weighted-detail-col" style="text-align:right">Conduct</th>
            <th style="text-align:right">Weighted Score</th>
            <th>Final Rank</th>
            <th>Final Reward</th>
          </tr></thead>
          <tbody>${rows
            .map((row) => {
              const total = valueOf(row.contributionScore) + row.shieldWalls + row.pathers + row.banners + row.conductBonus;
              return `<tr>
                <td>${row.finalRank}</td>
                <td><strong>${esc(row.playerName)}</strong></td>
                <td class="dash-weighted-detail-col">${row.currentRank ? `#${esc(row.currentRank)}` : '--'}</td>
                <td class="dash-weighted-detail-col">${esc(contributionRewardLabel(row.currentReward))}</td>
                <td class="dash-weighted-detail-col" style="text-align:right">${valueOf(row.contributionScore).toLocaleString()}</td>
                <td class="dash-weighted-detail-col" style="text-align:right">${row.shieldWalls}</td>
                <td class="dash-weighted-detail-col" style="text-align:right">${row.pathers}</td>
                <td class="dash-weighted-detail-col" style="text-align:right">${row.banners}</td>
                <td class="dash-weighted-detail-col" style="text-align:right">${total.toLocaleString()}</td>
                <td class="dash-weighted-detail-col ${row.conductBonus >= 0 ? 'dash-positive' : 'dash-negative'}" style="text-align:right">${formatSignedNumber(row.conductBonus)}</td>
                <td style="text-align:right"><strong>${Math.round(row.weightedScore).toLocaleString()}</strong></td>
                <td>#${row.finalRank}</td>
                <td>${esc(contributionRewardLabel(row.finalReward))}</td>
              </tr>`;
            })
            .join('')}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

async function main() {
  const panel = $('dashWeightedContributionPanel');
  const errorEl = $('edenX1Error');

  try {
    const { configured, db } = initFirebase();
    if (!configured || !db) {
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.textContent = 'Firebase is not configured. Cannot load data.';
      }
      if (panel) panel.innerHTML = '';
      return;
    }

    await ensureAnonymousAuth();

    const { doc, getDoc } = await importFirestore();
    const snap = await getDoc(doc(db, FS_PATH));

    if (!snap.exists()) {
      if (panel) panel.innerHTML = '<div class="dash-empty">No contribution data found.</div>';
      return;
    }

    const data = snap.data();
    const contributionRecords = Array.isArray(data.contributionRecords) ? data.contributionRecords : [];
    const dutyRecords = Array.isArray(data.dutyRecords) ? data.dutyRecords : [];
    const exGuildContributions = Array.isArray(data.exGuildContributions) ? data.exGuildContributions : [];
    const r5Adjustments = await loadR5Adjustments(db);
    const season = data.r5Season || '';

    const model = buildWeightedContributionRows({
      contributionRecords,
      dutyRecords,
      r5Adjustments,
      exGuildContributions,
      season,
    });

    if (!model.rows || !model.rows.length) {
      if (panel) panel.innerHTML = '<div class="dash-empty">No weighted contribution rows to display.</div>';
      return;
    }

    if (panel) {
      const dateStr = data.date || data.updatedAt || '';
      const recordLabel = dateStr ? `Eden X1 - ${String(dateStr).split('T')[0] || dateStr}` : 'Eden X1';
      panel.innerHTML = renderTable(model.rows, recordLabel);
    }
  } catch (err) {
    console.error('Eden X1 view failed:', err);
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = `Failed to load data: ${err?.message || err || 'Unknown error'}`;
    }
    if (panel) panel.innerHTML = '';
  }
}

main();
