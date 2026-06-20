"""
Apply game-style research layout to all standard trees.
Keeps branch layout for Imperial Guards and Lofty Warrior.
Adds row/col to Art of War - Command and Dragon Blood Blessing.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "js" / "tech-db.js"
content = DB.read_text(encoding="utf-8")

BRANCH_TREE_IDS = {"b3581c97", "77db4a78"}

# --- Art of War - Command: 3-wide troop rows + ALL center ---
AOW_COMMAND_LAYOUT = {
    "node_1": (1, 1), "node_2": (1, 2), "node_3": (1, 3),
    "node_4": (2, 1), "node_5": (2, 2), "node_6": (2, 3),
    "node_7": (3, 2),
    "node_8": (4, 1), "node_9": (4, 2), "node_10": (4, 3),
    "node_11": (5, 1), "node_12": (5, 2), "node_13": (5, 3),
    "node_14": (6, 2),
    "node_15": (7, 1), "node_16": (7, 2), "node_17": (7, 3),
    "node_18": (8, 1), "node_19": (8, 2), "node_20": (8, 3),
    "node_21": (9, 1),
    "node_22": (10, 1), "node_23": (10, 2), "node_24": (10, 3),
    "node_25": (11, 1), "node_26": (11, 2), "node_27": (11, 3),
    "node_28": (12, 1), "node_29": (12, 2), "node_30": (12, 3),
    "node_31": (13, 1),
    "node_32": (14, 1), "node_33": (14, 2), "node_34": (14, 3),
    "node_35": (15, 1), "node_36": (15, 2), "node_37": (15, 3),
    "node_38": (16, 1),
}

# --- Dragon Blood Blessing ---
DRAGON_LAYOUT = {
    "node_1": (1, 2),
    "node_2": (2, 1), "node_3": (2, 2), "node_4": (2, 3),
    "node_5": (3, 1), "node_6": (3, 2), "node_7": (3, 3),
    "node_8": (4, 2),
    "node_9": (5, 1), "node_10": (5, 2), "node_11": (5, 3),
    "node_12": (6, 1), "node_13": (6, 2), "node_14": (6, 3),
    "node_15": (7, 2),
    "node_16": (8, 1), "node_17": (8, 2), "node_18": (8, 3),
    "node_19": (9, 2),
    "node_20": (10, 1), "node_21": (10, 2),
    "node_22": (11, 2), "node_23": (11, 1), "node_24": (11, 3),
    "node_25": (12, 2),
    "node_26": (13, 2),
    "node_27": (14, 1), "node_28": (14, 2),
    "node_29": (15, 1), "node_30": (15, 2),
    "node_31": (16, 1), "node_32": (16, 2),
    "node_33": (17, 2),
    "node_34": (18, 1), "node_35": (18, 2), "node_36": (18, 3),
    "node_37": (19, 1), "node_38": (19, 2), "node_39": (19, 3),
    "node_40": (20, 2),
    "node_41": (21, 1), "node_42": (21, 2), "node_43": (21, 3),
}

# Large trees: page assignments by row threshold
TREE_PAGES = {
    "1a6ec06e": {  # Master Warfare
        "pages": ["Destruction", "Siege Combat", "Mark & Capture"],
        "row_page": [(1, 7, 1), (8, 14, 2), (15, 99, 3)],
    },
    "city_defence": {
        "pages": ["Fortification", "Reinforcement", "Tower & Siege"],
        "row_page": [(1, 7, 1), (8, 14, 2), (15, 99, 3)],
    },
    "2b149bcb": {  # Guard Rally
        "pages": ["Guard Basics", "Tactical", "Rally Cap"],
        "row_page": [(1, 7, 1), (8, 13, 2), (14, 99, 3)],
    },
    "3f5ebb34": {  # Art of War - Raid
        "pages": ["Armed Forces", "Siege", "War Badges"],
        "row_page": [(1, 7, 1), (8, 11, 2), (12, 99, 3)],
    },
    "3ff71437": {  # Art of War - Defense
        "pages": ["Hold the Line", "Siege Orders", "War Badges"],
        "row_page": [(1, 7, 1), (8, 11, 2), (12, 99, 3)],
    },
    "art_of_war_command": {
        "pages": ["Deceit & Faith", "Fearless Strike", "Command"],
        "row_page": [(1, 7, 1), (8, 13, 2), (14, 99, 3)],
    },
    "24ffc526": {  # Raider Legion
        "pages": ["Front Row", "Mid Row", "Back Row"],
        "row_page": [(1, 7, 1), (8, 11, 2), (12, 99, 3)],
    },
    "fc190e81": {  # Dragon Blood Blessing
        "pages": ["Foundation", "Posture", "Dragon Power"],
        "row_page": [(1, 9, 1), (10, 16, 2), (17, 99, 3)],
    },
    "e8704053": {  # Advanced Soldier Training
        "pages": ["Enhanced Troops", "Training", "Advanced"],
        "row_page": [(1, 10, 1), (11, 20, 2), (21, 99, 3)],
    },
}


def extract_trees(text):
    trees = []
    i = 0
    while True:
        m = re.search(r'\n    \{\n        id: "([^"]+)"', text[i:])
        if not m:
            break
        start = i + m.start()
        tid = m.group(1)
        depth = 0
        j = start
        while j < len(text):
            if text[j:j + 1] == "{":
                depth += 1
            elif text[j:j + 1] == "}":
                depth -= 1
                if depth == 0:
                    end = j + 1
                    trees.append((tid, start, end, text[start:end]))
                    i = end
                    break
            j += 1
        else:
            break
    return trees


def row_to_page(row, row_page_rules):
    for lo, hi, page in row_page_rules:
        if lo <= row <= hi:
            return page
    return 1


def inject_after_default_pos(block, injection):
    if injection.strip() in block:
        return block
    return re.sub(
        r'(default_pos: \{ row: \d+, col: \d+ \},?\s*\n)',
        r'\1' + injection,
        block,
        count=1,
    )


def add_layout_mode(block, mode):
    if 'layoutMode:' in block:
        block = re.sub(r'layoutMode: "[^"]+",\s*\n', f'layoutMode: "{mode}",\n', block)
        return block
    return inject_after_default_pos(block, f'        layoutMode: "{mode}",\n')


def add_tree_pages(block, pages):
    if 'treePages:' in block:
        pages_str = ", ".join(f'"{p}"' for p in pages)
        block = re.sub(
            r'treePages: \[[^\]]+\],\s*\n',
            f'treePages: [{pages_str}],\n',
            block,
        )
        return block
    return inject_after_default_pos(
        block,
        f'        treePages: [{", ".join(chr(34) + p + chr(34) for p in pages)}],\n',
    )


def add_row_col_to_node(line, row, col, page=None):
    if 'row:' in line or 'page:' in line:
        line = re.sub(r',?\s*row: \d+', '', line)
        line = re.sub(r',?\s*col: \d+', '', line)
        line = re.sub(r',?\s*page: \d+', '', line)
    prefix = ""
    if page is not None:
        prefix = f"page: {page}, row: {row}, col: {col}, "
    else:
        prefix = f"row: {row}, col: {col}, "
    return re.sub(r'(\{ id: "[^"]+", )', r'\1' + prefix, line, count=1)


def patch_tree_block(tid, block):
    if tid in BRANCH_TREE_IDS:
        block = add_layout_mode(block, "branch")
        return block

    block = add_layout_mode(block, "game")

    if tid == "art_of_war_command":
        lines = block.split("\n")
        new_lines = []
        for line in lines:
            m = re.search(r'id: "(node_\d+)"', line)
            if m and m.group(1) in AOW_COMMAND_LAYOUT:
                row, col = AOW_COMMAND_LAYOUT[m.group(1)]
                page = row_to_page(row, TREE_PAGES[tid]["row_page"]) if tid in TREE_PAGES else None
                line = add_row_col_to_node(line, row, col, page)
            new_lines.append(line)
        block = "\n".join(new_lines)
        block = add_tree_pages(block, TREE_PAGES[tid]["pages"])

    elif tid == "fc190e81":
        lines = block.split("\n")
        new_lines = []
        for line in lines:
            m = re.search(r'id: "(node_\d+)"', line)
            if m and m.group(1) in DRAGON_LAYOUT:
                row, col = DRAGON_LAYOUT[m.group(1)]
                page = row_to_page(row, TREE_PAGES[tid]["row_page"])
                line = add_row_col_to_node(line, row, col, page)
            new_lines.append(line)
        block = "\n".join(new_lines)
        block = add_tree_pages(block, TREE_PAGES[tid]["pages"])

    elif tid in TREE_PAGES:
        cfg = TREE_PAGES[tid]
        block = add_tree_pages(block, cfg["pages"])
        lines = block.split("\n")
        new_lines = []
        for line in lines:
            rm = re.search(r'row: (\d+)', line)
            if 'id: "node_' in line and rm:
                row = int(rm.group(1))
                page = row_to_page(row, cfg["row_page"])
                if 'page:' not in line:
                    line = re.sub(
                        r'(\{ id: "[^"]+", )',
                        rf'\1page: {page}, ',
                        line,
                        count=1,
                    )
                else:
                    line = re.sub(r'page: \d+', f'page: {page}', line)
            new_lines.append(line)
        block = "\n".join(new_lines)

    return block


trees = extract_trees(content)
print(f"Found {len(trees)} trees")
parts = []
last = 0
for tid, start, end, block in trees:
    parts.append(content[last:start])
    patched = patch_tree_block(tid, block)
    parts.append(patched)
    mode = "branch" if tid in BRANCH_TREE_IDS else "game"
    pages = "yes" if tid in TREE_PAGES or tid == "2c49bd2a" else ""
    print(f"  {tid}: layoutMode={mode} pages={pages}")
    last = end
parts.append(content[last:])
DB.write_text("".join(parts), encoding="utf-8")
print("tech-db.js patched")