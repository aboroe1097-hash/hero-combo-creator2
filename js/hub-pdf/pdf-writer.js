// js/hub-pdf/pdf-writer.js
// A tiny PDF writer for the hub sheets: one JPEG image per page, A4 portrait in
// points, no dependencies. The hub downloads are page images, so a full PDF
// engine would be dead weight; this only has to emit a valid file that every
// reader can open, print and search by its embedded text layer of page images.
//
// Layout: 1 Catalog, 2 Pages, then three objects per page — the Page, its
// content stream (place the image over the whole page) and the image XObject
// (DCTDecode, i.e. the JPEG bytes straight from the canvas).

/** A4 in points, the size hub sheets are drawn for. */
export const PDF_PAGE = Object.freeze({ width: 595.28, height: 841.89 });

const PDF_HEADER = '%PDF-1.4\n';
// A JPEG carries its own dimensions and colour space; the dictionary just has
// to declare the filter and the pixel size.
const IMAGE_DICT = (width, height, length) =>
  `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${length} >>`;

function latin1Bytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value))
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError('Page images must be byte arrays (a JPEG encoded canvas).');
}

/**
 * Build a PDF from page images.
 *
 * @param {Array<{ bytes: Uint8Array, width: number, height: number }>} pages
 *   JPEG bytes with their pixel dimensions, one entry per page.
 * @param {{ pageWidth?: number, pageHeight?: number, title?: string }} [options]
 * @returns {Uint8Array} the complete PDF file.
 */
export function buildJpegPdf(pages, options = {}) {
  const list = Array.isArray(pages) ? pages : [];
  if (!list.length) throw new Error('A PDF needs at least one page image.');
  const pageWidth = Number(options.pageWidth) > 0 ? Number(options.pageWidth) : PDF_PAGE.width;
  const pageHeight = Number(options.pageHeight) > 0 ? Number(options.pageHeight) : PDF_PAGE.height;
  const title = typeof options.title === 'string' ? options.title : '';

  const chunks = [latin1Bytes(PDF_HEADER)];
  const offsets = [];
  let length = chunks[0].length;

  const push = (value) => {
    const bytes = typeof value === 'string' ? latin1Bytes(value) : toBytes(value);
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (index) => {
    offsets[index] = length;
    push(`${index} 0 obj\n`);
  };

  // 1 = Catalog, 2 = Pages, 3 = Info (kept for readers that show a title).
  const firstPageObject = 4;
  const pageObjectIds = list.map((_, index) => firstPageObject + index * 3);

  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${list.length} >>\nendobj\n`
  );
  startObject(3);
  const titleBytes = latin1Bytes(title);
  push(
    `<< /Type /Info /Producer (RoC VTS Toolkit) /Title <${[...titleBytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}> >>\nendobj\n`
  );

  list.forEach((page, index) => {
    const image = toBytes(page.bytes);
    const imageWidth = Math.round(Number(page.width) || 0);
    const imageHeight = Math.round(Number(page.height) || 0);
    if (!imageWidth || !imageHeight) throw new Error('Every page image needs its pixel size.');
    const pageId = firstPageObject + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const content = `q ${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm /Im0 Do Q\n`;
    const contentBytes = latin1Bytes(content);

    startObject(pageId);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );
    startObject(contentId);
    push(`<< /Length ${contentBytes.length} >>\nstream\n`);
    push(contentBytes);
    push('endstream\nendobj\n');
    startObject(imageId);
    push(`${IMAGE_DICT(imageWidth, imageHeight, image.length)}\nstream\n`);
    push(image);
    push('\nendstream\nendobj\n');
  });

  const xrefOffset = length;
  const objectCount = 3 + list.length * 3;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objectCount; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const file = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    file.set(chunk, cursor);
    cursor += chunk.length;
  }
  return file;
}

/** How many pages a PDF built by {@link buildJpegPdf} declares. */
export function pdfPageCount(bytes) {
  const text = new TextDecoder('latin1').decode(toBytes(bytes));
  const match = /\/Type\s*\/Pages\b[^>]*\/Count\s+(\d+)/.exec(text);
  return match ? Number(match[1]) : 0;
}
