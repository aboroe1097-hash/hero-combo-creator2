const skills = {
  'Immortal:2': {
    type: '追击技能',
    target: '随机1支敌军',
    desc: '普通攻击后，有40%概率连续2次攻击有效范围内随机1支敌军，每次造成348%伤害。',
  },
  'Immortal:5': {
    type: '追击技能',
    target: '随机1支敌军',
    desc: '普通攻击后，有34%概率对范围内随机1支敌军造成465%伤害，并使其陷入沉默状态，1回合内无法释放战斗技能。',
  },
  'Immortal:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '使该英雄所在军团造成的伤害提高80%。',
  },
  'Wind-Walker:2': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '部队受到普通攻击时进入急救状态，每回合恢复兵力（恢复率20%），持续2回合；急救状态最多叠加8层。',
  },
  'Wind-Walker:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有60%概率对范围内2支敌军造成331%伤害，同时对自身部队造成331%伤害。',
  },
  'Wind-Walker:8': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有50%概率嘲讽范围内随机2支敌军，持续2回合；同时使自身进入反击状态，受到普通攻击时反击150%伤害，并使抵抗提高100%，持续2回合。',
  },
  'Hunk:2': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '部队受到伤害时，有25%概率闪避（免疫本次伤害）；每回合有50%概率使部队伤害提高50%。',
  },
  'Hunk:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有30%概率使随机2支敌军陷入混乱（技能和普通攻击会随机选取目标）与易燃状态（额外承受50%燃烧伤害），持续2回合。',
  },
  'Hunk:8': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前6回合，所有友军部队的战斗速度提高37；所受伤害的50%延后至第7回合结算；战前回合对随机2支敌军造成469%伤害。',
  },
  'Sakura:2': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前2回合，随机2支敌军优先行动；第二回合分2次对随机2支敌军造成687%伤害。',
  },
  'Sakura:5': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '前3回合，随机2支敌军受到的伤害提高50%。',
  },
  'Sakura:8': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前3回合，随机2支友方弓兵部队造成的伤害提高50%。',
  },
  'ELK:2': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '前3回合，前排弓兵部队有70%概率进入反击状态，受到普通攻击时向伤害来源反击250%伤害。',
  },
  'ELK:5': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '在第1/3/5回合，有100%概率对有效范围内随机3支敌军造成220%伤害，并施加易伤状态，使目标比上一回合多承受15%伤害，持续1回合。',
  },
  'ELK:8': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前三回合，随机2支友军有70%概率进入清醒状态（免疫沉默、缴械、压制、混乱），并使威力提高55%。',
  },
  'Mary Tudor:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有60%概率对有效范围内随机1支敌军造成325%伤害；若目标兵力低于50%，额外造成195%伤害。',
  },
  'Mary Tudor:5': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '玛丽一世每次释放战斗技能后，其部队的技能伤害提高+25%（最多叠加6次），持续至战斗结束。',
  },
  'Mary Tudor:8': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合。有50%概率对有效范围内随机2支敌军造成368%伤害，并使其陷入流血状态：每回合开始行动前受到155%伤害，持续2回合。',
  },
  'Cicero:2': {
    type: '追击技能',
    target: '随机2支敌军',
    desc: '普通攻击后，有30%概率对范围内随机2支敌军造成310%伤害，并使其受到的伤害提高20%，持续2回合。',
  },
  'Cicero:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有60%概率使随机2支敌军进入破甲状态，防御降低-200%，持续2回合。',
  },
  'Cicero:8': {
    type: '战斗技能',
    target: '随机1支友军',
    desc: '有50%概率使前排部队在接下来受到的3次伤害中获得100%闪避概率，持续2回合。',
  },
  'Beowulf:2': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '每次普通攻击后，该英雄普通攻击造成的伤害提高20%，最多叠加5层；叠满后，英雄进入群攻状态，对普通攻击目标以外的两支敌军造成等同于260% +“狂热”效果层数 *50%的伤害；该效果可触发暴击伤害。造成伤害时，还有100%概率无视敌军的闪避状态。',
  },
  'Beowulf:5': {
    type: '战前技能',
    target: '随机1支敌军',
    desc: '每发动2次普通攻击，为英雄自身及随机1支友军恢复部分兵力（恢复率：75%），并对随机1支敌军造成350%物理伤害（可触发致命一击），使目标陷入缴械状态1回合。',
  },
  'Beowulf:8': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '获得20%致命一击概率。每次受到治疗后，获得狂热效果并额外获得10%致命一击概率（狂热最多叠加8次），持续至战斗结束；同时有90%概率清除英雄身上的所有负面状态，并进入清醒状态，免疫控制效果，持续至下次行动。',
  },
  'Theodora:2': {
    type: '战斗技能',
    target: '随机1支友军',
    desc: '有60%概率对英雄自身部队以外的随机1支友军造成20%技能伤害，并使目标造成的伤害提高50%，持续2回合。',
  },
  'Theodora:5': {
    type: '战前技能',
    target: '随机3支敌军',
    desc: '英雄受到伤害时，有40%概率对所有敌军造成160%技能伤害，并有40%概率随机施加压制、沉默、缴械或混乱中的1种状态，持续2回合。',
  },
  'Theodora:8': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '前排部队造成伤害时，按所造成伤害的60%恢复自身兵力，持续6回合；该效果每回合最多触发2次。前排部队阵亡后，英雄会继续战斗1回合（对领地守卫的战斗中不生效）。',
  },
  'Caesar:2': {
    type: '战斗技能',
    target: '随机3支友军',
    desc: '从第3回合开始，凯撒每回合有40%概率释放一次技能，使我方所有骑兵部队的威力与抵抗提高200%、伤害提高60%；同时，凯撒发动追击技能的概率提高20%，持续至战斗结束（本技能仅可释放一次）。每回合，本技能的释放概率再提高20%。',
  },
  'Caesar:5': {
    type: '追击技能',
    target: '随机2支敌军',
    desc: '普通攻击后，有60%概率对随机2支敌军造成物理伤害（伤害率：480%），并将伤害的50%用于恢复我方随机2支部队的兵力。技能释放后冷却1回合。每回合首次闪避伤害时，有100%概率释放本技能，且本次不触发冷却。',
  },
  'Caesar:8': {
    type: '追击技能',
    target: '随机3支敌军',
    desc: '普通攻击后，有50%概率对2-3支敌军造成物理伤害（伤害率：310%）；每次释放技能，“统御者”的伤害率提高1倍，该效果可叠加并持续至战斗结束（本技能每回合仅可触发一次）。',
  },
  'Octavius:2': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '屋大维每回合有80%概率获得嘲讽效果。当敌军的主动技能或追击技能选取随机目标时，会优先选中屋大维。该技能每回合的触发概率降低5%。',
  },
  'Octavius:5': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '屋大维受到的伤害降低-25%；战斗开始时，为我方中排和后排部队施加闪避状态，使其免疫接下来3次伤害，持续2回合；每次受到伤害时，有100%概率使随机1支友方骑兵部队的威力提高30%[上限300%]。每支部队最多叠加10层。',
  },
  'Octavius:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '兵力首次低于85%时，我方所有部队受到的技能伤害降低-50%，持续3回合；兵力首次低于50%时，所有敌军立即受到物理伤害（伤害率：350%）；兵力首次低于25%时，所有敌军立即受到物理伤害（伤害率：350%）。技能每次触发时，自身抵抗提高150%。',
  },
  'Boudica:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '布狄卡向前冲锋，有70%概率连续3次对有效范围内中排或后排的随机1支敌军造成200%伤害；其中40%伤害用于恢复我方随机2支部队的兵力。',
  },
  'Boudica:5': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '布狄卡永久获得天生庇护。造成技能伤害时，有30%概率对目标发动毁灭打击；若布狄卡先于所有敌军行动，则以无法发动普通攻击为代价，使技能释放概率和毁灭打击概率提高20%。',
  },
  'Boudica:8': {
    type: '战前技能',
    target: '随机1支敌军',
    desc: '战斗前，为有效范围内随机2支敌军施加5层枪印；每层枪印使目标受到的技能伤害提高10%，并无视目标所受全部伤害的延迟结算效果；枪印每回合减少1层。战斗中每回合有60%概率对兵力最低的敌军造成500%巨额伤害。',
  },
  "Jeanne d'Arc:2": {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合。有50%概率对有效范围内随机2支敌军造成477%伤害，并使其受到的技能伤害提高30%。',
  },
  "Jeanne d'Arc:5": {
    type: '战斗技能',
    target: '随机2支友军',
    desc: '需准备1回合。有65%概率使我方随机2支部队进入复苏状态：受到伤害时有50%概率恢复部分兵力（恢复率：101%），持续2回合。',
  },
  "Jeanne d'Arc:8": {
    type: '战前技能',
    target: '随机3支友军',
    desc: '战斗中，我方骑兵部队释放准备技能时有60%概率跳过1回合准备（每支部队每回合最多触发1次）；同时有80%概率使英雄所在部队造成的技能伤害提高86%，持续1回合。两项效果独立判定。',
  },
  'Alfred:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有35%概率对有效范围内2支敌军造成335%伤害，并使目标的兵力恢复效果降低-40%。若目标已处于无法恢复兵力或兵力恢复受限的状态，则其受到的技能伤害提高30%，持续2回合。',
  },
  'Alfred:5': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有30%概率对所有敌军造成492%巨额伤害，代价是我方所有部队受到95%伤害。',
  },
  'Alfred:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '阿尔弗雷德临危受命。其部队兵力首次低于90%/70%/50%/30%时，战斗技能释放概率提高50%，所在部队造成的技能伤害提高40%、受到的伤害降低-35%，持续1回合。',
  },
  'Ramses II:2': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '前2回合，敌我所有部队受到的物理伤害降低-45%；第3-6回合，我方所有部队每回合有80%概率进行2次普通攻击。',
  },
  'Ramses II:5': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '战斗中，我方所有弓兵部队获得40%致命一击概率；本技能最多可将致命一击概率提高至60%；超过致命一击上限的部分将乘以3倍并转化为致命一击伤害率。',
  },
  'Ramses II:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '我方部队每次触发致命一击时，为自身恢复部分兵力（恢复率：238%），并使其致命一击伤害率提高80%[上限560%]（最多叠加7次），持续至战斗结束。',
  },
  'Cleopatra VII:2': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '前4回合，我方兵力最低的部队受到攻击时有40%概率闪避来袭伤害；从第4回合开始，我方兵力最低的部队恢复部分兵力（恢复率：150%）。',
  },
  'Cleopatra VII:5': {
    type: '战前技能',
    target: '随机3支敌军',
    desc: '克利奥帕特拉魅惑敌军。每支敌军每进行2次普通攻击后，有50%概率陷入混乱，使技能或普通攻击随机选取目标，持续1回合。',
  },
  'Cleopatra VII:8': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '英雄行动时，有100%概率使处于混乱的敌军进入易伤状态：每次受到伤害后，下一次受到的伤害提高15%，持续2回合；同时有50%概率立即受到225%伤害。',
  },
  'King Arthur:2': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '战斗开始时，英雄受到的伤害降低-80%。每次受到伤害后，减伤效果降低8%，同时抵抗提高20%、造成的伤害提高10%（最多叠加16层），持续至战斗结束。',
  },
  'King Arthur:5': {
    type: '追击技能',
    target: '随机1支敌军',
    desc: '亚瑟挥舞圣剑；普通攻击后，有50%概率对有效范围内随机1支敌军造成700%物理伤害，其中40%伤害用于恢复随机2支友军的兵力。释放“石中剑”后，有50%概率额外对敌方中排或后排部队再施放一次。',
  },
  'King Arthur:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '亚瑟受到祝福，永久使自身受到的治疗效果提高15%。我方部队每造成6次伤害，“石中剑”的释放概率提高4%，最多叠加5层，持续至战斗结束。叠满后，造成伤害时有100%概率无视敌军的闪避状态，持续2回合。',
  },
  'Leonidas:2': {
    type: '追击技能',
    target: '随机2支敌军',
    desc: '普通攻击后，有40%概率使有效范围内随机2支敌军的威力降低-50%、抵抗降低-50%，并使其沉默1回合。',
  },
  'Leonidas:5': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有50%概率对有效范围内随机2-3支敌军造成220%伤害。',
  },
  'Leonidas:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '前2回合，我方所有弓兵部队每回合恢复部分兵力（恢复率：55%）；从第3回合开始，我方所有弓兵部队受到的伤害降低-30%，并获得5%吸血效果，持续至战斗结束。',
  },
  'Isabella I:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '每回合有70%概率向随机1支敌军喷吐龙焰，共攻击6次，每次造成83%燃烧伤害；若本回合命中所有敌军，则随机1支友军获得清明状态（免疫压制、沉默、缴械、混乱效果），持续1回合。',
  },
  'Isabella I:5': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '从第3回合开始，英雄所在部队以永久处于燃烧状态为代价，每回合有70%概率对随机2支敌军造成236%燃烧伤害，随后使其战斗技能伤害降低-20%。',
  },
  'Isabella I:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '为因技能2而处于清醒状态的我方部队施加护盾，使其接下来2次受到的伤害降低-50%；首次处于燃烧状态时，为我方前排部队恢复大量兵力（恢复率：304），并在接下来的1回合内压制有效范围内随机1-2支敌军。',
  },
  'Desert Storm:2': {
    type: '战前技能',
    target: '随机3支敌军',
    desc: '在第1、3、5回合，使所有敌军进入诅咒、燃烧和中毒状态，并在对应回合分别造成24%、29%和34%伤害，持续至战斗结束。',
  },
  'Desert Storm:5': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '第5回合开始时，随机2支友军每回合恢复兵力（恢复率：60%）。',
  },
  'Desert Storm:8': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有100%概率对范围内一支敌军造成243%伤害，并打断其蓄力技能。',
  },
  'Soaring Hawk:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率对范围内随机2支敌军造成179%伤害，并使其威力降低-38%，持续2回合。',
  },
  'Soaring Hawk:5': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '英雄所在部队受到普通攻击时，有100%概率反击，对攻击来源造成120%伤害。',
  },
  'Soaring Hawk:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '前2回合，所有友军受到的伤害降低-30%；第3回合后，英雄所在部队造成伤害时恢复30%兵力。',
  },
  'The Brave:2': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '战斗前3回合，每回合有80%概率缴械范围内2支敌军。',
  },
  'The Brave:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合，有30%概率沉默范围内随机2支敌军，持续2回合。',
  },
  'The Brave:8': {
    type: '战前技能',
    target: '随机3支敌军',
    desc: '战斗中，所有敌军的威力和抵抗降低-60%、战斗速度降低-100；从第5回合起，受到的伤害提高5%、造成的伤害降低-5%；我方所有骑兵造成的伤害提高40%。',
  },
  'Jade Eagle:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率发动2次攻击，每次对有效范围内随机2支敌军造成142%伤害，并有25%概率沉默目标1回合。',
  },
  'Jade Eagle:4': {
    type: '统帅技能',
    target: '英雄所在部队',
    desc: '英雄所在部队中的弓兵威力提高60%、造成的伤害提高20%、受到的伤害提高20%。',
  },
  'Jade Eagle:5': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '需准备1回合。有50%概率对所有敌军造成310%伤害：敌方步兵无法恢复兵力，敌方骑兵的战斗技能伤害降低-50%，敌方弓兵被缴械，持续1回合。',
  },
  'Jade Eagle:8': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '在第2和第4回合，有100%概率对范围内随机3支敌军造成863%巨额伤害；若目标处于缴械或压制状态，则额外受到40%伤害，持续2回合。',
  },
  'Immortal Guardian:2': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '英雄所在部队受到的伤害降低-30%。',
  },
  'Immortal Guardian:5': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '战斗中，范围内随机2支敌军释放战斗技能或普通攻击时，对其造成的伤害降低-5%，该效果最多叠加8次。',
  },
  'Immortal Guardian:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '前3回合，所有友军受到的伤害降低-20%；受到伤害时有50%概率恢复兵力（恢复率：45%）。',
  },
  'Divine Arrow:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有25%概率对随机2支敌军造成211%伤害，并缴械其1回合。',
  },
  'Divine Arrow:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有30%概率施加连锁状态，连接随机2支敌军；其中一支受到伤害时，另一支也会承受25%伤害，持续2回合。',
  },
  'Divine Arrow:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '战斗中，所有友方弓兵获得溅射状态，普通攻击还会对后排2支敌军造成40%伤害。',
  },
  'Che Liu:2': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '部队造成的伤害提高50%。当前兵力减半时，额外获得100%威力和抵抗。',
  },
  'Che Liu:5': {
    type: '追击技能',
    target: '随机1支敌军',
    desc: '普通攻击后，有100%概率对范围内一支敌军造成247%伤害。',
  },
  'Che Liu:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '当前兵力低于战斗开始时兵力的50%后，有100%概率连续进行两次普通攻击。英雄所在部队被击败或士气崩溃时，该英雄会继续战斗一回合（进攻领地时，若军团忠诚度低于叛军狂热值，英雄将无法继续战斗）。',
  },
  'War Lord:2': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '战斗期间，所有友方骑兵部队的普通攻击伤害降低-20%，战斗技能伤害提高45%。',
  },
  'War Lord:5': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '前2回合，英雄所在部队每次受到伤害时，有70%概率闪避并免疫本次伤害。',
  },
  'War Lord:8': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '在第1、3、5、7回合，有100%概率将随机1支友军最终的战斗技能释放概率提高至100%。若该技能需要准备，则有60%概率跳过1回合准备。',
  },
  'Jane:2': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '需准备1回合，有35%概率对范围内所有敌军造成334.5%伤害。',
  },
  'Jane:5': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有30%概率对范围内所有敌军造成255%伤害，并使其无法恢复兵力，持续2回合。',
  },
  'Jane:8': {
    type: '战斗技能',
    target: '随机1支友军',
    desc: '战斗期间，英雄所在部队无法发动普通攻击，作为交换，其战斗技能伤害提高35%，并对范围内随机一支敌军造成301%技能伤害。',
  },
  'Sky Breaker:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率对随机2支敌军造成325%伤害，并使其技能伤害降低-20%，持续2回合。',
  },
  'Sky Breaker:5': {
    type: '战前技能',
    target: '随机3支敌军',
    desc: '前2回合，缴械随机2支敌军，使其无法普通攻击；第2回合对所有敌军造成267.5%伤害。',
  },
  'Sky Breaker:8': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合。有50%概率对随机2支敌军造成260%伤害，并治疗自身与随机一支友军（恢复率：142%）。',
  },
  'Rokuboshuten:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率对随机2支敌军造成255%伤害，并使其威力和抵抗降低-55%，持续2回合。',
  },
  'Rokuboshuten:5': {
    type: '状态技能',
    target: '随机2支友军',
    desc: '战斗中，每次释放需要准备的技能时，英雄所在部队有100%概率进入清明状态（免疫沉默、缴械、压制和混乱），持续2回合；释放战斗技能后，有100%概率使随机两支友军的威力和抵抗提高100%，持续2回合。',
  },
  'Rokuboshuten:8': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '需准备1回合，有40%概率对所有敌军造成196.5%伤害，并沉默其1回合，使其无法释放战斗技能。',
  },
  'Bleeding Steed:2': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前3回合，2支友军造成的伤害提高60%。',
  },
  'Bleeding Steed:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合。有50%概率使随机2支敌军陷入混乱，其技能与普通攻击将随机选取目标，持续2回合。',
  },
  'Bleeding Steed:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '战斗中，任意友军受到伤害时，有50%概率恢复部分兵力（恢复率：33%）。',
  },
  'Rozen Blade:2': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有30%概率移除友方骑兵与弓兵的减益效果（战前技能施加的减益除外），并使其普通攻击有25%概率压制目标1回合，该加成持续1回合。',
  },
  'Rozen Blade:5': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '前3回合，所有友军获得100战斗速度，并有70%概率在每回合进行2次普通攻击（同类效果不可叠加）。',
  },
  'Rozen Blade:8': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '战斗中，随机2支敌军每次受到伤害时，额外承受12%伤害，最多叠加5层。',
  },
  'Jade:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '需准备1回合。有40%概率发动6次攻击，每次随机选取范围内一支敌军并造成162%伤害。',
  },
  'Jade:5': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '英雄所在部队造成的伤害提高10%，该效果每回合叠加一次。',
  },
  'Jade:8': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率对有效范围内随机2支部队造成160%伤害，并使一支敌军陷入诅咒状态；该敌军每次释放战斗技能时受到80%伤害，持续2回合。',
  },
  'Witch Hunter:2': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有30%概率对有效范围内所有敌军造成237%伤害，并施加易燃状态，使其受到的燃烧伤害提高35%，持续2回合。',
  },
  'Witch Hunter:5': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '前三回合，随机2支敌军的战斗技能伤害降低-75%，并有90%概率沉默其1回合，使其无法释放战斗技能。',
  },
  'Witch Hunter:8': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有40%概率对范围内所有敌军造成135%伤害并施加燃烧状态，使其受到142%伤害，持续2回合。',
  },
  'Peace Bringer:2': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '英雄所在部队每回合有50%概率获得强化，使本回合受到的伤害降低-50%；受到普通攻击时，有35%概率反击，对伤害来源造成190%伤害。',
  },
  'Peace Bringer:5': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '前三回合，所有部队造成的伤害降低-45%，我方所有部队受到的伤害降低-20%；从第四回合开始，我方战斗技能伤害提高20%，持续至战斗结束。',
  },
  'Peace Bringer:8': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有30%概率对范围内所有敌军造成203%伤害并施加易伤状态，使其每次受到攻击时额外承受20%伤害，持续1回合。',
  },
  'Inquisitor:2': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '需准备1回合，有35%概率对范围内所有敌军造成246%伤害并施加缴械状态，使其无法普通攻击，持续2回合。',
  },
  'Inquisitor:5': {
    type: '战前技能',
    target: '随机3支敌军',
    desc: '使所有敌军受到的弓兵伤害提高50%。',
  },
  'Inquisitor:8': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有35%概率对范围内随机2支敌军造成342%伤害；若目标处于易燃状态，则有50%概率使其陷入压制状态，无法行动。',
  },
  'BeastQueen:2': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '首回合，我方所有部队的普通攻击与追击技能伤害提高80%，该效果每回合衰减1/4。',
  },
  'BeastQueen:5': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前3回合，随机2支友军有70%概率进入溅射状态，普通攻击会对目标后方2支敌军造成160%伤害。',
  },
  'BeastQueen:8': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '战斗前3回合，前排骑兵部队有70%概率进入反击状态，受到普通攻击时向伤害来源反击250%伤害。',
  },
  'Cao Cao:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有80%概率对有效范围内随机2支敌军造成157%伤害。',
  },
  'Cao Cao:5': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '曹操每次释放战斗技能后，其部队造成的伤害提高18%，最多叠加10次，持续至战斗结束。',
  },
  'Cao Cao:7': {
    type: '主动技能',
    target: '英雄所在军团',
    desc: '使用技能后，英雄编队的行军速度提高100%、步兵威力提高70%，持续20分钟，冷却15小时。技能未激活时，战斗中仍生效50%。',
  },
  'Cao Cao:8': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有50%概率对随机1支敌军造成396%伤害，并施加踉跄状态，使目标每次受到伤害时额外承受302%伤害。每次释放技能，该效果最多触发3次，持续1回合。',
  },
  'Charles the Great:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率对有效范围内随机2支敌军造成255%伤害，并使目标抵抗降低-170%，持续2回合。',
  },
  'Charles the Great:5': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前4回合，使我方随机2支部队造成的伤害提高20%，最多叠加4次，持续至战斗结束。',
  },
  'Charles the Great:8': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有50%概率对有效范围内随机1支敌军造成510%伤害，并使我方后排部队有100%概率进入闪避状态，闪避接下来2次伤害。',
  },
  'Black Prince:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有35%概率对有效范围内随机2支敌军随机施加压制、沉默或缴械中的1种状态，持续2回合。',
  },
  'Black Prince:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '满级时有60%概率从有效范围内随机2支敌军处窃取200%抵抗，持续2回合（最多叠加2次）。',
  },
  'Black Prince:8': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合。有50%概率对有效范围内随机2支敌军造成490%伤害，并使目标威力降低-150%，持续2回合。',
  },
  'Lionheart:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率对有效范围内随机2支敌军造成250%伤害，并使狮心的技能伤害提高40%，持续1回合。',
  },
  'Lionheart:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合。有50%概率对有效范围内随机2支敌军造成288%伤害，并对抵抗最低的敌军额外造成288%伤害。',
  },
  'Lionheart:7': {
    type: '主动技能',
    target: '英雄所在军团',
    desc: '使用技能后，英雄编队的行军速度提高100%、骑兵威力提高70%，持续20分钟，冷却15小时。技能未激活时，战斗中仍生效50%。',
  },
  'Lionheart:8': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '需准备1回合。有60%概率对有效范围内所有敌军造成343%巨额伤害；准备时，使狮心获得先手状态1回合。',
  },
  'Al Fatih:2': {
    type: '战斗技能',
    target: '随机1支友军',
    desc: '有80%概率使征服者发动的普通攻击伤害提高60%，持续1回合。',
  },
  'Al Fatih:5': {
    type: '战斗技能',
    target: '随机1支友军',
    desc: '征服者的普通攻击锁定随机1支敌军，并有50%概率触发致命一击。',
  },
  'Al Fatih:7': {
    type: '主动技能',
    target: '英雄所在军团',
    desc: '使用技能后，英雄编队的行军速度提高100%、弓兵威力提高70%，持续20分钟，冷却15小时。技能未激活时，战斗中仍生效50%。',
  },
  'Al Fatih:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '征服者触发的致命一击伤害率提高60%，该效果每回合叠加1次，最多叠加4次，持续至战斗结束。',
  },
  'Edward the Confessor:2': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '我方所有部队首次受到攻击时，有100%概率进入闪避状态；前4回合，每回合有70%概率使所有敌军的技能伤害降低-40%。',
  },
  'Edward the Confessor:5': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有35%概率对有效范围内随机1支敌军造成480%伤害，并压制目标1回合。',
  },
  'Edward the Confessor:8': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '从第3回合开始，我方随机2支部队的物理伤害每回合提高30%，最多叠加4次，持续至战斗结束。',
  },
  'Constantine the Great:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合。有45%概率对有效范围内随机2支敌军造成330%伤害。',
  },
  'Constantine the Great:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率对有效范围内2支敌军造成203%伤害，并使我方后排部队的技能伤害提高50%，持续1回合。',
  },
  'Constantine the Great:8': {
    type: '战前技能',
    target: '随机1支敌军',
    desc: '我方任意部队准备释放准备技能时，君士坦丁有80%概率对有效范围内随机1支敌军造成304%伤害。',
  },
  'Genghis Khan:2': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '需准备1回合。有50%概率使所有敌军陷入流血状态，每回合受到213%伤害，持续2回合。',
  },
  'Genghis Khan:5': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有50%概率对有效范围内随机2支敌军造成202%伤害；另有50%概率对所有敌军额外造成202%伤害。',
  },
  'Genghis Khan:8': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '战斗中，我方任意部队每累计释放4次战斗技能，成吉思汗便为我方随机2支部队恢复部分兵力（恢复率：152%）。',
  },
  'Jiguang Qi:2': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '有40%概率对有效范围内所有敌军造成192%伤害。',
  },
  'Jiguang Qi:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率对有效范围内2支敌军造成220%伤害，并使其造成的物理伤害降低-40%，持续1回合。',
  },
  'Jiguang Qi:8': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '我方任意部队每释放2次战斗技能，戚继光的抵抗提高80%，最多叠加10次，持续至战斗结束。',
  },
  'Valkyrie:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有100%概率使自身部队无法发动普通攻击，造成的伤害提高30%，持续2回合；同时对范围内随机1支敌军造成218%伤害。',
  },
  'Valkyrie:5': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '需准备1回合。有45%概率对范围内3支敌军造成310%伤害。',
  },
  'Valkyrie:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '自身部队对步兵和骑兵的克制提高30%；每回合有70%概率无视敌军50%的基础抵抗。',
  },
  'Lawman:2': {
    type: '状态技能',
    target: '随机1支敌军',
    desc: '自身部队受到伤害时，有50%概率对距离2以内的随机2支部队造成63%伤害。',
  },
  'Lawman:5': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '自身部队和随机1支友军每回合恢复兵力（恢复率96.5%）。',
  },
  'Lawman:8': {
    type: '战斗技能',
    target: '随机2支友军',
    desc: '有40%概率使自身部队受到的伤害降低-30%，并替其他2支友军承受来自敌军的30%伤害，持续2回合。',
  },
  'Spectral Reaper:2': {
    type: '追击技能',
    target: '随机1支敌军',
    desc: '普通攻击后，有35%概率再次攻击同一目标，造成742%伤害，并使其无法恢复兵力，持续1回合。',
  },
  'Spectral Reaper:5': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有40%概率对有效范围内随机1支敌军造成455%伤害，并有90%概率使英雄所在部队每回合的普通攻击次数增加1次，持续1回合。',
  },
  'Spectral Reaper:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '英雄所在部队的普通攻击伤害提高100%；每次释放战斗技能后，发动追击技能的概率提高+40%，持续1回合。敌军技能计算有效范围时，英雄所在部队与敌军的距离视为+1。',
  },
  'Defender:2': {
    type: '追击技能',
    target: '随机1支友军',
    desc: '普通攻击后，有80%概率使英雄所在部队受到的伤害降低-20%，持续2回合；该状态可叠加。',
  },
  'Defender:5': {
    type: '追击技能',
    target: '随机1支敌军',
    desc: '普通攻击后，有50%概率对范围内随机1支敌军造成310%伤害，并为自身部队恢复部分兵力（恢复率67%）。',
  },
  'Defender:8': {
    type: '战斗技能',
    target: '随机2支友军',
    desc: '有35%概率使随机2支友军连续攻击两次，并使造成的伤害提高30%，持续2回合。',
  },
  'Army Breaker:2': {
    type: '战斗技能',
    target: '随机2支友军',
    desc: '有55%概率为范围内随机2支友军恢复部分兵力（恢复率84%），并移除减益效果（无法移除战前减益）。',
  },
  'Army Breaker:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有40%概率沉默范围内随机2支敌军，并使其造成的伤害降低-20%，持续2回合。',
  },
  'Army Breaker:8': {
    type: '战斗技能',
    target: '随机3支友军',
    desc: '有30%概率使所有友军在接下来受到的3次伤害中有60%概率进入闪避状态，并使威力和抵抗提高47%，持续2回合。',
  },
  'The Avalanche:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有60%概率对多个敌军目标造成226%伤害。',
  },
  'The Avalanche:5': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '需准备1回合。有40%概率对范围内随机1支敌军造成595%伤害，另有60%概率对敌方后排部队造成310%伤害，并压制其1回合，使其无法行动。',
  },
  'The Avalanche:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '战斗中，自身部队获得清明状态，免疫沉默、缴械、压制和混乱；威力提高60%，造成的伤害提高30%。',
  },
  'Dach Tengri:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有100%概率使范围内随机1支敌军受到的伤害提高6%、造成的伤害降低6%、战斗速度降低-38；并使随机2支友军受到的伤害降低-6%、造成的伤害降低-6%、战斗速度提高38，持续1回合。',
  },
  'Dach Tengri:5': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '从第4回合开始，每回合有70%概率使范围内随机2支敌军无法恢复兵力，并使随机2支友军受到的伤害降低-25%。',
  },
  'Dach Tengri:8': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前3回合，每回合使随机2支友军造成的伤害提高7%（可叠加），持续至战斗结束；从第4回合开始，赋予溅射状态，使普通攻击对后排2支敌军造成40%伤害，持续至战斗结束。',
  },
  'Tarantula:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有30%概率对范围内随机2支敌军造成641%伤害，同时使英雄所在部队与后排部队接下来2次攻击造成的伤害提高40%。若英雄所在部队位于后排，则获得双倍伤害加成，持续2回合。',
  },
  'Tarantula:5': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有35%概率对范围内随机1支敌军造成402%伤害；在后排部队下次行动前，再对距后排部队4以内的随机1支敌军造成403%伤害。',
  },
  'Tarantula:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '战斗中，英雄所在部队每回合随机获得一种增益：1-恢复部分兵力（恢复率：100%）；2-威力、抵抗、谋略威力和谋略抵抗提高60%；3-受到的伤害降低-40%。',
  },
  'Alexander:2': {
    type: '战前技能',
    target: '随机1支敌军',
    desc: '在第1和第3回合，震慑随机1支敌军，使其每次受到伤害时额外承受325%伤害，持续至战斗结束。',
  },
  'Alexander:5': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '英雄受到的伤害降低-60%，受到的治疗效果提高20%，但受到的燃烧伤害也会提高300%。',
  },
  'Alexander:8': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '有100%概率使所有敌军陷入流血状态，每回合行动前受到260%伤害，持续至战斗结束。若英雄所在部队在任意回合损失总兵力的25%，则在该回合结束时恢复部分兵力（恢复率：350%）。',
  },
  'Lancelot:2': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '需准备1回合。有50%概率对所有敌军造成356%伤害；若目标的治疗效果降低或无法恢复兵力，则额外对所有敌军造成356%伤害，并使每支敌军有90%概率陷入压制状态1回合。',
  },
  'Lancelot:5': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '英雄无法发动普通攻击（该效果无法解除）。每回合有100%概率对随机1支敌军造成356%伤害，同时随机获得勇气、正义或仁慈印记（勇气：伤害提高20%；正义：闪避率提高10%；仁慈：印记持有者行动时每回合恢复部分兵力，恢复率：67%），持续至战斗结束，最多叠加2层；集齐三种印记后，技能改为攻击所有敌军。',
  },
  'Lancelot:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '战斗开始时，为所有友军施加效果：释放准备技能时有80%概率跳过1回合准备（最多生效3次）。获得该效果及其次数耗尽时，为持有者施加1枚印记。',
  },
  'Ragnar:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有50%概率对有效范围内随机一支敌军造成420%伤害。',
  },
  'Ragnar:5': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '分别在第1回合造成160%伤害、第3回合造成320%伤害、第5回合造成480%伤害、第7回合造成640%伤害，攻击所有敌军。',
  },
  'Ragnar:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '造成伤害后，有50%概率使英雄所在部队与后排部队获得8%致命一击和毁灭打击概率，持续至战斗结束，最多叠加5层。截图最后一行尚待确认。',
  },
  'Bjorn:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有40%概率连续2次攻击范围内随机1支敌军，每次造成348%伤害；每次攻击都会重新随机选取一支敌军。',
  },
  'Bjorn:5': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '所有友军对处于沉默、缴械、压制或混乱状态的敌军造成的伤害提高+70%。敌军有30%概率使控制减益（沉默、缴械、压制和混乱）的持续时间延长1回合。',
  },
  'Bjorn:8': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '前3回合，范围内随机2支敌军造成的伤害降低-30%。第4回合时，这些部队陷入混乱，其攻击和技能会随机选取目标，持续2回合。',
  },
  'Skanda:2': {
    type: '战斗技能',
    target: '随机2支友军',
    desc: '有50%概率治疗自身和前排部队（恢复率247%）。若自身已在前排，则治疗效果翻倍。',
  },
  'Skanda:5': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有70%概率对范围内最远的敌军造成260%伤害，并压制其1回合。',
  },
  'Skanda:8': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '第5回合，移除友方前排部队的减益。目标受到伤害时，有100%概率闪避并免疫本次伤害，持续2回合。',
  },
  'Liberator:2': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '受到普通攻击时，有50%概率反击150%伤害；此外，自身部队每回合有50%概率使受到的技能伤害降低-60%，持续1回合。',
  },
  'Liberator:5': {
    type: '追击技能',
    target: '随机1支友军',
    desc: '普通攻击有80%概率施加兵力恢复封锁，持续1回合；另有70%概率使我方后排获得清明状态，免疫沉默、缴械、压制和混乱，持续1回合。',
  },
  'Liberator:8': {
    type: '战前技能',
    target: '随机3支友军',
    desc: '英雄所在部队位于前排时，前3回合所有友军受到的伤害降低-20%。从第4回合开始，后排部队造成伤害的40%会在效果结束后转化为前排兵力恢复。',
  },
  'Ashen Verdict:2': {
    type: '战斗技能',
    target: '随机3支敌军',
    desc: '我方部队每进行一次普通攻击，灰烬裁决获得1枚追猎印记。印记累积至7枚时，所有敌军额外受到400%伤害，并清除全部现有印记。',
  },
  'Ashen Verdict:5': {
    type: '战斗技能',
    target: '随机1支友军',
    desc: '英雄所在部队每回合有35%概率额外进行1次普通攻击，持续2回合；持续期间免疫缴械。',
  },
  'Ashen Verdict:8': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '英雄所在部队每进行2次普通攻击后，有35%概率对随机一支敌军施加一种状态：缴械、沉默、混乱、打断或兵力恢复封锁。每项效果独立判定，均持续1回合。',
  },
  'Warden:2': {
    type: '战前技能',
    target: '随机2支友军',
    desc: '前4回合，另外两名英雄第5技能的释放概率提高10%（仅限战斗技能与被动技能）。第5回合，释放概率提高30%，但仅对另外两名英雄其中一人的第5技能生效。',
  },
  'Warden:5': {
    type: '战前技能',
    target: '随机3支敌军、随机友军',
    desc: '自身处于控制状态（沉默、缴械、压制或混乱）时，所在部队受到的伤害降低-70%。该效果在一场战斗中每支部队最多触发3次。在第1和第5回合，对随机一支敌军造成510%伤害。',
  },
  'Warden:8': {
    type: '战前技能',
    target: '随机3支敌军',
    desc: '战斗中，英雄所在部队无法普通攻击，但我方后排部队获得强化：每回合普通攻击次数+1。每次普通攻击使其下一次技能伤害提高12%，最多叠加5回合。',
  },
  'Warhammer:2': {
    type: '战斗技能',
    target: '随机1支敌军、随机友军',
    desc: '任意友军受到伤害时，反射护甲充能层数+1。护甲达到9层后，为随机一支友军赋予一层反射护盾，并有30%概率再增加一层。护盾可将下一次来袭伤害的100%反射给攻击者，同时使护盾持有者免受本次伤害。护盾赋予后，反射护甲的全部充能层数重置。',
  },
  'Warhammer:5': {
    type: '战斗技能',
    target: '随机3支敌军、随机友军',
    desc: '有100%概率对所有敌军造成108%伤害，但所有友军会承受对敌伤害的20%。该伤害会为反射护甲充能。',
  },
  'Warhammer:8': {
    type: '战前技能',
    target: '随机3支敌军、随机友军',
    desc: '敌我双方部队的兵力恢复降低-25%。从第4回合开始，所有敌军的兵力恢复效果每回合降低-15%。该效果可叠加，持续至战斗结束。',
  },
  'Eidolon:2': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '英雄所在部队拥有10%基础闪避率，每次受到伤害后额外获得25%闪避率，最高叠加至100%。成功闪避攻击后，额外闪避率清零。',
  },
  'Eidolon:5': {
    type: '战斗技能',
    target: '随机2支友军',
    desc: '有40%概率触发：另外2支友军从随机1支敌军处汲取60%威力与抵抗。此外，每次普通攻击有100%概率额外造成250%伤害，持续1回合。',
  },
  'Eidolon:8': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '英雄所在部队成功闪避后，有33%概率恢复80%兵力，有33%概率使受到的伤害降低-35%，另有33%概率使随机2支敌军受到的伤害提高15%。各项概率独立判定且不可叠加，每项效果持续2回合。',
  },
  'Scarlet Reaver:2': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '有100%概率对敌方前排部队造成100%伤害，并有40%概率对兵力最低的敌军额外造成500%伤害。',
  },
  'Scarlet Reaver:5': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '需准备1回合。有40%概率发动5次攻击，每次随机选取一支敌军并造成150%伤害。每次攻击还有65%概率根据敌军兵种施加状态1回合：弓兵被缴械，步兵与骑兵被沉默。缴械和沉默最多叠加2层。',
  },
  'Scarlet Reaver:8': {
    type: '战前技能',
    target: '随机2支敌军',
    desc: '在第1、4、7回合，使随机2支敌军进入燃烧状态2回合，每回合造成150%伤害。英雄所在部队对骑兵的克制提高35%，所有友军对燃烧目标造成的技能伤害提高+50%。',
  },
  'Rainforest Ranger:2': {
    type: '战前技能',
    target: '随机1支友军',
    desc: '英雄所在部队造成的伤害无视敌军25%的基础抵抗。前3回合，该部队的普通攻击锁定同位置的敌军，并无视双倍基础抵抗。',
  },
  'Rainforest Ranger:5': {
    type: '追击技能',
    target: '随机1支敌军',
    desc: '普通攻击后有50%概率对目标额外造成350%伤害；额外伤害触发时，又有50%概率压制随机1支敌军1回合。',
  },
  'Rainforest Ranger:8': {
    type: '追击技能',
    target: '随机1支友军',
    desc: '普通攻击后有35%概率对目标造成600%追击伤害。若目标部队兵力比战斗开始时低50%，该追击伤害提高至810%。',
  },
  'Fortuneteller:2': {
    type: '战前技能',
    target: '随机1支敌军',
    desc: '标记随机1支敌军并使其兵力恢复降低-70%，随后根据被标记部队的兵种施加减益。步兵：所有敌军的普通攻击减伤提高+20%。弓兵：所有敌军造成的普通攻击伤害降低-40%。骑兵：所有敌军造成的技能伤害降低-30%。',
  },
  'Fortuneteller:5': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '有50%概率将随机1支敌军与被标记部队连接2回合；其中任一部队受到伤害时，另一支部队承受该伤害的50%。',
  },
  'Fortuneteller:8': {
    type: '战斗技能',
    target: '随机1支敌军',
    desc: '任意友军每释放一次战斗技能，充能层数+1。累积6层充能后，对被标记部队造成750%伤害，并压制其1回合。',
  },
  'Cyrus:2': {
    type: '战斗技能',
    target: '随机2支敌军',
    desc: '需准备1回合。有65%概率对随机2支敌军造成325%伤害，并使其无法恢复兵力1回合。本技能有80%概率跳过准备阶段直接释放。',
  },
  'Cyrus:5': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '所有友方骑兵获得风暴骑兵效果：释放主动技能时造成的伤害提高40%；释放追击技能时受到的伤害降低40%，持续2回合。我方任意部队触发风暴骑兵效果时，居鲁士获得其50%的效果，最多叠加5层，持续至战斗结束。',
  },
  'Cyrus:8': {
    type: '状态技能',
    target: '随机1支友军',
    desc: '居鲁士所在部队有10%概率闪避。每次成功闪避后，居鲁士随机获得一种效果，包括先手和清醒。若闪避失败，我方所有部队立即进入清醒状态1回合，并获得一次减伤效果，使下一次受到的伤害降低50%，每回合生效一次。',
  },
};

const strings = {
  '1 random friendly squad within effective range': '有效范围内随机1支友军',
  '3 random friendly squads within effective range': '有效范围内随机3支友军',
  'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.':
    '可在战斗中释放的技能；部分技能带有准备回合、触发概率、范围或目标限制。',
  'A cleansing or control-resistance state that helps remove or avoid negative effects.':
    '用于清除或抵抗控制的状态，可帮助移除或规避负面效果。',
  'A commander-style passive effect that usually applies as long as the hero is in the legion.':
    '统帅类被动效果，通常只要英雄在军团中便会持续生效。',
  'A control-immunity or cleansing state; usually protects from disabling effects for its duration.':
    '免疫控制或净化类状态，持续期间通常可抵御限制行动的效果。',
  'A damage-over-time status that keeps hurting the affected squad while active.':
    '持续伤害状态，生效期间会不断对目标部队造成伤害。',
  'A damage-over-time style status that keeps hurting the affected squad while active.':
    '持续伤害类状态，生效期间会不断对目标部队造成伤害。',
  'A disabling status such as Silence, Disarm, Suppress, or Confuse.':
    '限制行动的控制状态，例如沉默、缴械、压制或混乱。',
  'A normal attack state that hits additional enemy squads beyond the main target.':
    '普通攻击状态，除主要目标外还会命中额外敌军。',
  'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.':
    '由被动或状态驱动的技能，可改变状态、免疫、伤害规则或持续战斗机制。',
  'A skill that can trigger during battle when its conditions and chance roll are met.':
    '满足条件并通过概率判定后，可在战斗中触发的技能。',
  'A special damage effect that can bypass or punish defenses depending on the skill.':
    '特殊伤害效果，可根据技能机制穿透防御或惩罚防御目标。',
  'A special strike effect with its own chance and damage rate, often scaling with buffs.':
    '拥有独立触发概率与伤害率的特殊打击效果，通常会随增益成长。',
  'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.':
    '部分英雄可叠加的增益，用于强化后续效果、伤害或触发概率。',
  'A status that makes the target vulnerable to fire-related effects.':
    '使目标更容易受到火焰类效果影响的状态。',
  'A weakening status that reduces effectiveness while active.':
    '削弱状态，生效期间会降低目标的作战效能。',
  'Active Skill': '主动技能',
  'Acts before enemy squads, which can unlock extra skill effects for some heroes.':
    '先于敌军行动，部分英雄可借此解锁额外技能效果。',
  'Additional Attack': '追击技能',
  'Adds or modifies normal attacks, often creating extra hits or effects after attacks.':
    '强化或改变普通攻击，通常会在攻击后追加伤害或效果。',
  'Affected squad may attack or cast skills on random targets.':
    '受影响部队可能会随机选取目标进行攻击或释放技能。',
  'Affected squad takes more damage or loses protection while active.':
    '生效期间，受影响部队承受更多伤害或失去部分防护。',
  'All Biography Attributes activated': '所有传记属性已激活',
  'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.':
    '在战斗前或开战时生效，通常用于设置增益、减益、开局条件或前期回合规则。',
  'Armor break': '破甲',
  'Army Defense': '军队防御',
  'Army HP': '军队生命',
  'Army Might': '军队威力',
  'Arthur Pendragon the Once and Future King': '永恒之王亚瑟·潘德拉贡',
  'Avoids an incoming damage instance or attack while active.': '生效时可闪避一次来袭伤害或攻击。',
  Biography: '英雄传记',
  'Biography attributes': '传记属性',
  'Biography Attributes': '传记属性',
  'Biography skin details pending': '传记皮肤详情待补充',
  'Biography: Hidden Power': '英雄传记：隐藏之力',
  Bleeding: '流血',
  'Captured screenshot shows Eternity at Lv.10 and max level reached.':
    '现有截图显示“永恒”已达到10级并升至满级。',
  Chain: '连锁',
  Clarity: '清明',
  'Combat Skill': '战斗技能',
  'Combat Skill Damage': '战斗技能伤害',
  Confuse: '混乱',
  Confused: '混乱',
  'Control Debuff': '控制减益',
  'Counter-attack': '反击',
  Counterattack: '反击',
  Cursed: '诅咒',
  'Damage dealt by a skill rather than a normal attack.': '由技能而非普通攻击造成的伤害。',
  'Damage dealt specifically by combat skills, not normal attacks.':
    '专指战斗技能造成的伤害，不包含普通攻击。',
  'Damage or effects can jump from one squad to another.': '伤害或效果可在部队之间传递。',
  'Damage spills onto nearby or additional squads.': '伤害会溅射至附近或额外的部队。',
  'Damage taken': '受到的伤害',
  'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.':
    '战斗开始时，英雄受到的伤害降低80%。英雄每次受到伤害后，减伤降低8%（前3回合每次降低4%），同时抵抗提高20%、造成的伤害提高10%，最多叠加20层，持续至战斗结束。',
  'Damage type usually tied to normal or physical strikes.':
    '通常与普通攻击或物理打击相关的伤害类型。',
  'Deals damage back after being attacked or after a matching trigger.':
    '受到攻击或满足触发条件后，向伤害来源返还伤害。',
  Defend: '防御',
  'Destructive Strike': '毁灭打击',
  'Details pending': '详情待补充',
  Disarm: '缴械',
  Disarmed: '缴械',
  Dodge: '闪避',
  Dodging: '闪避',
  'Dynamic icon behavior pending capture.': '动态图标表现待截图确认。',
  'Dynamic icon capture pending.': '动态图标截图待补充。',
  Eternity: '永恒',
  Everlasting: '永恒',
  Faltering: '踉跄',
  'Fatal Blow': '致命一击',
  Feverish: '狂热',
  'First to Attack': '先手',
  'First-Aid': '急救',
  Flammable: '易燃',
  Footmen: '步兵',
  'Forces or redirects enemy attacks toward the taunting squad.':
    '强制或引导敌军攻击处于嘲讽状态的部队。',
  Healing: '治疗',
  'Healing or recovery effect that restores troop power.': '恢复兵力的治疗或恢复效果。',
  Inheriting: '继承',
  'Inheriting Skill': '继承技能',
  'Inheriting skill details pending.': '继承技能详情待补充。',
  'Inheriting skill details will be added after capture.': '截图确认后将补充继承技能详情。',
  Interrupting: '打断',
  'Leadership Skill': '统帅技能',
  Legendary: '传奇',
  'Mass Attack': '群攻',
  Melee: '近战',
  'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.':
    '英雄拥有额外传记皮肤款式时，解锁更多款式可强化隐藏之力。',
  Mythic: '神话',
  'Normal Attack': '普通攻击',
  'Own 2 Biography Skin variants': '拥有2款传记皮肤',
  'Owned skin bonus': '已拥有皮肤加成',
  pending: '待补充',
  'Physical Damage': '物理伤害',
  Poisoned: '中毒',
  'Pre-Battle Skill': '战前技能',
  'Pre-Battle Skills': '战前技能',
  'Prep Skills': '准备技能',
  Preserving: '保留',
  'Preserving Skill': '保留技能',
  'Preserving skill and dynamic icon details pending.': '保留技能与动态图标详情待补充。',
  'Preserving skill details will be added after capture.': '截图确认后将补充保留技能详情。',
  'Preserving unlock items': '保留技能解锁道具',
  'Prevents affected squads from recovering troop power while active.':
    '生效期间阻止受影响部队恢复兵力。',
  'Prevents combat skill casting while active.': '生效期间无法释放战斗技能。',
  'Prevents normal attacks while active.': '生效期间无法发动普通攻击。',
  'Prevents the squad from acting or casting depending on the skill wording.':
    '根据技能说明，阻止部队行动或释放技能。',
  'Punishes the affected squad when it performs certain actions, often skill casting.':
    '受影响部队执行特定行动时会受到惩罚，通常在释放技能时触发。',
  Recovery: '恢复',
  'Reduces defensive value, making affected squads take more damage.':
    '降低防御能力，使受影响部队承受更多伤害。',
  'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.':
    '皮肤升至2星后，“永恒”将替换“命运之轮”。',
  Resistance: '抵抗',
  'Restores troop power to one or more squads.': '为一支或多支部队恢复兵力。',
  'Restores troop power; usually shown as a recovery rate.': '恢复兵力，通常以恢复率显示。',
  'Returns or restores a defeated or heavily damaged squad effect depending on the skill.':
    '根据技能机制，使阵亡或重创的部队重新参战或恢复状态。',
  Revived: '复苏',
  'Royal Exclusive': '皇室专属',
  S: 'S',
  S1: 'S1',
  S2: 'S2',
  S3: 'S3',
  S4: 'S4',
  Silence: '沉默',
  Silenced: '沉默',
  'Skill activated': '技能已激活',
  'Skill Damage': '技能伤害',
  'Skills that need one or more rounds of preparation before firing.':
    '需要准备一回合或多回合后才能释放的技能。',
  'Skin advancement complete': '皮肤升星已完成',
  'Skin advancement unlocks the upgraded hero skill.': '皮肤升星可解锁强化后的英雄技能。',
  'Skin ownership grants biography attributes once details are captured.':
    '拥有皮肤后将获得传记属性，具体数值待截图确认。',
  'Skin ownership grants the biography attributes by default.': '拥有皮肤后默认获得传记属性。',
  Sober: '清醒',
  'Solid Shield': '坚固护盾',
  'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.':
    '部分英雄拥有多款传记皮肤。这些款式共享相同的传记属性与养成进度；拥有多于一款即可解锁隐藏之力。',
  SP: 'SP',
  'Special preserving unlock items add the preserving skill and moving icon.':
    '使用特殊保留技能解锁道具，可获得保留技能与动态图标。',
  Splash: '溅射',
  'Star 1': '1星',
  'Star 2': '2星',
  'Star 3': '3星',
  'Star 3 uses the same unique icon with a small in-place movement.':
    '3星沿用同一专属图标，并带有轻微的原地动态效果。',
  'Status Skill': '状态技能',
  'Stops a channeling or prep skill before it completes.': '在引导或准备技能完成前将其打断。',
  Suppress: '压制',
  Suppressed: '压制',
  'Tactical Might': '谋略威力',
  'Tactical Resistance': '谋略抵抗',
  Taunt: '嘲讽',
  Taunting: '嘲讽',
  'The basic attack a squad performs without casting a combat skill.':
    '部队不释放战斗技能时进行的基础攻击。',
  "The Hero's squad": '英雄所在部队',
  "The hero's squad gains 4% HP and takes 2% less damage.":
    '英雄所在部队生命提高4%，受到的伤害降低2%。',
  "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.":
    '英雄所在部队受到的技能伤害降低-10%；英雄所在军团的抵抗提高13%。',
  'The Once and Future King': '永恒之王',
  'The same unique icon moves slightly in place after the preserving skill is unlocked.':
    '解锁保留技能后，同一专属图标会呈现轻微的原地动态效果。',
  'Troop Damage': '部队伤害',
  'Troop Recovery Block': '兵力恢复封锁',
  'Unique icon becomes available with the inheriting skill.': '解锁继承技能后可使用专属图标。',
  'Unique skin icon available when the inheriting skill is unlocked.':
    '解锁继承技能后可使用专属皮肤图标。',
  Vulnerable: '易伤',
  'Wheel of Fortune': '命运之轮',
};

export default { skills, strings };
