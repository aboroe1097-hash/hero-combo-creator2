"""Verify structure IDs are unique within each dataset (SECTORS export)."""
import re
from collections import Counter
from pathlib import Path

text = Path(__file__).resolve().parents[1].joinpath("js/eden-datasets.generated.js").read_text(encoding="utf-8")
sectors_block = text.split("export const EDEN_DATASET_SECTORS = ", 1)[1].split("export const EDEN_DATASET_OVERLAYS", 1)[0]
dataset_chunks = re.split(r'\n  "([^"]+)": \{\n', sectors_block)[1:]
failed = False
for i in range(0, len(dataset_chunks), 2):
    ds_id = dataset_chunks[i]
    body = dataset_chunks[i + 1] if i + 1 < len(dataset_chunks) else ""
    ids = re.findall(r'id: "([^"]+)"', body)
    c = Counter(ids)
    dups = [k for k, v in c.items() if v > 1]
    if dups:
        failed = True
        print(f"{ds_id}: {len(dups)} duplicate IDs (e.g. {dups[0]})")
    else:
        print(f"{ds_id}: OK ({len(ids)} structures, all IDs unique)")
if failed:
    raise SystemExit(1)