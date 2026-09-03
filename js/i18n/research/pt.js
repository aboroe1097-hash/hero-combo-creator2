// Explicit, reviewed Portuguese gaming copy for the Research tool.
// Canonical tree/node IDs remain stable; formulas and saved progress stay in tech-db.js.
const trees = Object.freeze({
  d1956263: {
    name: 'Produção Rápida',
    unlockCondition: 'Nenhum',
    primaryResource: 'Apenas recursos',
    pages: [],
  },
  b2691f74: {
    name: 'Desenvolvimento da Cidade',
    unlockCondition: 'Nenhum',
    primaryResource: 'Apenas recursos',
    pages: [],
  },
  '375d1626': {
    name: 'Combate Básico',
    unlockCondition: 'Nenhum',
    primaryResource: 'Medalhas de Coragem',
    pages: [],
  },
  '4a932eb0': {
    name: 'Produção de Acessórios',
    unlockCondition: 'Nenhum',
    primaryResource: 'Recursos',
    pages: [],
  },
  '802e7893': {
    name: 'Pesquisa da Legião I',
    unlockCondition: 'Nenhum',
    primaryResource: 'Recursos',
    pages: [],
  },
  '38d12254': {
    name: 'Pesquisa da Legião II',
    unlockCondition: 'Nenhum',
    primaryResource: 'Recursos',
    pages: [],
  },
  '5fef2163': {
    name: 'Pesquisa da Legião III',
    unlockCondition: 'Nenhum',
    primaryResource: 'Recursos',
    pages: [],
  },
  cc2c9ee1: {
    name: 'Pesquisa da Legião de Classe',
    unlockCondition: 'Nenhum',
    primaryResource: 'Recursos',
    pages: [],
  },
  '3929cbb9': {
    name: 'Instalações Médicas Aprimoradas',
    unlockCondition: 'Nenhum',
    primaryResource: 'Recursos',
    pages: [],
  },
  f915a84b: {
    name: 'Militar Básico',
    unlockCondition: 'Nenhum',
    primaryResource: 'Recursos',
    pages: [],
  },
  footmen_training: {
    name: 'Treinamento de Infantaria',
    unlockCondition: 'Instituto 24, Castelo 25, Quartel 25, Comemoração e Conflito da Zona 100%',
    primaryResource: 'Medalhas de Coragem',
    pages: [],
  },
  archers_training: {
    name: 'Treinamento de Arqueiros',
    unlockCondition:
      'Instituto 24, Castelo 25, Campo de Arqueiros 25, Comemoração e Conflito da Zona 100%',
    primaryResource: 'Medalhas de Coragem',
    pages: [],
  },
  cavalry_training: {
    name: 'Treinamento de Cavalaria',
    unlockCondition: 'Instituto 24, Castelo 25, Estábulo 25, Comemoração e Conflito da Zona 100%',
    primaryResource: 'Medalhas de Coragem',
    pages: [],
  },
  f0595b07: {
    name: 'Comemoração da Zona',
    unlockCondition: 'Após a primeira Batalha do Trono',
    primaryResource: 'Medalhas de Coragem',
    pages: [],
  },
  zone_conflict: {
    name: 'Conflito da Zona',
    unlockCondition: 'Nenhum',
    primaryResource: 'Medalhas de Coragem',
    pages: [],
  },
  '1a6ec06e': {
    name: 'Mestre da Guerra',
    unlockCondition: 'Nenhum',
    primaryResource: 'Medalhas de Coragem',
    pages: ['Destruição', 'Combate de Cerco', 'Marcar e Capturar'],
  },
  city_defence: {
    name: 'Mestre da Defesa da Cidade',
    unlockCondition: 'Nenhum',
    primaryResource: 'Medalhas de Coragem',
    pages: ['Fortificação', 'Reforço', 'Torre e Cerco'],
  },
  defence_legion: {
    name: 'Pesquisa da Legião de Defesa',
    unlockCondition: "Conclua 'Permanecer Unidos' em Defesa da Cidade",
    primaryResource: 'Medalhas de Coragem',
    pages: [],
  },
  e8704053: {
    name: 'Treinamento Avançado de Soldados',
    unlockCondition: 'Início da RoC S1',
    primaryResource: 'Medalhas de Coragem',
    pages: ['Tropas Aprimoradas', 'Treinamento', 'Avançado'],
  },
  b3581c97: {
    name: 'Guardas Imperiais',
    unlockCondition: 'Início da RoC S2',
    primaryResource: 'Medalhas de Coragem',
    pages: [],
  },
  '2b149bcb': {
    name: 'Rally da Guarda',
    unlockCondition: 'Início da RoC S2 + Castelo 30 + Instituto 30',
    primaryResource: 'Medalhas de Coragem',
    pages: ['Fundamentos da Guarda', 'Tático', 'Capacidade do Rally'],
  },
  '3f5ebb34': {
    name: 'Arte da Guerra — Incursão',
    unlockCondition: 'Início do Eden S3',
    primaryResource: 'Medalhas duplas',
    pages: ['Forças Armadas', 'Cerco', 'Insígnias de Guerra'],
  },
  '3ff71437': {
    name: 'Arte da Guerra — Defesa',
    unlockCondition: 'Início do Eden S3',
    primaryResource: 'Medalhas duplas',
    pages: ['Segurar a Linha', 'Ordens de Cerco', 'Insígnias de Guerra'],
  },
  art_of_war_command: {
    name: 'Arte da Guerra — Comando',
    unlockCondition: 'Início do Eden SX1',
    primaryResource: 'Medalhas duplas',
    pages: ['Engano e Fé', 'Golpe Destemido', 'Comando'],
  },
  '77db4a78': {
    name: 'Guerreiro Supremo',
    unlockCondition: 'Início do Eden S4',
    primaryResource: 'Insígnias de Guerra',
    pages: [],
  },
  '24ffc526': {
    name: 'Legião Invasora',
    unlockCondition: 'Início do Eden S4',
    primaryResource: 'Medalhas duplas',
    pages: ['Linha de Frente', 'Linha do Meio', 'Linha de Trás'],
  },
  '2c49bd2a': {
    name: 'Táticas Sólidas',
    unlockCondition: 'Início do Eden SX1',
    primaryResource: 'Insígnias de Guerra',
    pages: [
      'Ataque de Cerco',
      'Defesa de Cerco',
      'Batalha de Campo',
      'Poder das Unidades',
      'Treinamento Rápido',
      'Avançado',
    ],
  },
  fc190e81: {
    name: 'Bênção do Sangue de Dragão',
    unlockCondition: 'Início do Eden SX2 + Legião Invasora no nível máximo',
    primaryResource: 'Insígnias de Guerra',
    pages: ['Fundação', 'Postura', 'Poder do Dragão'],
  },
  '19ae0569': {
    name: 'Legião Suprema',
    unlockCondition: 'Início do Eden X8',
    primaryResource: 'Insígnias de Guerra',
    pages: ['Legião Suprema'],
  },
  '9c5d4006': {
    name: 'Legião Corpo a Corpo - Defesa',
    unlockCondition: 'Início do Eden X12',
    primaryResource: 'Insígnias de Guerra',
    pages: ['Legião Corpo a Corpo - Defesa'],
  },
  'b57d6bf9': {
    name: 'Legião Corpo a Corpo - Carga',
    unlockCondition: 'Início do Eden X12',
    primaryResource: 'Insígnias de Guerra',
    pages: ['Legião Corpo a Corpo - Carga'],
  },
});

const nodes = Object.freeze({
  'd1956263:node_1': {
    name: 'Crescimento Rápido',
    buff: 'Desbloqueia a Produção Rápida da Fazenda',
  },
  'd1956263:node_2': {
    name: 'Destilação Clandestina',
    buff: 'Desbloqueia a Produção Rápida da Destilaria',
  },
  'd1956263:node_3': {
    name: 'Desmatamento',
    buff: 'Desbloqueia a Produção Rápida da Serraria',
  },
  'd1956263:node_4': {
    name: 'Queima Rápida',
    buff: 'Desbloqueia a Produção Rápida da Oficina de Carvão',
  },
  'd1956263:node_5': {
    name: 'Quebra de Solo',
    buff: 'Desbloqueia a Produção Rápida da Pedreira',
  },
  'd1956263:node_6': {
    name: 'Fundição Rápida',
    buff: 'Desbloqueia a Produção Rápida da Mina de Ferro',
  },
  'd1956263:node_7': {
    name: 'Mobilização de Trabalhadores',
    buff: 'Recupera a taxa de sucesso da Produção Rápida ao melhorar uma construção',
  },
  'd1956263:node_8': {
    name: 'Crescimento Frenético',
    buff: '+5% Renda da Produção Rápida da Fazenda por nível',
  },
  'd1956263:node_9': {
    name: 'Levedura Ativa',
    buff: '+5% Renda da Produção Rápida da Destilaria por nível',
  },
  'd1956263:node_10': {
    name: 'Corte Integral de Árvores',
    buff: '+5% Renda da Produção Rápida da Serraria por nível',
  },
  'd1956263:node_11': {
    name: 'Armazenamento Seco',
    buff: '+5% Renda da Produção Rápida da Oficina de Carvão por nível',
  },
  'd1956263:node_12': {
    name: 'Aproveitamento Integral da Pedra',
    buff: '+5% Renda da Produção Rápida da Pedreira por nível',
  },
  'd1956263:node_13': {
    name: 'Metalurgia',
    buff: '+5% Renda da Produção Rápida da Mina de Ferro por nível',
  },
  'd1956263:node_14': {
    name: 'Força de Vontade',
    buff: 'A primeira Produção Rápida diária sempre tem sucesso',
  },
  'd1956263:node_15': {
    name: 'Melhoria de Estabilidade',
    buff: '+2% de taxa de sucesso da Produção Rápida por nível',
  },
  'b2691f74:node_1': {
    name: 'Fertilizante',
    buff: '+3% Renda de comida por nível',
  },
  'b2691f74:node_2': {
    name: 'Açúcar de Alta Qualidade',
    buff: '+3% Renda de cerveja por nível',
  },
  'b2691f74:node_3': {
    name: 'Corte Raso I',
    buff: '+3% Renda de madeira por nível',
  },
  'b2691f74:node_4': {
    name: 'Processamento de Carvão',
    buff: '+3% Renda de carvão por nível',
  },
  'b2691f74:node_5': {
    name: 'Alvenaria',
    buff: '+3% Renda de mármore por nível',
  },
  'b2691f74:node_6': {
    name: 'Fornalha Aquecida I',
    buff: '+3% Renda de ferro por nível',
  },
  'b2691f74:node_7': {
    name: 'Toque de Midas',
    buff: '+3% Renda de ouro por nível',
  },
  'b2691f74:node_8': {
    name: 'Distribuição Rápida I',
    buff: '+3% de Velocidade de coleta de comida por nível',
  },
  'b2691f74:node_9': {
    name: 'Machado Afiado I',
    buff: '+3% de Velocidade de coleta de madeira por nível',
  },
  'b2691f74:node_10': {
    name: 'Mineração Eficiente',
    buff: '+3% de Velocidade de coleta de mármore por nível',
  },
  'b2691f74:node_11': {
    name: 'Refino de Liga I',
    buff: '+3% de Velocidade de coleta de ferro por nível',
  },
  'b2691f74:node_12': {
    name: 'Refino de Gemas I',
    buff: '+3% de Velocidade de coleta de gemas por nível',
  },
  'b2691f74:node_13': {
    name: 'Expansão de Armazenamento I',
    buff: 'Armazenamento máximo de recursos +90k por nível',
  },
  'b2691f74:node_14': {
    name: 'Engenharia Civil I',
    buff: '+1% de Velocidade de construção por nível',
  },
  '375d1626:node_1': {
    name: 'Reconhecimento da Coragem',
    buff: 'Chance de receber Medalhas de Coragem dos Saqueadores',
  },
  '375d1626:node_2': {
    name: 'Promoção da Infantaria I',
    buff: 'Permite promover Infantaria T1-3',
  },
  '375d1626:node_3': {
    name: 'Promoção dos Arqueiros I',
    buff: 'Permite promover Arqueiros T1-3',
  },
  '375d1626:node_4': {
    name: 'Promoção da Cavalaria I',
    buff: 'Permite promover Cavalaria T1-3',
  },
  '375d1626:node_5': {
    name: 'Pelo Povo',
    buff: 'Recursos ao derrotar Saqueadores',
  },
  '375d1626:node_6': {
    name: 'Caçador de Rebeldes Iniciante',
    buff: 'Poder contra Nv. 1-5 Saqueadores',
  },
  '375d1626:node_7': {
    name: 'Defensor do Império Iniciante',
    buff: 'Resistência contra Nv. 1-5 Saqueadores',
  },
  '375d1626:node_8': {
    name: 'Promoção da Infantaria II',
    buff: 'Permite promover Infantaria T4-6',
  },
  '375d1626:node_9': {
    name: 'Promoção dos Arqueiros II',
    buff: 'Permite promover Arqueiros T4-6',
  },
  '375d1626:node_10': {
    name: 'Promoção da Cavalaria II',
    buff: 'Permite promover Cavalaria T4-6',
  },
  '375d1626:node_11': {
    name: 'Treinamento de Herói',
    buff: 'EXP de Herói obtida ao derrotar Saqueadores',
  },
  '375d1626:node_12': {
    name: 'Caçador de Rebeldes Intermediário',
    buff: 'Poder contra Nv. 6-10 Saqueadores',
  },
  '375d1626:node_13': {
    name: 'Defensor do Império Intermediário',
    buff: 'Resistência contra Nv. 6-10 Saqueadores',
  },
  '375d1626:node_14': {
    name: 'Primeiros Socorros no Campo de Batalha',
    buff: 'Reduz a proporção de feridos contra Saqueadores',
  },
  '375d1626:node_15': {
    name: 'Caçador de Rebeldes Avançado',
    buff: 'Poder contra Nv. 11-15 Saqueadores',
  },
  '375d1626:node_16': {
    name: 'Defensor do Império Avançado',
    buff: 'Resistência contra Nv. 11-15 Saqueadores',
  },
  '4a932eb0:node_1': {
    name: 'Expansão da Fornalha',
    buff: 'Desbloqueia o primeiro slot de fabricação de materiais',
  },
  '4a932eb0:node_2': {
    name: 'Refino Básico',
    buff: 'Aumenta a velocidade de produção',
  },
  '4a932eb0:node_3': {
    name: 'Processamento Básico',
    buff: 'Aumenta a velocidade de fabricação de materiais',
  },
  '4a932eb0:node_4': {
    name: 'Expansão da Fornalha',
    buff: 'Desbloqueia o segundo slot de fabricação de materiais',
  },
  '4a932eb0:node_5': {
    name: 'Refino Básico',
    buff: 'Aumenta a velocidade de produção',
  },
  '4a932eb0:node_6': {
    name: 'Processamento Básico',
    buff: 'Aumenta a velocidade de fabricação de materiais',
  },
  '4a932eb0:node_7': {
    name: 'Expansão da Fornalha',
    buff: 'Desbloqueia o terceiro slot de fabricação de materiais',
  },
  '4a932eb0:node_8': {
    name: 'Processamento de Armas',
    buff: 'Aumenta a velocidade de fabricação de armas',
  },
  '4a932eb0:node_9': {
    name: 'Fabricação de Elmos',
    buff: 'Aumenta a velocidade de fabricação de elmos',
  },
  '4a932eb0:node_10': {
    name: 'Armeiro',
    buff: 'Aumenta a velocidade de fabricação de armaduras',
  },
  '4a932eb0:node_11': {
    name: 'Sapateiro',
    buff: 'Aumenta a velocidade de fabricação de botas',
  },
  '4a932eb0:node_12': {
    name: 'Joalheiro',
    buff: 'Aumenta a velocidade de fabricação de amuletos',
  },
  '4a932eb0:node_13': {
    name: 'Processamento de Acessórios',
    buff: 'Aumenta a velocidade de fabricação de acessórios',
  },
  '4a932eb0:node_14': {
    name: 'Expansão da Oficina',
    buff: 'Desbloqueia uma Oficina de Dragonite extra',
  },
  '4a932eb0:node_15': {
    name: 'Refino Básico',
    buff: 'Aumenta a velocidade de produção',
  },
  '4a932eb0:node_16': {
    name: 'Processamento Básico',
    buff: 'Aumenta a velocidade de fabricação de materiais',
  },
  '4a932eb0:node_17': {
    name: 'Expansão da Fornalha',
    buff: 'Desbloqueia o quarto slot de fabricação de materiais',
  },
  '4a932eb0:node_18': {
    name: 'Fornalha de Armas',
    buff: 'Reduz o custo de Dragonite ao forjar armas',
  },
  '4a932eb0:node_19': {
    name: 'Fornalha de Elmos',
    buff: 'Reduz o custo de Dragonite ao forjar elmos',
  },
  '4a932eb0:node_20': {
    name: 'Fornalha de Armaduras',
    buff: 'Reduz o custo de Dragonite ao forjar armaduras',
  },
  '4a932eb0:node_21': {
    name: 'Fornalha de Botas',
    buff: 'Reduz o custo de Dragonite ao forjar calçados',
  },
  '4a932eb0:node_22': {
    name: 'Fornalha de Amuletos',
    buff: 'Reduz o custo de Dragonite ao forjar amuletos',
  },
  '4a932eb0:node_23': {
    name: 'Fornalha de Acessórios',
    buff: 'Reduz o custo de Dragonite ao forjar acessórios',
  },
  '4a932eb0:node_24': {
    name: 'Expansão da Fornalha',
    buff: 'Desbloqueia o quinto slot de fabricação de materiais',
  },
  '4a932eb0:node_25': {
    name: 'Novos Materiais',
    buff: 'Desbloqueia a fabricação de materiais verdes',
  },
  '4a932eb0:node_26': {
    name: 'Reciclagem de Materiais',
    buff: 'Materiais podem ser desencantados em Dragonites',
  },
  '4a932eb0:node_27': {
    name: 'Reciclagem em Massa',
    buff: 'Aumenta a quantidade de Dragonite obtida ao desencantar',
  },
  '4a932eb0:node_28': {
    name: 'Reciclagem Especializada',
    buff: 'Aumenta o retorno ao desmontar equipamento',
  },
  '802e7893:node_1': {
    name: 'Designação de Herói',
    buff: 'Desbloqueia a linha de frente da Legião I',
  },
  '802e7893:node_2': {
    name: 'Coleta Acelerada',
    buff: '+25% de Velocidade de coleta da Legião I',
    effects: ['Velocidade de coleta da Legião I'],
  },
  '802e7893:node_3': {
    name: 'Físico Aprimorado',
    buff: '+25% Carga de marcha da Legião I',
    effects: ['Carga de marcha da Legião I'],
  },
  '802e7893:node_4': {
    name: 'Imunidade da Infantaria',
    buff: '+35% de Resistência da Infantaria da Legião I',
    effects: ['Resistência da Infantaria da Legião I'],
  },
  '802e7893:node_5': {
    name: 'Imunidade dos Arqueiros',
    buff: '+35% de Resistência dos Arqueiros da Legião I',
    effects: ['Resistência dos Arqueiros da Legião I'],
  },
  '802e7893:node_6': {
    name: 'Imunidade da Cavalaria',
    buff: '+35% de Resistência da Cavalaria da Legião I',
    effects: ['Resistência da Cavalaria da Legião I'],
  },
  '802e7893:node_7': {
    name: 'Estandarte de Comando',
    buff: 'Desbloqueia a aceleração da Legião I',
  },
  '802e7893:node_8': {
    name: 'Cooperação de Heróis',
    buff: 'Desbloqueia a linha do meio da Legião I',
  },
  '802e7893:node_9': {
    name: 'Ordem de Retorno',
    buff: 'Desbloqueia o retorno da Legião I',
  },
  '802e7893:node_10': {
    name: 'Ferradura de Liga',
    buff: '+25% de Velocidade de marcha da Legião I',
    effects: ['Velocidade de marcha da Legião I'],
  },
  '802e7893:node_11': {
    name: 'Unidade de Suprimentos',
    buff: '+35% de Velocidade de recuperação de durabilidade da Legião I',
    effects: ['Velocidade de recuperação de durabilidade da Legião I'],
  },
  '802e7893:node_12': {
    name: 'Ataque da Infantaria',
    buff: '+35% de Poder da Infantaria da Legião I',
    effects: ['Poder da Infantaria da Legião I'],
  },
  '802e7893:node_13': {
    name: 'Ataque dos Arqueiros',
    buff: '+35% de Poder dos Arqueiros da Legião I',
    effects: ['Poder dos Arqueiros da Legião I'],
  },
  '802e7893:node_14': {
    name: 'Ataque da Cavalaria',
    buff: '+35% de Poder da Cavalaria da Legião I',
    effects: ['Poder da Cavalaria da Legião I'],
  },
  '802e7893:node_15': {
    name: 'Comando de Heróis',
    buff: 'Desbloqueia a linha de trás da Legião I',
  },
  '38d12254:node_1': {
    name: 'Designação de Herói',
    buff: 'Desbloqueia a linha de frente da Legião II',
  },
  '38d12254:node_2': {
    name: 'Coleta Acelerada',
    buff: '+25% de Velocidade de coleta da Legião II',
    effects: ['Velocidade de coleta da Legião II'],
  },
  '38d12254:node_3': {
    name: 'Físico Aprimorado',
    buff: '+25% Carga de marcha da Legião II',
    effects: ['Carga de marcha da Legião II'],
  },
  '38d12254:node_4': {
    name: 'Imunidade da Infantaria',
    buff: '+35% de Resistência da Infantaria da Legião II',
    effects: ['Resistência da Infantaria da Legião II'],
  },
  '38d12254:node_5': {
    name: 'Imunidade dos Arqueiros',
    buff: '+35% de Resistência dos Arqueiros da Legião II',
    effects: ['Resistência dos Arqueiros da Legião II'],
  },
  '38d12254:node_6': {
    name: 'Imunidade da Cavalaria',
    buff: '+35% de Resistência da Cavalaria da Legião II',
    effects: ['Resistência da Cavalaria da Legião II'],
  },
  '38d12254:node_7': {
    name: 'Estandarte de Comando',
    buff: 'Desbloqueia a aceleração da Legião II',
  },
  '38d12254:node_8': {
    name: 'Cooperação de Heróis',
    buff: 'Desbloqueia a linha do meio da Legião II',
  },
  '38d12254:node_9': {
    name: 'Ordem de Retorno',
    buff: 'Desbloqueia o retorno da Legião II',
  },
  '38d12254:node_10': {
    name: 'Ferradura de Liga',
    buff: '+25% de Velocidade de marcha da Legião II',
    effects: ['Velocidade de marcha da Legião II'],
  },
  '38d12254:node_11': {
    name: 'Unidade de Suprimentos',
    buff: '+35% de Velocidade de recuperação de durabilidade da Legião II',
    effects: ['Velocidade de recuperação de durabilidade da Legião II'],
  },
  '38d12254:node_12': {
    name: 'Ataque da Infantaria',
    buff: '+35% de Poder da Infantaria da Legião II',
    effects: ['Poder da Infantaria da Legião II'],
  },
  '38d12254:node_13': {
    name: 'Ataque dos Arqueiros',
    buff: '+35% de Poder dos Arqueiros da Legião II',
    effects: ['Poder dos Arqueiros da Legião II'],
  },
  '38d12254:node_14': {
    name: 'Ataque da Cavalaria',
    buff: '+35% de Poder da Cavalaria da Legião II',
    effects: ['Poder da Cavalaria da Legião II'],
  },
  '38d12254:node_15': {
    name: 'Comando de Heróis',
    buff: 'Desbloqueia a linha de trás da Legião II',
  },
  '5fef2163:node_1': {
    name: 'Designação de Herói',
    buff: 'Desbloqueia a linha de frente da Legião III',
  },
  '5fef2163:node_2': {
    name: 'Coleta Acelerada',
    buff: '+25% de Velocidade de coleta da Legião III',
    effects: ['Velocidade de coleta da Legião III'],
  },
  '5fef2163:node_3': {
    name: 'Físico Aprimorado',
    buff: '+25% Carga de marcha da Legião III',
    effects: ['Carga de marcha da Legião III'],
  },
  '5fef2163:node_4': {
    name: 'Imunidade da Infantaria',
    buff: '+35% de Resistência da Infantaria da Legião III',
    effects: ['Resistência da Infantaria da Legião III'],
  },
  '5fef2163:node_5': {
    name: 'Imunidade dos Arqueiros',
    buff: '+35% de Resistência dos Arqueiros da Legião III',
    effects: ['Resistência dos Arqueiros da Legião III'],
  },
  '5fef2163:node_6': {
    name: 'Imunidade da Cavalaria',
    buff: '+35% de Resistência da Cavalaria da Legião III',
    effects: ['Resistência da Cavalaria da Legião III'],
  },
  '5fef2163:node_7': {
    name: 'Estandarte de Comando',
    buff: 'Desbloqueia a aceleração da Legião III',
  },
  '5fef2163:node_8': {
    name: 'Cooperação de Heróis',
    buff: 'Desbloqueia a linha do meio da Legião III',
  },
  '5fef2163:node_9': {
    name: 'Ordem de Retorno',
    buff: 'Desbloqueia o retorno da Legião III',
  },
  '5fef2163:node_10': {
    name: 'Ferradura de Liga',
    buff: '+25% de Velocidade de marcha da Legião III',
    effects: ['Velocidade de marcha da Legião III'],
  },
  '5fef2163:node_11': {
    name: 'Unidade de Suprimentos',
    buff: '+35% de Velocidade de recuperação de durabilidade da Legião III',
    effects: ['Velocidade de recuperação de durabilidade da Legião III'],
  },
  '5fef2163:node_12': {
    name: 'Ataque da Infantaria',
    buff: '+35% de Poder da Infantaria da Legião III',
    effects: ['Poder da Infantaria da Legião III'],
  },
  '5fef2163:node_13': {
    name: 'Ataque dos Arqueiros',
    buff: '+35% de Poder dos Arqueiros da Legião III',
    effects: ['Poder dos Arqueiros da Legião III'],
  },
  '5fef2163:node_14': {
    name: 'Ataque da Cavalaria',
    buff: '+35% de Poder da Cavalaria da Legião III',
    effects: ['Poder da Cavalaria da Legião III'],
  },
  '5fef2163:node_15': {
    name: 'Comando de Heróis',
    buff: 'Desbloqueia a linha de trás da Legião III',
  },
  'cc2c9ee1:node_1': {
    name: 'Designação de Herói',
    buff: 'Posiciona 1 Herói',
  },
  'cc2c9ee1:node_2': {
    name: 'Coleta Acelerada',
    buff: 'Velocidade de coleta',
  },
  'cc2c9ee1:node_3': {
    name: 'Físico Aprimorado',
    buff: 'Carga de marcha',
  },
  'cc2c9ee1:node_4': {
    name: 'Imunidade da Infantaria',
    buff: 'Resistência',
  },
  'cc2c9ee1:node_5': {
    name: 'Imunidade da Cavalaria',
    buff: 'Resistência',
  },
  'cc2c9ee1:node_6': {
    name: 'Imunidade dos Arqueiros',
    buff: 'Resistência',
  },
  'cc2c9ee1:node_7': {
    name: 'Estandarte de Comando',
    buff: 'Aceleração',
  },
  'cc2c9ee1:node_8': {
    name: 'Cooperação de Heróis',
    buff: 'Posiciona 2 Heróis',
  },
  'cc2c9ee1:node_9': {
    name: 'Ordem de Retorno',
    buff: 'Retorno',
  },
  'cc2c9ee1:node_10': {
    name: 'Ferradura de Liga',
    buff: 'Velocidade de marcha',
  },
  'cc2c9ee1:node_11': {
    name: 'Unidade de Suprimentos',
    buff: 'Taxa de recuperação de Energia',
  },
  'cc2c9ee1:node_12': {
    name: 'Ataque da Infantaria',
    buff: 'Poder',
  },
  'cc2c9ee1:node_13': {
    name: 'Ataque dos Arqueiros',
    buff: 'Poder',
  },
  'cc2c9ee1:node_14': {
    name: 'Ataque da Cavalaria',
    buff: 'Poder',
  },
  'cc2c9ee1:node_15': {
    name: 'Comando de Heróis',
    buff: 'Posiciona 3 Heróis',
  },
  '3929cbb9:node_1': {
    name: 'Tratamento da Infantaria',
    buff: 'Custo de cura da Infantaria',
  },
  '3929cbb9:node_2': {
    name: 'Tratamento dos Arqueiros',
    buff: 'Custo de cura dos Arqueiros',
  },
  '3929cbb9:node_3': {
    name: 'Tratamento da Cavalaria',
    buff: 'Custo de cura da Cavalaria',
  },
  '3929cbb9:node_4': {
    name: 'Leito Temporário',
    buff: 'Capacidade de feridos do Castelo',
  },
  '3929cbb9:node_5': {
    name: 'Primeiros Socorros da Infantaria',
    buff: 'Velocidade de cura da Infantaria',
  },
  '3929cbb9:node_6': {
    name: 'Primeiros Socorros dos Arqueiros',
    buff: 'Velocidade de cura dos Arqueiros',
  },
  '3929cbb9:node_7': {
    name: 'Veterinário',
    buff: 'Velocidade de cura da Cavalaria',
  },
  '3929cbb9:node_8': {
    name: 'Hospital da Igreja',
    buff: 'Tenda médica extra',
  },
  '3929cbb9:node_9': {
    name: 'Instalações Médicas I',
    buff: 'Capacidade de feridos do Castelo',
  },
  '3929cbb9:node_10': {
    name: 'Santuário',
    buff: 'Capacidade excedente de feridos',
  },
  '3929cbb9:node_11': {
    name: 'Supercura',
    buff: 'Reduz a proporção de mortes em cerco solo',
  },
  'f915a84b:node_1': {
    name: 'Recrutamento da Infantaria',
    buff: 'Velocidade de treinamento da Infantaria',
  },
  'f915a84b:node_2': {
    name: 'Recrutamento de Arqueiros',
    buff: 'Velocidade de treinamento dos Arqueiros',
  },
  'f915a84b:node_3': {
    name: 'Recrutamento da Cavalaria',
    buff: 'Velocidade de treinamento da Cavalaria',
  },
  'f915a84b:node_4': {
    name: 'Recrutamento Obrigatório',
    buff: 'Acampamento extra',
  },
  'f915a84b:node_5': {
    name: 'Recrutamento da Infantaria',
    buff: 'Velocidade de treinamento da Infantaria',
  },
  'f915a84b:node_6': {
    name: 'Recrutamento de Arqueiros',
    buff: 'Velocidade de treinamento dos Arqueiros',
  },
  'f915a84b:node_7': {
    name: 'Recrutamento da Cavalaria',
    buff: 'Velocidade de treinamento da Cavalaria',
  },
  'f915a84b:node_8': {
    name: 'Armadura Totalmente Metálica',
    buff: 'HP',
  },
  'f915a84b:node_9': {
    name: 'Quartel',
    buff: 'Quantidade de treinamento da Infantaria',
  },
  'f915a84b:node_10': {
    name: 'Campo de Arqueiros',
    buff: 'Quantidade de treinamento dos Arqueiros',
  },
  'f915a84b:node_11': {
    name: 'Campo de Treinamento da Cavalaria',
    buff: 'Quantidade de treinamento da Cavalaria',
  },
  'f915a84b:node_12': {
    name: 'Armas Letais',
    buff: 'Taxa de mortes inimigas em vitórias de cerco solo',
  },
  'footmen_training:node_1': {
    name: 'Golpe Poderoso',
    buff: '10% de Poder',
  },
  'footmen_training:node_2': {
    name: 'Armadura Magistral',
    buff: '10% de Resistência',
  },
  'footmen_training:node_3': {
    name: 'Escudo Magistral',
    buff: '10% de contra-ataque da Infantaria contra Cavalaria',
  },
  'footmen_training:node_4': {
    name: 'Escudos Fortificados',
    buff: '100% de capacidade de carga da Infantaria',
  },
  'footmen_training:node_5': {
    name: 'Mantenha a Posição',
    buff: '100% de velocidade de marcha da Infantaria',
  },
  'footmen_training:node_6': {
    name: 'Escudo Mestre',
    buff: '10% de contra-ataque da Infantaria contra Arqueiros',
  },
  'footmen_training:node_7': {
    name: 'Golpe Poderoso',
    buff: '20% de Poder',
  },
  'footmen_training:node_8': {
    name: 'Armadura Magistral',
    buff: '20% de Resistência',
  },
  'footmen_training:node_9': {
    name: 'Aprimoramento da Infantaria',
    buff: 'Aprimora a Infantaria',
  },
  'footmen_training:node_10': {
    name: 'Recrutamento da Infantaria',
    buff: '-15% de Custo de treinamento',
  },
  'footmen_training:node_11': {
    name: 'Recrutamento Obrigatório da Infantaria',
    buff: '+16500 tropas extras por promoção',
  },
  'footmen_training:node_12': {
    name: 'Escudo Real',
    buff: '10% de contra-ataque da Infantaria contra Arqueiros',
  },
  'footmen_training:node_13': {
    name: 'Promoção da Infantaria III',
    buff: 'Promove T7 para T9',
  },
  'footmen_training:node_14': {
    name: 'Espadão',
    buff: '30% de Poder na defesa de cerco',
  },
  'footmen_training:node_15': {
    name: 'Cota de Malha',
    buff: '30% de Resistência',
  },
  'footmen_training:node_16': {
    name: 'Defensor do Império — Infantaria',
    buff: 'Desbloqueia T9',
  },
  'archers_training:node_1': {
    name: 'Flecha Aprimorada',
    buff: '10% de Poder',
  },
  'archers_training:node_2': {
    name: 'Braçadeira Aprimorada',
    buff: '10% de Resistência',
  },
  'archers_training:node_3': {
    name: 'Fraqueza do Alvo',
    buff: '10% de contra-ataque dos Arqueiros contra Cavalaria',
  },
  'archers_training:node_4': {
    name: 'Fogo Concentrado',
    buff: '100% de capacidade de carga dos Arqueiros',
  },
  'archers_training:node_5': {
    name: 'Armadura de Couro de Dragão',
    buff: '100% de velocidade de marcha dos Arqueiros',
  },
  'archers_training:node_6': {
    name: 'Mira Letal',
    buff: '10% de contra-ataque dos Arqueiros contra Infantaria',
  },
  'archers_training:node_7': {
    name: 'Flecha Aprimorada',
    buff: '20% de Poder',
  },
  'archers_training:node_8': {
    name: 'Braçadeira de Ébano',
    buff: '20% de Resistência',
  },
  'archers_training:node_9': {
    name: 'Aprimoramento dos Arqueiros',
    buff: 'Aprimora os Arqueiros',
  },
  'archers_training:node_10': {
    name: 'Recrutamento de Arqueiros',
    buff: '-15% de Custo de treinamento',
  },
  'archers_training:node_11': {
    name: 'Recrutamento Obrigatório dos Arqueiros',
    buff: '+16500 tropas extras por promoção',
  },
  'archers_training:node_12': {
    name: 'Caçada',
    buff: '10% de contra-ataque dos Arqueiros contra Infantaria',
  },
  'archers_training:node_13': {
    name: 'Promoção dos Arqueiros III',
    buff: 'Promove T7 para T9',
  },
  'archers_training:node_14': {
    name: 'Chuva de Flechas',
    buff: '30% de Poder de cerco',
  },
  'archers_training:node_15': {
    name: 'Ponta de Flecha Envenenada',
    buff: '30% de Poder',
  },
  'archers_training:node_16': {
    name: 'Desbloqueio dos Arqueiros T9',
    buff: 'Desbloqueia T9',
  },
  'cavalry_training:node_1': {
    name: 'Carga Fervorosa',
    buff: '10% de Poder',
  },
  'cavalry_training:node_2': {
    name: 'Barda Aprimorada',
    buff: '10% de Resistência',
  },
  'cavalry_training:node_3': {
    name: 'Alvo Móvel',
    buff: '10% de contra-ataque da Cavalaria contra Infantaria',
  },
  'cavalry_training:node_4': {
    name: 'Carro de Transporte',
    buff: '100% de capacidade de carga da Cavalaria',
  },
  'cavalry_training:node_5': {
    name: 'Corcéis Puro-Sangue',
    buff: '100% de velocidade de marcha da Cavalaria',
  },
  'cavalry_training:node_6': {
    name: 'Investida',
    buff: '10% de contra-ataque da Cavalaria contra Arqueiros',
  },
  'cavalry_training:node_7': {
    name: 'Carga Feroz',
    buff: '20% de Poder',
  },
  'cavalry_training:node_8': {
    name: 'Barda Aprimorada',
    buff: '20% de Resistência',
  },
  'cavalry_training:node_9': {
    name: 'Aprimoramento da Cavalaria',
    buff: 'Aprimora a Cavalaria',
  },
  'cavalry_training:node_10': {
    name: 'Recrutamento da Cavalaria',
    buff: '-15% de Custo de treinamento',
  },
  'cavalry_training:node_11': {
    name: 'Treinamento de Escudeiros',
    buff: '+16500 tropas extras por promoção',
  },
  'cavalry_training:node_12': {
    name: 'Caminho da Guerra',
    buff: '10% de contra-ataque da Cavalaria contra Arqueiros',
  },
  'cavalry_training:node_13': {
    name: 'Promoção da Cavalaria III',
    buff: 'Promove T7 para T9',
  },
  'cavalry_training:node_14': {
    name: 'Escaramuça em Campo Aberto',
    buff: '30% de Poder',
  },
  'cavalry_training:node_15': {
    name: 'Barda de Ébano',
    buff: '30% de Resistência',
  },
  'cavalry_training:node_16': {
    name: 'Defensor do Império — Cavalaria',
    buff: 'Desbloqueia T9',
  },
  'f0595b07:node_1': {
    name: 'Produção em Escala Total',
    buff: 'Velocidade de coleta',
  },
  'f0595b07:node_2': {
    name: 'Força Expedicionária',
    buff: 'Quantidade de recursos coletados',
  },
  'f0595b07:node_3': {
    name: 'Recompensas Avançadas',
    buff: 'Desbloqueia recompensas Nv. 4-6',
  },
  'f0595b07:node_4': {
    name: 'Especialista em Armas',
    buff: 'Todos os pontos recebidos',
  },
  'f0595b07:node_5': {
    name: 'Limpeza Rápida',
    buff: 'Velocidade de marcha contra Saqueadores',
  },
  'f0595b07:node_6': {
    name: 'Treinamento de Preparação para Guerra',
    buff: 'Velocidade de treinamento',
  },
  'f0595b07:node_7': {
    name: 'Aumento de Carga',
    buff: 'Carga de marcha',
  },
  'f0595b07:node_8': {
    name: 'Capacidade de Preparação para Guerra',
    buff: 'Capacidade de treinamento',
  },
  'f0595b07:node_9': {
    name: 'Super-Recompensas',
    buff: 'Desbloqueia recompensas Nv. 7-9',
  },
  'f0595b07:node_10': {
    name: 'Incentivo — coleta',
    buff: 'Pontos de coleta',
  },
  'f0595b07:node_11': {
    name: 'Incentivo — eliminar Saqueadores',
    buff: 'Pontos por atacar Saqueadores',
  },
  'f0595b07:node_12': {
    name: 'Incentivo — construção',
    buff: 'Pontos de construção',
  },
  'f0595b07:node_13': {
    name: 'Inspirar: sabedoria',
    buff: 'Pontos de Insígnias de Guerra',
  },
  'f0595b07:node_14': {
    name: 'Incentivo — Pesquisa Tecnológica',
    buff: 'Pontos de Pesquisa Tecnológica',
  },
  'f0595b07:node_15': {
    name: 'Inspirar: crescimento',
    buff: 'Pontuação por subir o nível do Herói',
  },
  'f0595b07:node_16': {
    name: 'Incentivo — eliminar inimigos',
    buff: 'Pontos de eliminar inimigos',
  },
  'f0595b07:node_17': {
    name: 'Inspirar: recrutamento',
    buff: 'Pontos de recrutamento',
  },
  'f0595b07:node_18': {
    name: 'Especialista em Armas',
    buff: 'Todos os pontos recebidos',
  },
  'f0595b07:node_19': {
    name: 'Mais uma Recompensa!',
    buff: 'Recompensas em dobro',
  },
  'zone_conflict:node_1': {
    name: 'Segurança Médica',
    buff: 'Segurança Médica',
  },
  'zone_conflict:node_2': {
    name: 'Última Resistência',
    buff: 'Última Resistência',
  },
  'zone_conflict:node_3': {
    name: 'Sede de Batalha',
    buff: 'Sede de Batalha',
  },
  'zone_conflict:node_4': {
    name: 'Construção de Muralhas',
    buff: 'Construção de Muralhas',
  },
  'zone_conflict:node_5': {
    name: 'Fortificações Temporárias',
    buff: 'Fortificações Temporárias',
  },
  'zone_conflict:node_6': {
    name: 'Defensores da Paz',
    buff: 'Defensores da Paz',
  },
  'zone_conflict:node_7': {
    name: 'Resistência de Campanha',
    buff: 'Resistência de Campanha',
  },
  'zone_conflict:node_8': {
    name: 'Segurança Médica',
    buff: 'Segurança II',
  },
  'zone_conflict:node_9': {
    name: 'Frente Unida',
    buff: 'Frente Unida: Cuidados Médicos',
  },
  'zone_conflict:node_10': {
    name: 'Ataque Conjunto',
    buff: 'Ataque Conjunto',
  },
  'zone_conflict:node_11': {
    name: 'Mobilização de Defesa',
    buff: 'Mobilização de Defesa',
  },
  'zone_conflict:node_12': {
    name: 'Ataque Aliado',
    buff: 'Ataque Aliado',
  },
  'zone_conflict:node_13': {
    name: 'Superlegião',
    buff: 'Desbloqueia super Legião',
  },
  'zone_conflict:node_14': {
    name: 'Ossos de Fibra de Carbono',
    buff: 'Ossos de Fibra de Carbono',
  },
  'zone_conflict:node_15': {
    name: 'Esporos Virais',
    buff: 'Esporos Virais',
  },
  '1a6ec06e:node_1': {
    name: 'Melhoria da Carga de Demolição',
    buff: '+20% de capacidade de carga',
  },
  '1a6ec06e:node_2': {
    name: 'Ataque da Infantaria',
    buff: '+10% de Poder de destruição da Infantaria',
  },
  '1a6ec06e:node_3': {
    name: 'Ataque dos Arqueiros',
    buff: '+10% de Poder de destruição dos Arqueiros',
  },
  '1a6ec06e:node_4': {
    name: 'Ataque da Cavalaria',
    buff: '+10% de Poder de destruição da Cavalaria',
  },
  '1a6ec06e:node_5': {
    name: 'Ataque Total',
    buff: '+20% de Velocidade de marcha',
  },
  '1a6ec06e:node_6': {
    name: 'Ataque Frontal',
    buff: '+20% de Poder de cerco da Infantaria',
  },
  '1a6ec06e:node_7': {
    name: 'Recrutamento de Arqueiros',
    buff: '+20% de Poder de cerco dos Arqueiros',
  },
  '1a6ec06e:node_8': {
    name: 'Recrutamento da Cavalaria',
    buff: '+20% de Poder de cerco da Cavalaria',
  },
  '1a6ec06e:node_9': {
    name: 'Escudo Pesado',
    buff: '+20% de Resistência de cerco da Infantaria',
  },
  '1a6ec06e:node_10': {
    name: 'Armadura de Ferro',
    buff: '+20% de Resistência de cerco dos Arqueiros',
  },
  '1a6ec06e:node_11': {
    name: 'Cavaleiro Pesado',
    buff: '+20% de Resistência de cerco da Cavalaria',
  },
  '1a6ec06e:node_12': {
    name: 'Armas Letais',
    buff: '+20% de taxa de mortes inimigas após uma vitória de cerco solo',
  },
  '1a6ec06e:node_13': {
    name: 'Agilidade',
    buff: '+50 de velocidade de combate da Infantaria',
  },
  '1a6ec06e:node_14': {
    name: 'Disparos Rápidos',
    buff: '+50 de velocidade de combate dos Arqueiros',
  },
  '1a6ec06e:node_15': {
    name: 'Avante!',
    buff: '+50 de velocidade de combate da Cavalaria',
  },
  '1a6ec06e:node_16': {
    name: 'Desbloquear Sinal de Fumaça',
    buff: 'Após um cerco fracassado: o lado defensor perde unidades e tem Poder e Resistência reduzidos',
  },
  '1a6ec06e:node_17': {
    name: 'Desarmar',
    buff: 'Penalidade de Poder após destruição aumentada em +10%',
  },
  '1a6ec06e:node_18': {
    name: 'Perfuração de Armadura',
    buff: 'Penalidade de Resistência após destruição aumentada em +10%',
  },
  '1a6ec06e:node_19': {
    name: 'Paralisia',
    buff: 'Duração da destruição aumentada em +600',
  },
  '1a6ec06e:node_20': {
    name: 'Golpe da Infantaria',
    buff: '+20% de Poder da Infantaria',
  },
  '1a6ec06e:node_21': {
    name: 'Golpe dos Arqueiros',
    buff: '+20% de Poder dos Arqueiros',
  },
  '1a6ec06e:node_22': {
    name: 'Golpe da Cavalaria',
    buff: '+20% de Poder da Cavalaria',
  },
  '1a6ec06e:node_23': {
    name: 'Resistência da Infantaria',
    buff: '+20% de Resistência da Infantaria',
  },
  '1a6ec06e:node_24': {
    name: 'Resistência dos Arqueiros',
    buff: '+20% de Resistência dos Arqueiros',
  },
  '1a6ec06e:node_25': {
    name: 'Resistência da Cavalaria',
    buff: '+20% de Resistência da Cavalaria',
  },
  '1a6ec06e:node_26': {
    name: 'Cicatriz de Batalha',
    buff: 'Marca o castelo inimigo',
  },
  '1a6ec06e:node_27': {
    name: 'Marca',
    buff: 'Bônus de Poder da marca +10%',
  },
  '1a6ec06e:node_28': {
    name: 'Defesa Marcada',
    buff: 'Bônus de Resistência da marca +10%',
  },
  '1a6ec06e:node_29': {
    name: 'Marca Duradoura',
    buff: 'Aumenta a duração da marca em +1200',
  },
  '1a6ec06e:node_30': {
    name: 'Marcas Múltiplas',
    buff: 'Aumenta o limite de marcas em +2',
  },
  '1a6ec06e:node_31': {
    name: 'Ataque da Infantaria',
    buff: '+10% de Poder de destruição da Infantaria',
  },
  '1a6ec06e:node_32': {
    name: 'Ataque dos Arqueiros',
    buff: '+10% de Poder de destruição dos Arqueiros',
  },
  '1a6ec06e:node_33': {
    name: 'Ataque da Cavalaria',
    buff: '+10% de Poder de destruição da Cavalaria',
  },
  '1a6ec06e:node_34': {
    name: 'Massacre',
    buff: 'Perdas de guerra inimigas +20%',
  },
  '1a6ec06e:node_35': {
    name: 'Ataque Frontal',
    buff: '+20% de Poder de cerco da Infantaria',
  },
  '1a6ec06e:node_36': {
    name: 'Recrutamento de Arqueiros',
    buff: '+20% de Poder de cerco dos Arqueiros',
  },
  '1a6ec06e:node_37': {
    name: 'Recrutamento da Cavalaria',
    buff: '+20% de Poder de cerco da Cavalaria',
  },
  '1a6ec06e:node_38': {
    name: 'Escudo Pesado',
    buff: '+20% de Resistência de cerco da Infantaria',
  },
  '1a6ec06e:node_39': {
    name: 'Armadura de Ferro',
    buff: '+20% de Resistência de cerco dos Arqueiros',
  },
  '1a6ec06e:node_40': {
    name: 'Cavaleiro Pesado',
    buff: '+20% de HP da Infantaria',
  },
  '1a6ec06e:node_41': {
    name: 'Escudo de Cerco',
    buff: '+20% de HP de todas as tropas',
  },
  '1a6ec06e:node_42': {
    name: 'Armadura de Cerco',
    buff: '+20% de HP dos Arqueiros',
  },
  '1a6ec06e:node_43': {
    name: 'Cavalaria de Cerco',
    buff: '+20% de HP da Cavalaria',
  },
  '1a6ec06e:node_44': {
    name: 'Captura',
    buff: 'Bônus de vitória em cerco',
  },
  'city_defence:node_1': {
    name: 'Fortificação da Muralha',
    buff: 'Aumenta a fortificação em 250',
  },
  'city_defence:node_2': {
    name: 'Equipe de Ataque',
    buff: 'Reduz em 20% a velocidade de queima de durabilidade perto do Trono',
  },
  'city_defence:node_3': {
    name: 'Reparo da Muralha',
    buff: 'Velocidade de recuperação de durabilidade aumentada em 20%',
  },
  'city_defence:node_4': {
    name: 'Reforço Rápido',
    buff: 'Velocidade de marcha ao reforçar aumentada em 20%',
  },
  'city_defence:node_5': {
    name: 'Poder de Reforço da Infantaria',
    buff: 'Poder da Infantaria ao reforçar aliados aumentado em 20%',
  },
  'city_defence:node_7': {
    name: 'Poder de Reforço da Cavalaria',
    buff: 'Poder da Cavalaria ao reforçar aliados aumentado em 20%',
  },
  'city_defence:node_6': {
    name: 'Poder de Reforço dos Arqueiros',
    buff: 'Poder dos Arqueiros ao reforçar aliados aumentado em 20%',
  },
  'city_defence:node_8': {
    name: 'Resistência de Reforço da Infantaria',
    buff: 'Resistência da Infantaria ao reforçar aliados aumentada em 20%',
  },
  'city_defence:node_10': {
    name: 'Resistência de Reforço da Cavalaria',
    buff: 'Resistência da Cavalaria ao reforçar aliados aumentada em 20%',
  },
  'city_defence:node_9': {
    name: 'Resistência de Reforço dos Arqueiros',
    buff: 'Resistência dos Arqueiros ao reforçar aliados aumentada em 20%',
  },
  'city_defence:node_11': {
    name: 'Reforço Rápido',
    buff: 'Velocidade de marcha ao reforçar aumentada em 20%',
  },
  'city_defence:node_12': {
    name: 'Poder de Reforço',
    buff: 'Poder aumentado em 20% ao receber reforços aliados',
  },
  'city_defence:node_13': {
    name: 'Resistência de Reforço',
    buff: 'Resistência aumentada em 20% ao receber reforços aliados',
  },
  'city_defence:node_14': {
    name: 'A Vida Continua',
    buff: 'Variação da taxa de eliminação sofrida contra inimigos: -10%',
  },
  'city_defence:node_15': {
    name: 'Rompimento da Infantaria',
    buff: 'Poder da Infantaria na defesa de cerco aumentado em 20%',
  },
  'city_defence:node_17': {
    name: 'Rompimento da Cavalaria',
    buff: 'Poder da Cavalaria na defesa de cerco aumentado em 20%',
  },
  'city_defence:node_16': {
    name: 'Rompimento dos Arqueiros',
    buff: 'Poder dos Arqueiros na defesa de cerco aumentado em 20%',
  },
  'city_defence:node_18': {
    name: 'Escudo Defensor',
    buff: 'Resistência da Infantaria na defesa de cerco aumentada em 20%',
  },
  'city_defence:node_20': {
    name: 'Cavalaria Defensora',
    buff: 'Resistência da Cavalaria na defesa de cerco aumentada em 20%',
  },
  'city_defence:node_19': {
    name: 'Armadura Defensora',
    buff: 'Resistência dos Arqueiros na defesa de cerco aumentada em 20%',
  },
  'city_defence:node_21': {
    name: 'Permanecer Unidos',
    buff: 'Concede uma Legião de Defesa',
  },
  'city_defence:node_22': {
    name: 'Contra-ataque',
    buff: 'Poder das unidades da fila de defesa: 15%',
  },
  'city_defence:node_23': {
    name: 'Fortaleza Robusta',
    buff: 'Resistência das unidades da fila de defesa: 15%',
  },
  'city_defence:node_24': {
    name: 'Aprimoramento da Legião',
    buff: 'HP da fila de defesa: 15%',
  },
  'city_defence:node_25': {
    name: 'Expansão de Recrutamento',
    buff: 'Capacidade máxima da fila de defesa aumentada em 15000',
  },
  'city_defence:node_26': {
    name: 'Leito Temporário',
    buff: 'Capacidade das tendas médicas: 15000',
  },
  'city_defence:node_27': {
    name: 'Fortificação da Muralha',
    buff: 'Aumenta a fortificação em 250',
  },
  'city_defence:node_28': {
    name: 'Torre Avançada',
    buff: 'Melhora a torre para TORRE AVANÇADA',
  },
  'city_defence:node_29': {
    name: 'Expansão da Torre',
    buff: 'Capacidade de Energia da Torre Avançada: 1000',
  },
  'city_defence:node_30': {
    name: 'Reforço da Torre',
    buff: 'Velocidade de recuperação de Energia: 40%',
  },
  'city_defence:node_31': {
    name: 'Torre Reforçada',
    buff: 'Ataque da Torre de Flechas: 20%',
  },
  'city_defence:node_32': {
    name: 'Porto Seguro',
    buff: 'Reduz em 20% as baixas após uma derrota',
  },
  'city_defence:node_33': {
    name: 'Rompimento da Infantaria',
    buff: 'Poder da Infantaria na defesa de cerco aumentado em 20%',
  },
  'city_defence:node_35': {
    name: 'Rompimento da Cavalaria',
    buff: 'Poder da Cavalaria na defesa de cerco aumentado em 20%',
  },
  'city_defence:node_34': {
    name: 'Rompimento dos Arqueiros',
    buff: 'Poder dos Arqueiros na defesa de cerco aumentado em 20%',
  },
  'city_defence:node_36': {
    name: 'Escudo Defensor',
    buff: 'Resistência da Infantaria na defesa de cerco aumentada em 20%',
  },
  'city_defence:node_37': {
    name: 'Cavalaria Defensora',
    buff: 'Resistência da Cavalaria na defesa de cerco aumentada em 20%',
  },
  'city_defence:node_38': {
    name: 'Armadura Defensora',
    buff: 'Resistência dos Arqueiros na defesa de cerco aumentada em 20%',
  },
  'city_defence:node_39': {
    name: 'Mantenha a Posição',
    buff: 'Dados ainda não confirmados',
  },
  'defence_legion:node_1': {
    name: 'Designação de Herói',
    buff: 'Posiciona 1 Herói em fila de defesa',
  },
  'defence_legion:node_2': {
    name: 'Expansão de Recrutamento',
    buff: 'Capacidade da marcha de defesa aumentada em 10500',
  },
  'defence_legion:node_3': {
    name: 'Lealdade da Infantaria',
    buff: '10% de Resistência da Infantaria na fila de defesa',
  },
  'defence_legion:node_5': {
    name: 'Lealdade da Cavalaria',
    buff: '10% de Resistência da Cavalaria na fila de defesa',
  },
  'defence_legion:node_4': {
    name: 'Lealdade dos Arqueiros',
    buff: '10% de Resistência dos Arqueiros na fila de defesa',
  },
  'defence_legion:node_6': {
    name: 'Ataque da Infantaria',
    buff: '10% de Poder da Infantaria na fila de defesa',
  },
  'defence_legion:node_8': {
    name: 'Ataque da Cavalaria',
    buff: '10% de Poder da Cavalaria na fila de defesa',
  },
  'defence_legion:node_7': {
    name: 'Ataque dos Arqueiros',
    buff: '10% de Poder dos Arqueiros na fila de defesa',
  },
  'defence_legion:node_9': {
    name: 'Expansão de Recrutamento',
    buff: 'Capacidade da marcha de defesa aumentada em 16500',
  },
  'defence_legion:node_10': {
    name: 'Cooperação de Heróis',
    buff: 'Posiciona 2 Heróis na fila de defesa',
  },
  'defence_legion:node_11': {
    name: 'Lealdade da Infantaria II',
    buff: '10% de Resistência da Infantaria na fila de defesa',
  },
  'defence_legion:node_13': {
    name: 'Lealdade da Cavalaria II',
    buff: '10% de Resistência da Cavalaria na fila de defesa',
  },
  'defence_legion:node_12': {
    name: 'Lealdade dos Arqueiros II',
    buff: '10% de Resistência dos Arqueiros na fila de defesa',
  },
  'defence_legion:node_14': {
    name: 'Ataque da Infantaria II',
    buff: '10% de Poder da Infantaria na fila de defesa',
  },
  'defence_legion:node_16': {
    name: 'Ataque da Cavalaria II',
    buff: '10% de Poder da Cavalaria na fila de defesa',
  },
  'defence_legion:node_15': {
    name: 'Ataque dos Arqueiros II',
    buff: '10% de Poder dos Arqueiros na fila de defesa',
  },
  'defence_legion:node_17': {
    name: 'Comando de Heróis',
    buff: 'Posiciona 3 Heróis na fila de defesa',
  },
  'defence_legion:node_18': {
    name: 'Expansão de recrutamento II',
    buff: 'Capacidade da marcha de defesa aumentada em 25000',
  },
  'defence_legion:node_19': {
    name: 'Escudos Fortificados',
    buff: 'Bônus de defesa das tropas: 15%',
  },
  'defence_legion:node_20': {
    name: 'Inspirar Potencial',
    buff: 'Bônus de ataque das tropas: 15%',
  },
  'defence_legion:node_21': {
    name: 'Expansão de recrutamento III',
    buff: 'Capacidade da marcha de defesa aumentada em 26000',
  },
  'e8704053:node_1': {
    name: 'Habilidades Ofensivas Aprimoradas — Infantaria',
    buff: 'Poder base da Infantaria Aprimorada +3',
  },
  'e8704053:node_2': {
    name: 'Habilidades Ofensivas Aprimoradas — Cavalaria',
    buff: 'Poder base da Cavalaria Aprimorada +3',
  },
  'e8704053:node_3': {
    name: 'Habilidades Ofensivas Aprimoradas — Arqueiros',
    buff: 'Poder base dos Arqueiros Aprimorados +3',
  },
  'e8704053:node_4': {
    name: 'Golpe Pesado',
    buff: '+10% de Poder da Infantaria',
  },
  'e8704053:node_5': {
    name: 'Carga Feroz',
    buff: '+10% de Poder da Cavalaria',
  },
  'e8704053:node_6': {
    name: 'Flecha Aprimorada',
    buff: '+10% para Arqueiros Noturnos',
  },
  'e8704053:node_7': {
    name: 'Golpe Brutal',
    buff: '+5% de Poder para todos os tipos de tropa',
  },
  'e8704053:node_8': {
    name: 'Treinamento Eficiente',
    buff: 'Redução do custo do Treinamento Intensivo: -10%',
  },
  'e8704053:node_9': {
    name: 'Treinamento em Massa',
    buff: 'Velocidade do Treinamento Intensivo aumentada em +40%',
  },
  'e8704053:node_10': {
    name: 'Golpe Tático',
    buff: '+10% de Poder tático de todas as tropas',
  },
  'e8704053:node_11': {
    name: 'Armadura Reforçada — Infantaria',
    buff: 'Resistência base da Infantaria Aprimorada +5',
  },
  'e8704053:node_12': {
    name: 'Armadura Reforçada — Cavalaria',
    buff: 'Resistência base da Cavalaria Aprimorada +5',
  },
  'e8704053:node_13': {
    name: 'Armadura Reforçada — Arqueiros',
    buff: 'Resistência base dos Arqueiros Aprimorados +2',
  },
  'e8704053:node_14': {
    name: 'Escudo Reforçado',
    buff: '+10% de Resistência da Infantaria',
  },
  'e8704053:node_15': {
    name: 'Barda Aprimorada',
    buff: '+10% de Resistência da Cavalaria',
  },
  'e8704053:node_16': {
    name: 'Braçadeira Aprimorada',
    buff: '+10% de Resistência dos Arqueiros',
  },
  'e8704053:node_17': {
    name: 'Armadura Magistral',
    buff: '+5% de Resistência para todos os tipos de tropa',
  },
  'e8704053:node_18': {
    name: 'Soldados Abençoados',
    buff: 'Redução do custo das Tropas Aprimoradas: -20%',
  },
  'e8704053:node_19': {
    name: 'Supercura',
    buff: 'Velocidade de cura das Tropas Aprimoradas aumentada em +40%',
  },
  'e8704053:node_20': {
    name: 'Proteção Tática',
    buff: '+10% de Resistência tática para todas as tropas',
  },
  'e8704053:node_21': {
    name: 'Recrutamento da Infantaria',
    buff: 'Velocidade de treinamento da Infantaria aumentada em +40%',
  },
  'e8704053:node_22': {
    name: 'Recrutamento da Cavalaria',
    buff: 'Velocidade de treinamento da Cavalaria aumentada em +40%',
  },
  'e8704053:node_23': {
    name: 'Recrutamento de Arqueiros',
    buff: 'Velocidade de treinamento dos Arqueiros aumentada em +40%',
  },
  'e8704053:node_24': {
    name: 'Lâmina Afiada',
    buff: '+10% de Poder da Infantaria Aprimorada',
  },
  'e8704053:node_25': {
    name: 'Espada da Cavalaria',
    buff: '+10% de Poder da Cavalaria Aprimorada',
  },
  'e8704053:node_26': {
    name: 'Flecha Aprimorada AE',
    buff: '+10% de Poder dos Arqueiros Aprimorados',
  },
  'e8704053:node_27': {
    name: 'Primeiros Socorros da Infantaria',
    buff: 'Velocidade de cura da Infantaria +10%',
  },
  'e8704053:node_28': {
    name: 'Veterinário',
    buff: 'Velocidade de cura da Cavalaria +10%',
  },
  'e8704053:node_29': {
    name: 'Primeiros Socorros dos Arqueiros',
    buff: 'Velocidade de cura dos Arqueiros +10%',
  },
  'e8704053:node_30': {
    name: 'Armadura Requintada',
    buff: '+10% de Resistência da Infantaria Aprimorada',
  },
  'e8704053:node_31': {
    name: 'Armadura Aprimorada',
    buff: '+10% de Resistência da Cavalaria Aprimorada',
  },
  'e8704053:node_32': {
    name: 'Equipamento Aprimorado',
    buff: '+10% de Resistência dos Arqueiros Aprimorados',
  },
  'e8704053:node_33': {
    name: 'Lei Marcial',
    buff: '+6% de HP de todas as tropas',
  },
  'e8704053:node_34': {
    name: 'Medicina Avançada',
    buff: 'Tropas Aprimoradas usam os mesmos recursos das tropas normais',
  },
  'b3581c97:node_1': {
    name: 'Aço de Damasco I',
    buff: '+10% de Poder da Infantaria',
  },
  'b3581c97:node_2': {
    name: 'Sangue Quente I',
    buff: '+10% de Poder da Cavalaria',
  },
  'b3581c97:node_3': {
    name: 'Flecha Reforçada I',
    buff: '+10% de Poder dos Arqueiros',
  },
  'b3581c97:node_4': {
    name: 'Armadura de Corpo Inteiro I',
    buff: '+10% de Resistência da Infantaria',
  },
  'b3581c97:node_5': {
    name: 'Estribo I',
    buff: '+10% de Resistência da Cavalaria',
  },
  'b3581c97:node_6': {
    name: 'Muralha de Escudos I',
    buff: '+10% de Resistência dos Arqueiros',
  },
  'b3581c97:node_8': {
    name: 'Formação Circular I',
    buff: '+5% de Resistência tática',
  },
  'b3581c97:node_11': {
    name: 'Túnel I',
    buff: '+5% de Poder tático',
  },
  'b3581c97:node_14': {
    name: 'Fanatismo I',
    buff: '+5% de HP',
  },
  'b3581c97:node_17': {
    name: 'Bastião I',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_20': {
    name: 'Aríete I',
    buff: '+5% de Poder de cerco',
  },
  'b3581c97:node_100': {
    name: 'Túnel II',
    buff: '+5% de Poder tático',
  },
  'b3581c97:node_26': {
    name: 'Bastião II',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_29': {
    name: 'Aríete II',
    buff: '+5% de Resistência de cerco',
  },
  'b3581c97:node_32': {
    name: 'Defensor Imperial',
    buff: 'Desbloqueia Infantaria T10',
  },
  'b3581c97:node_35': {
    name: 'Formação Circular II',
    buff: '+5% de Resistência tática',
  },
  'b3581c97:node_38': {
    name: 'Armadura de Corpo Inteiro II',
    buff: '+10% de Resistência',
  },
  'b3581c97:node_41': {
    name: 'Aço de Damasco II',
    buff: '+10% de Poder',
  },
  'b3581c97:node_44': {
    name: 'Bastião III',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_47': {
    name: 'Aríete III',
    buff: '+5% de Poder de cerco',
  },
  'b3581c97:node_50': {
    name: 'Bastião IV',
    buff: '+5% de Resistência na defesa de cerco',
  },
  'b3581c97:node_53': {
    name: 'Aríete IV',
    buff: '+5% de Resistência de cerco',
  },
  'b3581c97:node_56': {
    name: 'Fanatismo II',
    buff: '+5% de HP',
  },
  'b3581c97:node_59': {
    name: 'Treinamento da Guarda — Infantaria',
    buff: 'Restaura Poder',
  },
  'b3581c97:node_7': {
    name: 'Ataque Coordenado I',
    buff: '+5% de Resistência tática',
  },
  'b3581c97:node_10': {
    name: 'Formação em Cunha I',
    buff: '+5% de Poder tático',
  },
  'b3581c97:node_13': {
    name: 'Coragem I',
    buff: '+5% de HP',
  },
  'b3581c97:node_16': {
    name: 'Carroça Armada I',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_19': {
    name: 'Trincheira I',
    buff: '+5% de Poder de cerco',
  },
  'b3581c97:node_101': {
    name: 'Túnel II',
    buff: '+5% de Poder tático',
  },
  'b3581c97:node_25': {
    name: 'Carroça Armada II',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_28': {
    name: 'Trincheira II',
    buff: '+5% de Resistência de cerco',
  },
  'b3581c97:node_31': {
    name: 'Cavaleiro Imperial',
    buff: 'Desbloqueia Cavalaria T10',
  },
  'b3581c97:node_34': {
    name: 'Ataque Coordenado II',
    buff: '+5% de Resistência tática',
  },
  'b3581c97:node_37': {
    name: 'Estribo II',
    buff: '+10% de Resistência',
  },
  'b3581c97:node_40': {
    name: 'Sangue Quente II',
    buff: '+10% de Poder',
  },
  'b3581c97:node_43': {
    name: 'Carroça Armada III',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_46': {
    name: 'Trincheira III',
    buff: '+5% de Poder de cerco',
  },
  'b3581c97:node_49': {
    name: 'Carroça Armada IV',
    buff: '+5% de Resistência na defesa de cerco',
  },
  'b3581c97:node_52': {
    name: 'Trincheira IV',
    buff: '+5% de Resistência de cerco',
  },
  'b3581c97:node_55': {
    name: 'Coragem II',
    buff: '+5% de HP',
  },
  'b3581c97:node_58': {
    name: 'Treinamento da Guarda — Cavalaria',
    buff: '+2% de Dano',
  },
  'b3581c97:node_9': {
    name: 'Cobertura dos Atiradores I',
    buff: '+5% de Resistência tática',
  },
  'b3581c97:node_12': {
    name: 'Disparo Rotativo I',
    buff: '+5% de Poder tático',
  },
  'b3581c97:node_15': {
    name: 'Perseverança I',
    buff: '+5% de HP',
  },
  'b3581c97:node_18': {
    name: 'Torre I',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_21': {
    name: 'Disparo de Precisão I',
    buff: '+5% de Poder de cerco',
  },
  'b3581c97:node_102': {
    name: 'Túnel II',
    buff: '+5% de Poder tático',
  },
  'b3581c97:node_27': {
    name: 'Torre II',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_30': {
    name: 'Disparo de Precisão II',
    buff: '+5% de Resistência de cerco',
  },
  'b3581c97:node_33': {
    name: 'Atirador Imperial',
    buff: 'Desbloqueia Arqueiros T10',
  },
  'b3581c97:node_36': {
    name: 'Cobertura dos Atiradores II',
    buff: '+5% de Resistência tática',
  },
  'b3581c97:node_39': {
    name: 'Muralha de Escudos II',
    buff: '+10% de Resistência',
  },
  'b3581c97:node_42': {
    name: 'Flecha Reforçada II',
    buff: '+10% de Poder',
  },
  'b3581c97:node_45': {
    name: 'Torre III',
    buff: '+5% de Poder na defesa de cerco',
  },
  'b3581c97:node_48': {
    name: 'Disparo de Precisão III',
    buff: '+5% de Poder de cerco',
  },
  'b3581c97:node_51': {
    name: 'Torre IV',
    buff: '+5% de Resistência na defesa de cerco',
  },
  'b3581c97:node_54': {
    name: 'Disparo de Precisão IV',
    buff: '+5% de Resistência de cerco',
  },
  'b3581c97:node_57': {
    name: 'Perseverança II',
    buff: '+5% de HP',
  },
  'b3581c97:node_60': {
    name: 'Treinamento da Guarda — Arqueiros',
    buff: '+3% esquiva',
  },
  '2b149bcb:node_1': {
    name: 'Guarda Corajosa — Infantaria',
    buff: '+5% de Poder de cerco da Infantaria',
  },
  '2b149bcb:node_2': {
    name: 'Guarda Corajosa — Cavalaria',
    buff: '+5% de Poder de cerco da Cavalaria',
  },
  '2b149bcb:node_3': {
    name: 'Guarda Corajosa — Arqueiros',
    buff: '+5% de Poder de cerco dos Arqueiros',
  },
  '2b149bcb:node_4': {
    name: 'Guarda Perseverante — Infantaria',
    buff: '+5% de Resistência de cerco da Infantaria',
  },
  '2b149bcb:node_5': {
    name: 'Guarda Perseverante — Cavalaria',
    buff: '+5% de Resistência de cerco da Cavalaria',
  },
  '2b149bcb:node_6': {
    name: 'Guarda Perseverante — Arqueiros',
    buff: '+5% de Resistência de cerco dos Arqueiros',
  },
  '2b149bcb:node_7': {
    name: 'Rally da Guarda I',
    buff: '+5m de capacidade extra para tropas T10',
  },
  '2b149bcb:node_8': {
    name: 'Ataque da Guarda',
    buff: '+5% de Poder da Infantaria',
  },
  '2b149bcb:node_9': {
    name: 'Lança da Guarda',
    buff: '+5% de Poder da Cavalaria',
  },
  '2b149bcb:node_10': {
    name: 'Arco da Guarda',
    buff: '+5% de Poder dos Arqueiros',
  },
  '2b149bcb:node_11': {
    name: 'Escudo da Guarda I',
    buff: '+5% de Resistência da Infantaria',
  },
  '2b149bcb:node_12': {
    name: 'Armadura da Guarda I',
    buff: '+5% de Resistência da Cavalaria',
  },
  '2b149bcb:node_13': {
    name: 'Formação da Guarda I',
    buff: '+5% de Resistência dos Arqueiros',
  },
  '2b149bcb:node_14': {
    name: 'Rally de Infantaria',
    buff: '+15m de capacidade extra para Infantaria T10',
  },
  '2b149bcb:node_15': {
    name: 'Rally de Cavalaria',
    buff: '+15m de capacidade extra para Cavalaria T10',
  },
  '2b149bcb:node_16': {
    name: 'Rally de Arqueiros',
    buff: '+15m de capacidade extra para Arqueiros T10',
  },
  '2b149bcb:node_17': {
    name: 'Golpes da Guarda',
    buff: '+5% de Poder de todas as tropas',
  },
  '2b149bcb:node_18': {
    name: 'Escudo da Guarda II',
    buff: '+5% de Resistência da Infantaria',
  },
  '2b149bcb:node_19': {
    name: 'Armadura da Guarda II',
    buff: '+5% de Resistência da Cavalaria',
  },
  '2b149bcb:node_20': {
    name: 'Formação da Guarda II',
    buff: '+5% de Resistência dos Arqueiros',
  },
  '2b149bcb:node_21': {
    name: 'Rally da Guarda II',
    buff: '+30m de capacidade extra para tropas T10',
  },
  '2b149bcb:node_22': {
    name: 'Guarda Camuflada — Infantaria',
    buff: '+5% de Resistência tática da Infantaria',
  },
  '2b149bcb:node_23': {
    name: 'Guarda Camuflada — Cavalaria',
    buff: '+5% de Resistência tática da Cavalaria',
  },
  '2b149bcb:node_24': {
    name: 'Guarda Camuflada — Arqueiros',
    buff: '+5% de Resistência tática dos Arqueiros',
  },
  '2b149bcb:node_25': {
    name: 'Incursão da Guarda — Infantaria',
    buff: '+5% de Poder tático da Infantaria',
  },
  '2b149bcb:node_26': {
    name: 'Incursão da Guarda — Cavalaria',
    buff: '+5% de Poder tático da Cavalaria',
  },
  '2b149bcb:node_27': {
    name: 'Incursão da Guarda — Arqueiros',
    buff: '+5% de Poder tático dos Arqueiros',
  },
  '2b149bcb:node_28': {
    name: 'Moral da Guarda — Infantaria',
    buff: '+5% de HP da Infantaria',
  },
  '2b149bcb:node_29': {
    name: 'Moral da Guarda — Cavalaria',
    buff: '+5% de HP da Cavalaria',
  },
  '2b149bcb:node_30': {
    name: 'Moral da Guarda — Arqueiros',
    buff: '+5% de HP dos Arqueiros',
  },
  '2b149bcb:node_31': {
    name: 'Moral da Guarda',
    buff: '+5% de HP de todas as tropas',
  },
  '2b149bcb:node_32': {
    name: 'Contra-ataque da Guarda — Infantaria',
    buff: '+5% de Poder da Infantaria na defesa de cerco',
  },
  '2b149bcb:node_33': {
    name: 'Contra-ataque da Guarda — Cavalaria',
    buff: '+5% de Poder da Cavalaria na defesa de cerco',
  },
  '2b149bcb:node_34': {
    name: 'Contra-ataque da Guarda — Arqueiros',
    buff: '+5% de Poder dos Arqueiros na defesa de cerco',
  },
  '2b149bcb:node_35': {
    name: 'Determinação da Guarda — Infantaria',
    buff: '+5% de Resistência da Infantaria na defesa de cerco',
  },
  '2b149bcb:node_36': {
    name: 'Determinação da Guarda — Cavalaria',
    buff: '+5% de Resistência da Cavalaria na defesa de cerco',
  },
  '2b149bcb:node_37': {
    name: 'Determinação da Guarda — Arqueiros',
    buff: '+5% de Resistência dos Arqueiros na defesa de cerco',
  },
  '2b149bcb:node_38': {
    name: 'Rally da Guarda III',
    buff: '+160m de capacidade extra para tropas T10',
  },
  '3f5ebb34:node_1': {
    name: 'Guarda Armada I',
    buff: '+5% de Resistência da Infantaria',
  },
  '3f5ebb34:node_2': {
    name: 'Cavalaria Armada I',
    buff: '+5% de Resistência da Cavalaria',
  },
  '3f5ebb34:node_3': {
    name: 'Arqueiros Armados I',
    buff: '+5% de Resistência dos Arqueiros',
  },
  '3f5ebb34:node_4': {
    name: 'Lâmina da Infantaria I',
    buff: '+5% de Poder da Infantaria',
  },
  '3f5ebb34:node_5': {
    name: 'Cavaleiro Pesado I',
    buff: '+5% de Poder da Cavalaria',
  },
  '3f5ebb34:node_6': {
    name: 'Flecha Reforçada I',
    buff: '+5% de Poder dos Arqueiros',
  },
  '3f5ebb34:node_7': {
    name: 'Mobilização da Infantaria',
    buff: '+5% de HP da Infantaria',
  },
  '3f5ebb34:node_8': {
    name: 'Mobilização da Cavalaria',
    buff: '+5% de HP da Cavalaria',
  },
  '3f5ebb34:node_9': {
    name: 'Mobilização dos Arqueiros',
    buff: '+5% de HP dos Arqueiros',
  },
  '3f5ebb34:node_10': {
    name: 'Totalmente Armado',
    buff: '+5% de Resistência para todos os tipos de tropa',
  },
  '3f5ebb34:node_11': {
    name: 'Avanço',
    buff: '+5% de Poder tático da Infantaria',
  },
  '3f5ebb34:node_12': {
    name: 'Desvio',
    buff: '+5% de Poder tático da Cavalaria',
  },
  '3f5ebb34:node_13': {
    name: 'Disparo em uníssono',
    buff: '+5% de Poder tático dos Arqueiros',
  },
  '3f5ebb34:node_14': {
    name: 'Lâmina da Infantaria II',
    buff: '+5% de Poder da Infantaria',
  },
  '3f5ebb34:node_15': {
    name: 'Cavaleiro Pesado II',
    buff: '+5% de Poder da Cavalaria',
  },
  '3f5ebb34:node_16': {
    name: 'Flecha Reforçada II',
    buff: '+5% de Poder dos Arqueiros',
  },
  '3f5ebb34:node_17': {
    name: 'Guarda Armada II',
    buff: '+5% de Resistência da Infantaria',
  },
  '3f5ebb34:node_18': {
    name: 'Cavalaria Armada II',
    buff: '+5% de Resistência da Cavalaria',
  },
  '3f5ebb34:node_19': {
    name: 'Arqueiros Armados II',
    buff: '+5% de Resistência dos Arqueiros',
  },
  '3f5ebb34:node_20': {
    name: 'Ataque Brutal I',
    buff: '+4% de Dano para todas as tropas não supremas',
  },
  '3f5ebb34:node_21': {
    name: 'Carga da Infantaria',
    buff: '+5% de Poder de cerco da Infantaria',
  },
  '3f5ebb34:node_22': {
    name: 'Carga da Cavalaria',
    buff: '+5% de Poder de cerco da Cavalaria',
  },
  '3f5ebb34:node_23': {
    name: 'Carga dos Arqueiros',
    buff: '+5% de Poder de cerco dos Arqueiros',
  },
  '3f5ebb34:node_24': {
    name: 'Rally da Infantaria',
    buff: '+5% de Resistência de cerco da Infantaria',
  },
  '3f5ebb34:node_25': {
    name: 'Rally da Cavalaria',
    buff: '+5% de Resistência de cerco da Cavalaria',
  },
  '3f5ebb34:node_26': {
    name: 'Rally dos Arqueiros',
    buff: '+5% de Resistência de cerco dos Arqueiros',
  },
  '3f5ebb34:node_27': {
    name: 'Incentivo',
    buff: '+5% de HP para todos os tipos de tropa',
  },
  '3f5ebb34:node_28': {
    name: 'Canto em uníssono',
    buff: '+5% de Resistência da Infantaria',
  },
  '3f5ebb34:node_29': {
    name: 'Contra-ação',
    buff: '+5% de Resistência da Cavalaria',
  },
  '3f5ebb34:node_30': {
    name: 'Disparo Concentrado',
    buff: '+5% de Resistência dos Arqueiros',
  },
  '3f5ebb34:node_31': {
    name: 'Incursão',
    buff: '+5% de Poder para todos os tipos de tropa',
  },
  '3f5ebb34:node_32': {
    name: 'Lâmina Reforçada',
    buff: '+5% de Poder para todos os tipos de tropa',
  },
  '3f5ebb34:node_33': {
    name: 'Armadura de Elite',
    buff: '+5% de Resistência para todos os tipos de tropa',
  },
  '3f5ebb34:node_34': {
    name: 'Postura de Combate',
    buff: '+5% de Resistência de cerco de todas as tropas',
  },
  '3f5ebb34:node_35': {
    name: 'Postura Defensiva',
    buff: '+5% de Resistência de cerco de todas as tropas',
  },
  '3f5ebb34:node_36': {
    name: 'Ataque Brutal II',
    buff: '+6% de Dano para todas as tropas não supremas',
  },
  '3ff71437:node_1': {
    name: 'Segurar a Linha I — Infantaria',
    buff: '+5% de Resistência da Infantaria',
  },
  '3ff71437:node_2': {
    name: 'Segurar a Linha I — Cavalaria',
    buff: '+5% de Resistência da Cavalaria',
  },
  '3ff71437:node_3': {
    name: 'Segurar a Linha I — Arqueiros',
    buff: '+5% de Resistência dos Arqueiros',
  },
  '3ff71437:node_4': {
    name: 'Golpe Cauteloso I — Infantaria',
    buff: '+5% de Poder da Infantaria',
  },
  '3ff71437:node_5': {
    name: 'Golpe Cauteloso I — Cavalaria',
    buff: '+5% de Poder da Cavalaria',
  },
  '3ff71437:node_6': {
    name: 'Golpe Cauteloso I — Arqueiros',
    buff: '+5% de Poder dos Arqueiros',
  },
  '3ff71437:node_7': {
    name: 'Incentivo para Infantaria',
    buff: '+5% de HP da Infantaria',
  },
  '3ff71437:node_8': {
    name: 'Incentivo para Cavalaria',
    buff: '+5% de HP da Cavalaria',
  },
  '3ff71437:node_9': {
    name: 'Incentivo para Arqueiros',
    buff: '+5% de HP dos Arqueiros',
  },
  '3ff71437:node_10': {
    name: 'Respiração Profunda',
    buff: '+5% de Resistência para todos os tipos de tropa',
  },
  '3ff71437:node_11': {
    name: 'Estandarte de Comando — Infantaria',
    buff: '+5% de Poder tático da Infantaria',
  },
  '3ff71437:node_12': {
    name: 'Estandarte de Comando — Cavalaria',
    buff: '+5% de Poder tático da Cavalaria',
  },
  '3ff71437:node_13': {
    name: 'Estandarte de Comando — Arqueiros',
    buff: '+5% de Poder tático dos Arqueiros',
  },
  '3ff71437:node_14': {
    name: 'Golpe Cauteloso II — Infantaria',
    buff: '+5% de Poder da Infantaria',
  },
  '3ff71437:node_15': {
    name: 'Golpe Cauteloso II — Cavalaria',
    buff: '+5% de Poder da Cavalaria',
  },
  '3ff71437:node_16': {
    name: 'Golpe Cauteloso II — Arqueiros',
    buff: '+5% de Poder dos Arqueiros',
  },
  '3ff71437:node_17': {
    name: 'Segurar a Linha II — Infantaria',
    buff: '+5% de Resistência da Infantaria',
  },
  '3ff71437:node_18': {
    name: 'Segurar a Linha II — Cavalaria',
    buff: '+5% de Resistência da Cavalaria',
  },
  '3ff71437:node_19': {
    name: 'Segurar a Linha II — Arqueiros',
    buff: '+5% de Resistência dos Arqueiros',
  },
  '3ff71437:node_20': {
    name: 'Retaliação I',
    buff: '+4% de Dano para todas as tropas não supremas',
  },
  '3ff71437:node_21': {
    name: 'Ordem de Cerco — Infantaria',
    buff: '+5% de Poder de cerco da Infantaria',
  },
  '3ff71437:node_22': {
    name: 'Ordem de Cerco — Cavalaria',
    buff: '+5% de Poder de cerco da Cavalaria',
  },
  '3ff71437:node_23': {
    name: 'Ordem de Cerco — Arqueiros',
    buff: '+5% de Poder de cerco dos Arqueiros',
  },
  '3ff71437:node_24': {
    name: 'Formação da Infantaria',
    buff: '+5% de Poder da Infantaria na defesa de cerco',
  },
  '3ff71437:node_25': {
    name: 'Formação da Cavalaria',
    buff: '+5% de Poder da Cavalaria na defesa de cerco',
  },
  '3ff71437:node_26': {
    name: 'Formação dos Arqueiros',
    buff: '+5% de Poder dos Arqueiros na defesa de cerco',
  },
  '3ff71437:node_27': {
    name: 'Tenacidade',
    buff: '+5% de HP para todos os tipos de tropa',
  },
  '3ff71437:node_28': {
    name: 'Segurar o Estandarte — Resistência tática da Infantaria',
    buff: '+5% de Resistência tática da Infantaria',
  },
  '3ff71437:node_29': {
    name: 'Segurar o Estandarte — Resistência tática da Cavalaria',
    buff: '+5% de Resistência tática da Cavalaria',
  },
  '3ff71437:node_30': {
    name: 'Segurar o Estandarte — Resistência tática dos Arqueiros',
    buff: '+5% de Resistência tática dos Arqueiros',
  },
  '3ff71437:node_31': {
    name: 'Golpe Letal',
    buff: '+5% de Poder para todos os tipos de tropa',
  },
  '3ff71437:node_32': {
    name: 'Aprimoramento de Armas',
    buff: '+5% de Poder para todos os tipos de tropa',
  },
  '3ff71437:node_33': {
    name: 'Armadura Aprimorada',
    buff: '+5% de Resistência para todos os tipos de tropa',
  },
  '3ff71437:node_34': {
    name: 'Postura de Combate II',
    buff: '+5% de Resistência de cerco de todas as tropas',
  },
  '3ff71437:node_35': {
    name: 'Postura Defensiva II',
    buff: '+5% de Resistência de cerco de todas as tropas',
  },
  '3ff71437:node_36': {
    name: 'Retaliação II',
    buff: '+6% de Dano em defesa de cerco para todas as tropas não supremas',
  },
  'art_of_war_command:node_1': {
    name: 'Esgrima Enganosa',
    buff: '+5% de Poder da Infantaria na defesa de cerco',
  },
  'art_of_war_command:node_2': {
    name: 'Montaria Enganosa',
    buff: '+5% de Poder da Cavalaria na defesa de cerco',
  },
  'art_of_war_command:node_3': {
    name: 'Arqueria Enganosa',
    buff: '+5% de Poder dos Arqueiros na defesa de cerco',
  },
  'art_of_war_command:node_4': {
    name: 'Esgrima Fiel',
    buff: '+5% de Resistência da Infantaria na defesa de cerco',
  },
  'art_of_war_command:node_5': {
    name: 'Montaria Fiel',
    buff: '+5% de Resistência da Cavalaria na defesa de cerco',
  },
  'art_of_war_command:node_6': {
    name: 'Arqueria Fiel',
    buff: '+5% de Resistência dos Arqueiros na defesa de cerco',
  },
  'art_of_war_command:node_7': {
    name: 'Fonte da Vida I',
    buff: '+5% de HP para todos os tipos de tropa',
  },
  'art_of_war_command:node_8': {
    name: 'Esgrima Destemida',
    buff: '+5% de Poder de cerco da Infantaria',
  },
  'art_of_war_command:node_9': {
    name: 'Montaria Destemida',
    buff: '+5% de Poder de cerco da Cavalaria',
  },
  'art_of_war_command:node_10': {
    name: 'Arqueria Destemida',
    buff: '+5% de Poder de cerco dos Arqueiros',
  },
  'art_of_war_command:node_11': {
    name: 'Esgrima Determinada',
    buff: '+5% de Resistência de cerco da Infantaria',
  },
  'art_of_war_command:node_12': {
    name: 'Montaria Determinada',
    buff: '+5% de Resistência de cerco da Cavalaria',
  },
  'art_of_war_command:node_13': {
    name: 'Arqueria Determinada',
    buff: '+5% de Resistência de cerco dos Arqueiros',
  },
  'art_of_war_command:node_14': {
    name: 'Imparável I',
    buff: '+5% de Poder para todos os tipos de tropa',
  },
  'art_of_war_command:node_15': {
    name: 'Esgrima Furtiva I',
    buff: '+5% de Resistência da Infantaria',
  },
  'art_of_war_command:node_16': {
    name: 'Montaria Furtiva I',
    buff: '+5% de Resistência da Cavalaria',
  },
  'art_of_war_command:node_17': {
    name: 'Arqueria Furtiva I',
    buff: '+5% de Resistência dos Arqueiros',
  },
  'art_of_war_command:node_18': {
    name: 'Esgrima Intensa I',
    buff: '+5% de HP da Infantaria',
  },
  'art_of_war_command:node_19': {
    name: 'Montaria Intensa I',
    buff: '+5% de HP da Cavalaria',
  },
  'art_of_war_command:node_20': {
    name: 'Arqueria Intensa I',
    buff: '+5% de HP dos Arqueiros',
  },
  'art_of_war_command:node_21': {
    name: 'Imparável II',
    buff: '+5% de Poder para todos os tipos de tropa',
  },
  'art_of_war_command:node_22': {
    name: 'Esgrima Furtiva II',
    buff: '+5% de Resistência da Infantaria',
  },
  'art_of_war_command:node_23': {
    name: 'Montaria Furtiva II',
    buff: '+5% de Resistência da Cavalaria',
  },
  'art_of_war_command:node_24': {
    name: 'Arqueria Furtiva II',
    buff: '+5% de Resistência dos Arqueiros',
  },
  'art_of_war_command:node_25': {
    name: 'Esgrima de Rompimento',
    buff: '+5% de Poder de cerco da Infantaria',
  },
  'art_of_war_command:node_26': {
    name: 'Montaria de Rompimento',
    buff: '+5% de Poder de cerco da Cavalaria',
  },
  'art_of_war_command:node_27': {
    name: 'Arqueria de Rompimento',
    buff: '+5% de Poder de cerco dos Arqueiros',
  },
  'art_of_war_command:node_28': {
    name: 'Esgrima Intensa II',
    buff: '+5% de HP da Infantaria',
  },
  'art_of_war_command:node_29': {
    name: 'Montaria Intensa II',
    buff: '+5% de HP da Cavalaria',
  },
  'art_of_war_command:node_30': {
    name: 'Arqueria Intensa II',
    buff: '+5% de HP dos Arqueiros',
  },
  'art_of_war_command:node_31': {
    name: 'Talento Oculto',
    buff: '+10% todas tropa Resistência',
  },
  'art_of_war_command:node_32': {
    name: 'Comando Enganoso — Infantaria',
    buff: '+5% de Resistência tática da Infantaria',
  },
  'art_of_war_command:node_33': {
    name: 'Comando Enganoso — Cavalaria',
    buff: '+5% de Resistência tática da Cavalaria',
  },
  'art_of_war_command:node_34': {
    name: 'Comando Enganoso — Arqueiros',
    buff: '+5% de Resistência tática dos Arqueiros',
  },
  'art_of_war_command:node_35': {
    name: 'Ordem de Cerco — Infantaria',
    buff: '+5% de Poder tático da Infantaria',
  },
  'art_of_war_command:node_36': {
    name: 'Ordem de Cerco — Cavalaria',
    buff: '+5% de Poder tático da Cavalaria',
  },
  'art_of_war_command:node_37': {
    name: 'Ordem de Cerco — Arqueiros',
    buff: '+5% de Poder tático dos Arqueiros',
  },
  'art_of_war_command:node_38': {
    name: 'Fonte da Vida II',
    buff: '+10% de HP para todos os tipos de tropa',
  },
  '77db4a78:node_1': {
    name: 'Golpe Poderoso',
    buff: '20% de Poder da Infantaria',
  },
  '77db4a78:node_3': {
    name: 'Carga Feroz',
    buff: '20% de Poder da Cavalaria',
  },
  '77db4a78:node_2': {
    name: 'Flecha Aprimorada',
    buff: '20% de Poder dos Arqueiros',
  },
  '77db4a78:node_4': {
    name: 'Imparável',
    buff: '10% de Poder de todas as unidades',
  },
  '77db4a78:node_5': {
    name: 'Armadura Magistral',
    buff: '20% de Resistência da Infantaria',
  },
  '77db4a78:node_7': {
    name: 'Barda Aprimorada',
    buff: '20% de Resistência da Cavalaria',
  },
  '77db4a78:node_6': {
    name: 'Braçadeira Aprimorada',
    buff: '20% de Resistência dos Arqueiros',
  },
  '77db4a78:node_8': {
    name: 'Totalmente Armado',
    buff: '10% de Resistência de todas as unidades',
  },
  '77db4a78:node_9': {
    name: 'Aprimoramento Físico',
    buff: '10% de HP da Infantaria',
  },
  '77db4a78:node_10': {
    name: 'Poção de Mana',
    buff: '10% de HP da Cavalaria',
  },
  '77db4a78:node_11': {
    name: 'Invasor Pesado',
    buff: '10% de HP dos Arqueiros',
  },
  '77db4a78:node_12': {
    name: 'Armadura Totalmente Metálica',
    buff: '5% de HP para todas as tropas',
  },
  '77db4a78:node_13_F': {
    name: 'Infantaria Suprema',
    buff: 'Desbloqueia Infantaria T10',
  },
  '77db4a78:node_13_A': {
    name: 'Arqueiros Supremos',
    buff: 'Desbloqueia Arqueiros T10',
  },
  '77db4a78:node_13_C': {
    name: 'Desbloqueio T10',
    buff: 'Desbloqueia T10',
  },
  '77db4a78:node_14_F': {
    name: 'Ataque Letal',
    buff: '9% de Poder da Infantaria Suprema',
  },
  '77db4a78:node_15_F': {
    name: 'Armadura de Qualidade',
    buff: '6% de Resistência da Infantaria Suprema',
  },
  '77db4a78:node_16_F': {
    name: 'Armadura de Alta Classe',
    buff: '3% de HP da Infantaria Suprema',
  },
  '77db4a78:node_17_F': {
    name: 'Golpe Poderoso II',
    buff: '30% de Poder da Infantaria',
  },
  '77db4a78:node_18_F': {
    name: 'Armadura Magistral II',
    buff: '30% de Resistência da Infantaria',
  },
  '77db4a78:node_19_F': {
    name: 'Aprimoramento Físico II',
    buff: '15% de HP da Infantaria',
  },
  '77db4a78:node_20_F': {
    name: 'Capacidade da Infantaria Suprema',
    buff: '+200k de capacidade para a Infantaria Suprema',
  },
  '77db4a78:node_21_F': {
    name: 'Treinamento com Obstáculos',
    buff: '+50% de velocidade de treinamento da Infantaria Suprema',
  },
  '77db4a78:node_22_F': {
    name: 'Produção em Massa',
    buff: 'Custo de treinamento da Infantaria Suprema: -50%',
  },
  '77db4a78:node_23_F': {
    name: 'Poção de Reserva',
    buff: '+50% de velocidade de cura da Infantaria Suprema',
  },
  '77db4a78:node_24_F': {
    name: 'Cura Milagrosa',
    buff: 'Custo de cura da Infantaria Suprema: -50%',
  },
  '77db4a78:node_25_F': {
    name: 'Capacidade da Infantaria Suprema II',
    buff: '+800k de capacidade para a Infantaria Suprema',
  },
  '77db4a78:node_26_F': {
    name: 'Golpe Poderoso III',
    buff: '42% de Poder da Infantaria',
  },
  '77db4a78:node_27_F': {
    name: 'Armadura Magistral III',
    buff: '40% de Resistência da Infantaria',
  },
  '77db4a78:node_28_F': {
    name: 'Aprimoramento Físico III',
    buff: '20% de HP da Infantaria',
  },
  '77db4a78:node_29_F': {
    name: 'Ataque Corajoso',
    buff: '20% de Dano da Infantaria Suprema',
  },
  '77db4a78:node_14_C': {
    name: 'Ataque Letal',
    buff: '9% de Poder da Cavalaria Suprema',
  },
  '77db4a78:node_15_C': {
    name: 'Armadura de Cavalo de Qualidade',
    buff: '6% de Resistência da Cavalaria Suprema',
  },
  '77db4a78:node_16_C': {
    name: 'Armadura de Cavalo de Alta Classe',
    buff: '3% de HP da Cavalaria Suprema',
  },
  '77db4a78:node_17_C': {
    name: 'Carga Feroz II',
    buff: '30% de Poder da Cavalaria',
  },
  '77db4a78:node_18_C': {
    name: 'Barda Aprimorada II',
    buff: '30% de Resistência da Cavalaria',
  },
  '77db4a78:node_19_C': {
    name: 'Invasor Pesado II',
    buff: '15% de HP da Cavalaria',
  },
  '77db4a78:node_20_C': {
    name: 'Invasor do Caos',
    buff: '+200k de capacidade para a Cavalaria Suprema',
  },
  '77db4a78:node_21_C': {
    name: 'Treinamento com Obstáculos',
    buff: '+50% de velocidade de treinamento da Cavalaria Suprema',
  },
  '77db4a78:node_22_C': {
    name: 'Produção em Massa',
    buff: 'Custo de treinamento da Cavalaria Suprema: -50%',
  },
  '77db4a78:node_23_C': {
    name: 'Poção de Reserva',
    buff: '+50% de velocidade de cura da Cavalaria Suprema',
  },
  '77db4a78:node_24_C': {
    name: 'Cura Milagrosa',
    buff: 'Custo de cura da Cavalaria Suprema: -50%',
  },
  '77db4a78:node_25_C': {
    name: 'Invasor do Caos II',
    buff: '+800k de capacidade para a Cavalaria Suprema',
  },
  '77db4a78:node_26_C': {
    name: 'Carga Feroz III',
    buff: '42% de Poder da Cavalaria',
  },
  '77db4a78:node_27_C': {
    name: 'Barda Aprimorada III',
    buff: '40% de Resistência da Cavalaria',
  },
  '77db4a78:node_28_C': {
    name: 'Invasor Pesado III',
    buff: '20% de HP da Cavalaria',
  },
  '77db4a78:node_29_C': {
    name: 'Ataque Corajoso',
    buff: '20% de Dano da Cavalaria Suprema',
  },
  '77db4a78:node_14_A': {
    name: 'Ataque Letal',
    buff: '9% de Poder dos Arqueiros Supremos',
  },
  '77db4a78:node_15_A': {
    name: 'Armadura de Qualidade',
    buff: '6% de Resistência dos Arqueiros Supremos',
  },
  '77db4a78:node_16_A': {
    name: 'Armadura de Alta Classe',
    buff: '3% de HP dos Arqueiros Supremos',
  },
  '77db4a78:node_17_A': {
    name: 'Flecha Aprimorada II',
    buff: '30% de Poder dos Arqueiros',
  },
  '77db4a78:node_18_A': {
    name: 'Braçadeira Aprimorada II',
    buff: '30% de Resistência dos Arqueiros',
  },
  '77db4a78:node_19_A': {
    name: 'Invasor Pesado II',
    buff: '15% de HP dos Arqueiros',
  },
  '77db4a78:node_20_A': {
    name: 'Capacidade dos Arqueiros Supremos',
    buff: '+200k de capacidade para os Arqueiros Supremos',
  },
  '77db4a78:node_21_A': {
    name: 'Treinamento com Obstáculos',
    buff: '+50% de velocidade de treinamento dos Arqueiros Supremos',
  },
  '77db4a78:node_22_A': {
    name: 'Produção em Massa',
    buff: 'Custo de treinamento dos Arqueiros Supremos: -50%',
  },
  '77db4a78:node_23_A': {
    name: 'Poção de Reserva',
    buff: '+50% de velocidade de cura dos Arqueiros Supremos',
  },
  '77db4a78:node_24_A': {
    name: 'Cura Milagrosa',
    buff: 'Custo de cura dos Arqueiros Supremos: -50%',
  },
  '77db4a78:node_25_A': {
    name: 'Capacidade dos Arqueiros Supremos II',
    buff: '+800k de capacidade para os Arqueiros Supremos',
  },
  '77db4a78:node_26_A': {
    name: 'Flecha Aprimorada III',
    buff: '42% de Poder dos Arqueiros',
  },
  '77db4a78:node_27_A': {
    name: 'Braçadeira Aprimorada III',
    buff: '40% de Resistência dos Arqueiros',
  },
  '77db4a78:node_28_A': {
    name: 'Invasor Pesado III',
    buff: '20% de HP dos Arqueiros',
  },
  '77db4a78:node_29_A': {
    name: 'Ataque Corajoso',
    buff: '20% de Dano dos Arqueiros Supremos',
  },
  '24ffc526:node_1': {
    name: 'Coragem Total — Cavalaria',
    buff: '10% de Poder da linha de frente',
  },
  '24ffc526:node_2': {
    name: 'Perseverança — Cavalaria',
    buff: '10% de Resistência da linha de frente',
  },
  '24ffc526:node_3': {
    name: 'Coragem Total — Arqueiros',
    buff: '10% de Poder da linha de frente',
  },
  '24ffc526:node_4': {
    name: 'Perseverança — Arqueiros',
    buff: '10% de Resistência da linha de frente',
  },
  '24ffc526:node_5': {
    name: 'Coragem Total — Infantaria',
    buff: '10% de Poder da linha de frente',
  },
  '24ffc526:node_6': {
    name: 'Perseverança — Infantaria',
    buff: '10% de Resistência da linha de frente',
  },
  '24ffc526:node_7': {
    name: 'Resistência da Linha de Frente',
    buff: '10% de Resistência tática de todas as unidades da linha de frente',
  },
  '24ffc526:node_8': {
    name: 'Incursão por Infantaria',
    buff: '100% de velocidade de marcha da Infantaria',
  },
  '24ffc526:node_9': {
    name: 'Incursão por Arqueiros',
    buff: '100% de velocidade de marcha dos Arqueiros',
  },
  '24ffc526:node_10': {
    name: 'Carga à frente',
    buff: '10% de Poder da Cavalaria com uma Legião composta só por Cavalaria',
  },
  '24ffc526:node_11': {
    name: 'Formação de Avanço — Cavalaria',
    buff: '10% de Poder da linha do meio',
  },
  '24ffc526:node_12': {
    name: 'Formação de Avanço — Arqueiros',
    buff: '10% de Poder da linha do meio',
  },
  '24ffc526:node_13': {
    name: 'Formação de Avanço — Infantaria',
    buff: '10% de Poder da linha do meio',
  },
  '24ffc526:node_14': {
    name: 'Proteção Lateral — Cavalaria',
    buff: '10% de Resistência da linha do meio',
  },
  '24ffc526:node_15': {
    name: 'Proteção Lateral — Arqueiros',
    buff: '10% de Resistência da linha do meio',
  },
  '24ffc526:node_16': {
    name: 'Proteção Lateral — Infantaria',
    buff: '10% de Resistência da linha do meio',
  },
  '24ffc526:node_17': {
    name: 'Força Central',
    buff: '10% de Poder tático de todas as unidades da linha do meio',
  },
  '24ffc526:node_18': {
    name: 'Força Principal — Cavalaria',
    buff: '10% de Poder da última linha',
  },
  '24ffc526:node_19': {
    name: 'Força Principal — Arqueiros',
    buff: '10% de Poder da última linha',
  },
  '24ffc526:node_20': {
    name: 'Força Principal — Infantaria',
    buff: '10% de Poder da última linha',
  },
  '24ffc526:node_21': {
    name: 'Tática Secreta — Cavalaria',
    buff: '10% de Resistência da última linha',
  },
  '24ffc526:node_22': {
    name: 'Tática Secreta — Arqueiros',
    buff: '10% de Resistência da última linha',
  },
  '24ffc526:node_23': {
    name: 'Tática Secreta — Infantaria',
    buff: '10% de Resistência da última linha',
  },
  '24ffc526:node_24': {
    name: 'Força de Comando',
    buff: '10% de Poder tático de todas as unidades da linha de trás',
  },
  '24ffc526:node_25': {
    name: 'Poder Concentrado',
    buff: '10% de Poder da linha de trás',
  },
  '24ffc526:node_26': {
    name: 'Movimento Coordenado',
    buff: '10% de Poder da linha do meio',
  },
  '24ffc526:node_27': {
    name: 'Avanço da Linha de Frente',
    buff: '10% de Poder da linha de frente',
  },
  '24ffc526:node_28': {
    name: 'Defesa de Pivô',
    buff: '10% de Resistência da linha do meio',
  },
  '24ffc526:node_29': {
    name: '"Me cubra!"',
    buff: '10% de Resistência da linha de trás',
  },
  '24ffc526:node_30': {
    name: 'À Prova de Impacto',
    buff: '10% de Resistência da linha de frente',
  },
  '24ffc526:node_31': {
    name: 'Combate Corpo a Corpo',
    buff: 'HP da linha de frente +10%',
  },
  '24ffc526:node_32': {
    name: 'Força Central',
    buff: '20% de Poder tático da linha do meio',
  },
  '24ffc526:node_33': {
    name: 'Resistência Central',
    buff: '20% de Resistência tática linha do meio',
  },
  '24ffc526:node_34': {
    name: 'Golpe Brutal',
    buff: '5% de Dano linha de trás',
  },
  '2c49bd2a:node_1': {
    name: 'Cerco Estratégico',
    buff: 'Poder tático em defesa de cerco +10%',
  },
  '2c49bd2a:node_2': {
    name: 'Defesa Sólida — Infantaria',
    buff: 'Resistência da Infantaria em batalhas fora de cerco +5%',
  },
  '2c49bd2a:node_3': {
    name: 'Defesa Sólida — Cavalaria',
    buff: 'Resistência da Cavalaria em batalhas fora de cerco +5%',
  },
  '2c49bd2a:node_4': {
    name: 'Defesa Sólida — Arqueiros',
    buff: 'Resistência dos Arqueiros em batalhas fora de cerco +5%',
  },
  '2c49bd2a:node_5': {
    name: 'Quebra de Portão — Infantaria',
    buff: 'Poder de cerco da Infantaria +5%',
  },
  '2c49bd2a:node_6': {
    name: 'Invasão do Castelo — Cavalaria',
    buff: 'Poder de cerco da Cavalaria +5%',
  },
  '2c49bd2a:node_7': {
    name: 'Tiro Paralisante — Arqueiros',
    buff: 'Poder de cerco dos Arqueiros +5%',
  },
  '2c49bd2a:node_8': {
    name: 'Táticas Surpreendentemente Úteis',
    buff: 'Poder tático em batalhas fora de cerco +10%',
  },
  '2c49bd2a:node_9': {
    name: 'Linha de Defesa da Infantaria',
    buff: 'Resistência de cerco da Infantaria +5%',
  },
  '2c49bd2a:node_10': {
    name: 'Cavalaria como Barricada',
    buff: 'Resistência de cerco da Cavalaria +5%',
  },
  '2c49bd2a:node_11': {
    name: 'Defesa Traseira dos Arqueiros',
    buff: 'Resistência de cerco dos Arqueiros +5%',
  },
  '2c49bd2a:node_12': {
    name: 'Quebra-Muralhas',
    buff: 'Poder da Infantaria na defesa de cerco +5%',
  },
  '2c49bd2a:node_13': {
    name: 'Carga da Cavalaria',
    buff: 'Poder da Cavalaria na defesa de cerco +5%',
  },
  '2c49bd2a:node_14': {
    name: 'Chuva de Flechas',
    buff: 'Poder dos Arqueiros na defesa de cerco +5%',
  },
  '2c49bd2a:node_15': {
    name: 'Estratagema de Cerco',
    buff: 'Poder tático em ataques de cerco +10%',
  },
  '2c49bd2a:node_16': {
    name: 'Guardas no Topo da Muralha',
    buff: 'Poder da Infantaria na defesa de cerco +5%',
  },
  '2c49bd2a:node_17': {
    name: 'Escudo Dourado da Cavalaria',
    buff: 'Poder da Cavalaria na defesa de cerco +5%',
  },
  '2c49bd2a:node_18': {
    name: 'Defesa de Torre dos Arqueiros',
    buff: 'Poder dos Arqueiros na defesa de cerco +5%',
  },
  '2c49bd2a:node_19': {
    name: 'Rompimento da Infantaria',
    buff: 'Poder da Infantaria em batalhas fora de cerco +5%',
  },
  '2c49bd2a:node_20': {
    name: 'Incursão da Cavalaria',
    buff: 'Poder da Cavalaria em batalhas fora de cerco +5%',
  },
  '2c49bd2a:node_21': {
    name: 'Golpe à Distância dos Arqueiros',
    buff: 'Poder dos Arqueiros em batalhas fora de cerco +5%',
  },
  '2c49bd2a:node_22': {
    name: 'Exército com Efetivo Completo',
    buff: 'Com o poder do esquadrão acima de 90%, Mitigação de Dano +5%',
  },
  '2c49bd2a:node_23': {
    name: 'Investida da Infantaria',
    buff: 'Poder da Infantaria +5%',
  },
  '2c49bd2a:node_24': {
    name: 'Pisoteio da Infantaria',
    buff: 'Resistência da Infantaria +5%',
  },
  '2c49bd2a:node_25': {
    name: 'Incursão da Cavalaria',
    buff: 'Poder da Cavalaria +5%',
  },
  '2c49bd2a:node_26': {
    name: 'Cavalaria Defensora do Forte',
    buff: 'Resistência da Cavalaria +5%',
  },
  '2c49bd2a:node_27': {
    name: 'Disparo dos Arqueiros',
    buff: 'Poder dos Arqueiros +5%',
  },
  '2c49bd2a:node_28': {
    name: 'Arqueiros Defensores do Forte',
    buff: 'Resistência dos Arqueiros +5%',
  },
  '2c49bd2a:node_29': {
    name: 'Reforço Estratégico',
    buff: 'Resistência tática +10%',
  },
  '2c49bd2a:node_30': {
    name: 'Treino Rápido da Infantaria',
    buff: 'Velocidade de treinamento da Infantaria +10%',
  },
  '2c49bd2a:node_31': {
    name: 'Treino Rápido da Cavalaria',
    buff: 'Velocidade de treinamento da Cavalaria +10%',
  },
  '2c49bd2a:node_32': {
    name: 'Treino Rápido dos Arqueiros',
    buff: 'Velocidade de treinamento dos Arqueiros +10%',
  },
  '2c49bd2a:node_33': {
    name: 'Pisoteio da Infantaria',
    buff: 'Resistência da Infantaria +10%',
  },
  '2c49bd2a:node_34': {
    name: 'Cavalaria Defensora do Forte',
    buff: 'Resistência da Cavalaria +10%',
  },
  '2c49bd2a:node_35': {
    name: 'Arqueiros Defensores do Forte',
    buff: 'Resistência dos Arqueiros +10%',
  },
  '2c49bd2a:node_36': {
    name: 'Investida da Infantaria',
    buff: 'Poder da Infantaria +10%',
  },
  '2c49bd2a:node_37': {
    name: 'Incursão da Cavalaria',
    buff: 'Poder da Cavalaria +10%',
  },
  '2c49bd2a:node_38': {
    name: 'Disparo dos Arqueiros',
    buff: 'Poder dos Arqueiros +10%',
  },
  '2c49bd2a:node_39': {
    name: 'Soldado de Vontade Firme',
    buff: 'HP de todas as unidades +10%',
  },
  '2c49bd2a:node_40': {
    name: 'Treinamento Intenso da Infantaria',
    buff: 'Redução do custo de treinamento da Infantaria Nv. 10: +10%',
  },
  '2c49bd2a:node_41': {
    name: 'Treinamento Intenso da Cavalaria',
    buff: 'Redução do custo de treinamento da Cavalaria Nv. 10: +10%',
  },
  '2c49bd2a:node_42': {
    name: 'Treinamento Intenso dos Arqueiros',
    buff: 'Redução do custo de treinamento dos Arqueiros Nv. 10: +10%',
  },
  '2c49bd2a:node_43': {
    name: 'Avanço sem Hesitação',
    buff: 'Infantaria causa +5% de Dano',
  },
  '2c49bd2a:node_44': {
    name: 'Cavalaria Quebra-Formação',
    buff: 'Cavalaria causa +5% de Dano',
  },
  '2c49bd2a:node_45': {
    name: 'Enxurrada de Flechas',
    buff: 'Arqueiros causam +5% de Dano',
  },
  'fc190e81:node_1': {
    name: 'Fonte da Vida I',
    buff: '+8% de HP de todas as tropas',
  },
  'fc190e81:node_2': {
    name: 'Avanço da Linha de Frente',
    buff: '+8% de Poder da linha de frente',
  },
  'fc190e81:node_3': {
    name: 'Movimento Coordenado',
    buff: '+8% de Poder da linha do meio',
  },
  'fc190e81:node_4': {
    name: 'Poder Concentrado',
    buff: '+8% de Poder da linha de trás',
  },
  'fc190e81:node_5': {
    name: 'Guarda Armada I',
    buff: '+8% de Resistência da Infantaria',
  },
  'fc190e81:node_6': {
    name: 'Arqueiros Armados I',
    buff: '+8% de Resistência dos Arqueiros',
  },
  'fc190e81:node_7': {
    name: 'Cavalaria Armada I',
    buff: '+8% de Resistência da Cavalaria',
  },
  'fc190e81:node_8': {
    name: 'Escudo de Sangue de Dragão I',
    buff: '-5% de Dano recebido',
  },
  'fc190e81:node_9': {
    name: 'À Prova de Impacto',
    buff: '+8% de Resistência da linha de frente',
  },
  'fc190e81:node_10': {
    name: 'Defesa de Pivô',
    buff: '+8% de Resistência da linha do meio',
  },
  'fc190e81:node_11': {
    name: 'Me Cubra',
    buff: '+8% de Resistência da linha de trás',
  },
  'fc190e81:node_12': {
    name: 'Lâmina da Infantaria I',
    buff: '+8% de Poder da Infantaria',
  },
  'fc190e81:node_13': {
    name: 'Flecha Reforçada I',
    buff: '+8% de Poder dos Arqueiros',
  },
  'fc190e81:node_14': {
    name: 'Cavaleiro Pesado I',
    buff: '+8% de Poder da Cavalaria',
  },
  'fc190e81:node_15': {
    name: 'Treinamento Acelerado',
    buff: 'Velocidade de treinamento aumentada em +5%',
  },
  'fc190e81:node_16': {
    name: 'Esgrima Intensa I',
    buff: '+10% de HP da Infantaria',
  },
  'fc190e81:node_17': {
    name: 'Arqueria Intensa I',
    buff: '+10% de HP dos Arqueiros',
  },
  'fc190e81:node_18': {
    name: 'Montaria Intensa I',
    buff: '+10% de HP da Cavalaria',
  },
  'fc190e81:node_19': {
    name: 'Poder do Sangue de Dragão',
    buff: '+5% de Dano causado',
  },
  'fc190e81:node_20': {
    name: 'Carga',
    buff: '+12% de Poder de cerco',
  },
  'fc190e81:node_21': {
    name: 'Rally',
    buff: '+12% de Poder na defesa de cerco',
  },
  'fc190e81:node_22': {
    name: 'Guerra de Guerrilha',
    buff: '+12% de Poder em combate fora de cerco',
  },
  'fc190e81:node_23': {
    name: 'Postura de Combate',
    buff: '+12% de Resistência de cerco',
  },
  'fc190e81:node_24': {
    name: 'Postura Defensiva',
    buff: '+12% de Resistência na defesa de cerco',
  },
  'fc190e81:node_25': {
    name: 'Postura de Gladiador',
    buff: '+12% de Resistência em combate fora de cerco',
  },
  'fc190e81:node_26': {
    name: 'Fonte da Vida II',
    buff: '+12% de HP de todas as tropas',
  },
  'fc190e81:node_27': {
    name: 'Avanço da Linha de Frente II',
    buff: '+12% de Poder da linha de frente',
  },
  'fc190e81:node_28': {
    name: 'À Prova de Impacto II',
    buff: '+12% de Resistência da linha de frente',
  },
  'fc190e81:node_29': {
    name: 'Movimento Coordenado II',
    buff: '+12% de Poder da linha do meio',
  },
  'fc190e81:node_30': {
    name: 'Defesa de Pivô II',
    buff: '+12% de Resistência da linha do meio',
  },
  'fc190e81:node_31': {
    name: 'Poder Concentrado II',
    buff: '+12% de Poder da linha de trás',
  },
  'fc190e81:node_32': {
    name: 'Me Cubra II',
    buff: '+12% de Resistência da linha de trás',
  },
  'fc190e81:node_33': {
    name: 'Cura do Sangue de Dragão',
    buff: 'Velocidade de cura aumentada em +5%',
  },
  'fc190e81:node_34': {
    name: 'Lâmina da Infantaria II',
    buff: '+20% de Poder da Infantaria',
  },
  'fc190e81:node_35': {
    name: 'Flecha Reforçada II',
    buff: '+20% de Poder dos Arqueiros',
  },
  'fc190e81:node_36': {
    name: 'Cavaleiro Pesado II',
    buff: '+20% de Poder da Cavalaria',
  },
  'fc190e81:node_37': {
    name: 'Guarda Armada II',
    buff: '+20% de Resistência da Infantaria',
  },
  'fc190e81:node_38': {
    name: 'Arqueiros Armados II',
    buff: '+20% de Resistência dos Arqueiros',
  },
  'fc190e81:node_39': {
    name: 'Cavalaria Armada II',
    buff: '+20% de Resistência da Cavalaria',
  },
  'fc190e81:node_40': {
    name: 'Escudo de Sangue de Dragão II',
    buff: '-5% de Dano recebido',
  },
  'fc190e81:node_41': {
    name: 'Esgrima Intensa II',
    buff: '+30% de HP da Infantaria',
  },
  'fc190e81:node_42': {
    name: 'Arqueria Intensa II',
    buff: '+30% de HP dos Arqueiros',
  },
  'fc190e81:node_43': {
    name: 'Montaria Intensa II',
    buff: '+30% de HP da Cavalaria',
  },
  '19ae0569:node_1': {
    name: 'Resgate Bem Planejado',
    buff: 'Resistência do aliado reforçado +10%',
  },
  '19ae0569:node_2': {
    name: 'Mestre do Treinamento',
    buff: '+3000 tropas treinadas',
  },
  '19ae0569:node_3': {
    name: 'Defesa Conjunta',
    buff: 'Resistência +10% ao receber reforços',
  },
  '19ae0569:node_4': {
    name: 'Cooperação Perfeita',
    buff: 'Poder +10% ao enviar reforços',
  },
  '19ae0569:node_5': {
    name: 'Mestre do Aprimoramento',
    buff: 'Capacidade de Tropas Aprimoradas +20000',
  },
  '19ae0569:node_6': {
    name: 'Revidar',
    buff: 'Poder do aliado +10% ao receber reforços',
  },
  '19ae0569:node_7': {
    name: 'Fúria da Infantaria I',
    buff: '+10% de HP da Infantaria',
  },
  '19ae0569:node_8': {
    name: 'Cavalaria em Combate I',
    buff: '+10% de Poder da Cavalaria',
  },
  '19ae0569:node_9': {
    name: 'Fúria dos Arqueiros I',
    buff: '+10% de HP dos Arqueiros',
  },
  '19ae0569:node_10': {
    name: 'Hospital de Campanha',
    buff: '+150k de Capacidade do hospital',
  },
  '19ae0569:node_11': {
    name: 'Fúria da Infantaria II',
    buff: '+10% de HP da Infantaria',
  },
  '19ae0569:node_12': {
    name: 'Cavalaria em Combate II',
    buff: '+10% de Poder da Cavalaria',
  },
  '19ae0569:node_13': {
    name: 'Fúria dos Arqueiros II',
    buff: '+10% de HP dos Arqueiros',
  },
  '19ae0569:node_14': {
    name: 'Expansão da Infantaria I',
    buff: '+500k de capacidade da Infantaria Suprema',
  },
  '19ae0569:node_15': {
    name: 'Expansão da Cavalaria I',
    buff: '+500k de capacidade da Cavalaria Suprema',
  },
  '19ae0569:node_16': {
    name: 'Expansão dos Arqueiros I',
    buff: '+500k de capacidade dos Arqueiros Supremos',
  },
  '19ae0569:node_17': {
    name: 'Refino de Armadura',
    buff: '+5% de Resistência',
  },
  '19ae0569:node_18': {
    name: 'Incursão da Infantaria',
    buff: '+10% de Poder tático da Infantaria',
  },
  '19ae0569:node_19': {
    name: 'Ataque da Cavalaria',
    buff: '+10% de Poder tático da Cavalaria',
  },
  '19ae0569:node_20': {
    name: 'Disparo dos Arqueiros',
    buff: '+10% de Poder tático dos Arqueiros',
  },
  '19ae0569:node_21': {
    name: 'Escudo da Infantaria',
    buff: '+10% de Resistência tática da Infantaria',
  },
  '19ae0569:node_22': {
    name: 'Cavalaria na Retaguarda',
    buff: '+10% de Resistência tática da Cavalaria',
  },
  '19ae0569:node_23': {
    name: 'Cobertura dos Arqueiros',
    buff: '+10% de Resistência tática dos Arqueiros',
  },
  '19ae0569:node_24': {
    name: 'Expansão da Infantaria II',
    buff: '+500k de capacidade da Infantaria Suprema',
  },
  '19ae0569:node_25': {
    name: 'Expansão da Cavalaria II',
    buff: '+500k de capacidade da Cavalaria Suprema',
  },
  '19ae0569:node_26': {
    name: 'Expansão dos Arqueiros II',
    buff: '+500k de capacidade dos Arqueiros Supremos',
  },
  '19ae0569:node_27': {
    name: 'Têmpera da Lâmina',
    buff: '+5% de Poder',
  },
  '19ae0569:node_28': {
    name: 'Escudo de Aço',
    buff: '+10% de Resistência da Infantaria Suprema',
  },
  '19ae0569:node_29': {
    name: 'Armadura de Cavalo',
    buff: '+10% de Resistência da Cavalaria Suprema',
  },
  '19ae0569:node_30': {
    name: 'Manoplas',
    buff: '+10% de Resistência dos Arqueiros Supremos',
  },
  '19ae0569:node_31': {
    name: 'Espada de Aço',
    buff: '+10% de Poder da Infantaria Suprema',
  },
  '19ae0569:node_32': {
    name: 'Lança Afiada',
    buff: '+10% de Poder da Cavalaria Suprema',
  },
  '19ae0569:node_33': {
    name: 'Besta',
    buff: '+10% de Poder dos Arqueiros Supremos',
  },
  '19ae0569:node_34': {
    name: 'Grande Expansão da Infantaria',
    buff: '+1m de capacidade da Infantaria Suprema',
  },
  '19ae0569:node_35': {
    name: 'Grande Expansão da Cavalaria',
    buff: '+1m de capacidade da Cavalaria Suprema',
  },
  '19ae0569:node_36': {
    name: 'Grande Expansão dos Arqueiros',
    buff: '+1m de capacidade dos Arqueiros Supremos',
  },
  '19ae0569:node_37': {
    name: 'Bênção da Vida',
    buff: '+5% de HP para Tropas Supremas',
  },
  '9c5d4006:node_1': {
    name: 'Escudo de Defesa',
    buff: '+10% de Resistência na defesa de cerco da Infantaria',
  },
  '9c5d4006:node_2': {
    name: 'Armadura de Defesa',
    buff: '+10% de Resistência na defesa de cerco dos Arqueiros',
  },
  '9c5d4006:node_3': {
    name: 'Cavalaria de Defesa',
    buff: '+10% de Resistência na defesa de cerco da Cavalaria',
  },
  '9c5d4006:node_4': {
    name: 'Rompimento da Infantaria',
    buff: '+10% de Poder na defesa de cerco da Infantaria',
  },
  '9c5d4006:node_5': {
    name: 'Rompimento dos Arqueiros',
    buff: '+10% de Poder na defesa de cerco dos Arqueiros',
  },
  '9c5d4006:node_6': {
    name: 'Rompimento da Cavalaria',
    buff: '+10% de Poder na defesa de cerco da Cavalaria',
  },
  '9c5d4006:node_7': {
    name: 'Proteção Tática Corpo a Corpo',
    buff: '+5% de Resistência tática de todas as unidades',
  },
  '9c5d4006:node_8': {
    name: 'Perseverança - Legião de Classe',
    buff: '+15% de Resistência da Legião de Classe de todas as unidades',
  },
  '9c5d4006:node_9': {
    name: 'Perseverança - Legião I',
    buff: '+15% de Resistência da Legião I de todas as unidades',
  },
  '9c5d4006:node_10': {
    name: 'Perseverança - Legião II',
    buff: '+15% de Resistência da Legião II de todas as unidades',
  },
  '9c5d4006:node_11': {
    name: 'Perseverança - Legião III',
    buff: '+15% de Resistência da Legião III de todas as unidades',
  },
  '9c5d4006:node_12': {
    name: 'Perseverança - Fila de Defesa',
    buff: '+15% de Resistência da fila de defesa de todas as unidades',
  },
  '9c5d4006:node_13': {
    name: 'Defesa Sólida',
    buff: '+10% de Resistência na defesa de cerco de todas as unidades',
  },
  '9c5d4006:node_14': {
    name: 'Força de Defesa',
    buff: 'Capacidade máxima da fila de defesa aumentada em 15000',
  },
  '9c5d4006:node_15': {
    name: 'Golpe Tático Corpo a Corpo',
    buff: '+5% de Poder tático de todas as unidades',
  },
  '9c5d4006:node_16': {
    name: 'Perseverança - Legião de Classe M',
    buff: '+15% de Poder da Legião de Classe de todas as unidades',
  },
  '9c5d4006:node_17': {
    name: 'Perseverança - Legião I M',
    buff: '+15% de Poder da Legião I de todas as unidades',
  },
  '9c5d4006:node_18': {
    name: 'Perseverança - Legião II M',
    buff: '+15% de Poder da Legião II M de todas as unidades',
  },
  '9c5d4006:node_19': {
    name: 'Perseverança - Legião III M',
    buff: '+15% de Poder da Legião III de todas as unidades',
  },
  '9c5d4006:node_20': {
    name: 'Coragem - Fila de Defesa',
    buff: '+15% de Poder da fila de defesa de todas as unidades',
  },
  '9c5d4006:node_21': {
    name: 'Iniciativa',
    buff: '+10% de Poder na defesa de cerco de todas as unidades',
  },
  '9c5d4006:node_22': {
    name: 'Corpo a Corpo - Escudo da Infantaria',
    buff: '+15% de Resistência da Infantaria',
  },
  '9c5d4006:node_23': {
    name: 'Corpo a Corpo - Cavalaria na Retaguarda',
    buff: '+15% de Resistência da Cavalaria',
  },
  '9c5d4006:node_24': {
    name: 'Corpo a Corpo - Cobertura dos Arqueiros',
    buff: '+15% de Resistência dos Arqueiros',
  },
  '9c5d4006:node_25': {
    name: 'Corpo a Corpo - Incursão da Infantaria',
    buff: '+15% de Poder da Infantaria',
  },
  '9c5d4006:node_26': {
    name: 'Corpo a Corpo - Assalto da Cavalaria',
    buff: '+15% de Poder da Cavalaria',
  },
  '9c5d4006:node_27': {
    name: 'Corpo a Corpo - Tiro dos Arqueiros',
    buff: '+15% de Poder dos Arqueiros',
  },
  '9c5d4006:node_28': {
    name: 'Bom Físico',
    buff: '+10% de HP na defesa de cerco de todas as unidades',
  },
  '9c5d4006:node_29': {
    name: 'A Vida Corpo a Corpo Continua',
    buff: '-5% em batalhas de defesa de cerco, reduz o efeito letal',
  },
  'b57d6bf9:node_1': {
    name: 'Assalto de Lâmina - Infantaria',
    buff: '+10% de Poder de cerco da Infantaria',
  },
  'b57d6bf9:node_2': {
    name: 'Assalto de Lâmina - Cavalaria',
    buff: '+10% de Poder de cerco da Cavalaria',
  },
  'b57d6bf9:node_3': {
    name: 'Assalto de Lâmina - Arqueiros',
    buff: '+10% de Poder de cerco dos Arqueiros',
  },
  'b57d6bf9:node_4': {
    name: 'Incursão de Lâmina - Infantaria',
    buff: '+10% de Resistência de cerco da Infantaria',
  },
  'b57d6bf9:node_5': {
    name: 'Incursão de Lâmina - Cavalaria',
    buff: '+10% de Resistência de cerco da Cavalaria',
  },
  'b57d6bf9:node_6': {
    name: 'Incursão de Lâmina - Arqueiros',
    buff: '+10% de Resistência de cerco dos Arqueiros',
  },
  'b57d6bf9:node_7': {
    name: 'Guarda da Corte',
    buff: '+5% de Poder tático de todas as unidades',
  },
  'b57d6bf9:node_8': {
    name: 'Muralha de Ferro - Legião de Classe',
    buff: '+10% de Resistência de todas as unidades na Legião de Classe',
  },
  'b57d6bf9:node_9': {
    name: 'Muralha de Ferro - Legião 1',
    buff: '+10% de Resistência de todas as unidades na Legião 1',
  },
  'b57d6bf9:node_10': {
    name: 'Muralha de Ferro - Legião 2',
    buff: '+10% de Resistência de todas as unidades na Legião 2',
  },
  'b57d6bf9:node_11': {
    name: 'Muralha de Ferro - Legião 3',
    buff: '+10% de Resistência de todas as unidades na Legião 3',
  },
  'b57d6bf9:node_12': {
    name: 'Táticas Equilibradas',
    buff: '+5% de Poder e Resistência das tropas',
  },
  'b57d6bf9:node_13': {
    name: 'Assalto - Legião de Classe',
    buff: '+10% de Poder de todas as unidades na Legião de Classe',
  },
  'b57d6bf9:node_14': {
    name: 'Assalto - Legião 1',
    buff: '+10% de Poder de todas as unidades na Legião 1',
  },
  'b57d6bf9:node_15': {
    name: 'Assalto - Legião 2',
    buff: '+10% de Poder de todas as unidades na Legião 2',
  },
  'b57d6bf9:node_16': {
    name: 'Assalto - Legião 3',
    buff: '+10% de Poder de todas as unidades na Legião 3',
  },
  'b57d6bf9:node_17': {
    name: 'Blindagem de Vanguarda',
    buff: '+5% de Resistência tática de todas as unidades',
  },
  'b57d6bf9:node_18': {
    name: 'Vanguarda de Armadura Pesada',
    buff: '+5% de Resistência de cerco de todas as unidades',
  },
  'b57d6bf9:node_19': {
    name: 'Maestria de Habilidade de Batalha - Infantaria',
    buff: '+10% de Poder de habilidade da Infantaria',
  },
  'b57d6bf9:node_20': {
    name: 'Maestria de Habilidade de Batalha - Cavalaria',
    buff: '+10% de Poder de habilidade da Cavalaria',
  },
  'b57d6bf9:node_21': {
    name: 'Maestria de Habilidade de Batalha - Arqueiros',
    buff: '+10% de Poder de habilidade dos Arqueiros',
  },
  'b57d6bf9:node_22': {
    name: 'Resistência de Habilidade de Batalha - Infantaria',
    buff: '+10% de Resistência de habilidade da Infantaria',
  },
  'b57d6bf9:node_23': {
    name: 'Resistência de Habilidade de Batalha - Cavalaria',
    buff: '+10% de Resistência de habilidade da Cavalaria',
  },
  'b57d6bf9:node_24': {
    name: 'Resistência de Habilidade de Batalha - Arqueiros',
    buff: '+10% de Resistência de habilidade dos Arqueiros',
  },
  'b57d6bf9:node_25': {
    name: 'Espírito de Vanguarda - Infantaria',
    buff: '+5% de aumento de HP da Infantaria',
  },
  'b57d6bf9:node_26': {
    name: 'Espírito de Vanguarda - Cavalaria',
    buff: '+5% de aumento de HP da Cavalaria',
  },
  'b57d6bf9:node_27': {
    name: 'Espírito de Vanguarda - Arqueiros',
    buff: '+5% de aumento de HP dos Arqueiros',
  },
  'b57d6bf9:node_28': {
    name: 'Avanço Total',
    buff: '+5% de Poder de cerco de todos os soldados',
  },
  'b57d6bf9:node_29': {
    name: 'Maestria de Formação',
    buff: '+5% de HP do atacante de cerco',
  },
  'b57d6bf9:node_30': {
    name: 'Investida Blindada',
    buff: '+5% de Dano causado',
  },
});

export default Object.freeze({ trees, nodes });
