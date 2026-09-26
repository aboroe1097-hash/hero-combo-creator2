import fs from 'node:fs';

// 1. Module: the homepage callout points at Eden's vote instead of the game.
{
  const file = 'js/siege-promo.js';
  let s = fs.readFileSync(file, 'utf8');
  const swaps = [
    [
      '// "Try Velo\'s Rampart" prompts for the rest of the site: the featured Arcade\n// banner and a one-time homepage callout.',
      '// Prompts for the rest of the site: the featured Arcade banner for Velo\'s\n// Rampart, and a one-time homepage callout that sends members to the Eden\n// page to vote for the best members.',
    ],
    [
      "const SIEGE_URL = '/eden-siege.html';",
      "const SIEGE_URL = '/eden-siege.html';\nconst EDEN_URL = '/eden-x2.html';",
    ],
    [
      'root.setAttribute(\'aria-label\', copy.siegeCalloutTitle || "Velo\'s Rampart");',
      "root.setAttribute('aria-label', copy.siegeCalloutTitle || 'Vote for the best members');",
    ],
    [
      'const title = element(\'strong\', \'siege-callout-title\', copy.siegeCalloutTitle || "NEW: Velo\'s Rampart — play now");',
      "const title = element(\n    'strong',\n    'siege-callout-title',\n    copy.siegeCalloutTitle || 'Vote for the best members'\n  );",
    ],
    ['play.href = SIEGE_URL;', 'play.href = EDEN_URL;'],
    [
      'root.setAttribute(\'aria-label\', next.siegeCalloutTitle || "Velo\'s Rampart");',
      "root.setAttribute('aria-label', next.siegeCalloutTitle || 'Vote for the best members');",
    ],
  ];
  for (const [from, to] of swaps) {
    if (!s.includes(from)) {
      console.error('module anchor missing:', from.slice(0, 70));
      process.exit(1);
    }
    s = s.replace(from, to);
  }
  fs.writeFileSync(file, s);
  console.log('module: callout now sends members to Eden');
}

// 2. Copy in all twelve catalogs.
const copy = {
  en: ['Vote for the best members', 'The Eden X2 Team Players and management votes are open.', 'Go to Eden'],
  ar: ['صوّت لأفضل الأعضاء', 'تصويت لاعبي الفريق والإدارة في Eden X2 مفتوح.', 'إلى Eden'],
  de: ['Stimme für die besten Mitglieder', 'Die Team-Players- und Management-Abstimmung für Eden X2 ist offen.', 'Zu Eden'],
  es: ['Vota por los mejores miembros', 'Las votaciones de Team Players y gestión de Eden X2 están abiertas.', 'Ir a Eden'],
  fr: ['Votez pour les meilleurs membres', 'Les votes Team Players et gestion d’Eden X2 sont ouverts.', 'Aller à Eden'],
  id: ['Pilih anggota terbaik', 'Pemungutan suara Team Players dan manajemen Eden X2 dibuka.', 'Ke Eden'],
  it: ['Vota i migliori membri', 'Le votazioni Team Players e gestione di Eden X2 sono aperte.', 'Vai a Eden'],
  kr: ['최고의 멤버에게 투표하세요', 'Eden X2 팀 플레이어와 관리진 투표가 열렸습니다.', 'Eden으로'],
  pt: ['Vote nos melhores membros', 'As votações de Team Players e gestão da Eden X2 estão abertas.', 'Ir para Eden'],
  ru: ['Голосуйте за лучших участников', 'Голосования Team Players и управления Eden X2 открыты.', 'Перейти в Eden'],
  tr: ['En iyi üyeler için oy verin', 'Eden X2 Team Players ve yönetim oylaması açık.', 'Eden’a git'],
  zh: ['为最佳成员投票', 'Eden X2 的 Team Players 与管理层投票已开启。', '前往 Eden'],
};

for (const [lang, [title, body, play]] of Object.entries(copy)) {
  const file = `js/i18n/${lang}.js`;
  let s = fs.readFileSync(file, 'utf8');
  const setValue = (key, value) => {
    const pattern = new RegExp(`(${key}: )'(?:[^'\\\\]|\\\\.)*'`);
    if (!pattern.test(s)) {
      console.error(`missing ${key} in ${file}`);
      process.exit(1);
    }
    s = s.replace(pattern, `$1'${value}'`);
  };
  setValue('siegeCalloutTitle', title);
  setValue('siegeCalloutBody', body);
  setValue('siegeCalloutPlay', play);
  fs.writeFileSync(file, s);
  console.log('copy updated in', file);
}

console.log('banner swap complete');
