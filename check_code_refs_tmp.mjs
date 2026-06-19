import fs from 'fs';
import path from 'path';

// Find references to js modules in index.html
const index = fs.readFileSync('index.html', 'utf8');
const scriptRefs = [...index.matchAll(/src=["']([^"']+\.js)["']/g)].map(m => m[1]);
console.log('Script refs in index.html:', scriptRefs.length);
scriptRefs.forEach(r => console.log('  ', r));

// Find version/hash query strings
const versioned = [...index.matchAll(/\?v=([^"'\s]+)/g)].map(m => m[1]);
const uniqueVersions = new Set(versioned);
console.log('Version query strings:', versioned.length, 'unique:', uniqueVersions.size);
uniqueVersions.forEach(v => console.log('  ', v));

// Check if referenced JS files exist
for (const r of scriptRefs) {
  if (/^https?:\/\//.test(r)) continue;
  const p = r.startsWith('/') ? r.slice(1) : r.replace(/\?.*$/, '');
  if (!fs.existsSync(p)) console.log('Missing script file:', r, '->', p);
}
