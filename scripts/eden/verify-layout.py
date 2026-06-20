import re
from pathlib import Path

content = Path(__file__).resolve().parent.parent / "js" / "tech-db.js"
text = content.read_text(encoding="utf-8")
trees = re.findall(
    r'id: "([^"]+)",\s*name: "([^"]+)"[^}]*?layoutMode: "([^"]+)"',
    text,
    re.DOTALL,
)
# simpler: split by tree id at top level
ids = re.findall(r'\n    \{\n        id: "([^"]+)"', text)
ids += re.findall(r'\n\{\n        id: "([^"]+)"', text)
print("Tree count:", len(set(ids)))

for tid in sorted(set(ids)):
    start = text.find(f'id: "{tid}"')
    chunk = text[start:start + 800]
    name = re.search(r'name: "([^"]+)"', chunk).group(1)
    mode = re.search(r'layoutMode: "([^"]+)"', chunk)
    pages = re.search(r'treePages:', chunk)
    block_end = text.find('\n    },', start)
    block = text[start:block_end]
    nodes = len(re.findall(r'\{ id: "', block))
    no_rc = len(re.findall(r'\{ id: "node_[^"]+", name:', block))
    has_b = len(re.findall(r'\bb: [123]', block))
    mode_s = mode.group(1) if mode else "auto"
    print(f"{name:32} mode={mode_s:6} pages={'Y' if pages else 'N'} nodes={nodes} b={has_b}")