#!/usr/bin/env python3
"""Merge X1 OCR screenshot data with legacy X12 baseline (gates / missed rows)."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_DIR = ROOT / "database" / "eden-wonders-screenshots"
BASELINE_DIR = ROOT / "database" / "eden-wonders-screenshots-x12-backup"
BUILD = ROOT / "database" / "build-eden-from-screenshots.py"
MATCH_DIST = 14


def load_sector(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def key(row: dict) -> tuple:
    return (row["sector"], row["x"], row["y"])


def near(a: dict, b: dict) -> bool:
    return a["sector"] == b["sector"] and ((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2) ** 0.5 <= MATCH_DIST


def normalize_row(row: dict) -> dict:
    out = dict(row)
    if out.get("type") == "CP5" and out.get("points", 0) >= 70:
        out["type"] = "C5"
    return out


def merge_sector(x1_rows: list[dict], x12_rows: list[dict]) -> list[dict]:
    merged = {key(normalize_row(r)): normalize_row(r) for r in x1_rows}
    for old in x12_rows:
        old = normalize_row(old)
        if any(near(old, x1) for x1 in merged.values()):
            continue
        merged[key(old)] = old
    return sorted(merged.values(), key=lambda r: (r["zone"], r["type"], r["y"], r["x"]))


def main() -> None:
    if not BASELINE_DIR.exists():
        raise SystemExit(f"Missing baseline backup at {BASELINE_DIR}")

    sectors = ["C", "E", "EC", "N1", "N2", "N3", "N4", "S1", "S2", "S3", "S4", "W", "WC"]
    stats = {}
    for sector in sectors:
        x1 = load_sector(JSON_DIR / f"{sector}.json")
        x12 = load_sector(BASELINE_DIR / f"{sector}.json")
        merged = merge_sector(x1, x12)
        (JSON_DIR / f"{sector}.json").write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
        stats[sector] = {"x1": len(x1), "x12": len(x12), "merged": len(merged)}

    print(json.dumps(stats, indent=2))
    subprocess.check_call([sys.executable, str(BUILD)])


if __name__ == "__main__":
    main()