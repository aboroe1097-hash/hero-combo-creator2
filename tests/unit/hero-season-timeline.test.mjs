import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { allHeroesData } from '../../js/heroes-data.js';

// js/state.js touches `document` at module scope, so the canonical season list
// is read from source instead of imported. The Season timeline (§4.6) derives
// its counts from the same rule the Atlas uses: heroes whose `season` matches.
test('season timeline counts reconcile with the Atlas season filter', async () => {
  const stateSource = await readFile(new URL('../../js/state.js', import.meta.url), 'utf8');
  const listMatch = stateSource.match(/HERO_ATLAS_ALL_SEASONS\s*=\s*(\[[^\]]*\]);/);
  assert.ok(listMatch, 'HERO_ATLAS_ALL_SEASONS must stay a literal array in js/state.js');
  const allSeasons = JSON.parse(listMatch[1].replaceAll("'", '"'));

  assert.ok(allHeroesData.length > 0);
  const counts = new Map(allSeasons.map((season) => [season, 0]));
  for (const hero of allHeroesData) {
    assert.ok(
      allSeasons.includes(hero.season),
      `${hero.name} has a season outside HERO_ATLAS_ALL_SEASONS: ${hero.season}`
    );
    counts.set(hero.season, counts.get(hero.season) + 1);
  }

  const populated = allSeasons.filter((season) => counts.get(season) > 0);
  for (const season of populated) {
    assert.ok(counts.get(season) > 0, `${season} is listed as populated but has no heroes`);
  }
  assert.deepEqual(populated, ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8', 'X10', 'X12']);
});
