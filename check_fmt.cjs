const prettier = require('prettier');
const fs = require('fs');

async function main() {
  const files = ['ar','de','es','fr','hr','id','index','kr','pt','ru','tr','zh'].map(f => 'js/i18n/all-star-boh/' + f + '.js');
  files.push('tests/unit/all-star-boh-page.test.mjs');
  let written = 0;
  for (const f of files) {
    const config = await prettier.resolveConfig(f);
    const code = fs.readFileSync(f, 'utf8');
    const formatted = await prettier.format(code, { filepath: f, ...config });
    if (code !== formatted) {
      fs.writeFileSync(f, formatted);
      written++;
      console.log('Fixed:', f);
    }
  }
  console.log('Done:', written, 'files written');
}
main();
