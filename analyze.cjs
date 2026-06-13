const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\alsel\\Downloads\\vts_debug_export_1781394790835.csv', 'utf8').split('\n').filter(Boolean);

const masterCounts = {};
for(let i=1; i<lines.length; i++) {
  // Use a simple state machine to parse CSV line correctly
  const row = [];
  let inQuotes = false;
  let val = '';
  for (let j = 0; j < lines[i].length; j++) {
    const char = lines[i][j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(val);
      val = '';
    } else {
      val += char;
    }
  }
  row.push(val);
  
  if (row.length < 8) continue;
  let raw = row[4];
  let master = row[5];
  masterCounts[master] = (masterCounts[master] || 0) + 1;
}

const masters = Object.keys(masterCounts);
console.log('Total unique grouped players:', masters.length);

const levenshtein = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

console.log('\nPotential missing groupings:');
for(let i=0; i<masters.length; i++) {
  for(let j=i+1; j<masters.length; j++) {
    const m1 = masters[i];
    const m2 = masters[j];
    
    if ((m1 === 'Molly' && m2 === 'Molly Banner') || (m2 === 'Molly' && m1 === 'Molly Banner')) continue;
    if ((m1.toLowerCase() === 'malakabo' && m2.toLowerCase() === 'malakado') || (m2.toLowerCase() === 'malakabo' && m1.toLowerCase() === 'malakado')) continue;
    if ((m1.toLowerCase() === 'sarafino' && m2.toLowerCase() === 'sarafina') || (m2.toLowerCase() === 'sarafino' && m1.toLowerCase() === 'sarafina')) continue;

    let c1 = m1.toLowerCase().replace(/[^a-z0-9]/g, '');
    let c2 = m2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!c1 || !c2) continue;
    
    if (c1 === c2 && m1 !== m2) {
      console.log(' EXACT ALPHANUM MATCH:', m1, 'vs', m2);
    } else if (c1.length > 4 && c2.length > 4 && levenshtein(c1, c2) === 1) {
      console.log(' 1-TYPO MATCH:', m1, 'vs', m2);
    }
  }
}
