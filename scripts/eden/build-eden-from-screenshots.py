#!/usr/bin/env python3
"""Merge database/eden-wonders-screenshots/*.json into Season 5 Wonder X1 txt, then rebuild JS.

Workflow:
  1. python scripts/eden/extract-eden-screenshots.py   # OCR from in-game UI screenshots
  2. python scripts/eden/merge-eden-x1.py              # X1 coords + X12 gate fallback
  Or: python scripts/eden/build-eden-from-screenshots.py  # rebuild only
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "database"
JSON_DIR = DB / "eden-wonders-screenshots"
OUT_TXT = DB / "Eden_Wonders_NorthvSouth_Season5_Map.txt"
BUILD_DATASETS = ROOT / "scripts" / "eden" / "build-eden-datasets.py"

SECTOR_ORDER = ["C", "E", "EC", "N1", "N2", "N3", "N4", "S1", "S2", "S3", "S4", "W", "WC"]

TYPE_ALIASES = {
    "STRHMD": "STRHD",
    "STRH": "STRHD",
    "CP?": "CP1",
    "CP6": "CP1",
    "C7": "C6",
}


def normalize_type(raw: str) -> str:
    t = str(raw or "").strip().upper()
    return TYPE_ALIASES.get(t, t)


def normalize_zone(raw: str) -> str:
    z = str(raw or "").strip()
    z = z.replace(" ", "")
    z = re.sub(r"\.(\d)", r",Z\1", z)
    z = re.sub(r"Z(\d),Z(\d)", r"Z\1,Z\2", z)
    z = re.sub(r"^(\d+),", r"Z\1,", z)
    z = re.sub(r",(\d+)$", r",Z\1", z)
    z = re.sub(r",(\d+),", r",Z\1,", z)
    return z


def load_rows() -> list[dict]:
    rows: list[dict] = []
    for sector in SECTOR_ORDER:
        path = JSON_DIR / f"{sector}.json"
        if not path.exists():
            print(f"WARN: missing {path.name}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for item in data:
            rows.append({
                "sector": str(item.get("sector", sector)).strip(),
                "zone": normalize_zone(item.get("zone", "Z1")),
                "type": normalize_type(item.get("type", "")),
                "x": int(item["x"]),
                "y": int(item["y"]),
                "points": int(item["points"]) if item.get("points") is not None else "",
            })
    return rows


def write_txt(rows: list[dict]) -> None:
    lines = ["sector;zone;type;x;y;points"]
    for row in rows:
        lines.append(
            f"{row['sector']};{row['zone']};{row['type']};{row['x']};{row['y']};{row['points']}"
        )
    OUT_TXT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    rows = load_rows()
    if not rows:
        raise SystemExit("No screenshot rows found — check database/eden-wonders-screenshots/")

    write_txt(rows)
    by_sector: dict[str, int] = {}
    for row in rows:
        by_sector[row["sector"]] = by_sector.get(row["sector"], 0) + 1

    print(f"Wrote {OUT_TXT} — {len(rows)} structures")
    for sector in SECTOR_ORDER:
        if sector in by_sector:
            print(f"  {sector}: {by_sector[sector]}")

    subprocess.check_call([sys.executable, str(BUILD_DATASETS)])


if __name__ == "__main__":
    main()