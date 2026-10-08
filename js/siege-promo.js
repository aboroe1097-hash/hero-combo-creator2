// The featured Arcade banner for Velo's Rampart.
//
// The banner may not cost the host page anything it did not ask for: this
// module never imports the game (anything under js/eden-siege/ is bundled into
// the lazy siege engine chunk), only the tiny daily-seed helper, and the hub
// loads it lazily once the page is idle.

import '../css/siege-promo.css';
import { dailySiegeFor, formatDailyNote } from './siege-daily.js';

const SIEGE_URL = '/eden-siege.html';

function dailyNote(copy, date = new Date()) {
  const today = dailySiegeFor(date);
  const mapName = today.mapId === 'ship' ? copy.arcadeSiegeMapShip : copy.arcadeSiegeMapKeep;
  return { text: formatDailyNote(copy.arcadeSiegeDailyNote, mapName, today.stamp), today };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The featured banner on the Arcade lobby. Deliberately not an .arcade-card:
 * the lobby's five mini-game cards are their own contract.
 */
export function mountSiegeFeature(container, { getCopy }) {
  if (!container || container.querySelector('.siege-feature')) return null;
  const root = element('section', 'siege-feature');
  root.setAttribute('aria-labelledby', 'siegeFeatureTitle');

  const art = element('div', 'siege-feature-art');
  art.setAttribute('aria-hidden', 'true');
  for (const [src, width, height] of [
    ['/images/boot/dreamy-wing-left.webp', 72, 75],
    ['/images/boot/blazing-wing-right.webp', 64, 90],
  ]) {
    const image = element('img');
    image.src = src;
    image.alt = '';
    image.width = width;
    image.height = height;
    image.loading = 'lazy';
    image.decoding = 'async';
    art.appendChild(image);
  }

  const copyBox = element('div', 'siege-feature-copy');
  const kicker = element('p', 'siege-feature-kicker');
  kicker.dataset.i18n = 'arcadeSiegeKicker';
  const title = element('h3', 'siege-feature-title');
  title.id = 'siegeFeatureTitle';
  title.dataset.i18n = 'arcadeSiegeTitle';
  const desc = element('p', 'siege-feature-desc');
  desc.dataset.i18n = 'arcadeSiegeDesc';
  const daily = element('p', 'siege-feature-daily');
  copyBox.append(kicker, title, desc, daily);

  const actions = element('div', 'siege-feature-actions');
  const play = element('a', 'siege-feature-play');
  play.href = SIEGE_URL;
  play.dataset.i18n = 'arcadeSiegePlay';
  const dailyLink = element('a', 'siege-feature-daily-link');
  dailyLink.href = `${SIEGE_URL}?mode=daily`;
  dailyLink.dataset.i18n = 'arcadeSiegeDaily';
  actions.append(play, dailyLink);

  root.append(art, copyBox, actions);
  const anchor = container.querySelector('.arcade-grid');
  container.insertBefore(root, anchor || null);

  function render() {
    const copy = getCopy() || {};
    kicker.textContent = copy.arcadeSiegeKicker || 'New';
    title.textContent = copy.arcadeSiegeTitle || "Velo's Rampart";
    desc.textContent = copy.arcadeSiegeDesc || '';
    play.textContent = copy.arcadeSiegePlay || 'Play now';
    dailyLink.textContent = copy.arcadeSiegeDaily || 'Daily Siege';
    daily.textContent = dailyNote(copy).text;
  }
  render();
  window.addEventListener('edenLanguageUpdate', render);
  return { root, render };
}
