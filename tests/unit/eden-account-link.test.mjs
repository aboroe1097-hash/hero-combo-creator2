// Eden account link: the signed-in member's own roster row, which My Stats and
// the ballot both start from.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  EDEN_ACCOUNT_LINK_STATUS,
  EDEN_SIGNUP_PATH,
  isEdenAccountPlayerResolved,
  readEdenAccountGameName,
  resolveEdenAccountPlayer,
} from '../../js/eden-account-link.js';

test('an account resolves to a guild row, or falls back to search-by-hand', () => {
  const options = [
    { playerKey: 'malakabo', playerName: 'MalakAbo' },
    { playerKey: 'malakabo2', playerName: 'MalakAbo2' },
  ];
  const resolveOption = (value) =>
    options.find((option) => option.playerName.toLowerCase() === value.toLowerCase()) || null;
  const resolveMatches = (value) =>
    options.filter((option) => option.playerName.toLowerCase().includes(value.toLowerCase()));

  const found = resolveEdenAccountPlayer({ gameName: 'malakabo', resolveOption, resolveMatches });
  assert.equal(found.status, EDEN_ACCOUNT_LINK_STATUS.found);
  assert.equal(found.playerName, 'MalakAbo');
  assert.equal(isEdenAccountPlayerResolved(found), true);

  const unknown = resolveEdenAccountPlayer({
    gameName: 'Ghost',
    resolveOption,
    resolveMatches: () => [],
  });
  assert.equal(unknown.status, EDEN_ACCOUNT_LINK_STATUS.unknown);
  assert.equal(isEdenAccountPlayerResolved(unknown), false);
  assert.deepEqual(unknown.candidates, []);

  // Several rows fit and the matcher refused to choose: report the candidates,
  // resolve nothing, and let the member search the way they always could.
  const ambiguous = resolveEdenAccountPlayer({
    gameName: 'Mala',
    resolveOption: () => null,
    resolveMatches,
  });
  assert.equal(ambiguous.status, EDEN_ACCOUNT_LINK_STATUS.ambiguous);
  assert.equal(isEdenAccountPlayerResolved(ambiguous), false);
  assert.deepEqual(
    ambiguous.candidates.map((candidate) => candidate.playerName),
    ['MalakAbo', 'MalakAbo2']
  );

  const unlinked = resolveEdenAccountPlayer({ gameName: '   ', resolveOption, resolveMatches });
  assert.equal(unlinked.status, EDEN_ACCOUNT_LINK_STATUS.unlinked);

  // A lone fuzzy suggestion is not a match: only the matcher names the member,
  // so nobody's ballot is prefilled with a guess. A matcher that throws is a "no".
  const single = resolveEdenAccountPlayer({
    gameName: 'MalakAbo',
    resolveOption: () => null,
    resolveMatches: () => [options[0]],
  });
  assert.equal(single.status, EDEN_ACCOUNT_LINK_STATUS.ambiguous);
  assert.equal(isEdenAccountPlayerResolved(single), false);
  assert.equal(
    resolveEdenAccountPlayer({
      gameName: 'MalakAbo',
      resolveOption: () => {
        throw new Error('matcher exploded');
      },
      resolveMatches: () => {
        throw new Error('matcher exploded');
      },
    }).status,
    EDEN_ACCOUNT_LINK_STATUS.unknown
  );

  assert.equal(readEdenAccountGameName({ gameName: '  MalakAbo  ' }), 'MalakAbo');
  assert.equal(readEdenAccountGameName({ displayName: 'Old Field' }), 'Old Field');
  assert.equal(readEdenAccountGameName({ gameName: 'A', displayName: 'B' }), 'A');
  assert.equal(readEdenAccountGameName(null), '');
  assert.equal(readEdenAccountGameName({ gameName: 42 }), '42');
});

test('the Eden page prefills My Stats and the ballot from the account link', () => {
  const source = readFileSync('js/eden-x1.js', 'utf8');
  // One matcher, reused: the account link goes through the page's own
  // resolution, never a second matching implementation.
  assert.match(
    source,
    /resolveEdenAccountPlayer\(\{[\s\S]*?resolveOption: \(value\) => findEdenMemberOption\(value\)/
  );
  assert.match(source, /resolveMatches: \(value, limit\) => getPublicStatsMatches\(value, limit\)/);
  // Resolution is started with the live load and applied once the roster is
  // known, and it never blocks a render.
  assert.match(source, /requestEdenAccountGameName\(db, firestore, voteUser\);/);
  assert.match(source, /void applyEdenAccountLink\(\);/);
  assert.doesNotMatch(source, /await applyEdenAccountLink\(\)/);
  // Guests and failed reads short-circuit to today's behaviour.
  assert.match(source, /user\.isAnonymous !== false/);
  assert.match(source, /if \(!\s*gameName\) return null;/);
  // My Stats opens on the member's row unless they already searched.
  assert.match(
    source,
    /if \(!player\?\.playerName \|\| currentPublicStatsSearch\.trim\(\)\) return false;/
  );
  assert.match(
    source,
    /currentPublicStatsSearch = player\.playerName;[\s\S]*?rerenderPublicMyStatsCard\(host\);/
  );
  // The ballot's voter field is prefilled, without overwriting a typed name.
  assert.match(source, /if \(!input \|\| input\.value\.trim\(\)\) return false;/);
  assert.match(
    source,
    /input\.value = option\.playerName;\s*updateEdenVoteInputConfirmation\(rail, 'edenX1VoterName', option\);/
  );
  assert.match(
    source,
    /value="\$\{esc\(savedSummary\.voterName \|\| edenAccountPlayerName\(\)\)\}"/
  );
  // The invitation renders on the active season only, links to the form, and
  // names the linked player once the account resolves.
  assert.match(
    source,
    /function renderEdenSignupPrompt\(\) \{\s*if \(EDEN_X1_IS_ARCHIVE\) return '';/
  );
  assert.match(source, /href="\$\{EDEN_SIGNUP_PATH\}"/);
  assert.match(source, /renderEdenSignupPrompt\(\)\}\$\{renderEdenTopNamesOverview\(\)\}/);
  assert.match(source, /edenX1SignupPromptLinked', \{ player: linked \}/);
  assert.equal(EDEN_SIGNUP_PATH, 'vtsscore.html');
});
