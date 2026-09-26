// "Contact Devs" leads to the feedback/complaint form on the Eden page, never
// to a mail client.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const pages = readdirSync(repoRoot).filter((name) => name.endsWith('.html'));

test('no page links Contact Devs to a mailto address', () => {
  let found = 0;
  pages.forEach((page) => {
    const html = readFileSync(join(repoRoot, page), 'utf8');
    const links = html.match(/<a\b[^>]*>\s*Contact Devs\s*<\/a\s*>/g) || [];
    links.forEach((link) => {
      found += 1;
      assert.doesNotMatch(link, /mailto:/, `${page}: ${link}`);
      assert.match(link, /href="eden-x2\.html#edenX1Complaints"/, `${page}: ${link}`);
    });
  });
  assert.ok(found >= 6, `expected the footer link on at least 6 pages, found ${found}`);
});

test('the tool-shell footer contact opens the complaint form too', () => {
  const shell = readFileSync(join(repoRoot, 'js/tool-shell.js'), 'utf8');
  assert.doesNotMatch(shell, /contact\.href\s*=\s*'mailto:/);
  assert.match(shell, /contact\.href = 'eden-x2\.html#edenX1Complaints'/);
});

test('the complaint section answers the link hash', async () => {
  const html = readFileSync(join(repoRoot, 'eden-x2.html'), 'utf8');
  assert.match(html, /id="edenX1Complaints"/);
  const { complaintLinkRequested, COMPLAINT_LINK_HASH } =
    await import('../../js/eden-complaints.js');
  assert.equal(COMPLAINT_LINK_HASH, 'edenX1Complaints');
  assert.equal(complaintLinkRequested('#edenX1Complaints'), true);
  assert.equal(complaintLinkRequested('#vote'), false);
  assert.equal(complaintLinkRequested(''), false);
});
