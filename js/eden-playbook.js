import '../css/eden-playbook.css';

const WEEKS = Object.freeze([
  {
    id: 'day-0',
    label: 'Day 0',
    title: 'Prepare before reset',
    tone: 'green',
    why: 'Green Left converts spare points into early Honor, while Blue Down unlocks the fortress line before the opening rush.',
    watch: 'Complete both routes and place every fortress before changing away from the setup.',
    visuals: ['day-0-green', 'day-0-blue'],
    tasks: [
      'Use the 7-day Basic reset to open fortress access early.',
      'Follow Green Left for Honor buildings and the daily Honor skill.',
      'Follow Blue Down far enough to unlock and place all four fortresses.',
      'Activate the daily honor skill.',
    ],
  },
  {
    id: 'day-1',
    label: 'Day 1',
    title: 'Build, enter, then force income',
    tone: 'blue',
    why: 'Frontlines convert stored materials into Honor; Blue Right then turns loyalty into the first major income jump.',
    watch: 'Do not build so long that processing queues stop or Lv. 9 tiles are delayed.',
    visuals: [3, 4, 5],
    tasks: [
      'Start honor buffs and the Honor Card; open stored construction materials.',
      'Build fortresses to Lv. 1 and Frontlines toward 12 / 11 / 11 / 11.',
      'Enter Eden, reset to 47 points on Blue Right, force Lv. 8 then Lv. 9 tiles.',
      'Keep processing queues running; refill once during sleep if practical.',
    ],
  },
  {
    id: 'day-2',
    label: 'Day 2',
    title: 'Push the critical Lv. 12 jump',
    tone: 'gold',
    why: 'Income rises from 1,000 at Lv. 11 to 1,200 at Lv. 12—one of the largest jumps in the table.',
    watch:
      'Heavy early poison losses can work, but preserve enough troops for alliance objectives.',
    visuals: [6, 7],
    tasks: [
      'Participate in structure demolition without stalling loyalty growth.',
      'If Lv. 12 is close, prioritize it over extra buildings.',
      'Lv. 12 is the key early jump: 1,200 income and useful central empties.',
    ],
  },
  {
    id: 'week-1',
    label: 'Week 1',
    title: 'Balance income and processing',
    tone: 'purple',
    why: 'Income without processing creates a backlog; processing without high tiles starves the queues.',
    watch:
      'Check available resets and alliance timing before switching from Blue Right to Blue Left.',
    toolLink: {
      href: '#edenHub?subtab=loyalty',
      label: '🔄 Balancing Income & Production',
      description: 'Open our Eden Loyalty tool to compare loyalty, income, and processing.',
    },
    visuals: [8, 9],
    tasks: [
      'Blue Right helps reach higher tiles; each loyalty node is about 300.',
      'When materials pile up, reset to Blue Left for processing speed.',
      'Target Farm, Marble, and Ale for Coalition Base Camp upgrades.',
    ],
  },
  {
    id: 'role',
    label: 'Role build',
    title: 'Shift after loyalty is comfortable',
    tone: 'red',
    why: 'Once loyalty is stable, specialization points can serve the alliance instead of only personal growth.',
    watch: 'Coordinate Banner and demolition cooldowns—do not fire them alone.',
    visuals: [10, 11, 12],
    tasks: [
      'Demolition: 31 Blue points; optional active demolition skills.',
      'Banner: 47 Red points for alliance stamina and demolition buffs.',
      'Speed tiling: 17 Green plus optional 14–20 Blue.',
      'Honor buildings or tiling: 40 Green; follow alliance timing.',
    ],
  },
]);

const VISUAL_SIZES = [
  [558, 884],
  [566, 885],
  [555, 884],
  [560, 889],
  [559, 883],
  [945, 2048],
  [555, 296],
  [558, 882],
  [557, 882],
  [558, 890],
  [945, 2048],
];
const VISUALS = Object.freeze(
  VISUAL_SIZES.map(([width, height], index) => ({
    src: `assets/eden/thunder-playbook/visual-${String(index + 2).padStart(2, '0')}.webp`,
    width,
    height,
    alt: `DrThunder Eden specialization reference ${index + 2}`,
  }))
);
const EXTRA_VISUALS = Object.freeze({
  'day-0-green': {
    src: 'assets/eden/thunder-playbook/day-0-green-route.webp',
    width: 725,
    height: 1438,
    alt: 'Day 0 Green Left specialization point placement',
    caption: 'Day 0 Green Left: Honor-building and daily Honor route.',
  },
  'day-0-blue': {
    src: 'assets/eden/thunder-playbook/day-0-blue-fortresses.webp',
    width: 636,
    height: 1562,
    alt: 'Day 0 Blue Down specialization point placement for all fortresses',
    caption: 'Day 0 Blue Down: unlock and place all four fortresses before reset.',
  },
});

export function initEdenPlaybook(panel) {
  const root = panel.querySelector('[data-thunder-playbook]');
  if (!root) return;
  let active = new URLSearchParams(location.hash.split('?')[1] || '').get('section') || WEEKS[0].id;
  let view =
    new URLSearchParams(location.hash.split('?')[1] || '').get('view') === 'tips'
      ? 'tips'
      : 'timeline';
  const renderView = () => {
    root.querySelectorAll('[data-playbook-view]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.playbookView === view));
    });
    root.querySelectorAll('[data-playbook-flow]').forEach((flow) => {
      flow.hidden = flow.dataset.playbookFlow !== view;
    });
  };
  const render = () => {
    const week = WEEKS.find((entry) => entry.id === active) || WEEKS[0];
    root.querySelector('.thunder-week-nav').innerHTML = WEEKS.map(
      (entry) =>
        `<button type="button" data-week="${entry.id}" aria-pressed="${entry.id === week.id}">${entry.label}</button>`
    ).join('');
    const images = week.visuals
      .map((visual) => (typeof visual === 'number' ? VISUALS[visual - 2] : EXTRA_VISUALS[visual]))
      .filter(Boolean);
    const toolLink = week.toolLink
      ? `<a class="thunder-tool-link" href="${week.toolLink.href}"><b>${week.toolLink.label}</b><span>${week.toolLink.description}</span><i aria-hidden="true">→</i></a>`
      : '';
    root.querySelector('.thunder-focus').innerHTML =
      `<article data-tone="${week.tone}" id="playbook-${week.id}"><p>YOUR CURRENT FOCUS</p><h3>${week.title}</h3><div class="thunder-explain"><div><b>Why this phase matters</b><span>${week.why}</span></div><div><b>Watch out</b><span>${week.watch}</span></div></div><ol>${week.tasks.map((task) => `<li><button type="button" aria-pressed="false"><span>✓</span>${task}</button></li>`).join('')}</ol>${toolLink}<div class="thunder-phase-visuals">${images.map((visual, index) => `<figure><img src="${visual.src}" width="${visual.width}" height="${visual.height}" loading="lazy" decoding="async" alt="${visual.alt}" /><figcaption>${visual.caption || `${week.label} visual ${index + 1}: original DrThunder in-game route reference.`}</figcaption></figure>`).join('')}</div></article>`;
  };
  root.addEventListener('click', (event) => {
    const week = event.target.closest('[data-week]');
    if (week) {
      active = week.dataset.week;
      history.replaceState(history.state, '', `#edenHub?subtab=playbook&section=${active}`);
      render();
    }
    const viewButton = event.target.closest('[data-playbook-view]');
    if (viewButton) {
      view = viewButton.dataset.playbookView;
      history.replaceState(
        history.state,
        '',
        `#edenHub?subtab=playbook&view=${view}&section=${active}`
      );
      renderView();
    }
    const task = event.target.closest('.thunder-focus li button');
    if (task)
      task.setAttribute('aria-pressed', String(task.getAttribute('aria-pressed') !== 'true'));
  });
  render();
  renderView();
}
