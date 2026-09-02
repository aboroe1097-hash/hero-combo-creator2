import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  VERIFICATION_STATUSES,
  provenanceFor,
  assertRenderable,
  provenanceBadge,
} from '../../js/codex-provenance.js';

const completeRecord = {
  heroName: 'Alfred',
  provenance: {
    source: 'l96.app hero profiles',
    credit: 'DonPablone',
    captureDate: '2026-09-02',
    gameVersionScope: 'S2',
    verificationStatus: 'historical',
  },
};

test('provenanceFor returns the 5-field object for a complete record', () => {
  const provenance = provenanceFor(completeRecord);
  assert.equal(provenance.source, 'l96.app hero profiles');
  assert.equal(provenance.credit, 'DonPablone');
  assert.equal(provenance.captureDate, '2026-09-02');
  assert.equal(provenance.gameVersionScope, 'S2');
  assert.equal(provenance.verificationStatus, 'historical');
});

test('provenanceFor returns null when any of the 5 fields is missing or empty', () => {
  for (const field of ['source', 'credit', 'captureDate', 'gameVersionScope', 'verificationStatus']) {
    const record = {
      provenance: {
        source: 's',
        credit: 'c',
        captureDate: '2026-09-02',
        gameVersionScope: 'S2',
        verificationStatus: 'historical',
      },
    };
    delete record.provenance[field];
    assert.equal(provenanceFor(record), null, `missing ${field}`);
  }
  assert.equal(provenanceFor({}), null);
  assert.equal(provenanceFor({ provenance: null }), null);
});

test('provenanceFor rejects unknown verification status values', () => {
  const record = {
    provenance: { ...completeRecord.provenance, verificationStatus: 'ancient' },
  };
  assert.equal(provenanceFor(record), null);
});

test('assertRenderable returns the provenance and throws for incomplete records', () => {
  assert.deepEqual(assertRenderable(completeRecord, 'unit'), completeRecord.provenance);
  assert.throws(() => assertRenderable({}, 'unit'), /incomplete provenance/);
});

test('provenanceBadge exposes all five fields and derives the status label key', () => {
  const translate = (key, fallback) => (key === 'codexStatusHistorical' ? 'Historisch' : fallback);
  const badge = provenanceBadge(completeRecord, translate);
  assert.equal(badge.source, 'l96.app hero profiles');
  assert.equal(badge.credit, 'DonPablone');
  assert.equal(badge.captureDate, '2026-09-02');
  assert.equal(badge.gameVersionScope, 'S2');
  assert.equal(badge.status, 'historical');
  assert.equal(badge.statusLabel, 'Historisch');
});

test('status enum is frozen with the three ratified values', () => {
  assert.deepEqual(VERIFICATION_STATUSES, ['current', 'historical', 'unverified']);
  assert.ok(Object.isFrozen(VERIFICATION_STATUSES));
});
