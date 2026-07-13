/**
 * Exact in-game Research art references captured from owner-supplied screenshots.
 *
 * The JPEG source pixels are intentionally left untouched. Each node maps by its
 * stable tree/node ids to a clean upper pictogram window inside a 573 x 1280
 * source capture. Runtime consumers should use the rect as a background-image
 * window; they must not infer assets from translated names or buff text.
 */

const SOURCE_ROOT = 'assets/research/sources/';
const SOURCE_DIMENSIONS = Object.freeze([573, 1280]);
const PANEL_WIDTH = 82;
const PANEL_HEIGHT = 61;
const PANEL_X = Object.freeze({ left: 103, center: 246, right: 390 });

function nodeArt(source, column, panelTop, palette, observedState, observedLevel = null, options = {}) {
    return Object.freeze({
        source: `${SOURCE_ROOT}${source}`,
        sourceDimensions: SOURCE_DIMENSIONS,
        rect: Object.freeze([PANEL_X[column], panelTop + 4, PANEL_WIDTH, PANEL_HEIGHT]),
        palette,
        observedState,
        observedLevel,
        contamination: options.contamination || 'none',
        confidence: options.confidence || 'high',
        maxCssPx: options.maxCssPx || 64,
    });
}

// [treeId, nodeId, source, column, panelTop, palette, state, observedLevel]
// Repeated English names are deliberately represented by their distinct node ids.
const ART_ROWS = [
    // Town Development — complete, green MAX state.
    ['b2691f74', 'node_1', 'town-development-01.jpg', 'left', 193, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_2', 'town-development-01.jpg', 'right', 193, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_3', 'town-development-01.jpg', 'left', 444, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_4', 'town-development-01.jpg', 'right', 444, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_5', 'town-development-01.jpg', 'left', 694, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_6', 'town-development-01.jpg', 'right', 695, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_7', 'town-development-01.jpg', 'center', 945, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_8', 'town-development-02.jpg', 'left', 227, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_9', 'town-development-02.jpg', 'right', 227, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_10', 'town-development-02.jpg', 'left', 477, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_11', 'town-development-02.jpg', 'right', 477, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_12', 'town-development-02.jpg', 'center', 729, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_13', 'town-development-02.jpg', 'center', 979, 'green', 'max', 'MAX'],
    ['b2691f74', 'node_14', 'town-development-03.jpg', 'center', 980, 'green', 'max', 'MAX'],

    // Basic Combat — Advance Rebel/Empire Defender are below the supplied view.
    ['375d1626', 'node_1', 'basic-combat-01.jpg', 'center', 193, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_2', 'basic-combat-01.jpg', 'left', 444, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_4', 'basic-combat-01.jpg', 'right', 444, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_5', 'basic-combat-01.jpg', 'center', 694, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_6', 'basic-combat-01.jpg', 'left', 945, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_7', 'basic-combat-01.jpg', 'right', 945, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_8', 'basic-combat-02.jpg', 'left', 209, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_9', 'basic-combat-02.jpg', 'center', 209, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_10', 'basic-combat-02.jpg', 'right', 209, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_11', 'basic-combat-02.jpg', 'center', 460, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_12', 'basic-combat-02.jpg', 'left', 710, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_13', 'basic-combat-02.jpg', 'right', 710, 'crimson', 'max', 'MAX'],
    ['375d1626', 'node_14', 'basic-combat-02.jpg', 'center', 961, 'crimson', 'max', 'MAX'],

    // Research Legion II — complete, amber MAX state.
    ['38d12254', 'node_1', 'research-legion-ii-01.jpg', 'center', 193, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_2', 'research-legion-ii-01.jpg', 'left', 444, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_3', 'research-legion-ii-01.jpg', 'right', 444, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_4', 'research-legion-ii-01.jpg', 'left', 694, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_5', 'research-legion-ii-01.jpg', 'center', 694, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_6', 'research-legion-ii-01.jpg', 'right', 694, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_7', 'research-legion-ii-01.jpg', 'center', 945, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_8', 'research-legion-ii-02.jpg', 'center', 191, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_9', 'research-legion-ii-02.jpg', 'center', 441, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_10', 'research-legion-ii-02.jpg', 'left', 692, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_11', 'research-legion-ii-02.jpg', 'right', 692, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_12', 'research-legion-ii-02.jpg', 'left', 943, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_13', 'research-legion-ii-02.jpg', 'center', 943, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_14', 'research-legion-ii-02.jpg', 'right', 943, 'amber', 'max', 'MAX'],
    ['38d12254', 'node_15', 'research-legion-ii-03.jpg', 'center', 980, 'amber', 'max', 'MAX'],

    // Basic Military — complete, amber MAX state.
    ['f915a84b', 'node_1', 'basic-military-01.jpg', 'left', 193, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_2', 'basic-military-01.jpg', 'center', 193, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_3', 'basic-military-01.jpg', 'right', 193, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_4', 'basic-military-01.jpg', 'center', 444, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_5', 'basic-military-01.jpg', 'left', 694, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_6', 'basic-military-01.jpg', 'center', 694, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_7', 'basic-military-01.jpg', 'right', 694, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_8', 'basic-military-01.jpg', 'center', 945, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_9', 'basic-military-02.jpg', 'left', 733, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_10', 'basic-military-02.jpg', 'center', 733, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_11', 'basic-military-02.jpg', 'right', 733, 'amber', 'max', 'MAX'],
    ['f915a84b', 'node_12', 'basic-military-02.jpg', 'center', 984, 'amber', 'max', 'MAX'],

    // Zone Commemoration — complete, amber MAX state.
    ['f0595b07', 'node_1', 'zone-commemoration-01.jpg', 'left', 193, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_2', 'zone-commemoration-01.jpg', 'right', 193, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_3', 'zone-commemoration-01.jpg', 'center', 444, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_4', 'zone-commemoration-01.jpg', 'center', 695, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_5', 'zone-commemoration-01.jpg', 'left', 945, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_6', 'zone-commemoration-01.jpg', 'right', 945, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_7', 'zone-commemoration-02.jpg', 'left', 199, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_8', 'zone-commemoration-02.jpg', 'right', 199, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_10', 'zone-commemoration-02.jpg', 'left', 700, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_11', 'zone-commemoration-02.jpg', 'right', 700, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_12', 'zone-commemoration-02.jpg', 'left', 951, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_13', 'zone-commemoration-02.jpg', 'right', 951, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_14', 'zone-commemoration-03.jpg', 'left', 227, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_15', 'zone-commemoration-03.jpg', 'right', 227, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_16', 'zone-commemoration-03.jpg', 'left', 478, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_17', 'zone-commemoration-03.jpg', 'right', 478, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_18', 'zone-commemoration-03.jpg', 'center', 728, 'amber', 'max', 'MAX'],
    ['f0595b07', 'node_19', 'zone-commemoration-03.jpg', 'center', 980, 'amber', 'max', 'MAX'],

    // Accessory Production — complete, amber MAX state.
    ['4a932eb0', 'node_1', 'accessory-production-01.jpg', 'center', 193, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_2', 'accessory-production-01.jpg', 'left', 444, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_3', 'accessory-production-01.jpg', 'right', 444, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_4', 'accessory-production-01.jpg', 'center', 695, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_5', 'accessory-production-01.jpg', 'left', 945, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_6', 'accessory-production-01.jpg', 'right', 945, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_7', 'accessory-production-02.jpg', 'center', 214, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_8', 'accessory-production-02.jpg', 'left', 465, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_9', 'accessory-production-02.jpg', 'right', 465, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_10', 'accessory-production-02.jpg', 'left', 716, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_11', 'accessory-production-02.jpg', 'right', 716, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_12', 'accessory-production-02.jpg', 'left', 966, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_13', 'accessory-production-02.jpg', 'right', 966, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_14', 'accessory-production-03.jpg', 'center', 225, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_15', 'accessory-production-03.jpg', 'left', 475, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_16', 'accessory-production-03.jpg', 'right', 476, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_17', 'accessory-production-03.jpg', 'center', 726, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_18', 'accessory-production-04.jpg', 'left', 189, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_19', 'accessory-production-04.jpg', 'right', 189, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_21', 'accessory-production-04.jpg', 'right', 440, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_22', 'accessory-production-04.jpg', 'left', 691, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_23', 'accessory-production-04.jpg', 'right', 691, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_24', 'accessory-production-04.jpg', 'center', 942, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_25', 'accessory-production-05.jpg', 'center', 478, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_26', 'accessory-production-05.jpg', 'center', 728, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_27', 'accessory-production-05.jpg', 'left', 980, 'amber', 'max', 'MAX'],
    ['4a932eb0', 'node_28', 'accessory-production-05.jpg', 'right', 980, 'amber', 'max', 'MAX'],

    // Zone Conflict — final Carbon Fiber Bones/Viral Spores row is not supplied.
    ['zone_conflict', 'node_1', 'zone-conflict-01.jpg', 'center', 193, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_2', 'zone-conflict-01.jpg', 'left', 444, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_3', 'zone-conflict-01.jpg', 'right', 444, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_4', 'zone-conflict-01.jpg', 'left', 694, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_5', 'zone-conflict-01.jpg', 'right', 694, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_6', 'zone-conflict-01.jpg', 'left', 945, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_7', 'zone-conflict-01.jpg', 'right', 945, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_8', 'zone-conflict-02.jpg', 'center', 207, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_9', 'zone-conflict-02.jpg', 'left', 457, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_10', 'zone-conflict-02.jpg', 'right', 457, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_11', 'zone-conflict-02.jpg', 'left', 708, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_12', 'zone-conflict-02.jpg', 'right', 708, 'crimson', 'max', 'MAX'],
    ['zone_conflict', 'node_13', 'zone-conflict-02.jpg', 'center', 959, 'crimson', 'max', 'MAX'],

    // Solid Tactics — all six pages represented; page 1 is partially active.
    ['2c49bd2a', 'node_1', 'solid-tactics-06.jpg', 'center', 192, 'amber', 'active', 12],
    ['2c49bd2a', 'node_3', 'solid-tactics-06.jpg', 'center', 444, 'amber', 'active', 4],
    ['2c49bd2a', 'node_4', 'solid-tactics-06.jpg', 'right', 444, 'amber', 'active', 1],
    ['2c49bd2a', 'node_5', 'solid-tactics-06.jpg', 'left', 695, 'amber', 'active', 0],
    ['2c49bd2a', 'node_6', 'solid-tactics-06.jpg', 'center', 695, 'amber', 'active', 3],
    ['2c49bd2a', 'node_7', 'solid-tactics-06.jpg', 'right', 695, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_9', 'solid-tactics-05.jpg', 'left', 202, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_10', 'solid-tactics-05.jpg', 'center', 202, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_11', 'solid-tactics-05.jpg', 'right', 202, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_14', 'solid-tactics-05.jpg', 'right', 452, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_15', 'solid-tactics-05.jpg', 'center', 703, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_16', 'solid-tactics-05.jpg', 'left', 954, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_17', 'solid-tactics-05.jpg', 'center', 954, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_18', 'solid-tactics-05.jpg', 'right', 954, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_19', 'solid-tactics-04.jpg', 'left', 199, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_20', 'solid-tactics-04.jpg', 'center', 199, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_21', 'solid-tactics-04.jpg', 'right', 199, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_22', 'solid-tactics-04.jpg', 'center', 450, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_24', 'solid-tactics-04.jpg', 'right', 700, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_25', 'solid-tactics-04.jpg', 'left', 951, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_26', 'solid-tactics-04.jpg', 'right', 951, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_27', 'solid-tactics-02.jpg', 'left', 196, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_28', 'solid-tactics-02.jpg', 'right', 196, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_29', 'solid-tactics-02.jpg', 'center', 447, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_30', 'solid-tactics-02.jpg', 'left', 697, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_31', 'solid-tactics-02.jpg', 'center', 697, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_32', 'solid-tactics-02.jpg', 'right', 697, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_33', 'solid-tactics-02.jpg', 'left', 948, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_34', 'solid-tactics-02.jpg', 'center', 948, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_35', 'solid-tactics-02.jpg', 'right', 948, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_36', 'solid-tactics-01.jpg', 'left', 239, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_37', 'solid-tactics-01.jpg', 'center', 239, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_38', 'solid-tactics-01.jpg', 'right', 239, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_39', 'solid-tactics-01.jpg', 'center', 490, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_43', 'solid-tactics-01.jpg', 'left', 991, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_44', 'solid-tactics-01.jpg', 'center', 991, 'gray', 'idle', 0],
    ['2c49bd2a', 'node_45', 'solid-tactics-01.jpg', 'right', 991, 'gray', 'idle', 0],

    // Art of War - Command — complete; page 1 mixes active and MAX.
    ['art_of_war_command', 'node_1', 'art-of-war-command-04.jpg', 'left', 193, 'amber', 'active', 9],
    ['art_of_war_command', 'node_2', 'art-of-war-command-04.jpg', 'center', 193, 'amber', 'max', 'MAX'],
    ['art_of_war_command', 'node_3', 'art-of-war-command-04.jpg', 'right', 193, 'amber', 'max', 'MAX'],
    ['art_of_war_command', 'node_5', 'art-of-war-command-04.jpg', 'center', 444, 'amber', 'active', 5],
    ['art_of_war_command', 'node_6', 'art-of-war-command-04.jpg', 'right', 444, 'amber', 'active', 5],
    ['art_of_war_command', 'node_7', 'art-of-war-command-04.jpg', 'center', 695, 'amber', 'active', 5],
    ['art_of_war_command', 'node_8', 'art-of-war-command-04.jpg', 'left', 945, 'amber', 'active', 0],
    ['art_of_war_command', 'node_9', 'art-of-war-command-04.jpg', 'center', 945, 'amber', 'active', 0],
    ['art_of_war_command', 'node_10', 'art-of-war-command-04.jpg', 'right', 945, 'amber', 'active', 0],
    ['art_of_war_command', 'node_11', 'art-of-war-command-01.jpg', 'left', 154, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_12', 'art-of-war-command-01.jpg', 'center', 154, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_13', 'art-of-war-command-01.jpg', 'right', 153, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_14', 'art-of-war-command-01.jpg', 'center', 405, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_16', 'art-of-war-command-01.jpg', 'center', 655, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_17', 'art-of-war-command-01.jpg', 'right', 655, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_18', 'art-of-war-command-01.jpg', 'left', 906, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_19', 'art-of-war-command-01.jpg', 'center', 906, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_20', 'art-of-war-command-01.jpg', 'right', 906, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_21', 'art-of-war-command-02.jpg', 'center', 230, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_23', 'art-of-war-command-02.jpg', 'center', 480, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_24', 'art-of-war-command-02.jpg', 'right', 480, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_25', 'art-of-war-command-02.jpg', 'left', 731, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_26', 'art-of-war-command-02.jpg', 'center', 731, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_27', 'art-of-war-command-02.jpg', 'right', 731, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_28', 'art-of-war-command-02.jpg', 'left', 982, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_29', 'art-of-war-command-02.jpg', 'center', 982, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_30', 'art-of-war-command-02.jpg', 'right', 982, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_32', 'art-of-war-command-03.jpg', 'left', 478, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_33', 'art-of-war-command-03.jpg', 'center', 478, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_34', 'art-of-war-command-03.jpg', 'right', 478, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_35', 'art-of-war-command-03.jpg', 'left', 729, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_36', 'art-of-war-command-03.jpg', 'center', 729, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_37', 'art-of-war-command-03.jpg', 'right', 729, 'gray', 'idle', 0],
    ['art_of_war_command', 'node_38', 'art-of-war-command-03.jpg', 'center', 980, 'gray', 'idle', 0],

    // Raider Legion — all supplied pages represented; page 1 mixes MAX/active.
    ['24ffc526', 'node_1', 'raider-legion-03.jpg', 'center', 193, 'amber', 'max', 'MAX'],
    ['24ffc526', 'node_2', 'raider-legion-03.jpg', 'center', 444, 'amber', 'max', 'MAX'],
    ['24ffc526', 'node_3', 'raider-legion-03.jpg', 'right', 193, 'amber', 'max', 'MAX'],
    ['24ffc526', 'node_4', 'raider-legion-03.jpg', 'right', 444, 'amber', 'max', 'MAX'],
    ['24ffc526', 'node_5', 'raider-legion-03.jpg', 'left', 193, 'amber', 'max', 'MAX'],
    ['24ffc526', 'node_6', 'raider-legion-03.jpg', 'left', 444, 'amber', 'max', 'MAX'],
    ['24ffc526', 'node_7', 'raider-legion-03.jpg', 'center', 695, 'amber', 'active', 9],
    ['24ffc526', 'node_8', 'raider-legion-03.jpg', 'left', 945, 'crimson', 'active', 0],
    ['24ffc526', 'node_9', 'raider-legion-03.jpg', 'right', 945, 'crimson', 'active', 0],
    ['24ffc526', 'node_10', 'raider-legion-04.jpg', 'center', 184, 'gray', 'idle', 0],
    ['24ffc526', 'node_13', 'raider-legion-04.jpg', 'left', 435, 'gray', 'idle', 0],
    ['24ffc526', 'node_14', 'raider-legion-04.jpg', 'center', 686, 'gray', 'idle', 0],
    ['24ffc526', 'node_15', 'raider-legion-04.jpg', 'right', 686, 'gray', 'idle', 0],
    ['24ffc526', 'node_17', 'raider-legion-04.jpg', 'center', 937, 'gray', 'idle', 0],
    ['24ffc526', 'node_18', 'raider-legion-01.jpg', 'center', 172, 'gray', 'idle', 0],
    ['24ffc526', 'node_19', 'raider-legion-01.jpg', 'right', 173, 'gray', 'idle', 0],
    ['24ffc526', 'node_20', 'raider-legion-01.jpg', 'left', 173, 'gray', 'idle', 0],
    ['24ffc526', 'node_21', 'raider-legion-01.jpg', 'center', 423, 'gray', 'idle', 0],
    ['24ffc526', 'node_23', 'raider-legion-01.jpg', 'left', 423, 'gray', 'idle', 0],
    ['24ffc526', 'node_24', 'raider-legion-01.jpg', 'center', 674, 'gray', 'idle', 0],
    ['24ffc526', 'node_25', 'raider-legion-01.jpg', 'right', 925, 'gray', 'idle', 0],
    ['24ffc526', 'node_26', 'raider-legion-01.jpg', 'center', 925, 'gray', 'idle', 0],
    ['24ffc526', 'node_27', 'raider-legion-01.jpg', 'left', 925, 'gray', 'idle', 0],
    ['24ffc526', 'node_28', 'raider-legion-02.jpg', 'center', 278, 'gray', 'idle', 0],
    ['24ffc526', 'node_29', 'raider-legion-02.jpg', 'right', 278, 'gray', 'idle', 0],
    ['24ffc526', 'node_30', 'raider-legion-02.jpg', 'left', 278, 'gray', 'idle', 0],
    ['24ffc526', 'node_31', 'raider-legion-02.jpg', 'center', 528, 'gray', 'idle', 0],
    ['24ffc526', 'node_32', 'raider-legion-02.jpg', 'left', 779, 'gray', 'idle', 0],
    ['24ffc526', 'node_33', 'raider-legion-02.jpg', 'right', 779, 'gray', 'idle', 0],
    ['24ffc526', 'node_34', 'raider-legion-02.jpg', 'center', 1030, 'gray', 'idle', 0],

    // Guard Rally — complete; page 1 mixes active/MAX, pages 2/3 are idle.
    ['2b149bcb', 'node_1', 'guard-rally-04.jpg', 'left', 193, 'amber', 'max', 'MAX'],
    ['2b149bcb', 'node_2', 'guard-rally-04.jpg', 'center', 193, 'amber', 'max', 'MAX'],
    ['2b149bcb', 'node_3', 'guard-rally-04.jpg', 'right', 193, 'amber', 'max', 'MAX'],
    ['2b149bcb', 'node_5', 'guard-rally-04.jpg', 'center', 444, 'amber', 'max', 'MAX'],
    ['2b149bcb', 'node_6', 'guard-rally-04.jpg', 'right', 444, 'amber', 'max', 'MAX'],
    ['2b149bcb', 'node_7', 'guard-rally-04.jpg', 'center', 695, 'amber', 'max', 'MAX'],
    ['2b149bcb', 'node_8', 'guard-rally-03.jpg', 'left', 254, 'amber', 'active', 1],
    ['2b149bcb', 'node_9', 'guard-rally-03.jpg', 'center', 254, 'amber', 'max', 'MAX'],
    ['2b149bcb', 'node_10', 'guard-rally-03.jpg', 'right', 254, 'amber', 'active', 0],
    ['2b149bcb', 'node_12', 'guard-rally-03.jpg', 'center', 505, 'amber', 'max', 'MAX'],
    ['2b149bcb', 'node_13', 'guard-rally-03.jpg', 'right', 505, 'gray', 'idle', 0],
    ['2b149bcb', 'node_14', 'guard-rally-03.jpg', 'left', 756, 'gray', 'idle', 0],
    ['2b149bcb', 'node_15', 'guard-rally-03.jpg', 'center', 756, 'amber', 'active', 6],
    ['2b149bcb', 'node_16', 'guard-rally-03.jpg', 'right', 756, 'gray', 'idle', 0],
    ['2b149bcb', 'node_17', 'guard-rally-03.jpg', 'center', 1007, 'gray', 'idle', 0],
    ['2b149bcb', 'node_21', 'guard-rally-02.jpg', 'center', 232, 'gray', 'idle', 0],
    ['2b149bcb', 'node_22', 'guard-rally-02.jpg', 'left', 482, 'gray', 'idle', 0],
    ['2b149bcb', 'node_23', 'guard-rally-02.jpg', 'center', 482, 'gray', 'idle', 0],
    ['2b149bcb', 'node_24', 'guard-rally-02.jpg', 'right', 482, 'gray', 'idle', 0],
    ['2b149bcb', 'node_25', 'guard-rally-02.jpg', 'left', 733, 'gray', 'idle', 0],
    ['2b149bcb', 'node_26', 'guard-rally-02.jpg', 'center', 733, 'gray', 'idle', 0],
    ['2b149bcb', 'node_27', 'guard-rally-02.jpg', 'right', 733, 'gray', 'idle', 0],
    ['2b149bcb', 'node_28', 'guard-rally-02.jpg', 'left', 984, 'gray', 'idle', 0],
    ['2b149bcb', 'node_29', 'guard-rally-02.jpg', 'center', 984, 'gray', 'idle', 0],
    ['2b149bcb', 'node_30', 'guard-rally-02.jpg', 'right', 984, 'gray', 'idle', 0],
    ['2b149bcb', 'node_31', 'guard-rally-01.jpg', 'center', 227, 'gray', 'idle', 0],
    ['2b149bcb', 'node_33', 'guard-rally-01.jpg', 'center', 478, 'gray', 'idle', 0],
    ['2b149bcb', 'node_34', 'guard-rally-01.jpg', 'right', 478, 'gray', 'idle', 0],
    ['2b149bcb', 'node_35', 'guard-rally-01.jpg', 'left', 729, 'gray', 'idle', 0],
    ['2b149bcb', 'node_36', 'guard-rally-01.jpg', 'center', 729, 'gray', 'idle', 0],
    ['2b149bcb', 'node_37', 'guard-rally-01.jpg', 'right', 729, 'gray', 'idle', 0],

    // Master Warfare — all three pages represented.
    ['1a6ec06e', 'node_1', 'master-warfare-06.jpg', 'center', 212, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_2', 'master-warfare-06.jpg', 'left', 463, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_3', 'master-warfare-06.jpg', 'center', 463, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_4', 'master-warfare-06.jpg', 'right', 463, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_5', 'master-warfare-06.jpg', 'center', 714, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_6', 'master-warfare-06.jpg', 'left', 964, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_7', 'master-warfare-06.jpg', 'center', 964, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_8', 'master-warfare-06.jpg', 'right', 964, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_9', 'master-warfare-05.jpg', 'left', 200, 'amber', 'active', 15],
    ['1a6ec06e', 'node_10', 'master-warfare-05.jpg', 'center', 200, 'amber', 'active', 15],
    ['1a6ec06e', 'node_11', 'master-warfare-05.jpg', 'right', 200, 'amber', 'active', 15],
    ['1a6ec06e', 'node_12', 'master-warfare-05.jpg', 'center', 451, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_13', 'master-warfare-05.jpg', 'left', 701, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_14', 'master-warfare-05.jpg', 'center', 701, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_15', 'master-warfare-05.jpg', 'right', 701, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_16', 'master-warfare-05.jpg', 'center', 952, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_17', 'master-warfare-04.jpg', 'left', 256, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_18', 'master-warfare-04.jpg', 'right', 256, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_19', 'master-warfare-04.jpg', 'center', 506, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_20', 'master-warfare-04.jpg', 'left', 757, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_21', 'master-warfare-04.jpg', 'center', 757, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_22', 'master-warfare-04.jpg', 'right', 757, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_23', 'master-warfare-04.jpg', 'left', 1008, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_24', 'master-warfare-04.jpg', 'center', 1008, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_25', 'master-warfare-04.jpg', 'right', 1007, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_26', 'master-warfare-03.jpg', 'center', 187, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_27', 'master-warfare-03.jpg', 'left', 437, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_28', 'master-warfare-03.jpg', 'right', 438, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_29', 'master-warfare-03.jpg', 'center', 688, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_30', 'master-warfare-03.jpg', 'center', 939, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_31', 'master-warfare-02.jpg', 'left', 270, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_32', 'master-warfare-02.jpg', 'center', 270, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_33', 'master-warfare-02.jpg', 'right', 270, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_34', 'master-warfare-02.jpg', 'center', 521, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_35', 'master-warfare-01.jpg', 'left', 227, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_36', 'master-warfare-01.jpg', 'center', 227, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_37', 'master-warfare-01.jpg', 'right', 227, 'amber', 'max', 'MAX'],
    ['1a6ec06e', 'node_38', 'master-warfare-01.jpg', 'left', 478, 'amber', 'active', 15],
    ['1a6ec06e', 'node_39', 'master-warfare-01.jpg', 'center', 478, 'amber', 'active', 15],
    ['1a6ec06e', 'node_40', 'master-warfare-01.jpg', 'right', 478, 'amber', 'active', 16],
    ['1a6ec06e', 'node_42', 'master-warfare-01.jpg', 'center', 729, 'amber', 'active', 15],
    ['1a6ec06e', 'node_43', 'master-warfare-01.jpg', 'right', 728, 'amber', 'active', 15],
    ['1a6ec06e', 'node_44', 'master-warfare-01.jpg', 'center', 980, 'amber', 'active', 10],

    // Footmen Training — complete; Promotion III uses the crimson family.
    ['footmen_training', 'node_1', 'footmen-training-01.jpg', 'left', 193, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_2', 'footmen-training-01.jpg', 'right', 193, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_3', 'footmen-training-01.jpg', 'center', 444, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_4', 'footmen-training-01.jpg', 'left', 694, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_5', 'footmen-training-01.jpg', 'right', 694, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_6', 'footmen-training-01.jpg', 'center', 945, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_7', 'footmen-training-02.jpg', 'left', 213, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_8', 'footmen-training-02.jpg', 'right', 213, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_9', 'footmen-training-02.jpg', 'center', 463, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_10', 'footmen-training-02.jpg', 'left', 715, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_11', 'footmen-training-02.jpg', 'right', 714, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_12', 'footmen-training-02.jpg', 'center', 965, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_13', 'footmen-training-03.jpg', 'center', 478, 'crimson', 'max', 'MAX'],
    ['footmen_training', 'node_14', 'footmen-training-03.jpg', 'left', 728, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_15', 'footmen-training-03.jpg', 'right', 728, 'amber', 'max', 'MAX'],
    ['footmen_training', 'node_16', 'footmen-training-03.jpg', 'center', 979, 'amber', 'max', 'MAX'],

    // Archer Training — complete; Promotion III uses the crimson family.
    ['archers_training', 'node_1', 'archer-training-01.jpg', 'left', 327, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_2', 'archer-training-01.jpg', 'right', 327, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_3', 'archer-training-01.jpg', 'center', 578, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_4', 'archer-training-01.jpg', 'left', 829, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_5', 'archer-training-01.jpg', 'right', 829, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_6', 'archer-training-01.jpg', 'center', 1079, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_7', 'archer-training-03.jpg', 'left', 230, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_8', 'archer-training-03.jpg', 'right', 230, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_9', 'archer-training-03.jpg', 'center', 481, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_11', 'archer-training-03.jpg', 'right', 732, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_12', 'archer-training-03.jpg', 'center', 982, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_13', 'archer-training-04.jpg', 'center', 478, 'crimson', 'max', 'MAX'],
    ['archers_training', 'node_14', 'archer-training-04.jpg', 'left', 728, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_15', 'archer-training-04.jpg', 'right', 728, 'amber', 'max', 'MAX'],
    ['archers_training', 'node_16', 'archer-training-04.jpg', 'center', 979, 'amber', 'max', 'MAX'],

    // Cavalry Training — only rows 8-11 are supplied.
    ['cavalry_training', 'node_12', 'cavalry-training-01.jpg', 'center', 227, 'amber', 'max', 'MAX'],
    ['cavalry_training', 'node_14', 'cavalry-training-01.jpg', 'left', 728, 'amber', 'max', 'MAX'],
    ['cavalry_training', 'node_15', 'cavalry-training-01.jpg', 'right', 728, 'amber', 'max', 'MAX'],
    ['cavalry_training', 'node_16', 'cavalry-training-01.jpg', 'center', 979, 'amber', 'max', 'MAX'],
];

const mutableGameArt = {};
for (const [treeId, nodeId, source, column, panelTop, palette, state, observedLevel] of ART_ROWS) {
    const key = `${treeId}/${nodeId}`;
    const entry = mutableGameArt[key] || { variants: {} };
    entry.variants[state] = nodeArt(source, column, panelTop, palette, state, observedLevel);
    mutableGameArt[key] = entry;
}

for (const entry of Object.values(mutableGameArt)) {
    entry.variants = Object.freeze(entry.variants);
    entry.defaultState = entry.variants.max ? 'max' : entry.variants.active ? 'active' : 'idle';
    entry.availableStates = Object.freeze(Object.keys(entry.variants));
    Object.freeze(entry);
}

export const RESEARCH_GAME_ART = Object.freeze(mutableGameArt);

function frameArt(source, rect, palette, state, options = {}) {
    return Object.freeze({
        source: `${SOURCE_ROOT}${source}`,
        sourceDimensions: SOURCE_DIMENSIONS,
        rect: Object.freeze(rect),
        palette,
        observedState: state,
        panelSlot: Object.freeze([18, 30, PANEL_WIDTH, PANEL_HEIGHT]),
        badgeSlot: Object.freeze([18, 91, PANEL_WIDTH, 25]),
        contamination: options.contamination || 'none',
        confidence: options.confidence || 'high',
        maxCssPx: options.maxCssPx || 96,
    });
}

export const RESEARCH_FRAME_ATLAS = Object.freeze({
    gray: Object.freeze({
        idle: frameArt('solid-tactics-01.jpg', [228, 213, 118, 144], 'gray', 'idle', {
            contamination: 'connector-stub',
        }),
    }),
    amber: Object.freeze({
        active: frameArt('master-warfare-02.jpg', [85, 996, 118, 144], 'amber', 'active', {
            contamination: 'connector-stub',
        }),
        max: frameArt('cavalry-training-01.jpg', [228, 201, 118, 144], 'amber', 'max', {
            contamination: 'connector-stub',
        }),
    }),
    green: Object.freeze({
        max: frameArt('town-development-01.jpg', [85, 167, 118, 144], 'green', 'max', {
            contamination: 'connector-stub',
        }),
    }),
    crimson: Object.freeze({
        idle: frameArt('raider-legion-03.jpg', [372, 919, 118, 144], 'crimson', 'idle', {
            contamination: 'connector-stub',
        }),
        max: frameArt('basic-combat-01.jpg', [228, 167, 118, 144], 'crimson', 'max', {
            contamination: 'connector-stub',
        }),
    }),
});

export const RESEARCH_GAME_ART_GAPS = Object.freeze({
    absentTrees: Object.freeze([
        Object.freeze({ treeId: 'd1956263', name: 'Rapid Production' }),
        Object.freeze({ treeId: '802e7893', name: 'Research Legion I' }),
        Object.freeze({ treeId: '5fef2163', name: 'Research Legion III' }),
        Object.freeze({ treeId: 'cc2c9ee1', name: 'Class Legion Research' }),
        Object.freeze({ treeId: '3929cbb9', name: 'Improved Medical Facilities' }),
        Object.freeze({ treeId: 'city_defence', name: 'Master City Defence' }),
        Object.freeze({ treeId: 'defence_legion', name: 'Defence Legion Research' }),
        Object.freeze({ treeId: 'e8704053', name: 'Advanced Soldier Training' }),
        Object.freeze({ treeId: 'b3581c97', name: 'Imperial Guards' }),
        Object.freeze({ treeId: '3f5ebb34', name: 'Art of War - Raid' }),
        Object.freeze({ treeId: '3ff71437', name: 'Art of War - Defense' }),
        Object.freeze({ treeId: '77db4a78', name: 'Lofty Warrior' }),
        Object.freeze({ treeId: 'fc190e81', name: 'Dragon Blood Blessing' }),
        Object.freeze({ treeId: '19ae0569', name: 'Lofty Legion' }),
    ]),
    missingNodes: Object.freeze([
        '375d1626/node_3',
        '375d1626/node_15',
        '375d1626/node_16',
        'f0595b07/node_9',
        '4a932eb0/node_20',
        'zone_conflict/node_14',
        'zone_conflict/node_15',
        '2c49bd2a/node_2',
        '2c49bd2a/node_8',
        '2c49bd2a/node_12',
        '2c49bd2a/node_13',
        '2c49bd2a/node_23',
        '2c49bd2a/node_40',
        '2c49bd2a/node_41',
        '2c49bd2a/node_42',
        'art_of_war_command/node_4',
        'art_of_war_command/node_15',
        'art_of_war_command/node_22',
        'art_of_war_command/node_31',
        '24ffc526/node_11',
        '24ffc526/node_12',
        '24ffc526/node_16',
        '24ffc526/node_22',
        '2b149bcb/node_4',
        '2b149bcb/node_11',
        '2b149bcb/node_32',
        '2b149bcb/node_38',
        '2b149bcb/node_18',
        '2b149bcb/node_19',
        '2b149bcb/node_20',
        '1a6ec06e/node_41',
        'archers_training/node_10',
        'cavalry_training/node_13',
        'cavalry_training/node_1',
        'cavalry_training/node_2',
        'cavalry_training/node_3',
        'cavalry_training/node_4',
        'cavalry_training/node_5',
        'cavalry_training/node_6',
        'cavalry_training/node_7',
        'cavalry_training/node_8',
        'cavalry_training/node_9',
        'cavalry_training/node_10',
        'cavalry_training/node_11',
    ]),
    // These nodes are visible, but every supplied occurrence has blue particle
    // pixels inside the upper panel. They remain gaps rather than being retouched.
    contaminatedNodes: Object.freeze([
        '375d1626/node_3',
        'f0595b07/node_9',
        '4a932eb0/node_20',
        '2c49bd2a/node_2',
        '2c49bd2a/node_8',
        '2c49bd2a/node_12',
        '2c49bd2a/node_13',
        '2c49bd2a/node_23',
        '2c49bd2a/node_40',
        '2c49bd2a/node_41',
        '2c49bd2a/node_42',
        'art_of_war_command/node_4',
        'art_of_war_command/node_15',
        'art_of_war_command/node_22',
        'art_of_war_command/node_31',
        '24ffc526/node_11',
        '24ffc526/node_12',
        '24ffc526/node_16',
        '24ffc526/node_22',
        '2b149bcb/node_4',
        '2b149bcb/node_11',
        '2b149bcb/node_32',
        '2b149bcb/node_38',
        '1a6ec06e/node_41',
        'archers_training/node_10',
        'cavalry_training/node_13',
    ]),
    limitations: Object.freeze([
        'No transparent or high-DPI source sprites were supplied.',
        'Blue MAX sparkle is a screen-space animation and is not available as a clean reusable asset.',
        'Exact helpers return only observed states; display fallbacks reuse registered crops without synthesizing or recoloring them.',
    ]),
});

/**
 * Return exact art for one stable tree/node id. When preferredState is supplied,
 * a missing state returns null rather than silently displaying a different state.
 */
export function getResearchNodeArt(treeId, nodeId, preferredState) {
    const entry = RESEARCH_GAME_ART[`${treeId}/${nodeId}`];
    if (!entry) return null;
    const state = preferredState || entry.defaultState;
    return entry.variants[state] || null;
}

/**
 * Return one exact captured frame family/state. Missing combinations return null.
 */
export function getResearchFrameArt(palette, state) {
    const family = RESEARCH_FRAME_ATLAS[palette];
    if (!family) return null;
    if (state) return family[state] || null;
    return family.max || family.active || family.idle || null;
}

const ART_STATE_FALLBACK_ORDER = Object.freeze({
    idle: Object.freeze(['idle', 'active', 'max']),
    active: Object.freeze(['active', 'max', 'idle']),
    max: Object.freeze(['max', 'active', 'idle']),
});

const ART_TOKEN_STOP_WORDS = new Set([
    'after', 'all', 'and', 'each', 'from', 'increase', 'increased', 'level',
    'per', 'player', 'the', 'their', 'this', 'to', 'troop', 'troops', 'types',
    'with',
]);

const ART_WEAK_SEMANTIC_TOKENS = new Set([
    'attack', 'cost', 'defense', 'deploy', 'effect', 'health', 'hero', 'might',
    'production', 'resistance', 'speed', 'training', 'unlock',
]);

export const RESEARCH_NEUTRAL_ART_REFERENCE = 'f0595b07/node_14';
const ART_CANDIDATE_CACHE = new WeakMap();

function normalizeArtToken(token) {
    if (token === 'armour') return 'armor';
    if (token === 'archers') return 'archer';
    if (token === 'cavalries') return 'cavalry';
    if (token === 'defence') return 'defense';
    if (token === 'distillery') return 'ale';
    if (token === 'farm') return 'food';
    if (token === 'footman') return 'footmen';
    if (token === 'hp') return 'health';
    if (token === 'quarry' || token === 'stone') return 'marble';
    if (token === 'smelting') return 'iron';
    return token;
}

function getArtTokenList(value) {
    const normalized = String(value || '')
        .replace(/\brapid production\b/gi, 'income')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    if (!normalized) return [];
    return normalized
        .split(/\s+/)
        .map(normalizeArtToken)
        .filter((token) => token.length >= 3 && !/^\d+$/.test(token) && !ART_TOKEN_STOP_WORDS.has(token));
}

function getArtTokens(value) {
    return new Set(getArtTokenList(value));
}

function getArtPhraseKey(value) {
    return getArtTokenList(value).join(' ');
}

function getCanonicalTroop(value) {
    const troop = String(value || '').toLowerCase();
    if (troop.includes('arch')) return 'archer';
    if (troop.includes('cav')) return 'cavalry';
    if (troop.includes('foot')) return 'footmen';
    return 'all';
}

function getTokenOverlap(left, right) {
    let overlap = 0;
    for (const token of left) {
        if (right.has(token)) overlap += 1;
    }
    return overlap;
}

function getArtVariant(entry, preferredState) {
    const order = ART_STATE_FALLBACK_ORDER[preferredState]
        || [preferredState, 'idle', 'active', 'max'].filter(Boolean);
    for (const state of order) {
        if (entry?.variants?.[state]) return entry.variants[state];
    }
    return null;
}

function getArtCandidates(techCatalog) {
    if (techCatalog && typeof techCatalog === 'object' && ART_CANDIDATE_CACHE.has(techCatalog)) {
        return ART_CANDIDATE_CACHE.get(techCatalog);
    }
    const candidates = [];
    for (const tech of techCatalog || []) {
        for (const node of tech.nodes || []) {
            const reference = `${tech.id}/${node.id}`;
            const entry = RESEARCH_GAME_ART[reference];
            if (!entry) continue;
            candidates.push({
                reference,
                entry,
                nameKey: getArtPhraseKey(node.name),
                buffKey: getArtPhraseKey(node.buff),
                nameTokens: getArtTokens(node.name),
                buffTokens: getArtTokens(node.buff),
                troop: getCanonicalTroop(node.troop),
            });
        }
    }
    const result = Object.freeze(candidates);
    if (techCatalog && typeof techCatalog === 'object') {
        ART_CANDIDATE_CACHE.set(techCatalog, result);
    }
    return result;
}

function makeArtResolution({ art, provenance, requestedKey, sourceKey, requestedState, score = 0 }) {
    return Object.freeze({
        art,
        provenance,
        requestedKey,
        sourceKey,
        requestedState,
        matchedState: art?.observedState || null,
        score: Math.round(score * 1000) / 1000,
    });
}

function findBestArtCandidate(candidates, scoreCandidate) {
    let best = null;
    for (const candidate of candidates) {
        const score = scoreCandidate(candidate);
        if (score <= 0) continue;
        if (!best || score > best.score || (score === best.score && candidate.reference < best.candidate.reference)) {
            best = { candidate, score };
        }
    }
    return best;
}

/**
 * Resolve visible Research art without inventing imagery. The returned crop is
 * always one of the owner-supplied captures, with deterministic provenance:
 * exact state, same node in another observed state, semantic buff/troop match,
 * node-name match, then one real neutral Research crop.
 */
export function resolveResearchNodeArt({
    treeId,
    nodeId,
    preferredState = 'idle',
    nodeName = '',
    buff = '',
    troop = 'ALL',
} = {}, techCatalog = []) {
    const requestedKey = `${treeId}/${nodeId}`;
    const exactEntry = RESEARCH_GAME_ART[requestedKey];
    const exactArt = exactEntry?.variants?.[preferredState] || null;
    if (exactArt) {
        return makeArtResolution({
            art: exactArt,
            provenance: 'exact-node-state',
            requestedKey,
            sourceKey: requestedKey,
            requestedState: preferredState,
        });
    }

    const sameNodeArt = getArtVariant(exactEntry, preferredState);
    if (sameNodeArt) {
        return makeArtResolution({
            art: sameNodeArt,
            provenance: 'same-node-other-state',
            requestedKey,
            sourceKey: requestedKey,
            requestedState: preferredState,
        });
    }

    const candidates = getArtCandidates(techCatalog).filter(({ reference }) => reference !== requestedKey);
    const targetBuffKey = getArtPhraseKey(buff);
    const targetBuffTokens = getArtTokens(buff);
    const targetTroop = getCanonicalTroop(troop);
    const semanticMatch = findBestArtCandidate(candidates, (candidate) => {
        const troopScore = candidate.troop === targetTroop
            ? (targetTroop === 'all' ? 0.15 : 1.25)
            : (candidate.troop === 'all' ? 0.05 : 0);
        const stateScore = candidate.entry.variants[preferredState] ? 0.02 : 0;
        if (targetBuffKey && candidate.buffKey === targetBuffKey) return 100 + troopScore + stateScore;
        const overlappingTokens = Array.from(targetBuffTokens)
            .filter((token) => candidate.buffTokens.has(token));
        const strongOverlap = overlappingTokens
            .filter((token) => !ART_WEAK_SEMANTIC_TOKENS.has(token)).length;
        const weakOverlap = overlappingTokens.length - strongOverlap;
        const sameSpecificTroop = targetTroop !== 'all' && candidate.troop === targetTroop;
        const denominator = Math.max(1, targetBuffTokens.size, candidate.buffTokens.size);
        const overlapRatio = overlappingTokens.length / denominator;
        const strongSemanticMatch = strongOverlap >= 2 || (strongOverlap === 1 && overlapRatio >= 0.2);
        if (!strongSemanticMatch && !(sameSpecificTroop && weakOverlap > 0)) return 0;
        const weightedOverlap = strongOverlap * 4 + weakOverlap * 0.75;
        return weightedOverlap + overlapRatio * 2 + troopScore + stateScore;
    });
    if (semanticMatch) {
        const art = getArtVariant(semanticMatch.candidate.entry, preferredState);
        if (art) {
            return makeArtResolution({
                art,
                provenance: 'semantic-buff-troop',
                requestedKey,
                sourceKey: semanticMatch.candidate.reference,
                requestedState: preferredState,
                score: semanticMatch.score,
            });
        }
    }

    const targetNameKey = getArtPhraseKey(nodeName);
    const targetNameTokens = getArtTokens(nodeName);
    const nameMatch = findBestArtCandidate(candidates, (candidate) => {
        const stateScore = candidate.entry.variants[preferredState] ? 0.02 : 0;
        if (targetNameKey && candidate.nameKey === targetNameKey) return 100 + stateScore;
        const overlap = getTokenOverlap(targetNameTokens, candidate.nameTokens);
        if (!overlap) return 0;
        const denominator = Math.max(1, targetNameTokens.size, candidate.nameTokens.size);
        return overlap * 4 + (overlap / denominator) * 2 + stateScore;
    });
    if (nameMatch) {
        const art = getArtVariant(nameMatch.candidate.entry, preferredState);
        if (art) {
            return makeArtResolution({
                art,
                provenance: 'node-name',
                requestedKey,
                sourceKey: nameMatch.candidate.reference,
                requestedState: preferredState,
                score: nameMatch.score,
            });
        }
    }

    const neutralEntry = RESEARCH_GAME_ART[RESEARCH_NEUTRAL_ART_REFERENCE]
        || Object.values(RESEARCH_GAME_ART)[0];
    return makeArtResolution({
        art: getArtVariant(neutralEntry, preferredState),
        provenance: 'neutral-default',
        requestedKey,
        sourceKey: RESEARCH_NEUTRAL_ART_REFERENCE,
        requestedState: preferredState,
    });
}
