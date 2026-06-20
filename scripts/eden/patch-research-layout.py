import re
from pathlib import Path

path = Path(__file__).resolve().parent.parent / "js" / "tech-db.js"
content = path.read_text(encoding="utf-8")

content = content.replace(
    'name: "Conscription", troop: "ALL", buff: "Extra Encampment", maxLevel: 1, costType: "None", costs: [] , row: 2, col: 1,',
    'name: "Conscription", troop: "ALL", buff: "Extra Encampment", maxLevel: 1, costType: "None", costs: [] , row: 2, col: 2,',
)
content = content.replace(
    'name: "Full-Metal Armor", troop: "ALL", buff: "HP", maxLevel: 15, costType: "None", costs: [] , row: 4, col: 1,',
    'name: "Full-Metal Armor", troop: "ALL", buff: "HP", maxLevel: 15, costType: "None", costs: [] , row: 4, col: 2,',
)
content = content.replace(
    'name: "Deadly Arms", troop: "ALL", buff: "Single Player siege victory enemy death rate", maxLevel: 15, costType: "None", costs: [] , row: 6, col: 1',
    'name: "Deadly Arms", troop: "ALL", buff: "Single Player siege victory enemy death rate", maxLevel: 15, costType: "None", costs: [] , row: 6, col: 2',
)
content = content.replace(
    'name: "Basic Military",\n        default_pos: { row: 2, col: 4 },\n        season: "S0",',
    'name: "Basic Military",\n        default_pos: { row: 2, col: 4 },\n        layoutMode: "game",\n        season: "S0",',
)

layout = {
    "node_1": (1, 1, 2),
    "node_2": (1, 2, 1), "node_3": (1, 2, 2), "node_4": (1, 2, 3),
    "node_5": (1, 3, 1), "node_6": (1, 3, 2), "node_7": (1, 3, 3),
    "node_8": (1, 4, 2),
    "node_9": (2, 1, 1), "node_10": (2, 1, 2), "node_11": (2, 1, 3),
    "node_12": (2, 2, 1), "node_13": (2, 2, 2), "node_14": (2, 2, 3),
    "node_15": (2, 3, 2),
    "node_16": (2, 4, 1), "node_17": (2, 4, 2), "node_18": (2, 4, 3),
    "node_19": (3, 1, 1), "node_20": (3, 1, 2), "node_21": (3, 1, 3),
    "node_22": (3, 2, 2),
    "node_23": (4, 1, 1), "node_24": (4, 1, 2), "node_25": (4, 1, 3),
    "node_26": (4, 2, 1), "node_27": (4, 2, 2), "node_28": (4, 2, 3),
    "node_29": (4, 3, 2),
    "node_30": (5, 1, 1), "node_31": (5, 1, 2), "node_32": (5, 1, 3),
    "node_33": (5, 2, 1), "node_34": (5, 2, 2), "node_35": (5, 2, 3),
    "node_36": (5, 3, 1), "node_37": (5, 3, 2), "node_38": (5, 3, 3),
    "node_39": (5, 4, 2),
    "node_40": (6, 1, 1), "node_41": (6, 1, 2), "node_42": (6, 1, 3),
    "node_43": (6, 2, 1), "node_44": (6, 2, 2), "node_45": (6, 2, 3),
}

content = content.replace(
    'name: "Solid Tactics",\n        default_pos: { row: 8, col: 1 },    \n        season: "X1",',
    'name: "Solid Tactics",\n        default_pos: { row: 8, col: 1 },\n        layoutMode: "game",\n        treePages: ["Siege Attack", "Siege Defense", "Field Battle", "Unit Power", "Quick Training", "Advanced"],\n        season: "X1",',
)

start = content.find('id: "2c49bd2a"')
end = content.find('id: "fc190e81"', start)
block = content[start:end]
for nid, (page, row, col) in layout.items():
    pattern = r'(\{ id: "' + re.escape(nid) + r'", name: )'
    repl = '{ id: "' + nid + f'", page: {page}, row: {row}, col: {col}, name: '
    new_block, n = re.subn(pattern, repl, block, count=1)
    if n == 0:
        print("WARN miss", nid)
    else:
        block = new_block

path.write_text(content[:start] + block + content[end:], encoding="utf-8")
print("tech-db.js patched")