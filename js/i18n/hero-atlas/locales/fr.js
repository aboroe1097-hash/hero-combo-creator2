const skills = {
  'Immortal:2': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 ennemi al\u00e9atoire',
    desc: "Apr\u00e8s une attaque normale, 40 % de chances d'attaquer 1 escouade ennemie al\u00e9atoire dans la port\u00e9e valide \u00e0 2 reprises, avec 348 % de d\u00e9g\u00e2ts inflig\u00e9s \u00e0 chaque fois.",
  },
  'Immortal:5': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 ennemi al\u00e9atoire',
    desc: "Apr\u00e8s une attaque normale\u00a0: il y a 34\u00a0% de chances d'infliger 465\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e et de donner le statut Silence \u00e0 l'escouade ennemie, incapable d'utiliser la comp\u00e9tence de combat pendant 1 tour.",
  },
  'Immortal:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: 'Augmente les d\u00e9g\u00e2ts de 80\u00a0% pour la l\u00e9gion dans laquelle se trouve le h\u00e9ros.',
  },
  'Wind-Walker:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Chaque fois que l'escouade subit une attaque normale, elle obtient Premiers soins et r\u00e9cup\u00e8re des troupes \u00e0 chaque tour (taux de r\u00e9cup\u00e9ration\u00a0: 20%). L'effet dure 2 tours et peut se cumuler jusqu'\u00e0 8 fois.",
  },
  'Wind-Walker:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "60\u00a0% de chances d'infliger 331\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies \u00e0 port\u00e9e et d'infliger 331\u00a0% de d\u00e9g\u00e2ts \u00e0 votre propre escouade.",
  },
  'Wind-Walker:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "50\u00a0% de chances de provoquer 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e pendant 2 tours. Votre escouade obtient Contre-attaque\u00a0: lorsqu'elle subit une attaque normale, elle riposte avec 150\u00a0% de d\u00e9g\u00e2ts et gagne 100\u00a0% de R\u00e9sistance. Dure 2 tours.",
  },
  'Hunk:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Lorsque l'escouade subit des d\u00e9g\u00e2ts, 25\u00a0% de chances d'esquiver (immunis\u00e9e contre ces d\u00e9g\u00e2ts), 50\u00a0% de chances \u00e0 chaque tour d'augmenter les d\u00e9g\u00e2ts de l'escouade de 50\u00a0%.",
  },
  'Hunk:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "30\u00a0% de chances d'appliquer Confusion (les comp\u00e9tences et attaques normales ciblent al\u00e9atoirement) et Inflammable (50\u00a0% de d\u00e9g\u00e2ts de br\u00fblure suppl\u00e9mentaires subis) \u00e0 2 escouades ennemies al\u00e9atoires pendant 2 tours.",
  },
  'Hunk:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "6 premiers tours, toutes les escouades alli\u00e9es ont 37 vitesses de combat accrues, 50\u00a0% des d\u00e9g\u00e2ts subis seront comptabilis\u00e9s au tour 7, le tour d'avant-combat inflige 469\u00a0% de d\u00e9g\u00e2ts \u00e0 2 ennemis al\u00e9atoires.",
  },
  'Sakura:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: 'Pendant les 2 premiers tours, 2 ennemis al\u00e9atoires agiront en premier. Au deuxi\u00e8me tour, inflige 687% de d\u00e9g\u00e2ts \u00e0 2 escouades choisies parmi 2 escouades ennemies al\u00e9atoires.',
  },
  'Sakura:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: 'Les 3 premiers tours, 2 escouades ennemies al\u00e9atoires subissent 50 % de d\u00e9g\u00e2ts suppl\u00e9mentaires.',
  },
  'Sakura:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "Les 3 premiers tours, 2 escouades d'archers alli\u00e9s al\u00e9atoires infligent 50 % de d\u00e9g\u00e2ts suppl\u00e9mentaires.",
  },
  'ELK:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Durant les 3 premiers tours, l'escouade d'archers de premi\u00e8re ligne a 70\u00a0% de chances d'entrer en \u00e9tat de contre-attaque, qui inflige 250\u00a0% de d\u00e9g\u00e2ts en retour \u00e0 la source lors d'une Attaque normale.",
  },
  'ELK:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "Aux tours 1/3/5, 100\u00a0% de chances d'infliger 220\u00a0% de d\u00e9g\u00e2ts \u00e0 3 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e et de leur appliquer Vuln\u00e9rable. Chaque cible subit alors 15\u00a0% de d\u00e9g\u00e2ts de plus qu'au tour pr\u00e9c\u00e9dent pendant 1 tour.",
  },
  'ELK:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: 'Durant les trois premiers tours, 2 escouades alli\u00e9es al\u00e9atoires ont 70 % de chances de devenir In\u00e9branlables, donc immunis\u00e9es contre Silence, D\u00e9sarmement, Suppression et Confusion. Leur Puissance augmente aussi de 55 %.',
  },
  'Mary Tudor:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "60\u00a0% de chances d'infliger 325\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e. Si les troupes de la cible sont sous 50 %, inflige 195 % de d\u00e9g\u00e2ts suppl\u00e9mentaires.",
  },
  'Mary Tudor:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Chaque fois que Mary I lance une comp\u00e9tence de combat, son \u00e9quipe inflige +25 % de d\u00e9g\u00e2ts de comp\u00e9tence (cumulable jusqu'\u00e0 6 fois) jusqu'\u00e0 la fin de la bataille.",
  },
  'Mary Tudor:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50\u00a0% de chances d'infliger 368\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e et de leur appliquer Saignement. Elles subissent alors 155\u00a0% de d\u00e9g\u00e2ts au d\u00e9but de chaque tour, avant d'agir, pendant 2 tours.",
  },
  'Cicero:2': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '2 ennemis al\u00e9atoires',
    desc: "Apr\u00e8s les Attaques normales, 30 % de chances d'infliger 310 % de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e, leur faisant subir 20 % de d\u00e9g\u00e2ts suppl\u00e9mentaires pendant 2 tours.",
  },
  'Cicero:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "60\u00a0% de chances que 2 escouades ennemies al\u00e9atoires entrent dans le statut de rupture d'armure, r\u00e9duction de -200\u00a0% de la d\u00e9fense, dure 2 tours.",
  },
  'Cicero:8': {
    type: 'Comp\u00e9tence de combat',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "50% de chances d'\u00eatre au premier rang pour avoir 100% de chances d'\u00e9vasion sur les 3 prochains d\u00e9g\u00e2ts subis, durant 2 tours.",
  },
  'Beowulf:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Apr\u00e8s chaque attaque normale, les d\u00e9g\u00e2ts d'attaque normale du h\u00e9ros augmentent de 20 %, jusqu'\u00e0 5 cumuls. Au maximum, le h\u00e9ros obtient Attaque de masse et inflige aux deux escouades ennemies autres que la cible 260\u00a0% + nombre de cumuls de Fr\u00e9n\u00e9sie *50\u00a0% de d\u00e9g\u00e2ts. Ces d\u00e9g\u00e2ts peuvent \u00eatre critiques et ont 100\u00a0% de chances d'ignorer l'Esquive.",
  },
  'Beowulf:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 ennemi al\u00e9atoire',
    desc: 'Toutes les 2 attaques normales, restaure les troupes du h\u00e9ros et de 1 escouade alli\u00e9e al\u00e9atoire (taux de r\u00e9cup\u00e9ration\u00a0: 75 %), puis inflige 350 % de d\u00e9g\u00e2ts physiques \u00e0 1 escouade ennemie al\u00e9atoire. Ces d\u00e9g\u00e2ts peuvent d\u00e9clencher Coup fatal et D\u00e9sarment la cible pendant 1 tour.',
  },
  'Beowulf:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Gagne 20\u00a0% de chances de Coup fatal. Apr\u00e8s chaque soin re\u00e7u, gagne Fr\u00e9n\u00e9sie et 10\u00a0% de chances suppl\u00e9mentaires de Coup fatal, jusqu'\u00e0 8 cumuls et jusqu'\u00e0 la fin du combat. Le h\u00e9ros a aussi 90\u00a0% de chances de dissiper tous ses effets n\u00e9gatifs et de devenir In\u00e9branlable, donc immunis\u00e9 aux contr\u00f4les jusqu'\u00e0 sa prochaine action.",
  },
  'Theodora:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "60\u00a0% de chances d'infliger 20\u00a0% de d\u00e9g\u00e2ts de comp\u00e9tence \u00e0 1 escouade amie al\u00e9atoire, \u00e0 l'exclusion de l'escouade des h\u00e9ros, ce qui fait que les escouades cibles infligent 50\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires, pendant 2 tours.",
  },
  'Theodora:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires',
    desc: "Lorsque le h\u00e9ros subit des d\u00e9g\u00e2ts, 40 % de chances d'infliger 160 % de d\u00e9g\u00e2ts de comp\u00e9tence \u00e0 toutes les escouades ennemies, avec 40 % de chances de les soumettre \u00e0 1 statut al\u00e9atoire parmi Supprim\u00e9/R\u00e9duit au silence/D\u00e9sarm\u00e9/Confus, durant 2 tours.",
  },
  'Theodora:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Lorsque l'escouade de premi\u00e8re ligne inflige des d\u00e9g\u00e2ts, elle restaure des troupes \u00e0 hauteur de 60 % des d\u00e9g\u00e2ts inflig\u00e9s. Dure 6 tours et peut s'activer jusqu'\u00e0 2 fois par tour. Si l'escouade de premi\u00e8re ligne est vaincue, le h\u00e9ros continue de combattre pendant 1 tour suppl\u00e9mentaire. Sans effet contre les Gardiens du territoire.",
  },
  'Caesar:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "\u00c0 partir du tour 3, Caesar a 40% de chances de lancer une comp\u00e9tence \u00e0 chaque tour, augmentant de 200% la Puissance et la R\u00e9sistance de toutes vos escouades de cavalerie, et leurs d\u00e9g\u00e2ts de 60%. Caesar gagne aussi 20% de chances de lancer une Attaque suppl\u00e9mentaire jusqu'\u00e0 la fin du combat (cette comp\u00e9tence ne peut \u00eatre lanc\u00e9e qu'une seule fois). Chaque tour, ses chances de lancement augmentent de 20%.",
  },
  'Caesar:5': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '2 ennemis al\u00e9atoires',
    desc: "Apr\u00e8s une attaque normale, 60 % de chances d'infliger des d\u00e9g\u00e2ts physiques \u00e0 2 escouades ennemies al\u00e9atoires (taux de d\u00e9g\u00e2ts\u00a0: 480 %). 50% des d\u00e9g\u00e2ts restaurent les troupes de 2 escouades alli\u00e9es al\u00e9atoires. La comp\u00e9tence entre ensuite en recharge pendant 1 tour. La premi\u00e8re Esquive r\u00e9ussie de chaque tour a 100\u00a0% de chances de la d\u00e9clencher sans activer sa recharge.",
  },
  'Caesar:8': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '3 ennemis al\u00e9atoires',
    desc: "Apr\u00e8s une attaque normale, 50 % de chances d'infliger des d\u00e9g\u00e2ts physiques \u00e0 2-3 escouades (taux de d\u00e9g\u00e2ts\u00a0: 310 %). Chaque lancement augmente le multiplicateur de d\u00e9g\u00e2ts de Souverain absolu de 1. Cet effet se cumule jusqu'\u00e0 la fin du combat. La comp\u00e9tence ne peut s'activer qu'une fois par tour.",
  },
  'Octavius:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Octavius a 80 % de chances de b\u00e9n\u00e9ficier de l'effet Provocation \u00e0 chaque tour. Lorsqu'une escouade al\u00e9atoire doit \u00eatre poursuivie par la comp\u00e9tence active de l'ennemi ou par une attaque suppl\u00e9mentaire, Octavius sera choisi en premier. Les chances de lancer cette comp\u00e9tence diminuent de 5 % \u00e0 chaque tour.",
  },
  'Octavius:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Octavius b\u00e9n\u00e9ficie de -25% de d\u00e9g\u00e2ts subis. Au d\u00e9but du combat, les escouades des rang\u00e9es du milieu et arri\u00e8re obtiennent Esquive, ce qui annule les 3 prochaines instances de d\u00e9g\u00e2ts pendant 2 tours. Chaque fois qu'Octavius subit des d\u00e9g\u00e2ts, il a 100% de chances d'augmenter de 30% la Puissance de 1 escouade de cavalerie alli\u00e9e al\u00e9atoire [300% max]. Se cumule jusqu'\u00e0 10 fois par escouade.",
  },
  'Octavius:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: 'La premi\u00e8re fois que les PV passent sous 85 %, toutes vos escouades b\u00e9n\u00e9ficient de -50 % de d\u00e9g\u00e2ts de comp\u00e9tence subis pendant 3 tours. Sous 50 %, toutes les escouades ennemies subissent imm\u00e9diatement des d\u00e9g\u00e2ts physiques (taux de d\u00e9g\u00e2ts\u00a0: 350 %). Sous 25%, elles en subissent \u00e0 nouveau (taux de d\u00e9g\u00e2ts\u00a0: 350%). Chaque activation augmente la R\u00e9sistance du h\u00e9ros de 150 %.',
  },
  'Boudica:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: 'Boudica charge. 70\u00a0% de chances de frapper 3 fois de suite 1 escouade ennemie de la rang\u00e9e du milieu ou arri\u00e8re \u00e0 port\u00e9e, en infligeant 200\u00a0% de d\u00e9g\u00e2ts par frappe. 40% des d\u00e9g\u00e2ts restaurent les troupes de 2 escouades alli\u00e9es al\u00e9atoires.',
  },
  'Boudica:5': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Boudica b\u00e9n\u00e9ficie d'une protection naturelle permanente. Lorsque vous infligez des d\u00e9g\u00e2ts de comp\u00e9tence, 30\u00a0% de chances de provoquer une frappe destructrice sur la cible\u00a0; si Boudica agit avant toutes les escouades ennemies, augmente ses chances de lancer des comp\u00e9tences et des frappes destructrices de 20\u00a0% au prix de l'emp\u00eacher de lancer des attaques normales.",
  },
  'Boudica:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 ennemi al\u00e9atoire',
    desc: "Avant le combat, applique 5 Marques de lance \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e. Chaque cumul augmente de 10\u00a0% les d\u00e9g\u00e2ts de comp\u00e9tence subis par la cible et annule ses effets de d\u00e9g\u00e2ts diff\u00e9r\u00e9s. Retire 1 cumul par tour. En combat, 60\u00a0% de chances par tour d'infliger 500\u00a0% de d\u00e9g\u00e2ts massifs \u00e0 l'escouade ennemie ayant le moins de troupes.",
  },
  "Jeanne d'Arc:2": {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50\u00a0% de chances d'infliger 477\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e et d'augmenter de 30\u00a0% les d\u00e9g\u00e2ts de comp\u00e9tence qu'elles subissent.",
  },
  "Jeanne d'Arc:5": {
    type: 'Comp\u00e9tence de combat',
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 65\u00a0% de chances d'accorder Ressuscit\u00e9 \u00e0 2 escouades alli\u00e9es al\u00e9atoires pendant 2 tours. Lorsqu'elles subissent des d\u00e9g\u00e2ts, elles ont 50\u00a0% de chances de restaurer des troupes (taux de r\u00e9cup\u00e9ration\u00a0: 101\u00a0%).",
  },
  "Jeanne d'Arc:8": {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "En combat, vos escouades de cavalerie ont 60 % de chances de sauter 1 tour de pr\u00e9paration lorsqu'elles utilisent une comp\u00e9tence de pr\u00e9paration. Cet effet peut s'activer 1 fois par escouade et par tour. L'escouade du h\u00e9ros a aussi 80\u00a0% de chances d'infliger 86\u00a0% de d\u00e9g\u00e2ts de comp\u00e9tence suppl\u00e9mentaires pendant 1 tour. Les deux effets sont calcul\u00e9s s\u00e9par\u00e9ment.",
  },
  'Alfred:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "35\u00a0% de chances d'infliger 335\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies dans la port\u00e9e valide et de r\u00e9duire l'effet de restauration de la puissance des troupes de la cible de -40\u00a0%. Si la cible est d\u00e9j\u00e0 soumise \u00e0 un statut qui l'emp\u00eache de restaurer la puissance des troupes ou freine sa restauration de puissance, la cible subira 30 % de d\u00e9g\u00e2ts de comp\u00e9tence suppl\u00e9mentaires pendant 2 tours.",
  },
  'Alfred:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "30\u00a0% de chances d'infliger 492\u00a0% de d\u00e9g\u00e2ts massifs \u00e0 toutes les escouades ennemies, au prix de faire subir \u00e0 toutes vos escouades 95\u00a0% de d\u00e9g\u00e2ts.",
  },
  'Alfred:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Alfred intervient lorsque la situation devient critique. La premi\u00e8re fois que les troupes de son escouade passent sous 90\u00a0%/70\u00a0%/50\u00a0%/30\u00a0%, sa chance d'utiliser une comp\u00e9tence de combat augmente de 50\u00a0%. Pendant 1 tour, son escouade inflige 40\u00a0% de d\u00e9g\u00e2ts de comp\u00e9tence suppl\u00e9mentaires et b\u00e9n\u00e9ficie de -35\u00a0% de d\u00e9g\u00e2ts subis.",
  },
  'Ramses II:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Pendant les 2 premiers tours, toutes les escouades alli\u00e9es et ennemies b\u00e9n\u00e9ficient de -45% de d\u00e9g\u00e2ts physiques subis. Aux tours 3-6, toutes vos escouades ont 80% de chances d'effectuer 2 attaques normales par tour.",
  },
  'Ramses II:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "En combat, toutes vos escouades d'archers gagnent 40 % de chances de Coup fatal. Cette comp\u00e9tence peut porter cette chance jusqu'\u00e0 60\u00a0%. Toute valeur au-del\u00e0 de cette limite est multipli\u00e9e par 3 et convertie en taux de d\u00e9g\u00e2ts de Coup fatal.",
  },
  'Ramses II:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Chaque fois que votre escouade d\u00e9clenche Coup fatal, elle restaure des troupes (taux de r\u00e9cup\u00e9ration\u00a0: 238 %) et augmente de 80 % le taux de d\u00e9g\u00e2ts de ses Coups fatals [560 % max]. Se cumule jusqu'\u00e0 7 fois et dure jusqu'\u00e0 la fin du combat.",
  },
  'Cleopatra VII:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Pendant les 4 premiers tours, l'escouade alli\u00e9e ayant le moins de troupes a 40 % de chances d'esquiver les d\u00e9g\u00e2ts lorsqu'elle est attaqu\u00e9e. \u00c0 partir du tour 4, votre escouade ayant le moins de troupes en restaure une partie (taux de r\u00e9cup\u00e9ration\u00a0: 150 %).",
  },
  'Cleopatra VII:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires',
    desc: "Cleopatra VII hypnotise l'ennemi : toutes les 2 Attaques normales effectu\u00e9es par une escouade ennemie, celle-ci a 50% de chances de subir Confusion et de choisir une cible al\u00e9atoire pour sa comp\u00e9tence ou son Attaque normale pendant 1 tour.",
  },
  'Cleopatra VII:8': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "Lorsque le h\u00e9ros entreprend des actions, 100\u00a0% de chances que l'escouade ennemie confuse reste dans un \u00e9tat vuln\u00e9rable, ce qui signifie que chaque fois qu'elle subit des d\u00e9g\u00e2ts, elle subira 15\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires au moment suivant, pendant 2 tours\u00a0; pendant ce temps, il a 50 % de chances de subir 225 % de d\u00e9g\u00e2ts imm\u00e9diatement.",
  },
  'King Arthur:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Au d\u00e9but du combat, le h\u00e9ros b\u00e9n\u00e9ficie de -80% de d\u00e9g\u00e2ts subis. Chaque fois qu'il subit des d\u00e9g\u00e2ts, cette r\u00e9duction baisse de 8 %, tandis que sa R\u00e9sistance augmente de 20 % et ses d\u00e9g\u00e2ts inflig\u00e9s de 10 %. Se cumule jusqu'\u00e0 16 fois et dure jusqu'\u00e0 la fin du combat.",
  },
  'King Arthur:5': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 ennemi al\u00e9atoire',
    desc: "Arthur brandit son \u00e9p\u00e9e sacr\u00e9e ; apr\u00e8s une attaque normale, 50 % de chances d'infliger 700 % de d\u00e9g\u00e2ts physiques \u00e0 1 escouade ennemie al\u00e9atoire dans la port\u00e9e valide. 40% de ces d\u00e9g\u00e2ts serviront \u00e0 restaurer la puissance des troupes de 2 escouades alli\u00e9es al\u00e9atoires. Apr\u00e8s avoir lanc\u00e9 l'\u00c9p\u00e9e dans la pierre, 50 % de chances de l'appliquer une fois de plus \u00e0 l'escouade ennemie du milieu ou de l'arri\u00e8re-plan.",
  },
  'King Arthur:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Arthur re\u00e7oit en permanence 15 % de soins suppl\u00e9mentaires. Toutes les 6 instances de d\u00e9g\u00e2ts inflig\u00e9es par vos escouades, la chance d'utiliser L'\u00c9p\u00e9e dans la pierre augmente de 4 %, jusqu'\u00e0 5 cumuls et jusqu'\u00e0 la fin du combat. Au maximum, ses d\u00e9g\u00e2ts ont 100\u00a0% de chances d'ignorer l'Esquive pendant 2 tours.",
  },
  'Leonidas:2': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '2 ennemis al\u00e9atoires',
    desc: "Apr\u00e8s une attaque normale, 40\u00a0% de chances d'appliquer -50\u00a0% de Puissance et -50\u00a0% de R\u00e9sistance \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e, puis de leur appliquer Silence pendant 1 tour.",
  },
  'Leonidas:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "50\u00a0% de chances d'infliger 220\u00a0% de d\u00e9g\u00e2ts \u00e0 2-3 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e.",
  },
  'Leonidas:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Pendant les 2 premiers tours, toutes vos escouades d'archers restaurent des troupes \u00e0 chaque tour (taux de r\u00e9cup\u00e9ration\u00a0: 55%). \u00c0 partir du tour 3, elles b\u00e9n\u00e9ficient de -30% de d\u00e9g\u00e2ts subis et gagnent 5% de vol de vie jusqu'\u00e0 la fin du combat.",
  },
  'Isabella I:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "Chaque tour, 70 % de chances de cracher le feu du dragon 6 fois sur 1 escouade ennemie al\u00e9atoire, en infligeant 83 % de d\u00e9g\u00e2ts de br\u00fblure par frappe. Si toutes les escouades ennemies sont touch\u00e9es durant le tour, 1 escouade alli\u00e9e al\u00e9atoire obtient Clart\u00e9 pendant 1 tour, ce qui l'immunise contre Suppression, Silence, D\u00e9sarmement et Confusion.",
  },
  'Isabella I:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: "\u00c0 partir du tour 3, l'escouade du h\u00e9ros reste en feu de fa\u00e7on permanente. Chaque tour, elle a 70% de chances d'infliger 236% de d\u00e9g\u00e2ts de br\u00fblure \u00e0 2 escouades ennemies al\u00e9atoires et de leur appliquer -20% aux d\u00e9g\u00e2ts de comp\u00e9tence de combat.",
  },
  'Isabella I:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Accorde un bouclier aux escouades rendues In\u00e9branlables par la comp\u00e9tence 2\u00a0: elles b\u00e9n\u00e9ficient de -50% de d\u00e9g\u00e2ts subis lors des 2 prochaines instances. La premi\u00e8re fois que le h\u00e9ros prend feu, il restaure fortement les troupes de l'escouade de premi\u00e8re ligne (taux de r\u00e9cup\u00e9ration\u00a0: 304), puis applique Suppression \u00e0 1-2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e pendant le tour 1 suivant.",
  },
  'Desert Storm:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires',
    desc: "Aux tours 1, 3 et 5, faites en sorte que toutes les escouades ennemies entrent maudites, br\u00fblantes et empoisonn\u00e9es et infligent 24\u00a0%, 29\u00a0% et 34\u00a0% de d\u00e9g\u00e2ts aux tours correspondants, jusqu'\u00e0 la fin de la bataille.",
  },
  'Desert Storm:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: 'Au d\u00e9but du tour 5, 2 escouades alli\u00e9es al\u00e9atoires r\u00e9cup\u00e9reront des unit\u00e9s \u00e0 chaque tour (Taux de r\u00e9cup\u00e9ration : 60%).',
  },
  'Desert Storm:8': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "100\u00a0% de chances d'infliger 243\u00a0% de d\u00e9g\u00e2ts \u00e0 une escouade ennemie \u00e0 port\u00e9e, interrompant les comp\u00e9tences de canalisation.",
  },
  'Soaring Hawk:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40% de chances d'infliger 179% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e et de leur appliquer -38% de Puissance pendant 2 tours.",
  },
  'Soaring Hawk:5': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "L'escouade de h\u00e9ros a 100\u00a0% de chances de contre-attaquer lorsqu'elle est attaqu\u00e9e de base, infligeant 120\u00a0% de d\u00e9g\u00e2ts \u00e0 la source attaquante.",
  },
  'Soaring Hawk:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Pendant les 2 premiers tours, toutes les escouades alli\u00e9es b\u00e9n\u00e9ficient de -30\u00a0% de d\u00e9g\u00e2ts subis. Apr\u00e8s le tour 3, l'escouade du h\u00e9ros restaure des troupes \u00e0 hauteur de 30\u00a0% des d\u00e9g\u00e2ts qu'elle inflige.",
  },
  'The Brave:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: '3 premiers tours de la bataille, 80\u00a0% de chances \u00e0 chaque tour de d\u00e9sarmer 2 escouades ennemies \u00e0 port\u00e9e.',
  },
  'The Brave:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 30 % de chances d'appliquer Silence \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e pendant 2 tours.",
  },
  'The Brave:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires',
    desc: 'En combat, toutes les escouades ennemies subissent -60 % de Puissance et de R\u00e9sistance, ainsi que -100 de Vitesse de combat. Elles subissent 5 % de d\u00e9g\u00e2ts suppl\u00e9mentaires et infligent -5 % de d\u00e9g\u00e2ts. \u00c0 partir du tour 5, toutes vos escouades de cavalerie infligent 40 % de d\u00e9g\u00e2ts suppl\u00e9mentaires.',
  },
  'Jade Eagle:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances de lancer 2 attaques qui infligent chacune 142\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e. Chaque attaque a 25\u00a0% de chances d'appliquer Silence aux cibles pendant 1 tour.",
  },
  'Jade Eagle:4': {
    type: 'Comp\u00e9tence de commandement',
    target: 'Escouade du h\u00e9ros',
    desc: "Les archers de l'escouade du h\u00e9ros ont 60 % de puissance augment\u00e9e, 20 % d'augmentation des d\u00e9g\u00e2ts inflig\u00e9s et 20 % d'augmentation des d\u00e9g\u00e2ts subis.",
  },
  'Jade Eagle:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50\u00a0% de chances d'infliger 310\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies, rendant les fantassins ennemis (impossible de r\u00e9cup\u00e9rer les unit\u00e9s) la cavalerie ennemie (d\u00e9g\u00e2ts des comp\u00e9tences de combat -50\u00a0%), les archers ennemis (d\u00e9sarm\u00e9s), pendant 1 tour.",
  },
  'Jade Eagle:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "Aux tours 2 et 4, 100\u00a0% de chances d'infliger 863\u00a0% de d\u00e9g\u00e2ts massifs \u00e0 3 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e\u00a0; si la cible est d\u00e9sarm\u00e9e ou supprim\u00e9e, elle subira 40 % de d\u00e9g\u00e2ts suppl\u00e9mentaires. dur\u00e9e 2 tours.",
  },
  'Immortal Guardian:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "D\u00e9g\u00e2ts subis par l'escouade du h\u00e9ros -30%",
  },
  'Immortal Guardian:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: "En combat, lorsque 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e utilisent une comp\u00e9tence de combat ou une attaque normale, elles subissent -5\u00a0% aux d\u00e9g\u00e2ts inflig\u00e9s. Se cumule jusqu'\u00e0 8 fois.",
  },
  'Immortal Guardian:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "3 premiers tours. D\u00e9g\u00e2ts de toutes les unit\u00e9s frileuses subis -20 %, 50 % de chances de r\u00e9cup\u00e9rer les unit\u00e9s lorsqu'elles subissent des d\u00e9g\u00e2ts (taux de r\u00e9cup\u00e9ration : 45 %).",
  },
  'Divine Arrow:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "25\u00a0% de chances d'infliger 211\u00a0% de d\u00e9g\u00e2ts \u00e0 2 ennemis al\u00e9atoires, en les d\u00e9sarmant pendant 1 tour.",
  },
  'Divine Arrow:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "30\u00a0% de chances de provoquer le statut de Cha\u00eene, reliant 2 ennemis al\u00e9atoires, lorsqu'une escouade subit des d\u00e9g\u00e2ts, l'autre subira \u00e9galement 25\u00a0% de d\u00e9g\u00e2ts, durant 2 tours.",
  },
  'Divine Arrow:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: 'Au combat, tous les archers alli\u00e9s ont le statut D\u00e9g\u00e2ts de zone, les Attaques normales peuvent \u00e9galement infliger 40\u00a0% de d\u00e9g\u00e2ts aux 2 escouades ennemies de la derni\u00e8re rang\u00e9e.',
  },
  'Che Liu:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "L'escouade du h\u00e9ros inflige 50% de d\u00e9g\u00e2ts suppl\u00e9mentaires. Lorsque ses troupes passent sous la moiti\u00e9, elle gagne 100\u00a0% de Puissance et de R\u00e9sistance suppl\u00e9mentaires.",
  },
  'Che Liu:5': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 ennemi al\u00e9atoire',
    desc: "Apr\u00e8s les Attaques normales, 100\u00a0% de chances d'infliger 247\u00a0% de d\u00e9g\u00e2ts \u00e0 une escouade ennemie \u00e0 port\u00e9e",
  },
  'Che Liu:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "100\u00a0% de chances d'effectuer deux attaques normales lorsque la puissance actuelle des troupes tombe en dessous de 50\u00a0% de la quantit\u00e9 au d\u00e9but de la bataille. Lorsque l'escouade de ce h\u00e9ros est vaincue ou a un moral bris\u00e9, ce h\u00e9ros continuera \u00e0 se battre pendant un tour suppl\u00e9mentaire (lors de l'attaque de territoires, si la loyaut\u00e9 de la L\u00e9gion est inf\u00e9rieure au z\u00e8le rebelle, alors le h\u00e9ros ne pourra pas continuer le combat).",
  },
  'War Lord:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "En combat, toutes les escouades de cavalerie alli\u00e9es b\u00e9n\u00e9ficient de -20 % de d\u00e9g\u00e2ts d'attaque normale subis et infligent 45 % de d\u00e9g\u00e2ts de comp\u00e9tence de combat suppl\u00e9mentaires.",
  },
  'War Lord:5': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Durant les 2 premiers tours, chaque fois que l'escouade du h\u00e9ros subit des d\u00e9g\u00e2ts, 70% de chances d'esquiver (Esquiver) et d'\u00e9viter ces d\u00e9g\u00e2ts.",
  },
  'War Lord:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "100% de chances de porter \u00e0 100% les chances finales de lancement de Comp\u00e9tence de combat de 1 escouade alli\u00e9e al\u00e9atoire aux tours 1, 3, 5 et 7. Si la comp\u00e9tence exige une pr\u00e9paration, elle a 60% de chances d'ignorer 1 tour de pr\u00e9paration.",
  },
  'Jane:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration, 35\u00a0% de chances d'infliger 334,5\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies \u00e0 port\u00e9e.",
  },
  'Jane:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "30\u00a0% de chances d'infliger 255\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies \u00e0 port\u00e9e, les rendant incapables de r\u00e9cup\u00e9rer les unit\u00e9s, pendant 2 tours.",
  },
  'Jane:8': {
    type: 'Comp\u00e9tence de combat',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Pendant la bataille, l'escouade de h\u00e9ros ne peut pas lancer d'Attaque normale en \u00e9change d'une augmentation des d\u00e9g\u00e2ts de comp\u00e9tence de combat de 35 % et inflige \u00e9galement 301 % de d\u00e9g\u00e2ts de comp\u00e9tence \u00e0 une escouade ennemie al\u00e9atoire \u00e0 port\u00e9e.",
  },
  'Sky Breaker:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'infliger 325\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires et de leur appliquer -20\u00a0% aux d\u00e9g\u00e2ts de comp\u00e9tence inflig\u00e9s pendant 2 tours.",
  },
  'Sky Breaker:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires',
    desc: "Pendant les 2 premiers tours, applique D\u00e9sarmement \u00e0 2 escouades ennemies al\u00e9atoires, ce qui les emp\u00eache d'effectuer des attaques normales. Au 2\u00e8me tour, inflige 267,5% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies.",
  },
  'Sky Breaker:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50 % de chances d'infliger 260 % de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires et de restaurer vos troupes ainsi que celles d'une escouade alli\u00e9e al\u00e9atoire (taux de r\u00e9cup\u00e9ration : 142 %).",
  },
  'Rokuboshuten:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40% de chances d'infliger 255% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires et de leur appliquer -55% de Puissance et de R\u00e9sistance pendant 2 tours.",
  },
  'Rokuboshuten:5': {
    type: 'Comp\u00e9tence de statut',
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "En combat, chaque fois que le h\u00e9ros utilise une comp\u00e9tence avec pr\u00e9paration, son escouade a 100\u00a0% de chances d'obtenir Clart\u00e9 pendant 2 tours, ce qui l'immunise contre Silence, D\u00e9sarmement, Suppression et Confusion. Apr\u00e8s une comp\u00e9tence de combat, 100\u00a0% de chances d'augmenter de 100\u00a0% la Puissance et la R\u00e9sistance de deux escouades alli\u00e9es al\u00e9atoires pendant 2 tours.",
  },
  'Rokuboshuten:8': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration 40\u00a0% de chances d'infliger 196,5\u00a0% de d\u00e9g\u00e2ts \u00e0 tous les ennemis, les faisant taire, les rendant incapables d'utiliser leurs comp\u00e9tences de combat, pendant 1 tour.",
  },
  'Bleeding Steed:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: 'Les 3 premiers tours, 2 escouades alli\u00e9es ont 60 % de d\u00e9g\u00e2ts suppl\u00e9mentaires.',
  },
  'Bleeding Steed:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50\u00a0% de chances de confondre 2 ennemis al\u00e9atoires, les comp\u00e9tences et les cibles d'Attaque normale deviennent al\u00e9atoires et durent 2 tours.",
  },
  'Bleeding Steed:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: 'Pendant la bataille, lorsque toutes les escouades alli\u00e9es subissent des d\u00e9g\u00e2ts, 50 % de chances de r\u00e9cup\u00e9rer certaines unit\u00e9s (taux de r\u00e9cup\u00e9ration : 33 %).',
  },
  'Rozen Blade:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "30\u00a0% de chances de supprimer le malus de la cavalerie et des archers alli\u00e9s (\u00e0 l'exclusion des malus des comp\u00e9tences de avant-combat), donnez \u00e0 leurs Attaques normales 25\u00a0% de chances de provoquer une suppression d'1 tour, durant 1 tour.",
  },
  'Rozen Blade:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Durant les 3 premiers tours, toutes les escouades alli\u00e9es gagnent 100 en Vitesse de combat et ont 70 % de chances d'effectuer 2 attaques normales par tour (les effets du m\u00eame type ne peuvent pas se cumuler).",
  },
  'Rozen Blade:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: 'Pendant la bataille, chaque fois que 2 escouades ennemies al\u00e9atoires subissent des d\u00e9g\u00e2ts, elles subissent 12 % de d\u00e9g\u00e2ts suppl\u00e9mentaires, maximum 5 cumuls.',
  },
  'Jade:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "1 Tournez la pr\u00e9paration. 40\u00a0% de chances d'attaquer 6 fois, chaque attaque s\u00e9lectionne au hasard une escouade ennemie \u00e0 port\u00e9e, infligeant 162\u00a0% de d\u00e9g\u00e2ts.",
  },
  'Jade:5': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "L'\u00e9quipe avec le h\u00e9ros augmente les d\u00e9g\u00e2ts de 10%. cet effet se cumule une fois par tour.",
  },
  'Jade:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'infliger 160\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades al\u00e9atoires \u00e0 port\u00e9e effective et d'appliquer Mal\u00e9diction \u00e0 une escouade ennemie. Pendant 2 tours, celle-ci subit 80\u00a0% de d\u00e9g\u00e2ts chaque fois qu'elle utilise une comp\u00e9tence de combat.",
  },
  'Witch Hunter:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "30\u00a0% de chances d'infliger 237\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies dans la port\u00e9e valide et de leur infliger le statut Inflammable, augmentant les d\u00e9g\u00e2ts de Br\u00fblure qu'elles subissent de 35\u00a0% pendant 2 tours.",
  },
  'Witch Hunter:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: 'Pendant les trois premiers tours, les D\u00e9g\u00e2ts de comp\u00e9tence de combat de 2 escouades ennemies al\u00e9atoires passent \u00e0 -75%, avec 90% de chances de leur infliger Silence et de les emp\u00eacher de lancer des Comp\u00e9tences de combat pendant le tour 1.',
  },
  'Witch Hunter:8': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'infliger 135\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies \u00e0 port\u00e9e et de leur appliquer Br\u00fblure. Elles subissent alors 142\u00a0% de d\u00e9g\u00e2ts pendant 2 tours.",
  },
  'Peace Bringer:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "L'escouade du h\u00e9ros a 50\u00a0% de chances d'\u00eatre am\u00e9lior\u00e9e \u00e0 chaque tour, subissant -50\u00a0% de d\u00e9g\u00e2ts en moins ces tours-l\u00e0. L'escouade du h\u00e9ros a 35 % de chances de contre-attaquer lorsqu'elle est attaqu\u00e9e de base, infligeant 190 % de d\u00e9g\u00e2ts \u00e0 la source des d\u00e9g\u00e2ts.",
  },
  'Peace Bringer:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Les trois premiers tours r\u00e9duisent les d\u00e9g\u00e2ts inflig\u00e9s de -45% pour toutes les escouades, notre escouade enti\u00e8re r\u00e9duit les d\u00e9g\u00e2ts subis de -20%, \u00e0 partir du quatri\u00e8me tour, augmente les d\u00e9g\u00e2ts de nos comp\u00e9tences de combat de 20%, jusqu'\u00e0 la fin de la bataille.",
  },
  'Peace Bringer:8': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "30\u00a0% de chances d'infliger 203\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies \u00e0 port\u00e9e et de leur appliquer Vuln\u00e9rable. Pendant 1 tour, chaque attaque qu'elles subissent inflige 20\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires.",
  },
  'Inquisitor:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 35\u00a0% de chances d'infliger 246\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies \u00e0 port\u00e9e et de leur appliquer D\u00e9sarmement pendant 2 tours, ce qui les emp\u00eache d'effectuer des attaques normales.",
  },
  'Inquisitor:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires',
    desc: 'Augmente les d\u00e9g\u00e2ts inflig\u00e9s par les archers de 50\u00a0% \u00e0 toutes les escouades ennemies.',
  },
  'Inquisitor:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "35\u00a0% de chances d'infliger 342\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades al\u00e9atoires \u00e0 port\u00e9e. Si une cible est Inflammable, 50\u00a0% de chances de lui appliquer Suppression, ce qui l'emp\u00eache d'agir.",
  },
  'BeastQueen:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Au premier tour, les d\u00e9g\u00e2ts normaux d'attaque et de poursuite de toutes nos escouades ont augment\u00e9 de 80%, l'effet \u00e9tant r\u00e9duit d'1/4 de tour.",
  },
  'BeastQueen:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "Pendant les 3 premiers tours, 2 escouades alli\u00e9es al\u00e9atoires ont 70\u00a0% de chances d'obtenir D\u00e9g\u00e2ts de zone\u00a0: leurs attaques normales infligent 160\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies derri\u00e8re la cible.",
  },
  'BeastQueen:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Lors des 3 premiers tours de la bataille, l'escouade de cavalerie de premi\u00e8re ligne a 70\u00a0% de chances d'entrer en statut de contre-attaque, qui inflige 250\u00a0% de d\u00e9g\u00e2ts en retour \u00e0 la source lors d'une Attaque normale.",
  },
  'Cao Cao:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "80\u00a0% de chances d'infliger 157\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e.",
  },
  'Cao Cao:5': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Chaque fois que Cao Cao lance la comp\u00e9tence de combat, les d\u00e9g\u00e2ts de son escouade augmentent de 18 %, cumulable jusqu'\u00e0 10 fois jusqu'\u00e0 la fin de la bataille.",
  },
  'Cao Cao:7': {
    type: 'Comp\u00e9tence active',
    target: 'L\u00e9gion du h\u00e9ros',
    desc: "Apr\u00e8s avoir utilis\u00e9 la comp\u00e9tence, la formation du h\u00e9ros b\u00e9n\u00e9ficie d'un bonus de vitesse de marche de 100\u00a0%, d'un bonus de puissance de fantassin de 70\u00a0% pendant 20\u00a0minutes et d'un temps de recharge de 15\u00a0heures. Lorsqu'il n'est pas actif, 50\u00a0% de l'effet est utilis\u00e9 pendant le combat.",
  },
  'Cao Cao:8': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "50\u00a0% de chances d'infliger 396\u00a0% de d\u00e9g\u00e2ts \u00e0 1 ennemi al\u00e9atoire et de lui appliquer Affaiblissement. Chaque fois que la cible subit des d\u00e9g\u00e2ts, elle en subit 302\u00a0% suppl\u00e9mentaires. Cet effet peut s'activer jusqu'\u00e0 3 fois par lancement et dure 1 tour.",
  },
  'Charles the Great:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'infliger 255\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e et de leur appliquer -170\u00a0% de R\u00e9sistance pendant 2 tours.",
  },
  'Charles the Great:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "Pendant les 4 premiers tours, augmente les d\u00e9g\u00e2ts inflig\u00e9s par 2 escouades al\u00e9atoires de votre camp de 20 %, cumulable jusqu'\u00e0 4 fois jusqu'\u00e0 la fin de la bataille.",
  },
  'Charles the Great:8': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "50\u00a0% de chances d'infliger 510\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e. L'escouade de la rang\u00e9e arri\u00e8re a alors 100\u00a0% de chances d'Esquiver les 2 prochaines instances de d\u00e9g\u00e2ts.",
  },
  'Black Prince:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "35 % de chances d'appliquer 1 statut parmi Suppression, Silence et D\u00e9sarmement \u00e0 2 escouades ennemies al\u00e9atoires dans la port\u00e9e valide, pendant 2 tours.",
  },
  'Black Prince:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "Niveau maximum. 60\u00a0% de chances de voler 200\u00a0% de r\u00e9sistance \u00e0 2 escouades ennemies al\u00e9atoires dans la port\u00e9e valide, pendant 2 tours (empilable jusqu'\u00e0 2 fois).",
  },
  'Black Prince:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50% de chances d'infliger 490% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e et de leur appliquer -150% de Puissance pendant 2 tours.",
  },
  'Lionheart:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'infliger 250\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires dans la port\u00e9e valide et d'augmenter les d\u00e9g\u00e2ts de comp\u00e9tence de Lionheart de 40\u00a0% pendant 1 tour.",
  },
  'Lionheart:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50\u00a0% de chances d'infliger 288\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e, puis 288\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires \u00e0 l'escouade ennemie ayant la R\u00e9sistance la plus faible.",
  },
  'Lionheart:7': {
    type: 'Comp\u00e9tence active',
    target: 'L\u00e9gion du h\u00e9ros',
    desc: "Apr\u00e8s avoir utilis\u00e9 la comp\u00e9tence, la formation du h\u00e9ros b\u00e9n\u00e9ficie d'un bonus de vitesse de marche de 100\u00a0%, d'un bonus de puissance de cavalerie de 70\u00a0% pendant 20\u00a0minutes et d'un temps de recharge de 15\u00a0heures. Lorsqu'il n'est pas actif, 50\u00a0% de l'effet est utilis\u00e9 pendant le combat.",
  },
  'Lionheart:8': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 60\u00a0% de chances d'infliger 343\u00a0% de d\u00e9g\u00e2ts massifs \u00e0 toutes les escouades ennemies dans la port\u00e9e valide\u00a0; lors de la pr\u00e9paration, applique le statut Premier \u00e0 l'Attaque au Lionheart pendant 1 tour.",
  },
  'Al Fatih:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "80\u00a0% de chances d'augmenter les d\u00e9g\u00e2ts inflig\u00e9s lors des attaques normales effectu\u00e9es par Al Fatih de 60\u00a0% pendant 1 tour.",
  },
  'Al Fatih:5': {
    type: 'Comp\u00e9tence de combat',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Al Fatih cible 1 escouade ennemie al\u00e9atoire lors d'attaques normales et a 50\u00a0% de chances de lancer Coup fatal.",
  },
  'Al Fatih:7': {
    type: 'Comp\u00e9tence active',
    target: 'L\u00e9gion du h\u00e9ros',
    desc: "Apr\u00e8s avoir utilis\u00e9 la comp\u00e9tence, la formation du h\u00e9ros b\u00e9n\u00e9ficie d'un bonus de vitesse de marche de 100\u00a0%, d'un bonus de puissance d'archer de 70\u00a0% pendant 20\u00a0minutes et d'un temps de recharge de 15\u00a0heures. Lorsqu'il n'est pas actif, 50\u00a0% de l'effet est utilis\u00e9 pendant le combat.",
  },
  'Al Fatih:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Le taux de d\u00e9g\u00e2ts du Coup Fatal lanc\u00e9 par Al Fatih augmente de 60\u00a0%, dans l'effet cumul\u00e9 1 fois \u00e0 chaque tour jusqu'\u00e0 4 fois jusqu'\u00e0 la fin de la bataille.",
  },
  'Edward the Confessor:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Toutes vos escouades ont 100% de chances d'obtenir Esquive la premi\u00e8re fois qu'elles sont attaqu\u00e9es. Pendant les 4 premiers tours, elles ont chaque tour 70% de chances d'appliquer -40% aux d\u00e9g\u00e2ts de comp\u00e9tence inflig\u00e9s par toutes les escouades ennemies.",
  },
  'Edward the Confessor:5': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "35\u00a0% de chances d'infliger 480\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e et de lui appliquer Suppression pendant 1 tour.",
  },
  'Edward the Confessor:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "\u00c0 partir du tour 3, les d\u00e9g\u00e2ts physiques de 2 escouades al\u00e9atoires de votre camp peuvent \u00eatre augment\u00e9s de 30 % \u00e0 chaque tour, cumulables jusqu'\u00e0 4 fois jusqu'\u00e0 la fin de la bataille.",
  },
  'Constantine the Great:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 45\u00a0% de chances d'infliger 330\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e.",
  },
  'Constantine the Great:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'infliger 203\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies \u00e0 port\u00e9e et d'augmenter de 50\u00a0% les d\u00e9g\u00e2ts de comp\u00e9tence de l'escouade de la rang\u00e9e arri\u00e8re pendant 1 tour.",
  },
  'Constantine the Great:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 ennemi al\u00e9atoire',
    desc: "Lorsqu'une escouade alli\u00e9e pr\u00e9pare une comp\u00e9tence, Constantine a 80\u00a0% de chances d'infliger 304\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e.",
  },
  'Genghis Khan:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50\u00a0% de chances d'appliquer Saignement \u00e0 toutes les escouades ennemies\u00a0: elles subissent 213\u00a0% de d\u00e9g\u00e2ts par tour pendant 2 tours.",
  },
  'Genghis Khan:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "50\u00a0% de chances d'infliger 202\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e, puis 50\u00a0% de chances d'infliger 202\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires \u00e0 toutes les escouades ennemies.",
  },
  'Genghis Khan:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: 'Toutes les 4 comp\u00e9tences de combat utilis\u00e9es par une escouade alli\u00e9e, Genghis Khan restaure les troupes de 2 escouades alli\u00e9es al\u00e9atoires (taux de r\u00e9cup\u00e9ration\u00a0: 152 %).',
  },
  'Jiguang Qi:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'infliger 192\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies dans la port\u00e9e valide.",
  },
  'Jiguang Qi:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'infliger 220\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies \u00e0 port\u00e9e et de leur appliquer -40\u00a0% aux d\u00e9g\u00e2ts physiques inflig\u00e9s pendant 1 tour.",
  },
  'Jiguang Qi:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Pour chaque tranche de 2 comp\u00e9tences de combat lanc\u00e9es par l'une de vos escouades, la r\u00e9sistance Jiguang Qi augmente de 80 %, cumulable jusqu'\u00e0 10 fois jusqu'\u00e0 la fin de la bataille.",
  },
  'Valkyrie:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "100\u00a0% de chances d'emp\u00eacher l'escouade du h\u00e9ros d'effectuer des attaques normales pendant 2 tours. En contrepartie, elle inflige 30\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires et 218\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e.",
  },
  'Valkyrie:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 45\u00a0% de chances d'infliger 310\u00a0% de d\u00e9g\u00e2ts \u00e0 3 escouades ennemies \u00e0 port\u00e9e.",
  },
  'Valkyrie:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "La lutte des escouades autonomes contre les fantassins et les cavaleries est augment\u00e9e de 30\u00a0%, avec 70\u00a0% de chances \u00e0 chaque tour d'ignorer 50\u00a0% de la r\u00e9sistance de base de l'escouade ennemie.",
  },
  'Lawman:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 ennemi al\u00e9atoire',
    desc: "Lorsque l'escouade du h\u00e9ros subit des d\u00e9g\u00e2ts, elle a 50\u00a0% de chances d'infliger 63\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades al\u00e9atoires dans un rayon de 2.",
  },
  'Lawman:5': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "L'escouade du h\u00e9ros et 1 escouade alli\u00e9e al\u00e9atoire restaurent des troupes \u00e0 chaque tour (taux de r\u00e9cup\u00e9ration\u00a0: 96,5 %).",
  },
  'Lawman:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: '40% de chances de faire subir -30% de d\u00e9g\u00e2ts \u00e0 sa propre escouade et de rediriger vers elle 30% des d\u00e9g\u00e2ts ennemis destin\u00e9s aux 2 autres escouades alli\u00e9es pendant 2 tours.',
  },
  'Spectral Reaper:2': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 ennemi al\u00e9atoire',
    desc: "35\u00a0% de chances d'attaquer \u00e0 nouveau apr\u00e8s des Attaques normales sur la m\u00eame cible, infligeant 742\u00a0% de d\u00e9g\u00e2ts, la rendant incapable de r\u00e9cup\u00e9rer des troupes pendant 1 tour.",
  },
  'Spectral Reaper:5': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "40\u00a0% de chances d'infliger 455\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e. L'escouade du h\u00e9ros a ensuite 90\u00a0% de chances de gagner 1 attaque normale suppl\u00e9mentaire par tour pendant 1 tour.",
  },
  'Spectral Reaper:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "L'escouade du h\u00e9ros inflige 100% de d\u00e9g\u00e2ts suppl\u00e9mentaires avec ses Attaques normales. Apr\u00e8s chaque Comp\u00e9tence de combat lanc\u00e9e, elle gagne +40% de chances d'effectuer une Attaque suppl\u00e9mentaire pendant 1 tour. Lors du calcul de la port\u00e9e effective d'une comp\u00e9tence ennemie, elle est consid\u00e9r\u00e9e comme \u00e9tant \u00e0 une distance de +1 de l'ennemi.",
  },
  'Defender:2': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Apr\u00e8s les Attaques normales, 80 % de chances de faire subir aux d\u00e9g\u00e2ts de l'escouade du h\u00e9ros -20 % pendant 2 tours. Le statut peut \u00eatre empil\u00e9.",
  },
  'Defender:5': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 ennemi al\u00e9atoire',
    desc: "Apr\u00e8s une attaque normale, 50 % de chances d'infliger 310 % de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e et de restaurer les troupes de l'escouade du h\u00e9ros (taux de r\u00e9cup\u00e9ration\u00a0: 67 %).",
  },
  'Defender:8': {
    type: 'Comp\u00e9tence de combat',
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: '35\u00a0% de chances de former 2 escouades alli\u00e9es al\u00e9atoires pour attaquer deux fois, avec 30\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires pendant 2 tours.',
  },
  'Army Breaker:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "55\u00a0% de chances de r\u00e9cup\u00e9rer des troupes pour 2 escouades alli\u00e9es al\u00e9atoires \u00e0 port\u00e9e (taux de r\u00e9cup\u00e9ration de 84\u00a0%) et de supprimer les malus (impossible de supprimer les malus d'avant-bataille).",
  },
  'Army Breaker:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "40\u00a0% de chances d'appliquer Silence \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e et de leur appliquer -20\u00a0% aux d\u00e9g\u00e2ts inflig\u00e9s pendant 2 tours.",
  },
  'Army Breaker:8': {
    type: 'Comp\u00e9tence de combat',
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "30\u00a0% de chances de donner \u00e0 toutes les escouades alli\u00e9es 60\u00a0% de chances d'entrer en statut d'\u00e9vasion lorsqu'elles subissent les 3 prochains d\u00e9g\u00e2ts et augmente de 47\u00a0% la puissance et la r\u00e9sistance pendant 2 tours.",
  },
  'The Avalanche:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "60\u00a0% de chances d'infliger 226\u00a0% de d\u00e9g\u00e2ts \u00e0 plusieurs cibles ennemies.",
  },
  'The Avalanche:5': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "1 tour de pr\u00e9paration, 40\u00a0% de chances d'infliger 595\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e, 60\u00a0% de chances d'infliger 310\u00a0% de d\u00e9g\u00e2ts \u00e0 l'escouade ennemie de la derni\u00e8re rang\u00e9e, la rendant supprim\u00e9e et incapable d'agir pendant 1 tour.",
  },
  'The Avalanche:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "En combat, l'escouade du h\u00e9ros obtient Clart\u00e9 et devient immunis\u00e9e contre Silence, D\u00e9sarmement, Suppression et Confusion. Elle gagne aussi 60 % de Puissance et inflige 30 % de d\u00e9g\u00e2ts suppl\u00e9mentaires.",
  },
  'Dach Tengri:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "100% de chances d'appliquer \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e\u00a0: 6% de d\u00e9g\u00e2ts suppl\u00e9mentaires subis, 6% de r\u00e9duction des d\u00e9g\u00e2ts inflig\u00e9s et -38 de Vitesse de combat. Pendant 1 tour, 2 escouades alli\u00e9es al\u00e9atoires gagnent -6% de d\u00e9g\u00e2ts subis, -6% de d\u00e9g\u00e2ts inflig\u00e9s et 38 de Vitesse de combat.",
  },
  'Dach Tengri:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: '\u00c0 partir du tour 4, \u00e0 chaque tour, il y a 70\u00a0% de chances que 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e ne soient pas en mesure de r\u00e9cup\u00e9rer les troupes et de r\u00e9duire les d\u00e9g\u00e2ts subis par 2 escouades alli\u00e9es al\u00e9atoires de -25\u00a0%.',
  },
  'Dach Tengri:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "Les 3 premiers tours, chaque tour donne \u00e0 2 escouades alli\u00e9es al\u00e9atoires 7% de d\u00e9g\u00e2ts suppl\u00e9mentaires (effet cumulable), jusqu'\u00e0 la fin de la bataille, \u00e0 partir du tour 4, le statut splash est accord\u00e9, les Attaques normales infligeront 40% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies dans le dos jusqu'\u00e0 la fin de la bataille.",
  },
  'Tarantula:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "30\u00a0% de chances d'infliger 641\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e, tandis que les d\u00e9g\u00e2ts inflig\u00e9s par l'escouade du H\u00e9ros et l'escouade de la derni\u00e8re rang\u00e9e sont augment\u00e9s de 40\u00a0% pour les 2 prochaines attaques. Si l'escouade du H\u00e9ros est l'escouade de la derni\u00e8re ligne, alors il b\u00e9n\u00e9ficie d'un double effet d'am\u00e9lioration des d\u00e9g\u00e2ts. Dure 2 tours.",
  },
  'Tarantula:5': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "35\u00a0% de chances d'infliger 402\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e et avant la prochaine action de l'escouade de derni\u00e8re ligne, infliger 403\u00a0% de d\u00e9g\u00e2ts \u00e0 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e de 4 de l'escouade de derni\u00e8re ligne.",
  },
  'Tarantula:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "En combat, l'escouade du h\u00e9ros gagne al\u00e9atoirement l'un des bonus suivants \u00e0 chaque tour\u00a0: 1\u00a0- restaure des troupes (taux de r\u00e9cup\u00e9ration\u00a0: 100%)\u00a0; 2\u00a0- Puissance, R\u00e9sistance, Puissance tactique et R\u00e9sistance augment\u00e9es de 60\u00a0%\u00a0; 3\u00a0- b\u00e9n\u00e9ficie de -40% de d\u00e9g\u00e2ts subis.",
  },
  'Alexander:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 ennemi al\u00e9atoire',
    desc: "Aux tours 1 et 3, choquez 1 escouade ennemie al\u00e9atoire, ce qui fait que les escouades subissent 325\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires \u00e0 chaque fois, jusqu'\u00e0 la fin de la bataille.",
  },
  'Alexander:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Le h\u00e9ros b\u00e9n\u00e9ficie de -60 % de d\u00e9g\u00e2ts subis et re\u00e7oit 20 % de soins suppl\u00e9mentaires, mais les d\u00e9g\u00e2ts de br\u00fblure qu'il subit augmentent de 300 %.",
  },
  'Alexander:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "100\u00a0% de chances de faire saigner toutes les escouades ennemies, leur faisant subir 260\u00a0% de d\u00e9g\u00e2ts avant d'agir \u00e0 chaque tour, jusqu'\u00e0 la fin de la bataille. Si l'escouade du h\u00e9ros perd 25 % de la puissance totale des troupes au cours d'un tour, une partie de la puissance des troupes de l'escouade sera restaur\u00e9e (taux de r\u00e9cup\u00e9ration : 350 %) \u00e0 la fin de ce tour.",
  },
  'Lancelot:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 50\u00a0% de chances d'infliger 356\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies. Si une cible subit une r\u00e9duction des soins ou un Blocage de r\u00e9cup\u00e9ration des troupes, inflige 356 % de d\u00e9g\u00e2ts suppl\u00e9mentaires \u00e0 toutes les escouades ennemies. Chacune a alors 90 % de chances de subir Suppression pendant 1 tour.",
  },
  'Lancelot:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Le h\u00e9ros ne peut pas lancer d\u2019attaques normales (l\u2019effet ne peut pas \u00eatre annul\u00e9). \u00c0 chaque tour, 100 % de chances d'infliger 356 % de d\u00e9g\u00e2ts \u00e0 1 ou plusieurs escouades ennemies al\u00e9atoires, tandis que le h\u00e9ros gagne l'un des sceaux de Courage/Justice/Mis\u00e9ricorde (Courage : d\u00e9g\u00e2ts augment\u00e9s de 20 % ; Justice : taux d'\u00e9vasion augment\u00e9 de 10 % ; Mis\u00e9ricorde : le porteur de sceau peut restaurer un peu de puissance des troupes \u00e0 chaque tour lorsqu'il effectue des actions, taux de r\u00e9cup\u00e9ration : 67 %), jusqu'\u00e0 la fin de la bataille et empilable jusqu'\u00e0 2 couches ; lorsque les trois sceaux sont obtenus, la comp\u00e9tence ciblera toutes les escouades ennemies.",
  },
  'Lancelot:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Au d\u00e9but du combat, toutes les escouades alli\u00e9es obtiennent l'effet suivant\u00a0: lorsqu'elles utilisent une comp\u00e9tence de pr\u00e9paration, elles ont 80 % de chances d'en sauter 1 tour, jusqu'\u00e0 3 fois. Une fois toutes les activations consomm\u00e9es, le porteur re\u00e7oit 1 Sceau.",
  },
  'Ragnar:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "50\u00a0% de chances d'infliger 420\u00a0% de d\u00e9g\u00e2ts \u00e0 une escouade ennemie al\u00e9atoire dans une port\u00e9e valide.",
  },
  'Ragnar:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: 'Au tour 1, il inflige 160\u00a0% de d\u00e9g\u00e2ts, au tour 3, 320\u00a0% de d\u00e9g\u00e2ts, au tour 5, 480\u00a0% de d\u00e9g\u00e2ts et au tour 7, 640\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies, respectivement.',
  },
  'Ragnar:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Apr\u00e8s avoir inflig\u00e9 des d\u00e9g\u00e2ts, 50\u00a0% de chances d'accorder \u00e0 l'escouade du h\u00e9ros et \u00e0 celle de la rang\u00e9e arri\u00e8re 8\u00a0% de chances d'utiliser Coup fatal et Frappe destructrice. Se cumule jusqu'\u00e0 5 fois et dure jusqu'\u00e0 la fin du combat. La derni\u00e8re ligne de la capture reste \u00e0 confirmer.",
  },
  'Bjorn:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "40 % de chances d'attaquer 2 fois 1 escouade ennemie al\u00e9atoire \u00e0 port\u00e9e, infligeant \u00e0 chaque fois 348 % de d\u00e9g\u00e2ts. Chaque attaque cible al\u00e9atoirement un ennemi.",
  },
  'Bjorn:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: 'Toutes les escouades alli\u00e9es infligent +70% de d\u00e9g\u00e2ts aux ennemis sous Silence, D\u00e9sarmement, Suppression ou Confusion. Les escouades ennemies ont 30% de chances de prolonger ces malus de contr\u00f4le de 1 tour.',
  },
  'Bjorn:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: 'Lors des 3 premiers tours, 2 escouades ennemies al\u00e9atoires \u00e0 port\u00e9e infligent -30% de d\u00e9g\u00e2ts. Au tour 4, ces escouades deviennent confuses, attaquant et lan\u00e7ant des comp\u00e9tences sur des cibles al\u00e9atoires pendant 2 tours.',
  },
  'Skanda:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "50\u00a0% de chances de restaurer les troupes de l'escouade du h\u00e9ros et de celle de la premi\u00e8re ligne (taux de r\u00e9cup\u00e9ration\u00a0: 247\u00a0%). Si le h\u00e9ros est d\u00e9j\u00e0 en premi\u00e8re ligne, les soins sont doubl\u00e9s.",
  },
  'Skanda:5': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "70\u00a0% de chances d'infliger 260\u00a0% de d\u00e9g\u00e2ts \u00e0 l'escouade ennemie la plus \u00e9loign\u00e9e \u00e0 port\u00e9e et de la supprimer pendant 1 tour.",
  },
  'Skanda:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Au tour 5, supprimez les malus amicaux du premier rang. Lorsque la cible subit des d\u00e9g\u00e2ts, 100\u00a0% de chances d'esquiver et de devenir immunis\u00e9e contre ces d\u00e9g\u00e2ts, pendant 2 tours.",
  },
  'Liberator:2': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Lorsqu'elle subit une attaque normale, l'escouade du h\u00e9ros a 50\u00a0% de chances de contre-attaquer et d'infliger 150\u00a0% de d\u00e9g\u00e2ts. Chaque tour, elle a aussi 50 % de chances de b\u00e9n\u00e9ficier de -60 % de d\u00e9g\u00e2ts de comp\u00e9tence subis pendant 1 tour.",
  },
  'Liberator:5': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Les attaques normales ont 80\u00a0% de chances d'appliquer Blocage de r\u00e9cup\u00e9ration des troupes pendant 1 tour. Elles ont aussi 70 % de chances d'accorder Esprit clair \u00e0 l'escouade de la rang\u00e9e arri\u00e8re, qui devient immunis\u00e9e contre Silence, D\u00e9sarmement, Suppression et Confusion pendant 1 tour.",
  },
  'Liberator:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 alli\u00e9s al\u00e9atoires',
    desc: "Lorsque l'escouade du h\u00e9ros est en premi\u00e8re ligne, toutes les escouades alli\u00e9es b\u00e9n\u00e9ficient de -20% de d\u00e9g\u00e2ts subis pendant les 3 premiers tours. \u00c0 partir du 4e tour, 40 % des d\u00e9g\u00e2ts inflig\u00e9s par l'escouade de la rang\u00e9e arri\u00e8re restaurent les troupes de la premi\u00e8re ligne \u00e0 la fin de l'effet.",
  },
  'Ashen Verdict:2': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires',
    desc: "Ashen Verdict gagne 1 marque de poursuite pour chaque attaque normale effectu\u00e9e par vos escouades. Lorsque les marques s'accumulent jusqu'\u00e0 7, toutes les escouades ennemies re\u00e7oivent 400 % de d\u00e9g\u00e2ts suppl\u00e9mentaires et toutes les marques existantes sont supprim\u00e9es.",
  },
  'Ashen Verdict:5': {
    type: 'Comp\u00e9tence de combat',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "35\u00a0% de chances pour l'\u00e9quipe du h\u00e9ros d'avoir 1 attaque normale suppl\u00e9mentaire \u00e0 chaque tour, durant 2 tours. L\u2019escouade est immunis\u00e9e contre D\u00e9sarm\u00e9 pendant toute la dur\u00e9e.",
  },
  'Ashen Verdict:8': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "L'escouade du h\u00e9ros a 35 % de chances d'appliquer une condition \u00e0 une escouade ennemie al\u00e9atoire toutes les 2 attaques normales\u00a0: d\u00e9sarm\u00e9e, r\u00e9duite au silence, confuse, interrompue ou r\u00e9cup\u00e9ration des troupes bloqu\u00e9e. La probabilit\u00e9 est d\u00e9termin\u00e9e ind\u00e9pendamment pour chaque effet. Tous les effets durent 1 tour.",
  },
  'Warden:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "Pendant les 4 premiers tours, la chance d'activation de la 5\u00e8me comp\u00e9tence de chacun des deux autres h\u00e9ros augmente de 10 %, uniquement pour les comp\u00e9tences de combat et passives. Au tour 5, cette chance augmente de 30% pour la 5\u00e8me comp\u00e9tence de l'un des deux autres h\u00e9ros.",
  },
  'Warden:5': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires et un alli\u00e9 al\u00e9atoire',
    desc: "Lorsque votre escouade subit Silence, D\u00e9sarmement, Suppression ou Confusion, elle b\u00e9n\u00e9ficie de -70 % de d\u00e9g\u00e2ts subis. Cet effet peut s'activer jusqu'\u00e0 3 fois par combat. Aux tours 1 et 5, inflige 510 % de d\u00e9g\u00e2ts \u00e0 une escouade ennemie al\u00e9atoire.",
  },
  'Warden:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires',
    desc: "En combat, l'escouade du h\u00e9ros ne peut pas effectuer d'attaque normale. L'escouade de la rang\u00e9e arri\u00e8re gagne toutefois +1 attaque normale par tour. Chaque attaque normale augmente de 12 % les d\u00e9g\u00e2ts de sa prochaine comp\u00e9tence, jusqu'\u00e0 5 cumuls.",
  },
  'Warhammer:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire et un alli\u00e9 al\u00e9atoire',
    desc: "Gagne +1 Charge d'Armure r\u00e9fl\u00e9chissante chaque fois qu'une escouade alli\u00e9e subit des d\u00e9g\u00e2ts. \u00c0 9 Charges, accorde un Bouclier r\u00e9fl\u00e9chissant \u00e0 une escouade alli\u00e9e al\u00e9atoire, avec 30\u00a0% de chances d'en accorder un autre. Le bouclier annule 100 % des prochains d\u00e9g\u00e2ts de l'attaquant et prot\u00e8ge son porteur de tous les d\u00e9g\u00e2ts de cette instance. Accorder un bouclier r\u00e9initialise toutes les Charges d'Armure r\u00e9fl\u00e9chissante.",
  },
  'Warhammer:5': {
    type: 'Comp\u00e9tence de combat',
    target: '3 ennemis al\u00e9atoires et un alli\u00e9 al\u00e9atoire',
    desc: "100\u00a0% de chances d'infliger 108\u00a0% de d\u00e9g\u00e2ts \u00e0 toutes les escouades ennemies, mais toutes les escouades alli\u00e9es re\u00e7oivent 20\u00a0% des d\u00e9g\u00e2ts inflig\u00e9s aux escouades ennemies. Ces d\u00e9g\u00e2ts fournissent des charges pour l'armure r\u00e9fl\u00e9chissante.",
  },
  'Warhammer:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '3 ennemis al\u00e9atoires et un alli\u00e9 al\u00e9atoire',
    desc: "R\u00e9duisez la r\u00e9cup\u00e9ration des troupes des escouades ennemies et amies de -25 %. \u00c0 partir du tour 4, r\u00e9duisez l\u2019effet de r\u00e9cup\u00e9ration des troupes pour toutes les escouades ennemies de -15\u00a0% par tour. Cet effet se cumule et dure jusqu'\u00e0 la fin du combat.",
  },
  'Eidolon:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "L'\u00e9quipe du h\u00e9ros a un taux d'\u00e9vasion de base de 10 % et gagne un bonus de 25 % \u00e0 chaque fois qu'elle subit des d\u00e9g\u00e2ts, cumulable jusqu'\u00e0 100 %. Une fois que l\u2019escouade r\u00e9ussit \u00e0 \u00e9chapper \u00e0 une attaque, le bonus de taux d\u2019\u00e9vasion est effac\u00e9.",
  },
  'Eidolon:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 alli\u00e9s al\u00e9atoires',
    desc: "40% de chances de d\u00e9clenchement : 2 autres escouades alli\u00e9es siphonnent 60% de Puissance et de R\u00e9sistance \u00e0 1 escouade ennemie al\u00e9atoire. De plus, chaque Attaque normale a 100% de chances d'infliger 250% de d\u00e9g\u00e2ts suppl\u00e9mentaires pendant 1 tour.",
  },
  'Eidolon:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: "L'escouade du h\u00e9ros a 33\u00a0% de chances de r\u00e9cup\u00e9rer 80\u00a0% de ses troupes apr\u00e8s une \u00e9vasion r\u00e9ussie, 33\u00a0% de chances de subir -35\u00a0% de d\u00e9g\u00e2ts r\u00e9duits et 33\u00a0% de chances de faire subir \u00e0 2 escouades ennemies al\u00e9atoires 15\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires. Chaque chance est calcul\u00e9e ind\u00e9pendamment et ne se cumule pas. Chaque effet dure 2 tours.",
  },
  'Scarlet Reaver:2': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "100\u00a0% de chances d'infliger 100\u00a0% de d\u00e9g\u00e2ts \u00e0 l'escouade ennemie de premi\u00e8re ligne, avec 40\u00a0% de chances d'infliger 500\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires \u00e0 l'escouade ennemie avec les troupes les plus basses.",
  },
  'Scarlet Reaver:5': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "1 tour de pr\u00e9paration. 40\u00a0% de chances d'attaquer 5 fois\u00a0; chaque frappe cible une escouade ennemie al\u00e9atoire et inflige 150\u00a0% de d\u00e9g\u00e2ts. Chaque frappe a aussi 65% de chances d'appliquer pendant 1 tour D\u00e9sarmement aux archers, ou Silence aux Fantassins et \u00e0 la Cavalerie. D\u00e9sarmement et Silence se cumulent jusqu'\u00e0 2 fois.",
  },
  'Scarlet Reaver:8': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '2 ennemis al\u00e9atoires',
    desc: "Aux tours 1, 4 et 7, d\u00e9finissez le statut Br\u00fblure sur 2 escouades ennemies al\u00e9atoires pendant 2 tours, infligeant 150 % de d\u00e9g\u00e2ts \u00e0 chaque tour. L'escouade du h\u00e9ros gagne 35 % en contre-attaque contre la cavalerie, et toutes les escouades alli\u00e9es infligent +50 % de d\u00e9g\u00e2ts de comp\u00e9tence contre les cibles en feu.",
  },
  'Rainforest Ranger:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Les d\u00e9g\u00e2ts inflig\u00e9s par l'escouade de ce h\u00e9ros ignorent 25 % de la r\u00e9sistance de base de l'escouade ennemie. Pendant les 3 premiers tours, les attaques normales de l'escouade de ce h\u00e9ros se verrouillent sur l'escouade ennemie dans la m\u00eame position et ignorent le double de la r\u00e9sistance de base.",
  },
  'Rainforest Ranger:5': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 ennemi al\u00e9atoire',
    desc: "50\u00a0% de chances apr\u00e8s une attaque normale d'infliger 350\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires \u00e0 la cible. Il y a 50\u00a0% de chances lorsque le bonus de d\u00e9g\u00e2ts est d\u00e9clench\u00e9 d'infliger Suppression \u00e0 1 ennemi al\u00e9atoire pendant 1 tour.",
  },
  'Rainforest Ranger:8': {
    type: 'Attaque suppl\u00e9mentaire',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "35\u00a0% de chances apr\u00e8s une attaque normale d'infliger 600\u00a0% de d\u00e9g\u00e2ts suppl\u00e9mentaires \u00e0 la cible. Ces d\u00e9g\u00e2ts suppl\u00e9mentaires sont augment\u00e9s \u00e0 810 % si la puissance des troupes de l'escouade cible est inf\u00e9rieure de 50 % \u00e0 celle du d\u00e9but de la bataille.",
  },
  'Fortuneteller:2': {
    type: "Comp\u00e9tence d'avant-combat",
    target: '1 ennemi al\u00e9atoire',
    desc: "Marque 1 escouade ennemie al\u00e9atoire, lui applique -70 % de r\u00e9cup\u00e9ration des troupes, puis applique un malus selon son type. Fantassins\u00a0: toutes les escouades ennemies b\u00e9n\u00e9ficient de +20\u00a0% de r\u00e9duction des d\u00e9g\u00e2ts d'attaque normale subis. Archers\u00a0: toutes les escouades ennemies subissent -40\u00a0% aux d\u00e9g\u00e2ts d'attaque normale inflig\u00e9s. Cavalerie\u00a0: toutes les escouades ennemies subissent -30\u00a0% aux d\u00e9g\u00e2ts de comp\u00e9tence inflig\u00e9s.",
  },
  'Fortuneteller:5': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: '50\u00a0% de chances de lier 1 escouade ennemie al\u00e9atoire \u00e0 l\u2019escouade marqu\u00e9e pendant 2 tours. Lorsqu\u2019une escouade subit des d\u00e9g\u00e2ts, l\u2019autre escouade en subit 50 %.',
  },
  'Fortuneteller:8': {
    type: 'Comp\u00e9tence de combat',
    target: '1 ennemi al\u00e9atoire',
    desc: "Gagne +1 Charge chaque fois qu'une escouade alli\u00e9e utilise une comp\u00e9tence de combat. Une fois 6 Charges accumul\u00e9es, inflige 750% de d\u00e9g\u00e2ts \u00e0 l'escouade marqu\u00e9e et lui applique Suppression pendant 1 tour.",
  },
  'Cyrus:2': {
    type: 'Comp\u00e9tence de combat',
    target: '2 ennemis al\u00e9atoires',
    desc: "1 tour de pr\u00e9paration. 65\u00a0% de chances d'infliger 325\u00a0% de d\u00e9g\u00e2ts \u00e0 2 escouades ennemies al\u00e9atoires, les emp\u00eachant de restaurer la puissance de leurs troupes pendant 1\u00a0tour. Cette comp\u00e9tence a 80 % de chances de contourner l\u2019\u00e9tape de pr\u00e9paration et d\u2019\u00eatre lanc\u00e9e directement.",
  },
  'Cyrus:5': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "Toutes les escouades de cavalerie alli\u00e9es obtiennent Cavalerie temp\u00eate\u00a0: utiliser une comp\u00e9tence active augmente les d\u00e9g\u00e2ts inflig\u00e9s de 40\u00a0%, tandis qu'utiliser une comp\u00e9tence de poursuite r\u00e9duit les d\u00e9g\u00e2ts subis de 40% pendant 2 tours. Lorsqu'une escouade alli\u00e9e d\u00e9clenche cet effet, Cyrus en gagne 50 %, jusqu'\u00e0 5 cumuls et jusqu'\u00e0 la fin du combat.",
  },
  'Cyrus:8': {
    type: 'Comp\u00e9tence de statut',
    target: '1 alli\u00e9 al\u00e9atoire',
    desc: "L'escouade de Cyrus a 10 % de chances d'esquiver. Apr\u00e8s chaque Esquive r\u00e9ussie, Cyrus gagne al\u00e9atoirement l'un de plusieurs effets, dont Initiative et In\u00e9branlable. Si l'Esquive \u00e9choue, toutes vos escouades deviennent imm\u00e9diatement In\u00e9branlables pendant 1 tour et r\u00e9duisent de 50 % les d\u00e9g\u00e2ts de la prochaine attaque re\u00e7ue. Cet effet ne peut s'activer qu'une fois par tour.",
  },
};

const strings = {
  '1 random friendly squad within effective range':
    '1 escouade alli\u00e9e al\u00e9atoire \u00e0 port\u00e9e effective',
  '3 random friendly squads within effective range':
    '3 escouades alli\u00e9es al\u00e9atoires \u00e0 port\u00e9e effective',
  'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.':
    "Une comp\u00e9tence utilisable en combat. Certaines ont un temps de pr\u00e9paration, une chance d'activation ainsi que des r\u00e8gles de port\u00e9e et de ciblage.",
  'A cleansing or control-resistance state that helps remove or avoid negative effects.':
    'Un effet de purification ou de r\u00e9sistance au contr\u00f4le qui dissipe ou emp\u00eache les effets n\u00e9gatifs.',
  'A commander-style passive effect that usually applies as long as the hero is in the legion.':
    "Un effet passif de type commandant qui s'applique g\u00e9n\u00e9ralement tant que le h\u00e9ros est dans la l\u00e9gion.",
  'A control-immunity or cleansing state; usually protects from disabling effects for its duration.':
    "Un effet d'immunit\u00e9 au contr\u00f4le ou de purification qui prot\u00e8ge des entraves pendant sa dur\u00e9e.",
  'A damage-over-time status that keeps hurting the affected squad while active.':
    "Un effet de d\u00e9g\u00e2ts sur la dur\u00e9e qui continue de blesser l'escouade affect\u00e9e tant qu'il est actif.",
  'A damage-over-time style status that keeps hurting the affected squad while active.':
    "Un effet de d\u00e9g\u00e2ts sur la dur\u00e9e qui continue de blesser l'escouade affect\u00e9e tant qu'il est actif.",
  'A disabling status such as Silence, Disarm, Suppress, or Confuse.':
    'Un effet de contr\u00f4le comme Silence, D\u00e9sarmement, Suppression ou Confusion.',
  'A normal attack state that hits additional enemy squads beyond the main target.':
    "Un effet d'attaque normale qui touche d'autres escouades ennemies en plus de la cible principale.",
  'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.':
    'Une comp\u00e9tence passive ou de statut qui modifie les effets, les immunit\u00e9s ou les r\u00e8gles de combat.',
  'A skill that can trigger during battle when its conditions and chance roll are met.':
    "Une comp\u00e9tence qui peut s'activer en combat lorsque ses conditions et son jet d'activation sont valid\u00e9s.",
  'A special damage effect that can bypass or punish defenses depending on the skill.':
    'Un effet de d\u00e9g\u00e2ts sp\u00e9cial qui peut contourner ou punir les d\u00e9fenses selon la comp\u00e9tence.',
  'A special strike effect with its own chance and damage rate, often scaling with buffs.':
    'Une frappe sp\u00e9ciale avec sa propre chance et son propre taux de d\u00e9g\u00e2ts, souvent renforc\u00e9e par des bonus.',
  'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.':
    "Un bonus cumulable qui renforce les effets de poursuite, les d\u00e9g\u00e2ts ou les chances d'activation de certains h\u00e9ros.",
  'A status that makes the target vulnerable to fire-related effects.':
    'Un statut qui rend la cible vuln\u00e9rable aux effets li\u00e9s au feu.',
  'A weakening status that reduces effectiveness while active.':
    "Un \u00e9tat d'affaiblissement qui r\u00e9duit l'efficacit\u00e9 lorsqu'il est actif.",
  'Active Skill': 'Comp\u00e9tence active',
  'Acts before enemy squads, which can unlock extra skill effects for some heroes.':
    'Agit avant les escouades ennemies, ce qui peut d\u00e9bloquer des effets de comp\u00e9tences suppl\u00e9mentaires pour certains h\u00e9ros.',
  'Additional Attack': 'Attaque suppl\u00e9mentaire',
  'Adds or modifies normal attacks, often creating extra hits or effects after attacks.':
    'Ajoute ou modifie les attaques normales, cr\u00e9ant souvent des coups ou des effets suppl\u00e9mentaires apr\u00e8s les attaques.',
  'Affected squad may attack or cast skills on random targets.':
    "L'escouade affect\u00e9e peut attaquer ou utiliser ses comp\u00e9tences sur des cibles al\u00e9atoires.",
  'Affected squad takes more damage or loses protection while active.':
    'L\u2019escouade affect\u00e9e subit plus de d\u00e9g\u00e2ts ou perd sa protection lorsqu\u2019elle est active.',
  'All Biography Attributes activated': 'Tous les attributs de biographie sont activ\u00e9s',
  'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.':
    "S'applique avant ou au d\u00e9but du combat et d\u00e9finit souvent des bonus, des malus ou les r\u00e8gles des premiers tours.",
  'Armor break': 'Brise-armure',
  'Army Defense': "D\u00e9fense de l'arm\u00e9e",
  'Army HP': "PV de l'arm\u00e9e",
  'Army Might': "Puissance de l'arm\u00e9e",
  'Arthur Pendragon the Once and Future King': 'Arthur Pendragon, le roi qui fut et qui sera',
  'Avoids an incoming damage instance or attack while active.':
    "\u00c9vite une instance de d\u00e9g\u00e2ts ou une attaque entrante lorsqu'elle est active.",
  Biography: 'Biographie',
  'Biography attributes': 'Attributs de biographie',
  'Biography Attributes': 'Attributs de biographie',
  'Biography skin details pending': 'D\u00e9tails du skin biographique en attente',
  'Biography: Hidden Power': 'Biographie : pouvoir cach\u00e9',
  Bleeding: 'Saignement',
  'Captured screenshot shows Eternity at Lv.10 and max level reached.':
    'La capture montre \u00c9ternit\u00e9 au niv. 10, avec le niveau maximal atteint.',
  Chain: 'Cha\u00eene',
  Clarity: 'Clart\u00e9',
  'Combat Skill': 'Comp\u00e9tence de combat',
  'Combat Skill Damage': 'D\u00e9g\u00e2ts de comp\u00e9tence de combat',
  Confuse: 'Confusion',
  Confused: 'Confus',
  'Control Debuff': 'Malus de contr\u00f4le',
  'Counter-attack': 'Contre-attaque',
  Counterattack: 'Contre-attaque',
  Cursed: 'Maudit',
  'Damage dealt by a skill rather than a normal attack.':
    'D\u00e9g\u00e2ts inflig\u00e9s par une comp\u00e9tence plut\u00f4t que par une attaque normale.',
  'Damage dealt specifically by combat skills, not normal attacks.':
    'D\u00e9g\u00e2ts inflig\u00e9s sp\u00e9cifiquement par les comp\u00e9tences de combat, et non par les attaques normales.',
  'Damage or effects can jump from one squad to another.':
    'Les d\u00e9g\u00e2ts ou les effets peuvent passer d\u2019une escouade \u00e0 l\u2019autre.',
  'Damage spills onto nearby or additional squads.':
    'Les d\u00e9g\u00e2ts se r\u00e9percutent sur les escouades proches ou suppl\u00e9mentaires.',
  'Damage taken': 'D\u00e9g\u00e2ts subis',
  'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.':
    "Les d\u00e9g\u00e2ts subis par le h\u00e9ros sont r\u00e9duits de 80% au d\u00e9but de la bataille. Chaque fois que le h\u00e9ros subit des d\u00e9g\u00e2ts, l'att\u00e9nuation est r\u00e9duite de 8% (r\u00e9duite de 4% \u00e0 chaque fois pour les 3 premiers tours), tandis que la R\u00e9sistance augmente de 20% et les d\u00e9g\u00e2ts inflig\u00e9s augmentent de 10%, cumulables jusqu'\u00e0 20 couches, jusqu'\u00e0 la fin de la bataille.",
  'Damage type usually tied to normal or physical strikes.':
    'Type de d\u00e9g\u00e2ts g\u00e9n\u00e9ralement li\u00e9 \u00e0 des frappes normales ou physiques.',
  'Deals damage back after being attacked or after a matching trigger.':
    'Inflige des d\u00e9g\u00e2ts apr\u00e8s avoir \u00e9t\u00e9 attaqu\u00e9 ou apr\u00e8s un d\u00e9clencheur correspondant.',
  Defend: 'D\u00e9fense',
  'Destructive Strike': 'Frappe destructrice',
  'Details pending': 'D\u00e9tails en attente',
  Disarm: 'D\u00e9sarmement',
  Disarmed: 'D\u00e9sarm\u00e9',
  Dodge: 'Esquive',
  Dodging: 'Esquive',
  'Dynamic icon behavior pending capture.':
    'Comportement dynamique des ic\u00f4nes en attente de capture.',
  'Dynamic icon capture pending.': "Capture d'ic\u00f4ne dynamique en attente.",
  Eternity: '\u00c9ternit\u00e9',
  Everlasting: '\u00c9ternel',
  Faltering: 'Affaiblissement',
  'Fatal Blow': 'Coup fatal',
  Feverish: 'Fi\u00e9vreux',
  'First to Attack': 'Initiative',
  'First-Aid': 'Premiers soins',
  Flammable: 'Inflammable',
  Footmen: 'Fantassins',
  'Forces or redirects enemy attacks toward the taunting squad.':
    "Force ou redirige les attaques ennemies vers l'escouade provocatrice.",
  Healing: 'Soin',
  'Healing or recovery effect that restores troop power.':
    'Effet de gu\u00e9rison ou de r\u00e9cup\u00e9ration qui restaure la puissance des troupes.',
  Inheriting: 'H\u00e9ritage',
  'Inheriting Skill': "Comp\u00e9tence d'h\u00e9ritage",
  'Inheriting skill details pending.':
    "D\u00e9tails de la comp\u00e9tence d'h\u00e9ritage en attente.",
  'Inheriting skill details will be added after capture.':
    "Les d\u00e9tails de la comp\u00e9tence d'h\u00e9ritage seront ajout\u00e9s apr\u00e8s la capture.",
  Interrupting: 'Interruption',
  'Leadership Skill': 'Comp\u00e9tence de commandement',
  Legendary: 'L\u00e9gendaire',
  'Mass Attack': 'Attaque de masse',
  Melee: 'M\u00eal\u00e9e',
  'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.':
    'D\u00e9bloquer plusieurs variantes de skin biographique peut renforcer le Pouvoir cach\u00e9 du h\u00e9ros.',
  Mythic: 'Mythique',
  'Normal Attack': 'Attaque normale',
  'Own 2 Biography Skin variants': 'Poss\u00e9der 2 variantes de skin biographique',
  'Owned skin bonus': 'Bonus de skin obtenu',
  pending: 'en attente',
  'Physical Damage': 'D\u00e9g\u00e2ts physiques',
  Poisoned: 'Empoisonn\u00e9',
  'Pre-Battle Skill': "Comp\u00e9tence d'avant-combat",
  'Pre-Battle Skills': "Comp\u00e9tences d'avant-combat",
  'Prep Skills': 'Comp\u00e9tences de pr\u00e9paration',
  Preserving: 'Pr\u00e9servation',
  'Preserving Skill': 'Comp\u00e9tence de pr\u00e9servation',
  'Preserving skill and dynamic icon details pending.':
    "D\u00e9tails de la comp\u00e9tence de pr\u00e9servation et de l'ic\u00f4ne anim\u00e9e en attente.",
  'Preserving skill details will be added after capture.':
    'Les d\u00e9tails de la comp\u00e9tence de pr\u00e9servation seront ajout\u00e9s apr\u00e8s la capture.',
  'Preserving unlock items': 'Objets de d\u00e9blocage de la comp\u00e9tence de pr\u00e9servation',
  'Prevents affected squads from recovering troop power while active.':
    "Emp\u00eache les escouades affect\u00e9es de r\u00e9cup\u00e9rer la puissance de leurs troupes lorsqu'elles sont actives.",
  'Prevents combat skill casting while active.':
    "Emp\u00eache le lancement de comp\u00e9tences de combat lorsqu'il est actif.",
  'Prevents normal attacks while active.':
    "Emp\u00eache les attaques normales lorsqu'il est actif.",
  'Prevents the squad from acting or casting depending on the skill wording.':
    "Emp\u00eache l'escouade d'agir ou d'utiliser une comp\u00e9tence, selon l'effet concern\u00e9.",
  'Punishes the affected squad when it performs certain actions, often skill casting.':
    "Punit l'escouade affect\u00e9e lorsqu'elle effectue certaines actions, notamment lorsqu'elle utilise une comp\u00e9tence.",
  Recovery: 'R\u00e9cup\u00e9ration',
  'Reduces defensive value, making affected squads take more damage.':
    'R\u00e9duit la valeur d\u00e9fensive, ce qui fait que les escouades affect\u00e9es subissent plus de d\u00e9g\u00e2ts.',
  'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.':
    "Remplace la Roue de la Fortune par l'\u00c9ternit\u00e9 lorsque le skin atteint l'\u00c9toile 2.",
  Resistance: 'R\u00e9sistance',
  'Restores troop power to one or more squads.':
    'Restaure la puissance des troupes \u00e0 une ou plusieurs escouades.',
  'Restores troop power; usually shown as a recovery rate.':
    'Restaure la puissance des troupes\u00a0; g\u00e9n\u00e9ralement indiqu\u00e9 sous forme de taux de r\u00e9cup\u00e9ration.',
  'Returns or restores a defeated or heavily damaged squad effect depending on the skill.':
    'Ranime une escouade vaincue ou r\u00e9tablit une escouade gravement affaiblie, selon la comp\u00e9tence.',
  Revived: 'Ressuscit\u00e9',
  'Royal Exclusive': 'Exclusivit\u00e9 royale',
  S: 'S',
  S1: 'S1',
  S2: 'S2',
  S3: 'S3',
  S4: 'S4',
  Silence: 'Silence',
  Silenced: 'R\u00e9duit au silence',
  'Skill activated': 'Comp\u00e9tence activ\u00e9e',
  'Skill Damage': 'D\u00e9g\u00e2ts de comp\u00e9tence',
  'Skills that need one or more rounds of preparation before firing.':
    "Comp\u00e9tences qui exigent un ou plusieurs tours de pr\u00e9paration avant de s'activer.",
  'Skin advancement complete': 'Progression du skin termin\u00e9e',
  'Skin advancement unlocks the upgraded hero skill.':
    'La progression du skin d\u00e9bloque la version am\u00e9lior\u00e9e de la comp\u00e9tence du h\u00e9ros.',
  'Skin ownership grants biography attributes once details are captured.':
    'La propri\u00e9t\u00e9 du skin conf\u00e8re des attributs biographiques une fois les d\u00e9tails captur\u00e9s.',
  'Skin ownership grants the biography attributes by default.':
    'La propri\u00e9t\u00e9 du skin accorde les attributs de biographie par d\u00e9faut.',
  Sober: 'In\u00e9branlable',
  'Solid Shield': 'Bouclier solide',
  'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.':
    'Certains h\u00e9ros poss\u00e8dent plusieurs variantes de skin biographique. Elles partagent les m\u00eames attributs et la m\u00eame progression\u00a0; en obtenir plusieurs d\u00e9bloque le Pouvoir cach\u00e9.',
  SP: 'SP',
  'Special preserving unlock items add the preserving skill and moving icon.':
    'Des objets de d\u00e9blocage sp\u00e9ciaux conf\u00e8rent la comp\u00e9tence de pr\u00e9servation et une ic\u00f4ne anim\u00e9e.',
  Splash: 'D\u00e9g\u00e2ts de zone',
  'Star 1': '\u00c9toile 1',
  'Star 2': '\u00c9toile 2',
  'Star 3': '\u00c9toile 3',
  'Star 3 uses the same unique icon with a small in-place movement.':
    "\u00c0 l'\u00e9toile 3, la m\u00eame ic\u00f4ne unique s'anime l\u00e9g\u00e8rement sur place.",
  'Status Skill': 'Comp\u00e9tence de statut',
  'Stops a channeling or prep skill before it completes.':
    "Arr\u00eate une comp\u00e9tence de canalisation ou de pr\u00e9paration avant qu'elle ne soit termin\u00e9e.",
  Suppress: 'Suppression',
  Suppressed: 'Neutralis\u00e9',
  'Tactical Might': 'Puissance tactique',
  'Tactical Resistance': 'R\u00e9sistance tactique',
  Taunt: 'Provocation',
  Taunting: 'Provocation',
  'The basic attack a squad performs without casting a combat skill.':
    "L'attaque de base effectu\u00e9e par une escouade sans utiliser de comp\u00e9tence de combat.",
  "The Hero's squad": "L'escouade du h\u00e9ros",
  "The hero's squad gains 4% HP and takes 2% less damage.":
    "L'escouade du h\u00e9ros gagne 4% de PV et subit 2% de d\u00e9g\u00e2ts en moins.",
  "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.":
    "L'escouade du h\u00e9ros subit -10% de d\u00e9g\u00e2ts de comp\u00e9tence\u00a0; la l\u00e9gion du h\u00e9ros gagne 13% de R\u00e9sistance.",
  'The Once and Future King': 'Le roi qui fut et qui sera',
  'The same unique icon moves slightly in place after the preserving skill is unlocked.':
    'La m\u00eame ic\u00f4ne unique se d\u00e9place l\u00e9g\u00e8rement sur place une fois la comp\u00e9tence de pr\u00e9servation d\u00e9verrouill\u00e9e.',
  'Troop Damage': 'D\u00e9g\u00e2ts des troupes',
  'Troop Recovery Block': 'Blocage de r\u00e9cup\u00e9ration des troupes',
  'Unique icon becomes available with the inheriting skill.':
    "Une ic\u00f4ne unique devient disponible avec la comp\u00e9tence d'h\u00e9ritage.",
  'Unique skin icon available when the inheriting skill is unlocked.':
    "Une ic\u00f4ne de skin unique devient disponible apr\u00e8s le d\u00e9blocage de la comp\u00e9tence d'h\u00e9ritage.",
  Vulnerable: 'Vuln\u00e9rable',
  'Wheel of Fortune': 'Roue de la fortune',
};

export default { skills, strings };
