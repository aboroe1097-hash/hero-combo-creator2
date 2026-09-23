// Verifies the dataset normalizers execute and produce real HTML without needing
// node_modules (only the Chromium step does). Writes one .html per export.
import fs from 'node:fs';
import path from 'node:path';
import { loadExportBranding } from './lib/env.mjs';
import { renderDocument } from './lib/layout.mjs';
import {
  edenHonorBuildings,
  edenSiegeStructures,
  edenSpecialtyHonor,
  edenTileLevels,
} from './datasets/eden.mjs';
import { dmCrafting, dmEnhancement } from './datasets/dm.mjs';

const outDir = path.join(import.meta.dirname, '.preview');
fs.mkdirSync(outDir, { recursive: true });

const builders = [
  edenHonorBuildings,
  edenSpecialtyHonor,
  edenSiegeStructures,
  edenTileLevels,
  dmEnhancement,
  dmCrafting,
];

let failures = 0;
for (const build of builders) {
  try {
    const doc = await build();
    const { branding } = await loadExportBranding({
      revision: 'check',
      verificationStatus: 'current',
    });
    const html = renderDocument({
      branding,
      eyebrow: doc.eyebrow,
      title: doc.title,
      subtitle: doc.subtitle,
      meta: doc.meta,
      sections: doc.sections.filter(Boolean),
    });
    const file = path.join(outDir, doc.filename.replace(/\.pdf$/, '.html'));
    fs.writeFileSync(file, html);
    const tables = (html.match(/<table>/g) || []).length;
    const rows = (html.match(/<tr>/g) || []).length;
    const gaps = (html.match(/not supplied/g) || []).length;
    const brand = html.includes('Hero Combo Creator — VTS 1097');
    console.log(
      `${doc.filename.padEnd(42)} tables=${String(tables).padStart(2)} rows=${String(rows).padStart(4)} ` +
        `gaps=${String(gaps).padStart(3)} brand=${brand ? 'yes' : 'NO'} bytes=${html.length}`
    );
  } catch (error) {
    failures += 1;
    console.log(`${String(build.name).padEnd(24)} FAILED: ${error.message}`);
  }
}
console.log(failures ? `\n${failures} builder(s) failed` : '\nAll builders produced HTML');
process.exitCode = failures ? 1 : 0;
