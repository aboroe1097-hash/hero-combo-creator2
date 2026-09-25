import assert from 'node:assert/strict';
import test from 'node:test';

import { PDF_PAGE, buildJpegPdf, pdfPageCount } from '../../js/hub-pdf/pdf-writer.js';

// The payload never matters to the writer: it copies JPEG bytes into the file.
const jpegBytes = () =>
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
const page = () => ({ bytes: jpegBytes(), width: 1588, height: 2246 });
const latin1 = (bytes) => new TextDecoder('latin1').decode(bytes);

test('the writer emits a PDF header and one page object per image', () => {
  const bytes = buildJpegPdf([page(), page(), page()]);
  const text = latin1(bytes);
  assert.match(text, /^%PDF-1\.4\n/);
  assert.equal(pdfPageCount(bytes), 3);
  assert.equal((text.match(/\/Type \/Page[^s]/g) || []).length, 3, 'three page objects');
  assert.equal((text.match(/\/Subtype \/Image/g) || []).length, 3, 'three image objects');
  assert.match(text, /\/Filter \/DCTDecode/);
  assert.ok(bytes instanceof Uint8Array);
});

test('the xref table points at every object and the trailer closes the file', () => {
  const bytes = buildJpegPdf([page(), page()]);
  const text = latin1(bytes);
  const parsed = /xref\n0 (\d+)\n([\s\S]*?)trailer\n([\s\S]*?)startxref\n(\d+)\n%%EOF\n$/.exec(
    text
  );
  assert.ok(parsed, 'the file carries an xref table, a trailer and an EOF marker');
  const [, size, body, trailer, startxref] = parsed;
  const entries = body.trimEnd().split('\n');
  assert.equal(entries.length, Number(size), 'the xref covers every object plus the free head');
  assert.match(entries[0], /^0000000000 65535 f $/);
  entries.slice(1).forEach((entry, index) => {
    const offset = Number(entry.slice(0, 10));
    assert.ok(
      text.slice(offset).startsWith(`${index + 1} 0 obj
`),
      `object ${index + 1} starts at its recorded offset`
    );
  });
  assert.match(trailer, new RegExp(`/Size ${Number(size)}`));
  assert.match(trailer, /\/Root 1 0 R/);
  assert.equal(Number(startxref), text.indexOf('xref\n'));
});

test('pages are A4 portrait frames in points, with the image drawn across them', () => {
  const text = latin1(buildJpegPdf([page()]));
  const width = PDF_PAGE.width.toFixed(2);
  const height = PDF_PAGE.height.toFixed(2);
  assert.match(text, new RegExp(`/MediaBox \\[0 0 ${width} ${height}\\]`));
  assert.match(text, new RegExp(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`));
});

test('the writer refuses a file without pages or without pixel sizes', () => {
  assert.throws(() => buildJpegPdf([]), /at least one page/);
  assert.throws(() => buildJpegPdf([{ bytes: jpegBytes(), width: 0, height: 10 }]), /pixel size/);
});
