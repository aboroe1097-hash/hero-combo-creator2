// js/bounty-guide.js
// Royal Bounty Alliance — interactive guide renderer for the VTS Eden Hub.
//
// Data-driven like the Strife guide: every section is built from
// bounty-guide-data.js so a roster or rule change is a data edit, not a
// redesign. No game art is fabricated — hero portraits come from the app
// roster via state helpers, and diagrams are CSS/SVG.

import '../css/bounty-guide-v14.css';
import {
  BOUNTY_AIDING_RULES,
  BOUNTY_COMMISSION_ATTRIBUTES,
  BOUNTY_COMMISSION_LEVELS,
  BOUNTY_DAILY_RULES,
  BOUNTY_GUIDE_CREDITS,
  BOUNTY_GUIDE_ROSTER_DATE,
  BOUNTY_GUIDE_SOURCE_DATE,
  BOUNTY_GUIDE_VERSION,
  BOUNTY_HEROES,
  BOUNTY_LOOP,
  BOUNTY_MISSION_EXAMPLES,
  BOUNTY_QUICK_RULES,
  BOUNTY_SETUP_STEPS,
  BOUNTY_STATS,
} from './bounty-guide-data.js';
import { allHeroesData } from './heroes-data.js';
import { getHeroImageUrl } from './state.js';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'lobbies', label: 'Lobbies' },
  { id: 'missions', label: 'Missions' },
  { id: 'commission', label: 'Commission' },
  { id: 'aiding', label: 'Aiding Skills' },
  { id: 'heroes', label: 'Heroes' },
  { id: 'rules', label: 'Rules' },
];

let mounted = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function heroMeta(appName) {
  return allHeroesData.find((hero) => hero.name === appName) || null;
}

function unlockLabel(hero) {
  if (hero.unlock === 'day1') return 'Lobby opens day 1';
  return 'Unlocks later in the season';
}

function renderStatCards() {
  return `
  <section class="bounty-section" id="bounty-overview" data-bounty-section="overview">
    <header class="bounty-section-head">
      <h2 class="bounty-section-title">At a glance</h2>
      <p class="bounty-section-sub">The whole event in four numbers.</p>
    </header>
    <div class="bounty-stat-grid">
      ${BOUNTY_STATS.map(
        (stat, index) => `
      <article class="bounty-stat-card bounty-stat-card--${index + 1}">
        <strong class="bounty-stat-value">${escapeHtml(stat.value)}</strong>
        <span class="bounty-stat-label">${escapeHtml(stat.label)}</span>
      </article>`
      ).join('')}
    </div>
  </section>`;
}

function renderLoop() {
  const steps = BOUNTY_LOOP.map(
    (step, index) => `
    <li class="bounty-loop-step${step.title === 'Reach Level 6' ? ' bounty-loop-step--payoff' : ''}">
      <span class="bounty-loop-index" aria-hidden="true">${index + 1}</span>
      <div class="bounty-loop-copy">
        <strong>${escapeHtml(step.title)}</strong>
        <span>${escapeHtml(step.detail)}</span>
      </div>
    </li>`
  ).join('');
  return `
  <section class="bounty-section" id="bounty-loop" data-bounty-section="overview">
    <header class="bounty-section-head">
      <h2 class="bounty-section-title">The Bounty Loop</h2>
      <p class="bounty-section-sub">One mental model for the whole season.</p>
    </header>
    <ol class="bounty-loop">${steps}</ol>
  </section>`;
}

function renderLobbies() {
  return `
  <section class="bounty-section" id="bounty-lobbies" data-bounty-section="lobbies">
    <header class="bounty-section-head">
      <h2 class="bounty-section-title">Mission Lobbies</h2>
      <p class="bounty-section-sub">Every bounty hero runs a lobby on the map.</p>
    </header>
    <div class="bounty-lobby-layout">
      <article class="bounty-panel">
        <h3 class="bounty-panel-title">What a lobby is</h3>
        <p>Each bounty hero has a mission lobby where players complete <strong>hero-specific missions</strong>. Lobbies work like Eden strongholds: capture them, connect them to your territory, and hold them.</p>
        <ul class="bounty-panel-list">
          <li>Capture like an Eden stronghold</li>
          <li>Connect the tile to your territory</li>
          <li>Tile is turned off while contested</li>
          <li><strong>+10% Commission Points</strong> for members while their faction occupies the lobby</li>
        </ul>
      </article>
      <article class="bounty-panel bounty-panel--timeline">
        <h3 class="bounty-panel-title">Lobby unlock timeline</h3>
        <ol class="bounty-timeline">
          <li class="bounty-timeline-step">
            <span class="bounty-timeline-day">Day 1</span>
            <div class="bounty-timeline-copy">
              <strong>Cao Cao</strong>
              <span>First lobby opens.</span>
            </div>
          </li>
          <li class="bounty-timeline-step">
            <span class="bounty-timeline-day">Later</span>
            <div class="bounty-timeline-copy">
              <strong>Remaining heroes</strong>
              <span>Lobbies open staggered across the season.</span>
            </div>
          </li>
          <li class="bounty-timeline-step">
            <span class="bounty-timeline-day">Always</span>
            <div class="bounty-timeline-copy">
              <strong>In-game timer</strong>
              <span>The timer under each hero portrait is the source of truth.</span>
            </div>
          </li>
        </ol>
      </article>
    </div>
  </section>`;
}

function renderMissions() {
  return `
  <section class="bounty-section" id="bounty-missions" data-bounty-section="missions">
    <header class="bounty-section-head">
      <h2 class="bounty-section-title">Bounty Missions</h2>
      <p class="bounty-section-sub">Accept, complete, get paid in Commission Points.</p>
    </header>
    <div class="bounty-mission-layout">
      <article class="bounty-panel">
        <h3 class="bounty-panel-title">Every mission shows</h3>
        <ul class="bounty-panel-list">
          <li>The mission objective</li>
          <li>Commission Points it pays</li>
          <li>A timer / expiry</li>
          <li>An accept-quest interaction</li>
        </ul>
      </article>
      <article class="bounty-panel">
        <h3 class="bounty-panel-title">Mission examples</h3>
        <ul class="bounty-chip-list">
          ${BOUNTY_MISSION_EXAMPLES.map(
            (mission) => `<li class="bounty-chip">${escapeHtml(mission)}</li>`
          ).join('')}
        </ul>
      </article>
      <article class="bounty-panel bounty-panel--daily">
        <h3 class="bounty-panel-title">Daily limits</h3>
        <div class="bounty-daily-rules">
          ${BOUNTY_DAILY_RULES.map(
            (rule) => `
          <div class="bounty-daily-rule">
            <strong>${escapeHtml(rule.value)}</strong>
            <span>${escapeHtml(rule.label)}</span>
          </div>`
          ).join('')}
        </div>
        <p class="bounty-panel-note">Perfect completion earns Commission Master rewards by mail.</p>
      </article>
    </div>
  </section>`;
}

function renderCommission() {
  const nodes = BOUNTY_COMMISSION_LEVELS.map((entry) => {
    const payoff = entry.level === 6;
    return `
    <li class="bounty-level-node${payoff ? ' bounty-level-node--payoff' : ''}" title="${payoff ? 'Aiding Skill unlocked' : `Level ${entry.level}`}">
      <span class="bounty-level-dot" aria-hidden="true">${entry.level}</span>
      ${payoff ? '<span class="bounty-level-burst" aria-hidden="true">Aiding Skill</span>' : ''}
    </li>`;
  }).join('');
  return `
  <section class="bounty-section" id="bounty-commission" data-bounty-section="commission">
    <header class="bounty-section-head">
      <h2 class="bounty-section-title">Commission Levels</h2>
      <p class="bounty-section-sub">Points become levels; levels become attributes.</p>
    </header>
    <ol class="bounty-level-track">${nodes}</ol>
    <div class="bounty-commission-layout">
      <article class="bounty-panel bounty-panel--attributes">
        <h3 class="bounty-panel-title">Every Commission Level adds attributes</h3>
        <div class="bounty-attribute-row">
          ${BOUNTY_COMMISSION_ATTRIBUTES.map(
            (attribute, index) => `
          <span class="bounty-attribute-chip bounty-attribute-chip--${index + 1}">${escapeHtml(attribute)}</span>`
          ).join('')}
        </div>
        <p class="bounty-panel-note">Examples from the guide: Processing Speed, Might, Resistance.</p>
      </article>
      <article class="bounty-panel bounty-panel--payoff">
        <h3 class="bounty-panel-title">The payoff moment</h3>
        <p><strong>Commission Level 6</strong> is the milestone of the whole event — it unlocks the hero's <strong>Aiding Skill</strong>, a copy of the hero's skill that your legions can use.</p>
      </article>
    </div>
  </section>`;
}

function renderAiding() {
  return `
  <section class="bounty-section" id="bounty-aiding" data-bounty-section="aiding">
    <header class="bounty-section-head">
      <h2 class="bounty-section-title">Aiding Skills</h2>
      <p class="bounty-section-sub">The real reward of the season.</p>
    </header>
    <div class="bounty-aiding-flow">
      <span class="bounty-aiding-flow-item">Bounty Hero</span>
      <span class="bounty-aiding-flow-arrow" aria-hidden="true">→</span>
      <span class="bounty-aiding-flow-item">Commission Level 6</span>
      <span class="bounty-aiding-flow-arrow" aria-hidden="true">→</span>
      <span class="bounty-aiding-flow-item">Aiding Skill unlocked</span>
      <span class="bounty-aiding-flow-arrow" aria-hidden="true">→</span>
      <span class="bounty-aiding-flow-item">Assign to Legion</span>
      <span class="bounty-aiding-flow-arrow" aria-hidden="true">→</span>
      <span class="bounty-aiding-flow-item bounty-aiding-flow-item--done">Skill becomes usable</span>
    </div>
    <article class="bounty-panel bounty-panel--rules">
      <h3 class="bounty-panel-title">Important rules</h3>
      <ul class="bounty-panel-list bounty-panel-list--rules">
        ${BOUNTY_AIDING_RULES.map((rule) => `<li>${escapeHtml(rule)}</li>`).join('')}
      </ul>
    </article>
    <div class="bounty-setup">
      <h3 class="bounty-panel-title">How to equip an Aiding Skill</h3>
      <ol class="bounty-setup-steps">
        ${BOUNTY_SETUP_STEPS.map(
          (step) => `
        <li class="bounty-setup-step">
          <span class="bounty-setup-index" aria-hidden="true">${String(step.step).padStart(2, '0')}</span>
          <div class="bounty-setup-copy">
            <strong>${escapeHtml(step.title)}</strong>
            <span>${escapeHtml(step.detail)}</span>
          </div>
        </li>`
        ).join('')}
      </ol>
    </div>
  </section>`;
}

function renderHeroCard(hero) {
  const meta = heroMeta(hero.appName);
  const portrait = meta ? getHeroImageUrl(meta.name) : '';
  return `
  <article class="bounty-hero-card" data-bounty-hero="${hero.id}">
    <button type="button" class="bounty-hero-toggle" aria-expanded="false" aria-controls="bounty-hero-detail-${hero.id}">
      <span class="bounty-hero-portrait">
        ${portrait ? `<img src="${escapeHtml(portrait)}" alt="" width="72" height="72" loading="lazy" decoding="async" />` : '<span class="bounty-hero-portrait-empty" aria-hidden="true">◆</span>'}
        <span class="bounty-hero-tier bounty-hero-tier--${escapeHtml(hero.tier.toLowerCase())}">${escapeHtml(hero.tier)}</span>
      </span>
      <span class="bounty-hero-copy">
        <strong class="bounty-hero-name">${escapeHtml(hero.appName)}</strong>
        <span class="bounty-hero-skill">${escapeHtml(hero.skillName)}</span>
        <span class="bounty-hero-meta">${escapeHtml(meta?.Type || '')} · ${escapeHtml(meta?.season || '')}</span>
      </span>
    </button>
    <div class="bounty-hero-detail" id="bounty-hero-detail-${hero.id}" hidden>
      <dl class="bounty-hero-facts">
        <div><dt>Bounty tier</dt><dd>${escapeHtml(hero.tier)}</dd></div>
        <div><dt>Aiding Skill</dt><dd>${escapeHtml(hero.skillName)}</dd></div>
        <div><dt>Troop</dt><dd>${escapeHtml(meta?.Type || '—')}</dd></div>
        <div><dt>Season</dt><dd>${escapeHtml(meta?.season || '—')}</dd></div>
        <div><dt>Lobby</dt><dd>${escapeHtml(unlockLabel(hero))}</dd></div>
      </dl>
      <p class="bounty-hero-detail-note">Full skill text, range, and effects are in the Hero Atlas. The Aiding Skill unlocks at Commission Level 6 and needs the hero's own skill maxed appropriately.</p>
      <a class="bounty-hero-atlas-link" href="#heroes" data-bounty-atlas-link="${escapeHtml(hero.appName)}">View ${escapeHtml(hero.appName)} in the Hero Atlas →</a>
    </div>
  </article>`;
}

function renderHeroes() {
  return `
  <section class="bounty-section" id="bounty-heroes" data-bounty-section="heroes">
    <header class="bounty-section-head">
      <h2 class="bounty-section-title">Bounty Heroes</h2>
      <p class="bounty-section-sub">The 9-hero roster of the Sept 5, 2024 update — tap a card for details.</p>
    </header>
    <div class="bounty-hero-grid">
      ${BOUNTY_HEROES.map(renderHeroCard).join('')}
    </div>
  </section>`;
}

function renderRules() {
  return `
  <section class="bounty-section" id="bounty-rules" data-bounty-section="rules">
    <header class="bounty-section-head">
      <h2 class="bounty-section-title">Quick Rules</h2>
      <p class="bounty-section-sub">The four things to remember.</p>
    </header>
    <ol class="bounty-quick-rules">
      ${BOUNTY_QUICK_RULES.map((rule) => `<li class="bounty-quick-rule">${escapeHtml(rule)}</li>`).join('')}
    </ol>
  </section>`;
}

function renderCredits() {
  return `
  <footer class="bounty-credits">
    <p><strong>Royal Bounty Alliance guide</strong> — compiled from the community PDFs <em>Royal_Bounty_Updated_4-Oct-2024.pdf</em> and <em>Updated_Bounty_Heroes.pdf</em>.</p>
    <p>Credits: ${BOUNTY_GUIDE_CREDITS.map(escapeHtml).join(' / ')} · Roster as of ${escapeHtml(BOUNTY_GUIDE_ROSTER_DATE)} · Guide version ${escapeHtml(BOUNTY_GUIDE_VERSION)} · Published ${escapeHtml(BOUNTY_GUIDE_SOURCE_DATE)}.</p>
    <p class="bounty-credits-note">Lobby timers change every Eden season — always confirm the in-game timer under each hero portrait.</p>
  </footer>`;
}

function renderHero() {
  return `
  <section class="bounty-hero" id="bounty-top">
    <div class="bounty-hero-inner">
      <span class="bounty-hero-kicker">VTS Eden Hub</span>
      <h1 class="bounty-hero-title">Royal Bounty Alliance</h1>
      <p class="bounty-hero-tagline">Complete bounty missions. Raise Commission Levels. Unlock powerful Aiding Skills.</p>
      <a class="bounty-hero-cta" href="#bounty-overview">Explore the Bounty System ↓</a>
    </div>
  </section>`;
}

function renderNav() {
  return `
  <nav class="bounty-nav" aria-label="Royal Bounty sections" data-bounty-nav>
    <div class="bounty-nav-track">
      ${SECTIONS.map(
        (section) =>
          `<a class="bounty-nav-link" href="#bounty-${section.id}" data-bounty-nav-link="${section.id}">${escapeHtml(section.label)}</a>`
      ).join('')}
    </div>
  </nav>`;
}

function wireInteractions(root) {
  root.querySelectorAll('[data-bounty-hero]').forEach((card) => {
    const toggle = card.querySelector('.bounty-hero-toggle');
    const detail = card.querySelector('.bounty-hero-detail');
    toggle?.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      detail.hidden = expanded;
    });
  });

  root.querySelectorAll('[data-bounty-atlas-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (typeof window.vtsSwitchTab === 'function') {
        window.vtsSwitchTab('heroes', false, { scrollToSection: true });
      } else {
        window.location.hash = '#heroes';
      }
    });
  });

  // Sticky nav scrollspy: highlight the section in view.
  const links = [...root.querySelectorAll('[data-bounty-nav-link]')];
  if (!links.length) return;
  const sections = links
    .map((link) => link.dataset.bountyNavLink)
    .map((id) => root.querySelector(`[data-bounty-section="${id}"]`))
    .filter(Boolean);
  if (!sections.length) return;

  const onScroll = () => {
    let current = sections[0]?.dataset.bountySection || '';
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const nav = root.querySelector('[data-bounty-nav]');
      const offset = nav ? nav.getBoundingClientRect().height + 24 : 120;
      if (rect.top <= offset) current = section.dataset.bountySection;
    }
    links.forEach((link) => {
      const active = link.dataset.bountyNavLink === current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function renderBountyGuide(root) {
  if (!root) return;
  root.innerHTML = `
    ${renderHero()}
    ${renderNav()}
    <main class="bounty-main">
      ${renderStatCards()}
      ${renderLoop()}
      ${renderLobbies()}
      ${renderMissions()}
      ${renderCommission()}
      ${renderAiding()}
      ${renderHeroes()}
      ${renderRules()}
    </main>
    ${renderCredits()}
  `;
  wireInteractions(root);
  mounted = true;
}

export function isBountyGuideMounted() {
  return mounted;
}
