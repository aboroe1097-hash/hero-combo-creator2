const skills = {
  'Immortal:2': {
    type: 'Ataque adicional',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Ap\u00f3s um ataque normal, h\u00e1 40% de chance de atacar 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance v\u00e1lido 2 vezes, causando 348% de dano a cada golpe.',
  },
  'Immortal:5': {
    type: 'Ataque adicional',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Ap\u00f3s um ataque normal, h\u00e1 34% de chance de causar 465% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance e aplicar Sil\u00eancio, impedindo-o de usar habilidades de combate por 1 turno.',
  },
  'Immortal:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Aumenta em 80% o dano da legi\u00e3o em que o her\u00f3i est\u00e1.',
  },
  'Wind-Walker:2': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Sempre que o esquadr\u00e3o sofrer um ataque b\u00e1sico, recebe Primeiros Socorros e recupera tropas a cada turno (taxa de recupera\u00e7\u00e3o: 20%). O efeito dura 2 turnos e acumula at\u00e9 8 vezes.',
  },
  'Wind-Walker:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '60% de chance de causar 331% de dano a 2 esquadr\u00f5es inimigos dentro do alcance e 331% de dano ao pr\u00f3prio esquadr\u00e3o.',
  },
  'Wind-Walker:8': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '50% de chance de Provocar 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance por 2 turnos. O pr\u00f3prio esquadr\u00e3o recebe Contra-ataque, devolve 150% de dano ao sofrer ataques b\u00e1sicos e ganha 100% de Resist\u00eancia por 2 turnos.',
  },
  'Hunk:2': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Quando o esquadr\u00e3o sofre dano, 25% de chance de evadir (imune a esse dano), 50% de chance a cada turno de aumentar o dano do esquadr\u00e3o em 50%.',
  },
  'Hunk:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '30% de chance de fazer com que 2 esquadr\u00f5es inimigos aleat\u00f3rios entrem no status Confuso (habilidade e ataques b\u00e1sicos t\u00eam como alvo alvos aleat\u00f3rios) e Inflam\u00e1vel (sofre 50% de dano de queimadura adicional), dura 2 turnos.',
  },
  'Hunk:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 6 turnos, todos os esquadr\u00f5es aliados ganham 37 de Velocidade de Combate. 50% do dano sofrido fica adiado para o turno 7, quando esta habilidade pr\u00e9-batalha causa 469% de dano a 2 inimigos aleat\u00f3rios.',
  },
  'Sakura:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 2 turnos, 2 inimigos aleat\u00f3rios agem primeiro. No segundo turno, causa 687% de dano a 2 esquadr\u00f5es escolhidos aleatoriamente entre 2 esquadr\u00f5es inimigos.',
  },
  'Sakura:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Nos primeiros 3 turnos, 2 esquadr\u00f5es inimigos aleat\u00f3rios recebem 50% de dano adicional.',
  },
  'Sakura:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 3 turnos, 2 esquadr\u00f5es de arqueiros aliados aleat\u00f3rios causam 50% de dano adicional.',
  },
  'ELK:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Nos primeiros 3 turnos, o esquadr\u00e3o de arqueiros da primeira linha tem 70% de chance de entrar no estado de contra-ataque, que causa 250% de dano de retorno \u00e0 fonte quando atacado b\u00e1sico.',
  },
  'ELK:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Na rodada 1/3/5, 100% de chance de causar 220% de dano a 3 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido e aplicar o status Vulner\u00e1vel ao alvo, fazendo com que o alvo receba 15% mais dano do que na rodada anterior, durando 1 rodada.',
  },
  'ELK:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Nos tr\u00eas primeiros turnos, 2 esquadr\u00f5es aliados aleat\u00f3rios t\u00eam 70% de chance de receber Clareza (imunidade a Sil\u00eancio, Desarmamento, Supress\u00e3o e Confus\u00e3o) e ganham 55% de Poder.',
  },
  'Mary Tudor:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '60% de chance de causar 325% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance v\u00e1lido; se o poder da tropa do alvo for inferior a 50%, 195% a mais de dano ser\u00e1 causado.',
  },
  'Mary Tudor:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Cada vez que Mary I lan\u00e7a uma habilidade de combate, seu esquadr\u00e3o causa +25% de Dano de Habilidade, (acumul\u00e1vel por at\u00e9 6 vezes) que dura at\u00e9 o final da batalha.',
  },
  'Mary Tudor:8': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 rodada de prepara\u00e7\u00e3o. 50% de chance de causar 368% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido e aplicar Sangramento. Os alvos sofrem 155% de dano antes de agir no in\u00edcio de cada rodada; dura 2 rodadas.',
  },
  'Cicero:2': {
    type: 'Ataque adicional',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Ap\u00f3s ataques b\u00e1sicos, 30% de chance de causar 310% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance, fazendo com que eles sofram 20% de dano adicional por 2 turnos.',
  },
  'Cicero:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '60% de chance de aplicar Quebra de Armadura a 2 esquadr\u00f5es inimigos aleat\u00f3rios, reduzindo a Defesa em -200% por 2 turnos.',
  },
  'Cicero:8': {
    type: 'Habilidade de combate',
    target: '1 aliado aleat\u00f3rio',
    desc: '50% de chance de conceder ao esquadr\u00e3o da primeira fila 100% de chance de Esquiva contra as pr\u00f3ximas 3 ocorr\u00eancias de dano; dura 2 turnos.',
  },
  'Beowulf:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Ap\u00f3s cada ataque normal, o dano dos ataques normais do her\u00f3i aumenta em 20%, acumulando at\u00e9 5 camadas. Ao atingir o limite, o her\u00f3i recebe Ataque em Massa e causa aos dois esquadr\u00f5es inimigos que n\u00e3o eram o alvo um dano igual a 260% + o n\u00famero de camadas de Febril *50%. Esse dano pode ser cr\u00edtico e tem 100% de chance de ignorar a Esquiva inimiga.',
  },
  'Beowulf:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'A cada 2 ataques normais, restaura o poder das tropas do esquadr\u00e3o do her\u00f3i e de 1 esquadr\u00e3o aliado aleat\u00f3rio (taxa de recupera\u00e7\u00e3o: 75%), al\u00e9m de causar 350% de Dano F\u00edsico a 1 esquadr\u00e3o inimigo aleat\u00f3rio. O golpe pode ativar Golpe Fatal e deixa o alvo Desarmado por 1 rodada.',
  },
  'Beowulf:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Ganha 20% de chance de Golpe Fatal. Ap\u00f3s cada efeito de cura recebido, ganha o efeito Febril e mais 10% de chance de Golpe Fatal (o efeito Febril pode ser acumulado at\u00e9 8 vezes), durando at\u00e9 o final da batalha; enquanto isso, 90% de chance do her\u00f3i limpar todos os status negativos do her\u00f3i e entrar no status S\u00f3brio, imune a efeitos de controle e durando at\u00e9 o pr\u00f3ximo movimento.',
  },
  'Theodora:2': {
    type: 'Habilidade de combate',
    target: '1 aliado aleat\u00f3rio',
    desc: '60% de chance de causar 20% de dano de habilidade a 1 esquadr\u00e3o aliado aleat\u00f3rio, excluindo o esquadr\u00e3o her\u00f3ico, fazendo com que os esquadr\u00f5es alvo causem 50% a mais de dano, durando 2 rodadas.',
  },
  'Theodora:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Quando o her\u00f3i sofre dano, 40% de chance de causar 160% de Dano de Habilidade a todos os esquadr\u00f5es inimigos, com 40% de chance de sujeit\u00e1-los a 1 status aleat\u00f3rio entre Suprimido/Silenciado/Desarmado/Confuso, com dura\u00e7\u00e3o de 2 rodadas.',
  },
  'Theodora:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Quando o esquadr\u00e3o da frente causa dano, restaure parte do poder da tropa do esquadr\u00e3o para 60% do dano causado, durando 6 rodadas; o efeito pode ocorrer at\u00e9 2 vezes em uma rodada. Quando o esquadr\u00e3o da primeira linha estiver morto, o her\u00f3i lutar\u00e1 por mais 1 rodada (o efeito n\u00e3o se aplica a batalhas contra os Guardi\u00f5es do Territ\u00f3rio).',
  },
  'Caesar:2': {
    type: 'Habilidade de combate',
    target: '3 aliados aleat\u00f3rios',
    desc: 'A partir da rodada 3, Caesar tem 40% de chance de lan\u00e7ar uma habilidade a cada rodada, o que aumenta a For\u00e7a e a Resist\u00eancia de todos os seus esquadr\u00f5es de Cavalaria em 200% e o Dano em 60%. Enquanto isso, Caesar tem 20% mais chance de lan\u00e7ar ataques adicionais, durando at\u00e9 o final da batalha (esta habilidade s\u00f3 pode ser lan\u00e7ada uma vez). A cada rodada, a chance de lan\u00e7ar esta habilidade aumenta em 20%.',
  },
  'Caesar:5': {
    type: 'Ataque adicional',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Ap\u00f3s um ataque normal, 60% de chance de causar dano F\u00edsico (taxa de dano: 480%) a 2 esquadr\u00f5es inimigos aleat\u00f3rios. 50% do dano ser\u00e1 usado para restaurar o poder das tropas de 2 esquadr\u00f5es aleat\u00f3rios do seu lado. A habilidade ter\u00e1 um tempo de espera de 1 rodada ap\u00f3s ser lan\u00e7ada. Na primeira vez que voc\u00ea evita o dano em cada rodada, 100% de chance de lan\u00e7ar a habilidade, sem per\u00edodo de espera acionado desta vez.',
  },
  'Caesar:8': {
    type: 'Ataque adicional',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Ap\u00f3s um ataque normal, 50% de chance de causar Dano F\u00edsico a 2-3 esquadr\u00f5es (taxa de dano: 310%); a taxa de dano do Governante Ditador aumentar\u00e1 em 1 vez cada vez que a habilidade for lan\u00e7ada; este efeito pode ser acumulado e dura at\u00e9 o final da batalha (esta habilidade s\u00f3 pode ser ativada uma vez por rodada).',
  },
  'Octavius:2': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'A cada rodada, Octavius tem 80% de chance de receber Provoca\u00e7\u00e3o. Quando uma habilidade ativa ou um ataque adicional inimigo for atingir um esquadr\u00e3o aliado aleat\u00f3rio, Octavius ser\u00e1 escolhido como alvo primeiro. A chance de ativa\u00e7\u00e3o desta habilidade diminui em 5% a cada rodada.',
  },
  'Octavius:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Octavius sofre -25% de dano. No in\u00edcio da batalha, concede Esquiva aos esquadr\u00f5es aliados do meio e da retaguarda, anulando as pr\u00f3ximas 3 ocorr\u00eancias de dano; dura 2 rodadas. Sempre que Octavius sofre dano, h\u00e1 100% de chance de aumentar em 30% o Poder de 1 esquadr\u00e3o de Cavalaria aliado aleat\u00f3rio [m\u00e1ximo de 300%]. Cada esquadr\u00e3o pode acumular at\u00e9 10 camadas.',
  },
  'Octavius:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Na primeira vez que o HP cair abaixo de 85%, todos os seus esquadr\u00f5es sofrem -50% de Dano de Habilidade por 3 rodadas. Ao cair abaixo de 50% pela primeira vez, todos os esquadr\u00f5es inimigos sofrem Dano F\u00edsico imediato (taxa de dano: 350%). O mesmo ocorre ao cair abaixo de 25% pela primeira vez (taxa de dano: 350%). Cada ativa\u00e7\u00e3o aumenta a Resist\u00eancia de Octavius em 150%.',
  },
  'Boudica:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Boudica avan\u00e7a. 70% de chance de causar 200% de dano a 1 esquadr\u00e3o inimigo no meio ou na retaguarda dentro do alcance v\u00e1lido por 3 vezes consecutivas; 40% do dano ser\u00e1 usado para restaurar o poder de 2 esquadr\u00f5es aleat\u00f3rios do seu lado.',
  },
  'Boudica:5': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Boudica possui prote\u00e7\u00e3o natural permanente. Ao causar Dano de Habilidade, 30% de chance de causar Golpe Destrutivo no alvo; se Boudica agir antes de todos os esquadr\u00f5es inimigos, aumenta sua chance de lan\u00e7ar habilidades e Golpe Destrutivo em 20% ao pre\u00e7o de impedi-la de lan\u00e7ar ataques normais.',
  },
  'Boudica:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Antes da batalha, marca 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido com 5 marcas de lan\u00e7a; cada camada de marca aumentar\u00e1 o dano de habilidade que o alvo sofre em 10%; enquanto isso, o efeito de atraso em todos os danos sofridos pelo alvo ser\u00e1 ignorado; as marcas ser\u00e3o reduzidas em 1 camada a cada rodada; nas batalhas, 60% de chance a cada rodada de causar 500% de dano massivo ao esquadr\u00e3o inimigo com o menor poder de tropa.',
  },
  "Jeanne d'Arc:2": {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 rodada de prepara\u00e7\u00e3o. 50% de chance de causar 477% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido e fazer com que os esquadr\u00f5es recebam 30% mais dano de habilidade.',
  },
  "Jeanne d'Arc:5": {
    type: 'Habilidade de combate',
    target: '2 aliados aleat\u00f3rios',
    desc: '1 rodada de prepara\u00e7\u00e3o. 65% de chance de conceder Revivido a 2 esquadr\u00f5es aliados aleat\u00f3rios. Ao sofrer dano, cada alvo tem 50% de chance de recuperar poder de tropa (taxa de recupera\u00e7\u00e3o: 101%). Dura 2 rodadas.',
  },
  "Jeanne d'Arc:8": {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Nas batalhas, seus esquadr\u00f5es de Cavalaria ter\u00e3o 60% de chance de pular 1 rodada de prepara\u00e7\u00e3o ao lan\u00e7ar habilidades de prepara\u00e7\u00e3o (podem ser acionadas at\u00e9 1 vez por cada esquadr\u00e3o em cada rodada); Enquanto isso, 80% de chance de aumentar em 86% o Dano de Habilidade causado pelo esquadr\u00e3o do Her\u00f3i, com dura\u00e7\u00e3o de 1 rodada. O resultado de cada efeito ser\u00e1 determinado de forma independente.',
  },
  'Alfred:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '35% de chance de causar 335% de dano a 2 esquadr\u00f5es inimigos dentro do alcance v\u00e1lido e fazer com que o efeito de restaura\u00e7\u00e3o do poder da tropa do alvo seja de -40%. Se o alvo j\u00e1 estiver sujeito a um status que o impe\u00e7a de restaurar o poder da tropa ou restrinja sua restaura\u00e7\u00e3o de poder, o alvo sofrer\u00e1 30% mais Dano de Habilidade por 2 rodadas.',
  },
  'Alfred:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '30% de chance de causar 492% de dano massivo a todos os esquadr\u00f5es inimigos, ao pre\u00e7o de fazer com que todos os seus esquadr\u00f5es recebam 95% de dano.',
  },
  'Alfred:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Alfred assume a miss\u00e3o em caso de emerg\u00eancia. Quando o poder da tropa de seu esquadr\u00e3o cair abaixo de 90%/70%/50%/30% pela primeira vez, Alfred ter\u00e1 50% mais chance de lan\u00e7ar habilidade de combate e seu esquadr\u00e3o causa 40% mais dano de habilidade e sofre -35% de dano, durando 1 rodada.',
  },
  'Ramses II:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Durante as primeiras 2 rodadas, todas as suas tropas e as inimigas sofrem -45% de Dano f\u00edsico. Nas rodadas 3-6, todos os seus esquadr\u00f5es t\u00eam 80% de chance de realizar 2 Ataques normais por rodada.',
  },
  'Ramses II:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Em batalha, todos os seus esquadr\u00f5es de arqueiros ganham 40% de chance de Golpe fatal. A habilidade pode elevar essa chance at\u00e9 60%; a parcela que ultrapassar o limite de Golpe fatal ser\u00e1 multiplicada por 3 e convertida em taxa de dano de Golpe fatal.',
  },
  'Ramses II:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Sempre que um esquadr\u00e3o aliado ativa Golpe Fatal, ele recupera poder de tropa (taxa de recupera\u00e7\u00e3o: 238%) e aumenta em 80% a taxa de dano de Golpe Fatal [m\u00e1ximo de 560%]. O efeito acumula at\u00e9 7 vezes e dura at\u00e9 o fim da batalha.',
  },
  'Cleopatra VII:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Nas primeiras 4 rodadas, o esquadr\u00e3o aliado com o menor poder de tropa tem 40% de chance de anular o dano ao ser atacado. A partir da rodada 4, o esquadr\u00e3o aliado com o menor poder de tropa recupera poder de tropa (taxa de recupera\u00e7\u00e3o: 150%).',
  },
  'Cleopatra VII:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Cleopatra hipnotiza o inimigo. A cada 2 ataques normais realizados por um esquadr\u00e3o inimigo, ele tem 50% de chance de ficar Confuso e escolher alvos aleat\u00f3rios para habilidades e ataques normais durante 1 rodada.',
  },
  'Cleopatra VII:8': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Quando o her\u00f3i age, h\u00e1 100% de chance de aplicar Vulner\u00e1vel ao esquadr\u00e3o inimigo Confuso: sempre que sofrer dano, ele recebe 15% a mais no pr\u00f3ximo acerto. O efeito dura 2 rodadas e tamb\u00e9m tem 50% de chance de causar 225% de dano imediato.',
  },
  'King Arthur:2': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O dano que o her\u00f3i sofre -80% no in\u00edcio da batalha. Cada vez que o Her\u00f3i sofrer Dano, o efeito de mitiga\u00e7\u00e3o de Dano ser\u00e1 reduzido em 8%, com Resist\u00eancia aumentada em 20% e Dano causado aumentado em 10% (acumul\u00e1vel em at\u00e9 16 camadas), efetivo at\u00e9 o final da batalha.',
  },
  'King Arthur:5': {
    type: 'Ataque adicional',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Arthur empunha sua espada sagrada; ap\u00f3s um ataque normal, 50% de chance de causar 700% de Dano F\u00edsico a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance v\u00e1lido. 40% desse dano ser\u00e1 usado para restaurar o poder das tropas de 2 esquadr\u00f5es aliados aleat\u00f3rios. Depois de lan\u00e7ar a Espada na Pedra, 50% de chance de aplic\u00e1-la ao esquadr\u00e3o do meio ou da retaguarda do inimigo uma vez adicionalmente.',
  },
  'King Arthur:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Arthur recebe permanentemente 15% a mais de cura. A cada 6 ocorr\u00eancias de dano causadas por esquadr\u00f5es aliados, a chance de ativar Espada na Pedra aumenta em 4%, acumulando at\u00e9 5 camadas e durando at\u00e9 o fim da batalha. Ao atingir o limite, o dano tem 100% de chance de ignorar a Esquiva inimiga por 2 rodadas.',
  },
  'Leonidas:2': {
    type: 'Ataque adicional',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Ap\u00f3s um ataque normal, h\u00e1 40% de chance de reduzir o Poder em -50% e a Resist\u00eancia em -50% de 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido, al\u00e9m de aplicar Sil\u00eancio por 1 turno.',
  },
  'Leonidas:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '50% de chance de causar 220% de dano a 2-3 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido.',
  },
  'Leonidas:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Nas primeiras 2 rodadas, todos os esquadr\u00f5es de Arqueiros aliados recuperam HP a cada rodada (taxa de recupera\u00e7\u00e3o: 55%). A partir da rodada 3, eles sofrem -30% de dano e ganham 5% de Roubo de Vida at\u00e9 o fim da batalha.',
  },
  'Isabella I:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'A cada rodada, h\u00e1 70% de chance de soprar fogo de drag\u00e3o em 1 esquadr\u00e3o inimigo aleat\u00f3rio por ataque, at\u00e9 6 vezes, causando 83% de dano de Queimadura. Se todos os esquadr\u00f5es inimigos forem atingidos na mesma rodada, 1 esquadr\u00e3o aliado aleat\u00f3rio recebe Clareza (imunidade a Supress\u00e3o, Sil\u00eancio, Desarmamento e Confus\u00e3o) por 1 rodada.',
  },
  'Isabella I:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'A partir da rodada 3, ao pre\u00e7o de permanecer em chamas permanentemente, o esquadr\u00e3o do her\u00f3i tem 70% de chance a cada rodada de causar 236% de dano de queima a 2 esquadr\u00f5es inimigos aleat\u00f3rios, cujo dano de habilidade de combate ser\u00e1 ent\u00e3o -20%.',
  },
  'Isabella I:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Concede um escudo aos esquadr\u00f5es que recebem Clareza pela habilidade 2, fazendo-os sofrer -50% de dano nas pr\u00f3ximas 2 ocorr\u00eancias. Na primeira vez que entra em Chamas, o her\u00f3i recupera uma grande quantidade de poder de tropa do esquadr\u00e3o da primeira fila (taxa de recupera\u00e7\u00e3o: 304) e, na 1\u00aa rodada seguinte, aplica Supress\u00e3o a 1-2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido.',
  },
  'Desert Storm:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Nos turnos 1, 3 e 5, todos os esquadr\u00f5es inimigos entram em Amaldi\u00e7oado, Ardente e Envenenado, causando 24%, 29% e 34% de dano nos turnos correspondentes, durando at\u00e9 o final da batalha.',
  },
  'Desert Storm:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'No in\u00edcio do turno 5, 2 esquadr\u00f5es aliados aleat\u00f3rios ir\u00e3o recuperar unidades a cada turno (taxa de recupera\u00e7\u00e3o: 60%).',
  },
  'Desert Storm:8': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '100% de chance de causar 243% de dano a um esquadr\u00e3o inimigo dentro do alcance, interrompendo a canaliza\u00e7\u00e3o de habilidades.',
  },
  'Soaring Hawk:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 179% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance e reduzir o Poder deles em -38% por 2 turnos.',
  },
  'Soaring Hawk:5': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Ao sofrer um ataque b\u00e1sico, o esquadr\u00e3o do her\u00f3i tem 100% de chance de contra-atacar e causar 120% de dano ao atacante.',
  },
  'Soaring Hawk:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 2 turnos, todos os esquadr\u00f5es aliados sofrem -30% de dano. Ap\u00f3s o turno 3, o esquadr\u00e3o do her\u00f3i recupera 30% das tropas sempre que causa dano.',
  },
  'The Brave:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Primeiros 3 turnos da batalha, 80% de chance em cada turno de desarmar 2 esquadr\u00f5es inimigos dentro do alcance.',
  },
  'The Brave:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 30% de chance de aplicar Sil\u00eancio a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance por 2 turnos.',
  },
  'The Brave:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Em batalha, todos os esquadr\u00f5es inimigos sofrem -60% de Poder e Resist\u00eancia, -100 de Velocidade de Combate, recebem 5% a mais de dano e causam -5% de dano. A partir da rodada 5, todos os esquadr\u00f5es de Cavalaria aliados causam 40% a mais de dano.',
  },
  'Jade Eagle:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de lan\u00e7ar 2 ataques, cada um causando 142% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido, com 25% de chance de silenciar os alvos por 1 rodada.',
  },
  'Jade Eagle:4': {
    type: 'Habilidade de lideran\u00e7a',
    target: 'Esquadr\u00e3o do her\u00f3i',
    desc: 'Arqueiros no Esquadr\u00e3o do Her\u00f3i t\u00eam 60% de aumento de for\u00e7a, 20% de aumento de dano causado e 20% de aumento de dano recebido.',
  },
  'Jade Eagle:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 50% de chance de causar 310% de dano a todos os esquadr\u00f5es inimigos e aplicar um efeito conforme o tipo de tropa: Infantaria n\u00e3o pode recuperar tropas, Cavalaria causa -50% de Dano de Habilidade de Combate e Arqueiros ficam Desarmados. Dura 1 turno.',
  },
  'Jade Eagle:8': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Nas rodadas 2 e 4, h\u00e1 100% de chance de causar 863% de dano massivo a 3 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance. Alvos Desarmados ou Suprimidos sofrem 40% a mais de dano. O efeito dura 2 rodadas.',
  },
  'Immortal Guardian:2': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Dano sofrido pelo esquadr\u00e3o do her\u00f3i -30%',
  },
  'Immortal Guardian:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Em batalha, quando 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance usam habilidades de combate ou ataques b\u00e1sicos, o dano que causam \u00e9 reduzido em -5%. O efeito acumula at\u00e9 8 vezes.',
  },
  'Immortal Guardian:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 3 turnos, todas as unidades aliadas sofrem -20% de dano e t\u00eam 50% de chance de recuperar tropas ao receber dano (taxa de recupera\u00e7\u00e3o: 45%).',
  },
  'Divine Arrow:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '25% de chance de causar 211% de dano a 2 inimigos aleat\u00f3rios, desarmando-os por 1 turno.',
  },
  'Divine Arrow:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '30% de chance de aplicar Corrente, ligando 2 inimigos aleat\u00f3rios. Quando um deles sofre dano, o outro tamb\u00e9m recebe 25% desse dano. Dura 2 turnos.',
  },
  'Divine Arrow:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Na batalha, todos os arqueiros aliados recebem o status Dano em \u00e1rea; cada Ataque normal tamb\u00e9m pode causar 40% de dano aos 2 esquadr\u00f5es inimigos da retaguarda.',
  },
  'Che Liu:2': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: '50% de aumento de dano para o esquadr\u00e3o. Quando a tropa atual for reduzida \u00e0 metade, ganhe 100% de For\u00e7a e Resist\u00eancia adicionais',
  },
  'Che Liu:5': {
    type: 'Ataque adicional',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Ap\u00f3s Ataques B\u00e1sicos, 100% de chance de causar 247% de dano a um esquadr\u00e3o inimigo dentro do alcance',
  },
  'Che Liu:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: '100% de chance de realizar dois ataques normais quando o poder atual das tropas cair abaixo de 50% do valor no in\u00edcio da batalha. Quando o esquadr\u00e3o deste her\u00f3i for derrotado ou tiver o moral quebrado, este Her\u00f3i continuar\u00e1 a lutar por mais um turno (ao atacar territ\u00f3rios, se a lealdade da Legi\u00e3o for menor que o Zelo Rebelde, o Her\u00f3i n\u00e3o poder\u00e1 continuar lutando).',
  },
  'War Lord:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Durante a batalha, todos os esquadr\u00f5es de cavalaria aliados recebem -20% de dano de ataque b\u00e1sico e 45% de aumento de dano de habilidade de combate.',
  },
  'War Lord:5': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Nos primeiros 2 turnos, sempre que o esquadr\u00e3o do her\u00f3i for atingido, h\u00e1 70% de chance de Esquivar e anular o dano.',
  },
  'War Lord:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Nas rodadas 1, 3, 5 e 7, h\u00e1 100% de chance de elevar para 100% a chance final de ativa\u00e7\u00e3o da habilidade de combate de 1 esquadr\u00e3o aliado aleat\u00f3rio. Se a habilidade exigir prepara\u00e7\u00e3o, h\u00e1 60% de chance de ignorar 1 rodada de prepara\u00e7\u00e3o.',
  },
  'Jane:2': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o 35% de chance de causar 334,5% de dano a todos os esquadr\u00f5es inimigos dentro do alcance.',
  },
  'Jane:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '30% de chance de causar 255% de dano a todos os esquadr\u00f5es inimigos dentro do alcance, impossibilitando-os de recuperar unidades, durando 2 turnos.',
  },
  'Jane:8': {
    type: 'Habilidade de combate',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Em batalha, o esquadr\u00e3o do her\u00f3i n\u00e3o pode realizar ataques b\u00e1sicos. Em troca, seu Dano de Habilidade de Combate aumenta em 35% e ele causa 301% de Dano de Habilidade a um esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance.',
  },
  'Sky Breaker:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 325% de dano a 2 inimigos aleat\u00f3rios e reduzir em -20% o Dano de Habilidade que eles causam por 2 turnos.',
  },
  'Sky Breaker:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Nos primeiros 2 turnos, desarma 2 esquadr\u00f5es inimigos aleat\u00f3rios, tornando-os incapazes de realizar ataques b\u00e1sicos; no 2\u00ba turno, causa 267,5% de dano a todos os esquadr\u00f5es inimigos.',
  },
  'Sky Breaker:8': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 50% de chance de causar 260% de dano a 2 inimigos aleat\u00f3rios e curar a si mesmo e a um esquadr\u00e3o aliado aleat\u00f3rio (Taxa de recupera\u00e7\u00e3o: 142%).',
  },
  'Rokuboshuten:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 255% de dano a 2 inimigos aleat\u00f3rios e reduzir o Poder e a Resist\u00eancia deles em -55% por 2 turnos.',
  },
  'Rokuboshuten:5': {
    type: 'Habilidade de status',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Em batalha, sempre que lan\u00e7a uma habilidade de prepara\u00e7\u00e3o, o esquadr\u00e3o do her\u00f3i tem 100% de chance de receber Clareza por 2 turnos, ficando imune a Sil\u00eancio, Desarmamento, Supress\u00e3o e Confus\u00e3o. Ap\u00f3s lan\u00e7ar uma habilidade de combate, h\u00e1 100% de chance de aumentar em 100% o Poder e a Resist\u00eancia de dois esquadr\u00f5es aliados aleat\u00f3rios por 2 turnos.',
  },
  'Rokuboshuten:8': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o 40% de chance de causar 196,5% de dano a todos os inimigos, silenciando-os, tornando-os incapazes de usar habilidades de combate, durando 1 turno.',
  },
  'Bleeding Steed:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 3 turnos, 2 esquadr\u00f5es aliados recebem 60% de dano adicional.',
  },
  'Bleeding Steed:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 50% de chance de confundir 2 inimigos aleat\u00f3rios, habilidades e alvos de ataques b\u00e1sicos tornam-se aleat\u00f3rios, durando 2 turnos.',
  },
  'Bleeding Steed:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Durante a batalha, quando todos os esquadr\u00f5es aliados recebem dano, 50% de chance de recuperar algumas unidades (Taxa de Recupera\u00e7\u00e3o: 33%).',
  },
  'Rozen Blade:2': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '30% de chance de remover efeitos negativos dos esquadr\u00f5es aliados de Cavalaria e Arqueiros (exceto efeitos de habilidades pr\u00e9-batalha). Em seguida, seus ataques b\u00e1sicos ganham 25% de chance de aplicar Supress\u00e3o por 1 turno; o efeito dura 1 turno.',
  },
  'Rozen Blade:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 3 turnos, todos os esquadr\u00f5es aliados ganham 100 de Velocidade de Combate e 70% de chance de realizar 2 ataques b\u00e1sicos por turno (efeitos do mesmo tipo n\u00e3o se acumulam).',
  },
  'Rozen Blade:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Durante a batalha, sempre que 2 esquadr\u00f5es inimigos aleat\u00f3rios sofrem dano, eles recebem 12% de dano extra, m\u00e1ximo de 5 ac\u00famulos.',
  },
  'Jade:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '1 turno de prepara\u00e7\u00e3o. 40% de chance de atacar 6 vezes; cada golpe escolhe aleatoriamente um esquadr\u00e3o inimigo dentro do alcance e causa 162% de dano.',
  },
  'Jade:5': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O esquadr\u00e3o do her\u00f3i causa 10% a mais de dano. Este efeito acumula uma vez por turno.',
  },
  'Jade:8': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 160% de dano a 2 esquadr\u00f5es aleat\u00f3rios dentro do alcance efetivo e aplicar Maldi\u00e7\u00e3o a um esquadr\u00e3o inimigo. O alvo amaldi\u00e7oado sofre 80% de dano sempre que usa uma habilidade de combate, durante 2 turnos.',
  },
  'Witch Hunter:2': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '30% de chance de causar 237% de dano a todos os esquadr\u00f5es inimigos dentro do alcance v\u00e1lido e infligir o status Inflam\u00e1vel a eles, aumentando o dano de Queimadura que eles recebem em 35% durante 2 turnos.',
  },
  'Witch Hunter:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Nos tr\u00eas primeiros turnos, 2 esquadr\u00f5es inimigos aleat\u00f3rios causam -75% de Dano de Habilidade de Combate e t\u00eam 90% de chance de sofrer Sil\u00eancio no 1\u00ba turno, ficando impedidos de lan\u00e7ar habilidades de combate.',
  },
  'Witch Hunter:8': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 135% de dano a todos os esquadr\u00f5es dentro do alcance e aplicar Queimadura, que causa 142% de dano por 2 turnos.',
  },
  'Peace Bringer:2': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'A cada turno, o esquadr\u00e3o do her\u00f3i tem 50% de chance de receber um b\u00f4nus que o faz sofrer -50% de dano nesse turno. Ao sofrer um ataque b\u00e1sico, tamb\u00e9m tem 35% de chance de contra-atacar e causar 190% de dano ao atacante.',
  },
  'Peace Bringer:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Nos primeiros tr\u00eas turnos, todos os esquadr\u00f5es causam -45% de dano e todos os esquadr\u00f5es aliados sofrem -20% de dano. A partir do quarto turno, o Dano de Habilidade de Combate dos aliados aumenta em 20% at\u00e9 o fim da batalha.',
  },
  'Peace Bringer:8': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '30% de chance de causar 203% de dano a todos os esquadr\u00f5es inimigos dentro do alcance e aplicar Vulner\u00e1vel. Cada vez que o inimigo for atacado, ele sofrer\u00e1 20% de dano adicional por 1 turno.',
  },
  'Inquisitor:2': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 35% de chance de causar 246% de dano a todos os esquadr\u00f5es inimigos dentro do alcance e aplicar Desarmamento, impedindo ataques normais por 2 turnos.',
  },
  'Inquisitor:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Aumenta em 50% o dano recebido dos arqueiros a todos os esquadr\u00f5es inimigos.',
  },
  'Inquisitor:8': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '35% de chance de causar 342% de dano a 2 esquadr\u00f5es aleat\u00f3rios dentro do alcance. Se o alvo estiver Inflam\u00e1vel, h\u00e1 50% de chance de aplicar Supress\u00e3o e impedi-lo de agir.',
  },
  'BeastQueen:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'No primeiro turno, o dano dos ataques normais e das habilidades de persegui\u00e7\u00e3o de todos os esquadr\u00f5es aliados aumenta em 80%. O efeito diminui em 1/4 a cada rodada.',
  },
  'BeastQueen:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 3 turnos, 2 esquadr\u00f5es aliados aleat\u00f3rios t\u00eam 70% de chance de receber Disparo Disperso, fazendo seus ataques normais causarem 160% de dano a 2 esquadr\u00f5es inimigos atr\u00e1s do alvo.',
  },
  'BeastQueen:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Nos primeiros 3 turnos da batalha, o esquadr\u00e3o de cavalaria da primeira linha tem 70% de chance de entrar no status de contra-ataque, que causa 250% de dano de retorno \u00e0 fonte quando atacado b\u00e1sico.',
  },
  'Cao Cao:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '80% de chance de causar 157% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido.',
  },
  'Cao Cao:5': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Cada vez que Cao Cao lan\u00e7a a habilidade de combate, o dano de seu esquadr\u00e3o aumenta em 18%, acumulando at\u00e9 10 vezes at\u00e9 o final da batalha.',
  },
  'Cao Cao:7': {
    type: 'Habilidade ativa',
    target: 'Legi\u00e3o do her\u00f3i',
    desc: 'Depois de usar a habilidade, a forma\u00e7\u00e3o do her\u00f3i tem 100% de b\u00f4nus de velocidade de marcha, 70% de b\u00f4nus de poder de infantaria por 20 minutos e 15 horas de recarga. Quando n\u00e3o ativo, 50% do efeito est\u00e1 em uso durante o combate.',
  },
  'Cao Cao:8': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '50% de chance de causar 396% de dano a 1 inimigo aleat\u00f3rio e aplicar o status Vacilante, aos referidos esquadr\u00f5es, fazendo com que os alvos sofram 302% a mais de dano cada vez que os alvos sofrem dano. O efeito pode ser ativado at\u00e9 3 vezes cada vez que a habilidade \u00e9 lan\u00e7ada, durando 1 turno.',
  },
  'Charles the Great:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 255% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido e fazer com que a resist\u00eancia dos alvos seja de -170% por 2 turnos.',
  },
  'Charles the Great:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 4 turnos, aumenta em 20% o dano causado por 2 esquadr\u00f5es aleat\u00f3rios do seu lado, acumul\u00e1vel por at\u00e9 4 vezes at\u00e9 o final da batalha.',
  },
  'Charles the Great:8': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '50% de chance de causar 510% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance v\u00e1lido e permitir que seu esquadr\u00e3o de tr\u00e1s tenha 100% de chance de entrar no status Esquiva nas pr\u00f3ximas 2 vezes que sofrer dano.',
  },
  'Black Prince:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '35% de chance de aplicar 1 efeito aleat\u00f3rio entre Supress\u00e3o, Sil\u00eancio e Desarmamento a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido por 2 rodadas.',
  },
  'Black Prince:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'N\u00edvel m\u00e1ximo. 60% de chance de roubar 200% de Resist\u00eancia de 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido, durando 2 turnos (Acumul\u00e1vel at\u00e9 2 vezes).',
  },
  'Black Prince:8': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 50% de chance de causar 490% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido e reduzir o Poder dos alvos em -150% por 2 turnos.',
  },
  'Lionheart:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 250% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido e aumentar o dano de habilidade de Lionheart em 40% por 1 turno.',
  },
  'Lionheart:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 50% de chance de causar 288% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido e mais 288% de dano ao esquadr\u00e3o inimigo com a menor Resist\u00eancia.',
  },
  'Lionheart:7': {
    type: 'Habilidade ativa',
    target: 'Legi\u00e3o do her\u00f3i',
    desc: 'Depois de usar a habilidade, a forma\u00e7\u00e3o do Her\u00f3i tem 100% de b\u00f4nus de velocidade de marcha, 70% de b\u00f4nus de Poder de Cavalaria por 20min, 15h de Tempo de Recarga. Quando n\u00e3o ativo, 50% do efeito est\u00e1 em uso durante o combate.',
  },
  'Lionheart:8': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 60% de chance de causar 343% de dano massivo a todos os esquadr\u00f5es inimigos dentro do alcance v\u00e1lido. Durante a prepara\u00e7\u00e3o, Lionheart recebe Primeiro a Atacar por 1 turno.',
  },
  'Al Fatih:2': {
    type: 'Habilidade de combate',
    target: '1 aliado aleat\u00f3rio',
    desc: '80% de chance de aumentar em 60% o dano causado em ataques normais feitos por Al Fatih por 1 turno.',
  },
  'Al Fatih:5': {
    type: 'Habilidade de combate',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Al Fatih tem como alvo 1 esquadr\u00e3o inimigo aleat\u00f3rio em ataques normais e tem 50% de chance de lan\u00e7ar Golpe Fatal.',
  },
  'Al Fatih:7': {
    type: 'Habilidade ativa',
    target: 'Legi\u00e3o do her\u00f3i',
    desc: 'Depois de usar a habilidade, a forma\u00e7\u00e3o do Her\u00f3i tem 100% de b\u00f4nus de velocidade de marcha, 70% de b\u00f4nus de Poder de Arqueiro por 20min, 15h de Tempo de Recarga. Quando n\u00e3o ativo, 50% do efeito est\u00e1 em uso durante o combate.',
  },
  'Al Fatih:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'A taxa de dano do Golpe Fatal de Al Fatih aumenta em 60%. O efeito acumula 1 vez por turno, at\u00e9 4 vezes, e dura at\u00e9 o fim da batalha.',
  },
  'Edward the Confessor:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Todos os esquadr\u00f5es aliados t\u00eam 100% de chance de Esquivar na primeira vez que forem atacados. Nos primeiros 4 turnos, h\u00e1 70% de chance por rodada de reduzir em -40% o Dano de Habilidade de todos os esquadr\u00f5es inimigos.',
  },
  'Edward the Confessor:5': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '35% de chance de causar 480% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance v\u00e1lido e aplicar Supress\u00e3o ao alvo por 1 turno.',
  },
  'Edward the Confessor:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'A partir do turno 3, o Dano F\u00edsico de 2 esquadr\u00f5es aleat\u00f3rios do seu lado pode ser aumentado em 30% a cada turno, acumulando at\u00e9 4 vezes at\u00e9 o final da batalha.',
  },
  'Constantine the Great:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 45% de chance de causar 330% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido.',
  },
  'Constantine the Great:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 203% de dano a 2 esquadr\u00f5es inimigos dentro do alcance v\u00e1lido e aumentar o dano de habilidade do seu esquadr\u00e3o de tr\u00e1s em 50% por 1 turno.',
  },
  'Constantine the Great:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Sempre que um esquadr\u00e3o aliado est\u00e1 preparando uma habilidade, Constantine tem 80% de chance de causar 304% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance v\u00e1lido.',
  },
  'Genghis Khan:2': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 50% de chance de aplicar Sangramento a todos os esquadr\u00f5es inimigos, causando 213% de dano por turno durante 2 turnos.',
  },
  'Genghis Khan:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '50% de chance de causar 202% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance v\u00e1lido. Tamb\u00e9m h\u00e1 50% de chance de causar mais 202% de dano a todos os esquadr\u00f5es inimigos.',
  },
  'Genghis Khan:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'A cada 4 habilidades de combate lan\u00e7adas por qualquer esquadr\u00e3o aliado, Genghis Khan recupera o poder de tropa de 2 esquadr\u00f5es aliados aleat\u00f3rios (taxa de recupera\u00e7\u00e3o: 152%).',
  },
  'Jiguang Qi:2': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 192% de dano a todos os esquadr\u00f5es inimigos dentro do alcance v\u00e1lido.',
  },
  'Jiguang Qi:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de causar 220% de dano a 2 esquadr\u00f5es inimigos dentro do alcance v\u00e1lido e reduzir em -40% o Dano F\u00edsico que eles causam por 1 turno.',
  },
  'Jiguang Qi:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'A cada 2 habilidades de combate lan\u00e7adas por qualquer esquadr\u00e3o aliado, a Resist\u00eancia de Jiguang Qi aumenta em 80%. Acumula at\u00e9 10 vezes e dura at\u00e9 o fim da batalha.',
  },
  'Valkyrie:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '100% de chance de impedir o pr\u00f3prio esquadr\u00e3o de realizar ataques normais e aumentar o dano causado em 30% por 2 turnos, al\u00e9m de causar 218% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance.',
  },
  'Valkyrie:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '1 turno de prepara\u00e7\u00e3o. 45% de chance de causar 310% de dano a 3 esquadr\u00f5es inimigos dentro do alcance.',
  },
  'Valkyrie:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O Contra-ataque do pr\u00f3prio esquadr\u00e3o contra Infantaria e Cavalaria aumenta em 30%. A cada turno, h\u00e1 70% de chance de ignorar 50% da Resist\u00eancia base do esquadr\u00e3o inimigo.',
  },
  'Lawman:2': {
    type: 'Habilidade de status',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Quando o pr\u00f3prio esquadr\u00e3o sofre dano, h\u00e1 50% de chance de causar 63% de dano a 2 esquadr\u00f5es aleat\u00f3rios dentro do alcance 2.',
  },
  'Lawman:5': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O pr\u00f3prio esquadr\u00e3o e 1 esquadr\u00e3o aliado aleatoriamente recuperam tropas a cada turno (taxa de recupera\u00e7\u00e3o de 96,5%).',
  },
  'Lawman:8': {
    type: 'Habilidade de combate',
    target: '2 aliados aleat\u00f3rios',
    desc: '40% de chance de reduzir em -30% o dano sofrido pelo pr\u00f3prio esquadr\u00e3o e fazer com que ele absorva 30% do dano destinado aos outros 2 esquadr\u00f5es aliados por 2 turnos.',
  },
  'Spectral Reaper:2': {
    type: 'Ataque adicional',
    target: '1 inimigo aleat\u00f3rio',
    desc: '35% de chance de atacar novamente ap\u00f3s ataques b\u00e1sicos ao mesmo alvo, causando 742% de dano, tornando-os incapazes de recuperar tropas por 1 turno.',
  },
  'Spectral Reaper:5': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '40% de chance de causar 455% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance v\u00e1lido. Tamb\u00e9m h\u00e1 90% de chance de conceder ao esquadr\u00e3o do her\u00f3i mais 1 ataque normal por rodada; dura 1 rodada.',
  },
  'Spectral Reaper:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O esquadr\u00e3o do her\u00f3i causa 100% mais dano em ataques normais; ap\u00f3s cada habilidade de combate ser lan\u00e7ada, o esquadr\u00e3o do her\u00f3i ganha +40% de chance de lan\u00e7ar um Ataque Adicional, com dura\u00e7\u00e3o de 1 rodada. Quando a habilidade lan\u00e7ada pelo inimigo precisar calcular seu alcance efetivo, o esquadr\u00e3o do her\u00f3i ser\u00e1 considerado +1 na dist\u00e2ncia do inimigo.',
  },
  'Defender:2': {
    type: 'Ataque adicional',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Ap\u00f3s ataques b\u00e1sicos, h\u00e1 80% de chance de fazer o esquadr\u00e3o do her\u00f3i sofrer -20% de dano por 2 rodadas. O efeito pode ser acumulado.',
  },
  'Defender:5': {
    type: 'Ataque adicional',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Ap\u00f3s ataques b\u00e1sicos, h\u00e1 50% de chance de causar 310% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance e recuperar tropas do pr\u00f3prio esquadr\u00e3o (taxa de recupera\u00e7\u00e3o: 67%).',
  },
  'Defender:8': {
    type: 'Habilidade de combate',
    target: '2 aliados aleat\u00f3rios',
    desc: '35% de chance de fazer com que 2 esquadr\u00f5es aliados aleat\u00f3rios ataquem duas vezes, com 30% de aumento de dano por 2 turnos.',
  },
  'Army Breaker:2': {
    type: 'Habilidade de combate',
    target: '2 aliados aleat\u00f3rios',
    desc: '55% de chance de recuperar tropas de 2 esquadr\u00f5es aliados aleat\u00f3rios dentro do alcance (taxa de recupera\u00e7\u00e3o: 84%) e remover efeitos negativos, exceto os aplicados antes da batalha.',
  },
  'Army Breaker:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '40% de chance de aplicar Sil\u00eancio a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance e fazer com que causem -20% de dano por 2 turnos.',
  },
  'Army Breaker:8': {
    type: 'Habilidade de combate',
    target: '3 aliados aleat\u00f3rios',
    desc: '30% de chance de conceder a todos os esquadr\u00f5es aliados 60% de chance de Esquivar das pr\u00f3ximas 3 ocorr\u00eancias de dano, al\u00e9m de aumentar o Poder e a Resist\u00eancia em 47% por 2 turnos.',
  },
  'The Avalanche:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '60% de chance de causar 226% de dano a v\u00e1rios alvos inimigos.',
  },
  'The Avalanche:5': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '1 turno de prepara\u00e7\u00e3o, 40% de chance de causar 595% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance, 60% de chance de causar 310% de dano ao esquadr\u00e3o inimigo da retaguarda, tornando-os suprimidos e incapazes de realizar a\u00e7\u00f5es por 1 turno.',
  },
  'The Avalanche:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Em combate, o pr\u00f3prio esquadr\u00e3o recebe Clareza, ficando imune a Sil\u00eancio, Desarmamento, Supress\u00e3o e Confus\u00e3o. Tamb\u00e9m ganha 60% de Poder e causa 30% a mais de dano.',
  },
  'Dach Tengri:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '100% de chance de fazer 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance sofrer 6% a mais de dano, causar 6% menos dano e perder -38 de Velocidade de Combate. Ao mesmo tempo, 2 esquadr\u00f5es aliados aleat\u00f3rios sofrem -6% de dano, causam -6% de dano adicional e ganham 38 de Velocidade de Combate por 1 turno.',
  },
  'Dach Tengri:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'A partir do turno 4, a cada turno h\u00e1 70% de chance de impedir que 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance recuperem tropas e de reduzir em -25% o dano sofrido por 2 esquadr\u00f5es aliados aleat\u00f3rios.',
  },
  'Dach Tengri:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Durante os primeiros 3 turnos, a cada turno, 2 esquadr\u00f5es aliados aleat\u00f3rios ganham 7% de dano (efeito cumulativo) at\u00e9 o fim da batalha. A partir do turno 4, recebem o status Dano em \u00e1rea, fazendo os Ataques normais causarem 40% de dano a 2 esquadr\u00f5es inimigos na retaguarda at\u00e9 o fim da batalha.',
  },
  'Tarantula:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '30% de chance de causar 641% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance. O dano do esquadr\u00e3o do her\u00f3i e do esquadr\u00e3o da retaguarda aumenta em 40% nos pr\u00f3ximos 2 ataques. Se o her\u00f3i estiver na retaguarda, recebe o dobro desse b\u00f4nus de dano. Dura 2 rodadas.',
  },
  'Tarantula:5': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '35% de chance de causar 402% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance e antes da pr\u00f3xima a\u00e7\u00e3o do esquadr\u00e3o de tr\u00e1s, causar 403% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance de 4 do esquadr\u00e3o de tr\u00e1s.',
  },
  'Tarantula:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'A cada rodada, o esquadr\u00e3o do her\u00f3i recebe aleatoriamente um destes b\u00f4nus: 1 - recupera poder de tropa (taxa de recupera\u00e7\u00e3o: 100%); 2 - Poder, Resist\u00eancia, Poder T\u00e1tico e Resist\u00eancia T\u00e1tica aumentam em 60%; 3 - sofre -40% de dano.',
  },
  'Alexander:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Nas rodadas 1 e 3, aplica Choque a 1 esquadr\u00e3o inimigo aleat\u00f3rio, fazendo-o sofrer 325% de dano adicional sempre que for atingido. O efeito dura at\u00e9 o fim da batalha.',
  },
  'Alexander:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O her\u00f3i sofre -60% de dano e recebe 20% a mais de cura, mas o dano de Queimadura sofrido aumenta em 300%.',
  },
  'Alexander:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: '100% de chance de fazer todos os esquadr\u00f5es inimigos sangrarem, fazendo com que eles sofram 260% de dano antes de agir em cada rodada, durando at\u00e9 o final da batalha. Se o esquadr\u00e3o do her\u00f3i perder 25% do poder total das tropas em qualquer rodada, parte do poder das tropas do esquadr\u00e3o ser\u00e1 restaurado (taxa de recupera\u00e7\u00e3o: 350%) no final daquela rodada.',
  },
  'Lancelot:2': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: '1 rodada de prepara\u00e7\u00e3o. 50% de chance de causar 356% de dano a todos os esquadr\u00f5es inimigos; Se um alvo estiver sujeito a um efeito de cura reduzido ou n\u00e3o for capaz de restaurar o poder da tropa, causa 356% de dano adicional a todos os esquadr\u00f5es inimigos, com 90% de chance de cada esquadr\u00e3o inimigo entrar no status Suprimido por 1 rodada.',
  },
  'Lancelot:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O her\u00f3i n\u00e3o pode realizar ataques normais, e esse efeito n\u00e3o pode ser removido. A cada rodada, h\u00e1 100% de chance de causar 356% de dano a 1 esquadr\u00e3o inimigo aleat\u00f3rio e receber um selo de Coragem, Justi\u00e7a ou Miseric\u00f3rdia. Coragem aumenta o dano em 20%; Justi\u00e7a aumenta a Taxa de Esquiva em 10%; Miseric\u00f3rdia recupera poder de tropa quando o portador age (taxa de recupera\u00e7\u00e3o: 67%). Os selos duram at\u00e9 o fim da batalha e acumulam at\u00e9 2 camadas. Com os tr\u00eas selos ativos, a habilidade passa a atingir todos os esquadr\u00f5es inimigos.',
  },
  'Lancelot:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'No in\u00edcio da batalha, concede um efeito a todos os esquadr\u00f5es aliados: ao lan\u00e7ar uma habilidade de prepara\u00e7\u00e3o, h\u00e1 80% de chance de ignorar 1 rodada de prepara\u00e7\u00e3o, com at\u00e9 3 ativa\u00e7\u00f5es. Ao receber o efeito e esgotar suas ativa\u00e7\u00f5es, o portador ganha 1 selo.',
  },
  'Ragnar:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '50% de chance de causar 420% de dano a um esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance v\u00e1lido.',
  },
  'Ragnar:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Na rodada 1 causa 160% de dano, na rodada 3 causa 320% de dano, na rodada 5 causa 480% de dano e na rodada 7 causa 640% de dano a todos os esquadr\u00f5es inimigos respectivamente.',
  },
  'Ragnar:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Ap\u00f3s causar dano, h\u00e1 50% de chance de o esquadr\u00e3o do her\u00f3i e o esquadr\u00e3o da retaguarda ganharem 8% de chance de ativar Golpe Fatal e Golpe Destrutivo. O efeito dura at\u00e9 o fim da batalha e acumula at\u00e9 5 camadas. A linha final da captura de tela ainda precisa ser confirmada.',
  },
  'Bjorn:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '40% de chance de atacar 1 esquadr\u00e3o inimigo aleat\u00f3rio dentro do alcance 2 vezes, cada vez causando 348% de dano. Cada ataque atinge aleatoriamente um inimigo.',
  },
  'Bjorn:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Todos os esquadr\u00f5es aliados causam +70% de dano a inimigos Silenciados, Desarmados, Suprimidos ou Confusos. Esquadr\u00f5es inimigos t\u00eam 30% de chance de estender em 1 turno a dura\u00e7\u00e3o desses efeitos de controle.',
  },
  'Bjorn:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Nos primeiros 3 turnos, 2 esquadr\u00f5es inimigos aleat\u00f3rios dentro do alcance causam -30% de dano. No turno 4, esses esquadr\u00f5es ficam confusos, atacando e lan\u00e7ando habilidades em alvos aleat\u00f3rios por 2 turnos.',
  },
  'Skanda:2': {
    type: 'Habilidade de combate',
    target: '2 aliados aleat\u00f3rios',
    desc: '50% de chance de curar a si mesmo e ao esquadr\u00e3o da primeira linha (taxa de recupera\u00e7\u00e3o de 247%). Se j\u00e1 estiver na primeira fila, dobre a cura.',
  },
  'Skanda:5': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '70% de chance de causar 260% de dano ao esquadr\u00e3o inimigo mais distante dentro do alcance e suprimi-lo por 1 turno.',
  },
  'Skanda:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'No turno 5, remove os efeitos negativos do esquadr\u00e3o aliado da primeira fila. Quando o alvo sofre dano, tem 100% de chance de Esquivar e anular esse dano; o efeito dura 2 turnos.',
  },
  'Liberator:2': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: '50% de chance de contra-atacar, causando 150% de dano quando atingido por ataques normais. Al\u00e9m disso, h\u00e1 50% de chance de seu pr\u00f3prio esquadr\u00e3o sofrer -60% de Dano de Habilidade a cada turno, durando 1 turno.',
  },
  'Liberator:5': {
    type: 'Ataque adicional',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Ataques normais t\u00eam 80% de chance de aplicar Bloqueio de Recupera\u00e7\u00e3o de Tropa, durando 1 turno. H\u00e1 tamb\u00e9m 70% de chance de conceder Clareza \u00e0 sua fileira de tr\u00e1s, tornando-a imune a Sil\u00eancio, Desarmado, Suprimido e Confuso por 1 turno.',
  },
  'Liberator:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 aliados aleat\u00f3rios',
    desc: 'Quando o esquadr\u00e3o do her\u00f3i est\u00e1 na primeira fila, todos os esquadr\u00f5es aliados sofrem -20% de dano nas primeiras 3 rodadas. A partir da 4\u00aa rodada, 40% do dano causado pelo esquadr\u00e3o da retaguarda \u00e9 convertido em recupera\u00e7\u00e3o de tropas para a primeira fila quando o efeito termina.',
  },
  'Ashen Verdict:2': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Ashen Verdict ganha 1 Marca de Persegui\u00e7\u00e3o para cada ataque normal realizado por seus esquadr\u00f5es. Quando as marcas chegam a 7, todos os esquadr\u00f5es inimigos recebem 400% de dano adicional e todas as marcas existentes s\u00e3o removidas.',
  },
  'Ashen Verdict:5': {
    type: 'Habilidade de combate',
    target: '1 aliado aleat\u00f3rio',
    desc: '35% de chance do esquadr\u00e3o do her\u00f3i ter 1 ataque normal adicional a cada turno, durando 2 turnos. O esquadr\u00e3o fica imune a Desarmado enquanto durar.',
  },
  'Ashen Verdict:8': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'O esquadr\u00e3o do her\u00f3i tem 35% de chance de aplicar uma condi\u00e7\u00e3o a um esquadr\u00e3o inimigo aleat\u00f3rio ap\u00f3s cada 2 ataques normais: Desarmado, Silenciado, Confuso, Interrompido ou Recupera\u00e7\u00e3o de Tropa Bloqueada. A probabilidade \u00e9 determinada independentemente para cada efeito. Todos os efeitos duram 1 turno.',
  },
  'Warden:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 aliados aleat\u00f3rios',
    desc: 'Nos primeiros 4 turnos, a chance de lan\u00e7amento de habilidade da 5\u00aa habilidade de seus outros dois her\u00f3is aumenta em 10% (limitada a habilidades de combate e habilidades passivas). No turno 5, a chance de lan\u00e7amento de habilidades aumenta em 30%, mas apenas para a 5\u00aa habilidade de um dos outros dois her\u00f3is.',
  },
  'Warden:5': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios e um aliado aleat\u00f3rio',
    desc: 'Quando sujeito a um status de controle (Silenciado, Desarmado, Suprimido ou Confuso), seu esquadr\u00e3o sofre -70% de dano. O efeito pode ser ativado at\u00e9 3 vezes em um esquadr\u00e3o em batalha. Nas rodadas 1 e 5, cause 510% de dano a um esquadr\u00e3o inimigo aleat\u00f3rio.',
  },
  'Warden:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios',
    desc: 'Durante as batalhas, os ataques normais s\u00e3o desativados para o esquadr\u00e3o do her\u00f3i, mas seu esquadr\u00e3o de tr\u00e1s ganha um buff: +1 ataque normal por rodada. Cada ataque normal aumenta o dano da pr\u00f3xima habilidade em 12%, acumulando at\u00e9 5 rodadas.',
  },
  'Warhammer:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio e um aliado aleat\u00f3rio',
    desc: 'Ganha +1 Carga de Armadura Refletora sempre que um esquadr\u00e3o aliado sofre dano. Ao atingir 9 cargas, concede uma camada de Escudo Refletor a um esquadr\u00e3o aliado aleat\u00f3rio, com 30% de chance de conceder outra. O escudo anula 100% da pr\u00f3xima ocorr\u00eancia de dano, devolve-a ao atacante e protege totalmente o portador nesse acerto. Ao conceder um escudo, todas as cargas de Armadura Refletora s\u00e3o zeradas.',
  },
  'Warhammer:5': {
    type: 'Habilidade de combate',
    target: '3 inimigos aleat\u00f3rios e um aliado aleat\u00f3rio',
    desc: '100% de chance de causar 108% de dano a todos os esquadr\u00f5es inimigos, mas todos os esquadr\u00f5es aliados recebem 20% do dano causado aos esquadr\u00f5es inimigos. Este dano fornece cargas para Armadura Refletiva.',
  },
  'Warhammer:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '3 inimigos aleat\u00f3rios e um aliado aleat\u00f3rio',
    desc: 'Reduz em -25% a Recupera\u00e7\u00e3o de Tropas dos esquadr\u00f5es aliados e inimigos. A partir do turno 4, reduz a Recupera\u00e7\u00e3o de Tropas de todos os inimigos em mais -15% por turno. O efeito acumula e dura at\u00e9 o fim do combate.',
  },
  'Eidolon:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O esquadr\u00e3o do her\u00f3i tem uma Taxa de Evas\u00e3o b\u00e1sica de 10% e ganha um b\u00f4nus de 25% cada vez que recebe dano, acumulando at\u00e9 100%. Assim que o esquadr\u00e3o conseguir escapar de um ataque, a taxa de evas\u00e3o b\u00f4nus ser\u00e1 eliminada.',
  },
  'Eidolon:5': {
    type: 'Habilidade de combate',
    target: '2 aliados aleat\u00f3rios',
    desc: '40% de chance de ativar: 2 outros esquadr\u00f5es aliados sugam 60% de For\u00e7a e Resist\u00eancia de 1 esquadr\u00e3o inimigo aleat\u00f3rio. Al\u00e9m disso, cada ataque b\u00e1sico tem 100% de chance de causar 250% de dano adicional por 1 turno.',
  },
  'Eidolon:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Ap\u00f3s uma Esquiva bem-sucedida, o esquadr\u00e3o do her\u00f3i tem 33% de chance de recuperar 80% das tropas, 33% de chance de sofrer -35% de dano e 33% de chance de fazer 2 esquadr\u00f5es inimigos aleat\u00f3rios sofrerem 15% a mais de dano. As chances s\u00e3o calculadas separadamente, n\u00e3o acumulam e cada efeito dura 2 turnos.',
  },
  'Scarlet Reaver:2': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '100% de chance de causar 100% de dano ao esquadr\u00e3o inimigo da primeira fila, com 40% de chance de causar 500% de dano adicional ao esquadr\u00e3o inimigo com as tropas mais baixas.',
  },
  'Scarlet Reaver:5': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: '1 turno de prepara\u00e7\u00e3o. 40% de chance de atacar 5 vezes; cada golpe escolhe um esquadr\u00e3o inimigo aleat\u00f3rio e causa 150% de dano. Cada golpe tamb\u00e9m tem 65% de chance de aplicar um efeito por 1 turno conforme o tipo de tropa: Desarmamento contra Arqueiros e Sil\u00eancio contra Infantaria ou Cavalaria. Desarmamento e Sil\u00eancio acumulam at\u00e9 2 camadas.',
  },
  'Scarlet Reaver:8': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '2 inimigos aleat\u00f3rios',
    desc: 'Nos turnos 1, 4 e 7, aplica Queimadura a 2 esquadr\u00f5es inimigos aleat\u00f3rios por 2 turnos, causando 150% de dano por turno. O esquadr\u00e3o do her\u00f3i ganha 35% de Contra-ataque contra Cavalaria, e todos os esquadr\u00f5es aliados causam +50% de Dano de Habilidade contra alvos em Chamas.',
  },
  'Rainforest Ranger:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O dano causado pelo esquadr\u00e3o deste her\u00f3i ignora 25% da resist\u00eancia b\u00e1sica do esquadr\u00e3o inimigo. Nos primeiros 3 turnos, os ataques normais do esquadr\u00e3o deste her\u00f3i travam no esquadr\u00e3o inimigo na mesma posi\u00e7\u00e3o e ignoram o dobro da resist\u00eancia b\u00e1sica.',
  },
  'Rainforest Ranger:5': {
    type: 'Ataque adicional',
    target: '1 inimigo aleat\u00f3rio',
    desc: '50% de chance ap\u00f3s um ataque normal de causar 350% de dano adicional ao alvo. H\u00e1 50% de chance quando o dano b\u00f4nus \u00e9 acionado de infligir Supress\u00e3o em 1 inimigo aleat\u00f3rio por 1 turno.',
  },
  'Rainforest Ranger:8': {
    type: 'Ataque adicional',
    target: '1 aliado aleat\u00f3rio',
    desc: '35% de chance ap\u00f3s um ataque normal de causar 600% de Dano Adicional ao alvo. Este dano adicional aumenta para 810% se o poder de tropa do esquadr\u00e3o alvo for 50% menor do que no in\u00edcio da batalha.',
  },
  'Fortuneteller:2': {
    type: 'Habilidades pr\u00e9-batalha',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Marca 1 esquadr\u00e3o inimigo aleat\u00f3rio, reduz sua Recupera\u00e7\u00e3o de Tropas em -70% e aplica uma penalidade conforme o tipo de tropa. Infantaria: todos os inimigos recebem um modificador de +20% de redu\u00e7\u00e3o contra dano de ataque normal. Arqueiros: todos os inimigos causam -40% de dano de ataque normal. Cavalaria: todos os inimigos causam -30% de Dano de Habilidade.',
  },
  'Fortuneteller:5': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '50% de chance de vincular 1 esquadr\u00e3o inimigo aleat\u00f3rio ao esquadr\u00e3o marcado por 2 turnos. Quando um dos esquadr\u00f5es sofre dano, o outro esquadr\u00e3o sofre 50% desse dano.',
  },
  'Fortuneteller:8': {
    type: 'Habilidade de combate',
    target: '1 inimigo aleat\u00f3rio',
    desc: 'Ganha +1 Carga sempre que um esquadr\u00e3o aliado lan\u00e7a uma habilidade de combate. Ao acumular 6 Cargas, causa 750% de dano ao esquadr\u00e3o marcado e aplica Supress\u00e3o por 1 turno.',
  },
  'Cyrus:2': {
    type: 'Habilidade de combate',
    target: '2 inimigos aleat\u00f3rios',
    desc: '1 rodada de prepara\u00e7\u00e3o. 65% de chance de causar 325% de dano a 2 esquadr\u00f5es inimigos aleat\u00f3rios, impedindo-os de restaurar o poder das tropas por 1 rodada. Esta habilidade tem 80% de chance de ignorar o est\u00e1gio de prepara\u00e7\u00e3o e ser lan\u00e7ada diretamente.',
  },
  'Cyrus:5': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'Todos os esquadr\u00f5es de Cavalaria aliados recebem Cavalaria da Tempestade: ao lan\u00e7ar uma habilidade ativa, causam 40% a mais de dano; ao lan\u00e7ar uma habilidade de persegui\u00e7\u00e3o, sofrem 40% menos dano por 2 rodadas. Quando qualquer esquadr\u00e3o aliado ativa Cavalaria da Tempestade, Cyrus recebe 50% do efeito. Acumula at\u00e9 5 camadas e dura at\u00e9 o fim da batalha.',
  },
  'Cyrus:8': {
    type: 'Habilidade de status',
    target: '1 aliado aleat\u00f3rio',
    desc: 'O esquadr\u00e3o de Cyrus tem 10% de chance de Esquiva. Ap\u00f3s cada Esquiva bem-sucedida, Cyrus recebe aleatoriamente um entre v\u00e1rios efeitos, incluindo Primeiro a Atacar e Clareza. Se a Esquiva falhar, todos os esquadr\u00f5es aliados recebem Clareza por 1 rodada e um efeito que reduz em 50% o dano do pr\u00f3ximo ataque recebido, ativado uma vez por rodada.',
  },
};

const strings = {
  Basic: 'Básico',
  Intermediate: 'Intermediário',
  Advanced: 'Avançado',
  'The entry-level skin tier — it grants an Inheriting Skill but never a Preserving Skill.':
    'O nível inicial de skins — concede uma Habilidade de Herança, mas nunca uma Habilidade de Preservação.',
  'The mid tier — it carries both an Inheriting Skill and a Preserving Skill, funded with standard Biography Seals.':
    'O nível intermediário — possui Habilidades de Herança e Preservação e é aprimorado com Selos de Biografia comuns.',
  'The top tier — it also has an Inheriting Skill and a Preserving Skill, but its upgrades cost the pricier Advanced Biography Seals.':
    'O nível mais alto — também possui as duas habilidades, mas seus aprimoramentos exigem os mais caros Selos de Biografia Avançados.',
  'Granted on activation (owning the skin).': 'Concedido ao ativar a skin (basta possuí-la).',
  "Buy directly during that hero's launch event — yours to keep once purchased.":
    'Compre diretamente durante o evento de lançamento do herói — depois da compra, a skin fica sua para sempre.',
  "Trade for it in the Eden Skin Store: Beast Queen's Mythic skin runs 400 Biography Skin coins.":
    'Troque na Eden Skin Store: a skin Mythic da Beast Queen custa 400 moedas Biography Skin.',
  'Pull from launch or return event packs (about a 1.4% drop rate per pack).':
    'Obtenha em pacotes do evento de lançamento ou retorno (cerca de 1,4% de chance por pacote).',
  'Pick select skins up from the Eden Skin Store rotation.':
    'Algumas skins ficam disponíveis na rotação da Eden Skin Store.',
  'Recruit certain skins with Super Vouchers.': 'Obtenha determinadas skins com Super Vouchers.',
  'Earn some as milestone rewards in cumulative gem-spend events.':
    'Obtenha algumas como recompensas de marco em eventos de gasto acumulado de gemas.',
  'Exchange Perfect Crystals for them in the Premium Shop.':
    'Troque Perfect Crystals por elas na Premium Shop.',
  'Only two heroes have Mythic skins.': 'Apenas dois heróis possuem skins Mythic.',
  'The most common skin tier — most heroes with a skin fall here.':
    'O nível de skin mais comum — a maioria dos heróis que possuem skin pertence a este nível.',
  'Epic Hero Medal': 'Medalha de Herói Épico',
  'Legendary Hero Medal': 'Medalha de Herói Lendário',
  'Seasonal Legendary Hero Medal': 'Medalha Sazonal de Herói Lendário',
  'Biography Seal': 'Selo de Biografia',
  'Advanced Biography Seal': 'Selo de Biografia Avançado',
  '1 random friendly squad within effective range':
    '1 esquadr\u00e3o aliado aleat\u00f3rio dentro do alcance efetivo',
  '3 random friendly squads within effective range':
    '3 esquadr\u00f5es aliados aleat\u00f3rios dentro do alcance efetivo',
  'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.':
    'Uma habilidade que pode ser lan\u00e7ada em batalha. Algumas t\u00eam tempo de prepara\u00e7\u00e3o, chance de ativa\u00e7\u00e3o, alcance e regras de alvo.',
  'A cleansing or control-resistance state that helps remove or avoid negative effects.':
    'Um estado de limpeza ou resist\u00eancia ao controle que ajuda a remover ou evitar efeitos negativos.',
  'A commander-style passive effect that usually applies as long as the hero is in the legion.':
    'Um efeito passivo estilo comandante que geralmente se aplica enquanto o her\u00f3i estiver na legi\u00e3o.',
  'A control-immunity or cleansing state; usually protects from disabling effects for its duration.':
    'Um estado de controle-imunidade ou limpeza; geralmente protege contra efeitos incapacitantes durante sua dura\u00e7\u00e3o.',
  'A damage-over-time status that keeps hurting the affected squad while active.':
    'Um status de dano ao longo do tempo que continua prejudicando o esquadr\u00e3o afetado enquanto estiver ativo.',
  'A damage-over-time style status that keeps hurting the affected squad while active.':
    'Um status de estilo de dano ao longo do tempo que continua prejudicando o esquadr\u00e3o afetado enquanto ativo.',
  'A disabling status such as Silence, Disarm, Suppress, or Confuse.':
    'Um efeito de controle, como Sil\u00eancio, Desarmamento, Supress\u00e3o ou Confus\u00e3o.',
  'A normal attack state that hits additional enemy squads beyond the main target.':
    'Um estado de ataque normal que atinge esquadr\u00f5es inimigos adicionais al\u00e9m do alvo principal.',
  'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.':
    'Uma habilidade passiva/orientada por status que altera estados, imunidades, regras de dano ou comportamento de batalha cont\u00ednuo.',
  'A skill that can trigger during battle when its conditions and chance roll are met.':
    'Uma habilidade que pode ser ativada em batalha quando suas condi\u00e7\u00f5es s\u00e3o atendidas e a rolagem de chance tem sucesso.',
  'A special damage effect that can bypass or punish defenses depending on the skill.':
    'Um efeito de dano especial que pode ignorar ou punir as defesas dependendo da habilidade.',
  'A special strike effect with its own chance and damage rate, often scaling with buffs.':
    'Um efeito de ataque especial com sua pr\u00f3pria chance e taxa de dano, geralmente aumentando com buffs.',
  'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.':
    'Um buff acumul\u00e1vel usado por alguns her\u00f3is para aumentar efeitos subsequentes, dano ou chances de ativa\u00e7\u00e3o.',
  'A status that makes the target vulnerable to fire-related effects.':
    'Um status que torna o alvo vulner\u00e1vel a efeitos relacionados ao fogo.',
  'A weakening status that reduces effectiveness while active.':
    'Um status de enfraquecimento que reduz a efic\u00e1cia enquanto ativo.',
  'Active Skill': 'Habilidade ativa',
  'Acts before enemy squads, which can unlock extra skill effects for some heroes.':
    'Age antes dos esquadr\u00f5es inimigos, o que pode liberar efeitos extras de habilidade para alguns her\u00f3is.',
  'Additional Attack': 'Ataque adicional',
  'Adds or modifies normal attacks, often creating extra hits or effects after attacks.':
    'Adiciona ou modifica ataques normais, muitas vezes criando golpes ou efeitos extras ap\u00f3s os ataques.',
  'Affected squad may attack or cast skills on random targets.':
    'O esquadr\u00e3o afetado pode atacar ou lan\u00e7ar habilidades em alvos aleat\u00f3rios.',
  'Affected squad takes more damage or loses protection while active.':
    'O esquadr\u00e3o afetado sofre mais danos ou perde prote\u00e7\u00e3o enquanto est\u00e1 ativo.',
  'All Biography Attributes activated': 'Todos os atributos de biografia ativados',
  'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.':
    'Aplica-se antes ou no in\u00edcio da batalha, geralmente definindo buffs, debuffs, condi\u00e7\u00f5es de abertura ou regras de in\u00edcio de rodada.',
  'Armor break': 'Quebra de armadura',
  'Army Defense': 'Defesa do ex\u00e9rcito',
  'Army HP': 'PV do ex\u00e9rcito',
  'Army Might': 'Poder do ex\u00e9rcito',
  'Arthur Pendragon the Once and Future King': 'Arthur Pendragon, o Rei que Foi e Ser\u00e1',
  'Avoids an incoming damage instance or attack while active.':
    'Evita uma ocorr\u00eancia de dano ou ataque enquanto estiver ativo.',
  Biography: 'Biografia',
  'Biography attributes': 'Atributos de biografia',
  'Biography Attributes': 'Atributos de biografia',
  'Biography skin details pending': 'Detalhes da Skin de Biografia ainda n\u00e3o dispon\u00edveis',
  'Biography: Hidden Power': 'Biografia: poder oculto',
  Bleeding: 'Sangramento',
  'Captured screenshot shows Eternity at Lv.10 and max level reached.':
    'A captura de tela mostra Eternidade no Nv.10 e confirma que o n\u00edvel m\u00e1ximo foi alcan\u00e7ado.',
  Chain: 'Corrente',
  Clarity: 'Clareza',
  'Combat Skill': 'Habilidade de combate',
  'Combat Skill Damage': 'Dano de habilidade de combate',
  Confuse: 'Confus\u00e3o',
  Confused: 'Confuso',
  'Control Debuff': 'Penalidade de controle',
  'Counter-attack': 'Contra-ataque',
  Counterattack: 'Contra-ataque',
  Cursed: 'Amaldi\u00e7oado',
  'Damage dealt by a skill rather than a normal attack.':
    'Dano causado por uma habilidade em vez de um ataque normal.',
  'Damage dealt specifically by combat skills, not normal attacks.':
    'Dano causado especificamente por habilidades de combate, n\u00e3o por ataques normais.',
  'Damage or effects can jump from one squad to another.':
    'Danos ou efeitos podem saltar de um esquadr\u00e3o para outro.',
  'Damage spills onto nearby or additional squads.':
    'O dano se espalha para esquadr\u00f5es pr\u00f3ximos ou adicionais.',
  'Damage taken': 'Dano sofrido',
  'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.':
    'O dano recebido pelo her\u00f3i \u00e9 reduzido em 80% no in\u00edcio da batalha. Cada vez que o her\u00f3i sofre dano, a mitiga\u00e7\u00e3o \u00e9 reduzida em 8% (reduzida em 4% a cada vez nas primeiras 3 rodadas), enquanto a Resist\u00eancia aumenta em 20% e o Dano causado aumenta em 10%, acumul\u00e1vel em at\u00e9 20 camadas, at\u00e9 o final da batalha.',
  'Damage type usually tied to normal or physical strikes.':
    'Tipo de dano geralmente vinculado a ataques normais ou f\u00edsicos.',
  'Deals damage back after being attacked or after a matching trigger.':
    'Causa dano de volta ap\u00f3s ser atacado ou ap\u00f3s um gatilho correspondente.',
  Defend: 'Defender',
  'Destructive Strike': 'Golpe destrutivo',
  'Details pending': 'Detalhes pendentes',
  Disarm: 'Desarmar',
  Disarmed: 'Desarmado',
  Dodge: 'Esquiva',
  Dodging: 'Esquivando',
  'Dynamic icon behavior pending capture.':
    'A anima\u00e7\u00e3o do \u00edcone ser\u00e1 detalhada ap\u00f3s a captura.',
  'Dynamic icon capture pending.': 'Captura do \u00edcone animado pendente.',
  Eternity: 'Eternidade',
  Everlasting: 'Eterno',
  Faltering: 'Vacilante',
  'Fatal Blow': 'Golpe fatal',
  Feverish: 'Febril',
  'First to Attack': 'Primeiro a atacar',
  'First-Aid': 'Primeiros socorros',
  Flammable: 'Inflam\u00e1vel',
  Footmen: 'Infantaria',
  'Forces or redirects enemy attacks toward the taunting squad.':
    'For\u00e7a ou redireciona os ataques inimigos para o esquadr\u00e3o provocador.',
  Healing: 'Cura',
  'Healing or recovery effect that restores troop power.':
    'Efeito de cura ou recupera\u00e7\u00e3o que restaura o poder das tropas.',
  Inheriting: 'Heran\u00e7a',
  'Inheriting Skill': 'Habilidade de Heran\u00e7a',
  'Inheriting skill details pending.': 'Detalhes da Habilidade de Heran\u00e7a pendentes.',
  'Inheriting skill details will be added after capture.':
    'Os detalhes da Habilidade de Heran\u00e7a ser\u00e3o adicionados ap\u00f3s a captura.',
  Interrupting: 'Interrup\u00e7\u00e3o',
  'Leadership Skill': 'Habilidade de lideran\u00e7a',
  Legendary: 'Lend\u00e1rio',
  'Mass Attack': 'Ataque em massa',
  Melee: 'Corpo a corpo',
  'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.':
    'Cada variante adicional de Skin de Biografia desbloqueada pode fortalecer o Poder Oculto do her\u00f3i.',
  Mythic: 'M\u00edtico',
  'Normal Attack': 'Ataque normal',
  'Own 2 Biography Skin variants': 'Possua 2 variantes de Skin de Biografia',
  'Owned skin bonus': 'B\u00f4nus de posse da skin',
  pending: 'pendente',
  'Physical Damage': 'Dano f\u00edsico',
  Poisoned: 'Envenenado',
  'Pre-Battle Skill': 'Habilidade pr\u00e9-batalha',
  'Pre-Battle Skills': 'Habilidades pr\u00e9-batalha',
  'Prep Skills': 'Habilidades de prepara\u00e7\u00e3o',
  Preserving: 'Preserva\u00e7\u00e3o',
  'Preserving Skill': 'Habilidade de Preserva\u00e7\u00e3o',
  'Preserving skill and dynamic icon details pending.':
    'Detalhes da Habilidade de Preserva\u00e7\u00e3o e do \u00edcone animado pendentes.',
  'Preserving skill details will be added after capture.':
    'Os detalhes da Habilidade de Preserva\u00e7\u00e3o ser\u00e3o adicionados ap\u00f3s a captura.',
  'Preserving unlock items': 'Itens que desbloqueiam a Preserva\u00e7\u00e3o',
  'Prevents affected squads from recovering troop power while active.':
    'Impede que os esquadr\u00f5es afetados recuperem o poder das tropas enquanto estiverem ativos.',
  'Prevents combat skill casting while active.':
    'Impede o lan\u00e7amento de habilidades de combate enquanto ativo.',
  'Prevents normal attacks while active.': 'Impede ataques normais enquanto ativo.',
  'Prevents the squad from acting or casting depending on the skill wording.':
    'Impede que o esquadr\u00e3o atue ou conjure dependendo do texto da habilidade.',
  'Punishes the affected squad when it performs certain actions, often skill casting.':
    'Pune o esquadr\u00e3o afetado quando ele realiza certas a\u00e7\u00f5es, geralmente lan\u00e7ando habilidades.',
  Recovery: 'Recupera\u00e7\u00e3o',
  'Reduces defensive value, making affected squads take more damage.':
    'Reduz o valor defensivo, fazendo com que os esquadr\u00f5es afetados sofram mais danos.',
  'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.':
    'Ao chegar \u00e0 Estrela 2, a skin substitui Roda da Fortuna por Eternidade.',
  Resistance: 'Resist\u00eancia',
  'Restores troop power to one or more squads.':
    'Restaura o poder das tropas para um ou mais esquadr\u00f5es.',
  'Restores troop power; usually shown as a recovery rate.':
    'Restaura o poder das tropas; geralmente mostrado como uma taxa de recupera\u00e7\u00e3o.',
  'Returns or restores a defeated or heavily damaged squad effect depending on the skill.':
    'Traz de volta ou restaura um esquadr\u00e3o derrotado ou muito danificado, conforme a habilidade.',
  Revived: 'Revivido',
  'Royal Exclusive': 'Exclusivo real',
  S: 'S',
  S1: 'S1',
  S2: 'S2',
  S3: 'S3',
  S4: 'S4',
  Silence: 'Sil\u00eancio',
  Silenced: 'Silenciado',
  'Skill activated': 'Habilidade ativada',
  'Skill Damage': 'Dano de habilidade',
  'Skills that need one or more rounds of preparation before firing.':
    'Habilidades que exigem uma ou mais rodadas de prepara\u00e7\u00e3o antes de serem ativadas.',
  'Skin advancement complete': 'Evolu\u00e7\u00e3o da skin conclu\u00edda',
  'Skin advancement unlocks the upgraded hero skill.':
    'Evoluir a skin desbloqueia a vers\u00e3o aprimorada da habilidade do her\u00f3i.',
  'Skin ownership grants biography attributes once details are captured.':
    'Ao possuir a skin, os Atributos de Biografia ser\u00e3o concedidos assim que os detalhes forem registrados.',
  'Skin ownership grants the biography attributes by default.':
    'Ao possuir a skin, os Atributos de Biografia s\u00e3o concedidos automaticamente.',
  Sober: 'S\u00f3brio',
  'Solid Shield': 'Escudo s\u00f3lido',
  'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.':
    'Alguns her\u00f3is possuem v\u00e1rias variantes de Skin de Biografia. Elas compartilham os mesmos Atributos de Biografia e o mesmo progresso; ter mais de uma variante desbloqueia o Poder Oculto.',
  SP: 'SP',
  'Special preserving unlock items add the preserving skill and moving icon.':
    'Itens especiais desbloqueiam a Habilidade de Preserva\u00e7\u00e3o e o \u00edcone animado.',
  Splash: 'Dano em \u00e1rea',
  'Star 1': 'Estrela 1',
  'Star 2': 'Estrela 2',
  'Star 3': 'Estrela 3',
  'Star 3 uses the same unique icon with a small in-place movement.':
    'Na Estrela 3, o mesmo \u00edcone exclusivo ganha uma leve anima\u00e7\u00e3o.',
  'Status Skill': 'Habilidade de status',
  'Stops a channeling or prep skill before it completes.':
    'Interrompe uma habilidade de canaliza\u00e7\u00e3o ou prepara\u00e7\u00e3o antes que ela seja conclu\u00edda.',
  Suppress: 'Suprimir',
  Suppressed: 'Suprimido',
  'Tactical Might': 'Poder t\u00e1tico',
  'Tactical Resistance': 'Resist\u00eancia t\u00e1tica',
  Taunt: 'Provoca\u00e7\u00e3o',
  Taunting: 'Provoca\u00e7\u00e3o',
  'The basic attack a squad performs without casting a combat skill.':
    'O ataque b\u00e1sico que um esquadr\u00e3o executa sem lan\u00e7ar uma habilidade de combate.',
  "The Hero's squad": 'O esquadr\u00e3o do her\u00f3i',
  "The hero's squad gains 4% HP and takes 2% less damage.":
    'O esquadr\u00e3o do her\u00f3i ganha 4% de HP e sofre 2% menos dano.',
  "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.":
    'O esquadr\u00e3o do Her\u00f3i sofre -10% de Dano de Habilidade; a Legi\u00e3o do Her\u00f3i ganha 13% de Resist\u00eancia.',
  'The Once and Future King': 'O Rei que Foi e Ser\u00e1',
  'The same unique icon moves slightly in place after the preserving skill is unlocked.':
    'Ao desbloquear a Habilidade de Preserva\u00e7\u00e3o, o mesmo \u00edcone exclusivo ganha uma leve anima\u00e7\u00e3o.',
  'Troop Damage': 'Dano das tropas',
  'Troop Recovery Block': 'Bloqueio de recupera\u00e7\u00e3o de tropas',
  'Unique icon becomes available with the inheriting skill.':
    'A Habilidade de Heran\u00e7a desbloqueia o \u00edcone exclusivo.',
  'Unique skin icon available when the inheriting skill is unlocked.':
    'O \u00edcone exclusivo da skin fica dispon\u00edvel ao desbloquear a Habilidade de Heran\u00e7a.',
  Vulnerable: 'Vulner\u00e1vel',
  'Wheel of Fortune': 'Roda da Fortuna',
};

export default { skills, strings };
