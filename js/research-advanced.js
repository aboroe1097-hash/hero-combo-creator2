// js/research-advanced.js - ETA tracking, daily medal tracking for research
const ADV_KEY = 'vts_research_advanced';

function loadData() {
  try { return JSON.parse(localStorage.getItem(ADV_KEY)) || {}; } catch { return {}; }
}

function saveData(d) {
  try { localStorage.setItem(ADV_KEY, JSON.stringify(d)); } catch {}
}

export function getDailyMedalSummary() {
  const d = loadData();
  const today = new Date().toDateString();
  if (d._date !== today) {
    d._date = today;
    d.wb_today = 0;
    d.cm_today = 0;
    saveData(d);
  }
  return { wbToday: d.wb_today || 0, cmToday: d.cm_today || 0 };
}

export function addDailyMedals(wb, cm) {
  const d = loadData();
  const today = new Date().toDateString();
  if (d._date !== today) {
    d._date = today;
    d.wb_today = 0;
    d.cm_today = 0;
  }
  d.wb_today = (d.wb_today || 0) + wb;
  d.cm_today = (d.cm_today || 0) + cm;
  saveData(d);
  return { wbToday: d.wb_today, cmToday: d.cm_today };
}

export function estimateCompletion(remainingWb, remainingCm, dailyWb, dailyCm) {
  const wbDays = dailyWb > 0 ? Math.ceil(remainingWb / dailyWb) : Infinity;
  const cmDays = dailyCm > 0 ? Math.ceil(remainingCm / dailyCm) : Infinity;
  const maxDays = Math.max(wbDays, cmDays);
  if (!isFinite(maxDays)) return null;
  const eta = new Date();
  eta.setDate(eta.getDate() + maxDays);
  return {
    wbDays, cmDays, totalDays: maxDays,
    etaDate: eta.toLocaleDateString(),
  };
}

export function getWeeklyIncomeGoal(remainingWb, remainingCm, weeks) {
  if (!weeks || weeks <= 0) return null;
  return {
    wbPerWeek: Math.ceil(remainingWb / weeks),
    cmPerWeek: Math.ceil(remainingCm / weeks),
  };
}
