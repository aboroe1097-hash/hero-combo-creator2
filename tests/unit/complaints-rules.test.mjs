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

test('the complaints collection is create-only for members and superadmin-read', () => {
  // A two-segment document path. The previous complaints/records/{id} was a
  // collection path, so no filing could ever be written or read.
  const block = rulesBlock(rules, /match \/complaints\/\{complaintId\} \{[\s\S]*?\n {4}\}/);
  assert.match(block, /allow read: if isSuperAdmin\(\);/);
  assert.match(
    block,
    /allow create: if signedIn\(\)\n\s+&& complaintId\.matches\('\^\[A-Za-z0-9\]\{20\}\$'\)\n\s+&& validComplaint\(complaintId\);/
  );
  assert.match(block, /allow update: if isSuperAdmin\(\) && validComplaintReview\(\);/);
  // Spam and personal data must be purgeable, by a superadmin only.
  assert.match(block, /allow delete: if isSuperAdmin\(\);/);
  // No candidate path may exist: there is exactly one read rule for the inbox
  // and it names the superadmin claim.
  assert.doesNotMatch(block, /allow read: if (?:signedIn|isAdmin|isOwner)\(/);
});

test('an anonymous filing may not carry identity fields at all', () => {
  const validator = rulesBlock(rules, /function validComplaint\(complaintId\) \{[\s\S]*?\n {4}\}/);
  // hasOnly() permits the two identity fields to exist, so anonymity is enforced
  // by rejecting them outright on the anonymous branch rather than by omission.
  assert.match(
    validator,
    /&& \(!d\.anonymous \|\| !\('submittedBy' in d\)\)\n\s+&& \(!d\.anonymous \|\| !\('submittedByName' in d\)\)/
  );
  // A named filing must be attributable, and only to the caller.
  assert.match(validator, /&& \(d\.anonymous \|\| d\.submittedBy == request\.auth\.uid\)/);
  assert.match(
    validator,
    /&& \(d\.anonymous\n\s+\|\| \(d\.submittedByName is string\n\s+&& d\.submittedByName\.size\(\) > 0\n\s+&& d\.submittedByName\.size\(\) <= 80\)\)/
  );
  // The bool check has to precede every anonymous branch or the evaluator
  // would read a missing field and deny a perfectly good write.
  assert.ok(
    validator.indexOf('d.anonymous is bool') < validator.indexOf("!('submittedBy' in d)"),
    'anonymous must be type-checked before it is branched on'
  );
  assert.ok(
    validator.indexOf('d.anonymous is bool') < validator.indexOf('d.anonymous || d.submittedBy'),
    'anonymous must be type-checked before the named branch'
  );
  // The reason the shape is this strict belongs in the file, next to it.
  assert.match(rules, /ANONYMITY IS STRUCTURAL, NOT COSMETIC/);
});

test('the complaint validator bounds every field a member can set', () => {
  const validator = rulesBlock(rules, /function validComplaint\(complaintId\) \{[\s\S]*?\n {4}\}/);
  assert.match(
    validator,
    /d\.keys\(\)\.hasOnly\(\[\n\s+'category', 'description', 'images', 'anonymous',\n\s+'submittedBy', 'submittedByName', 'createdAt', 'reviewed'\n\s+\]\)/
  );
  assert.match(
    validator,
    /d\.keys\(\)\.hasAll\(\['category', 'description', 'images', 'anonymous', 'createdAt', 'reviewed'\]\)/
  );
  assert.match(
    validator,
    /d\.category in \['bug', 'missing', 'conduct', 'fair-play', 'alliance', 'other'\]/
  );
  assert.match(validator, /d\.description is string/);
  assert.match(validator, /d\.description\.size\(\) >= 10/);
  assert.match(validator, /d\.description\.size\(\) <= 4000/);
  assert.match(validator, /d\.images is list/);
  assert.match(validator, /d\.images\.size\(\) <= 3/);
  // Index-bounded rather than looped: rules have no loops, and three guarded
  // indices keep the expression count flat on a file near the 1000 ceiling.
  for (const index of [0, 1, 2]) {
    assert.match(
      validator,
      new RegExp(`validComplaintImage\\(d\\.images\\[${index}\\], complaintId\\)`)
    );
  }
  assert.doesNotMatch(validator, /d\.images\[3\]/);
  assert.match(validator, /d\.createdAt == request\.time/);
  assert.match(validator, /d\.reviewed == false/);
  // Rate limit: the same batch must stamp the session's throttle document.
  assert.match(
    validator,
    /getAfter\(\/databases\/\$\(database\)\/documents\/complaint_throttle\/\$\(request\.auth\.uid\)\)\.data\.lastAt\n\s+== request\.time/
  );
  const throttle = rulesBlock(rules, /match \/complaint_throttle\/\{uid\} \{[\s\S]*?\n {4}\}/);
  assert.match(throttle, /allow read: if false;/);
  assert.match(throttle, /resource\.data\.lastAt < request\.time - duration\.value\(10, 'm'\)/);
  assert.match(throttle, /allow delete: if false;/);
});

test('every image reference is a bounded path under its own filing, never a uid', () => {
  const validator = rulesBlock(
    rules,
    /function validComplaintImage\(path, complaintId\) \{[\s\S]*?\n {4}\}/
  );
  assert.match(validator, /path is string/);
  assert.match(validator, /path\.size\(\) <= 320/);
  // Written with String.raw so the two backslashes Firestore needs to escape
  // the dot in its RE2 pattern are not mistaken for regex escapes here.
  assert.ok(
    validator.includes(
      String.raw`path.matches('^complaints/[A-Za-z0-9]{20}/[A-Za-z0-9_-]{1,150}\\.(jpg|jpeg|png|webp)$')`
    ),
    'the image path pattern must bound every segment and the extension'
  );
  // Pinned to the document's own id: a filing cannot reference another
  // filing's screenshots, and no uid ever appears in a stored path.
  assert.match(validator, /path\.split\('\/'\)\[1\] == complaintId/);
  assert.doesNotMatch(validator, /request\.auth\.uid/);
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

test('screenshots are create-only under the filing id, with size and type caps', () => {
  assert.match(storageRules, /^rules_version = '2';/);
  assert.match(storageRules, /service firebase\.storage \{/);
  const block = rulesBlock(
    storageRules,
    /match \/complaints\/\{complaintId\}\/\{fileName\} \{[\s\S]*?\n {4}\}/
  );
  assert.match(block, /allow read: if isSuperAdmin\(\);/);
  assert.match(
    block,
    /allow create: if signedIn\(\)\n\s+&& complaintId\.matches\('\^\[A-Za-z0-9\]\{20\}\$'\)\n\s+&& resource == null/
  );
  assert.match(block, /request\.resource\.size <= 2 \* 1024 \* 1024/);
  assert.match(
    block,
    /request\.resource\.contentType in \['image\/jpeg', 'image\/png', 'image\/webp'\]/
  );
  assert.match(block, /fileName\.size\(\) <= 160/);
  assert.ok(
    block.includes(String.raw`fileName.matches('^[A-Za-z0-9_-]{1,150}\\.(jpg|jpeg|png|webp)$')`),
    'the storage file name pattern must bound the name and the extension'
  );
  assert.match(block, /allow update: if false;/);
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
