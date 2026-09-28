import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Contract tests for the Issue/Complaint storage and access rules.
//
// These are the security boundary for the feature and they are the two files
// nobody can exercise from the app: a browser cannot prove that an anonymous
// filing carries no identity field, and it cannot prove that a second member
// cannot read the inbox. Firestore and Storage evaluate both, so the assertions
// below pin the exact expressions they evaluate — an edit that weakens them
// fails here rather than in production.

const rules = readFileSync('firestore.rules', 'utf8');
const storageRules = readFileSync('storage.rules', 'utf8');
const firebaseConfig = JSON.parse(readFileSync('firebase.json', 'utf8'));

function rulesBlock(source, pattern) {
  const match = source.match(pattern);
  assert.ok(match, `missing rules block: ${pattern}`);
  return match[0];
}

test('complaints are superadmin-read and no client can create one', () => {
  const block = rulesBlock(rules, /match \/complaints\/\{complaintId\} \{[\s\S]*?\n {4}\}/);
  assert.match(block, /allow read: if isSuperAdmin\(\);/);
  // The fileComplaint callable is the only writer; a client create path would
  // need a uid-keyed throttle stamp, which is what de-anonymised filings.
  assert.match(block, /allow create: if false;/);
  assert.match(block, /allow update: if isSuperAdmin\(\) && validComplaintReview\(\);/);
  // Spam and personal data must be purgeable, by a superadmin only.
  assert.match(block, /allow delete: if isSuperAdmin\(\);/);
  assert.doesNotMatch(block, /allow read: if (?:signedIn|isAdmin|isOwner)\(/);
  // The reason belongs in the file, next to the rule.
  assert.match(rules, /ANONYMITY IS STRUCTURAL, NOT COSMETIC/);
  assert.doesNotMatch(rules, /function validComplaint\(/);
});

test('no per-member complaint trace is writable or readable by any client', () => {
  const throttle = rulesBlock(rules, /match \/complaint_throttle\/\{uid\} \{[\s\S]*?\n {4}\}/);
  assert.match(throttle, /allow read, write: if false;/);
  const cap = rulesBlock(rules, /match \/complaint_rate_limits\/\{day\} \{[\s\S]*?\n {4}\}/);
  assert.match(cap, /allow read, write: if false;/);
  assert.doesNotMatch(rules, /complaint_throttle\/\$\(request\.auth\.uid\)/);
});

test('reviewing is the only permitted update and cannot rewrite what was filed', () => {
  const validator = rulesBlock(rules, /function validComplaintReview\(\) \{[\s\S]*?\n {4}\}/);
  assert.match(
    validator,
    /d\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['reviewed', 'reviewedAt', 'reviewedBy'\]\)/
  );
  assert.match(validator, /d\.reviewed is bool/);
  assert.match(validator, /d\.reviewedBy == request\.auth\.uid/);
  assert.match(validator, /d\.reviewedAt == request\.time/);
});

test('screenshots are written only by the callable and read only by a superadmin', () => {
  assert.match(storageRules, /^rules_version = '2';/);
  assert.match(storageRules, /service firebase\.storage \{/);
  const block = rulesBlock(
    storageRules,
    /match \/complaints\/\{complaintId\}\/\{fileName\} \{[\s\S]*?\n {4}\}/
  );
  assert.match(block, /allow read: if isSuperAdmin\(\);/);
  // A client create rule would let any anonymous visitor upload unmetered.
  assert.match(block, /allow create, update: if false;/);
  assert.doesNotMatch(block, /allow create: if signedIn/);
  assert.match(block, /allow delete: if isSuperAdmin\(\);/);
  // Deny by default for everything else, including every other bucket prefix.
  assert.match(
    storageRules,
    /match \/\{allPaths=\*\*\} \{\n\s+allow read, write: if false;\n\s+\}/
  );
  assert.match(
    storageRules,
    /function isSuperAdmin\(\) \{\n\s+return signedIn\(\) && request\.auth\.token\.superadmin == true;/
  );
});

test('the project configuration points Storage at the new rules file', () => {
  assert.deepEqual(firebaseConfig.storage, { rules: 'storage.rules' });
  assert.equal(firebaseConfig.firestore.rules, 'firestore.rules');
  // Pages deploys do not carry rules; the file has to be deployable on its own.
  assert.match(storageRules, /match \/b\/\{bucket\}\/o \{/);
});
