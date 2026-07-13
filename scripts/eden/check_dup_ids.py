"""Verify structure IDs are unique within each dataset (decoded payload)."""
import base64
import gzip
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
payload_path = ROOT / "js" / "eden-datasets.payload.json"
wrapper = json.loads(payload_path.read_text(encoding="utf-8"))
b64 = wrapper.get("payload")
if wrapper.get("encoding") != "gzip-base64" or not isinstance(b64, str):
    raise SystemExit(f"Could not parse gzip-base64 payload from {payload_path}")
data = json.loads(gzip.decompress(base64.b64decode(b64)))
sectors = data.get("sectors", {})
failed = False
for ds_id, ds_sectors in sectors.items():
    ids = []
    for sector in ds_sectors.values():
        ids.extend(s["id"] for s in sector.get("structures", []))
    c = Counter(ids)
    dups = [k for k, v in c.items() if v > 1]
    if dups:
        failed = True
        print(f"{ds_id}: {len(dups)} duplicate IDs (e.g. {dups[0]})")
    else:
        print(f"{ds_id}: OK ({len(ids)} structures, all IDs unique)")
if failed:
    raise SystemExit(1)
