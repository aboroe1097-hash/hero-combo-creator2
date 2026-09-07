/**
 * Screenshot-backed game layouts for the research renderer.
 *
 * Node IDs stay aligned with tech-db.js so saved progress remains stable even
 * when multiple nodes share the same in-game display name. Sections are scroll
 * and jump groups inside one continuous graph; they are not separate trees.
 */
export const RESEARCH_GAME_LAYOUTS = Object.freeze({
  b2691f74: {
    theme: 'green',
    sections: [
      {
        id: 'production',
        labelKey: 'researchSectionProduction',
        rows: [
          { nodes: ['node_1', 'node_2'], columns: [1, 3] },
          { nodes: ['node_3', 'node_4'], columns: [1, 3] },
          { nodes: ['node_5', 'node_6'], columns: [1, 3] },
          { nodes: ['node_7'], columns: [2] },
        ],
      },
      {
        id: 'gathering',
        labelKey: 'researchSectionGatheringConstruction',
        rows: [
          { nodes: ['node_8', 'node_9'], columns: [1, 3] },
          { nodes: ['node_10', 'node_11'], columns: [1, 3] },
          { nodes: ['node_12'], columns: [2] },
          { nodes: ['node_13'], columns: [2] },
          { nodes: ['node_14'], columns: [2] },
        ],
      },
    ],
  },

  '375d1626': {
    theme: 'crimson',
    sections: [
      {
        id: 'marauder-foundation',
        labelKey: 'researchSectionMarauderFoundation',
        rows: [
          { nodes: ['node_1'], columns: [2] },
          { nodes: ['node_2', 'node_3', 'node_4'], columns: [1, 2, 3] },
          { nodes: ['node_5'], columns: [2] },
          { nodes: ['node_6', 'node_7'], columns: [1, 3] },
        ],
      },
      {
        id: 'advanced-marauders',
        labelKey: 'researchSectionAdvancedMarauders',
        rows: [
          { nodes: ['node_8', 'node_9', 'node_10'], columns: [1, 2, 3] },
          { nodes: ['node_11'], columns: [2] },
          { nodes: ['node_12', 'node_13'], columns: [1, 3] },
          { nodes: ['node_14'], columns: [2] },
        ],
      },
      {
        id: 'databaseContinuation',
        labelKey: 'researchSectionDatabaseContinuation',
        rows: [{ nodes: ['node_15', 'node_16'], columns: [1, 3] }],
      },
    ],
    edges: [
      ['node_6', 'node_8'],
      ['node_6', 'node_9'],
      ['node_6', 'node_10'],
      ['node_7', 'node_8'],
      ['node_7', 'node_9'],
      ['node_7', 'node_10'],
    ],
  },

  '38d12254': {
    theme: 'amber',
    sections: [
      {
        id: 'front-row',
        labelKey: 'researchSectionFrontRow',
        rows: [
          { nodes: ['node_1'], columns: [2] },
          { nodes: ['node_2', 'node_3'], columns: [1, 3] },
          { nodes: ['node_4', 'node_5', 'node_6'], columns: [1, 2, 3] },
          { nodes: ['node_7'], columns: [2] },
        ],
      },
      {
        id: 'command',
        labelKey: 'researchSectionLegionCommand',
        rows: [
          { nodes: ['node_8'], columns: [2] },
          { nodes: ['node_9'], columns: [2] },
          { nodes: ['node_10', 'node_11'], columns: [1, 3] },
          { nodes: ['node_12', 'node_13', 'node_14'], columns: [1, 2, 3] },
          { nodes: ['node_15'], columns: [2] },
        ],
      },
    ],
    edges: [
      ['node_2', 'node_4'],
      ['node_2', 'node_5'],
      ['node_2', 'node_6'],
      ['node_3', 'node_4'],
      ['node_3', 'node_5'],
      ['node_3', 'node_6'],
      ['node_10', 'node_12'],
      ['node_10', 'node_13'],
      ['node_10', 'node_14'],
      ['node_11', 'node_12'],
      ['node_11', 'node_13'],
      ['node_11', 'node_14'],
    ],
  },

  f915a84b: {
    theme: 'amber',
    sections: [
      {
        id: 'recruitment',
        labelKey: 'researchSectionRecruitment',
        rows: [
          { nodes: ['node_1', 'node_2', 'node_3'], columns: [1, 2, 3] },
          { nodes: ['node_4'], columns: [2] },
          { nodes: ['node_5', 'node_6', 'node_7'], columns: [1, 2, 3] },
          { nodes: ['node_8'], columns: [2] },
          { nodes: ['node_9', 'node_10', 'node_11'], columns: [1, 2, 3] },
          { nodes: ['node_12'], columns: [2] },
        ],
      },
    ],
  },

  f0595b07: {
    theme: 'amber',
    sections: [
      {
        id: 'rewards',
        labelKey: 'researchSectionZoneRewards',
        rows: [
          { nodes: ['node_1', 'node_2'], columns: [1, 3] },
          { nodes: ['node_3'], columns: [2] },
          { nodes: ['node_4'], columns: [2] },
          { nodes: ['node_5', 'node_6'], columns: [1, 3] },
          { nodes: ['node_7', 'node_8'], columns: [1, 3] },
          { nodes: ['node_9'], columns: [2] },
        ],
      },
      {
        id: 'incentives',
        labelKey: 'researchSectionIncentives',
        rows: [
          { nodes: ['node_10', 'node_11'], columns: [1, 3] },
          { nodes: ['node_12', 'node_13'], columns: [1, 3] },
          { nodes: ['node_14', 'node_15'], columns: [1, 3] },
          { nodes: ['node_16', 'node_17'], columns: [1, 3] },
          { nodes: ['node_18'], columns: [2] },
          { nodes: ['node_19'], columns: [2] },
        ],
      },
    ],
  },

  '4a932eb0': {
    theme: 'amber',
    sections: [
      {
        id: 'material-slots',
        labelKey: 'researchSectionMaterialSlots',
        rows: [
          { nodes: ['node_1'], columns: [2] },
          { nodes: ['node_2', 'node_3'], columns: [1, 3] },
          { nodes: ['node_4'], columns: [2] },
          { nodes: ['node_5', 'node_6'], columns: [1, 3] },
          { nodes: ['node_7'], columns: [2] },
        ],
      },
      {
        id: 'crafting-workshops',
        labelKey: 'researchSectionCraftingWorkshops',
        rows: [
          { nodes: ['node_8', 'node_9'], columns: [1, 3] },
          { nodes: ['node_10', 'node_11'], columns: [1, 3] },
          { nodes: ['node_12', 'node_13'], columns: [1, 3] },
          { nodes: ['node_14'], columns: [2] },
          { nodes: ['node_15', 'node_16'], columns: [1, 3] },
          { nodes: ['node_17'], columns: [2] },
        ],
      },
      {
        id: 'furnaces-and-salvage',
        labelKey: 'researchSectionFurnacesSalvage',
        rows: [
          { nodes: ['node_18', 'node_19'], columns: [1, 3] },
          { nodes: ['node_20', 'node_21'], columns: [1, 3] },
          { nodes: ['node_22', 'node_23'], columns: [1, 3] },
          { nodes: ['node_24'], columns: [2] },
          { nodes: ['node_25'], columns: [2] },
          { nodes: ['node_26'], columns: [2] },
          { nodes: ['node_27', 'node_28'], columns: [1, 3] },
        ],
      },
    ],
  },

  zone_conflict: {
    theme: 'crimson',
    sections: [
      {
        id: 'zone-defense',
        labelKey: 'researchSectionZoneDefense',
        rows: [
          { nodes: ['node_1'], columns: [2] },
          { nodes: ['node_2', 'node_3'], columns: [1, 3] },
          { nodes: ['node_4', 'node_5'], columns: [1, 3] },
          { nodes: ['node_6', 'node_7'], columns: [1, 3] },
          { nodes: ['node_8'], columns: [2] },
          { nodes: ['node_9', 'node_10'], columns: [1, 3] },
          { nodes: ['node_11', 'node_12'], columns: [1, 3] },
          { nodes: ['node_13'], columns: [2] },
        ],
      },
      {
        id: 'databaseContinuation',
        labelKey: 'researchSectionDatabaseContinuation',
        rows: [{ nodes: ['node_14', 'node_15'], columns: [1, 3] }],
      },
    ],
  },

  '2c49bd2a': {
    theme: 'amber',
    sections: [
      {
        id: 'siege-attack',
        labelKey: 'researchSectionSiegeAttack',
        rows: [
          { nodes: ['node_1'], columns: [2] },
          { nodes: ['node_2', 'node_3', 'node_4'], columns: [1, 2, 3] },
          { nodes: ['node_5', 'node_6', 'node_7'], columns: [1, 2, 3] },
          { nodes: ['node_8'], columns: [2] },
        ],
      },
      {
        id: 'siege-defense',
        labelKey: 'researchSectionSiegeDefense',
        rows: [
          { nodes: ['node_9', 'node_10', 'node_11'], columns: [1, 2, 3] },
          { nodes: ['node_12', 'node_13', 'node_14'], columns: [1, 2, 3] },
          { nodes: ['node_15'], columns: [2] },
          { nodes: ['node_16', 'node_17', 'node_18'], columns: [1, 2, 3] },
        ],
      },
      {
        id: 'field-battle',
        labelKey: 'researchSectionFieldBattle',
        rows: [
          { nodes: ['node_19', 'node_20', 'node_21'], columns: [1, 2, 3] },
          { nodes: ['node_22'], columns: [2] },
        ],
      },
      {
        id: 'unit-power',
        labelKey: 'researchSectionUnitPower',
        rows: [
          { nodes: ['node_23', 'node_24'], columns: [1, 3] },
          { nodes: ['node_25', 'node_26'], columns: [1, 3] },
          { nodes: ['node_27', 'node_28'], columns: [1, 3] },
          { nodes: ['node_29'], columns: [2] },
        ],
      },
      {
        id: 'quick-training',
        labelKey: 'researchSectionQuickTraining',
        rows: [
          { nodes: ['node_30', 'node_31', 'node_32'], columns: [1, 2, 3] },
          { nodes: ['node_33', 'node_34', 'node_35'], columns: [1, 2, 3] },
          { nodes: ['node_36', 'node_37', 'node_38'], columns: [1, 2, 3] },
          { nodes: ['node_39'], columns: [2] },
        ],
      },
      {
        id: 'advanced',
        labelKey: 'researchSectionAdvanced',
        rows: [
          { nodes: ['node_40', 'node_41', 'node_42'], columns: [1, 2, 3] },
          { nodes: ['node_43', 'node_44', 'node_45'], columns: [1, 2, 3] },
        ],
      },
    ],
  },

  art_of_war_command: {
    theme: 'amber',
    sections: [
      {
        id: 'foundation',
        labelKey: 'researchSectionFoundation',
        rows: [
          { nodes: ['node_1', 'node_2', 'node_3'], columns: [1, 2, 3] },
          { nodes: ['node_4', 'node_5', 'node_6'], columns: [1, 2, 3] },
          { nodes: ['node_7'], columns: [2] },
          { nodes: ['node_8', 'node_9', 'node_10'], columns: [1, 2, 3] },
          { nodes: ['node_11', 'node_12', 'node_13'], columns: [1, 2, 3] },
          { nodes: ['node_14'], columns: [2] },
          { nodes: ['node_15', 'node_16', 'node_17'], columns: [1, 2, 3] },
        ],
      },
      {
        id: 'advanced-command',
        labelKey: 'researchSectionAdvancedCommand',
        rows: [
          { nodes: ['node_18', 'node_19', 'node_20'], columns: [1, 2, 3] },
          { nodes: ['node_21'], columns: [2] },
          { nodes: ['node_22', 'node_23', 'node_24'], columns: [1, 2, 3] },
          { nodes: ['node_25', 'node_26', 'node_27'], columns: [1, 2, 3] },
          { nodes: ['node_28', 'node_29', 'node_30'], columns: [1, 2, 3] },
          { nodes: ['node_31'], columns: [2] },
        ],
      },
      {
        id: 'siege-orders',
        labelKey: 'researchSectionSiegeOrders',
        rows: [
          { nodes: ['node_32', 'node_33', 'node_34'], columns: [1, 2, 3] },
          { nodes: ['node_35', 'node_36', 'node_37'], columns: [1, 2, 3] },
          { nodes: ['node_38'], columns: [2] },
        ],
      },
    ],
  },

  '24ffc526': {
    theme: 'amber',
    sections: [
      {
        id: 'front-line',
        labelKey: 'researchSectionFrontLine',
        rows: [
          { nodes: ['node_5', 'node_1', 'node_3'], columns: [1, 2, 3] },
          { nodes: ['node_6', 'node_2', 'node_4'], columns: [1, 2, 3] },
          { nodes: ['node_7'], columns: [2] },
          { nodes: ['node_8', 'node_9'], columns: [1, 3] },
          { nodes: ['node_10'], columns: [2] },
          { nodes: ['node_13', 'node_11', 'node_12'], columns: [1, 2, 3] },
          { nodes: ['node_16', 'node_14', 'node_15'], columns: [1, 2, 3] },
          { nodes: ['node_17'], columns: [2] },
        ],
      },
      {
        id: 'rear-line',
        labelKey: 'researchSectionRearLine',
        rows: [
          { nodes: ['node_20', 'node_18', 'node_19'], columns: [1, 2, 3] },
          { nodes: ['node_23', 'node_21', 'node_22'], columns: [1, 2, 3] },
          { nodes: ['node_24'], columns: [2] },
          { nodes: ['node_27', 'node_26', 'node_25'], columns: [1, 2, 3] },
          { nodes: ['node_30', 'node_28', 'node_29'], columns: [1, 2, 3] },
          { nodes: ['node_31'], columns: [2] },
          { nodes: ['node_32', 'node_33'], columns: [1, 3] },
          { nodes: ['node_34'], columns: [2] },
        ],
      },
    ],
  },

  '2b149bcb': {
    theme: 'amber',
    sections: [
      {
        id: 'guard-rally-one',
        labelKey: 'researchSectionGuardRallyI',
        rows: [
          { nodes: ['node_1', 'node_2', 'node_3'], columns: [1, 2, 3] },
          { nodes: ['node_4', 'node_5', 'node_6'], columns: [1, 2, 3] },
          { nodes: ['node_7'], columns: [2] },
          { nodes: ['node_8', 'node_9', 'node_10'], columns: [1, 2, 3] },
          { nodes: ['node_11', 'node_12', 'node_13'], columns: [1, 2, 3] },
          { nodes: ['node_14', 'node_15', 'node_16'], columns: [1, 2, 3] },
          { nodes: ['node_17'], columns: [2] },
        ],
      },
      {
        id: 'databaseContinuation',
        labelKey: 'researchSectionDatabaseContinuation',
        rows: [{ nodes: ['node_18', 'node_19', 'node_20'], columns: [1, 2, 3] }],
      },
      {
        id: 'guard-rally-two',
        labelKey: 'researchSectionGuardRallyII',
        rows: [
          { nodes: ['node_21'], columns: [2] },
          { nodes: ['node_22', 'node_23', 'node_24'], columns: [1, 2, 3] },
          { nodes: ['node_25', 'node_26', 'node_27'], columns: [1, 2, 3] },
          { nodes: ['node_28', 'node_29', 'node_30'], columns: [1, 2, 3] },
          { nodes: ['node_31'], columns: [2] },
        ],
      },
      {
        id: 'guard-rally-three',
        labelKey: 'researchSectionGuardRallyIII',
        rows: [
          { nodes: ['node_32', 'node_33', 'node_34'], columns: [1, 2, 3] },
          { nodes: ['node_35', 'node_36', 'node_37'], columns: [1, 2, 3] },
          { nodes: ['node_38'], columns: [2] },
        ],
      },
    ],
  },

  '1a6ec06e': {
    theme: 'amber',
    sections: [
      {
        id: 'destruction',
        labelKey: 'researchSectionDestruction',
        rows: [
          { nodes: ['node_1'], columns: [2] },
          { nodes: ['node_2', 'node_3', 'node_4'], columns: [1, 2, 3] },
          { nodes: ['node_5'], columns: [2] },
          { nodes: ['node_6', 'node_7', 'node_8'], columns: [1, 2, 3] },
          { nodes: ['node_9', 'node_10', 'node_11'], columns: [1, 2, 3] },
          { nodes: ['node_12'], columns: [2] },
        ],
      },
      {
        id: 'siege-combat',
        labelKey: 'researchSectionSiegeCombat',
        rows: [
          { nodes: ['node_13', 'node_14', 'node_15'], columns: [1, 2, 3] },
          { nodes: ['node_16'], columns: [2] },
          { nodes: ['node_17', 'node_18'], columns: [1, 3] },
          { nodes: ['node_19'], columns: [2] },
          { nodes: ['node_20', 'node_21', 'node_22'], columns: [1, 2, 3] },
          { nodes: ['node_23', 'node_24', 'node_25'], columns: [1, 2, 3] },
          { nodes: ['node_26'], columns: [2] },
        ],
      },
      {
        id: 'mark-and-capture',
        labelKey: 'researchSectionMarkCapture',
        rows: [
          { nodes: ['node_27', 'node_28'], columns: [1, 3] },
          { nodes: ['node_29'], columns: [2] },
          { nodes: ['node_30'], columns: [2] },
          { nodes: ['node_31', 'node_32', 'node_33'], columns: [1, 2, 3] },
          { nodes: ['node_34'], columns: [2] },
          { nodes: ['node_35', 'node_36', 'node_37'], columns: [1, 2, 3] },
          { nodes: ['node_38', 'node_39', 'node_40'], columns: [1, 2, 3] },
          { nodes: ['node_41', 'node_42', 'node_43'], columns: [1, 2, 3] },
          { nodes: ['node_44'], columns: [2] },
        ],
      },
    ],
  },

  footmen_training: {
    theme: 'amber',
    sections: [
      {
        id: 'shield-mastery',
        labelKey: 'researchSectionShieldMastery',
        rows: [
          { nodes: ['node_1', 'node_2'], columns: [1, 3] },
          { nodes: ['node_3'], columns: [2] },
          { nodes: ['node_4', 'node_5'], columns: [1, 3] },
          { nodes: ['node_6'], columns: [2] },
        ],
      },
      {
        id: 'footmen-enhancement',
        labelKey: 'researchSectionFootmenEnhancement',
        rows: [
          { nodes: ['node_7', 'node_8'], columns: [1, 3] },
          { nodes: ['node_9'], columns: [2] },
          { nodes: ['node_10', 'node_11'], columns: [1, 3] },
          { nodes: ['node_12'], columns: [2] },
          { nodes: ['node_13'], columns: [2] },
          { nodes: ['node_14', 'node_15'], columns: [1, 3] },
          { nodes: ['node_16'], columns: [2] },
        ],
      },
    ],
  },

  cavalry_training: {
    theme: 'amber',
    sections: [
      {
        id: 'databaseContinuation',
        labelKey: 'researchSectionDatabaseContinuation',
        rows: [
          { nodes: ['node_1', 'node_2'], columns: [1, 3] },
          { nodes: ['node_3'], columns: [2] },
          { nodes: ['node_4', 'node_5'], columns: [1, 3] },
          { nodes: ['node_6'], columns: [2] },
          { nodes: ['node_7', 'node_8'], columns: [1, 3] },
          { nodes: ['node_9'], columns: [2] },
          { nodes: ['node_10', 'node_11'], columns: [1, 3] },
        ],
      },
      {
        id: 'cavalry-promotion',
        labelKey: 'researchSectionCavalryPromotion',
        rows: [
          { nodes: ['node_12'], columns: [2] },
          { nodes: ['node_13'], columns: [2] },
          { nodes: ['node_14', 'node_15'], columns: [1, 3] },
          { nodes: ['node_16'], columns: [2] },
        ],
      },
    ],
  },

  archers_training: {
    theme: 'amber',
    sections: [
      {
        id: 'aim-and-defense',
        labelKey: 'researchSectionAimDefense',
        rows: [
          { nodes: ['node_1', 'node_2'], columns: [1, 3] },
          { nodes: ['node_3'], columns: [2] },
          { nodes: ['node_4', 'node_5'], columns: [1, 3] },
          { nodes: ['node_6'], columns: [2] },
        ],
      },
      {
        id: 'archer-enhancement',
        labelKey: 'researchSectionArcherEnhancement',
        rows: [
          { nodes: ['node_7', 'node_8'], columns: [1, 3] },
          { nodes: ['node_9'], columns: [2] },
          { nodes: ['node_10', 'node_11'], columns: [1, 3] },
          { nodes: ['node_12'], columns: [2] },
          { nodes: ['node_13'], columns: [2] },
          { nodes: ['node_14', 'node_15'], columns: [1, 3] },
          { nodes: ['node_16'], columns: [2] },
        ],
      },
    ],
  },

  '9c5d4006': {
    theme: 'crimson',
    sections: [
      {
        id: 'melee-defense-main',
        labelKey: 'researchSectionSiegeDefense',
        rows: [
          { nodes: ['node_1', 'node_2', 'node_3'], columns: [1, 2, 3] },
          { nodes: ['node_4', 'node_5', 'node_6'], columns: [1, 2, 3] },
          { nodes: ['node_7'], columns: [2] },
          { nodes: ['node_8', 'node_9'], columns: [1, 3] },
          { nodes: ['node_10', 'node_11'], columns: [1, 3] },
          { nodes: ['node_12'], columns: [2] },
          { nodes: ['node_13'], columns: [2] },
          { nodes: ['node_14'], columns: [2] },
          { nodes: ['node_15'], columns: [2] },
          { nodes: ['node_16', 'node_17'], columns: [1, 3] },
          { nodes: ['node_18', 'node_19'], columns: [1, 3] },
          { nodes: ['node_20'], columns: [2] },
          { nodes: ['node_21'], columns: [2] },
          { nodes: ['node_22', 'node_23', 'node_24'], columns: [1, 2, 3] },
          { nodes: ['node_25', 'node_26', 'node_27'], columns: [1, 2, 3] },
          { nodes: ['node_28'], columns: [2] },
          { nodes: ['node_29'], columns: [2] },
        ],
      },
    ],
  },
});
