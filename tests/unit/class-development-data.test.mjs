import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLASS_DEVELOPMENT_PROFILES,
  getClassDevelopmentProfile,
  getNextClassCheckpoint,
  validateClassDevelopmentProfiles,
} from '../../js/class-development-data.js';

test('class development ships the four source-backed class roadmaps', () => {
  assert.deepEqual(
    CLASS_DEVELOPMENT_PROFILES.map((profile) => profile.id),
    ['raider', 'farmer', 'trader', 'craftsman']
  );
  assert.deepEqual(validateClassDevelopmentProfiles(), []);
  assert.ok(CLASS_DEVELOPMENT_PROFILES.every(Object.isFrozen));
});

test('checkpoint navigator returns the first reset strictly above the current level', () => {
  assert.equal(getNextClassCheckpoint('raider', 1), 14);
  assert.equal(getNextClassCheckpoint('raider', 14), 29);
  assert.equal(getNextClassCheckpoint('farmer', 124), 125);
  assert.equal(getNextClassCheckpoint('trader', 111), null);
  assert.equal(getNextClassCheckpoint('missing', 1), null);
});

test('each final target matches the published sheet endpoint and has card allocation', () => {
  assert.equal(getClassDevelopmentProfile('raider').finalLevel, 138);
  assert.equal(getClassDevelopmentProfile('farmer').finalLevel, 130);
  assert.equal(getClassDevelopmentProfile('trader').finalLevel, 111);
  assert.equal(getClassDevelopmentProfile('craftsman').finalLevel, 118);
  for (const profile of CLASS_DEVELOPMENT_PROFILES) {
    assert.ok(profile.priorities.length >= 8, `${profile.id} needs a useful priority path`);
    assert.ok(profile.targets.length >= 4, `${profile.id} needs final targets`);
    assert.match(profile.sourceUrl, /^https:\/\/(www\.)?l96\.app\//);
  }
});

test('validator rejects malformed checkpoint data', () => {
  const broken = [
    {
      ...getClassDevelopmentProfile('raider'),
      checkpoints: [29, 14],
      finalLevel: 14,
    },
  ];
  assert.ok(validateClassDevelopmentProfiles(broken).some((error) => error.includes('ascending')));
});

test('red reset priorities sit in the checkpoint column each sheet marks them', () => {
  // Read from the red cells of the supplied L96 sheets. Every priority must name
  // its reset level, and that level must be one of the profile's own checkpoints.
  const expected = {
    raider: [14, 29, 42, 51, 65, 80, 89, 102, 119, 121],
    farmer: [19, 28, 41, 48, 56, 83, 99, 105, 121, 125],
    trader: [25, 32, 43, 52, 56, 67, 76, 89, 100, 103],
    craftsman: [54, 63, 81, 98, 100, 112, 115, 118],
  };
  for (const [id, levels] of Object.entries(expected)) {
    const profile = CLASS_DEVELOPMENT_PROFILES.find((entry) => entry.id === id);
    assert.deepEqual(
      profile.priorities.map((priority) => priority.level),
      levels,
      id
    );
    for (const level of levels) assert.ok(profile.checkpoints.includes(level), `${id} ${level}`);
  }
  const farmer = CLASS_DEVELOPMENT_PROFILES.find((entry) => entry.id === 'farmer');
  assert.equal(farmer.priorities.find((p) => p.level === 105).skill, 'Questing Adventurer VI');
});
