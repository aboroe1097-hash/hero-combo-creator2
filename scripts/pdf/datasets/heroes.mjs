// Hero and skin exports. Sources: js/heroes-data.js (89 heroes) and
// js/skins-db.js (23 skins, 3 tiers with verified star-up costs).

import { loadSiteModule } from '../lib/env.mjs';
import { bars, callout, formatNumber, kpis, section, table } from '../lib/layout.mjs';

// Mirrors HERO_ATLAS_ALL_SEASONS in js/state.js, which cannot be imported here
// because it reads DOM elements at module scope.
const SEASON_ORDER = Object.freeze(['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8', 'X10', 'X12']);

const titleCase = (value) =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

export async function heroesBySeason() {
  const { allHeroesData } = await loadSiteModule('js/heroes-data.js');
  const { heroSkins } = await loadSiteModule('js/skins-db.js');
  if (!allHeroesData?.length) throw new Error('No hero data found');

  const seasons = SEASON_ORDER.filter((season) =>
    allHeroesData.some((hero) => hero.season === season)
  );
  const accessOf = (hero) => hero.State || 'Free';
  const skinOf = (hero) => heroSkins[hero.name]?.[0];

  const totals = {
    heroes: allHeroesData.length,
    free: allHeroesData.filter((hero) => accessOf(hero) === 'Free').length,
    paid: allHeroesData.filter((hero) => accessOf(hero) === 'Paid').length,
    withSkin: allHeroesData.filter((hero) => skinOf(hero)).length,
  };

  const seasonRows = seasons.map((season) => {
    const inSeason = allHeroesData.filter((hero) => hero.season === season);
    const withSkin = inSeason.filter((hero) => skinOf(hero)).length;
    return [
      season,
      inSeason.length,
      inSeason.filter((hero) => accessOf(hero) === 'Free').length,
      inSeason.filter((hero) => accessOf(hero) === 'Paid').length,
      withSkin,
      inSeason.length - withSkin,
    ];
  });

  const troopTypes = [...new Set(allHeroesData.map((hero) => hero.Type))].sort();

  const perSeasonSections = seasons.map((season) => {
    const inSeason = allHeroesData.filter((hero) => hero.season === season);
    const free = inSeason.filter((hero) => accessOf(hero) === 'Free');
    const paid = inSeason.filter((hero) => accessOf(hero) === 'Paid');
    const ordered = [...free, ...paid];
    return section(
      `${season} · ${inSeason.length} heroes (${free.length} free, ${paid.length} paid)`,
      table({
        columns: [
          { label: 'Hero', align: 'left' },
          { label: 'Troop', align: 'left' },
          { label: 'Access', align: 'left' },
          { label: 'Skin', align: 'left' },
        ],
        rows: ordered.map((hero) => {
          const skin = skinOf(hero);
          return [
            hero.name,
            hero.Type || '—',
            accessOf(hero),
            skin ? `${skin.name} (${skin.type || 'type unknown'})` : 'No skin',
          ];
        }),
        caption: inSeason.some((hero) => skinOf(hero))
          ? `${inSeason.filter((hero) => skinOf(hero)).length} of ${inSeason.length} heroes in this season have a skin.`
          : `No hero in ${season} has a skin.`,
      })
    );
  });

  return {
    filename: 'roc-heroes-by-season.pdf',
    eyebrow: 'Heroes',
    title: 'Heroes by season — free, paid and skinned',
    subtitle:
      'Every hero grouped by the season they are recruited under, showing free against paid access and whether a skin exists.',
    meta: [
      { label: 'Heroes', value: String(totals.heroes) },
      { label: 'Seasons', value: String(seasons.length) },
      { label: 'With a skin', value: String(totals.withSkin) },
    ],
    sections: [
      kpis([
        { label: 'Heroes', value: totals.heroes },
        { label: 'Free', value: totals.free },
        { label: 'Paid', value: totals.paid },
        { label: 'With a skin', value: totals.withSkin },
        { label: 'No skin', value: totals.heroes - totals.withSkin },
      ]),
      section(
        'Heroes per season',
        bars({
          items: seasons.map((season) => ({
            label: season,
            value: allHeroesData.filter((hero) => hero.season === season).length,
          })),
        })
      ),
      section(
        'Roster breakdown',
        table({
          columns: [
            { label: 'Season', align: 'left' },
            { label: 'Total' },
            { label: 'Free' },
            { label: 'Paid' },
            { label: 'With skin' },
            { label: 'No skin' },
          ],
          rows: seasonRows,
          footer: [
            'All seasons',
            totals.heroes,
            totals.free,
            totals.paid,
            totals.withSkin,
            totals.heroes - totals.withSkin,
          ],
          caption:
            "A hero's season is the banner it is recruited under. Catch-up heroes appear under the season they were added to the roster.",
        })
      ),
      section(
        'Heroes by troop type',
        table({
          columns: [
            { label: 'Troop type', align: 'left' },
            { label: 'Heroes' },
            { label: 'Free' },
            { label: 'Paid' },
            { label: 'With skin' },
          ],
          rows: troopTypes.map((type) => {
            const ofType = allHeroesData.filter((hero) => hero.Type === type);
            return [
              type,
              ofType.length,
              ofType.filter((hero) => accessOf(hero) === 'Free').length,
              ofType.filter((hero) => accessOf(hero) === 'Paid').length,
              ofType.filter((hero) => skinOf(hero)).length,
            ];
          }),
          caption: '"All" covers heroes that are not locked to a single troop type.',
        })
      ),
      ...perSeasonSections,
    ],
  };
}

export async function skinCatalogue() {
  const skins = await loadSiteModule('js/skins-db.js');
  const { SKIN_TIERS, heroSkins, getAllSkinHeroEntries, heroHiddenPowers } = skins;
  const entries = getAllSkinHeroEntries();
  const pending = entries.filter((entry) => entry.skin?.detailsStatus === 'pending');

  const tierRows = SKIN_TIERS.map((tier) => {
    const star1To2 = tier.star1To2?.items || [];
    const star2To3 = tier.star2To3?.items || [];
    return [
      tier.name,
      tier.rank || '—',
      star1To2.length
        ? star1To2.map((item) => `${formatNumber(item.qty)}× ${item.name}`).join(', ')
        : '—',
      star2To3.length
        ? star2To3.map((item) => `${formatNumber(item.qty)}× ${item.name}`).join(', ')
        : 'None',
      tier.knownHeroes?.length || 0,
    ];
  });

  const skinRows = entries.map((entry) => {
    const skin = entry.skin || {};
    const bio = skin.bioAttributes || {};
    const hasBio = Object.values(bio).some((value) => Number(value) > 0);
    return [
      entry.heroName,
      skin.name || '—',
      skin.type || '—',
      skin.rarity || '—',
      skin.maxStars || 3,
      skin.detailsStatus === 'pending' ? 'Details pending' : hasBio ? 'Recorded' : 'Listed',
    ];
  });

  return {
    filename: 'roc-skin-catalogue.pdf',
    eyebrow: 'Skins',
    title: 'Skin catalogue and star-up costs',
    subtitle:
      'Every skin in the roster with its tier, and the verified item cost of taking each tier from one star to three.',
    meta: [
      { label: 'Skins', value: String(entries.length) },
      { label: 'Tiers', value: String(SKIN_TIERS.length) },
      { label: 'Details pending', value: String(pending.length) },
    ],
    sections: [
      kpis([
        { label: 'Skins', value: entries.length },
        { label: 'Heroes with a skin', value: Object.keys(heroSkins).length },
        { label: 'Tiers', value: SKIN_TIERS.length },
        { label: 'Details pending', value: pending.length },
      ]),
      pending.length
        ? callout({
            title: `${pending.length} of ${entries.length} skins are still stubs`,
            body: 'Their stat attributes and skill text have not been captured yet, so this export lists them for reference but cannot show a with-skin versus without-skin stat comparison. Only heroes with recorded attributes support that comparison.',
          })
        : '',
      section(
        'Tier star-up costs',
        table({
          columns: [
            { label: 'Tier', align: 'left' },
            { label: 'Rank', align: 'left' },
            { label: '1★ → 2★', align: 'left' },
            { label: '2★ → 3★', align: 'left' },
            { label: 'Known heroes' },
          ],
          rows: tierRows,
          caption:
            'Costs are item quantities. "None" means the tier has no second-star-to-third-star step.',
        })
      ),
      section(
        'Star stages',
        Object.entries(skins.SKIN_STAR_STAGES || {})
          .map(
            ([star, stage]) =>
              `<p><b>${star}★ ${stage.title}:</b> ${stage.unlock}${
                stage.detail ? ` — ${stage.detail}` : ''
              }</p>`
          )
          .join('') || '<p>No star stage descriptions published.</p>'
      ),
      section(
        'Skin catalogue',
        table({
          columns: [
            { label: 'Hero', align: 'left' },
            { label: 'Skin', align: 'left' },
            { label: 'Type', align: 'left' },
            { label: 'Rarity', align: 'left' },
            { label: 'Max ★' },
            { label: 'Data', align: 'left' },
          ],
          rows: skinRows,
          caption:
            'Skin "type" values are season markers from the source (S, S1, S2, SP), not the three real tiers.',
        })
      ),
      section(
        'Recorded skin attributes',
        Object.keys(heroHiddenPowers || {}).length ||
          entries.some((entry) =>
            Object.values(entry.skin?.bioAttributes || {}).some((value) => Number(value) > 0)
          )
          ? table({
              columns: [
                { label: 'Hero', align: 'left' },
                { label: 'Might' },
                { label: 'Resistance' },
                { label: 'Tactical might' },
                { label: 'Tactical res.' },
                { label: 'HP' },
                { label: 'Damage' },
              ],
              rows: entries
                .filter((entry) =>
                  Object.values(entry.skin?.bioAttributes || {}).some((value) => Number(value) > 0)
                )
                .map((entry) => {
                  const bio = entry.skin.bioAttributes;
                  return [
                    entry.heroName,
                    bio.might,
                    bio.resistance,
                    bio.tacticalMight,
                    bio.tacticalResistance,
                    bio.hp,
                    bio.damage,
                  ];
                }),
              caption:
                'Only skins with captured attributes appear here. Everything else is a catalogue entry with pending details.',
            })
          : callout({
              title: 'No skin attribute values are recorded',
              body: 'Every skin in the source is still a pending stub, so there is nothing to compare against a hero without a skin.',
            })
      ),
    ],
  };
}
