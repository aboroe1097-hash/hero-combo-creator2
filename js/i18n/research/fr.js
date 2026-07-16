// Explicit, reviewed French gaming copy for the Research tool.
// Canonical tree/node IDs remain stable; formulas and saved progress stay in tech-db.js.
const trees = Object.freeze({
  d1956263: {
    name: 'Production rapide',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources uniquement',
    pages: [],
  },
  b2691f74: {
    name: 'Développement de la cité',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources uniquement',
    pages: [],
  },
  '375d1626': {
    name: 'Combat de base',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Médailles de courage',
    pages: [],
  },
  '4a932eb0': {
    name: 'Fabrication d’équipement',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources',
    pages: [],
  },
  '802e7893': {
    name: 'Recherche de légion I',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources',
    pages: [],
  },
  '38d12254': {
    name: 'Recherche de légion II',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources',
    pages: [],
  },
  '5fef2163': {
    name: 'Recherche de légion III',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources',
    pages: [],
  },
  cc2c9ee1: {
    name: 'Recherche de légion de classe',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources',
    pages: [],
  },
  '3929cbb9': {
    name: 'Infrastructures médicales améliorées',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources',
    pages: [],
  },
  f915a84b: {
    name: 'Formation militaire de base',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Ressources',
    pages: [],
  },
  footmen_training: {
    name: 'Entraînement des fantassins',
    unlockCondition:
      'Institut niv. 24, Château niv. 25, Caserne niv. 25, Commémoration et conflit de zone à 100 %',
    primaryResource: 'Médailles de courage',
    pages: [],
  },
  archers_training: {
    name: 'Entraînement des archers',
    unlockCondition:
      'Institut niv. 24, Château niv. 25, Camp d’archers niv. 25, Commémoration et conflit de zone à 100 %',
    primaryResource: 'Médailles de courage',
    pages: [],
  },
  cavalry_training: {
    name: 'Entraînement de la cavalerie',
    unlockCondition:
      'Institut niv. 24, Château niv. 25, Écurie niv. 25, Commémoration et conflit de zone à 100 %',
    primaryResource: 'Médailles de courage',
    pages: [],
  },
  f0595b07: {
    name: 'Commémoration de zone',
    unlockCondition: 'Après la première bataille du trône',
    primaryResource: 'Médailles de courage',
    pages: [],
  },
  zone_conflict: {
    name: 'Conflit de zone',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Médailles de courage',
    pages: [],
  },
  '1a6ec06e': {
    name: 'Maîtrise de la guerre',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Médailles de courage',
    pages: ['Destruction', 'Combat de siège', 'Marquage et capture'],
  },
  city_defence: {
    name: 'Maîtrise de la défense urbaine',
    unlockCondition: 'Aucune condition',
    primaryResource: 'Médailles de courage',
    pages: ['Fortification', 'Renforts', 'Tours et siège'],
  },
  defence_legion: {
    name: 'Recherche de la légion défensive',
    unlockCondition: 'Terminer « Tous unis » dans Défense urbaine',
    primaryResource: 'Médailles de courage',
    pages: [],
  },
  e8704053: {
    name: 'Entraînement avancé des soldats',
    unlockCondition: 'Début de RoC S1',
    primaryResource: 'Médailles de courage',
    pages: ['Troupes renforcées', 'Entraînement', 'Avancé'],
  },
  b3581c97: {
    name: 'Gardes impériaux',
    unlockCondition: 'Début de RoC S2',
    primaryResource: 'Médailles de courage',
    pages: [],
  },
  '2b149bcb': {
    name: 'Ralliement de la garde',
    unlockCondition: 'Début de RoC S2 + Château 30 + Institut 30',
    primaryResource: 'Médailles de courage',
    pages: ['Bases de la garde', 'Tactique', 'Capacité de ralliement'],
  },
  '3f5ebb34': {
    name: 'Art de la guerre — Raid',
    unlockCondition: 'Début d’Eden S3',
    primaryResource: 'Médailles doubles',
    pages: ['Forces armées', 'Siège', 'Insignes de guerre'],
  },
  '3ff71437': {
    name: 'Art de la guerre — Défense',
    unlockCondition: 'Début d’Eden S3',
    primaryResource: 'Médailles doubles',
    pages: ['Tenir la ligne', 'Ordres de siège', 'Insignes de guerre'],
  },
  art_of_war_command: {
    name: 'Art de la guerre — Commandement',
    unlockCondition: 'Début d’Eden SX1',
    primaryResource: 'Médailles doubles',
    pages: ['Ruse et loyauté', 'Frappe intrépide', 'Commandement'],
  },
  '77db4a78': {
    name: 'Guerrier d’élite',
    unlockCondition: 'Début d’Eden S4',
    primaryResource: 'Insignes de guerre',
    pages: [],
  },
  '24ffc526': {
    name: 'Légion de pillards',
    unlockCondition: 'Début d’Eden S4',
    primaryResource: 'Médailles doubles',
    pages: ['Première ligne', 'Ligne centrale', 'Ligne arrière'],
  },
  '2c49bd2a': {
    name: 'Tactiques solides',
    unlockCondition: 'Début d’Eden SX1',
    primaryResource: 'Insignes de guerre',
    pages: [
      'Attaque de siège',
      'Défense de siège',
      'Combat en rase campagne',
      'Puissance des troupes',
      'Entraînement rapide',
      'Avancé',
    ],
  },
  fc190e81: {
    name: 'Bénédiction du sang de dragon',
    unlockCondition: 'Début d’Eden SX2 + Légion de pillards terminée',
    primaryResource: 'Insignes de guerre',
    pages: ['Fondamentaux', 'Postures', 'Puissance du dragon'],
  },
  '19ae0569': {
    name: 'Légion d’élite',
    unlockCondition: 'Début d’Eden X8',
    primaryResource: 'Insignes de guerre',
    pages: ['Légion d’élite'],
  },
});

const nodes = Object.freeze({
  'd1956263:node_1': {
    name: 'Croissance rapide',
    buff: 'Débloque la production rapide de la ferme',
  },
  'd1956263:node_2': {
    name: 'Distillation intensive',
    buff: 'Débloque la production rapide de la distillerie',
  },
  'd1956263:node_3': {
    name: 'Déboisement',
    buff: 'Débloque la production rapide de la scierie',
  },
  'd1956263:node_4': {
    name: 'Combustion rapide',
    buff: 'Débloque la production rapide de l’atelier de charbon',
  },
  'd1956263:node_5': {
    name: 'Terrassement',
    buff: 'Débloque la production rapide de la carrière',
  },
  'd1956263:node_6': {
    name: 'Fonte rapide',
    buff: 'Débloque la production rapide de la mine de fer',
  },
  'd1956263:node_7': {
    name: 'Mobilisation des ouvriers',
    buff: 'Rétablit le taux de réussite de la production rapide après l’amélioration d’un bâtiment',
  },
  'd1956263:node_8': {
    name: 'Croissance effrénée',
    buff: '+5 % de rendement de production rapide de la ferme par niveau',
  },
  'd1956263:node_9': {
    name: 'Levure active',
    buff: '+5 % de rendement de production rapide de la distillerie par niveau',
  },
  'd1956263:node_10': {
    name: 'Abattage intégral',
    buff: '+5 % de rendement de production rapide de la scierie par niveau',
  },
  'd1956263:node_11': {
    name: 'Stockage au sec',
    buff: '+5 % de rendement de production rapide de l’atelier de charbon par niveau',
  },
  'd1956263:node_12': {
    name: 'Exploitation intégrale de la pierre',
    buff: '+5 % de rendement de production rapide de la carrière par niveau',
  },
  'd1956263:node_13': {
    name: 'Métallurgie',
    buff: '+5 % de rendement de production rapide de la mine de fer par niveau',
  },
  'd1956263:node_14': {
    name: 'Volonté et méthode',
    buff: 'La première production rapide quotidienne réussit toujours',
  },
  'd1956263:node_15': {
    name: 'Stabilité renforcée',
    buff: '+2 % de taux de réussite de la production rapide par niveau',
  },
  'b2691f74:node_1': {
    name: 'Engrais',
    buff: '+3 % rendement de nourriture par niveau',
  },
  'b2691f74:node_2': {
    name: 'Sucre raffiné',
    buff: '+3 % rendement de bière par niveau',
  },
  'b2691f74:node_3': {
    name: 'Coupe rase I',
    buff: '+3 % rendement de bois par niveau',
  },
  'b2691f74:node_4': {
    name: 'Traitement du charbon',
    buff: '+3 % rendement de charbon par niveau',
  },
  'b2691f74:node_5': {
    name: 'Maçonnerie',
    buff: '+3 % rendement de marbre par niveau',
  },
  'b2691f74:node_6': {
    name: 'Four à haute température I',
    buff: '+3 % rendement de fer par niveau',
  },
  'b2691f74:node_7': {
    name: 'Main de Midas',
    buff: '+3 % rendement d’or par niveau',
  },
  'b2691f74:node_8': {
    name: 'Distribution rapide I',
    buff: '+3 % de vitesse de récolte de nourriture par niveau',
  },
  'b2691f74:node_9': {
    name: 'Hache de bûcheron affûtée I',
    buff: '+3 % de vitesse de récolte de bois par niveau',
  },
  'b2691f74:node_10': {
    name: 'Extraction optimisée',
    buff: '+3 % de vitesse de récolte de marbre par niveau',
  },
  'b2691f74:node_11': {
    name: 'Raffinage des alliages I',
    buff: '+3 % de vitesse de récolte de fer par niveau',
  },
  'b2691f74:node_12': {
    name: 'Raffinage des gemmes I',
    buff: '+3 % de vitesse de récolte de gemmes par niveau',
  },
  'b2691f74:node_13': {
    name: 'Extension du stockage I',
    buff: 'Capacité maximale de stockage des ressources +90k par niveau',
  },
  'b2691f74:node_14': {
    name: 'Génie civil I',
    buff: '+1 % de vitesse de construction par niveau',
  },
  '375d1626:node_1': {
    name: 'Reconnaissance du courage',
    buff: 'Chance d’obtenir une médaille de courage sur les maraudeurs',
  },
  '375d1626:node_2': {
    name: 'Promotion des fantassins I',
    buff: 'Les fantassins T1-3 peuvent être promus',
  },
  '375d1626:node_3': {
    name: 'Promotion des archers I',
    buff: 'Les archers T1-3 peuvent être promus',
  },
  '375d1626:node_4': {
    name: 'Promotion de la cavalerie I',
    buff: 'La cavalerie T1-3 peut être promue',
  },
  '375d1626:node_5': {
    name: 'Pour le peuple',
    buff: 'Ressources obtenues en battant des maraudeurs',
  },
  '375d1626:node_6': {
    name: 'Chasseur de rebelles novice',
    buff: 'Puissance contre niv. 1-5 maraudeurs',
  },
  '375d1626:node_7': {
    name: 'Défenseur de l’empire novice',
    buff: 'Résistance contre niv. 1-5 maraudeurs',
  },
  '375d1626:node_8': {
    name: 'Promotion des fantassins II',
    buff: 'Les fantassins T4-6 peuvent être promus',
  },
  '375d1626:node_9': {
    name: 'Promotion des archers II',
    buff: 'Les archers T4-6 peuvent être promus',
  },
  '375d1626:node_10': {
    name: 'Promotion de la cavalerie II',
    buff: 'La cavalerie T4-6 peut être promue',
  },
  '375d1626:node_11': {
    name: 'Entraînement des héros',
    buff: 'EXP de héros obtenue sur les maraudeurs',
  },
  '375d1626:node_12': {
    name: 'Chasseur de rebelles confirmé',
    buff: 'Puissance contre niv. 6-10 maraudeurs',
  },
  '375d1626:node_13': {
    name: 'Défenseur de l’empire confirmé',
    buff: 'Résistance contre niv. 6-10 maraudeurs',
  },
  '375d1626:node_14': {
    name: 'Premiers secours au front',
    buff: 'Réduit le taux de blessés contre les maraudeurs',
  },
  '375d1626:node_15': {
    name: 'Chasseur de rebelles avancé',
    buff: 'Puissance contre niv. 11-15 maraudeurs',
  },
  '375d1626:node_16': {
    name: 'Défenseur de l’empire avancé',
    buff: 'Résistance contre niv. 11-15 maraudeurs',
  },
  '4a932eb0:node_1': {
    name: 'Extension de la fonderie',
    buff: 'Débloque le premier emplacement de fabrication de matériaux',
  },
  '4a932eb0:node_2': {
    name: 'Raffinage de base',
    buff: 'Augmente la vitesse de production',
  },
  '4a932eb0:node_3': {
    name: 'Traitement de base',
    buff: 'Augmente la vitesse de fabrication des matériaux',
  },
  '4a932eb0:node_4': {
    name: 'Extension de la fonderie',
    buff: 'Débloque le deuxième emplacement de fabrication de matériaux',
  },
  '4a932eb0:node_5': {
    name: 'Raffinage de base',
    buff: 'Augmente la vitesse de production',
  },
  '4a932eb0:node_6': {
    name: 'Traitement de base',
    buff: 'Augmente la vitesse de fabrication des matériaux',
  },
  '4a932eb0:node_7': {
    name: 'Extension de la fonderie',
    buff: 'Débloque le troisième emplacement de fabrication de matériaux',
  },
  '4a932eb0:node_8': {
    name: 'Fabrication d’armes',
    buff: 'Augmente la vitesse de fabrication des armes',
  },
  '4a932eb0:node_9': {
    name: 'Fabrication de casques',
    buff: 'Augmente la vitesse de fabrication des casques',
  },
  '4a932eb0:node_10': {
    name: 'Armurier',
    buff: 'Augmente la vitesse de fabrication des armures',
  },
  '4a932eb0:node_11': {
    name: 'Cordonnier',
    buff: 'Augmente la vitesse de fabrication des bottes',
  },
  '4a932eb0:node_12': {
    name: 'Joaillier',
    buff: 'Augmente la vitesse de fabrication des amulettes',
  },
  '4a932eb0:node_13': {
    name: 'Fabrication d’accessoires',
    buff: 'Augmente la vitesse de fabrication des accessoires',
  },
  '4a932eb0:node_14': {
    name: 'Extension de l’atelier',
    buff: 'Débloque un atelier de dragonites supplémentaire',
  },
  '4a932eb0:node_15': {
    name: 'Raffinage de base',
    buff: 'Augmente la vitesse de production',
  },
  '4a932eb0:node_16': {
    name: 'Traitement de base',
    buff: 'Augmente la vitesse de fabrication des matériaux',
  },
  '4a932eb0:node_17': {
    name: 'Extension de la fonderie',
    buff: 'Débloque le quatrième emplacement de fabrication de matériaux',
  },
  '4a932eb0:node_18': {
    name: 'Fonderie d’armes',
    buff: 'Réduit le coût en dragonites de la forge d’armes',
  },
  '4a932eb0:node_19': {
    name: 'Fonderie de casques',
    buff: 'Réduit le coût en dragonites de la forge de casques',
  },
  '4a932eb0:node_20': {
    name: 'Fonderie d’armures',
    buff: 'Réduit le coût en dragonites de la forge d’armures',
  },
  '4a932eb0:node_21': {
    name: 'Fonderie de bottes',
    buff: 'Réduit le coût en dragonites de la forge de bottes',
  },
  '4a932eb0:node_22': {
    name: 'Fonderie d’amulettes',
    buff: 'Réduit le coût en dragonites de la forge d’amulettes',
  },
  '4a932eb0:node_23': {
    name: 'Fonderie d’accessoires',
    buff: 'Réduit le coût en dragonites de la forge d’accessoires',
  },
  '4a932eb0:node_24': {
    name: 'Extension de la fonderie',
    buff: 'Débloque le cinquième emplacement de fabrication de matériaux',
  },
  '4a932eb0:node_25': {
    name: 'Nouveaux matériaux',
    buff: 'Débloque la fabrication de matériaux verts',
  },
  '4a932eb0:node_26': {
    name: 'Recyclage des matériaux',
    buff: 'Permet de désenchanter les matériaux en dragonites',
  },
  '4a932eb0:node_27': {
    name: 'Recyclage en série',
    buff: 'Augmente les dragonites obtenues par désenchantement',
  },
  '4a932eb0:node_28': {
    name: 'Recyclage expert',
    buff: 'Augmente les matériaux récupérés lors du démontage d’équipement',
  },
  '802e7893:node_1': {
    name: 'Affectation d’un héros',
    buff: 'Débloque la première ligne de la légion I',
  },
  '802e7893:node_2': {
    name: 'Récolte accélérée',
    buff: '+25 % de vitesse de récolte de la légion I',
    effects: ['Vitesse de récolte de la légion I'],
  },
  '802e7893:node_3': {
    name: 'Condition physique renforcée',
    buff: '+25 % capacité de transport de la légion I',
    effects: ['Capacité de transport de la légion I'],
  },
  '802e7893:node_4': {
    name: 'Immunité des fantassins',
    buff: '+35 % de résistance des fantassins de la légion I',
    effects: ['Résistance des fantassins de la légion I'],
  },
  '802e7893:node_5': {
    name: 'Immunité des archers',
    buff: '+35 % de résistance des archers de la légion I',
    effects: ['Résistance des archers de la légion I'],
  },
  '802e7893:node_6': {
    name: 'Immunité de la cavalerie',
    buff: '+35 % de résistance de la cavalerie de la légion I',
    effects: ['Résistance de la cavalerie de la légion I'],
  },
  '802e7893:node_7': {
    name: 'Bannière de commandement',
    buff: 'Débloque l’accélération de la légion I',
  },
  '802e7893:node_8': {
    name: 'Coopération des héros',
    buff: 'Débloque la ligne centrale de la légion I',
  },
  '802e7893:node_9': {
    name: 'Ordre de rappel',
    buff: 'Débloque le rappel de la légion I',
  },
  '802e7893:node_10': {
    name: 'Fer à cheval en alliage',
    buff: '+25 % de vitesse de marche de la légion I',
    effects: ['Vitesse de marche de la légion I'],
  },
  '802e7893:node_11': {
    name: 'Unité de ravitaillement',
    buff: '+35 % de vitesse de récupération de durabilité de la légion I',
    effects: ['Vitesse de récupération de durabilité de la légion I'],
  },
  '802e7893:node_12': {
    name: 'Assaut des fantassins',
    buff: '+35 % de puissance des fantassins de la légion I',
    effects: ['Puissance des fantassins de la légion I'],
  },
  '802e7893:node_13': {
    name: 'Assaut des archers',
    buff: '+35 % de puissance des archers de la légion I',
    effects: ['Puissance des archers de la légion I'],
  },
  '802e7893:node_14': {
    name: 'Assaut de la cavalerie',
    buff: '+35 % de puissance de la cavalerie de la légion I',
    effects: ['Puissance de la cavalerie de la légion I'],
  },
  '802e7893:node_15': {
    name: 'Commandement des héros',
    buff: 'Débloque la ligne arrière de la légion I',
  },
  '38d12254:node_1': {
    name: 'Affectation d’un héros',
    buff: 'Débloque la première ligne de la légion II',
  },
  '38d12254:node_2': {
    name: 'Récolte accélérée',
    buff: '+25 % de vitesse de récolte de la légion II',
    effects: ['Vitesse de récolte de la légion II'],
  },
  '38d12254:node_3': {
    name: 'Condition physique renforcée',
    buff: '+25 % capacité de transport de la légion II',
    effects: ['Capacité de transport de la légion II'],
  },
  '38d12254:node_4': {
    name: 'Immunité des fantassins',
    buff: '+35 % de résistance des fantassins de la légion II',
    effects: ['Résistance des fantassins de la légion II'],
  },
  '38d12254:node_5': {
    name: 'Immunité des archers',
    buff: '+35 % de résistance des archers de la légion II',
    effects: ['Résistance des archers de la légion II'],
  },
  '38d12254:node_6': {
    name: 'Immunité de la cavalerie',
    buff: '+35 % de résistance de la cavalerie de la légion II',
    effects: ['Résistance de la cavalerie de la légion II'],
  },
  '38d12254:node_7': {
    name: 'Bannière de commandement',
    buff: 'Débloque l’accélération de la légion II',
  },
  '38d12254:node_8': {
    name: 'Coopération des héros',
    buff: 'Débloque la ligne centrale de la légion II',
  },
  '38d12254:node_9': {
    name: 'Ordre de rappel',
    buff: 'Débloque le rappel de la légion II',
  },
  '38d12254:node_10': {
    name: 'Fer à cheval en alliage',
    buff: '+25 % de vitesse de marche de la légion II',
    effects: ['Vitesse de marche de la légion II'],
  },
  '38d12254:node_11': {
    name: 'Unité de ravitaillement',
    buff: '+35 % de vitesse de récupération de durabilité de la légion II',
    effects: ['Vitesse de récupération de durabilité de la légion II'],
  },
  '38d12254:node_12': {
    name: 'Assaut des fantassins',
    buff: '+35 % de puissance des fantassins de la légion II',
    effects: ['Puissance des fantassins de la légion II'],
  },
  '38d12254:node_13': {
    name: 'Assaut des archers',
    buff: '+35 % de puissance des archers de la légion II',
    effects: ['Puissance des archers de la légion II'],
  },
  '38d12254:node_14': {
    name: 'Assaut de la cavalerie',
    buff: '+35 % de puissance de la cavalerie de la légion II',
    effects: ['Puissance de la cavalerie de la légion II'],
  },
  '38d12254:node_15': {
    name: 'Commandement des héros',
    buff: 'Débloque la ligne arrière de la légion II',
  },
  '5fef2163:node_1': {
    name: 'Affectation d’un héros',
    buff: 'Débloque la première ligne de la légion III',
  },
  '5fef2163:node_2': {
    name: 'Récolte accélérée',
    buff: '+25 % de vitesse de récolte de la légion III',
    effects: ['Vitesse de récolte de la légion III'],
  },
  '5fef2163:node_3': {
    name: 'Condition physique renforcée',
    buff: '+25 % capacité de transport de la légion III',
    effects: ['Capacité de transport de la légion III'],
  },
  '5fef2163:node_4': {
    name: 'Immunité des fantassins',
    buff: '+35 % de résistance des fantassins de la légion III',
    effects: ['Résistance des fantassins de la légion III'],
  },
  '5fef2163:node_5': {
    name: 'Immunité des archers',
    buff: '+35 % de résistance des archers de la légion III',
    effects: ['Résistance des archers de la légion III'],
  },
  '5fef2163:node_6': {
    name: 'Immunité de la cavalerie',
    buff: '+35 % de résistance de la cavalerie de la légion III',
    effects: ['Résistance de la cavalerie de la légion III'],
  },
  '5fef2163:node_7': {
    name: 'Bannière de commandement',
    buff: 'Débloque l’accélération de la légion III',
  },
  '5fef2163:node_8': {
    name: 'Coopération des héros',
    buff: 'Débloque la ligne centrale de la légion III',
  },
  '5fef2163:node_9': {
    name: 'Ordre de rappel',
    buff: 'Débloque le rappel de la légion III',
  },
  '5fef2163:node_10': {
    name: 'Fer à cheval en alliage',
    buff: '+25 % de vitesse de marche de la légion III',
    effects: ['Vitesse de marche de la légion III'],
  },
  '5fef2163:node_11': {
    name: 'Unité de ravitaillement',
    buff: '+35 % de vitesse de récupération de durabilité de la légion III',
    effects: ['Vitesse de récupération de durabilité de la légion III'],
  },
  '5fef2163:node_12': {
    name: 'Assaut des fantassins',
    buff: '+35 % de puissance des fantassins de la légion III',
    effects: ['Puissance des fantassins de la légion III'],
  },
  '5fef2163:node_13': {
    name: 'Assaut des archers',
    buff: '+35 % de puissance des archers de la légion III',
    effects: ['Puissance des archers de la légion III'],
  },
  '5fef2163:node_14': {
    name: 'Assaut de la cavalerie',
    buff: '+35 % de puissance de la cavalerie de la légion III',
    effects: ['Puissance de la cavalerie de la légion III'],
  },
  '5fef2163:node_15': {
    name: 'Commandement des héros',
    buff: 'Débloque la ligne arrière de la légion III',
  },
  'cc2c9ee1:node_1': {
    name: 'Affectation d’un héros',
    buff: 'Déploie 1 héros',
  },
  'cc2c9ee1:node_2': {
    name: 'Récolte accélérée',
    buff: 'Vitesse de récolte',
  },
  'cc2c9ee1:node_3': {
    name: 'Condition physique renforcée',
    buff: 'Capacité de transport',
  },
  'cc2c9ee1:node_4': {
    name: 'Immunité des fantassins',
    buff: 'Résistance',
  },
  'cc2c9ee1:node_5': {
    name: 'Immunité de la cavalerie',
    buff: 'Résistance',
  },
  'cc2c9ee1:node_6': {
    name: 'Immunité des archers',
    buff: 'Résistance',
  },
  'cc2c9ee1:node_7': {
    name: 'Bannière de commandement',
    buff: 'Accélération',
  },
  'cc2c9ee1:node_8': {
    name: 'Coopération des héros',
    buff: 'Déploie 2 héros',
  },
  'cc2c9ee1:node_9': {
    name: 'Ordre de rappel',
    buff: 'Rappel',
  },
  'cc2c9ee1:node_10': {
    name: 'Fer à cheval en alliage',
    buff: 'Vitesse de marche',
  },
  'cc2c9ee1:node_11': {
    name: 'Unité de ravitaillement',
    buff: 'Taux de récupération d’endurance',
  },
  'cc2c9ee1:node_12': {
    name: 'Assaut des fantassins',
    buff: 'Puissance',
  },
  'cc2c9ee1:node_13': {
    name: 'Assaut des archers',
    buff: 'Puissance',
  },
  'cc2c9ee1:node_14': {
    name: 'Assaut de la cavalerie',
    buff: 'Puissance',
  },
  'cc2c9ee1:node_15': {
    name: 'Commandement des héros',
    buff: 'Déploie 3 héros',
  },
  '3929cbb9:node_1': {
    name: 'Soins des fantassins',
    buff: 'Coût des soins des fantassins',
  },
  '3929cbb9:node_2': {
    name: 'Soins des archers',
    buff: 'Coût des soins des archers',
  },
  '3929cbb9:node_3': {
    name: 'Soins de la cavalerie',
    buff: 'Coût des soins de la cavalerie',
  },
  '3929cbb9:node_4': {
    name: 'Lit d’appoint',
    buff: 'Capacité de blessés du château',
  },
  '3929cbb9:node_5': {
    name: 'Premiers secours des fantassins',
    buff: 'Vitesse de soin des fantassins',
  },
  '3929cbb9:node_6': {
    name: 'Premiers secours des archers',
    buff: 'Vitesse de soin des archers',
  },
  '3929cbb9:node_7': {
    name: 'Vétérinaire',
    buff: 'Vitesse de soin de la cavalerie',
  },
  '3929cbb9:node_8': {
    name: 'Hôpital de l’église',
    buff: 'Tente médicale supplémentaire',
  },
  '3929cbb9:node_9': {
    name: 'Infrastructures médicales I',
    buff: 'Capacité de blessés du château',
  },
  '3929cbb9:node_10': {
    name: 'Sanctuaire',
    buff: 'Capacité excédentaire de blessés',
  },
  '3929cbb9:node_11': {
    name: 'Soins intensifs',
    buff: 'Réduit le taux de pertes lors d’un siège en solo',
  },
  'f915a84b:node_1': {
    name: 'Recrutement des fantassins',
    buff: 'Vitesse d’entraînement des fantassins',
  },
  'f915a84b:node_2': {
    name: 'Recrutement des archers',
    buff: 'Vitesse d’entraînement des archers',
  },
  'f915a84b:node_3': {
    name: 'Recrutement de la cavalerie',
    buff: 'Vitesse d’entraînement de la cavalerie',
  },
  'f915a84b:node_4': {
    name: 'Conscription',
    buff: 'Campement supplémentaire',
  },
  'f915a84b:node_5': {
    name: 'Recrutement des fantassins',
    buff: 'Vitesse d’entraînement des fantassins',
  },
  'f915a84b:node_6': {
    name: 'Recrutement des archers',
    buff: 'Vitesse d’entraînement des archers',
  },
  'f915a84b:node_7': {
    name: 'Recrutement de la cavalerie',
    buff: 'Vitesse d’entraînement de la cavalerie',
  },
  'f915a84b:node_8': {
    name: 'Armure intégrale en métal',
    buff: 'PV',
  },
  'f915a84b:node_9': {
    name: 'Caserne',
    buff: 'Nombre de fantassins entraînés',
  },
  'f915a84b:node_10': {
    name: 'Camp d’archers',
    buff: 'Nombre d’archers entraînés',
  },
  'f915a84b:node_11': {
    name: 'Camp d’entraînement de cavalerie',
    buff: 'Nombre de cavaliers entraînés',
  },
  'f915a84b:node_12': {
    name: 'Armes mortelles',
    buff: 'Taux de pertes ennemies après une victoire de siège en solo',
  },
  'footmen_training:node_1': {
    name: 'Frappe puissante',
    buff: '10 % de puissance',
  },
  'footmen_training:node_2': {
    name: 'Armure de maître',
    buff: '10 % de résistance',
  },
  'footmen_training:node_3': {
    name: 'Bouclier de maître',
    buff: '10 % de contre des fantassins face à la cavalerie',
  },
  'footmen_training:node_4': {
    name: 'Boucliers renforcés',
    buff: '100 % de capacité de transport des fantassins',
  },
  'footmen_training:node_5': {
    name: 'Tenir sa position',
    buff: '100 % de vitesse de marche des fantassins',
  },
  'footmen_training:node_6': {
    name: 'Maîtrise du bouclier',
    buff: '10 % de contre des fantassins face aux archers',
  },
  'footmen_training:node_7': {
    name: 'Frappe puissante',
    buff: '20 % de puissance',
  },
  'footmen_training:node_8': {
    name: 'Armure de maître',
    buff: '20 % de résistance',
  },
  'footmen_training:node_9': {
    name: 'Renforcement des fantassins',
    buff: 'Renforce les fantassins',
  },
  'footmen_training:node_10': {
    name: 'Recrutement des fantassins',
    buff: '-15 % de coût d’entraînement',
  },
  'footmen_training:node_11': {
    name: 'Conscription des fantassins',
    buff: '+16500 troupes supplémentaires par promotion',
  },
  'footmen_training:node_12': {
    name: 'Bouclier royal',
    buff: '10 % de contre des fantassins face aux archers',
  },
  'footmen_training:node_13': {
    name: 'Promotion des fantassins III',
    buff: 'Promouvoir T7 à T9',
  },
  'footmen_training:node_14': {
    name: 'Espadon',
    buff: '30 % de puissance en défense de siège',
  },
  'footmen_training:node_15': {
    name: 'Cotte de mailles',
    buff: '30 % de résistance',
  },
  'footmen_training:node_16': {
    name: 'Défenseur de l’empire — Fantassins',
    buff: 'Débloque T9',
  },
  'archers_training:node_1': {
    name: 'Flèche renforcée',
    buff: '10 % de puissance',
  },
  'archers_training:node_2': {
    name: 'Brassard renforcé',
    buff: '10 % de résistance',
  },
  'archers_training:node_3': {
    name: 'Point faible ciblé',
    buff: '10 % de contre des archers face à la cavalerie',
  },
  'archers_training:node_4': {
    name: 'Tir concentré',
    buff: '100 % de capacité de transport des archers',
  },
  'archers_training:node_5': {
    name: 'Armure en peau de dragon',
    buff: '100 % de vitesse de marche des archers',
  },
  'archers_training:node_6': {
    name: 'Visée mortelle',
    buff: '10 % de contre des archers face aux fantassins',
  },
  'archers_training:node_7': {
    name: 'Flèche renforcée',
    buff: '20 % de puissance',
  },
  'archers_training:node_8': {
    name: 'Brassard d’ébène',
    buff: '20 % de résistance',
  },
  'archers_training:node_9': {
    name: 'Renforcement des archers',
    buff: 'Renforce les archers',
  },
  'archers_training:node_10': {
    name: 'Recrutement des archers',
    buff: '-15 % de coût d’entraînement',
  },
  'archers_training:node_11': {
    name: 'Conscription des archers',
    buff: '+16500 troupes supplémentaires par promotion',
  },
  'archers_training:node_12': {
    name: 'Chasse',
    buff: '10 % de contre des archers face aux fantassins',
  },
  'archers_training:node_13': {
    name: 'Promotion des archers III',
    buff: 'Promouvoir T7 à T9',
  },
  'archers_training:node_14': {
    name: 'Pluie de flèches',
    buff: '30 % de puissance de siège',
  },
  'archers_training:node_15': {
    name: 'Pointe de flèche empoisonnée',
    buff: '30 % de puissance',
  },
  'archers_training:node_16': {
    name: 'Déblocage des archers T9',
    buff: 'Débloque T9',
  },
  'cavalry_training:node_1': {
    name: 'Charge ardente',
    buff: '10 % de puissance',
  },
  'cavalry_training:node_2': {
    name: 'Barde renforcée',
    buff: '10 % de résistance',
  },
  'cavalry_training:node_3': {
    name: 'Hérisson mobile',
    buff: '10 % de contre de la cavalerie face aux fantassins',
  },
  'cavalry_training:node_4': {
    name: 'Chariot de transport',
    buff: '100 % de capacité de transport de la cavalerie',
  },
  'cavalry_training:node_5': {
    name: 'Montures de pur-sang',
    buff: '100 % de vitesse de marche de la cavalerie',
  },
  'cavalry_training:node_6': {
    name: 'Assaut implacable',
    buff: '10 % de contre de la cavalerie face aux archers',
  },
  'cavalry_training:node_7': {
    name: 'Charge féroce',
    buff: '20 % de puissance',
  },
  'cavalry_training:node_8': {
    name: 'Barde renforcée',
    buff: '20 % de résistance',
  },
  'cavalry_training:node_9': {
    name: 'Renforcement de la cavalerie',
    buff: 'Renforce la cavalerie',
  },
  'cavalry_training:node_10': {
    name: 'Recrutement de la cavalerie',
    buff: '-15 % de coût d’entraînement',
  },
  'cavalry_training:node_11': {
    name: 'Écuyage',
    buff: '+16500 troupes supplémentaires par promotion',
  },
  'cavalry_training:node_12': {
    name: 'Sentier de guerre',
    buff: '10 % de contre de la cavalerie face aux archers',
  },
  'cavalry_training:node_13': {
    name: 'Promotion de la cavalerie III',
    buff: 'Promouvoir T7 à T9',
  },
  'cavalry_training:node_14': {
    name: 'Escarmouche en plaine',
    buff: '30 % de puissance',
  },
  'cavalry_training:node_15': {
    name: 'Barde d’ébène',
    buff: '30 % de résistance',
  },
  'cavalry_training:node_16': {
    name: 'Défenseur de l’empire — Cavalerie',
    buff: 'Débloque T9',
  },
  'f0595b07:node_1': {
    name: 'Production à grande échelle',
    buff: 'Vitesse de récolte',
  },
  'f0595b07:node_2': {
    name: 'Force expéditionnaire',
    buff: 'Quantité de ressources récoltées',
  },
  'f0595b07:node_3': {
    name: 'Récompenses avancées',
    buff: 'Débloque les récompenses niv. 4-6',
  },
  'f0595b07:node_4': {
    name: 'Expert en armement',
    buff: 'Tous les points obtenus',
  },
  'f0595b07:node_5': {
    name: 'Nettoyage rapide',
    buff: 'Vitesse de marche contre les maraudeurs',
  },
  'f0595b07:node_6': {
    name: 'Entraînement de préparation au combat',
    buff: 'Vitesse d’entraînement',
  },
  'f0595b07:node_7': {
    name: 'Capacité de transport accrue',
    buff: 'Capacité de transport',
  },
  'f0595b07:node_8': {
    name: 'Capacité de préparation au combat',
    buff: 'Capacité d’entraînement',
  },
  'f0595b07:node_9': {
    name: 'Super récompenses',
    buff: 'Débloque les récompenses niv. 7-9',
  },
  'f0595b07:node_10': {
    name: 'Bonus — récolte',
    buff: 'Points de récolte',
  },
  'f0595b07:node_11': {
    name: 'Bonus — élimination maraudeurs',
    buff: 'Points obtenus en attaquant les maraudeurs',
  },
  'f0595b07:node_12': {
    name: 'Bonus — construction',
    buff: 'Points de construction',
  },
  'f0595b07:node_13': {
    name: 'Inspiration: sagesse',
    buff: 'Points obtenus grâce aux insignes de guerre',
  },
  'f0595b07:node_14': {
    name: 'Bonus — Recherche technologique',
    buff: 'Points de recherche technologique',
  },
  'f0595b07:node_15': {
    name: 'Inspiration: croissance',
    buff: 'Score obtenu en améliorant les héros',
  },
  'f0595b07:node_16': {
    name: 'Bonus — élimination ennemis',
    buff: 'Points obtenus en éliminant des ennemis',
  },
  'f0595b07:node_17': {
    name: 'Inspiration: recrutement',
    buff: 'Points de recrutement',
  },
  'f0595b07:node_18': {
    name: 'Expert en armement',
    buff: 'Tous les points obtenus',
  },
  'f0595b07:node_19': {
    name: 'Une récompense de plus !',
    buff: 'Récompenses doublées',
  },
  'zone_conflict:node_1': {
    name: 'Sécurité médicale',
    buff: 'Sécurité médicale',
  },
  'zone_conflict:node_2': {
    name: 'Dernier rempart',
    buff: 'Dernier rempart',
  },
  'zone_conflict:node_3': {
    name: 'Soif de combat',
    buff: 'Soif de combat',
  },
  'zone_conflict:node_4': {
    name: 'Construction de remparts',
    buff: 'Construction de remparts',
  },
  'zone_conflict:node_5': {
    name: 'Fortifications temporaires',
    buff: 'Fortifications temporaires',
  },
  'zone_conflict:node_6': {
    name: 'Défenseurs de la paix',
    buff: 'Défenseurs de la paix',
  },
  'zone_conflict:node_7': {
    name: 'Endurance en campagne',
    buff: 'Endurance en campagne',
  },
  'zone_conflict:node_8': {
    name: 'Sécurité médicale',
    buff: 'Sécurité II',
  },
  'zone_conflict:node_9': {
    name: 'Front uni',
    buff: 'Front uni: soins',
  },
  'zone_conflict:node_10': {
    name: 'Attaque coordonnée',
    buff: 'Attaque coordonnée',
  },
  'zone_conflict:node_11': {
    name: 'Mobilisation défensive',
    buff: 'Mobilisation défensive',
  },
  'zone_conflict:node_12': {
    name: 'Attaque alliée',
    buff: 'Attaque alliée',
  },
  'zone_conflict:node_13': {
    name: 'Super légion',
    buff: 'Débloque Super légion',
  },
  'zone_conflict:node_14': {
    name: 'Ossature en fibre de carbone',
    buff: 'Ossature en fibre de carbone',
  },
  'zone_conflict:node_15': {
    name: 'Spores virales',
    buff: 'Spores virales',
  },
  '1a6ec06e:node_1': {
    name: 'Charge destructrice renforcée',
    buff: '+20 % de capacité de transport',
  },
  '1a6ec06e:node_2': {
    name: 'Assaut des fantassins',
    buff: '+10 % de puissance de destruction des fantassins',
  },
  '1a6ec06e:node_3': {
    name: 'Assaut des archers',
    buff: '+10 % de puissance de destruction des archers',
  },
  '1a6ec06e:node_4': {
    name: 'Assaut de la cavalerie',
    buff: '+10 % de puissance de destruction de la cavalerie',
  },
  '1a6ec06e:node_5': {
    name: 'Assaut total',
    buff: '+20 % de vitesse de marche',
  },
  '1a6ec06e:node_6': {
    name: 'Attaque frontale',
    buff: '+20 % de puissance de siège des fantassins',
  },
  '1a6ec06e:node_7': {
    name: 'Recrutement des archers',
    buff: '+20 % de puissance de siège des archers',
  },
  '1a6ec06e:node_8': {
    name: 'Recrutement de la cavalerie',
    buff: '+20 % de puissance de siège de la cavalerie',
  },
  '1a6ec06e:node_9': {
    name: 'Bouclier lourd',
    buff: '+20 % de résistance de siège des fantassins',
  },
  '1a6ec06e:node_10': {
    name: 'Armure de fer',
    buff: '+20 % de résistance de siège des archers',
  },
  '1a6ec06e:node_11': {
    name: 'Cavalier lourd',
    buff: '+20 % de résistance de siège de la cavalerie',
  },
  '1a6ec06e:node_12': {
    name: 'Armes létales',
    buff: '+20 % de taux de pertes ennemies après une victoire de siège en solo',
  },
  '1a6ec06e:node_13': {
    name: 'Agilité',
    buff: '+50 de vitesse de combat des fantassins',
  },
  '1a6ec06e:node_14': {
    name: 'Tirs rapides',
    buff: '+50 de vitesse de combat des archers',
  },
  '1a6ec06e:node_15': {
    name: 'Au galop',
    buff: '+50 de vitesse de combat de la cavalerie',
  },
  '1a6ec06e:node_16': {
    name: 'Débloquer le signal de fumée',
    buff: 'Après un siège raté, le défenseur perd des unités et subit une baisse de puissance et de résistance',
  },
  '1a6ec06e:node_17': {
    name: 'Désarmement',
    buff: 'Malus de puissance après destruction augmenté de +10 %',
  },
  '1a6ec06e:node_18': {
    name: 'Perce-armure',
    buff: 'Malus de résistance après destruction augmenté de +10 %',
  },
  '1a6ec06e:node_19': {
    name: 'Paralysie',
    buff: 'Durée de destruction augmentée de +600',
  },
  '1a6ec06e:node_20': {
    name: 'Frappe des fantassins',
    buff: '+20 % de puissance des fantassins',
  },
  '1a6ec06e:node_21': {
    name: 'Frappe des archers',
    buff: '+20 % de puissance des archers',
  },
  '1a6ec06e:node_22': {
    name: 'Frappe de la cavalerie',
    buff: '+20 % de puissance de la cavalerie',
  },
  '1a6ec06e:node_23': {
    name: 'Résistance des fantassins',
    buff: '+20 % de résistance des fantassins',
  },
  '1a6ec06e:node_24': {
    name: 'Résistance des archers',
    buff: '+20 % de résistance des archers',
  },
  '1a6ec06e:node_25': {
    name: 'Résistance de la cavalerie',
    buff: '+20 % de résistance de la cavalerie',
  },
  '1a6ec06e:node_26': {
    name: 'Cicatrice de guerre',
    buff: 'Marque le château ennemi',
  },
  '1a6ec06e:node_27': {
    name: 'Marquage',
    buff: 'Bonus de puissance de la marque augmenté de +10 %',
  },
  '1a6ec06e:node_28': {
    name: 'Défense marquée',
    buff: 'Bonus de résistance de la marque augmenté de +10 %',
  },
  '1a6ec06e:node_29': {
    name: 'Marquage prolongé',
    buff: 'Augmente la durée de la marque de +1200',
  },
  '1a6ec06e:node_30': {
    name: 'Marquage multiple',
    buff: 'Augmente la limite de marques de +2',
  },
  '1a6ec06e:node_31': {
    name: 'Assaut des fantassins',
    buff: '+10 % de puissance de destruction des fantassins',
  },
  '1a6ec06e:node_32': {
    name: 'Assaut des archers',
    buff: '+10 % de puissance de destruction des archers',
  },
  '1a6ec06e:node_33': {
    name: 'Assaut de la cavalerie',
    buff: '+10 % de puissance de destruction de la cavalerie',
  },
  '1a6ec06e:node_34': {
    name: 'Massacre',
    buff: 'Pertes de guerre ennemies augmentées de +20 %',
  },
  '1a6ec06e:node_35': {
    name: 'Attaque frontale',
    buff: '+20 % de puissance de siège des fantassins',
  },
  '1a6ec06e:node_36': {
    name: 'Recrutement des archers',
    buff: '+20 % de puissance de siège des archers',
  },
  '1a6ec06e:node_37': {
    name: 'Recrutement de la cavalerie',
    buff: '+20 % de puissance de siège de la cavalerie',
  },
  '1a6ec06e:node_38': {
    name: 'Bouclier lourd',
    buff: '+20 % de résistance de siège des fantassins',
  },
  '1a6ec06e:node_39': {
    name: 'Armure de fer',
    buff: '+20 % de résistance de siège des archers',
  },
  '1a6ec06e:node_40': {
    name: 'Cavalier lourd',
    buff: '+20 % de PV des fantassins',
  },
  '1a6ec06e:node_41': {
    name: 'Bouclier de siège',
    buff: '+20 % de PV pour toutes les troupes',
  },
  '1a6ec06e:node_42': {
    name: 'Armure de siège',
    buff: '+20 % de PV des archers',
  },
  '1a6ec06e:node_43': {
    name: 'Cavalerie de siège',
    buff: '+20 % de PV de la cavalerie',
  },
  '1a6ec06e:node_44': {
    name: 'Capture',
    buff: 'Bonus de victoire en siège',
  },
  'city_defence:node_1': {
    name: 'Fortification des remparts',
    buff: 'Augmente la fortification de 250',
  },
  'city_defence:node_2': {
    name: 'Équipe d’assaut',
    buff: 'Vitesse de perte de durabilité près du trône réduite de 20 %',
  },
  'city_defence:node_3': {
    name: 'Réparation des remparts',
    buff: 'Vitesse de récupération de durabilité augmentée de 20 %',
  },
  'city_defence:node_4': {
    name: 'Renforts rapides',
    buff: 'Vitesse de marche lors d’un renfort augmentée de 20 %',
  },
  'city_defence:node_5': {
    name: 'Renforts de puissance des fantassins',
    buff: 'Puissance des fantassins lors d’un renfort allié augmentée de 20 %',
  },
  'city_defence:node_7': {
    name: 'Renforts de puissance de la cavalerie',
    buff: 'Puissance de la cavalerie lors d’un renfort allié augmentée de 20 %',
  },
  'city_defence:node_6': {
    name: 'Puissance de renfort des archers',
    buff: 'Puissance des archers lors d’un renfort allié augmentée de 20 %',
  },
  'city_defence:node_8': {
    name: 'Renforts de résistance des fantassins',
    buff: 'Résistance des fantassins lors d’un renfort allié augmentée de 20 %',
  },
  'city_defence:node_10': {
    name: 'Renforts de résistance de la cavalerie',
    buff: 'Résistance de la cavalerie lors d’un renfort allié augmentée de 20 %',
  },
  'city_defence:node_9': {
    name: 'Résistance de renfort des archers',
    buff: 'Résistance des archers lors d’un renfort allié augmentée de 20 %',
  },
  'city_defence:node_11': {
    name: 'Renforts rapides',
    buff: 'Vitesse de marche lors d’un renfort augmentée de 20 %',
  },
  'city_defence:node_12': {
    name: 'Puissance des renforts',
    buff: 'Puissance augmentée de 20 % lorsque vous recevez des renforts alliés',
  },
  'city_defence:node_13': {
    name: 'Résistance des renforts',
    buff: 'Résistance augmentée de 20 % lorsque vous recevez des renforts alliés',
  },
  'city_defence:node_14': {
    name: 'La vie continue',
    buff: 'Variation du taux de pertes infligées par l’ennemi : -10 %',
  },
  'city_defence:node_15': {
    name: 'Percée des fantassins',
    buff: 'Puissance des fantassins en défense de siège augmentée de 20 %',
  },
  'city_defence:node_17': {
    name: 'Percée de la cavalerie',
    buff: 'Puissance de la cavalerie en défense de siège augmentée de 20 %',
  },
  'city_defence:node_16': {
    name: 'Percée des archers',
    buff: 'Puissance des archers en défense de siège augmentée de 20 %',
  },
  'city_defence:node_18': {
    name: 'Bouclier défensif',
    buff: 'Résistance des fantassins en défense de siège augmentée de 20 %',
  },
  'city_defence:node_20': {
    name: 'Cavalerie défensive',
    buff: 'Résistance de la cavalerie en défense de siège augmentée de 20 %',
  },
  'city_defence:node_19': {
    name: 'Armure défensive',
    buff: 'Résistance des archers en défense de siège augmentée de 20 %',
  },
  'city_defence:node_21': {
    name: 'Tous unis',
    buff: 'Accorde une légion de défense',
  },
  'city_defence:node_22': {
    name: 'Contre-attaque',
    buff: 'Puissance des unités de la file de défense : 15 %',
  },
  'city_defence:node_23': {
    name: 'Forteresse robuste',
    buff: 'Résistance des unités de la file de défense : 15 %',
  },
  'city_defence:node_24': {
    name: 'Renforcement de la légion',
    buff: 'PV de la file de défense : 15 %',
  },
  'city_defence:node_25': {
    name: 'Extension du recrutement',
    buff: 'Capacité maximale de la file de défense augmentée de 15000',
  },
  'city_defence:node_26': {
    name: 'Lit d’appoint',
    buff: 'Capacité des tentes médicales : 15000',
  },
  'city_defence:node_27': {
    name: 'Fortification des remparts',
    buff: 'Augmente la fortification de 250',
  },
  'city_defence:node_28': {
    name: 'Tour avancée',
    buff: 'Améliore la tour en TOUR AVANCÉE',
  },
  'city_defence:node_29': {
    name: 'Extension de la tour',
    buff: 'Capacité d’énergie de la tour avancée : 1000',
  },
  'city_defence:node_30': {
    name: 'Renforcement de la tour',
    buff: 'Vitesse de récupération d’énergie : 40 %',
  },
  'city_defence:node_31': {
    name: 'Tour renforcée',
    buff: 'Attaque de la tour à flèches : 20 %',
  },
  'city_defence:node_32': {
    name: 'Refuge sûr',
    buff: 'Pertes après une défaite réduites de 20 %',
  },
  'city_defence:node_33': {
    name: 'Percée des fantassins',
    buff: 'Puissance des fantassins en défense de siège augmentée de 20 %',
  },
  'city_defence:node_35': {
    name: 'Percée de la cavalerie',
    buff: 'Puissance de la cavalerie en défense de siège augmentée de 20 %',
  },
  'city_defence:node_34': {
    name: 'Percée des archers',
    buff: 'Puissance des archers en défense de siège augmentée de 20 %',
  },
  'city_defence:node_36': {
    name: 'Bouclier défensif',
    buff: 'Résistance des fantassins en défense de siège augmentée de 20 %',
  },
  'city_defence:node_37': {
    name: 'Cavalerie défensive',
    buff: 'Résistance de la cavalerie en défense de siège augmentée de 20 %',
  },
  'city_defence:node_38': {
    name: 'Armure défensive',
    buff: 'Résistance des archers en défense de siège augmentée de 20 %',
  },
  'city_defence:node_39': {
    name: 'Tenir sa position',
    buff: 'Données inconnues',
  },
  'defence_legion:node_1': {
    name: 'Affectation d’un héros',
    buff: 'Déploie 1 héros en file de défense',
  },
  'defence_legion:node_2': {
    name: 'Extension du recrutement',
    buff: 'Capacité de la marche de défense augmentée de 10500',
  },
  'defence_legion:node_3': {
    name: 'Loyauté des fantassins',
    buff: '10 % de résistance des fantassins dans la file de défense',
  },
  'defence_legion:node_5': {
    name: 'Loyauté de la cavalerie',
    buff: '10 % de résistance de la cavalerie dans la file de défense',
  },
  'defence_legion:node_4': {
    name: 'Loyauté des archers',
    buff: '10 % de résistance des archers dans la file de défense',
  },
  'defence_legion:node_6': {
    name: 'Assaut des fantassins',
    buff: '10 % de puissance des fantassins dans la file de défense',
  },
  'defence_legion:node_8': {
    name: 'Assaut de la cavalerie',
    buff: '10 % de puissance de la cavalerie dans la file de défense',
  },
  'defence_legion:node_7': {
    name: 'Assaut des archers',
    buff: '10 % de puissance des archers dans la file de défense',
  },
  'defence_legion:node_9': {
    name: 'Extension du recrutement',
    buff: 'Capacité de la marche de défense augmentée de 16500',
  },
  'defence_legion:node_10': {
    name: 'Coopération des héros',
    buff: 'Déploie 2 héros dans la file de défense',
  },
  'defence_legion:node_11': {
    name: 'Loyauté des fantassins II',
    buff: '10 % de résistance des fantassins dans la file de défense',
  },
  'defence_legion:node_13': {
    name: 'Loyauté de la cavalerie II',
    buff: '10 % de résistance de la cavalerie dans la file de défense',
  },
  'defence_legion:node_12': {
    name: 'Loyauté des archers II',
    buff: '10 % de résistance des archers dans la file de défense',
  },
  'defence_legion:node_14': {
    name: 'Assaut des fantassins II',
    buff: '10 % de puissance des fantassins dans la file de défense',
  },
  'defence_legion:node_16': {
    name: 'Assaut de la cavalerie II',
    buff: '10 % de puissance de la cavalerie dans la file de défense',
  },
  'defence_legion:node_15': {
    name: 'Assaut des archers II',
    buff: '10 % de puissance des archers dans la file de défense',
  },
  'defence_legion:node_17': {
    name: 'Commandement des héros',
    buff: 'Déploie 3 héros dans la file de défense',
  },
  'defence_legion:node_18': {
    name: 'Extension du recrutement II',
    buff: 'Capacité de la marche de défense augmentée de 25000',
  },
  'defence_legion:node_19': {
    name: 'Boucliers renforcés',
    buff: 'Bonus de défense des troupes : 15 %',
  },
  'defence_legion:node_20': {
    name: 'Potentiel inspiré',
    buff: 'Bonus d’attaque des troupes : 15 %',
  },
  'defence_legion:node_21': {
    name: 'Extension du recrutement III',
    buff: 'Capacité de la marche de défense augmentée de 26000',
  },
  'e8704053:node_1': {
    name: 'Compétences offensives renforcées — fantassins',
    buff: 'Puissance de base des fantassins renforcés +3',
  },
  'e8704053:node_2': {
    name: 'Compétences offensives renforcées — cavalerie',
    buff: 'Puissance de base de la cavalerie renforcée +3',
  },
  'e8704053:node_3': {
    name: 'Compétences offensives renforcées — archers',
    buff: 'Puissance de base des archers renforcés +3',
  },
  'e8704053:node_4': {
    name: 'Frappe lourde',
    buff: '+10 % de puissance des fantassins',
  },
  'e8704053:node_5': {
    name: 'Charge féroce',
    buff: '+10 % de puissance de la cavalerie',
  },
  'e8704053:node_6': {
    name: 'Flèche renforcée',
    buff: '+10 % pour les archers nocturnes',
  },
  'e8704053:node_7': {
    name: 'Frappe robuste',
    buff: '+5 % de puissance pour tous les types de troupes',
  },
  'e8704053:node_8': {
    name: 'Entraînement optimisé',
    buff: 'Réduction du coût de l’entraînement intensif : -10 %',
  },
  'e8704053:node_9': {
    name: 'Entraînement de masse',
    buff: 'Vitesse d’entraînement intensif augmentée de +40 %',
  },
  'e8704053:node_10': {
    name: 'Frappe tactique',
    buff: '+10 % de puissance tactique pour toutes les troupes',
  },
  'e8704053:node_11': {
    name: 'Armure renforcée — Fantassins',
    buff: 'Résistance de base des fantassins renforcés +5',
  },
  'e8704053:node_12': {
    name: 'Armure renforcée — Cavalerie',
    buff: 'Résistance de base de la cavalerie renforcée +5',
  },
  'e8704053:node_13': {
    name: 'Armure renforcée — Archers',
    buff: 'Résistance de base des archers renforcés +2',
  },
  'e8704053:node_14': {
    name: 'Bouclier redressé',
    buff: '+10 % de résistance des fantassins',
  },
  'e8704053:node_15': {
    name: 'Barde renforcée',
    buff: '+10 % de résistance de la cavalerie',
  },
  'e8704053:node_16': {
    name: 'Brassard renforcé',
    buff: '+10 % de résistance des archers',
  },
  'e8704053:node_17': {
    name: 'Armure de maître',
    buff: '+5 % de résistance pour tous les types de troupes',
  },
  'e8704053:node_18': {
    name: 'Soldats bénis',
    buff: 'Réduction du coût des troupes renforcées : -20 %',
  },
  'e8704053:node_19': {
    name: 'Soins intensifs',
    buff: 'Vitesse de soin des troupes renforcées augmentée de +40 %',
  },
  'e8704053:node_20': {
    name: 'Protection tactique',
    buff: '+10 % de résistance tactique pour toutes les troupes',
  },
  'e8704053:node_21': {
    name: 'Recrutement des fantassins',
    buff: 'Vitesse d’entraînement des fantassins augmentée de +40 %',
  },
  'e8704053:node_22': {
    name: 'Recrutement de la cavalerie',
    buff: 'Vitesse d’entraînement de la cavalerie augmentée de +40 %',
  },
  'e8704053:node_23': {
    name: 'Recrutement des archers',
    buff: 'Vitesse d’entraînement des archers augmentée de +40 %',
  },
  'e8704053:node_24': {
    name: 'Lame affûtée',
    buff: '+10 % de puissance des fantassins renforcés',
  },
  'e8704053:node_25': {
    name: 'Sabre de cavalerie',
    buff: '+10 % de puissance de la cavalerie renforcée',
  },
  'e8704053:node_26': {
    name: 'Flèche renforcée AE',
    buff: '+10 % de puissance des archers renforcés',
  },
  'e8704053:node_27': {
    name: 'Premiers secours des fantassins',
    buff: 'Vitesse de soin des fantassins +10 %',
  },
  'e8704053:node_28': {
    name: 'Vétérinaire',
    buff: 'Vitesse de soin de la cavalerie +10 %',
  },
  'e8704053:node_29': {
    name: 'Premiers secours des archers',
    buff: 'Vitesse de soin des archers +10 %',
  },
  'e8704053:node_30': {
    name: 'Armure raffinée',
    buff: '+10 % de résistance des fantassins renforcés',
  },
  'e8704053:node_31': {
    name: 'Armure renforcée',
    buff: '+10 % de résistance de la cavalerie renforcée',
  },
  'e8704053:node_32': {
    name: 'Tenue renforcée',
    buff: '+10 % de résistance des archers renforcés',
  },
  'e8704053:node_33': {
    name: 'Loi martiale',
    buff: '+6 % de PV pour toutes les troupes',
  },
  'e8704053:node_34': {
    name: 'Soins avancés',
    buff: 'Les troupes renforcées utilisent les mêmes ressources que les troupes normales',
  },
  'b3581c97:node_1': {
    name: 'Acier de Damas I',
    buff: '+10 % de puissance des fantassins',
  },
  'b3581c97:node_2': {
    name: 'Cheval à sang chaud I',
    buff: '+10 % de puissance de la cavalerie',
  },
  'b3581c97:node_3': {
    name: 'Flèche trempée I',
    buff: '+10 % de puissance des archers',
  },
  'b3581c97:node_4': {
    name: 'Armure intégrale I',
    buff: '+10 % de résistance des fantassins',
  },
  'b3581c97:node_5': {
    name: 'Étrier I',
    buff: '+10 % de résistance de la cavalerie',
  },
  'b3581c97:node_6': {
    name: 'Mur de boucliers I',
    buff: '+10 % de résistance des archers',
  },
  'b3581c97:node_8': {
    name: 'Formation circulaire I',
    buff: '+5 % de résistance tactique',
  },
  'b3581c97:node_11': {
    name: 'Tunnel I',
    buff: '+5 % de puissance tactique',
  },
  'b3581c97:node_14': {
    name: 'Fanatisme I',
    buff: '+5 % de PV',
  },
  'b3581c97:node_17': {
    name: 'Bastion I',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_20': {
    name: 'Bélier I',
    buff: '+5 % de puissance de siège',
  },
  'b3581c97:node_100': {
    name: 'Tunnel II',
    buff: '+5 % de puissance tactique',
  },
  'b3581c97:node_26': {
    name: 'Bastion II',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_29': {
    name: 'Bélier II',
    buff: '+5 % de résistance de siège',
  },
  'b3581c97:node_32': {
    name: 'Défenseur impérial',
    buff: 'Débloque les fantassins T10',
  },
  'b3581c97:node_35': {
    name: 'Formation circulaire II',
    buff: '+5 % de résistance tactique',
  },
  'b3581c97:node_38': {
    name: 'Armure intégrale II',
    buff: '+10 % de résistance',
  },
  'b3581c97:node_41': {
    name: 'Acier de Damas II',
    buff: '+10 % de puissance',
  },
  'b3581c97:node_44': {
    name: 'Bastion III',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_47': {
    name: 'Bélier III',
    buff: '+5 % de puissance de siège',
  },
  'b3581c97:node_50': {
    name: 'Bastion IV',
    buff: '+5 % de résistance en défense de siège',
  },
  'b3581c97:node_53': {
    name: 'Bélier IV',
    buff: '+5 % de résistance de siège',
  },
  'b3581c97:node_56': {
    name: 'Fanatisme II',
    buff: '+5 % de PV',
  },
  'b3581c97:node_59': {
    name: 'Entraînement des fantassins de la garde',
    buff: 'Restaure puissance',
  },
  'b3581c97:node_7': {
    name: 'Attaque coordonnée I',
    buff: '+5 % de résistance tactique',
  },
  'b3581c97:node_10': {
    name: 'Formation en coin I',
    buff: '+5 % de puissance tactique',
  },
  'b3581c97:node_13': {
    name: 'Courage I',
    buff: '+5 % de PV',
  },
  'b3581c97:node_16': {
    name: 'Chariot armé I',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_19': {
    name: 'Tranchée I',
    buff: '+5 % de puissance de siège',
  },
  'b3581c97:node_101': {
    name: 'Tunnel II',
    buff: '+5 % de puissance tactique',
  },
  'b3581c97:node_25': {
    name: 'Chariot armé II',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_28': {
    name: 'Tranchée II',
    buff: '+5 % de résistance de siège',
  },
  'b3581c97:node_31': {
    name: 'Chevalier impérial',
    buff: 'Débloque la cavalerie T10',
  },
  'b3581c97:node_34': {
    name: 'Attaque coordonnée II',
    buff: '+5 % de résistance tactique',
  },
  'b3581c97:node_37': {
    name: 'Étrier II',
    buff: '+10 % de résistance',
  },
  'b3581c97:node_40': {
    name: 'Cheval à sang chaud II',
    buff: '+10 % de puissance',
  },
  'b3581c97:node_43': {
    name: 'Chariot armé III',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_46': {
    name: 'Tranchée III',
    buff: '+5 % de puissance de siège',
  },
  'b3581c97:node_49': {
    name: 'Chariot armé IV',
    buff: '+5 % de résistance en défense de siège',
  },
  'b3581c97:node_52': {
    name: 'Tranchée IV',
    buff: '+5 % de résistance de siège',
  },
  'b3581c97:node_55': {
    name: 'Courage II',
    buff: '+5 % de PV',
  },
  'b3581c97:node_58': {
    name: 'Entraînement de la cavalerie de la garde',
    buff: '+2 % de dégâts',
  },
  'b3581c97:node_9': {
    name: 'Couvrir les tireurs I',
    buff: '+5 % de résistance tactique',
  },
  'b3581c97:node_12': {
    name: 'Tir en rotation I',
    buff: '+5 % de puissance tactique',
  },
  'b3581c97:node_15': {
    name: 'Persévérance I',
    buff: '+5 % de PV',
  },
  'b3581c97:node_18': {
    name: 'Tour I',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_21': {
    name: 'Tir de précision I',
    buff: '+5 % de puissance de siège',
  },
  'b3581c97:node_102': {
    name: 'Tunnel II',
    buff: '+5 % de puissance tactique',
  },
  'b3581c97:node_27': {
    name: 'Tour II',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_30': {
    name: 'Tir de précision II',
    buff: '+5 % de résistance de siège',
  },
  'b3581c97:node_33': {
    name: 'Tireur impérial',
    buff: 'Débloque les archers T10',
  },
  'b3581c97:node_36': {
    name: 'Couvrir les tireurs II',
    buff: '+5 % de résistance tactique',
  },
  'b3581c97:node_39': {
    name: 'Mur de boucliers II',
    buff: '+10 % de résistance',
  },
  'b3581c97:node_42': {
    name: 'Flèche trempée II',
    buff: '+10 % de puissance',
  },
  'b3581c97:node_45': {
    name: 'Tour III',
    buff: '+5 % de puissance en défense de siège',
  },
  'b3581c97:node_48': {
    name: 'Tir de précision III',
    buff: '+5 % de puissance de siège',
  },
  'b3581c97:node_51': {
    name: 'Tour IV',
    buff: '+5 % de résistance en défense de siège',
  },
  'b3581c97:node_54': {
    name: 'Tir de précision IV',
    buff: '+5 % de résistance de siège',
  },
  'b3581c97:node_57': {
    name: 'Persévérance II',
    buff: '+5 % de PV',
  },
  'b3581c97:node_60': {
    name: 'Entraînement des archers de la garde',
    buff: '+3 % esquive',
  },
  '2b149bcb:node_1': {
    name: 'Garde avec courage — fantassin',
    buff: '+5 % de puissance de siège des fantassins',
  },
  '2b149bcb:node_2': {
    name: 'Garde avec courage — cavalerie',
    buff: '+5 % de puissance de siège de la cavalerie',
  },
  '2b149bcb:node_3': {
    name: 'Garde avec courage — archers',
    buff: '+5 % de puissance de siège des archers',
  },
  '2b149bcb:node_4': {
    name: 'Garde avec persévérance — fantassin',
    buff: '+5 % de résistance de siège des fantassins',
  },
  '2b149bcb:node_5': {
    name: 'Garde avec persévérance — cavalerie',
    buff: '+5 % de résistance de siège de la cavalerie',
  },
  '2b149bcb:node_6': {
    name: 'Garde avec persévérance — archers',
    buff: '+5 % de résistance de siège des archers',
  },
  '2b149bcb:node_7': {
    name: 'Ralliement de la garde I',
    buff: '+5m de capacité supplémentaire pour les troupes T10',
  },
  '2b149bcb:node_8': {
    name: 'Assaut de la garde',
    buff: '+5 % de puissance des fantassins',
  },
  '2b149bcb:node_9': {
    name: 'Lance de la garde',
    buff: '+5 % de puissance de la cavalerie',
  },
  '2b149bcb:node_10': {
    name: 'Arc de la garde',
    buff: '+5 % de puissance des archers',
  },
  '2b149bcb:node_11': {
    name: 'Bouclier de la garde I',
    buff: '+5 % de résistance des fantassins',
  },
  '2b149bcb:node_12': {
    name: 'Armure de la garde I',
    buff: '+5 % de résistance de la cavalerie',
  },
  '2b149bcb:node_13': {
    name: 'Formation de la garde I',
    buff: '+5 % de résistance des archers',
  },
  '2b149bcb:node_14': {
    name: 'Ralliement de fantassins',
    buff: '+15m de capacité supplémentaire pour les fantassins T10',
  },
  '2b149bcb:node_15': {
    name: 'Ralliement de cavalerie',
    buff: '+15m de capacité supplémentaire pour la cavalerie T10',
  },
  '2b149bcb:node_16': {
    name: 'Ralliement des archers',
    buff: '+15m de capacité supplémentaire pour les archers T10',
  },
  '2b149bcb:node_17': {
    name: 'Frappes de la garde',
    buff: '+5 % de puissance de toutes les troupes',
  },
  '2b149bcb:node_18': {
    name: 'Bouclier de la garde II',
    buff: '+5 % de résistance des fantassins',
  },
  '2b149bcb:node_19': {
    name: 'Armure de la garde II',
    buff: '+5 % de résistance de la cavalerie',
  },
  '2b149bcb:node_20': {
    name: 'Formation de la garde II',
    buff: '+5 % de résistance des archers',
  },
  '2b149bcb:node_21': {
    name: 'Ralliement de la garde II',
    buff: '+30m de capacité supplémentaire pour les troupes T10',
  },
  '2b149bcb:node_22': {
    name: 'Garde camouflée — Fantassins',
    buff: '+5 % de résistance tactique des fantassins',
  },
  '2b149bcb:node_23': {
    name: 'Garde camouflée — Cavalerie',
    buff: '+5 % de résistance tactique de la cavalerie',
  },
  '2b149bcb:node_24': {
    name: 'Garde camouflée — Archers',
    buff: '+5 % de résistance tactique des archers',
  },
  '2b149bcb:node_25': {
    name: 'Raid de la garde — fantassin',
    buff: '+5 % de puissance tactique des fantassins',
  },
  '2b149bcb:node_26': {
    name: 'Raid de la garde — cavalerie',
    buff: '+5 % de puissance tactique de la cavalerie',
  },
  '2b149bcb:node_27': {
    name: 'Raid de la garde — archers',
    buff: '+5 % de puissance tactique des archers',
  },
  '2b149bcb:node_28': {
    name: 'Moral de la garde — fantassin',
    buff: '+5 % de PV des fantassins',
  },
  '2b149bcb:node_29': {
    name: 'Moral de la garde — cavalerie',
    buff: '+5 % de PV de la cavalerie',
  },
  '2b149bcb:node_30': {
    name: 'Moral de la garde — archers',
    buff: '+5 % de PV des archers',
  },
  '2b149bcb:node_31': {
    name: 'Moral de la garde',
    buff: '+5 % de PV pour toutes les troupes',
  },
  '2b149bcb:node_32': {
    name: 'Contre-attaque de la garde — fantassin',
    buff: '+5 % de puissance en défense de siège des fantassins',
  },
  '2b149bcb:node_33': {
    name: 'Contre-attaque de la garde — cavalerie',
    buff: '+5 % de puissance en défense de siège de la cavalerie',
  },
  '2b149bcb:node_34': {
    name: 'Contre-attaque de la garde — archers',
    buff: '+5 % de puissance en défense de siège des archers',
  },
  '2b149bcb:node_35': {
    name: 'Résolution de la garde — fantassin',
    buff: '+5 % de résistance en défense de siège des fantassins',
  },
  '2b149bcb:node_36': {
    name: 'Résolution de la garde — cavalerie',
    buff: '+5 % de résistance en défense de siège de la cavalerie',
  },
  '2b149bcb:node_37': {
    name: 'Résolution de la garde — archers',
    buff: '+5 % de résistance en défense de siège des archers',
  },
  '2b149bcb:node_38': {
    name: 'Ralliement de la garde III',
    buff: '+160m de capacité supplémentaire pour les troupes T10',
  },
  '3f5ebb34:node_1': {
    name: 'Fantassins armés I',
    buff: '+5 % de résistance des fantassins',
  },
  '3f5ebb34:node_2': {
    name: 'Cavalerie armée I',
    buff: '+5 % de résistance de la cavalerie',
  },
  '3f5ebb34:node_3': {
    name: 'Archers armés I',
    buff: '+5 % de résistance des archers',
  },
  '3f5ebb34:node_4': {
    name: 'Lame des fantassins I',
    buff: '+5 % de puissance des fantassins',
  },
  '3f5ebb34:node_5': {
    name: 'Cavalier lourd I',
    buff: '+5 % de puissance de la cavalerie',
  },
  '3f5ebb34:node_6': {
    name: 'Flèche trempée I',
    buff: '+5 % de puissance des archers',
  },
  '3f5ebb34:node_7': {
    name: 'Mobilisation des fantassins',
    buff: '+5 % de PV des fantassins',
  },
  '3f5ebb34:node_8': {
    name: 'Mobilisation de la cavalerie',
    buff: '+5 % de PV de la cavalerie',
  },
  '3f5ebb34:node_9': {
    name: 'Mobilisation des archers',
    buff: '+5 % de PV des archers',
  },
  '3f5ebb34:node_10': {
    name: 'Armement complet',
    buff: '+5 % de résistance pour tous les types de troupes',
  },
  '3f5ebb34:node_11': {
    name: 'Progression',
    buff: '+5 % de puissance tactique des fantassins',
  },
  '3f5ebb34:node_12': {
    name: 'Manœuvre de contournement',
    buff: '+5 % de puissance tactique de la cavalerie',
  },
  '3f5ebb34:node_13': {
    name: 'Tir à l’unisson',
    buff: '+5 % de puissance tactique des archers',
  },
  '3f5ebb34:node_14': {
    name: 'Lame des fantassins II',
    buff: '+5 % de puissance des fantassins',
  },
  '3f5ebb34:node_15': {
    name: 'Cavalier lourd II',
    buff: '+5 % de puissance de la cavalerie',
  },
  '3f5ebb34:node_16': {
    name: 'Flèche trempée II',
    buff: '+5 % de puissance des archers',
  },
  '3f5ebb34:node_17': {
    name: 'Fantassins armés II',
    buff: '+5 % de résistance des fantassins',
  },
  '3f5ebb34:node_18': {
    name: 'Cavalerie armée II',
    buff: '+5 % de résistance de la cavalerie',
  },
  '3f5ebb34:node_19': {
    name: 'Archers armés II',
    buff: '+5 % de résistance des archers',
  },
  '3f5ebb34:node_20': {
    name: 'Attaque brutale I',
    buff: '+4 % de dégâts pour toutes les troupes hors élite',
  },
  '3f5ebb34:node_21': {
    name: 'Charge des fantassins',
    buff: '+5 % de puissance de siège des fantassins',
  },
  '3f5ebb34:node_22': {
    name: 'Charge de la cavalerie',
    buff: '+5 % de puissance de siège de la cavalerie',
  },
  '3f5ebb34:node_23': {
    name: 'Charge des archers',
    buff: '+5 % de puissance de siège des archers',
  },
  '3f5ebb34:node_24': {
    name: 'Ralliement des fantassins',
    buff: '+5 % de résistance de siège des fantassins',
  },
  '3f5ebb34:node_25': {
    name: 'Ralliement de la cavalerie',
    buff: '+5 % de résistance de siège de la cavalerie',
  },
  '3f5ebb34:node_26': {
    name: 'Ralliement des archers',
    buff: '+5 % de résistance de siège des archers',
  },
  '3f5ebb34:node_27': {
    name: 'Encouragement',
    buff: '+5 % de PV pour tous les types de troupes',
  },
  '3f5ebb34:node_28': {
    name: 'Chant à l’unisson',
    buff: '+5 % de résistance des fantassins',
  },
  '3f5ebb34:node_29': {
    name: 'Riposte',
    buff: '+5 % de résistance de la cavalerie',
  },
  '3f5ebb34:node_30': {
    name: 'Tir concentré',
    buff: '+5 % de résistance des archers',
  },
  '3f5ebb34:node_31': {
    name: 'Raid',
    buff: '+5 % de puissance pour tous les types de troupes',
  },
  '3f5ebb34:node_32': {
    name: 'Lame trempée',
    buff: '+5 % de puissance pour tous les types de troupes',
  },
  '3f5ebb34:node_33': {
    name: 'Armure d’élite',
    buff: '+5 % de résistance pour tous les types de troupes',
  },
  '3f5ebb34:node_34': {
    name: 'Posture de combat',
    buff: '+5 % de résistance de siège de toutes les troupes',
  },
  '3f5ebb34:node_35': {
    name: 'Posture défensive',
    buff: '+5 % de résistance de siège de toutes les troupes',
  },
  '3f5ebb34:node_36': {
    name: 'Attaque brutale II',
    buff: '+6 % de dégâts pour toutes les troupes hors élite',
  },
  '3ff71437:node_1': {
    name: 'Tenir la ligne I — fantassins',
    buff: '+5 % de résistance des fantassins',
  },
  '3ff71437:node_2': {
    name: 'Tenir la ligne I — cavalerie',
    buff: '+5 % de résistance de la cavalerie',
  },
  '3ff71437:node_3': {
    name: 'Tenir la ligne I — archers',
    buff: '+5 % de résistance des archers',
  },
  '3ff71437:node_4': {
    name: 'Frappe précise I — Fantassins',
    buff: '+5 % de puissance des fantassins',
  },
  '3ff71437:node_5': {
    name: 'Frappe précise I — Cavalerie',
    buff: '+5 % de puissance de la cavalerie',
  },
  '3ff71437:node_6': {
    name: 'Frappe précise I — Archers',
    buff: '+5 % de puissance des archers',
  },
  '3ff71437:node_7': {
    name: 'Encouragement des fantassins',
    buff: '+5 % de PV des fantassins',
  },
  '3ff71437:node_8': {
    name: 'Encouragement de la cavalerie',
    buff: '+5 % de PV de la cavalerie',
  },
  '3ff71437:node_9': {
    name: 'Encouragement des archers',
    buff: '+5 % de PV des archers',
  },
  '3ff71437:node_10': {
    name: 'Respiration profonde',
    buff: '+5 % de résistance pour tous les types de troupes',
  },
  '3ff71437:node_11': {
    name: 'Bannière de commandement — Fantassins',
    buff: '+5 % de puissance tactique des fantassins',
  },
  '3ff71437:node_12': {
    name: 'Bannière de commandement — Cavalerie',
    buff: '+5 % de puissance tactique de la cavalerie',
  },
  '3ff71437:node_13': {
    name: 'Bannière de commandement — Archers',
    buff: '+5 % de puissance tactique des archers',
  },
  '3ff71437:node_14': {
    name: 'Frappe précise II — Fantassins',
    buff: '+5 % de puissance des fantassins',
  },
  '3ff71437:node_15': {
    name: 'Frappe précise II — Cavalerie',
    buff: '+5 % de puissance de la cavalerie',
  },
  '3ff71437:node_16': {
    name: 'Frappe précise II — Archers',
    buff: '+5 % de puissance des archers',
  },
  '3ff71437:node_17': {
    name: 'Tenir la ligne II — fantassins',
    buff: '+5 % de résistance des fantassins',
  },
  '3ff71437:node_18': {
    name: 'Tenir la ligne II — cavalerie',
    buff: '+5 % de résistance de la cavalerie',
  },
  '3ff71437:node_19': {
    name: 'Tenir la ligne II — archers',
    buff: '+5 % de résistance des archers',
  },
  '3ff71437:node_20': {
    name: 'Représailles I',
    buff: '+4 % de dégâts pour toutes les troupes hors élite',
  },
  '3ff71437:node_21': {
    name: 'Ordre de siège — Fantassins',
    buff: '+5 % de puissance de siège des fantassins',
  },
  '3ff71437:node_22': {
    name: 'Ordre de siège — Cavalerie',
    buff: '+5 % de puissance de siège de la cavalerie',
  },
  '3ff71437:node_23': {
    name: 'Ordre de siège — Archers',
    buff: '+5 % de puissance de siège des archers',
  },
  '3ff71437:node_24': {
    name: 'Rassemblement fantassin',
    buff: '+5 % de puissance en défense de siège des fantassins',
  },
  '3ff71437:node_25': {
    name: 'Rassemblement cavalerie',
    buff: '+5 % de puissance en défense de siège de la cavalerie',
  },
  '3ff71437:node_26': {
    name: 'Rassemblement archers',
    buff: '+5 % de puissance en défense de siège des archers',
  },
  '3ff71437:node_27': {
    name: 'Ténacité',
    buff: '+5 % de PV pour tous les types de troupes',
  },
  '3ff71437:node_28': {
    name: 'Tenir la bannière — Résistance tactique des fantassins',
    buff: '+5 % de résistance tactique des fantassins',
  },
  '3ff71437:node_29': {
    name: 'Tenir la bannière — Résistance tactique de la cavalerie',
    buff: '+5 % de résistance tactique de la cavalerie',
  },
  '3ff71437:node_30': {
    name: 'Tenir la bannière — Résistance tactique des archers',
    buff: '+5 % de résistance tactique des archers',
  },
  '3ff71437:node_31': {
    name: 'Coup mortel',
    buff: '+5 % de puissance pour tous les types de troupes',
  },
  '3ff71437:node_32': {
    name: 'Renforcement des armes',
    buff: '+5 % de puissance pour tous les types de troupes',
  },
  '3ff71437:node_33': {
    name: 'Armure renforcée',
    buff: '+5 % de résistance pour tous les types de troupes',
  },
  '3ff71437:node_34': {
    name: 'Posture de combat II',
    buff: '+5 % de résistance de siège de toutes les troupes',
  },
  '3ff71437:node_35': {
    name: 'Posture défensive II',
    buff: '+5 % de résistance de siège de toutes les troupes',
  },
  '3ff71437:node_36': {
    name: 'Représailles II',
    buff: '+6 % de dégâts en défense de siège pour toutes les troupes hors élite',
  },
  'art_of_war_command:node_1': {
    name: 'Escrime trompeuse',
    buff: '+5 % de puissance en défense de siège des fantassins',
  },
  'art_of_war_command:node_2': {
    name: 'Équitation trompeuse',
    buff: '+5 % de puissance en défense de siège de la cavalerie',
  },
  'art_of_war_command:node_3': {
    name: 'Archerie trompeuse',
    buff: '+5 % de puissance en défense de siège des archers',
  },
  'art_of_war_command:node_4': {
    name: 'Escrime loyale',
    buff: '+5 % de résistance en défense de siège des fantassins',
  },
  'art_of_war_command:node_5': {
    name: 'Équitation loyale',
    buff: '+5 % de résistance en défense de siège de la cavalerie',
  },
  'art_of_war_command:node_6': {
    name: 'Archerie loyale',
    buff: '+5 % de résistance en défense de siège des archers',
  },
  'art_of_war_command:node_7': {
    name: 'Source de vie I',
    buff: '+5 % de PV pour tous les types de troupes',
  },
  'art_of_war_command:node_8': {
    name: 'Escrime intrépide',
    buff: '+5 % de puissance de siège des fantassins',
  },
  'art_of_war_command:node_9': {
    name: 'Équitation intrépide',
    buff: '+5 % de puissance de siège de la cavalerie',
  },
  'art_of_war_command:node_10': {
    name: 'Archerie intrépide',
    buff: '+5 % de puissance de siège des archers',
  },
  'art_of_war_command:node_11': {
    name: 'Escrime déterminée',
    buff: '+5 % de résistance de siège des fantassins',
  },
  'art_of_war_command:node_12': {
    name: 'Équitation déterminée',
    buff: '+5 % de résistance de siège de la cavalerie',
  },
  'art_of_war_command:node_13': {
    name: 'Archerie déterminée',
    buff: '+5 % de résistance de siège des archers',
  },
  'art_of_war_command:node_14': {
    name: 'Inarrêtable I',
    buff: '+5 % de puissance pour tous les types de troupes',
  },
  'art_of_war_command:node_15': {
    name: 'Escrime furtive I',
    buff: '+5 % de résistance des fantassins',
  },
  'art_of_war_command:node_16': {
    name: 'Équitation furtive I',
    buff: '+5 % de résistance de la cavalerie',
  },
  'art_of_war_command:node_17': {
    name: 'Archerie furtive I',
    buff: '+5 % de résistance des archers',
  },
  'art_of_war_command:node_18': {
    name: 'Escrime intensive I',
    buff: '+5 % de PV des fantassins',
  },
  'art_of_war_command:node_19': {
    name: 'Équitation intensive I',
    buff: '+5 % de PV de la cavalerie',
  },
  'art_of_war_command:node_20': {
    name: 'Archerie intensive I',
    buff: '+5 % de PV des archers',
  },
  'art_of_war_command:node_21': {
    name: 'Inarrêtable II',
    buff: '+5 % de puissance pour tous les types de troupes',
  },
  'art_of_war_command:node_22': {
    name: 'Escrime furtive II',
    buff: '+5 % de résistance des fantassins',
  },
  'art_of_war_command:node_23': {
    name: 'Équitation furtive II',
    buff: '+5 % de résistance de la cavalerie',
  },
  'art_of_war_command:node_24': {
    name: 'Archerie furtive II',
    buff: '+5 % de résistance des archers',
  },
  'art_of_war_command:node_25': {
    name: 'Escrime de percée',
    buff: '+5 % de puissance de siège des fantassins',
  },
  'art_of_war_command:node_26': {
    name: 'Équitation de percée',
    buff: '+5 % de puissance de siège de la cavalerie',
  },
  'art_of_war_command:node_27': {
    name: 'Archerie de percée',
    buff: '+5 % de puissance de siège des archers',
  },
  'art_of_war_command:node_28': {
    name: 'Escrime intensive II',
    buff: '+5 % de PV des fantassins',
  },
  'art_of_war_command:node_29': {
    name: 'Équitation intensive II',
    buff: '+5 % de PV de la cavalerie',
  },
  'art_of_war_command:node_30': {
    name: 'Archerie intensive II',
    buff: '+5 % de PV des archers',
  },
  'art_of_war_command:node_31': {
    name: 'Talent caché',
    buff: '+10 % de résistance pour toutes les troupes',
  },
  'art_of_war_command:node_32': {
    name: 'Commandement trompeur — Fantassins',
    buff: '+5 % de résistance tactique des fantassins',
  },
  'art_of_war_command:node_33': {
    name: 'Commandement trompeur — Cavalerie',
    buff: '+5 % de résistance tactique de la cavalerie',
  },
  'art_of_war_command:node_34': {
    name: 'Commandement trompeur — Archers',
    buff: '+5 % de résistance tactique des archers',
  },
  'art_of_war_command:node_35': {
    name: 'Ordre de siège — Fantassins',
    buff: '+5 % de puissance tactique des fantassins',
  },
  'art_of_war_command:node_36': {
    name: 'Ordre de siège — Cavalerie',
    buff: '+5 % de puissance tactique de la cavalerie',
  },
  'art_of_war_command:node_37': {
    name: 'Ordre de siège — Archers',
    buff: '+5 % de puissance tactique des archers',
  },
  'art_of_war_command:node_38': {
    name: 'Source de vie II',
    buff: '+10 % de PV pour tous les types de troupes',
  },
  '77db4a78:node_1': {
    name: 'Frappe puissante',
    buff: '20 % de puissance des fantassins',
  },
  '77db4a78:node_3': {
    name: 'Charge féroce',
    buff: '20 % de puissance de la cavalerie',
  },
  '77db4a78:node_2': {
    name: 'Flèche renforcée',
    buff: '20 % de puissance des archers',
  },
  '77db4a78:node_4': {
    name: 'Inarrêtable',
    buff: '10 % de puissance de toutes les unités',
  },
  '77db4a78:node_5': {
    name: 'Armure de maître',
    buff: '20 % de résistance des fantassins',
  },
  '77db4a78:node_7': {
    name: 'Barde renforcée',
    buff: '20 % de résistance de la cavalerie',
  },
  '77db4a78:node_6': {
    name: 'Brassard renforcé',
    buff: '20 % de résistance des archers',
  },
  '77db4a78:node_8': {
    name: 'Armement complet',
    buff: '10 % de résistance de toutes les unités',
  },
  '77db4a78:node_9': {
    name: 'Renforcement physique',
    buff: '10 % de PV des fantassins',
  },
  '77db4a78:node_10': {
    name: 'Potion de mana',
    buff: '10 % de PV de la cavalerie',
  },
  '77db4a78:node_11': {
    name: 'Pillard lourd',
    buff: '10 % de PV des archers',
  },
  '77db4a78:node_12': {
    name: 'Armure intégrale en métal',
    buff: '5 % de PV pour toutes les troupes',
  },
  '77db4a78:node_13_F': {
    name: 'Fantassins d’élite',
    buff: 'Débloque les fantassins T10',
  },
  '77db4a78:node_13_A': {
    name: 'Archers d’élite',
    buff: 'Débloque les archers T10',
  },
  '77db4a78:node_13_C': {
    name: 'Déblocage T10',
    buff: 'Débloque T10',
  },
  '77db4a78:node_14_F': {
    name: 'Assaut mortel',
    buff: '9 % de puissance des fantassins d’élite',
  },
  '77db4a78:node_15_F': {
    name: 'Armure de qualité',
    buff: '6 % de résistance des fantassins d’élite',
  },
  '77db4a78:node_16_F': {
    name: 'Armure haut de gamme',
    buff: '3 % de PV des fantassins d’élite',
  },
  '77db4a78:node_17_F': {
    name: 'Frappe puissante II',
    buff: '30 % de puissance des fantassins',
  },
  '77db4a78:node_18_F': {
    name: 'Armure de maître II',
    buff: '30 % de résistance des fantassins',
  },
  '77db4a78:node_19_F': {
    name: 'Renforcement physique II',
    buff: '15 % de PV des fantassins',
  },
  '77db4a78:node_20_F': {
    name: 'Capacité des fantassins d’élite',
    buff: '+200k de capacité pour les fantassins d’élite',
  },
  '77db4a78:node_21_F': {
    name: 'Entraînement sur obstacles',
    buff: '+50 % de vitesse d’entraînement des fantassins d’élite',
  },
  '77db4a78:node_22_F': {
    name: 'Production de masse',
    buff: 'Coût d’entraînement des fantassins d’élite : -50 %',
  },
  '77db4a78:node_23_F': {
    name: 'Potion de secours',
    buff: '+50 % de vitesse de soin des fantassins d’élite',
  },
  '77db4a78:node_24_F': {
    name: 'Remède miracle',
    buff: 'Coût des soins des fantassins d’élite : -50 %',
  },
  '77db4a78:node_25_F': {
    name: 'Capacité des fantassins d’élite II',
    buff: '+800k de capacité pour les fantassins d’élite',
  },
  '77db4a78:node_26_F': {
    name: 'Frappe puissante III',
    buff: '42 % de puissance des fantassins',
  },
  '77db4a78:node_27_F': {
    name: 'Armure de maître III',
    buff: '40 % de résistance des fantassins',
  },
  '77db4a78:node_28_F': {
    name: 'Renforcement physique III',
    buff: '20 % de PV des fantassins',
  },
  '77db4a78:node_29_F': {
    name: 'Assaut courageux',
    buff: '20 % de dégâts des fantassins d’élite',
  },
  '77db4a78:node_14_C': {
    name: 'Assaut mortel',
    buff: '9 % de puissance de la cavalerie d’élite',
  },
  '77db4a78:node_15_C': {
    name: 'Barde de qualité',
    buff: '6 % de résistance de la cavalerie d’élite',
  },
  '77db4a78:node_16_C': {
    name: 'Barde haut de gamme',
    buff: '3 % de PV de la cavalerie d’élite',
  },
  '77db4a78:node_17_C': {
    name: 'Charge féroce II',
    buff: '30 % de puissance de la cavalerie',
  },
  '77db4a78:node_18_C': {
    name: 'Barde renforcée II',
    buff: '30 % de résistance de la cavalerie',
  },
  '77db4a78:node_19_C': {
    name: 'Pillard lourd II',
    buff: '15 % de PV de la cavalerie',
  },
  '77db4a78:node_20_C': {
    name: 'Pillard du chaos',
    buff: '+200k de capacité pour la cavalerie d’élite',
  },
  '77db4a78:node_21_C': {
    name: 'Entraînement sur obstacles',
    buff: '+50 % de vitesse d’entraînement de la cavalerie d’élite',
  },
  '77db4a78:node_22_C': {
    name: 'Production de masse',
    buff: 'Coût d’entraînement de la cavalerie d’élite : -50 %',
  },
  '77db4a78:node_23_C': {
    name: 'Potion de secours',
    buff: '+50 % de vitesse de soin de la cavalerie d’élite',
  },
  '77db4a78:node_24_C': {
    name: 'Remède miracle',
    buff: 'Coût des soins de la cavalerie d’élite : -50 %',
  },
  '77db4a78:node_25_C': {
    name: 'Pillard du chaos II',
    buff: '+800k de capacité pour la cavalerie d’élite',
  },
  '77db4a78:node_26_C': {
    name: 'Charge féroce III',
    buff: '42 % de puissance de la cavalerie',
  },
  '77db4a78:node_27_C': {
    name: 'Barde renforcée III',
    buff: '40 % de résistance de la cavalerie',
  },
  '77db4a78:node_28_C': {
    name: 'Pillard lourd III',
    buff: '20 % de PV de la cavalerie',
  },
  '77db4a78:node_29_C': {
    name: 'Assaut courageux',
    buff: '20 % de dégâts de la cavalerie d’élite',
  },
  '77db4a78:node_14_A': {
    name: 'Assaut mortel',
    buff: '9 % de puissance des archers d’élite',
  },
  '77db4a78:node_15_A': {
    name: 'Armure de qualité',
    buff: '6 % de résistance des archers d’élite',
  },
  '77db4a78:node_16_A': {
    name: 'Armure haut de gamme',
    buff: '3 % de PV des archers d’élite',
  },
  '77db4a78:node_17_A': {
    name: 'Flèche renforcée II',
    buff: '30 % de puissance des archers',
  },
  '77db4a78:node_18_A': {
    name: 'Brassard renforcé II',
    buff: '30 % de résistance des archers',
  },
  '77db4a78:node_19_A': {
    name: 'Pillard lourd II',
    buff: '15 % de PV des archers',
  },
  '77db4a78:node_20_A': {
    name: 'Capacité des archers d’élite',
    buff: '+200k de capacité pour les archers d’élite',
  },
  '77db4a78:node_21_A': {
    name: 'Entraînement sur obstacles',
    buff: '+50 % de vitesse d’entraînement des archers d’élite',
  },
  '77db4a78:node_22_A': {
    name: 'Production de masse',
    buff: 'Coût d’entraînement des archers d’élite : -50 %',
  },
  '77db4a78:node_23_A': {
    name: 'Potion de secours',
    buff: '+50 % de vitesse de soin des archers d’élite',
  },
  '77db4a78:node_24_A': {
    name: 'Remède miracle',
    buff: 'Coût des soins des archers d’élite : -50 %',
  },
  '77db4a78:node_25_A': {
    name: 'Capacité des archers d’élite II',
    buff: '+800k de capacité pour les archers d’élite',
  },
  '77db4a78:node_26_A': {
    name: 'Flèche renforcée III',
    buff: '42 % de puissance des archers',
  },
  '77db4a78:node_27_A': {
    name: 'Brassard renforcé III',
    buff: '40 % de résistance des archers',
  },
  '77db4a78:node_28_A': {
    name: 'Pillard lourd III',
    buff: '20 % de PV des archers',
  },
  '77db4a78:node_29_A': {
    name: 'Assaut courageux',
    buff: '20 % de dégâts des archers d’élite',
  },
  '24ffc526:node_1': {
    name: 'Cavalerie courageuse',
    buff: '10 % de puissance de première ligne',
  },
  '24ffc526:node_2': {
    name: 'Cavalerie persévérante',
    buff: '10 % de résistance de première ligne',
  },
  '24ffc526:node_3': {
    name: 'Archers courageux',
    buff: '10 % de puissance de première ligne',
  },
  '24ffc526:node_4': {
    name: 'Archers persévérants',
    buff: '10 % de résistance de première ligne',
  },
  '24ffc526:node_5': {
    name: 'Fantassins courageux',
    buff: '10 % de puissance de première ligne',
  },
  '24ffc526:node_6': {
    name: 'Fantassins persévérants',
    buff: '10 % de résistance de première ligne',
  },
  '24ffc526:node_7': {
    name: 'Résistance de première ligne',
    buff: '10 % de résistance tactique de toutes les unités de première ligne',
  },
  '24ffc526:node_8': {
    name: 'Raid des fantassins',
    buff: '100 % de vitesse de marche des fantassins',
  },
  '24ffc526:node_9': {
    name: 'Raid des archers',
    buff: '100 % de vitesse de marche des archers',
  },
  '24ffc526:node_10': {
    name: 'Charge en avant',
    buff: '10 % de puissance de la cavalerie si la légion est entièrement composée de cavalerie',
  },
  '24ffc526:node_11': {
    name: 'Formation d’avancée — Cavalerie',
    buff: '10 % de puissance de ligne centrale',
  },
  '24ffc526:node_12': {
    name: 'Formation d’avancée — Archers',
    buff: '10 % de puissance de ligne centrale',
  },
  '24ffc526:node_13': {
    name: 'Formation d’avancée — Fantassins',
    buff: '10 % de puissance de ligne centrale',
  },
  '24ffc526:node_14': {
    name: 'Protection latérale — Cavalerie',
    buff: '10 % de résistance de ligne centrale',
  },
  '24ffc526:node_15': {
    name: 'Protection latérale — Archers',
    buff: '10 % de résistance de ligne centrale',
  },
  '24ffc526:node_16': {
    name: 'Protection latérale — Fantassins',
    buff: '10 % de résistance de ligne centrale',
  },
  '24ffc526:node_17': {
    name: 'Force centrale',
    buff: '10 % de puissance tactique de toutes les unités de la ligne centrale',
  },
  '24ffc526:node_18': {
    name: 'Force principale — Cavalerie',
    buff: '10 % de puissance de dernière ligne',
  },
  '24ffc526:node_19': {
    name: 'Force principale — Archers',
    buff: '10 % de puissance de dernière ligne',
  },
  '24ffc526:node_20': {
    name: 'Force principale — Fantassins',
    buff: '10 % de puissance de dernière ligne',
  },
  '24ffc526:node_21': {
    name: 'Tactique secrète — Cavalerie',
    buff: '10 % de résistance de dernière ligne',
  },
  '24ffc526:node_22': {
    name: 'Tactique secrète — Archers',
    buff: '10 % de résistance de dernière ligne',
  },
  '24ffc526:node_23': {
    name: 'Tactique secrète — Fantassins',
    buff: '10 % de résistance de dernière ligne',
  },
  '24ffc526:node_24': {
    name: 'Force de commandement',
    buff: '10 % de puissance tactique de toutes les unités de la ligne arrière',
  },
  '24ffc526:node_25': {
    name: 'Puissance concentrée',
    buff: '10 % de puissance de ligne arrière',
  },
  '24ffc526:node_26': {
    name: 'Mouvement coordonné',
    buff: '10 % de puissance de ligne centrale',
  },
  '24ffc526:node_27': {
    name: 'Progression de la ligne de front',
    buff: '10 % de puissance de première ligne',
  },
  '24ffc526:node_28': {
    name: 'Défense pivot',
    buff: '10 % de résistance de ligne centrale',
  },
  '24ffc526:node_29': {
    name: '« Couvrez-moi ! »',
    buff: '10 % de résistance de ligne arrière',
  },
  '24ffc526:node_30': {
    name: 'Résistance aux impacts',
    buff: '10 % de résistance de première ligne',
  },
  '24ffc526:node_31': {
    name: 'Combat rapproché',
    buff: 'PV de la première ligne +10 %',
  },
  '24ffc526:node_32': {
    name: 'Force centrale',
    buff: '20 % de puissance tactique ligne centrale',
  },
  '24ffc526:node_33': {
    name: 'Résistance centrale',
    buff: '20 % de résistance tactique ligne centrale',
  },
  '24ffc526:node_34': {
    name: 'Frappe robuste',
    buff: '5 % de dégâts ligne arrière',
  },
  '2c49bd2a:node_1': {
    name: 'Siège planifié',
    buff: 'Puissance tactique en défense de siège +10 %',
  },
  '2c49bd2a:node_2': {
    name: 'Défense solide des fantassins',
    buff: 'Résistance des fantassins en combats hors siège +5 %',
  },
  '2c49bd2a:node_3': {
    name: 'Défense solide de la cavalerie',
    buff: 'Résistance de la cavalerie en combats hors siège +5 %',
  },
  '2c49bd2a:node_4': {
    name: 'Défense solide des archers',
    buff: 'Résistance des archers en combats hors siège +5 %',
  },
  '2c49bd2a:node_5': {
    name: 'Fantassins brise-portes',
    buff: 'Puissance de siège des fantassins augmentée de +5 %',
  },
  '2c49bd2a:node_6': {
    name: 'Cavalerie d’assaut du château',
    buff: 'Puissance de siège de la cavalerie augmentée de +5 %',
  },
  '2c49bd2a:node_7': {
    name: 'Archers paralysants',
    buff: 'Puissance de siège des archers augmentée de +5 %',
  },
  '2c49bd2a:node_8': {
    name: 'Tactiques étonnamment utiles',
    buff: 'Puissance tactique en combats hors siège +10 %',
  },
  '2c49bd2a:node_9': {
    name: 'Ligne défensive des fantassins',
    buff: 'Résistance de siège des fantassins augmentée de +5 %',
  },
  '2c49bd2a:node_10': {
    name: 'Cavalerie barricade',
    buff: 'Résistance de siège de la cavalerie augmentée de +5 %',
  },
  '2c49bd2a:node_11': {
    name: 'Défense arrière des archers',
    buff: 'Résistance de siège des archers augmentée de +5 %',
  },
  '2c49bd2a:node_12': {
    name: 'Brise-rempart',
    buff: 'Puissance des fantassins en défense de siège +5 %',
  },
  '2c49bd2a:node_13': {
    name: 'Charge de cavalerie',
    buff: 'Puissance de la cavalerie en défense de siège +5 %',
  },
  '2c49bd2a:node_14': {
    name: 'Pluie de flèches',
    buff: 'Puissance des archers en défense de siège +5 %',
  },
  '2c49bd2a:node_15': {
    name: 'Stratagème de siège',
    buff: 'Puissance tactique en attaques de siège +10 %',
  },
  '2c49bd2a:node_16': {
    name: 'Gardes sur les remparts',
    buff: 'Puissance en défense de siège des fantassins +5 %',
  },
  '2c49bd2a:node_17': {
    name: 'Bouclier d’or de la cavalerie',
    buff: 'Puissance en défense de siège de la cavalerie +5 %',
  },
  '2c49bd2a:node_18': {
    name: 'Défense de tour des archers',
    buff: 'Puissance en défense de siège des archers +5 %',
  },
  '2c49bd2a:node_19': {
    name: 'Percée des fantassins',
    buff: 'Puissance des fantassins en combats hors siège +5 %',
  },
  '2c49bd2a:node_20': {
    name: 'Raid de la cavalerie',
    buff: 'Puissance de la cavalerie en combats hors siège +5 %',
  },
  '2c49bd2a:node_21': {
    name: 'Frappe à distance des archers',
    buff: 'Puissance des archers en combats hors siège +5 %',
  },
  '2c49bd2a:node_22': {
    name: 'Armée au complet',
    buff: 'Si la puissance de l’escouade dépasse 90 %, réduction des dégâts +5 %',
  },
  '2c49bd2a:node_23': {
    name: 'Assaut fulgurant des fantassins',
    buff: 'Puissance des fantassins +5 %',
  },
  '2c49bd2a:node_24': {
    name: 'Piétinement des fantassins',
    buff: 'Résistance des fantassins +5 %',
  },
  '2c49bd2a:node_25': {
    name: 'Raid de la cavalerie',
    buff: 'Puissance de la cavalerie +5 %',
  },
  '2c49bd2a:node_26': {
    name: 'Cavalerie de garnison',
    buff: 'Résistance de la cavalerie +5 %',
  },
  '2c49bd2a:node_27': {
    name: 'Tir des archers',
    buff: 'Puissance des archers +5 %',
  },
  '2c49bd2a:node_28': {
    name: 'Archers de garnison',
    buff: 'Résistance des archers +5 %',
  },
  '2c49bd2a:node_29': {
    name: 'Renforts avisés',
    buff: 'Résistance tactique +10 %',
  },
  '2c49bd2a:node_30': {
    name: 'Exercice rapide des fantassins',
    buff: 'Vitesse d’entraînement des fantassins +10 %',
  },
  '2c49bd2a:node_31': {
    name: 'Exercice rapide de la cavalerie',
    buff: 'Vitesse d’entraînement de la cavalerie +10 %',
  },
  '2c49bd2a:node_32': {
    name: 'Exercice rapide des archers',
    buff: 'Vitesse d’entraînement des archers +10 %',
  },
  '2c49bd2a:node_33': {
    name: 'Piétinement des fantassins',
    buff: 'Résistance des fantassins +10 %',
  },
  '2c49bd2a:node_34': {
    name: 'Cavalerie de garnison',
    buff: 'Résistance de la cavalerie +10 %',
  },
  '2c49bd2a:node_35': {
    name: 'Archers de garnison',
    buff: 'Résistance des archers +10 %',
  },
  '2c49bd2a:node_36': {
    name: 'Assaut fulgurant des fantassins',
    buff: 'Puissance des fantassins +10 %',
  },
  '2c49bd2a:node_37': {
    name: 'Raid de la cavalerie',
    buff: 'Puissance de la cavalerie +10 %',
  },
  '2c49bd2a:node_38': {
    name: 'Tir des archers',
    buff: 'Puissance des archers +10 %',
  },
  '2c49bd2a:node_39': {
    name: 'Soldat déterminé',
    buff: 'PV de toutes les unités +10 %',
  },
  '2c49bd2a:node_40': {
    name: 'Entraînement intensif des fantassins',
    buff: 'Réduction du coût d’entraînement des fantassins niv. 10 : +10 %',
  },
  '2c49bd2a:node_41': {
    name: 'Entraînement intensif de la cavalerie',
    buff: 'Réduction du coût d’entraînement de la cavalerie niv. 10 : +10 %',
  },
  '2c49bd2a:node_42': {
    name: 'Entraînement intensif des archers',
    buff: 'Réduction du coût d’entraînement des archers niv. 10 : +10 %',
  },
  '2c49bd2a:node_43': {
    name: 'Avancée sans hésitation',
    buff: 'Dégâts infligés par les fantassins +5 %',
  },
  '2c49bd2a:node_44': {
    name: 'Cavalerie brise-formation',
    buff: 'Dégâts infligés par la cavalerie +5 %',
  },
  '2c49bd2a:node_45': {
    name: 'Déluge de flèches',
    buff: 'Dégâts infligés par les archers +5 %',
  },
  'fc190e81:node_1': {
    name: 'Source de vie I',
    buff: '+8 % de PV pour toutes les troupes',
  },
  'fc190e81:node_2': {
    name: 'Progression de la ligne de front',
    buff: '+8 % de puissance de première ligne',
  },
  'fc190e81:node_3': {
    name: 'Mouvement coordonné',
    buff: '+8 % de puissance de ligne centrale',
  },
  'fc190e81:node_4': {
    name: 'Puissance concentrée',
    buff: '+8 % de puissance de ligne arrière',
  },
  'fc190e81:node_5': {
    name: 'Fantassins armés I',
    buff: '+8 % de résistance des fantassins',
  },
  'fc190e81:node_6': {
    name: 'Archers armés I',
    buff: '+8 % de résistance des archers',
  },
  'fc190e81:node_7': {
    name: 'Cavalerie armée I',
    buff: '+8 % de résistance de la cavalerie',
  },
  'fc190e81:node_8': {
    name: 'Bouclier du sang de dragon I',
    buff: '-5 % de dégâts subis',
  },
  'fc190e81:node_9': {
    name: 'Résistance aux impacts',
    buff: '+8 % de résistance de première ligne',
  },
  'fc190e81:node_10': {
    name: 'Défense pivot',
    buff: '+8 % de résistance de ligne centrale',
  },
  'fc190e81:node_11': {
    name: 'Couvrez-moi',
    buff: '+8 % de résistance de ligne arrière',
  },
  'fc190e81:node_12': {
    name: 'Lame des fantassins I',
    buff: '+8 % de puissance des fantassins',
  },
  'fc190e81:node_13': {
    name: 'Flèche trempée I',
    buff: '+8 % de puissance des archers',
  },
  'fc190e81:node_14': {
    name: 'Cavalier lourd I',
    buff: '+8 % de puissance de la cavalerie',
  },
  'fc190e81:node_15': {
    name: 'Entraînement accéléré',
    buff: 'Vitesse d’entraînement augmentée de +5 %',
  },
  'fc190e81:node_16': {
    name: 'Escrime intensive I',
    buff: '+10 % de PV des fantassins',
  },
  'fc190e81:node_17': {
    name: 'Archerie intensive I',
    buff: '+10 % de PV des archers',
  },
  'fc190e81:node_18': {
    name: 'Équitation intensive I',
    buff: '+10 % de PV de la cavalerie',
  },
  'fc190e81:node_19': {
    name: 'Puissance du sang de dragon',
    buff: '+5 % de dégâts infligés',
  },
  'fc190e81:node_20': {
    name: 'Charge',
    buff: '+12 % de puissance de siège',
  },
  'fc190e81:node_21': {
    name: 'Ralliement',
    buff: '+12 % de puissance en défense de siège',
  },
  'fc190e81:node_22': {
    name: 'Guérilla',
    buff: '+12 % de puissance en combat hors siège',
  },
  'fc190e81:node_23': {
    name: 'Posture de combat',
    buff: '+12 % de résistance de siège',
  },
  'fc190e81:node_24': {
    name: 'Posture défensive',
    buff: '+12 % de résistance en défense de siège',
  },
  'fc190e81:node_25': {
    name: 'Posture du gladiateur',
    buff: '+12 % de résistance en combat hors siège',
  },
  'fc190e81:node_26': {
    name: 'Source de vie II',
    buff: '+12 % de PV pour toutes les troupes',
  },
  'fc190e81:node_27': {
    name: 'Progression de la ligne de front II',
    buff: '+12 % de puissance de première ligne',
  },
  'fc190e81:node_28': {
    name: 'Résistance aux impacts II',
    buff: '+12 % de résistance de première ligne',
  },
  'fc190e81:node_29': {
    name: 'Mouvement coordonné II',
    buff: '+12 % de puissance de ligne centrale',
  },
  'fc190e81:node_30': {
    name: 'Défense pivot II',
    buff: '+12 % de résistance de ligne centrale',
  },
  'fc190e81:node_31': {
    name: 'Puissance concentrée II',
    buff: '+12 % de puissance de ligne arrière',
  },
  'fc190e81:node_32': {
    name: 'Couvrez-moi II',
    buff: '+12 % de résistance de ligne arrière',
  },
  'fc190e81:node_33': {
    name: 'Soins du sang de dragon',
    buff: 'Vitesse de soin augmentée de +5 %',
  },
  'fc190e81:node_34': {
    name: 'Lame des fantassins II',
    buff: '+20 % de puissance des fantassins',
  },
  'fc190e81:node_35': {
    name: 'Flèche trempée II',
    buff: '+20 % de puissance des archers',
  },
  'fc190e81:node_36': {
    name: 'Cavalier lourd II',
    buff: '+20 % de puissance de la cavalerie',
  },
  'fc190e81:node_37': {
    name: 'Fantassins armés II',
    buff: '+20 % de résistance des fantassins',
  },
  'fc190e81:node_38': {
    name: 'Archers armés II',
    buff: '+20 % de résistance des archers',
  },
  'fc190e81:node_39': {
    name: 'Cavalerie armée II',
    buff: '+20 % de résistance de la cavalerie',
  },
  'fc190e81:node_40': {
    name: 'Bouclier du sang de dragon II',
    buff: '-5 % de dégâts subis',
  },
  'fc190e81:node_41': {
    name: 'Escrime intensive II',
    buff: '+30 % de PV des fantassins',
  },
  'fc190e81:node_42': {
    name: 'Archerie intensive II',
    buff: '+30 % de PV des archers',
  },
  'fc190e81:node_43': {
    name: 'Équitation intensive II',
    buff: '+30 % de PV de la cavalerie',
  },
  '19ae0569:node_1': {
    name: 'Sauvetage bien préparé',
    buff: 'Résistance de l’allié renforcé +10 %',
  },
  '19ae0569:node_2': {
    name: 'Maître d’entraînement',
    buff: '+3000 troupes entraînées',
  },
  '19ae0569:node_3': {
    name: 'Défense coordonnée',
    buff: 'Résistance +10 % lorsque vous recevez des renforts',
  },
  '19ae0569:node_4': {
    name: 'Coopération parfaite',
    buff: 'Puissance +10 % lorsque vous envoyez des renforts',
  },
  '19ae0569:node_5': {
    name: 'Maître du renforcement',
    buff: 'Capacité de troupes renforcées +20000',
  },
  '19ae0569:node_6': {
    name: 'Riposte',
    buff: 'Puissance de l’allié +10 % lorsque vous recevez des renforts',
  },
  '19ae0569:node_7': {
    name: 'Frénésie des fantassins I',
    buff: '+10 % de PV des fantassins',
  },
  '19ae0569:node_8': {
    name: 'Cavalerie au combat I',
    buff: '+10 % de puissance de la cavalerie',
  },
  '19ae0569:node_9': {
    name: 'Frénésie des archers I',
    buff: '+10 % de PV des archers',
  },
  '19ae0569:node_10': {
    name: 'Hôpital de campagne',
    buff: '+150k capacité de l’hôpital',
  },
  '19ae0569:node_11': {
    name: 'Frénésie des fantassins II',
    buff: '+10 % de PV des fantassins',
  },
  '19ae0569:node_12': {
    name: 'Cavalerie au combat II',
    buff: '+10 % de puissance de la cavalerie',
  },
  '19ae0569:node_13': {
    name: 'Frénésie des archers II',
    buff: '+10 % de PV des archers',
  },
  '19ae0569:node_14': {
    name: 'Extension des fantassins I',
    buff: '+500k de capacité de fantassins d’élite',
  },
  '19ae0569:node_15': {
    name: 'Extension de la cavalerie I',
    buff: '+500k de capacité de cavalerie d’élite',
  },
  '19ae0569:node_16': {
    name: 'Extension des archers I',
    buff: '+500k de capacité d’archers d’élite',
  },
  '19ae0569:node_17': {
    name: 'Perfectionnement des armures',
    buff: '+5 % de résistance',
  },
  '19ae0569:node_18': {
    name: 'Raid des fantassins',
    buff: '+10 % de puissance tactique des fantassins',
  },
  '19ae0569:node_19': {
    name: 'Assaut de la cavalerie',
    buff: '+10 % de puissance tactique de la cavalerie',
  },
  '19ae0569:node_20': {
    name: 'Tir des archers',
    buff: '+10 % de puissance tactique des archers',
  },
  '19ae0569:node_21': {
    name: 'Bouclier des fantassins',
    buff: '+10 % de résistance tactique des fantassins',
  },
  '19ae0569:node_22': {
    name: 'Cavalerie en arrière-garde',
    buff: '+10 % de résistance tactique de la cavalerie',
  },
  '19ae0569:node_23': {
    name: 'Couverture des archers',
    buff: '+10 % de résistance tactique des archers',
  },
  '19ae0569:node_24': {
    name: 'Extension des fantassins II',
    buff: '+500k de capacité de fantassins d’élite',
  },
  '19ae0569:node_25': {
    name: 'Extension de la cavalerie II',
    buff: '+500k de capacité de cavalerie d’élite',
  },
  '19ae0569:node_26': {
    name: 'Extension des archers II',
    buff: '+500k de capacité d’archers d’élite',
  },
  '19ae0569:node_27': {
    name: 'Trempe des lames',
    buff: '+5 % de puissance',
  },
  '19ae0569:node_28': {
    name: 'Bouclier d’acier',
    buff: '+10 % de résistance des fantassins d’élite',
  },
  '19ae0569:node_29': {
    name: 'Barde',
    buff: '+10 % de résistance de la cavalerie d’élite',
  },
  '19ae0569:node_30': {
    name: 'Gantelets',
    buff: '+10 % de résistance des archers d’élite',
  },
  '19ae0569:node_31': {
    name: 'Épée d’acier',
    buff: '+10 % de puissance des fantassins d’élite',
  },
  '19ae0569:node_32': {
    name: 'Lance affûtée',
    buff: '+10 % de puissance de la cavalerie d’élite',
  },
  '19ae0569:node_33': {
    name: 'Arbalète',
    buff: '+10 % de puissance des archers d’élite',
  },
  '19ae0569:node_34': {
    name: 'Grande extension des fantassins',
    buff: '+1m de capacité de fantassins d’élite',
  },
  '19ae0569:node_35': {
    name: 'Grande extension de la cavalerie',
    buff: '+1m de capacité de cavalerie d’élite',
  },
  '19ae0569:node_36': {
    name: 'Grande extension des archers',
    buff: '+1m de capacité d’archers d’élite',
  },
  '19ae0569:node_37': {
    name: 'Bénédiction de vie',
    buff: '+5 % de PV pour les troupes d’élite',
  },
});

export default Object.freeze({ trees, nodes });
