import re
from pathlib import Path

p = Path(__file__).resolve().parent.parent / "js" / "tech-db.js"
content = p.read_text(encoding="utf-8")
trees = re.findall(r'id: "([^"]+)",\s*name: "([^"]+)"', content)
print("Trees:", len(trees))
for tid, name in trees:
    start = content.find(f'id: "{tid}"')
    next_m = re.search(r'\n    \},\n    \{', content[start + 10:])
    end = start + 10 + (next_m.start() if next_m else len(content) - start)
    block = content[start:end]
    nodes = re.findall(r'\{ id: "node_\d+"', block)
    has_row = sum(1 for _ in re.finditer(r'\brow:', block))
    has_b = len(re.findall(r'\bb:\s*[123]', block))
    layout = "layoutMode" in block
    pages = "treePages" in block
    print(f"{name[:42]:42} nodes={len(nodes):2} row={has_row:2} b={has_b:2} layout={layout} pages={pages}")