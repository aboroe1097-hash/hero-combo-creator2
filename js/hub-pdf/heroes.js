// js/hub-pdf/heroes.js
// Heroes & Combos Hub document builder. Reads the same modules the hub's tools
// use — the hero roster, the Combo Generator ranking and its skin-lane filter,
// the skin catalogue and the Hero Atlas details — and never copies their tables.

import { allHeroesData } from '../heroes-data.js';
import { heroesExtendedData } from '../heroes-info.js';
import {
  filterCombosForSkinMode,
  getComboSkinRequirements,
  rankedCombos,
  scoreComboByRank,
} from '../combos-db.js';
import { SKIN_TIERS, heroSkins } from '../skins-db.js';
import { interpolate, note, numCol, paragraph, table, textCol } from './document.js';

export const HERO_TROOPS = Object.freeze(['all', 'archer', 'footman', 'cavalry']);
export const HERO_ACCESS = Object.freeze(['all', 'free', 'paid']);
export const HERO_INCLUDE = Object.freeze(['list', 'combos', 'skins']);
export const COMBO_COUNTS = Object.freeze(['5', '10', '20', 'all']);

// Troop filter value -> the roster's Type value.
const TROOP_TYPE = Object.freeze({ archer: 'Archers', footman: 'Footmen', cavalry: 'Cavalry' });
// Combo groups in print order. 'universal' = every hero is an any-troop hero.
const COMBO_GROUPS = Object.freeze(['archer', 'footman', 'cavalry', 'universal', 'mixed']);

function seasonSortKey(season) {
  const match = /^([A-Z]+)(\d+)$/.exec(String(season || ''));
  if (!match) return [9, 0];
  return [match[1] === 'S' ? 0 : 1, Number(match[2])];
}

/** Seasons present in the roster, in release order (S0…S4, then X1…). */
export function heroSeasons(heroes = allHeroesData) {
  return [...new Set(heroes.map((hero) => hero.season))].sort((a, b) => {
    const [pa, na] = seasonSortKey(a);
    const [pb, nb] = seasonSortKey(b);
    return pa - pb || na - nb;
  });
}

export function defaultHeroChoices() {
  return {
    seasons: heroSeasons(),
    troop: 'all',
    access: 'all',
    include: ['list', 'combos', 'skins'],
    comboCount: '10',
    skinLanes: false,
  };
}

function accessOf(hero) {
  return hero?.State === 'Paid' ? 'paid' : 'free';
}

export function heroMatchesTroop(hero, troop) {
  if (!troop || troop === 'all') return true;
  return hero.Type === TROOP_TYPE[troop] || hero.Type === 'All';
}

/** Heroes that pass the season, troop and access choices. */
export function filterHeroes(choices, heroes = allHeroesData) {
  const seasons = new Set(choices.seasons || []);
  const order = heroSeasons(heroes);
  return heroes
    .filter(
      (hero) =>
        seasons.has(hero.season) &&
        heroMatchesTroop(hero, choices.troop) &&
        (choices.access === 'all' || !choices.access || accessOf(hero) === choices.access)
    )
    .map((hero, index) => ({ hero, index }))
    .sort(
      (a, b) => order.indexOf(a.hero.season) - order.indexOf(b.hero.season) || a.index - b.index
    )
    .map(({ hero }) => hero);
}

/** Troop group of a combo: one troop, 'universal' (only any-troop heroes) or 'mixed'. */
export function comboTroopGroup(combo, heroByName) {
  const types = combo.heroes
    .map((name) => heroByName.get(name)?.Type)
    .filter((type) => type && type !== 'All');
  if (combo.heroes.some((name) => !heroByName.has(name))) return 'mixed';
  const unique = [...new Set(types)];
  if (!unique.length) return 'universal';
  if (unique.length > 1) return 'mixed';
  return Object.keys(TROOP_TYPE).find((key) => TROOP_TYPE[key] === unique[0]) || 'mixed';
}

/**
 * Ranked combos whose three heroes all pass the filters, in Combo Generator
 * order, with the generator's relative score. Skin-required lanes are counted
 * only when the reader opts in, as the generator's skin mode does.
 */
export function eligibleCombos(choices, heroes = allHeroesData, combos = rankedCombos) {
  const allowed = new Set(filterHeroes(choices, heroes).map((hero) => hero.name));
  const source = filterCombosForSkinMode(combos, Boolean(choices.skinLanes), () => true);
  const eligible = source.filter((combo) => combo.heroes.every((name) => allowed.has(name)));
  return eligible.map((combo, index) => ({
    ...combo,
    rank: index + 1,
    score: Number(scoreComboByRank(index, eligible.length)),
  }));
}

export function groupCombos(choices, heroes = allHeroesData, combos = rankedCombos) {
  const heroByName = new Map(heroes.map((hero) => [hero.name, hero]));
  const groups = new Map(COMBO_GROUPS.map((group) => [group, []]));
  for (const combo of eligibleCombos(choices, heroes, combos)) {
    groups.get(comboTroopGroup(combo, heroByName)).push(combo);
  }
  const wanted =
    !choices.troop || choices.troop === 'all' ? COMBO_GROUPS : [choices.troop, 'universal'];
  const limit = choices.comboCount === 'all' ? Infinity : Number(choices.comboCount) || 10;
  return wanted.map((group) => ({
    group,
    combos: groups.get(group).slice(0, limit),
    total: groups.get(group).length,
  }));
}

function troopLabel(copy, value) {
  return (
    {
      all: copy.troopAll,
      archer: copy.troopArcher,
      footman: copy.troopFootman,
      cavalry: copy.troopCavalry,
      universal: copy.troopUniversal,
      mixed: copy.troopMixed,
    }[value] || value
  );
}

function heroTypeLabel(copy, type) {
  return (
    {
      Archers: copy.troopArcher,
      Footmen: copy.troopFootman,
      Cavalry: copy.troopCavalry,
      All: copy.troopUniversal,
    }[type] ?? null
  );
}

/** True when the lane wants a skin on this hero (must or recommended). */
function comboNeedsSkin(combo, name) {
  return getComboSkinRequirements(combo).some(
    (item) =>
      item.hero === name && (item.requirement === 'must' || item.requirement === 'recommended')
  );
}

function skinNeeds(combo, copy) {
  const parts = getComboSkinRequirements(combo)
    .filter((item) => item.requirement === 'must' || item.requirement === 'recommended')
    .map(
      (item) =>
        `${item.hero} (${item.requirement === 'must' ? copy.skinMust : copy.skinRecommended})`
    );
  return parts.length ? parts.join('; ') : '—';
}

function copiesRange(extended) {
  if (!extended) return null;
  const min = Number(extended.minCopies);
  const max = Number(extended.maxCopies);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return `${min}–${max}`;
}

function skinStatus(skin, copy) {
  if (skin.detailsStatus === 'pending') return copy.skinPending;
  const hasBio = Object.values(skin.bioAttributes || {}).some((value) => Number(value) > 0);
  return hasBio ? copy.skinRecorded : copy.skinListed;
}

function formatItems(step) {
  const items = step?.items || [];
  return items.length ? items.map((item) => `${item.qty}× ${item.name}`).join(', ') : null;
}

export function buildHeroesDocument(rawChoices, copy, settings = {}) {
  const choices = { ...defaultHeroChoices(), ...rawChoices };
  const detail = settings.detail === 'full' ? 'full' : 'summary';
  const include = new Set(choices.include || []);
  const heroes = filterHeroes(choices);
  const seasons = heroSeasons().filter((season) => (choices.seasons || []).includes(season));
  const allSeasons = seasons.length === heroSeasons().length;

  const sections = [];

  // 1. Roster summary per season.
  const summaryRows = seasons.map((season) => {
    const inSeason = heroes.filter((hero) => hero.season === season);
    return [
      season,
      inSeason.length,
      inSeason.filter((hero) => accessOf(hero) === 'free').length,
      inSeason.filter((hero) => accessOf(hero) === 'paid').length,
      inSeason.filter((hero) => heroSkins[hero.name]?.length).length,
    ];
  });
  sections.push({
    role: 'roster',
    title: copy.secRoster,
    blocks: [
      paragraph(interpolate(copy.heroesMatchCount, { n: heroes.length })),
      table(
        [
          textCol(copy.colSeason),
          numCol(copy.colHeroes),
          numCol(copy.accessFree),
          numCol(copy.accessPaid),
          numCol(copy.colWithSkin),
        ],
        summaryRows,
        {
          footer: [
            copy.docTotal,
            heroes.length,
            heroes.filter((hero) => accessOf(hero) === 'free').length,
            heroes.filter((hero) => accessOf(hero) === 'paid').length,
            heroes.filter((hero) => heroSkins[hero.name]?.length).length,
          ],
          caption: copy.heroesTroopNote,
        }
      ),
    ],
  });

  // 2. Hero list with the Atlas details.
  if (include.has('list')) {
    const columns = [
      textCol(copy.colHero),
      textCol(copy.colSeason),
      textCol(copy.colTroop),
      textCol(copy.colAccess),
      textCol(copy.colPlacement),
      textCol(copy.colCopies),
      textCol(copy.colSkin),
    ];
    const rowFor = (hero) => {
      const extended = heroesExtendedData[hero.name];
      const skins = heroSkins[hero.name] || [];
      return [
        hero.name,
        hero.season,
        heroTypeLabel(copy, hero.Type),
        accessOf(hero) === 'paid' ? copy.accessPaid : copy.accessFree,
        extended?.placement ?? null,
        copiesRange(extended),
        skins.length ? skins.map((skin) => skin.name).join(', ') : copy.noSkin,
      ];
    };
    // Rows carry the portrait too, so the designed sheets can show the hero.
    const listRows = heroes.map((hero) => ({ row: rowFor(hero), portrait: hero.imageUrl }));
    const listTable = (entries) =>
      table(
        columns,
        entries.map((entry) => entry.row),
        {
          presentation: 'hero-list',
          portraits: entries.map((entry) => entry.portrait),
        }
      );
    const subsections =
      detail === 'full'
        ? seasons
            .map((season) => ({
              title: interpolate(copy.seasonHeading, { season }),
              blocks: [listTable(listRows.filter((entry) => entry.row[1] === season))],
            }))
            .filter((sub) => sub.blocks[0].rows.length)
        : [];
    sections.push({
      title: copy.secHeroList,
      blocks: [...(detail === 'full' ? [] : [listTable(listRows)]), note(copy.heroesUnknownNote)],
      subsections,
    });

    if (detail === 'full') {
      const skillRows = [];
      for (const hero of heroes) {
        const skills = heroesExtendedData[hero.name]?.skills;
        skillRows.push({ group: hero.name });
        if (!skills?.length) {
          skillRows.push([null, null, null, null, null]);
          continue;
        }
        for (const skill of skills) {
          skillRows.push([
            skill.id ?? null,
            skill.type ?? null,
            skill.range ?? null,
            skill.target ?? null,
            skill.desc ?? null,
          ]);
        }
      }
      sections.push({
        title: copy.secSkills,
        blocks: [
          table(
            [
              numCol(copy.colSkillStar),
              textCol(copy.colType),
              numCol(copy.colRange),
              textCol(copy.colTarget),
              textCol(copy.colEffect),
            ],
            skillRows,
            { caption: copy.skillsNote }
          ),
        ],
      });
    }
  }

  // 3. Top combos per troop from the Combo Generator ranking.
  if (include.has('combos')) {
    const portraitByName = new Map(heroes.map((hero) => [hero.name, hero.imageUrl]));
    const groups = groupCombos(choices);
    const columns = [
      numCol(copy.colRank),
      textCol(copy.colFront),
      textCol(copy.colMiddle),
      textCol(copy.colBack),
      numCol(copy.colScore),
      textCol(copy.colSkinNeeds),
      ...(detail === 'full' ? [textCol(copy.colNote)] : []),
    ];
    sections.push({
      role: 'combos',
      title: copy.secCombos,
      blocks: [paragraph(copy.combosIntro)],
      subsections: groups.map(({ group, combos, total }) => ({
        title: `${troopLabel(copy, group)} · ${interpolate(copy.shownOf, { shown: combos.length, total })}`,
        blocks: [
          table(
            columns,
            combos.map((combo) => [
              combo.rank,
              combo.heroes[0],
              combo.heroes[1],
              combo.heroes[2],
              combo.score,
              skinNeeds(combo, copy),
              ...(detail === 'full' ? [combo.note || '—'] : []),
            ]),
            {
              presentation: 'hero-combos',
              troop: group,
              portraits: combos.map((combo) =>
                combo.heroes.map((name) => portraitByName.get(name))
              ),
              // Which heroes need a skin, so the dense sheet marks the portrait
              // instead of printing a line of text for every lane.
              skinFlags: combos.map((combo) =>
                combo.heroes.map((name) => comboNeedsSkin(combo, name))
              ),
            }
          ),
        ],
      })),
    });
  }

  // 4. Skins of the selected heroes and the tier star-up costs.
  if (include.has('skins')) {
    const skinRows = heroes.flatMap((hero) =>
      (heroSkins[hero.name] || []).map((skin) => [
        hero.name,
        skin.name ?? null,
        skin.type ?? null,
        skin.rarity ?? null,
        skin.maxStars ?? null,
        skinStatus(skin, copy),
      ])
    );
    sections.push({
      title: copy.secSkins,
      blocks: [
        table(
          [
            textCol(copy.colHero),
            textCol(copy.colSkin),
            textCol(copy.colType),
            textCol(copy.colRarity),
            numCol(copy.colMaxStars),
            textCol(copy.colData),
          ],
          skinRows,
          {
            // The dense sheet draws each skin beside its hero's portrait.
            presentation: 'hero-skins',
            portraits: heroes.flatMap((hero) =>
              (heroSkins[hero.name] || []).map(() => hero.imageUrl ?? null)
            ),
            caption: copy.skinTypeNote,
          }
        ),
      ],
      subsections: [
        {
          title: copy.secSkinCosts,
          blocks: [
            table(
              [textCol(copy.colTier), textCol(copy.colStar12), textCol(copy.colStar23)],
              SKIN_TIERS.map((tier) => [
                tier.name,
                formatItems(tier.star1To2),
                tier.star2To3 === null ? '—' : formatItems(tier.star2To3),
              ]),
              // A fixed reference table: it prints beside any skins selection.
              { static: true, caption: copy.skinCostNote }
            ),
          ],
        },
      ],
    });
  }

  const choiceRows = [
    {
      label: copy.heroesSeasons,
      value: allSeasons ? copy.allSeasons : seasons.join(', ') || copy.docNone,
    },
    { label: copy.heroesTroop, value: troopLabel(copy, choices.troop) },
    {
      label: copy.heroesAccess,
      value:
        { all: copy.accessAll, free: copy.accessFree, paid: copy.accessPaid }[choices.access] ||
        copy.accessAll,
    },
    {
      label: copy.heroesInclude,
      value:
        HERO_INCLUDE.filter((key) => include.has(key))
          .map(
            (key) =>
              ({ list: copy.heroesList, combos: copy.heroesCombos, skins: copy.heroesSkins })[key]
          )
          .join(', ') || copy.docNone,
    },
  ];
  if (include.has('combos')) {
    choiceRows.push({
      label: copy.heroesComboCount,
      value: choices.comboCount === 'all' ? copy.comboCountAll : String(choices.comboCount),
    });
    choiceRows.push({ label: copy.heroesSkinLanes, value: choices.skinLanes ? copy.yes : copy.no });
  }

  return {
    kind: 'heroes',
    title: copy.heroesDocTitle,
    fileTitle: `roc-heroes-combos-${choices.troop}-${allSeasons ? 'all' : seasons.join('-')}`,
    subtitle: copy.heroesDocSubtitle,
    choices: choiceRows,
    sections,
    sources: [
      { label: copy.srcHeroRoster, note: copy.srcHeroRosterNote },
      { label: copy.srcComboRanking, note: copy.srcComboRankingNote },
      { label: copy.srcSkins, note: copy.srcSkinsNote },
    ],
  };
}

/** Form controls for the Heroes & Combos PDFs tab. */
export function heroesForm(copy) {
  return [
    {
      type: 'checks',
      name: 'seasons',
      label: copy.heroesSeasons,
      bulk: true,
      options: heroSeasons().map((season) => ({ value: season, label: season })),
    },
    {
      type: 'select',
      name: 'troop',
      label: copy.heroesTroop,
      options: HERO_TROOPS.map((value) => ({ value, label: troopLabel(copy, value) })),
    },
    {
      type: 'select',
      name: 'access',
      label: copy.heroesAccess,
      options: [
        { value: 'all', label: copy.accessAll },
        { value: 'free', label: copy.accessFree },
        { value: 'paid', label: copy.accessPaid },
      ],
    },
    {
      type: 'checks',
      name: 'include',
      label: copy.heroesInclude,
      options: [
        { value: 'list', label: copy.heroesList },
        { value: 'combos', label: copy.heroesCombos },
        { value: 'skins', label: copy.heroesSkins },
      ],
    },
    {
      type: 'select',
      name: 'comboCount',
      label: copy.heroesComboCount,
      options: COMBO_COUNTS.map((value) => ({
        value,
        label: value === 'all' ? copy.comboCountAll : value,
      })),
    },
    { type: 'toggle', name: 'skinLanes', label: copy.heroesSkinLanes },
  ];
}

export const heroesPdf = Object.freeze({
  defaults: defaultHeroChoices,
  form: heroesForm,
  build: (choices, copy, settings) => buildHeroesDocument(choices, copy, settings),
  quick: [
    ['roc-heroes-by-season.pdf', 'Heroes by season'],
    ['roc-skin-catalogue.pdf', 'Skin catalogue'],
    ['roc-combos-and-counters.pdf', 'Combos and counters'],
  ],
});
