// js/throne-buffs-data.js
// The Throne title catalog: the nine slots an alliance assigns each week.
//
// Names and effect values are transcribed from the in-game Province → Hero
// panel; they are game data, not UI copy, so they are not translated. The
// effect list is shown next to each slot so an admin can see what they are
// handing out without leaving the tab.
//
// `icon` points at images/throne/<id>.webp. A missing file degrades to the
// slot's initials rather than a broken image, so the tab works before the
// artwork lands.

export const THRONE_BUFF_ICON_DIR = 'images/throne';

// The Emperor sits apart from the eight Hero titles in game — it is its own
// tab in the Province panel — and it is the one slot that is not a ministry,
// so it leads the list here too.
export const THRONE_BUFFS = Object.freeze([
  Object.freeze({
    id: 'emperor',
    name: 'Emperor',
    group: 'emperor',
    effects: Object.freeze([]),
  }),
  Object.freeze({
    id: 'queen',
    name: 'Queen',
    group: 'hero',
    effects: Object.freeze([
      Object.freeze({ label: 'Total Resource Income', value: '+30%' }),
      Object.freeze({ label: 'Training Cost', value: '-5%' }),
      Object.freeze({ label: 'Extra Gather Resources', value: '10%' }),
    ]),
  }),
  Object.freeze({
    id: 'prime-minister',
    name: 'Prime Minister',
    group: 'hero',
    effects: Object.freeze([
      Object.freeze({ label: 'Build Speed', value: '+5%' }),
      Object.freeze({ label: 'Training Speed', value: '+30%' }),
      Object.freeze({ label: 'Technological Research Speed', value: '+5%' }),
    ]),
  }),
  Object.freeze({
    id: 'barrister',
    name: 'Barrister',
    group: 'hero',
    effects: Object.freeze([
      Object.freeze({ label: 'Total Resource Income', value: '+20%' }),
      Object.freeze({ label: 'Training Speed', value: '+5%' }),
      Object.freeze({ label: 'Technological Research Speed', value: '+10%' }),
    ]),
  }),
  Object.freeze({
    id: 'finance-minister',
    name: 'Finance Minister',
    group: 'hero',
    effects: Object.freeze([
      Object.freeze({ label: 'Total Resource Income', value: '+50%' }),
      Object.freeze({ label: 'Food Cost', value: '-10%' }),
      Object.freeze({ label: 'Gathering Speed', value: '+20%' }),
    ]),
  }),
  Object.freeze({
    id: 'legion-master',
    name: 'Legion Master',
    group: 'hero',
    effects: Object.freeze([
      Object.freeze({ label: 'All Troop Might', value: '+20%' }),
      Object.freeze({ label: 'Marching Speed', value: '+10%' }),
      Object.freeze({ label: 'Troop HP', value: '+10%' }),
    ]),
  }),
  Object.freeze({
    id: 'royal-guard',
    name: 'Royal Guard',
    group: 'hero',
    effects: Object.freeze([
      Object.freeze({ label: 'All Troop Might', value: '+20%' }),
      Object.freeze({ label: 'All Troop Defense', value: '+20%' }),
    ]),
  }),
  Object.freeze({
    id: 'minister-of-science',
    name: 'Minister of Science',
    group: 'hero',
    effects: Object.freeze([
      Object.freeze({ label: 'Technological Research Speed', value: '+10%' }),
      Object.freeze({ label: 'Free Research Speed-Up (Minute)', value: '+60' }),
    ]),
  }),
  Object.freeze({
    id: 'minister-of-construction',
    name: 'Minister of Construction',
    group: 'hero',
    effects: Object.freeze([Object.freeze({ label: 'Build Speed', value: '+10%' })]),
  }),
]);

export const THRONE_BUFF_IDS = Object.freeze(THRONE_BUFFS.map((buff) => buff.id));

export function getThroneBuff(id) {
  return THRONE_BUFFS.find((buff) => buff.id === id) || null;
}

export function throneBuffIconPath(id) {
  return `${THRONE_BUFF_ICON_DIR}/${id}.webp`;
}

// Two-letter fallback for a slot whose icon has not shipped yet.
export function throneBuffInitials(id) {
  const name = getThroneBuff(id)?.name || '';
  const words = name.split(/\s+/).filter((word) => word.length > 2);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
