import fs from 'fs';

const userOcrRaw = `
#1	Тихий58	82,188
#2	Lord_IKR_	81,357
#3	JamboJango	71,296
#4	Furea	71,065
#5	~Kika~	69,656
#6	~ Pink ~	69,368
#7	~Pink~	69,368
#8	•Lisavetka•	67,536
#9	Dr Thunder 293	67,456
#10	키키 kimmy	67,256
#11	Take Ur Shin	66,337
#12	ANGEL	66,130
#13	BiG BOiiE	64,940
#14	Lady Zubbs	64,810
#15	hunter killer.	64,195
#16	PeacefulWarrior	63,687
#17	old man war	63,360
#18	Kika	62,935
#19	ylli90	62,749
#20	@.Jasper.@	62,694
#21	BoneSmoker	62,619
#22	Liskoo	61,395
#23	AK Чапаи	61,056
#24	○UNDEADO○	60,191
#25	~RuCCaK~	59,842
#26	La Scimmia	59,165
#27	CoBoP	58,878
#28	✨MasterVj✨	58,192
#29	Lord Chandu !	57,484
#30	RAZMY	57,306
#31	Bil.	56,623
#32	Doedoom	56,216
#33	Anne	55,822
#34	D off y.	55,632
#35	ŸPixel	55,616
#36	MalakAdo	55,488
#37	~Sarafino~	55,488
#38	~Roha~	55,425
#39	!!Uzumaki !!	54,234
#40	春风.	53,705
#41	jJamaica pete	52,460
#42	MalakAbo	49,326
#43	Ninja-Ghost	48,771
#44	TazzBoy	48,114
#45	EightBall _W/_	46,886
#46	REDBULL§	46,036
#47	*Molly*	45,979
#48	Shah Shahib	44,226
#49	RedBull©	43,159
#50	☆Mariska☆	41,503
#51	q. Immortal	40,867
#52	Footloos	40,463
#53	Neutrino10	38,510
#54	乃ㄥ口毛	38,295
#55	Spoilage	37,860
#56	BONEfastBANNER	37,809
#57	billy221	37,780
#58	ZEROk*	36,530
#59	aida77	35,961
#60	..WAEL..	35,851
#61	*Zombi*	35,546
#62	- L7 -	35,097
#63	Jagmears	34,864
#64	DISASTER ENVOY	33,586
#65	abo teem	33,147
#66	UncensoredPlayer	32,808
#67	.Raell.	32,560
#68	-T@K@T@>	32,396
#69	★KoThawwKa★	31,582
#70	тyнг3ахур	31,031
#71	DvD18	30,059
#72	Mr. AHDP	29,944
#73	Indomie.telor....	29,862
#74	avcisl	29,395
#75	googleV	27,653
#76	FOR 400€	27,512
#77	Ar Ran ★_YG+62	26,158
#78	EviltwinII	25,050
#79	● AGAM ●	24,768
#80	AGAM	24,768
#81	Maximu$$s	18,308
#82	Moldo1313	17,523
#83	TITO B.	16,523
#84	terribile ivan	16,313
#85	~Sarafina~	14,940
#86	q. Immortalis	13,084
#87	super hai stop	12,144
#88	Humera	6,612
#89	Dizz.	4,550
#90	Loppu	4,027
#91	Sami8888	4,015
#92	Dizz..	2,276
#93	GrannyLavada!	465
#94	romanslavuta	424
`;

const lines = userOcrRaw.trim().split('\n');
const userPlayers = lines.map(line => {
  const parts = line.split('\t');
  if (parts.length >= 3) {
    return {
      rank: parts[0].replace('#', '').trim(),
      name: parts[1].trim(),
      value: parseInt(parts[2].replace(/,/g, ''), 10)
    };
  }
  return null;
}).filter(p => p);

const exactDataStr = fs.readFileSync('docs/dashboard_ExactTestdata.js', 'utf8');
const jsonStr = exactDataStr.replace('window.dashboardData = ', '').trim().replace(/;$/, '');
const exactData = JSON.parse(jsonStr);
const exactPlayers = exactData.attacks[0].players;

console.log('--- Comparison ---');
console.log('User Players Extracted:', userPlayers.length);
console.log('Exact Ground Truth Players:', exactPlayers.length);

let matches = 0;
let exactMap = new Map();
exactPlayers.forEach(p => exactMap.set(p.value, p));

let betterNames = [];
let missing = [];
let scoreMismatches = [];

userPlayers.forEach(up => {
  const ep = exactMap.get(up.value);
  if (ep) {
    matches++;
    if (ep.name !== up.name) {
      betterNames.push({ score: up.value, exactName: ep.name, ocrName: up.name });
    }
    exactMap.delete(up.value); // remove so we can find what's missing
  } else {
    scoreMismatches.push(up);
  }
});

console.log(`
--- Summary ---`);
console.log(`Matched Scores: ${matches} / ${exactPlayers.length}`);
console.log(`Scores missing from OCR that were in Exact Data: ${exactMap.size}`);
exactMap.forEach(ep => console.log(`  MISSING: ${ep.name} (${ep.value})`));

if (scoreMismatches.length > 0) {
  console.log(`
--- OCR extracted scores that are NOT in the exact data ---`);
  scoreMismatches.forEach(up => console.log(`  EXTRA/WRONG SCORE: ${up.name} (${up.value})`));
}

if (betterNames.length > 0) {
  console.log(`
--- Name Improvements (OCR successfully read tags/special chars) ---`);
  betterNames.forEach(x => {
    console.log(`  Score: ${x.score} | Exact: "${x.exactName}"  ==>  New OCR: "${x.ocrName}"`);
  });
}
