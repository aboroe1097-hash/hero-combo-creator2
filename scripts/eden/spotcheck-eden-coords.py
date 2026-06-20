#!/usr/bin/env python3
"""Spot-check season dataset majors (capitals, strongholds, temple) for map alignment."""
from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "database"
MANIFEST = DB / "eden-datasets.manifest.json"
MAJOR_TYPES = {"C5", "C6", "CS", "STRHD", "AT", "WCB", "WC8"}
SCREENSHOT_REFS = ROOT / "assets" / "eden-reference" / "eden-screenshots.manifest.json"


def is_intish(value: str) -> bool:
    try:
        int(float(value))
        return True
    except (TypeError, ValueError):
        return False


def parse_row(fields: list[str]) -> dict | None:
    if len(fields) < 6:
        return None
    sector, zone, stype, x_raw, y_raw = fields[0].strip(), fields[1].strip(), fields[2].strip(), fields[3], fields[4]
    points_raw = fields[5]
    if len(fields) >= 7 and not is_intish(x_raw) and is_intish(fields[4]) and is_intish(fields[5]):
        zone = f"{zone},{fields[2].strip()}"
        stype = fields[3].strip()
        x_raw, y_raw, points_raw = fields[4], fields[5], fields[6] if len(fields) > 6 else ""
    if not is_intish(x_raw) or not is_intish(y_raw):
        return None
    if stype in {"CP?", "?"}:
        stype = "CP1"
    return {
        "sector": sector,
        "zone": zone,
        "type": stype,
        "x": int(float(x_raw)),
        "y": int(float(y_raw)),
        "points": int(float(points_raw)) if str(points_raw).strip() else None,
    }


def read_rows(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        header = next(reader, None)
        if not header:
            return rows
        for fields in reader:
            if not fields or not any(str(x).strip() for x in fields):
                continue
            row = parse_row(fields)
            if row:
                rows.append(row)
    return rows


def in_bounds(x: int, y: int, b: dict) -> bool:
    return b["minX"] <= x <= b["maxX"] and b["minY"] <= y <= b["maxY"]


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    refs = json.loads(SCREENSHOT_REFS.read_text(encoding="utf-8"))["screenshots"] if SCREENSHOT_REFS.exists() else []

    for ds in manifest["datasets"]:
        path = DB / ds["file"]
        if not path.exists():
            continue
        rows = read_rows(path)
        majors = [r for r in rows if r["type"] in MAJOR_TYPES]
        by_sector: dict[str, list] = defaultdict(list)
        for r in majors:
            by_sector[r["sector"]].append(r)

        print(f"\n=== {ds['id']} ({path.name}) — {len(majors)} major structures ===")
        for sector in sorted(by_sector):
            items = by_sector[sector]
            print(f"  {sector}: {len(items)}")
            for r in sorted(items, key=lambda x: (x["type"], x["y"], x["x"])):
                ref_hit = [ref["id"] for ref in refs if ref.get("sector") in (sector, "FULL") and in_bounds(r["x"], r["y"], ref["worldBounds"])]
                tag = f"  screenshot:{','.join(ref_hit)}" if ref_hit else ""
                print(f"    {r['type']:6} @ {r['x']:4}:{r['y']:4}  zone={r['zone']}{tag}")


if __name__ == "__main__":
    main()