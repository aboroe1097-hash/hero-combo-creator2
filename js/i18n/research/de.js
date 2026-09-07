// Display-only Research localization keyed by canonical tree and compound node IDs.
// IDs, numeric values, costs, artwork, and saved progress remain canonical elsewhere.

const trees = Object.freeze({
  d1956263: {
    name: 'Schnellproduktion',
    unlockCondition: 'Keine',
    primaryResource: 'Nur Ressourcen',
    pages: [],
  },
  b2691f74: {
    name: 'Stadtentwicklung',
    unlockCondition: 'Keine',
    primaryResource: 'Nur Ressourcen',
    pages: [],
  },
  '375d1626': {
    name: 'Kampfgrundlagen',
    unlockCondition: 'Keine',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: [],
  },
  '4a932eb0': {
    name: 'Zubehörproduktion',
    unlockCondition: 'Keine',
    primaryResource: 'Ressourcen',
    pages: [],
  },
  '802e7893': {
    name: 'Legionsforschung I',
    unlockCondition: 'Keine',
    primaryResource: 'Ressourcen',
    pages: [],
  },
  '38d12254': {
    name: 'Legionsforschung II',
    unlockCondition: 'Keine',
    primaryResource: 'Ressourcen',
    pages: [],
  },
  '5fef2163': {
    name: 'Legionsforschung III',
    unlockCondition: 'Keine',
    primaryResource: 'Ressourcen',
    pages: [],
  },
  cc2c9ee1: {
    name: 'Klassenlegionsforschung',
    unlockCondition: 'Keine',
    primaryResource: 'Ressourcen',
    pages: [],
  },
  '3929cbb9': {
    name: 'Verbesserte Sanitätsanlagen',
    unlockCondition: 'Keine',
    primaryResource: 'Ressourcen',
    pages: [],
  },
  f915a84b: {
    name: 'Militärgrundlagen',
    unlockCondition: 'Keine',
    primaryResource: 'Ressourcen',
    pages: [],
  },
  footmen_training: {
    name: 'Infanterieausbildung',
    unlockCondition: 'Institut 24, Burg 25, Kaserne 25, Zonengedenken & Zonenkonflikt 100%',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: [],
  },
  archers_training: {
    name: 'Bogenschützenausbildung',
    unlockCondition: 'Institut 24, Burg 25, Schießplatz 25, Zonengedenken & Zonenkonflikt 100%',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: [],
  },
  cavalry_training: {
    name: 'Kavallerieausbildung',
    unlockCondition: 'Institut 24, Burg 25, Stall 25, Zonengedenken & Zonenkonflikt 100%',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: [],
  },
  f0595b07: {
    name: 'Zonengedenken',
    unlockCondition: 'Nach der ersten Thronschlacht',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: [],
  },
  zone_conflict: {
    name: 'Zonenkonflikt',
    unlockCondition: 'Keine',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: [],
  },
  '1a6ec06e': {
    name: 'Meisterhafte Kriegsführung',
    unlockCondition: 'Keine',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: ['Zerstörung', 'Belagerungskampf', 'Markierung & Eroberung'],
  },
  city_defence: {
    name: 'Meisterhafte Stadtverteidigung',
    unlockCondition: 'Keine',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: ['Befestigung', 'Verstärkung', 'Türme & Belagerung'],
  },
  defence_legion: {
    name: 'Forschung: Verteidigungslegion',
    unlockCondition: '„Gemeinsam stark“ in der Stadtverteidigung abschließen',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: [],
  },
  e8704053: {
    name: 'Fortgeschrittene Truppenausbildung',
    unlockCondition: 'Start von RoC S1',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: ['Verstärkte Truppen', 'Ausbildung', 'Fortgeschritten'],
  },
  b3581c97: {
    name: 'Imperiale Garde',
    unlockCondition: 'Start von RoC S2',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: [],
  },
  '2b149bcb': {
    name: 'Gardemobilisierung',
    unlockCondition: 'Start von RoC S2 + Burg 30 + Institut 30',
    primaryResource: 'Tapferkeitsmedaillen',
    pages: ['Garde-Grundlagen', 'Taktik', 'Mobilisierungslimit'],
  },
  '3f5ebb34': {
    name: 'Kriegskunst – Überfall',
    unlockCondition: 'Start von Eden S3',
    primaryResource: 'Doppelmedaillen',
    pages: ['Streitkräfte', 'Belagerung', 'Kriegsabzeichen'],
  },
  '3ff71437': {
    name: 'Kriegskunst – Verteidigung',
    unlockCondition: 'Start von Eden S3',
    primaryResource: 'Doppelmedaillen',
    pages: ['Stellung halten', 'Belagerungsbefehle', 'Kriegsabzeichen'],
  },
  art_of_war_command: {
    name: 'Kriegskunst – Kommando',
    unlockCondition: 'Start von Eden SX1',
    primaryResource: 'Doppelmedaillen',
    pages: ['Täuschung & Treue', 'Furchtloser Schlag', 'Kommando'],
  },
  '77db4a78': {
    name: 'Erhabener Krieger',
    unlockCondition: 'Start von Eden S4',
    primaryResource: 'Kriegsabzeichen',
    pages: [],
  },
  '24ffc526': {
    name: 'Plündererlegion',
    unlockCondition: 'Start von Eden S4',
    primaryResource: 'Doppelmedaillen',
    pages: ['Frontreihe', 'Mittlere Reihe', 'Hintere Reihe'],
  },
  '2c49bd2a': {
    name: 'Solide Taktiken',
    unlockCondition: 'Start von Eden SX1',
    primaryResource: 'Kriegsabzeichen',
    pages: [
      'Belagerungsangriff',
      'Belagerungsverteidigung',
      'Feldkampf',
      'Truppenstärke',
      'Schnellausbildung',
      'Fortgeschritten',
    ],
  },
  fc190e81: {
    name: 'Segen des Drachenbluts',
    unlockCondition: 'Start von Eden SX2 + Plündererlegion abgeschlossen',
    primaryResource: 'Kriegsabzeichen',
    pages: ['Grundlagen', 'Kampfhaltung', 'Drachenkraft'],
  },
  '19ae0569': {
    name: 'Erhabene Legion',
    unlockCondition: 'Start von Eden X8',
    primaryResource: 'Kriegsabzeichen',
    pages: ['Erhabene Legion'],
  },
  '9c5d4006': {
    name: 'Nahkampflegion – Verteidigung',
    unlockCondition: 'Start von Eden X12',
    primaryResource: 'Kriegsabzeichen',
    pages: ['Nahkampflegion – Verteidigung'],
  },
  'b57d6bf9': {
    name: 'Nahkampflegion – Angriff',
    unlockCondition: 'Start von Eden X12',
    primaryResource: 'Kriegsabzeichen',
    pages: ['Nahkampflegion – Angriff'],
  },
});

const nodes = Object.freeze({
  'd1956263:node_1': {
    name: 'Schnelles Wachstum',
    buff: 'Farm-Schnellproduktion freischalten',
  },
  'd1956263:node_2': {
    name: 'Schnapsbrennerei',
    buff: 'Brennerei-Schnellproduktion freischalten',
  },
  'd1956263:node_3': {
    name: 'Rodung',
    buff: 'Holzplatz-Schnellproduktion freischalten',
  },
  'd1956263:node_4': {
    name: 'Schnelles Brennen',
    buff: 'Köhlerei-Schnellproduktion freischalten',
  },
  'd1956263:node_5': {
    name: 'Spatenstich',
    buff: 'Steinbruch-Schnellproduktion freischalten',
  },
  'd1956263:node_6': {
    name: 'Schnellschmelzen',
    buff: 'Eisenminen-Schnellproduktion freischalten',
  },
  'd1956263:node_7': {
    name: 'Arbeitermobilisierung',
    buff: 'Erfolgsrate der Schnellproduktion nach Gebäudeausbau wiederherstellen',
  },
  'd1956263:node_8': {
    name: 'Wachstumsschub',
    buff: '+5% Ertrag der Farm-Schnellproduktion pro Stufe',
  },
  'd1956263:node_9': {
    name: 'Aktive Hefe',
    buff: '+5% Ertrag der Brennerei-Schnellproduktion pro Stufe',
  },
  'd1956263:node_10': {
    name: 'Ganzbaumernte',
    buff: '+5% Ertrag der Holzplatz-Schnellproduktion pro Stufe',
  },
  'd1956263:node_11': {
    name: 'Trockenlagerung',
    buff: '+5% Ertrag der Köhlerei-Schnellproduktion pro Stufe',
  },
  'd1956263:node_12': {
    name: 'Vollständige Steinverwertung',
    buff: '+5% Ertrag der Steinbruch-Schnellproduktion pro Stufe',
  },
  'd1956263:node_13': {
    name: 'Metallurgie',
    buff: '+5% Ertrag der Eisenminen-Schnellproduktion pro Stufe',
  },
  'd1956263:node_14': {
    name: 'Wille und Weg',
    buff: 'Die erste tägliche Schnellproduktion gelingt garantiert',
  },
  'd1956263:node_15': {
    name: 'Stabilitätsverbesserung',
    buff: '+2% Erfolgsrate der Schnellproduktion pro Stufe',
  },
  'b2691f74:node_1': {
    name: 'Dünger',
    buff: '+3% Nahrungsertrag pro Stufe',
  },
  'b2691f74:node_2': {
    name: 'Hochwertiger Zucker',
    buff: '+3% Bierertrag pro Stufe',
  },
  'b2691f74:node_3': {
    name: 'Kahlschlag I',
    buff: '+3% Holzertrag pro Stufe',
  },
  'b2691f74:node_4': {
    name: 'Holzkohleverarbeitung',
    buff: '+3% Holzkohleertrag pro Stufe',
  },
  'b2691f74:node_5': {
    name: 'Mauerwerk',
    buff: '+3% Marmorertrag pro Stufe',
  },
  'b2691f74:node_6': {
    name: 'Beheizter Schmelzofen I',
    buff: '+3% Eisenertrag pro Stufe',
  },
  'b2691f74:node_7': {
    name: 'Midas-Berührung',
    buff: '+3% Goldertrag pro Stufe',
  },
  'b2691f74:node_8': {
    name: 'Schnellverteilung I',
    buff: '+3% Nahrungs-Sammeltempo pro Stufe',
  },
  'b2691f74:node_9': {
    name: 'Scharfe Holzaxt I',
    buff: '+3% Holz-Sammeltempo pro Stufe',
  },
  'b2691f74:node_10': {
    name: 'Effizienter Bergbau',
    buff: '+3% Marmor-Sammeltempo pro Stufe',
  },
  'b2691f74:node_11': {
    name: 'Legierungsveredelung I',
    buff: '+3% Eisen-Sammeltempo pro Stufe',
  },
  'b2691f74:node_12': {
    name: 'Edelsteinveredelung I',
    buff: '+3% Edelstein-Sammeltempo pro Stufe',
  },
  'b2691f74:node_13': {
    name: 'Lagererweiterung I',
    buff: 'Maximales Ressourcenlager +90k pro Stufe',
  },
  'b2691f74:node_14': {
    name: 'Bauwesen I',
    buff: '+1% Bautempo pro Stufe',
  },
  '375d1626:node_1': {
    name: 'Anerkennung durch Mut',
    buff: 'Wahrscheinlichkeit auf Tapferkeitsmedaillen von Marodeuren',
  },
  '375d1626:node_2': {
    name: 'Infanteriebeförderung I',
    buff: 'Infanterie der Stufen 1-3 können befördert werden',
  },
  '375d1626:node_3': {
    name: 'Bogenschützenbeförderung I',
    buff: 'Bogenschützen der Stufen 1-3 können befördert werden',
  },
  '375d1626:node_4': {
    name: 'Kavalleriebeförderung I',
    buff: 'Kavallerie der Stufen 1-3 können befördert werden',
  },
  '375d1626:node_5': {
    name: 'Für das Volk',
    buff: 'Ressourcen durch besiegte Marodeure',
  },
  '375d1626:node_6': {
    name: 'Rebellenj?ger (Anf?nger)',
    buff: 'Kampfkraft gegen Stufe 1-5 Marodeure',
  },
  '375d1626:node_7': {
    name: 'Reichsverteidiger (Anf?nger)',
    buff: 'Widerstand gegen Stufe 1-5 Marodeure',
  },
  '375d1626:node_8': {
    name: 'Infanteriebeförderung II',
    buff: 'Infanterie der Stufen 4-6 können befördert werden',
  },
  '375d1626:node_9': {
    name: 'Bogenschützenbeförderung II',
    buff: 'Bogenschützen der Stufen 4-6 können befördert werden',
  },
  '375d1626:node_10': {
    name: 'Kavalleriebeförderung II',
    buff: 'Kavallerie der Stufen 4-6 können befördert werden',
  },
  '375d1626:node_11': {
    name: 'Heldenausbildung',
    buff: 'Helden-EP von Marodeuren',
  },
  '375d1626:node_12': {
    name: 'Rebellenj?ger (Fortgeschritten)',
    buff: 'Kampfkraft gegen Stufe 6-10 Marodeure',
  },
  '375d1626:node_13': {
    name: 'Reichsverteidiger (Fortgeschritten)',
    buff: 'Widerstand gegen Stufe 6-10 Marodeure',
  },
  '375d1626:node_14': {
    name: 'Erste Hilfe im Feld',
    buff: 'Verwundetenquote gegen Marodeure senken',
  },
  '375d1626:node_15': {
    name: 'Rebellenj?ger (Veteran)',
    buff: 'Kampfkraft gegen Stufe 11-15 Marodeure',
  },
  '375d1626:node_16': {
    name: 'Reichsverteidiger (Veteran)',
    buff: 'Widerstand gegen Stufe 11-15 Marodeure',
  },
  '4a932eb0:node_1': {
    name: 'Schmelzofenausbau',
    buff: 'Ersten Materialherstellungsplatz freischalten',
  },
  '4a932eb0:node_2': {
    name: 'Grundveredelung',
    buff: 'Produktionstempo erhöhen',
  },
  '4a932eb0:node_3': {
    name: 'Grundverarbeitung',
    buff: 'Tempo der Materialherstellung erhöhen',
  },
  '4a932eb0:node_4': {
    name: 'Schmelzofenausbau',
    buff: 'Zweiten Materialherstellungsplatz freischalten',
  },
  '4a932eb0:node_5': {
    name: 'Grundveredelung',
    buff: 'Produktionstempo erhöhen',
  },
  '4a932eb0:node_6': {
    name: 'Grundverarbeitung',
    buff: 'Tempo der Materialherstellung erhöhen',
  },
  '4a932eb0:node_7': {
    name: 'Schmelzofenausbau',
    buff: 'Dritten Materialherstellungsplatz freischalten',
  },
  '4a932eb0:node_8': {
    name: 'Waffenverarbeitung',
    buff: 'Tempo der Waffenherstellung erhöhen',
  },
  '4a932eb0:node_9': {
    name: 'Helmherstellung',
    buff: 'Tempo der Helmherstellung erhöhen',
  },
  '4a932eb0:node_10': {
    name: 'Rüstungsschmied',
    buff: 'Tempo der Rüstungsherstellung erhöhen',
  },
  '4a932eb0:node_11': {
    name: 'Schuhmacher',
    buff: 'Tempo der Stiefelherstellung erhöhen',
  },
  '4a932eb0:node_12': {
    name: 'Juwelier',
    buff: 'Tempo der Amulettherstellung erhöhen',
  },
  '4a932eb0:node_13': {
    name: 'Zubehörverarbeitung',
    buff: 'Tempo der Zubehörherstellung erhöhen',
  },
  '4a932eb0:node_14': {
    name: 'Werkstattausbau',
    buff: 'Zusätzliche Dragonitwerkstatt freischalten',
  },
  '4a932eb0:node_15': {
    name: 'Grundveredelung',
    buff: 'Produktionstempo erhöhen',
  },
  '4a932eb0:node_16': {
    name: 'Grundverarbeitung',
    buff: 'Tempo der Materialherstellung erhöhen',
  },
  '4a932eb0:node_17': {
    name: 'Schmelzofenausbau',
    buff: 'Vierten Materialherstellungsplatz freischalten',
  },
  '4a932eb0:node_18': {
    name: 'Waffenschmelzofen',
    buff: 'Weniger Dragonitkosten beim Waffenschmieden',
  },
  '4a932eb0:node_19': {
    name: 'Helmschmelzofen',
    buff: 'Weniger Dragonitkosten beim Kopfschutzschmieden',
  },
  '4a932eb0:node_20': {
    name: 'R?stungsschmelzofen',
    buff: 'Weniger Dragonitkosten beim Rüstungsschmieden',
  },
  '4a932eb0:node_21': {
    name: 'Stiefelschmelzofen',
    buff: 'Weniger Dragonitkosten beim Schuhschmieden',
  },
  '4a932eb0:node_22': {
    name: 'Amulettschmelzofen',
    buff: 'Weniger Dragonitkosten beim Amulettschmieden',
  },
  '4a932eb0:node_23': {
    name: 'Schmuckschmelzofen',
    buff: 'Weniger Dragonitkosten beim Zubehörschmieden',
  },
  '4a932eb0:node_24': {
    name: 'Schmelzofenausbau',
    buff: 'Fünften Materialherstellungsplatz freischalten',
  },
  '4a932eb0:node_25': {
    name: 'Neue Materialien',
    buff: 'Herstellung grüner Materialien freischalten',
  },
  '4a932eb0:node_26': {
    name: 'Materialzerlegung',
    buff: 'Material kann zu Dragonit entzaubert werden',
  },
  '4a932eb0:node_27': {
    name: 'Massenzerlegung',
    buff: 'Dragonit-Ertrag beim Entzaubern erhöhen',
  },
  '4a932eb0:node_28': {
    name: 'Fachkundige Zerlegung',
    buff: 'Mehr Ertrag beim Zerlegen von Ausrüstung',
  },
  '802e7893:node_1': {
    name: 'Heldeneinsetzung',
    buff: 'Frontreihe für Legion I freischalten',
  },
  '802e7893:node_2': {
    name: 'Hochgeschwindigkeitssammeln',
    buff: '+25% Sammeltempo der Legion I',
  },
  '802e7893:node_3': {
    name: 'Körperliche Stärkung',
    buff: '+25% Marschtraglast der Legion I',
  },
  '802e7893:node_4': {
    name: 'Infanterieimmunit?t',
    buff: '+35% Infanterie-Widerstand der Legion I',
  },
  '802e7893:node_5': {
    name: 'Bogensch?tzenimmunit?t',
    buff: '+35% Bogenschützen-Widerstand der Legion I',
  },
  '802e7893:node_6': {
    name: 'Kavallerieimmunit?t',
    buff: '+35% Kavallerie-Widerstand der Legion I',
  },
  '802e7893:node_7': {
    name: 'Kommandobanner',
    buff: 'Beschleunigung für Legion I freischalten',
  },
  '802e7893:node_8': {
    name: 'Heldenkooperation',
    buff: 'mittlere Reihe für Legion I freischalten',
  },
  '802e7893:node_9': {
    name: 'Rückrufbefehl',
    buff: 'Rückruf für Legion I freischalten',
  },
  '802e7893:node_10': {
    name: 'Legiertes Hufeisen',
    buff: '+25% Marschtempo der Legion I',
  },
  '802e7893:node_11': {
    name: 'Versorgungseinheit',
    buff: '+35% Tempo der Haltbarkeitsregeneration der Legion I',
  },
  '802e7893:node_12': {
    name: 'Infanterieangriff',
    buff: '+35% Infanterie-Kampfkraft der Legion I',
  },
  '802e7893:node_13': {
    name: 'Bogenschützenangriff',
    buff: '+35% Bogenschützen-Kampfkraft der Legion I',
  },
  '802e7893:node_14': {
    name: 'Kavallerieangriff',
    buff: '+35% Kavallerie-Kampfkraft der Legion I',
  },
  '802e7893:node_15': {
    name: 'Heldenkommando',
    buff: 'hintere Reihe für Legion I freischalten',
  },
  '38d12254:node_1': {
    name: 'Heldeneinsetzung',
    buff: 'Frontreihe für Legion II freischalten',
  },
  '38d12254:node_2': {
    name: 'Hochgeschwindigkeitssammeln',
    buff: '+25% Sammeltempo der Legion II',
  },
  '38d12254:node_3': {
    name: 'Körperliche Stärkung',
    buff: '+25% Marschtraglast der Legion II',
  },
  '38d12254:node_4': {
    name: 'Infanterieimmunit?t',
    buff: '+35% Infanterie-Widerstand der Legion II',
  },
  '38d12254:node_5': {
    name: 'Bogensch?tzenimmunit?t',
    buff: '+35% Bogenschützen-Widerstand der Legion II',
  },
  '38d12254:node_6': {
    name: 'Kavallerieimmunit?t',
    buff: '+35% Kavallerie-Widerstand der Legion II',
  },
  '38d12254:node_7': {
    name: 'Kommandobanner',
    buff: 'Beschleunigung für Legion II freischalten',
  },
  '38d12254:node_8': {
    name: 'Heldenkooperation',
    buff: 'mittlere Reihe für Legion II freischalten',
  },
  '38d12254:node_9': {
    name: 'Rückrufbefehl',
    buff: 'Rückruf für Legion II freischalten',
  },
  '38d12254:node_10': {
    name: 'Legiertes Hufeisen',
    buff: '+25% Marschtempo der Legion II',
  },
  '38d12254:node_11': {
    name: 'Versorgungseinheit',
    buff: '+35% Tempo der Haltbarkeitsregeneration der Legion II',
  },
  '38d12254:node_12': {
    name: 'Infanterieangriff',
    buff: '+35% Infanterie-Kampfkraft der Legion II',
  },
  '38d12254:node_13': {
    name: 'Bogenschützenangriff',
    buff: '+35% Bogenschützen-Kampfkraft der Legion II',
  },
  '38d12254:node_14': {
    name: 'Kavallerieangriff',
    buff: '+35% Kavallerie-Kampfkraft der Legion II',
  },
  '38d12254:node_15': {
    name: 'Heldenkommando',
    buff: 'hintere Reihe für Legion II freischalten',
  },
  '5fef2163:node_1': {
    name: 'Heldeneinsetzung',
    buff: 'Frontreihe für Legion III freischalten',
  },
  '5fef2163:node_2': {
    name: 'Hochgeschwindigkeitssammeln',
    buff: '+25% Sammeltempo der Legion III',
  },
  '5fef2163:node_3': {
    name: 'Körperliche Stärkung',
    buff: '+25% Marschtraglast der Legion III',
  },
  '5fef2163:node_4': {
    name: 'Infanterieimmunit?t',
    buff: '+35% Infanterie-Widerstand der Legion III',
  },
  '5fef2163:node_5': {
    name: 'Bogensch?tzenimmunit?t',
    buff: '+35% Bogenschützen-Widerstand der Legion III',
  },
  '5fef2163:node_6': {
    name: 'Kavallerieimmunit?t',
    buff: '+35% Kavallerie-Widerstand der Legion III',
  },
  '5fef2163:node_7': {
    name: 'Kommandobanner',
    buff: 'Beschleunigung für Legion III freischalten',
  },
  '5fef2163:node_8': {
    name: 'Heldenkooperation',
    buff: 'mittlere Reihe für Legion III freischalten',
  },
  '5fef2163:node_9': {
    name: 'Rückrufbefehl',
    buff: 'Rückruf für Legion III freischalten',
  },
  '5fef2163:node_10': {
    name: 'Legiertes Hufeisen',
    buff: '+25% Marschtempo der Legion III',
  },
  '5fef2163:node_11': {
    name: 'Versorgungseinheit',
    buff: '+35% Tempo der Haltbarkeitsregeneration der Legion III',
  },
  '5fef2163:node_12': {
    name: 'Infanterieangriff',
    buff: '+35% Infanterie-Kampfkraft der Legion III',
  },
  '5fef2163:node_13': {
    name: 'Bogenschützenangriff',
    buff: '+35% Bogenschützen-Kampfkraft der Legion III',
  },
  '5fef2163:node_14': {
    name: 'Kavallerieangriff',
    buff: '+35% Kavallerie-Kampfkraft der Legion III',
  },
  '5fef2163:node_15': {
    name: 'Heldenkommando',
    buff: 'hintere Reihe für Legion III freischalten',
  },
  'cc2c9ee1:node_1': {
    name: 'Heldeneinsetzung',
    buff: '1 Helden einsetzen',
  },
  'cc2c9ee1:node_2': {
    name: 'Hochgeschwindigkeitssammeln',
    buff: 'Sammeltempo',
  },
  'cc2c9ee1:node_3': {
    name: 'Körperliche Stärkung',
    buff: 'Marschlast',
  },
  'cc2c9ee1:node_4': {
    name: 'Infanterieimmunit?t',
    buff: 'Widerstand',
  },
  'cc2c9ee1:node_5': {
    name: 'Kavallerieimmunit?t',
    buff: 'Widerstand',
  },
  'cc2c9ee1:node_6': {
    name: 'Bogensch?tzenimmunit?t',
    buff: 'Widerstand',
  },
  'cc2c9ee1:node_7': {
    name: 'Kommandobanner',
    buff: 'Beschleunigung',
  },
  'cc2c9ee1:node_8': {
    name: 'Heldenkooperation',
    buff: '2 Helden einsetzen',
  },
  'cc2c9ee1:node_9': {
    name: 'Rückrufbefehl',
    buff: 'Rückruf',
  },
  'cc2c9ee1:node_10': {
    name: 'Legiertes Hufeisen',
    buff: 'Marschtempo',
  },
  'cc2c9ee1:node_11': {
    name: 'Versorgungseinheit',
    buff: 'Ausdauerregeneration',
  },
  'cc2c9ee1:node_12': {
    name: 'Infanterieangriff',
    buff: 'Kampfkraft',
  },
  'cc2c9ee1:node_13': {
    name: 'Bogenschützenangriff',
    buff: 'Kampfkraft',
  },
  'cc2c9ee1:node_14': {
    name: 'Kavallerieangriff',
    buff: 'Kampfkraft',
  },
  'cc2c9ee1:node_15': {
    name: 'Heldenkommando',
    buff: '3 Helden einsetzen',
  },
  '3929cbb9:node_1': {
    name: 'Infanteriebehandlung',
    buff: 'Heilkosten der Infanterie',
  },
  '3929cbb9:node_2': {
    name: 'Bogenschützenbehandlung',
    buff: 'Heilkosten der Bogenschützen',
  },
  '3929cbb9:node_3': {
    name: 'Kavalleriebehandlung',
    buff: 'Heilkosten der Kavallerie',
  },
  '3929cbb9:node_4': {
    name: 'Behelfsbett',
    buff: 'Verwundetenkapazität der Burg',
  },
  '3929cbb9:node_5': {
    name: 'Erste Hilfe der Infanterie',
    buff: 'Heilungstempo der Infanterie',
  },
  '3929cbb9:node_6': {
    name: 'Erste Hilfe der Bogensch?tzen',
    buff: 'Heilungstempo der Bogenschützen',
  },
  '3929cbb9:node_7': {
    name: 'Veterinär',
    buff: 'Heilungstempo der Kavallerie',
  },
  '3929cbb9:node_8': {
    name: 'Kirchenlazarett',
    buff: 'Zusätzliches Lazarett',
  },
  '3929cbb9:node_9': {
    name: 'Sanitätsanlagen I',
    buff: 'Verwundetenkapazität der Burg',
  },
  '3929cbb9:node_10': {
    name: 'Zuflucht',
    buff: 'Zusätzliche Verwundetenkapazität',
  },
  '3929cbb9:node_11': {
    name: 'Superheilung',
    buff: 'Verlustrate bei Solo-Belagerungen senken',
  },
  'f915a84b:node_1': {
    name: 'Infanterierekrutierung',
    buff: 'Ausbildungstempo der Infanterie',
  },
  'f915a84b:node_2': {
    name: 'Bogenschützenrekrutierung',
    buff: 'Ausbildungstempo der Bogenschützen',
  },
  'f915a84b:node_3': {
    name: 'Kavallerierekrutierung',
    buff: 'Ausbildungstempo der Kavallerie',
  },
  'f915a84b:node_4': {
    name: 'Einberufung',
    buff: 'Zusätzliches Feldlager',
  },
  'f915a84b:node_5': {
    name: 'Infanterierekrutierung',
    buff: 'Ausbildungstempo der Infanterie',
  },
  'f915a84b:node_6': {
    name: 'Bogenschützenrekrutierung',
    buff: 'Ausbildungstempo der Bogenschützen',
  },
  'f915a84b:node_7': {
    name: 'Kavallerierekrutierung',
    buff: 'Ausbildungstempo der Kavallerie',
  },
  'f915a84b:node_8': {
    name: 'Vollmetallrüstung',
    buff: 'HP',
  },
  'f915a84b:node_9': {
    name: 'Kaserne',
    buff: 'Ausbildungsmenge der Infanterie',
  },
  'f915a84b:node_10': {
    name: 'Bogenschützenlager',
    buff: 'Ausbildungsmenge der Bogenschützen',
  },
  'f915a84b:node_11': {
    name: 'Kavallerie-Ausbildungslager',
    buff: 'Ausbildungsmenge der Kavallerie',
  },
  'f915a84b:node_12': {
    name: 'Tödliche Waffen',
    buff: 'Gegnerverluste bei Solo-Belagerungssieg',
  },
  'footmen_training:node_1': {
    name: 'Kraftschlag',
    buff: '10% Kampfkraft',
  },
  'footmen_training:node_2': {
    name: 'Meisterrüstung',
    buff: '10% Widerstand',
  },
  'footmen_training:node_3': {
    name: 'Meisterschild',
    buff: '10% Konter gegen Kavallerie der Infanterie',
  },
  'footmen_training:node_4': {
    name: 'Verstärkte Schilde',
    buff: '100% Traglast der Infanterie',
  },
  'footmen_training:node_5': {
    name: 'Stellung halten',
    buff: '100% Marschtempo der Infanterie',
  },
  'footmen_training:node_6': {
    name: 'Meisterschild',
    buff: '10% Konter gegen Bogenschützen der Infanterie',
  },
  'footmen_training:node_7': {
    name: 'Kraftschlag',
    buff: '20% Kampfkraft',
  },
  'footmen_training:node_8': {
    name: 'Meisterrüstung',
    buff: '20% Widerstand',
  },
  'footmen_training:node_9': {
    name: 'Infanterieverbesserung',
    buff: 'Infanterie verstärken',
  },
  'footmen_training:node_10': {
    name: 'Infanterierekrutierung',
    buff: '-15% Ausbildungskosten',
  },
  'footmen_training:node_11': {
    name: 'Infanterieeinberufung',
    buff: '+16500 zusätzliche Beförderungskapazität',
  },
  'footmen_training:node_12': {
    name: 'K?nigsschild',
    buff: '10% Konter gegen Bogenschützen der Infanterie',
  },
  'footmen_training:node_13': {
    name: 'Infanteriebeförderung III',
    buff: 'T7 zu T9 befördern',
  },
  'footmen_training:node_14': {
    name: 'Zweihänder',
    buff: '30% Kampfkraft bei Belagerungsverteidigung',
  },
  'footmen_training:node_15': {
    name: 'Kettenrüstung',
    buff: '30% Widerstand',
  },
  'footmen_training:node_16': {
    name: 'Reichsverteidiger (Infanterie)',
    buff: 'T9 freischalten',
  },
  'archers_training:node_1': {
    name: 'Verstärkter Pfeil',
    buff: '10% Kampfkraft',
  },
  'archers_training:node_2': {
    name: 'Verstärkter Armschutz',
    buff: '10% Widerstand',
  },
  'archers_training:node_3': {
    name: 'Schwachstelle anvisieren',
    buff: '10% Konter gegen Kavallerie der Infanterie',
  },
  'archers_training:node_4': {
    name: 'Feuer konzentrieren',
    buff: '100% Traglast der Infanterie',
  },
  'archers_training:node_5': {
    name: 'Drachenhautrüstung',
    buff: '100% Marschtempo der Infanterie',
  },
  'archers_training:node_6': {
    name: 'Tödliches Zielen',
    buff: '10% Konter gegen Bogenschützen der Infanterie',
  },
  'archers_training:node_7': {
    name: 'Verstärkter Pfeil',
    buff: '20% Kampfkraft',
  },
  'archers_training:node_8': {
    name: 'Ebenholz-Armschutz',
    buff: '20% Widerstand',
  },
  'archers_training:node_9': {
    name: 'Bogenschützenverbesserung',
    buff: 'Infanterie verstärken',
  },
  'archers_training:node_10': {
    name: 'Bogenschützenrekrutierung',
    buff: '-15% Ausbildungskosten',
  },
  'archers_training:node_11': {
    name: 'Bogenschützeneinberufung',
    buff: '+16500 zusätzliche Beförderungskapazität',
  },
  'archers_training:node_12': {
    name: 'Jagd',
    buff: '10% Konter gegen Bogenschützen der Infanterie',
  },
  'archers_training:node_13': {
    name: 'Bogenschützenbeförderung III',
    buff: 'T7 zu T9 befördern',
  },
  'archers_training:node_14': {
    name: 'Pfeilhagel',
    buff: '30% Belagerungskraft',
  },
  'archers_training:node_15': {
    name: 'Vergiftete Pfeilspitze',
    buff: '30% Kampfkraft',
  },
  'archers_training:node_16': {
    name: 'Bogenschützen der Stufe 9 freischalten',
    buff: 'T9 freischalten',
  },
  'cavalry_training:node_1': {
    name: 'Glühender Ansturm',
    buff: '10% Kampfkraft',
  },
  'cavalry_training:node_2': {
    name: 'Verstärkter Rossharnisch',
    buff: '10% Widerstand',
  },
  'cavalry_training:node_3': {
    name: 'Rollendes Nadelkissen',
    buff: '10% Konter gegen Kavallerie der Infanterie',
  },
  'cavalry_training:node_4': {
    name: 'Transportwagen',
    buff: '100% Traglast der Infanterie',
  },
  'cavalry_training:node_5': {
    name: 'Reinrassige Rösser',
    buff: '100% Marschtempo der Infanterie',
  },
  'cavalry_training:node_6': {
    name: 'Ansturm',
    buff: '10% Konter gegen Bogenschützen der Infanterie',
  },
  'cavalry_training:node_7': {
    name: 'Wilder Ansturm',
    buff: '20% Kampfkraft',
  },
  'cavalry_training:node_8': {
    name: 'Verstärkter Rossharnisch',
    buff: '20% Widerstand',
  },
  'cavalry_training:node_9': {
    name: 'Kavallerieverbesserung',
    buff: 'Infanterie verstärken',
  },
  'cavalry_training:node_10': {
    name: 'Kavallerierekrutierung',
    buff: '-15% Ausbildungskosten',
  },
  'cavalry_training:node_11': {
    name: 'Knappschaft',
    buff: '+16500 zusätzliche Beförderungskapazität',
  },
  'cavalry_training:node_12': {
    name: 'Kriegspfad',
    buff: '10% Konter gegen Bogenschützen der Infanterie',
  },
  'cavalry_training:node_13': {
    name: 'Kavalleriebeförderung III',
    buff: 'T7 zu T9 befördern',
  },
  'cavalry_training:node_14': {
    name: 'Offenes Gefecht',
    buff: '30% Kampfkraft',
  },
  'cavalry_training:node_15': {
    name: 'Ebenholz-Rossharnisch',
    buff: '30% Widerstand',
  },
  'cavalry_training:node_16': {
    name: 'Reichsverteidiger (Kavallerie)',
    buff: 'T9 freischalten',
  },
  'f0595b07:node_1': {
    name: 'Produktion im großen Maßstab',
    buff: 'Sammeltempo',
  },
  'f0595b07:node_2': {
    name: 'Expeditionsstreitmacht',
    buff: 'Gesammelte Ressourcenmenge',
  },
  'f0595b07:node_3': {
    name: 'Fortgeschrittene Belohnungen',
    buff: 'Belohnungen für Stufe 4-6 freischalten',
  },
  'f0595b07:node_4': {
    name: 'Waffenexperte',
    buff: 'Alle erhaltenen Punkte',
  },
  'f0595b07:node_5': {
    name: 'Schnelle Säuberung',
    buff: 'Marschtempo beim Marodeurangriff',
  },
  'f0595b07:node_6': {
    name: 'Ausbildung zur Kriegsvorbereitung',
    buff: 'Ausbildungstempo',
  },
  'f0595b07:node_7': {
    name: 'Traglaststeigerung',
    buff: 'Marschlast',
  },
  'f0595b07:node_8': {
    name: 'Kapazität der Kriegsvorbereitung',
    buff: 'Ausbildungskapazität',
  },
  'f0595b07:node_9': {
    name: 'Superbelohnungen',
    buff: 'Belohnungen für Stufe 7-9 freischalten',
  },
  'f0595b07:node_10': {
    name: 'Anreiz - Sammeln',
    buff: 'Sammelpunkte',
  },
  'f0595b07:node_11': {
    name: 'Anreiz – Marodeure besiegen',
    buff: 'Marodeur-Angriffspunkte',
  },
  'f0595b07:node_12': {
    name: 'Anreiz - Bau',
    buff: 'Baupunkte',
  },
  'f0595b07:node_13': {
    name: 'Inspiration: Weisheit',
    buff: 'Punkte durch Kriegsabzeichen',
  },
  'f0595b07:node_14': {
    name: 'Anreiz - Technologieforschung',
    buff: 'Forschungspunkte',
  },
  'f0595b07:node_15': {
    name: 'Inspiration: Wachstum',
    buff: 'Punkte durch Heldenaufstieg',
  },
  'f0595b07:node_16': {
    name: 'Anreiz - Gegner besiegen',
    buff: 'Punkte durch besiegte Gegner',
  },
  'f0595b07:node_17': {
    name: 'Inspiration: Rekrutierung',
    buff: 'Rekrutierungspunkte',
  },
  'f0595b07:node_18': {
    name: 'Waffenexperte',
    buff: 'Alle erhaltenen Punkte',
  },
  'f0595b07:node_19': {
    name: 'Noch eine Belohnung!',
    buff: 'Doppelte Belohnungen',
  },
  'zone_conflict:node_1': {
    name: 'Sanitätsabsicherung',
    buff: 'Sanitätsabsicherung',
  },
  'zone_conflict:node_2': {
    name: 'Letztes Gefecht',
    buff: 'Letztes Gefecht',
  },
  'zone_conflict:node_3': {
    name: 'Kampfhunger',
    buff: 'Kampfhunger',
  },
  'zone_conflict:node_4': {
    name: 'Mauerbau',
    buff: 'Mauerbau',
  },
  'zone_conflict:node_5': {
    name: 'Temporäre Befestigungen',
    buff: 'Temporäre Befestigungen',
  },
  'zone_conflict:node_6': {
    name: 'Hüter des Friedens',
    buff: 'Hüter des Friedens',
  },
  'zone_conflict:node_7': {
    name: 'Feldzugshärte',
    buff: 'Feldzugshärte',
  },
  'zone_conflict:node_8': {
    name: 'Sanitätsabsicherung',
    buff: 'Absicherung II',
  },
  'zone_conflict:node_9': {
    name: 'Gemeinsame Front',
    buff: 'Gemeinsame Front: Sanität',
  },
  'zone_conflict:node_10': {
    name: 'Gemeinsamer Angriff',
    buff: 'Gemeinsamer Angriff',
  },
  'zone_conflict:node_11': {
    name: 'Verteidigungsmobilisierung',
    buff: 'Verteidigungsmobilisierung',
  },
  'zone_conflict:node_12': {
    name: 'Angriff der Verbündeten',
    buff: 'Angriff der Verbündeten',
  },
  'zone_conflict:node_13': {
    name: 'Superlegion',
    buff: 'Superlegion freischalten',
  },
  'zone_conflict:node_14': {
    name: 'Karbonfaserknochen',
    buff: 'Karbonfaserknochen',
  },
  'zone_conflict:node_15': {
    name: 'Virale Sporen',
    buff: 'Virale Sporen',
  },
  '1a6ec06e:node_1': {
    name: 'Nutzlastverbesserung',
    buff: '+20% Traglast',
  },
  '1a6ec06e:node_2': {
    name: 'Infanterieangriff',
    buff: '+10% Zerstörungskraft der Infanterie',
  },
  '1a6ec06e:node_3': {
    name: 'Bogenschützenangriff',
    buff: '+10% Zerstörungskraft der Bogenschützen',
  },
  '1a6ec06e:node_4': {
    name: 'Kavallerieangriff',
    buff: '+10% Zerstörungskraft der Kavallerie',
  },
  '1a6ec06e:node_5': {
    name: 'Totalangriff',
    buff: '+20% Marschtempo',
  },
  '1a6ec06e:node_6': {
    name: 'Frontalangriff',
    buff: '+20% Belagerungskraft der Infanterie',
  },
  '1a6ec06e:node_7': {
    name: 'Bogenschützenrekrutierung',
    buff: '+20% Belagerungskraft der Bogenschützen',
  },
  '1a6ec06e:node_8': {
    name: 'Kavallerierekrutierung',
    buff: '+20% Belagerungskraft der Kavallerie',
  },
  '1a6ec06e:node_9': {
    name: 'Schwerer Schild',
    buff: '+20% Belagerungswiderstand der Infanterie',
  },
  '1a6ec06e:node_10': {
    name: 'Eisenrüstung',
    buff: '+20% Belagerungswiderstand der Bogenschützen',
  },
  '1a6ec06e:node_11': {
    name: 'Schwerer Reiter',
    buff: '+20% Belagerungswiderstand der Kavallerie',
  },
  '1a6ec06e:node_12': {
    name: 'Tödliche Waffen',
    buff: '+20% Gegnerverluste bei Solo-Belagerungssieg',
  },
  '1a6ec06e:node_13': {
    name: 'Wendig',
    buff: '+50 Kampftempo der Infanterie',
  },
  '1a6ec06e:node_14': {
    name: 'Schnelle Schüsse',
    buff: '+50 Kampftempo der Bogenschützen',
  },
  '1a6ec06e:node_15': {
    name: 'Aufgesessen!',
    buff: '+50 Kampftempo der Kavallerie',
  },
  '1a6ec06e:node_16': {
    name: 'Rauchsignal freischalten',
    buff: 'Nach gescheiterter Belagerung verliert die Verteidigung Truppen; ihre Kampfkraft und ihr Widerstand sinken',
  },
  '1a6ec06e:node_17': {
    name: 'Entwaffnen',
    buff: '+10% stärkere Kampfkraft-schwächung nach Zerstörung',
  },
  '1a6ec06e:node_18': {
    name: 'Rüstungsdurchschlag',
    buff: '+10% stärkere Widerstandsschwächung nach Zerstörung',
  },
  '1a6ec06e:node_19': {
    name: 'Lähmung',
    buff: '+600 Zerstörungsdauer',
  },
  '1a6ec06e:node_20': {
    name: 'Infanterieschlag',
    buff: '+20% Infanterie-Kampfkraft',
  },
  '1a6ec06e:node_21': {
    name: 'Bogenschützenschlag',
    buff: '+20% Bogenschützen-Kampfkraft',
  },
  '1a6ec06e:node_22': {
    name: 'Kavallerieschlag',
    buff: '+20% Kavallerie-Kampfkraft',
  },
  '1a6ec06e:node_23': {
    name: 'Infanteriewiderstand',
    buff: '+20% Infanterie-Widerstand',
  },
  '1a6ec06e:node_24': {
    name: 'Bogenschützenwiderstand',
    buff: '+20% Bogenschützen-Widerstand',
  },
  '1a6ec06e:node_25': {
    name: 'Kavalleriewiderstand',
    buff: '+20% Kavallerie-Widerstand',
  },
  '1a6ec06e:node_26': {
    name: 'Kampfnarbe',
    buff: 'Gegnerische Burg markieren',
  },
  '1a6ec06e:node_27': {
    name: 'Markierung',
    buff: '+10% Kampfkraft durch Markierung',
  },
  '1a6ec06e:node_28': {
    name: 'Markierte Verteidigung',
    buff: '+10% Widerstand durch Markierung',
  },
  '1a6ec06e:node_29': {
    name: 'Anhaltende Markierung',
    buff: '+1200 Markierungsdauer',
  },
  '1a6ec06e:node_30': {
    name: 'Mehrfachmarkierung',
    buff: '+2 Markierungslimit',
  },
  '1a6ec06e:node_31': {
    name: 'Infanterieangriff',
    buff: '+10% Zerstörungskraft der Infanterie',
  },
  '1a6ec06e:node_32': {
    name: 'Bogenschützenangriff',
    buff: '+10% Zerstörungskraft der Bogenschützen',
  },
  '1a6ec06e:node_33': {
    name: 'Kavallerieangriff',
    buff: '+10% Zerstörungskraft der Kavallerie',
  },
  '1a6ec06e:node_34': {
    name: 'Gemetzel',
    buff: '+20% Kriegsverluste des Gegners',
  },
  '1a6ec06e:node_35': {
    name: 'Frontalangriff',
    buff: '+20% Belagerungskraft der Infanterie',
  },
  '1a6ec06e:node_36': {
    name: 'Bogenschützenrekrutierung',
    buff: '+20% Belagerungskraft der Bogenschützen',
  },
  '1a6ec06e:node_37': {
    name: 'Kavallerierekrutierung',
    buff: '+20% Belagerungskraft der Kavallerie',
  },
  '1a6ec06e:node_38': {
    name: 'Schwerer Schild',
    buff: '+20% Belagerungswiderstand der Infanterie',
  },
  '1a6ec06e:node_39': {
    name: 'Eisenrüstung',
    buff: '+20% Belagerungswiderstand der Bogenschützen',
  },
  '1a6ec06e:node_40': {
    name: 'Schwerer Reiter',
    buff: '+20% Infanterie-HP',
  },
  '1a6ec06e:node_41': {
    name: 'Belagerungsschild',
    buff: '+20% HP aller Truppen',
  },
  '1a6ec06e:node_42': {
    name: 'Belagerungsrüstung',
    buff: '+20% Bogenschützen-HP',
  },
  '1a6ec06e:node_43': {
    name: 'Belagerungskavallerie',
    buff: '+20% Kavallerie-HP',
  },
  '1a6ec06e:node_44': {
    name: 'Eroberung',
    buff: 'Bonus bei Belagerungssieg',
  },
  'city_defence:node_1': {
    name: 'Mauerbefestigung',
    buff: 'Befestigung um 250 erhöhen',
  },
  'city_defence:node_2': {
    name: 'Stoßtrupp',
    buff: '20% weniger Haltbarkeitsverlust nahe dem Thron',
  },
  'city_defence:node_3': {
    name: 'Mauerreparatur',
    buff: '20% Tempo der Haltbarkeitsregeneration',
  },
  'city_defence:node_4': {
    name: 'Schnelle Verstärkung',
    buff: '20% Marschtempo beim Verstärken',
  },
  'city_defence:node_5': {
    name: 'Kampfkraft bei Infanterieverstärkung',
    buff: '20% Infanterie-Kampfkraft beim Verstärken von Verbündeten',
  },
  'city_defence:node_7': {
    name: 'Kampfkraft bei Kavallerieverstärkung',
    buff: '20% Kavallerie-Kampfkraft beim Verstärken von Verbündeten',
  },
  'city_defence:node_6': {
    name: 'Kampfkraft bei Bogenschützenverstärkung',
    buff: '20% Bogenschützen-Kampfkraft beim Verstärken von Verbündeten',
  },
  'city_defence:node_8': {
    name: 'Widerstand bei Infanterieverstärkung',
    buff: '20% Infanterie-Widerstand beim Verstärken von Verbündeten',
  },
  'city_defence:node_10': {
    name: 'Widerstand bei Kavallerieverstärkung',
    buff: '20% Kavallerie-Widerstand beim Verstärken von Verbündeten',
  },
  'city_defence:node_9': {
    name: 'Widerstand bei Bogenschützenverstärkung',
    buff: '20% Bogenschützen-Widerstand beim Verstärken von Verbündeten',
  },
  'city_defence:node_11': {
    name: 'Schnelle Verstärkung',
    buff: '20% Marschtempo beim Verstärken',
  },
  'city_defence:node_12': {
    name: 'Verstärkungskampfkraft',
    buff: '20% Kampfkraft bei Verstärkung durch Verbündete',
  },
  'city_defence:node_13': {
    name: 'Verstärkungswiderstand',
    buff: '20% Widerstand bei Verstärkung durch Verbündete',
  },
  'city_defence:node_14': {
    name: 'Das Leben geht weiter',
    buff: '-10% eigene Verlustrate durch Gegner',
  },
  'city_defence:node_15': {
    name: 'Infanterieausbruch',
    buff: '20% Infanterie-Kampfkraft bei Belagerungsverteidigung',
  },
  'city_defence:node_17': {
    name: 'Kavallerieausbruch',
    buff: '20% Kavallerie-Kampfkraft bei Belagerungsverteidigung',
  },
  'city_defence:node_16': {
    name: 'Bogenschützenausbruch',
    buff: '20% Bogenschützen-Kampfkraft bei Belagerungsverteidigung',
  },
  'city_defence:node_18': {
    name: 'Verteidigungsschild',
    buff: '20% Infanterie-Widerstand bei Belagerungsverteidigung',
  },
  'city_defence:node_20': {
    name: 'Verteidigende Kavallerie',
    buff: '20% Kavallerie-Widerstand bei Belagerungsverteidigung',
  },
  'city_defence:node_19': {
    name: 'Verteidigungsrüstung',
    buff: '20% Bogenschützen-Widerstand bei Belagerungsverteidigung',
  },
  'city_defence:node_21': {
    name: 'Gemeinsam stark',
    buff: 'Eine Verteidigungslegion erhalten',
  },
  'city_defence:node_22': {
    name: 'Gegenangriff',
    buff: '15% Kampfkraft der Verteidigungsformation',
  },
  'city_defence:node_23': {
    name: 'Robuste Festung',
    buff: '15% Widerstand der Verteidigungsformation',
  },
  'city_defence:node_24': {
    name: 'Legionsverstärkung',
    buff: '15% HP der Verteidigungsformation',
  },
  'city_defence:node_25': {
    name: 'Rekrutierungsausbau',
    buff: '15000 Marschlimit der Verteidigungsformation',
  },
  'city_defence:node_26': {
    name: 'Behelfsbett',
    buff: '15000 Lazarettkapazität',
  },
  'city_defence:node_27': {
    name: 'Mauerbefestigung',
    buff: 'Befestigung um 250 erhöhen',
  },
  'city_defence:node_28': {
    name: 'Fortgeschrittener Turm',
    buff: 'Turm zum fortgeschrittenen Turm ausbauen',
  },
  'city_defence:node_29': {
    name: 'Turmausbau',
    buff: '1000 Energielimit des fortgeschrittenen Turms',
  },
  'city_defence:node_30': {
    name: 'Turmverstärkung',
    buff: '40% Energieregeneration',
  },
  'city_defence:node_31': {
    name: 'Verstärkter Turm',
    buff: '20% Angriff des Pfeilturms',
  },
  'city_defence:node_32': {
    name: 'Sicherer Hafen',
    buff: '20% weniger Niederlagenverluste',
  },
  'city_defence:node_33': {
    name: 'Infanterieausbruch',
    buff: '20% Infanterie-Kampfkraft bei Belagerungsverteidigung',
  },
  'city_defence:node_35': {
    name: 'Kavallerieausbruch',
    buff: '20% Kavallerie-Kampfkraft bei Belagerungsverteidigung',
  },
  'city_defence:node_34': {
    name: 'Bogenschützenausbruch',
    buff: '20% Bogenschützen-Kampfkraft bei Belagerungsverteidigung',
  },
  'city_defence:node_36': {
    name: 'Verteidigungsschild',
    buff: '20% Infanterie-Widerstand bei Belagerungsverteidigung',
  },
  'city_defence:node_37': {
    name: 'Verteidigende Kavallerie',
    buff: '20% Kavallerie-Widerstand bei Belagerungsverteidigung',
  },
  'city_defence:node_38': {
    name: 'Verteidigungsrüstung',
    buff: '20% Bogenschützen-Widerstand bei Belagerungsverteidigung',
  },
  'city_defence:node_39': {
    name: 'Stellung halten',
    buff: 'UNBEKANNT',
  },
  'defence_legion:node_1': {
    name: 'Heldeneinsetzung',
    buff: '1 Helden in die Verteidigungsformation entsenden',
  },
  'defence_legion:node_2': {
    name: 'Rekrutierungsausbau',
    buff: '10500 Verteidigungsmarsch',
  },
  'defence_legion:node_3': {
    name: 'Infanterietreue',
    buff: '10% Widerstand der Infanterie-Verteidigungsformation',
  },
  'defence_legion:node_5': {
    name: 'Kavallerietreue',
    buff: '10% Widerstand der Kavallerie-Verteidigungsformation',
  },
  'defence_legion:node_4': {
    name: 'Bogenschützentreue',
    buff: '10% Widerstand der Bogenschützen-Verteidigungsformation',
  },
  'defence_legion:node_6': {
    name: 'Infanterieangriff',
    buff: '10% Kampfkraft der Infanterie-Verteidigungsformation',
  },
  'defence_legion:node_8': {
    name: 'Kavallerieangriff',
    buff: '10% Kampfkraft der Kavallerie-Verteidigungsformation',
  },
  'defence_legion:node_7': {
    name: 'Bogenschützenangriff',
    buff: '10% Kampfkraft der Bogenschützen-Verteidigungsformation',
  },
  'defence_legion:node_9': {
    name: 'Rekrutierungsausbau',
    buff: '16500 Verteidigungsmarsch',
  },
  'defence_legion:node_10': {
    name: 'Heldenkooperation',
    buff: '2 Helden in die Verteidigungsformation entsenden',
  },
  'defence_legion:node_11': {
    name: 'Infanterietreue II',
    buff: '10% Widerstand der Infanterie-Verteidigungsformation',
  },
  'defence_legion:node_13': {
    name: 'Kavallerietreue II',
    buff: '10% Widerstand der Kavallerie-Verteidigungsformation',
  },
  'defence_legion:node_12': {
    name: 'Bogenschützentreue II',
    buff: '10% Widerstand der Bogenschützen-Verteidigungsformation',
  },
  'defence_legion:node_14': {
    name: 'Infanterieangriff II',
    buff: '10% Kampfkraft der Infanterie-Verteidigungsformation',
  },
  'defence_legion:node_16': {
    name: 'Kavallerieangriff II',
    buff: '10% Kampfkraft der Kavallerie-Verteidigungsformation',
  },
  'defence_legion:node_15': {
    name: 'Bogenschützenangriff II',
    buff: '10% Kampfkraft der Bogenschützen-Verteidigungsformation',
  },
  'defence_legion:node_17': {
    name: 'Heldenkommando',
    buff: '3 Helden in die Verteidigungsformation entsenden',
  },
  'defence_legion:node_18': {
    name: 'Rekrutierungsausbau II',
    buff: '25000 Verteidigungsmarsch',
  },
  'defence_legion:node_19': {
    name: 'Verstärkte Schilde',
    buff: 'Truppen-Verteidigungsbonus 15%',
  },
  'defence_legion:node_20': {
    name: 'Potenzial entfesseln',
    buff: 'Truppen-Angriffsbonus 15%',
  },
  'defence_legion:node_21': {
    name: 'Rekrutierungsausbau III',
    buff: '26000 Verteidigungsmarsch',
  },
  'e8704053:node_1': {
    name: 'Stärkere Angriffsfähigkeiten – Infanterie',
    buff: '+3 Basiskampfkraft verstärkter Infanterie',
  },
  'e8704053:node_2': {
    name: 'Stärkere Angriffsfähigkeiten – Kavallerie',
    buff: '+3 Basiskampfkraft verstärkter Kavallerie',
  },
  'e8704053:node_3': {
    name: 'Stärkere Angriffsfähigkeiten – Bogenschützen',
    buff: '+3 Basiskampfkraft verstärkter Bogenschützen',
  },
  'e8704053:node_4': {
    name: 'Schwerer Schlag',
    buff: '+10% Infanterie-Kampfkraft',
  },
  'e8704053:node_5': {
    name: 'Wilder Ansturm',
    buff: '+10% Kavallerie-Kampfkraft',
  },
  'e8704053:node_6': {
    name: 'Verstärkter Pfeil',
    buff: '+10% Bogenschützen-Nachtbonus',
  },
  'e8704053:node_7': {
    name: 'Wuchtiger Schlag',
    buff: '+5% Kampfkraft aller Truppen',
  },
  'e8704053:node_8': {
    name: 'Effiziente Ausbildung',
    buff: '-10% Kosten der Intensivausbildung',
  },
  'e8704053:node_9': {
    name: 'Massenausbildung',
    buff: '+40% Intensivausbildung',
  },
  'e8704053:node_10': {
    name: 'Taktischer Schlag',
    buff: '+10% Taktikkraft aller Truppen',
  },
  'e8704053:node_11': {
    name: 'Stärkere Rüstung – Infanterie',
    buff: '+5 Basiswiderstand verstärkter Infanterie',
  },
  'e8704053:node_12': {
    name: 'Stärkere Rüstung – Kavallerie',
    buff: '+5 Basiswiderstand verstärkter Kavallerie',
  },
  'e8704053:node_13': {
    name: 'Stärkere Rüstung – Bogenschützen',
    buff: '+2 Basiswiderstand verstärkter Bogenschützen',
  },
  'e8704053:node_14': {
    name: 'Verstärkter Schild',
    buff: '+10% Infanterie-Widerstand',
  },
  'e8704053:node_15': {
    name: 'Verstärkter Rossharnisch',
    buff: '+10% Kavallerie-Widerstand',
  },
  'e8704053:node_16': {
    name: 'Verstärkter Armschutz',
    buff: '+10% Bogenschützen-Widerstand',
  },
  'e8704053:node_17': {
    name: 'Meisterrüstung',
    buff: '+5% Widerstand aller Truppen',
  },
  'e8704053:node_18': {
    name: 'Gesegnete Soldaten',
    buff: '-20% Kosten für verstärkte Truppen',
  },
  'e8704053:node_19': {
    name: 'Superheilung',
    buff: '+40% Heilungstempo verstärkter Truppen',
  },
  'e8704053:node_20': {
    name: 'Taktischer Schutz',
    buff: '+10% Taktikwiderstand aller Truppen',
  },
  'e8704053:node_21': {
    name: 'Infanterierekrutierung',
    buff: '+40% Ausbildungstempo der Infanterie',
  },
  'e8704053:node_22': {
    name: 'Kavallerierekrutierung',
    buff: '+40% Ausbildungstempo der Kavallerie',
  },
  'e8704053:node_23': {
    name: 'Bogenschützenrekrutierung',
    buff: '+40% Ausbildungstempo der Bogenschützen',
  },
  'e8704053:node_24': {
    name: 'Scharfe Klinge',
    buff: '+10% Kampfkraft verstärkter Infanterie',
  },
  'e8704053:node_25': {
    name: 'Kavallerieschwert',
    buff: '+10% Kampfkraft verstärkter Kavallerie',
  },
  'e8704053:node_26': {
    name: 'Verstärkter Pfeil AE',
    buff: '+10% Kampfkraft verstärkter Bogenschützen',
  },
  'e8704053:node_27': {
    name: 'Erste Hilfe der Infanterie',
    buff: '+10% Heilungstempo der Infanterie',
  },
  'e8704053:node_28': {
    name: 'Veterinär',
    buff: '+10% Heilungstempo der Kavallerie',
  },
  'e8704053:node_29': {
    name: 'Erste Hilfe der Bogenschützen',
    buff: '+10% Heilungstempo der Bogenschützen',
  },
  'e8704053:node_30': {
    name: 'Erlesene Rüstung',
    buff: '+10% Widerstand verstärkter Infanterie',
  },
  'e8704053:node_31': {
    name: 'Verstärkte Rüstung',
    buff: '+10% Widerstand verstärkter Kavallerie',
  },
  'e8704053:node_32': {
    name: 'Verstärkte Ausrüstung',
    buff: '+10% Widerstand verstärkter Bogenschützen',
  },
  'e8704053:node_33': {
    name: 'Kriegsrecht',
    buff: '+6% HP aller Truppen',
  },
  'e8704053:node_34': {
    name: 'Fortgeschrittene Medizin',
    buff: 'Verstärkte Truppen benötigen dieselben Ressourcen wie normale Truppen',
  },
  'b3581c97:node_1': {
    name: 'Damaszenerstahl I',
    buff: '+10% Infanterie-Kampfkraft',
  },
  'b3581c97:node_2': {
    name: 'Warmblut I',
    buff: '+10% Kavallerie-Kampfkraft',
  },
  'b3581c97:node_3': {
    name: 'Gehärteter Pfeil I',
    buff: '+10% Bogenschützen-Kampfkraft',
  },
  'b3581c97:node_4': {
    name: 'Ganzkörperrüstung I',
    buff: '+10% Infanterie-Widerstand',
  },
  'b3581c97:node_5': {
    name: 'Steigbügel I',
    buff: '+10% Kavallerie-Widerstand',
  },
  'b3581c97:node_6': {
    name: 'Schildwall I',
    buff: '+10% Bogenschützen-Widerstand',
  },
  'b3581c97:node_8': {
    name: 'Rundformation I',
    buff: '+5% Taktikwiderstand',
  },
  'b3581c97:node_11': {
    name: 'Tunnel I',
    buff: '+5% Taktikkraft',
  },
  'b3581c97:node_14': {
    name: 'Fanatismus I',
    buff: '+5% HP',
  },
  'b3581c97:node_17': {
    name: 'Bastion I',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_20': {
    name: 'Rammbock I',
    buff: '+5% Belagerungskraft',
  },
  'b3581c97:node_100': {
    name: 'Tunnel II',
    buff: '+5% Taktikkraft',
  },
  'b3581c97:node_26': {
    name: 'Bastion II',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_29': {
    name: 'Rammbock II',
    buff: '+5% Belagerungswiderstand',
  },
  'b3581c97:node_32': {
    name: 'Kaiserlicher Verteidiger',
    buff: 'T10-Infanterie freischalten',
  },
  'b3581c97:node_35': {
    name: 'Rundformation II',
    buff: '+5% Taktikwiderstand',
  },
  'b3581c97:node_38': {
    name: 'Ganzkörperrüstung II',
    buff: '+10% Widerstand',
  },
  'b3581c97:node_41': {
    name: 'Damaszenerstahl II',
    buff: '+10% Kampfkraft',
  },
  'b3581c97:node_44': {
    name: 'Bastion III',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_47': {
    name: 'Rammbock III',
    buff: '+5% Belagerungskraft',
  },
  'b3581c97:node_50': {
    name: 'Bastion IV',
    buff: '+5% Widerstand bei Belagerungsverteidigung',
  },
  'b3581c97:node_53': {
    name: 'Rammbock IV',
    buff: '+5% Belagerungswiderstand',
  },
  'b3581c97:node_56': {
    name: 'Fanatismus II',
    buff: '+5% HP',
  },
  'b3581c97:node_59': {
    name: 'Gardeausbildung – Infanterie',
    buff: 'Kampfkraft wiederherstellen',
  },
  'b3581c97:node_7': {
    name: 'Koordinierter Angriff I',
    buff: '+5% Taktikwiderstand',
  },
  'b3581c97:node_10': {
    name: 'Keilformation I',
    buff: '+5% Taktikkraft',
  },
  'b3581c97:node_13': {
    name: 'Mut I',
    buff: '+5% HP',
  },
  'b3581c97:node_16': {
    name: 'Bewaffneter Wagen I',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_19': {
    name: 'Graben I',
    buff: '+5% Belagerungskraft',
  },
  'b3581c97:node_101': {
    name: 'Tunnel II',
    buff: '+5% Taktikkraft',
  },
  'b3581c97:node_25': {
    name: 'Bewaffneter Wagen II',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_28': {
    name: 'Graben II',
    buff: '+5% Belagerungswiderstand',
  },
  'b3581c97:node_31': {
    name: 'Kaiserlicher Ritter',
    buff: 'T10-Kavallerie freischalten',
  },
  'b3581c97:node_34': {
    name: 'Koordinierter Angriff II',
    buff: '+5% Taktikwiderstand',
  },
  'b3581c97:node_37': {
    name: 'Steigbügel II',
    buff: '+10% Widerstand',
  },
  'b3581c97:node_40': {
    name: 'Warmblut II',
    buff: '+10% Kampfkraft',
  },
  'b3581c97:node_43': {
    name: 'Bewaffneter Wagen III',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_46': {
    name: 'Graben III',
    buff: '+5% Belagerungskraft',
  },
  'b3581c97:node_49': {
    name: 'Bewaffneter Wagen IV',
    buff: '+5% Widerstand bei Belagerungsverteidigung',
  },
  'b3581c97:node_52': {
    name: 'Graben IV',
    buff: '+5% Belagerungswiderstand',
  },
  'b3581c97:node_55': {
    name: 'Mut II',
    buff: '+5% HP',
  },
  'b3581c97:node_58': {
    name: 'Gardeausbildung – Kavallerie',
    buff: '+2% Schaden',
  },
  'b3581c97:node_9': {
    name: 'Schützen decken I',
    buff: '+5% Taktikwiderstand',
  },
  'b3581c97:node_12': {
    name: 'Wechselfeuer I',
    buff: '+5% Taktikkraft',
  },
  'b3581c97:node_15': {
    name: 'Ausdauer I',
    buff: '+5% HP',
  },
  'b3581c97:node_18': {
    name: 'Turm I',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_21': {
    name: 'Präzisionsschuss I',
    buff: '+5% Belagerungskraft',
  },
  'b3581c97:node_102': {
    name: 'Tunnel II',
    buff: '+5% Taktikkraft',
  },
  'b3581c97:node_27': {
    name: 'Turm II',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_30': {
    name: 'Präzisionsschuss II',
    buff: '+5% Belagerungswiderstand',
  },
  'b3581c97:node_33': {
    name: 'Kaiserlicher Schütze',
    buff: 'T10-Bogenschützen freischalten',
  },
  'b3581c97:node_36': {
    name: 'Schützen decken II',
    buff: '+5% Taktikwiderstand',
  },
  'b3581c97:node_39': {
    name: 'Schildwall II',
    buff: '+10% Widerstand',
  },
  'b3581c97:node_42': {
    name: 'Gehärteter Pfeil II',
    buff: '+10% Kampfkraft',
  },
  'b3581c97:node_45': {
    name: 'Turm III',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung',
  },
  'b3581c97:node_48': {
    name: 'Präzisionsschuss III',
    buff: '+5% Belagerungskraft',
  },
  'b3581c97:node_51': {
    name: 'Turm IV',
    buff: '+5% Widerstand bei Belagerungsverteidigung',
  },
  'b3581c97:node_54': {
    name: 'Präzisionsschuss IV',
    buff: '+5% Belagerungswiderstand',
  },
  'b3581c97:node_57': {
    name: 'Ausdauer II',
    buff: '+5% HP',
  },
  'b3581c97:node_60': {
    name: 'Gardeausbildung – Bogenschützen',
    buff: '+3% Ausweichen',
  },
  '2b149bcb:node_1': {
    name: 'Mutige Garde – Infanterie',
    buff: '+5% Belagerungskraft der Infanterie',
  },
  '2b149bcb:node_2': {
    name: 'Mutige Garde – Kavallerie',
    buff: '+5% Belagerungskraft der Kavallerie',
  },
  '2b149bcb:node_3': {
    name: 'Mutige Garde – Bogenschützen',
    buff: '+5% Belagerungskraft der Bogenschützen',
  },
  '2b149bcb:node_4': {
    name: 'Standhafte Garde – Infanterie',
    buff: '+5% Belagerungswiderstand der Infanterie',
  },
  '2b149bcb:node_5': {
    name: 'Standhafte Garde – Kavallerie',
    buff: '+5% Belagerungswiderstand der Kavallerie',
  },
  '2b149bcb:node_6': {
    name: 'Standhafte Garde – Bogenschützen',
    buff: '+5% Belagerungswiderstand der Bogenschützen',
  },
  '2b149bcb:node_7': {
    name: 'Gardemobilisierung I',
    buff: '+5m zusätzliche T10-Kapazität',
  },
  '2b149bcb:node_8': {
    name: 'Gardeangriff',
    buff: '+5% Infanterie-Kampfkraft',
  },
  '2b149bcb:node_9': {
    name: 'Gardespeer',
    buff: '+5% Kavallerie-Kampfkraft',
  },
  '2b149bcb:node_10': {
    name: 'Gardebogen',
    buff: '+5% Bogenschützen-Kampfkraft',
  },
  '2b149bcb:node_11': {
    name: 'Gardeschild I',
    buff: '+5% Infanterie-Widerstand',
  },
  '2b149bcb:node_12': {
    name: 'Garderüstung I',
    buff: '+5% Kavallerie-Widerstand',
  },
  '2b149bcb:node_13': {
    name: 'Gardeformation I',
    buff: '+5% Bogenschützen-Widerstand',
  },
  '2b149bcb:node_14': {
    name: 'Mobilisierung der Infanterie',
    buff: '+15m zusätzliche T10-Kapazität der Infanterie',
  },
  '2b149bcb:node_15': {
    name: 'Mobilisierung der Kavallerie',
    buff: '+15m zusätzliche T10-Kapazität der Kavallerie',
  },
  '2b149bcb:node_16': {
    name: 'Mobilisierung der Bogenschützen',
    buff: '+15m zusätzliche T10-Kapazität der Bogenschützen',
  },
  '2b149bcb:node_17': {
    name: 'Gardeschläge',
    buff: '+5% Kampfkraft aller Truppen',
  },
  '2b149bcb:node_18': {
    name: 'Gardeschild II',
    buff: '+5% Infanterie-Widerstand',
  },
  '2b149bcb:node_19': {
    name: 'Garderüstung II',
    buff: '+5% Kavallerie-Widerstand',
  },
  '2b149bcb:node_20': {
    name: 'Gardeformation II',
    buff: '+5% Bogenschützen-Widerstand',
  },
  '2b149bcb:node_21': {
    name: 'Gardemobilisierung II',
    buff: '+30m zusätzliche T10-Kapazität',
  },
  '2b149bcb:node_22': {
    name: 'Getarnte Garde - Infanterie',
    buff: '+5% Taktikwiderstand der Infanterie',
  },
  '2b149bcb:node_23': {
    name: 'Getarnte Garde - Kavallerie',
    buff: '+5% Taktikwiderstand der Kavallerie',
  },
  '2b149bcb:node_24': {
    name: 'Getarnte Garde - Bogenschützen',
    buff: '+5% Taktikwiderstand der Bogenschützen',
  },
  '2b149bcb:node_25': {
    name: 'Gardeüberfall - Infanterie',
    buff: '+5% Taktikkraft der Infanterie',
  },
  '2b149bcb:node_26': {
    name: 'Gardeüberfall - Kavallerie',
    buff: '+5% Taktikkraft der Kavallerie',
  },
  '2b149bcb:node_27': {
    name: 'Gardeüberfall - Bogenschützen',
    buff: '+5% Taktikkraft der Bogenschützen',
  },
  '2b149bcb:node_28': {
    name: 'Gardemoral - Infanterie',
    buff: '+5% Infanterie-HP',
  },
  '2b149bcb:node_29': {
    name: 'Gardemoral - Kavallerie',
    buff: '+5% Kavallerie-HP',
  },
  '2b149bcb:node_30': {
    name: 'Gardemoral - Bogenschützen',
    buff: '+5% Bogenschützen-HP',
  },
  '2b149bcb:node_31': {
    name: 'Gardemoral',
    buff: '+5% HP aller Truppen',
  },
  '2b149bcb:node_32': {
    name: 'Garde-Gegenangriff - Infanterie',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Infanterie',
  },
  '2b149bcb:node_33': {
    name: 'Garde-Gegenangriff - Kavallerie',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Kavallerie',
  },
  '2b149bcb:node_34': {
    name: 'Garde-Gegenangriff - Bogenschützen',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Bogenschützen',
  },
  '2b149bcb:node_35': {
    name: 'Entschlossene Garde - Infanterie',
    buff: '+5% Widerstand bei Belagerungsverteidigung der Infanterie',
  },
  '2b149bcb:node_36': {
    name: 'Entschlossene Garde - Kavallerie',
    buff: '+5% Widerstand bei Belagerungsverteidigung der Kavallerie',
  },
  '2b149bcb:node_37': {
    name: 'Entschlossene Garde - Bogenschützen',
    buff: '+5% Widerstand bei Belagerungsverteidigung der Bogenschützen',
  },
  '2b149bcb:node_38': {
    name: 'Gardemobilisierung III',
    buff: '+160m zusätzliche T10-Kapazität',
  },
  '3f5ebb34:node_1': {
    name: 'Bewaffnete Garde I',
    buff: '+5% Infanterie-Widerstand',
  },
  '3f5ebb34:node_2': {
    name: 'Bewaffnete Kavallerie I',
    buff: '+5% Kavallerie-Widerstand',
  },
  '3f5ebb34:node_3': {
    name: 'Bewaffnete Bogenschützen I',
    buff: '+5% Bogenschützen-Widerstand',
  },
  '3f5ebb34:node_4': {
    name: 'Infanterieklinge I',
    buff: '+5% Infanterie-Kampfkraft',
  },
  '3f5ebb34:node_5': {
    name: 'Schwerer Reiter I',
    buff: '+5% Kavallerie-Kampfkraft',
  },
  '3f5ebb34:node_6': {
    name: 'Gehärteter Pfeil I',
    buff: '+5% Bogenschützen-Kampfkraft',
  },
  '3f5ebb34:node_7': {
    name: 'Infanteriemobilisierung',
    buff: '+5% Infanterie-HP',
  },
  '3f5ebb34:node_8': {
    name: 'Kavalleriemobilisierung',
    buff: '+5% Kavallerie-HP',
  },
  '3f5ebb34:node_9': {
    name: 'Bogenschützenmobilisierung',
    buff: '+5% Bogenschützen-HP',
  },
  '3f5ebb34:node_10': {
    name: 'Voll bewaffnet',
    buff: '+5% Widerstand aller Truppen',
  },
  '3f5ebb34:node_11': {
    name: 'Vorrücken',
    buff: '+5% Taktikkraft der Infanterie',
  },
  '3f5ebb34:node_12': {
    name: 'Umgehung',
    buff: '+5% Taktikkraft der Kavallerie',
  },
  '3f5ebb34:node_13': {
    name: 'Gemeinsam feuern',
    buff: '+5% Taktikkraft der Bogenschützen',
  },
  '3f5ebb34:node_14': {
    name: 'Infanterieklinge II',
    buff: '+5% Infanterie-Kampfkraft',
  },
  '3f5ebb34:node_15': {
    name: 'Schwerer Reiter II',
    buff: '+5% Kavallerie-Kampfkraft',
  },
  '3f5ebb34:node_16': {
    name: 'Gehärteter Pfeil II',
    buff: '+5% Bogenschützen-Kampfkraft',
  },
  '3f5ebb34:node_17': {
    name: 'Bewaffnete Garde II',
    buff: '+5% Infanterie-Widerstand',
  },
  '3f5ebb34:node_18': {
    name: 'Bewaffnete Kavallerie II',
    buff: '+5% Kavallerie-Widerstand',
  },
  '3f5ebb34:node_19': {
    name: 'Bewaffnete Bogenschützen II',
    buff: '+5% Bogenschützen-Widerstand',
  },
  '3f5ebb34:node_20': {
    name: 'Brutaler Angriff I',
    buff: '+4% Schaden aller nicht-erhabenen Truppen',
  },
  '3f5ebb34:node_21': {
    name: 'Infanterieansturm',
    buff: '+5% Belagerungskraft der Infanterie',
  },
  '3f5ebb34:node_22': {
    name: 'Kavallerieansturm',
    buff: '+5% Belagerungskraft der Kavallerie',
  },
  '3f5ebb34:node_23': {
    name: 'Bogenschützenansturm',
    buff: '+5% Belagerungskraft der Bogenschützen',
  },
  '3f5ebb34:node_24': {
    name: 'Infanteriemobilisierung',
    buff: '+5% Belagerungswiderstand der Infanterie',
  },
  '3f5ebb34:node_25': {
    name: 'Kavalleriemobilisierung',
    buff: '+5% Belagerungswiderstand der Kavallerie',
  },
  '3f5ebb34:node_26': {
    name: 'Bogenschützenmobilisierung',
    buff: '+5% Belagerungswiderstand der Bogenschützen',
  },
  '3f5ebb34:node_27': {
    name: 'Ermutigung',
    buff: '+5% HP aller Truppen',
  },
  '3f5ebb34:node_28': {
    name: 'Gemeinsamer Schlachtruf',
    buff: '+5% Infanterie-Widerstand',
  },
  '3f5ebb34:node_29': {
    name: 'Gegenmaßnahme',
    buff: '+5% Kavallerie-Widerstand',
  },
  '3f5ebb34:node_30': {
    name: 'Gezieltes Feuer',
    buff: '+5% Bogenschützen-Widerstand',
  },
  '3f5ebb34:node_31': {
    name: 'Überfall',
    buff: '+5% Kampfkraft aller Truppen',
  },
  '3f5ebb34:node_32': {
    name: 'Gehärtete Klinge',
    buff: '+5% Kampfkraft aller Truppen',
  },
  '3f5ebb34:node_33': {
    name: 'Eliterüstung',
    buff: '+5% Widerstand aller Truppen',
  },
  '3f5ebb34:node_34': {
    name: 'Kampfhaltung',
    buff: '+5% Belagerungswiderstand aller Truppen',
  },
  '3f5ebb34:node_35': {
    name: 'Verteidigungshaltung',
    buff: '+5% Belagerungswiderstand aller Truppen',
  },
  '3f5ebb34:node_36': {
    name: 'Brutaler Angriff II',
    buff: '+6% Schaden aller nicht-erhabenen Truppen',
  },
  '3ff71437:node_1': {
    name: 'Stellung halten I - Infanterie',
    buff: '+5% Infanterie-Widerstand',
  },
  '3ff71437:node_2': {
    name: 'Stellung halten I - Kavallerie',
    buff: '+5% Kavallerie-Widerstand',
  },
  '3ff71437:node_3': {
    name: 'Stellung halten I - Bogenschützen',
    buff: '+5% Bogenschützen-Widerstand',
  },
  '3ff71437:node_4': {
    name: 'Präziser Schlag I – Infanterie',
    buff: '+5% Infanterie-Kampfkraft',
  },
  '3ff71437:node_5': {
    name: 'Präziser Schlag I – Kavallerie',
    buff: '+5% Kavallerie-Kampfkraft',
  },
  '3ff71437:node_6': {
    name: 'Präziser Schlag I – Bogenschützen',
    buff: '+5% Bogenschützen-Kampfkraft',
  },
  '3ff71437:node_7': {
    name: 'Ermutigung der Infanterie',
    buff: '+5% Infanterie-HP',
  },
  '3ff71437:node_8': {
    name: 'Ermutigung der Kavallerie',
    buff: '+5% Kavallerie-HP',
  },
  '3ff71437:node_9': {
    name: 'Ermutigung der Bogenschützen',
    buff: '+5% Bogenschützen-HP',
  },
  '3ff71437:node_10': {
    name: 'Tief durchatmen',
    buff: '+5% Widerstand aller Truppen',
  },
  '3ff71437:node_11': {
    name: 'Kommandobanner – Infanterie',
    buff: '+5% Taktikkraft der Infanterie',
  },
  '3ff71437:node_12': {
    name: 'Kommandobanner – Kavallerie',
    buff: '+5% Taktikkraft der Kavallerie',
  },
  '3ff71437:node_13': {
    name: 'Kommandobanner – Bogenschützen',
    buff: '+5% Taktikkraft der Bogenschützen',
  },
  '3ff71437:node_14': {
    name: 'Präziser Schlag II – Infanterie',
    buff: '+5% Infanterie-Kampfkraft',
  },
  '3ff71437:node_15': {
    name: 'Präziser Schlag II – Kavallerie',
    buff: '+5% Kavallerie-Kampfkraft',
  },
  '3ff71437:node_16': {
    name: 'Präziser Schlag II – Bogenschützen',
    buff: '+5% Bogenschützen-Kampfkraft',
  },
  '3ff71437:node_17': {
    name: 'Stellung halten II - Infanterie',
    buff: '+5% Infanterie-Widerstand',
  },
  '3ff71437:node_18': {
    name: 'Stellung halten II - Kavallerie',
    buff: '+5% Kavallerie-Widerstand',
  },
  '3ff71437:node_19': {
    name: 'Stellung halten II - Bogenschützen',
    buff: '+5% Bogenschützen-Widerstand',
  },
  '3ff71437:node_20': {
    name: 'Vergeltung I',
    buff: '+4% Schaden aller nicht-erhabenen Truppen',
  },
  '3ff71437:node_21': {
    name: 'Belagerungsbefehl – Infanterie',
    buff: '+5% Belagerungskraft der Infanterie',
  },
  '3ff71437:node_22': {
    name: 'Belagerungsbefehl – Kavallerie',
    buff: '+5% Belagerungskraft der Kavallerie',
  },
  '3ff71437:node_23': {
    name: 'Belagerungsbefehl – Bogenschützen',
    buff: '+5% Belagerungskraft der Bogenschützen',
  },
  '3ff71437:node_24': {
    name: 'Aufstellung – Infanterie',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Infanterie',
  },
  '3ff71437:node_25': {
    name: 'Aufstellung – Kavallerie',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Kavallerie',
  },
  '3ff71437:node_26': {
    name: 'Aufstellung – Bogenschützen',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Bogenschützen',
  },
  '3ff71437:node_27': {
    name: 'Zähigkeit',
    buff: '+5% HP aller Truppen',
  },
  '3ff71437:node_28': {
    name: 'Banner halten – Taktikwiderstand der Infanterie',
    buff: '+5% Taktikwiderstand der Infanterie',
  },
  '3ff71437:node_29': {
    name: 'Banner halten – Taktikwiderstand der Kavallerie',
    buff: '+5% Taktikwiderstand der Kavallerie',
  },
  '3ff71437:node_30': {
    name: 'Banner halten – Taktikwiderstand der Bogenschützen',
    buff: '+5% Taktikwiderstand der Bogenschützen',
  },
  '3ff71437:node_31': {
    name: 'Tödlicher Hieb',
    buff: '+5% Kampfkraft aller Truppen',
  },
  '3ff71437:node_32': {
    name: 'Waffenverbesserung',
    buff: '+5% Kampfkraft aller Truppen',
  },
  '3ff71437:node_33': {
    name: 'Verstärkte Rüstung',
    buff: '+5% Widerstand aller Truppen',
  },
  '3ff71437:node_34': {
    name: 'Kampfhaltung II',
    buff: '+5% Belagerungswiderstand aller Truppen',
  },
  '3ff71437:node_35': {
    name: 'Verteidigungshaltung II',
    buff: '+5% Belagerungswiderstand aller Truppen',
  },
  '3ff71437:node_36': {
    name: 'Vergeltung II',
    buff: '+6% Schaden aller nicht-erhabenen Truppen bei Belagerungsverteidigung',
  },
  'art_of_war_command:node_1': {
    name: 'Listiger Schwertkampf',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Infanterie',
  },
  'art_of_war_command:node_2': {
    name: 'Listige Reitkunst',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Kavallerie',
  },
  'art_of_war_command:node_3': {
    name: 'Listiges Bogenschießen',
    buff: '+5% Kampfkraft bei Belagerungsverteidigung der Bogenschützen',
  },
  'art_of_war_command:node_4': {
    name: 'Treuer Schwertkampf',
    buff: '+5% Widerstand bei Belagerungsverteidigung der Infanterie',
  },
  'art_of_war_command:node_5': {
    name: 'Treue Reitkunst',
    buff: '+5% Widerstand bei Belagerungsverteidigung der Kavallerie',
  },
  'art_of_war_command:node_6': {
    name: 'Treues Bogenschießen',
    buff: '+5% Widerstand bei Belagerungsverteidigung der Bogenschützen',
  },
  'art_of_war_command:node_7': {
    name: 'Quelle des Lebens I',
    buff: '+5% HP aller Truppen',
  },
  'art_of_war_command:node_8': {
    name: 'Furchtloser Schwertkampf',
    buff: '+5% Belagerungskraft der Infanterie',
  },
  'art_of_war_command:node_9': {
    name: 'Furchtlose Reitkunst',
    buff: '+5% Belagerungskraft der Kavallerie',
  },
  'art_of_war_command:node_10': {
    name: 'Furchtloses Bogenschießen',
    buff: '+5% Belagerungskraft der Bogenschützen',
  },
  'art_of_war_command:node_11': {
    name: 'Entschlossener Schwertkampf',
    buff: '+5% Belagerungswiderstand der Infanterie',
  },
  'art_of_war_command:node_12': {
    name: 'Entschlossene Reitkunst',
    buff: '+5% Belagerungswiderstand der Kavallerie',
  },
  'art_of_war_command:node_13': {
    name: 'Entschlossenes Bogenschießen',
    buff: '+5% Belagerungswiderstand der Bogenschützen',
  },
  'art_of_war_command:node_14': {
    name: 'Unaufhaltsam I',
    buff: '+5% Kampfkraft aller Truppen',
  },
  'art_of_war_command:node_15': {
    name: 'Verdeckter Schwertkampf I',
    buff: '+5% Infanterie-Widerstand',
  },
  'art_of_war_command:node_16': {
    name: 'Verdeckte Reitkunst I',
    buff: '+5% Kavallerie-Widerstand',
  },
  'art_of_war_command:node_17': {
    name: 'Verdecktes Bogenschießen I',
    buff: '+5% Bogenschützen-Widerstand',
  },
  'art_of_war_command:node_18': {
    name: 'Kraftvoller Schwertkampf I',
    buff: '+5% Infanterie-HP',
  },
  'art_of_war_command:node_19': {
    name: 'Kraftvolle Reitkunst I',
    buff: '+5% Kavallerie-HP',
  },
  'art_of_war_command:node_20': {
    name: 'Kraftvolles Bogenschießen I',
    buff: '+5% Bogenschützen-HP',
  },
  'art_of_war_command:node_21': {
    name: 'Unaufhaltsam II',
    buff: '+5% Kampfkraft aller Truppen',
  },
  'art_of_war_command:node_22': {
    name: 'Verdeckter Schwertkampf II',
    buff: '+5% Infanterie-Widerstand',
  },
  'art_of_war_command:node_23': {
    name: 'Verdeckte Reitkunst II',
    buff: '+5% Kavallerie-Widerstand',
  },
  'art_of_war_command:node_24': {
    name: 'Verdecktes Bogenschießen II',
    buff: '+5% Bogenschützen-Widerstand',
  },
  'art_of_war_command:node_25': {
    name: 'Durchbrechender Schwertkampf',
    buff: '+5% Belagerungskraft der Infanterie',
  },
  'art_of_war_command:node_26': {
    name: 'Durchbrechende Reitkunst',
    buff: '+5% Belagerungskraft der Kavallerie',
  },
  'art_of_war_command:node_27': {
    name: 'Durchbrechendes Bogenschießen',
    buff: '+5% Belagerungskraft der Bogenschützen',
  },
  'art_of_war_command:node_28': {
    name: 'Kraftvoller Schwertkampf II',
    buff: '+5% Infanterie-HP',
  },
  'art_of_war_command:node_29': {
    name: 'Kraftvolle Reitkunst II',
    buff: '+5% Kavallerie-HP',
  },
  'art_of_war_command:node_30': {
    name: 'Kraftvolles Bogenschießen II',
    buff: '+5% Bogenschützen-HP',
  },
  'art_of_war_command:node_31': {
    name: 'Verborgenes Talent',
    buff: '+10% Widerstand aller Truppen',
  },
  'art_of_war_command:node_32': {
    name: 'Täuschungskommando – Infanterie',
    buff: '+5% Taktikwiderstand der Infanterie',
  },
  'art_of_war_command:node_33': {
    name: 'Täuschungskommando – Kavallerie',
    buff: '+5% Taktikwiderstand der Kavallerie',
  },
  'art_of_war_command:node_34': {
    name: 'Täuschungskommando – Bogenschützen',
    buff: '+5% Taktikwiderstand der Bogenschützen',
  },
  'art_of_war_command:node_35': {
    name: 'Belagerungsbefehl – Infanterie',
    buff: '+5% Taktikkraft der Infanterie',
  },
  'art_of_war_command:node_36': {
    name: 'Belagerungsbefehl – Kavallerie',
    buff: '+5% Taktikkraft der Kavallerie',
  },
  'art_of_war_command:node_37': {
    name: 'Belagerungsbefehl – Bogenschützen',
    buff: '+5% Taktikkraft der Bogenschützen',
  },
  'art_of_war_command:node_38': {
    name: 'Quelle des Lebens II',
    buff: '+10% HP aller Truppen',
  },
  '77db4a78:node_1': {
    name: 'Kraftschlag',
    buff: '20% Infanterie-Kampfkraft',
  },
  '77db4a78:node_3': {
    name: 'Wilder Ansturm',
    buff: '20% Kavallerie-Kampfkraft',
  },
  '77db4a78:node_2': {
    name: 'Verstärkter Pfeil',
    buff: '20% Bogenschützen-Kampfkraft',
  },
  '77db4a78:node_4': {
    name: 'Unaufhaltsam',
    buff: '10% Kampfkraft aller Truppen',
  },
  '77db4a78:node_5': {
    name: 'Meisterrüstung',
    buff: '20% Infanterie-Widerstand',
  },
  '77db4a78:node_7': {
    name: 'Verstärkter Rossharnisch',
    buff: '20% Kavallerie-Widerstand',
  },
  '77db4a78:node_6': {
    name: 'Verstärkter Armschutz',
    buff: '20% Bogenschützen-Widerstand',
  },
  '77db4a78:node_8': {
    name: 'Voll bewaffnet',
    buff: '10% Widerstand aller Truppen',
  },
  '77db4a78:node_9': {
    name: 'Körperliche Stärkung',
    buff: '10% Infanterie-HP',
  },
  '77db4a78:node_10': {
    name: 'Manatrank',
    buff: '10% Kavallerie-HP',
  },
  '77db4a78:node_11': {
    name: 'Schwerer Plünderer',
    buff: '10% Bogenschützen-HP',
  },
  '77db4a78:node_12': {
    name: 'Vollmetallrüstung',
    buff: '5% HP aller Truppen',
  },
  '77db4a78:node_13_F': {
    name: 'Erhabene Infanterie',
    buff: 'T10-Infanterie freischalten',
  },
  '77db4a78:node_13_A': {
    name: 'Erhabene Bogenschützen',
    buff: 'T10-Bogenschützen freischalten',
  },
  '77db4a78:node_13_C': {
    name: 'T10 freischalten',
    buff: 'T10 freischalten',
  },
  '77db4a78:node_14_F': {
    name: 'Tödlicher Angriff',
    buff: '9% Kampfkraft erhabener Infanterie',
  },
  '77db4a78:node_15_F': {
    name: 'Qualitätsrüstung',
    buff: '6% Widerstand erhabener Infanterie',
  },
  '77db4a78:node_16_F': {
    name: 'Hochwertige Rüstung',
    buff: '3% HP erhabener Infanterie',
  },
  '77db4a78:node_17_F': {
    name: 'Kraftschlag II',
    buff: '30% Infanterie-Kampfkraft',
  },
  '77db4a78:node_18_F': {
    name: 'Meisterrüstung II',
    buff: '30% Infanterie-Widerstand',
  },
  '77db4a78:node_19_F': {
    name: 'Körperliche Stärkung II',
    buff: '15% Infanterie-HP',
  },
  '77db4a78:node_20_F': {
    name: 'Limit erhabener Infanterie',
    buff: '+200k Kapazität erhabener Truppen',
  },
  '77db4a78:node_21_F': {
    name: 'Hindernistraining',
    buff: '+50% Ausbildungstempo erhabener Infanterie',
  },
  '77db4a78:node_22_F': {
    name: 'Massenproduktion',
    buff: '-50% Ausbildungskosten erhabener Infanterie',
  },
  '77db4a78:node_23_F': {
    name: 'Reservetrank',
    buff: '+50% Heilungstempo erhabener Infanterie',
  },
  '77db4a78:node_24_F': {
    name: 'Wunderheilung',
    buff: '-50% Heilkosten erhabener Infanterie',
  },
  '77db4a78:node_25_F': {
    name: 'Limit erhabener Infanterie II',
    buff: '+800k Kapazität erhabener Truppen',
  },
  '77db4a78:node_26_F': {
    name: 'Kraftschlag III',
    buff: '42% Infanterie-Kampfkraft',
  },
  '77db4a78:node_27_F': {
    name: 'Meisterrüstung III',
    buff: '40% Infanterie-Widerstand',
  },
  '77db4a78:node_28_F': {
    name: 'Körperliche Stärkung III',
    buff: '20% Infanterie-HP',
  },
  '77db4a78:node_29_F': {
    name: 'Mutiger Sturmangriff',
    buff: '20% Schaden erhabener Infanterie',
  },
  '77db4a78:node_14_C': {
    name: 'Tödlicher Angriff',
    buff: '9% Kampfkraft erhabener Kavallerie',
  },
  '77db4a78:node_15_C': {
    name: 'Qualitätspferderüstung',
    buff: '6% Widerstand erhabener Kavallerie',
  },
  '77db4a78:node_16_C': {
    name: 'Hochwertige Pferderüstung',
    buff: '3% HP erhabener Kavallerie',
  },
  '77db4a78:node_17_C': {
    name: 'Wild Ansturm II',
    buff: '30% Kavallerie-Kampfkraft',
  },
  '77db4a78:node_18_C': {
    name: 'Verstärkter Rossharnisch II',
    buff: '30% Kavallerie-Widerstand',
  },
  '77db4a78:node_19_C': {
    name: 'Schwerer Plünderer II',
    buff: '15% Kavallerie-HP',
  },
  '77db4a78:node_20_C': {
    name: 'Chaosplünderer',
    buff: '+200k Kapazität erhabener Truppen',
  },
  '77db4a78:node_21_C': {
    name: 'Hindernistraining',
    buff: '+50% Ausbildungstempo erhabener Kavallerie',
  },
  '77db4a78:node_22_C': {
    name: 'Massenproduktion',
    buff: '-50% Ausbildungskosten erhabener Kavallerie',
  },
  '77db4a78:node_23_C': {
    name: 'Reservetrank',
    buff: '+50% Heilungstempo erhabener Kavallerie',
  },
  '77db4a78:node_24_C': {
    name: 'Wunderheilung',
    buff: '-50% Heilkosten erhabener Kavallerie',
  },
  '77db4a78:node_25_C': {
    name: 'Chaosplünderer II',
    buff: '+800k Kapazität erhabener Truppen',
  },
  '77db4a78:node_26_C': {
    name: 'Wild Ansturm III',
    buff: '42% Kavallerie-Kampfkraft',
  },
  '77db4a78:node_27_C': {
    name: 'Verstärkter Rossharnisch III',
    buff: '40% Kavallerie-Widerstand',
  },
  '77db4a78:node_28_C': {
    name: 'Schwerer Plünderer III',
    buff: '20% Kavallerie-HP',
  },
  '77db4a78:node_29_C': {
    name: 'Mutiger Sturmangriff',
    buff: '20% Schaden erhabener Kavallerie',
  },
  '77db4a78:node_14_A': {
    name: 'Tödlicher Angriff',
    buff: '9% Kampfkraft erhabener Bogenschützen',
  },
  '77db4a78:node_15_A': {
    name: 'Qualitätsrüstung',
    buff: '6% Widerstand erhabener Bogenschützen',
  },
  '77db4a78:node_16_A': {
    name: 'Hochwertige Rüstung',
    buff: '3% HP erhabener Bogenschützen',
  },
  '77db4a78:node_17_A': {
    name: 'Verstärkter Pfeil II',
    buff: '30% Bogenschützen-Kampfkraft',
  },
  '77db4a78:node_18_A': {
    name: 'Verstärkter Armschutz II',
    buff: '30% Bogenschützen-Widerstand',
  },
  '77db4a78:node_19_A': {
    name: 'Schwerer Plünderer II',
    buff: '15% Bogenschützen-HP',
  },
  '77db4a78:node_20_A': {
    name: 'Limit erhabener Bogenschützen',
    buff: '+200k Kapazität erhabener Truppen',
  },
  '77db4a78:node_21_A': {
    name: 'Hindernistraining',
    buff: '+50% Ausbildungstempo erhabener Bogenschützen',
  },
  '77db4a78:node_22_A': {
    name: 'Massenproduktion',
    buff: '-50% Ausbildungskosten erhabener Bogenschützen',
  },
  '77db4a78:node_23_A': {
    name: 'Reservetrank',
    buff: '+50% Heilungstempo erhabener Bogenschützen',
  },
  '77db4a78:node_24_A': {
    name: 'Wunderheilung',
    buff: '-50% Heilkosten erhabener Bogenschützen',
  },
  '77db4a78:node_25_A': {
    name: 'Limit erhabener Bogenschützen II',
    buff: '+800k Kapazität erhabener Truppen',
  },
  '77db4a78:node_26_A': {
    name: 'Verstärkter Pfeil III',
    buff: '42% Bogenschützen-Kampfkraft',
  },
  '77db4a78:node_27_A': {
    name: 'Verstärkter Armschutz III',
    buff: '40% Bogenschützen-Widerstand',
  },
  '77db4a78:node_28_A': {
    name: 'Schwerer Plünderer III',
    buff: '20% Bogenschützen-HP',
  },
  '77db4a78:node_29_A': {
    name: 'Mutiger Sturmangriff',
    buff: '20% Schaden erhabener Bogenschützen',
  },
  '24ffc526:node_1': {
    name: 'Voller Mut – Kavallerie',
    buff: '10% Kampfkraft der Frontreihe',
  },
  '24ffc526:node_2': {
    name: 'Ausdauer - Kavallerie',
    buff: '10% Widerstand der Frontreihe',
  },
  '24ffc526:node_3': {
    name: 'Voller Mut – Bogenschützen',
    buff: '10% Kampfkraft der Frontreihe',
  },
  '24ffc526:node_4': {
    name: 'Ausdauer - Bogenschützen',
    buff: '10% Widerstand der Frontreihe',
  },
  '24ffc526:node_5': {
    name: 'Voller Mut – Infanterie',
    buff: '10% Kampfkraft der Frontreihe',
  },
  '24ffc526:node_6': {
    name: 'Ausdauer - Infanterie',
    buff: '10% Widerstand der Frontreihe',
  },
  '24ffc526:node_7': {
    name: 'Frontwiderstand',
    buff: '10% Taktikwiderstand aller Truppen in der Frontreihe',
  },
  '24ffc526:node_8': {
    name: 'Überfall durch Infanterie',
    buff: '100% Marschtempo der Infanterie',
  },
  '24ffc526:node_9': {
    name: 'Überfall durch Bogenschützen',
    buff: '100% Marschtempo der Bogenschützen',
  },
  '24ffc526:node_10': {
    name: 'Vorwärtssturm',
    buff: '10% Kavallerie-Kampfkraft bei reiner Kavallerielegion',
  },
  '24ffc526:node_11': {
    name: 'Vorstoßformation - Kavallerie',
    buff: '10% Kampfkraft der mittleren Reihe',
  },
  '24ffc526:node_12': {
    name: 'Vorstoßformation - Bogenschützen',
    buff: '10% Kampfkraft der mittleren Reihe',
  },
  '24ffc526:node_13': {
    name: 'Vorstoßformation - Infanterie',
    buff: '10% Kampfkraft der mittleren Reihe',
  },
  '24ffc526:node_14': {
    name: 'Flankenschutz - Kavallerie',
    buff: '10% Widerstand der mittleren Reihe',
  },
  '24ffc526:node_15': {
    name: 'Flankenschutz - Bogenschützen',
    buff: '10% Widerstand der mittleren Reihe',
  },
  '24ffc526:node_16': {
    name: 'Flankenschutz - Infanterie',
    buff: '10% Widerstand der mittleren Reihe',
  },
  '24ffc526:node_17': {
    name: 'Zentrale Streitmacht',
    buff: '10% Taktikkraft aller Truppen der mittleren Reihe',
  },
  '24ffc526:node_18': {
    name: 'Hauptstreitmacht - Kavallerie',
    buff: '10% Kampfkraft der hinteren Reihe',
  },
  '24ffc526:node_19': {
    name: 'Hauptstreitmacht - Bogenschützen',
    buff: '10% Kampfkraft der hinteren Reihe',
  },
  '24ffc526:node_20': {
    name: 'Hauptstreitmacht - Infanterie',
    buff: '10% Kampfkraft der hinteren Reihe',
  },
  '24ffc526:node_21': {
    name: 'Geheimtaktik - Kavallerie',
    buff: '10% Widerstand der hinteren Reihe',
  },
  '24ffc526:node_22': {
    name: 'Geheimtaktik - Bogenschützen',
    buff: '10% Widerstand der hinteren Reihe',
  },
  '24ffc526:node_23': {
    name: 'Geheimtaktik - Infanterie',
    buff: '10% Widerstand der hinteren Reihe',
  },
  '24ffc526:node_24': {
    name: 'Befehlsgewalt',
    buff: '10% Taktikkraft aller Truppen der hinteren Reihe',
  },
  '24ffc526:node_25': {
    name: 'Geballte Kampfkraft',
    buff: '10% Kampfkraft der hinteren Reihe',
  },
  '24ffc526:node_26': {
    name: 'Abgestimmter Vorstoß',
    buff: '10% Kampfkraft der mittleren Reihe',
  },
  '24ffc526:node_27': {
    name: 'Vorrückende Frontlinie',
    buff: '10% Kampfkraft der Frontreihe',
  },
  '24ffc526:node_28': {
    name: 'Drehpunktverteidigung',
    buff: '10% Widerstand der mittleren Reihe',
  },
  '24ffc526:node_29': {
    name: '"Deckung!"',
    buff: '10% Widerstand der hinteren Reihe',
  },
  '24ffc526:node_30': {
    name: 'Stoßfest',
    buff: '10% Widerstand der Frontreihe',
  },
  '24ffc526:node_31': {
    name: 'Nahkampf',
    buff: '+10% HP der Frontreihe',
  },
  '24ffc526:node_32': {
    name: 'Zentrale Streitmacht',
    buff: '20% Taktikkraft Mittlere Reihe',
  },
  '24ffc526:node_33': {
    name: 'Zentraler Widerstand',
    buff: '20% Taktikwiderstand Mittlere Reihe',
  },
  '24ffc526:node_34': {
    name: 'Wuchtiger Schlag',
    buff: '5% Schaden der hinteren Reihe',
  },
  '2c49bd2a:node_1': {
    name: 'Geplante Belagerung',
    buff: 'Taktikkraft bei Belagerungsverteidigung +10%',
  },
  '2c49bd2a:node_2': {
    name: 'Solide Infanterieverteidigung',
    buff: 'Infanterie-Widerstand in Feldkämpfen +5%',
  },
  '2c49bd2a:node_3': {
    name: 'Solide Kavallerieverteidigung',
    buff: 'Kavallerie-Widerstand in Feldkämpfen +5%',
  },
  '2c49bd2a:node_4': {
    name: 'Solide Bogenschützenverteidigung',
    buff: 'Bogenschützen-Widerstand in Feldkämpfen +5%',
  },
  '2c49bd2a:node_5': {
    name: 'Tordurchbruch – Infanterie',
    buff: 'Belagerungskraft der Infanterie +5%',
  },
  '2c49bd2a:node_6': {
    name: 'Burgsturm – Kavallerie',
    buff: 'Belagerungskraft der Kavallerie +5%',
  },
  '2c49bd2a:node_7': {
    name: 'Feindlähmung – Bogenschützen',
    buff: 'Belagerungskraft der Bogenschützen +5%',
  },
  '2c49bd2a:node_8': {
    name: 'Ungewöhnlich nützliche Taktiken',
    buff: 'Taktikkraft in Feldkämpfen +10%',
  },
  '2c49bd2a:node_9': {
    name: 'Infanterie-Verteidigungslinie',
    buff: 'Belagerungswiderstand der Infanterie +5%',
  },
  '2c49bd2a:node_10': {
    name: 'Barrikadenartige Kavallerie',
    buff: 'Belagerungswiderstand der Kavallerie +5%',
  },
  '2c49bd2a:node_11': {
    name: 'Rückraumverteidigung der Bogenschützen',
    buff: 'Belagerungswiderstand der Bogenschützen +5%',
  },
  '2c49bd2a:node_12': {
    name: 'Mauerbrecher',
    buff: 'Kampfkraft der Infanterie bei Belagerungsverteidigung +5%',
  },
  '2c49bd2a:node_13': {
    name: 'Kavallerieansturm',
    buff: 'Kampfkraft der Kavallerie bei Belagerungsverteidigung +5%',
  },
  '2c49bd2a:node_14': {
    name: 'Pfeilregen',
    buff: 'Kampfkraft der Bogenschützen bei Belagerungsverteidigung +5%',
  },
  '2c49bd2a:node_15': {
    name: 'Belagerungslist',
    buff: 'Taktikkraft bei Belagerungsangriffen +10%',
  },
  '2c49bd2a:node_16': {
    name: 'Mauerwachen',
    buff: 'Kampfkraft der Infanterie bei Belagerungsverteidigung +5%',
  },
  '2c49bd2a:node_17': {
    name: 'Goldschild der Kavallerie',
    buff: 'Kampfkraft der Kavallerie bei Belagerungsverteidigung +5%',
  },
  '2c49bd2a:node_18': {
    name: 'Turmverteidigung der Bogenschützen',
    buff: 'Kampfkraft der Bogenschützen bei Belagerungsverteidigung +5%',
  },
  '2c49bd2a:node_19': {
    name: 'Ausbruch der Infanterie',
    buff: 'Infanterie-Kampfkraft in Feldkämpfen +5%',
  },
  '2c49bd2a:node_20': {
    name: 'Überfall der Kavallerie',
    buff: 'Kavallerie-Kampfkraft in Feldkämpfen +5%',
  },
  '2c49bd2a:node_21': {
    name: 'Fernschlag der Bogenschützen',
    buff: 'Bogenschützen-Kampfkraft in Feldkämpfen +5%',
  },
  '2c49bd2a:node_22': {
    name: 'Voll besetzte Armee',
    buff: 'Bei Truppstärke >90%: Schadensminderung +5%',
  },
  '2c49bd2a:node_23': {
    name: 'Herabstürmende Infanterie',
    buff: 'Kampfkraft der Infanterie +5%',
  },
  '2c49bd2a:node_24': {
    name: 'Stampfende Infanterie',
    buff: 'Widerstand der Infanterie +5%',
  },
  '2c49bd2a:node_25': {
    name: 'Überfall der Kavallerie',
    buff: 'Kampfkraft der Kavallerie +5%',
  },
  '2c49bd2a:node_26': {
    name: 'Festungshaltende Kavallerie',
    buff: 'Widerstand der Kavallerie +5%',
  },
  '2c49bd2a:node_27': {
    name: 'Feuer der Bogenschützen',
    buff: 'Kampfkraft der Bogenschützen +5%',
  },
  '2c49bd2a:node_28': {
    name: 'Festungshaltende Bogenschützen',
    buff: 'Widerstand der Bogenschützen +5%',
  },
  '2c49bd2a:node_29': {
    name: 'Vorausschauende Verstärkung',
    buff: 'Taktikwiderstand +10%',
  },
  '2c49bd2a:node_30': {
    name: 'Schnelldrill der Infanterie',
    buff: 'Ausbildungstempo der Infanterie +10%',
  },
  '2c49bd2a:node_31': {
    name: 'Schnelldrill der Kavallerie',
    buff: 'Ausbildungstempo der Kavallerie +10%',
  },
  '2c49bd2a:node_32': {
    name: 'Schnelldrill der Bogenschützen',
    buff: 'Ausbildungstempo der Bogenschützen +10%',
  },
  '2c49bd2a:node_33': {
    name: 'Stampfende Infanterie',
    buff: 'Widerstand der Infanterie +10%',
  },
  '2c49bd2a:node_34': {
    name: 'Festungshaltende Kavallerie',
    buff: 'Widerstand der Kavallerie +10%',
  },
  '2c49bd2a:node_35': {
    name: 'Festungshaltende Bogenschützen',
    buff: 'Widerstand der Bogenschützen +10%',
  },
  '2c49bd2a:node_36': {
    name: 'Herabstürmende Infanterie',
    buff: 'Kampfkraft der Infanterie +10%',
  },
  '2c49bd2a:node_37': {
    name: 'Überfall der Kavallerie',
    buff: 'Kampfkraft der Kavallerie +10%',
  },
  '2c49bd2a:node_38': {
    name: 'Feuer der Bogenschützen',
    buff: 'Kampfkraft der Bogenschützen +10%',
  },
  '2c49bd2a:node_39': {
    name: 'Unbeugsamer Soldat',
    buff: 'HP aller Truppen +10%',
  },
  '2c49bd2a:node_40': {
    name: 'Intensivausbildung der Infanterie',
    buff: 'Geringere Ausbildungskosten für Infanterie der Stufe 10: +10%',
  },
  '2c49bd2a:node_41': {
    name: 'Intensivausbildung der Kavallerie',
    buff: 'Geringere Ausbildungskosten für Kavallerie der Stufe 10: +10%',
  },
  '2c49bd2a:node_42': {
    name: 'Intensivausbildung der Bogenschützen',
    buff: 'Geringere Ausbildungskosten für Bogenschützen der Stufe 10: +10%',
  },
  '2c49bd2a:node_43': {
    name: 'Entschlossener Vorstoß',
    buff: '+5% Schaden der Infanterie',
  },
  '2c49bd2a:node_44': {
    name: 'Formationsbrecher – Kavallerie',
    buff: '+5% Schaden der Infanterie',
  },
  '2c49bd2a:node_45': {
    name: 'Pfeilflut',
    buff: '+5% Schaden der Infanterie',
  },
  'fc190e81:node_1': {
    name: 'Quelle des Lebens I',
    buff: '+8% HP aller Truppen',
  },
  'fc190e81:node_2': {
    name: 'Vorrückende Frontlinie',
    buff: '+8% Kampfkraft der Frontreihe',
  },
  'fc190e81:node_3': {
    name: 'Abgestimmter Vorstoß',
    buff: '+8% Kampfkraft der mittleren Reihe',
  },
  'fc190e81:node_4': {
    name: 'Geballte Kampfkraft',
    buff: '+8% Kampfkraft der hinteren Reihe',
  },
  'fc190e81:node_5': {
    name: 'Bewaffnete Garde I',
    buff: '+8% Infanterie-Widerstand',
  },
  'fc190e81:node_6': {
    name: 'Bewaffnete Bogenschützen I',
    buff: '+8% Bogenschützen-Widerstand',
  },
  'fc190e81:node_7': {
    name: 'Bewaffnete Kavallerie I',
    buff: '+8% Kavallerie-Widerstand',
  },
  'fc190e81:node_8': {
    name: 'Drachenblutschild I',
    buff: '-5% Erlittener Schaden',
  },
  'fc190e81:node_9': {
    name: 'Stoßfest',
    buff: '+8% Widerstand der Frontreihe',
  },
  'fc190e81:node_10': {
    name: 'Drehpunktverteidigung',
    buff: '+8% Widerstand der mittleren Reihe',
  },
  'fc190e81:node_11': {
    name: 'Deckung',
    buff: '+8% Widerstand der hinteren Reihe',
  },
  'fc190e81:node_12': {
    name: 'Infanterieklinge I',
    buff: '+8% Infanterie-Kampfkraft',
  },
  'fc190e81:node_13': {
    name: 'Gehärteter Pfeil I',
    buff: '+8% Bogenschützen-Kampfkraft',
  },
  'fc190e81:node_14': {
    name: 'Schwerer Reiter I',
    buff: '+8% Kavallerie-Kampfkraft',
  },
  'fc190e81:node_15': {
    name: 'Beschleunigte Ausbildung',
    buff: '+5% Ausbildungstempo',
  },
  'fc190e81:node_16': {
    name: 'Kraftvoller Schwertkampf I',
    buff: '+10% Infanterie-HP',
  },
  'fc190e81:node_17': {
    name: 'Kraftvolles Bogenschießen I',
    buff: '+10% Bogenschützen-HP',
  },
  'fc190e81:node_18': {
    name: 'Kraftvolle Reitkunst I',
    buff: '+10% Kavallerie-HP',
  },
  'fc190e81:node_19': {
    name: 'Drachenblutkraft',
    buff: '+5% Verursachter Schaden',
  },
  'fc190e81:node_20': {
    name: 'Ansturm',
    buff: '+12% Belagerungskraft',
  },
  'fc190e81:node_21': {
    name: 'Mobilisierung',
    buff: '+12% Kampfkraft bei Belagerungsverteidigung',
  },
  'fc190e81:node_22': {
    name: 'Guerillakrieg',
    buff: '+12% Kampfkraft in Feldkämpfen',
  },
  'fc190e81:node_23': {
    name: 'Kampfhaltung',
    buff: '+12% Belagerungswiderstand',
  },
  'fc190e81:node_24': {
    name: 'Verteidigungshaltung',
    buff: '+12% Widerstand bei Belagerungsverteidigung',
  },
  'fc190e81:node_25': {
    name: 'Gladiatorenhaltung',
    buff: '+12% Widerstand in Feldkämpfen',
  },
  'fc190e81:node_26': {
    name: 'Quelle des Lebens II',
    buff: '+12% HP aller Truppen',
  },
  'fc190e81:node_27': {
    name: 'Vorrückende Frontlinie II',
    buff: '+12% Kampfkraft der Frontreihe',
  },
  'fc190e81:node_28': {
    name: 'Stoßfest II',
    buff: '+12% Widerstand der Frontreihe',
  },
  'fc190e81:node_29': {
    name: 'Abgestimmter Vorstoß II',
    buff: '+12% Kampfkraft der mittleren Reihe',
  },
  'fc190e81:node_30': {
    name: 'Drehpunktverteidigung II',
    buff: '+12% Widerstand der mittleren Reihe',
  },
  'fc190e81:node_31': {
    name: 'Geballte Kampfkraft II',
    buff: '+12% Kampfkraft der hinteren Reihe',
  },
  'fc190e81:node_32': {
    name: 'Deckung II',
    buff: '+12% Widerstand der hinteren Reihe',
  },
  'fc190e81:node_33': {
    name: 'Drachenblutheilung',
    buff: '+5% Heilungstempo',
  },
  'fc190e81:node_34': {
    name: 'Infanterieklinge II',
    buff: '+20% Infanterie-Kampfkraft',
  },
  'fc190e81:node_35': {
    name: 'Gehärteter Pfeil II',
    buff: '+20% Bogenschützen-Kampfkraft',
  },
  'fc190e81:node_36': {
    name: 'Schwerer Reiter II',
    buff: '+20% Kavallerie-Kampfkraft',
  },
  'fc190e81:node_37': {
    name: 'Bewaffnete Garde II',
    buff: '+20% Infanterie-Widerstand',
  },
  'fc190e81:node_38': {
    name: 'Bewaffnete Bogenschützen II',
    buff: '+20% Bogenschützen-Widerstand',
  },
  'fc190e81:node_39': {
    name: 'Bewaffnete Kavallerie II',
    buff: '+20% Kavallerie-Widerstand',
  },
  'fc190e81:node_40': {
    name: 'Drachenblutschild II',
    buff: '-5% Erlittener Schaden',
  },
  'fc190e81:node_41': {
    name: 'Kraftvoller Schwertkampf II',
    buff: '+30% Infanterie-HP',
  },
  'fc190e81:node_42': {
    name: 'Kraftvolles Bogenschießen II',
    buff: '+30% Bogenschützen-HP',
  },
  'fc190e81:node_43': {
    name: 'Kraftvolle Reitkunst II',
    buff: '+30% Kavallerie-HP',
  },
  '19ae0569:node_1': {
    name: 'Gut geplante Rettung',
    buff: '+10% Widerstand beim Verstärken von Verbündeten',
  },
  '19ae0569:node_2': {
    name: 'Ausbildungsmeister',
    buff: '+3000 Ausgebildete Truppen',
  },
  '19ae0569:node_3': {
    name: 'Gemeinsame Verteidigung',
    buff: '+10% eigener Widerstand bei Verstärkung',
  },
  '19ae0569:node_4': {
    name: 'Perfektes Zusammenspiel',
    buff: '+10% Kampfkraft beim Verstärken',
  },
  '19ae0569:node_5': {
    name: 'Verbesserungsmeister',
    buff: '+20000 verstärkte Truppen',
  },
  '19ae0569:node_6': {
    name: 'Zurückschlagen',
    buff: '+10% Kampfkraft der Verbündeten bei eigener Verstärkung',
  },
  '19ae0569:node_7': {
    name: 'Infanterieraserei I',
    buff: '+10% Infanterie-HP',
  },
  '19ae0569:node_8': {
    name: 'Kavallerie im Kampf I',
    buff: '+10% Kavallerie-Kampfkraft',
  },
  '19ae0569:node_9': {
    name: 'Bogenschützenraserei I',
    buff: '+10% Bogenschützen-HP',
  },
  '19ae0569:node_10': {
    name: 'Feldlazarett',
    buff: '+150k Lazarettkapazität',
  },
  '19ae0569:node_11': {
    name: 'Infanterieraserei II',
    buff: '+10% Infanterie-HP',
  },
  '19ae0569:node_12': {
    name: 'Kavallerie im Kampf II',
    buff: '+10% Kavallerie-Kampfkraft',
  },
  '19ae0569:node_13': {
    name: 'Bogenschützenraserei II',
    buff: '+10% Bogenschützen-HP',
  },
  '19ae0569:node_14': {
    name: 'Infanterieausbau I',
    buff: '+500k Kapazität erhabener Infanterie',
  },
  '19ae0569:node_15': {
    name: 'Kavallerieausbau I',
    buff: '+500k Kapazität erhabener Kavallerie',
  },
  '19ae0569:node_16': {
    name: 'Bogenschützenausbau I',
    buff: '+500k Kapazität erhabener Bogenschützen',
  },
  '19ae0569:node_17': {
    name: 'Rüstungsveredelung',
    buff: '+5% Widerstand',
  },
  '19ae0569:node_18': {
    name: 'Infanterieüberfall',
    buff: '+10% Taktikkraft der Infanterie',
  },
  '19ae0569:node_19': {
    name: 'Kavallerieangriff',
    buff: '+10% Taktikkraft der Kavallerie',
  },
  '19ae0569:node_20': {
    name: 'Bogenschützenfeuer',
    buff: '+10% Taktikkraft der Bogenschützen',
  },
  '19ae0569:node_21': {
    name: 'Infanterieschild',
    buff: '+10% Taktikwiderstand der Infanterie',
  },
  '19ae0569:node_22': {
    name: 'Kavallerie in der hinteren Reihe',
    buff: '+10% Taktikwiderstand der Kavallerie',
  },
  '19ae0569:node_23': {
    name: 'Bogenschützendeckung',
    buff: '+10% Taktikwiderstand der Bogenschützen',
  },
  '19ae0569:node_24': {
    name: 'Infanterieausbau II',
    buff: '+500k Kapazität erhabener Infanterie',
  },
  '19ae0569:node_25': {
    name: 'Kavallerieausbau II',
    buff: '+500k Kapazität erhabener Kavallerie',
  },
  '19ae0569:node_26': {
    name: 'Bogenschützenausbau II',
    buff: '+500k Kapazität erhabener Bogenschützen',
  },
  '19ae0569:node_27': {
    name: 'Klingenhärtung',
    buff: '+5% Kampfkraft',
  },
  '19ae0569:node_28': {
    name: 'Stahlschild',
    buff: '+10% Widerstand erhabener Infanterie',
  },
  '19ae0569:node_29': {
    name: 'Pferderüstung',
    buff: '+10% Widerstand erhabener Kavallerie',
  },
  '19ae0569:node_30': {
    name: 'Panzerhandschuhe',
    buff: '+10% Widerstand erhabener Bogenschützen',
  },
  '19ae0569:node_31': {
    name: 'Stahlschwert',
    buff: '+10% Kampfkraft erhabener Infanterie',
  },
  '19ae0569:node_32': {
    name: 'Scharfer Speer',
    buff: '+10% Kampfkraft erhabener Kavallerie',
  },
  '19ae0569:node_33': {
    name: 'Armbrust',
    buff: '+10% Kampfkraft erhabener Bogenschützen',
  },
  '19ae0569:node_34': {
    name: 'Ausbau verstärkter Infanterie',
    buff: '+1m Kapazität erhabener Infanterie',
  },
  '19ae0569:node_35': {
    name: 'Ausbau verstärkter Kavallerie',
    buff: '+1m Kapazität erhabener Kavallerie',
  },
  '19ae0569:node_36': {
    name: 'Ausbau verstärkter Bogenschützen',
    buff: '+1m Kapazität erhabener Bogenschützen',
  },
  '19ae0569:node_37': {
    name: 'Segen des Lebens',
    buff: '+5% HP erhabener Truppen',
  },
  '9c5d4006:node_1': {
    name: 'Verteidigungsschild',
    buff: '+10% Widerstand bei Belagerungsverteidigung der Infanterie',
  },
  '9c5d4006:node_2': {
    name: 'Verteidigungsrüstung',
    buff: '+10% Widerstand bei Belagerungsverteidigung der Bogenschützen',
  },
  '9c5d4006:node_3': {
    name: 'Verteidigungskavallerie',
    buff: '+10% Widerstand bei Belagerungsverteidigung der Kavallerie',
  },
  '9c5d4006:node_4': {
    name: 'Infanteriedurchbruch',
    buff: '+10% Kampfkraft bei Belagerungsverteidigung der Infanterie',
  },
  '9c5d4006:node_5': {
    name: 'Bogenschützendurchbruch',
    buff: '+10% Kampfkraft bei Belagerungsverteidigung der Bogenschützen',
  },
  '9c5d4006:node_6': {
    name: 'Kavalleriedurchbruch',
    buff: '+10% Kampfkraft bei Belagerungsverteidigung der Kavallerie',
  },
  '9c5d4006:node_7': {
    name: 'Taktischer Nahkampfschutz',
    buff: '+5% Taktikwiderstand aller Truppen',
  },
  '9c5d4006:node_8': {
    name: 'Beharrlichkeit – Klassenlegion',
    buff: '+15% Widerstand der Klassenlegion aller Truppen',
  },
  '9c5d4006:node_9': {
    name: 'Beharrlichkeit – Legion I',
    buff: '+15% Widerstand der Legion I aller Truppen',
  },
  '9c5d4006:node_10': {
    name: 'Beharrlichkeit – Legion II',
    buff: '+15% Widerstand der Legion II aller Truppen',
  },
  '9c5d4006:node_11': {
    name: 'Beharrlichkeit – Legion III',
    buff: '+15% Widerstand der Legion III aller Truppen',
  },
  '9c5d4006:node_12': {
    name: 'Beharrlichkeit – Verteidigungsformation',
    buff: '+15% Widerstand der Verteidigungsformation aller Truppen',
  },
  '9c5d4006:node_13': {
    name: 'Solide Verteidigung',
    buff: '+10% Widerstand bei Belagerungsverteidigung aller Truppen',
  },
  '9c5d4006:node_14': {
    name: 'Verteidigungstruppe',
    buff: '15000 Marschlimit der Verteidigungsformation',
  },
  '9c5d4006:node_15': {
    name: 'Taktischer Nahkampfangriff',
    buff: '+5% Taktikkraft aller Truppen',
  },
  '9c5d4006:node_16': {
    name: 'Beharrlichkeit – Klassenlegion M',
    buff: '+15% Kampfkraft der Klassenlegion aller Truppen',
  },
  '9c5d4006:node_17': {
    name: 'Beharrlichkeit – Legion I M',
    buff: '+15% Kampfkraft der Legion I aller Truppen',
  },
  '9c5d4006:node_18': {
    name: 'Beharrlichkeit – Legion II M',
    buff: '+15% Kampfkraft der Legion II aller Truppen',
  },
  '9c5d4006:node_19': {
    name: 'Beharrlichkeit – Legion III M',
    buff: '+15% Kampfkraft der Legion III aller Truppen',
  },
  '9c5d4006:node_20': {
    name: 'Mut – Verteidigungsformation',
    buff: '+15% Kampfkraft der Verteidigungsformation aller Truppen',
  },
  '9c5d4006:node_21': {
    name: 'Initiative',
    buff: '+10% Kampfkraft bei Belagerungsverteidigung aller Truppen',
  },
  '9c5d4006:node_22': {
    name: 'Nahkampf – Infanterieschild',
    buff: '+15% Widerstand der Infanterie',
  },
  '9c5d4006:node_23': {
    name: 'Nahkampf – Kavallerie in der Nachhut',
    buff: '+15% Widerstand der Kavallerie',
  },
  '9c5d4006:node_24': {
    name: 'Nahkampf – Bogenschützendeckung',
    buff: '+15% Widerstand der Bogenschützen',
  },
  '9c5d4006:node_25': {
    name: 'Nahkampf – Infanterieüberfall',
    buff: '+15% Kampfkraft der Infanterie',
  },
  '9c5d4006:node_26': {
    name: 'Nahkampf – Kavallerieangriff',
    buff: '+15% Kampfkraft der Kavallerie',
  },
  '9c5d4006:node_27': {
    name: 'Nahkampf – Bogenschützenbeschuss',
    buff: '+15% Kampfkraft der Bogenschützen',
  },
  '9c5d4006:node_28': {
    name: 'Gute Physis',
    buff: 'HP bei Belagerungsverteidigung aller Truppen +10%',
  },
  '9c5d4006:node_29': {
    name: 'Nahkampf geht weiter',
    buff: '-5% in Belagerungsverteidigungskämpfen, tödlicher Effekt reduziert',
  },
  'b57d6bf9:node_1': {
    name: 'Klingenangriff – Infanterie',
    buff: '+10% Belagerungskraft der Infanterie',
  },
  'b57d6bf9:node_2': {
    name: 'Klingenangriff – Kavallerie',
    buff: '+10% Belagerungskraft der Kavallerie',
  },
  'b57d6bf9:node_3': {
    name: 'Klingenangriff – Bogenschützen',
    buff: '+10% Belagerungskraft der Bogenschützen',
  },
  'b57d6bf9:node_4': {
    name: 'Klingenüberfall – Infanterie',
    buff: '+10% Belagerungswiderstand der Infanterie',
  },
  'b57d6bf9:node_5': {
    name: 'Klingenüberfall – Kavallerie',
    buff: '+10% Belagerungswiderstand der Kavallerie',
  },
  'b57d6bf9:node_6': {
    name: 'Klingenüberfall – Bogenschützen',
    buff: '+10% Belagerungswiderstand der Bogenschützen',
  },
  'b57d6bf9:node_7': {
    name: 'Hofgarde',
    buff: '+5% Taktikkraft aller Truppen',
  },
  'b57d6bf9:node_8': {
    name: 'Eisenwall – Klassenlegion',
    buff: '+10% Widerstand aller Truppen in der Klassenlegion',
  },
  'b57d6bf9:node_9': {
    name: 'Eisenwall – Legion 1',
    buff: '+10% Widerstand aller Truppen in Legion 1',
  },
  'b57d6bf9:node_10': {
    name: 'Eisenwall – Legion 2',
    buff: '+10% Widerstand aller Truppen in Legion 2',
  },
  'b57d6bf9:node_11': {
    name: 'Eisenwall – Legion 3',
    buff: '+10% Widerstand aller Truppen in Legion 3',
  },
  'b57d6bf9:node_12': {
    name: 'Ausgewogene Taktik',
    buff: '+5% Kampfkraft und Widerstand der Truppen',
  },
  'b57d6bf9:node_13': {
    name: 'Ansturm – Klassenlegion',
    buff: '+10% Kampfkraft aller Truppen in der Klassenlegion',
  },
  'b57d6bf9:node_14': {
    name: 'Ansturm – Legion 1',
    buff: '+10% Kampfkraft aller Truppen in Legion 1',
  },
  'b57d6bf9:node_15': {
    name: 'Ansturm – Legion 2',
    buff: '+10% Kampfkraft aller Truppen in Legion 2',
  },
  'b57d6bf9:node_16': {
    name: 'Ansturm – Legion 3',
    buff: '+10% Kampfkraft aller Truppen in Legion 3',
  },
  'b57d6bf9:node_17': {
    name: 'Vorhutpanzerung',
    buff: '+5% Taktikwiderstand aller Truppen',
  },
  'b57d6bf9:node_18': {
    name: 'Schwere Vorhutrüstung',
    buff: '+5% Belagerungswiderstand aller Truppen',
  },
  'b57d6bf9:node_19': {
    name: 'Kampffertigkeits-Meisterschaft – Infanterie',
    buff: '+10% Fähigkeits-Kampfkraft der Infanterie',
  },
  'b57d6bf9:node_20': {
    name: 'Kampffertigkeits-Meisterschaft – Kavallerie',
    buff: '+10% Fähigkeits-Kampfkraft der Kavallerie',
  },
  'b57d6bf9:node_21': {
    name: 'Kampffertigkeits-Meisterschaft – Bogenschützen',
    buff: '+10% Fähigkeits-Kampfkraft der Bogenschützen',
  },
  'b57d6bf9:node_22': {
    name: 'Kampffertigkeits-Widerstand – Infanterie',
    buff: '+10% Fähigkeits-Widerstand der Infanterie',
  },
  'b57d6bf9:node_23': {
    name: 'Kampffertigkeits-Widerstand – Kavallerie',
    buff: '+10% Fähigkeits-Widerstand der Kavallerie',
  },
  'b57d6bf9:node_24': {
    name: 'Kampffertigkeits-Widerstand – Bogenschützen',
    buff: '+10% Fähigkeits-Widerstand der Bogenschützen',
  },
  'b57d6bf9:node_25': {
    name: 'Vorhutgeist – Infanterie',
    buff: '+5% Infanterie-HP',
  },
  'b57d6bf9:node_26': {
    name: 'Vorhutgeist – Kavallerie',
    buff: '+5% Kavallerie-HP',
  },
  'b57d6bf9:node_27': {
    name: 'Vorhutgeist – Bogenschützen',
    buff: '+5% Bogenschützen-HP',
  },
  'b57d6bf9:node_28': {
    name: 'Totaler Vorstoß',
    buff: '+5% Belagerungskraft aller Soldaten',
  },
  'b57d6bf9:node_29': {
    name: 'Formationsmeisterschaft',
    buff: '+5% HP der Belagerungsangreifer',
  },
  'b57d6bf9:node_30': {
    name: 'Gepanzerter Ansturm',
    buff: '+5% Verursachter Schaden',
  },
});

export default Object.freeze({ trees, nodes });
