#!/usr/bin/env python3
"""Extract Eden Wonder map structure coords from in-game UI screenshots (X1)."""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import easyocr
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "database" / "eden-wonders-screenshots"
DEFAULT_POINTS = {
    "ST1": 15, "ST2": 20, "ST3": 25,
    "LT2": 35, "LT3": 40, "LT4": 50,
    "CP1": 5, "CP2": 5, "CP3": 5, "CP4": 5, "CP5": 5, "CP7": 5,
    "C5": 100, "C6": 125,
    "STRHD": 10, "CS": 10,
    "AT": 600, "WCB": 600, "WC8": 600,
}

SECTOR_ALIASES = {
    "central sector": "C",
    "c sector": "C",
    "east central sector": "EC",
    "e central sector": "EC",
    "ec sector": "EC",
    "eastern central sector": "EC",
    "east sector": "E",
    "west central sector": "WC",
    "w central sector": "WC",
    "wc sector": "WC",
    "western central sector": "WC",
    "west sector": "W",
    "w sector": "W",
    "north sector 1": "N1",
    "north sector 2": "N2",
    "north sector 3": "N3",
    "north sector 4": "N4",
    "south sector 1": "S1",
    "south sector 2": "S2",
    "south sector 3": "S3",
    "south sector 4": "S4",
}

NAME_TO_TYPE = [
    (re.compile(r"capitol\s*lv\.?\s*6|capital\s*lv\.?\s*6", re.I), "C6"),
    (re.compile(r"capitol\s*lv\.?\s*5|capital\s*lv\.?\s*5", re.I), "C5"),
    (re.compile(r"large\s*town\s*lv\.?\s*4", re.I), "LT4"),
    (re.compile(r"large\s*town\s*lv\.?\s*3", re.I), "LT3"),
    (re.compile(r"large\s*town\s*lv\.?\s*2", re.I), "LT2"),
    (re.compile(r"small\s*town\s*lv\.?\s*3", re.I), "ST3"),
    (re.compile(r"small\s*town\s*lv\.?\s*2", re.I), "ST2"),
    (re.compile(r"small\s*town\s*lv\.?\s*1", re.I), "ST1"),
    (re.compile(r"stronghold", re.I), "STRHD"),
    (re.compile(r"checkpoint\s*lv\.?\s*7|gate\s*lv\.?\s*7", re.I), "CP7"),
    (re.compile(r"checkpoint\s*lv\.?\s*5|gate\s*lv\.?\s*5", re.I), "CP5"),
    (re.compile(r"checkpoint\s*lv\.?\s*4|gate\s*lv\.?\s*4", re.I), "CP4"),
    (re.compile(r"checkpoint\s*lv\.?\s*3|gate\s*lv\.?\s*3", re.I), "CP3"),
    (re.compile(r"checkpoint\s*lv\.?\s*2|gate\s*lv\.?\s*2", re.I), "CP2"),
    (re.compile(r"checkpoint\s*lv\.?\s*1|gate\s*lv\.?\s*1|checkpoint|gate", re.I), "CP1"),
    (re.compile(r"wonder\s*capital\s*lv\.?\s*8|wc8", re.I), "WC8"),
    (re.compile(r"wonder\s*capital|ancient\s*temple", re.I), "AT"),
]

COORD_RE = re.compile(r"[Xx]\s*(\d+)\s*[Yy]\s*(\d+)")
ZONE_RE = re.compile(r"zone\s*(\d+(?:\s*,\s*\w[\w\-]*)?)", re.I)
ZONE_HEADER_RE = re.compile(r"zone\s*(\d+)", re.I)


def normalize_zone(raw: str, sector: str) -> str:
    z = raw.strip().upper().replace(" ", "")
    z = re.sub(r"^Z(\d+)$", r"Z\1", z)
    if not z.startswith("Z"):
        z = f"Z{z}"
    return z


def sector_from_title(text: str) -> str | None:
    low = text.lower().replace("-", " ")
    for label, code in SECTOR_ALIASES.items():
        if label in low:
            return code
    m = re.search(r"\b([nsew]c?|[nsew])\s*sector\s*(\d+)?", low)
    if not m:
        return None
    base, num = m.group(1).upper(), m.group(2)
    if num:
        return f"{base}{num}" if base in ("N", "S") else base
    return base


def type_from_name(name: str) -> str | None:
    for pattern, stype in NAME_TO_TYPE:
        if pattern.search(name):
            return stype
    return None


def crop_panel(img: Image.Image) -> Image.Image:
    w, h = img.size
    return img.crop((0, int(h * 0.45), w, h))


def parse_lines(text: str, fallback_sector: str | None) -> list[dict]:
    rows: list[dict] = []
    sector = fallback_sector
    zone = None
    pending_name: str | None = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        low = line.lower()
        if low in {"town", "mark", "building", "go"}:
            continue
        if re.fullmatch(r"[xy:\s\d]+", low):
            continue

        if "zone" in low:
            sec = sector_from_title(line)
            if sec:
                sector = sec
            zm = ZONE_RE.search(line)
            if zm:
                zone = normalize_zone(zm.group(1), sector or "")
            pending_name = None
            continue

        sec = sector_from_title(line)
        if sec:
            sector = sec
            pending_name = None
            continue

        coord = COORD_RE.search(line)
        if coord and sector:
            name = pending_name or line
            stype = type_from_name(name)
            if stype:
                x, y = int(coord.group(1)), int(coord.group(2))
                rows.append({
                    "sector": sector,
                    "zone": zone or "Z1",
                    "type": stype,
                    "x": x,
                    "y": y,
                    "points": DEFAULT_POINTS.get(stype, 5),
                })
            pending_name = None
            continue

        if type_from_name(line):
            pending_name = line

    return rows


def dedupe(rows: list[dict]) -> list[dict]:
    seen: dict[tuple, dict] = {}
    for row in rows:
        key = (row["sector"], row["x"], row["y"])
        seen[key] = row
    return sorted(seen.values(), key=lambda r: (r["sector"], r["zone"], r["type"], r["y"], r["x"]))


def pil_to_np(img: Image.Image) -> np.ndarray:
    return np.array(img.convert("RGB"))


def extract_image(reader: easyocr.Reader, path: Path) -> list[dict]:
    img = Image.open(path)
    panel = crop_panel(img)
    results = reader.readtext(pil_to_np(panel), detail=0, paragraph=True)
    text = "\n".join(results)
    title_results = reader.readtext(
        pil_to_np(img.crop((0, int(img.height * 0.35), img.width, int(img.height * 0.55)))),
        detail=0,
    )
    title_text = " ".join(title_results)
    sector = sector_from_title(title_text) or sector_from_title(text)
    return parse_lines(text, sector)


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        folders = [
            Path(r"c:\Users\alsel\Downloads\WhatsApp Unknown 2026-06-11 at 02.28.36"),
            Path(r"c:\Users\alsel\Downloads\WhatsApp Unknown 2026-06-11 at 01.45.40"),
        ]
        images = []
        for folder in folders:
            if folder.exists():
                images.extend(sorted(folder.glob("*.jpeg")))
    else:
        images = [Path(p) for p in argv[1:]]

    if not images:
        raise SystemExit("No images found")

    print(f"Processing {len(images)} screenshots...")
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)

    all_rows: list[dict] = []
    for i, path in enumerate(images, 1):
        try:
            rows = extract_image(reader, path)
            all_rows.extend(rows)
            print(f"  [{i}/{len(images)}] {path.name}: {len(rows)} structures")
        except Exception as exc:
            print(f"  [{i}/{len(images)}] {path.name}: ERROR {exc}")

    merged = dedupe(all_rows)
    by_sector: dict[str, list] = defaultdict(list)
    for row in merged:
        by_sector[row["sector"]].append(row)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sector_order = ["C", "E", "EC", "N1", "N2", "N3", "N4", "S1", "S2", "S3", "S4", "W", "WC"]
    for sector in sector_order:
        if sector not in by_sector:
            print(f"WARN: no data for sector {sector}")
            continue
        out_path = OUT_DIR / f"{sector}.json"
        out_path.write_text(json.dumps(by_sector[sector], indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {out_path.name}: {len(by_sector[sector])} structures")

    summary = OUT_DIR / "_x1-extraction-summary.json"
    summary.write_text(json.dumps({
        "source": "in-game screenshots (Wonder X1 / Season 5)",
        "imageCount": len(images),
        "structureCount": len(merged),
        "bySector": {k: len(v) for k, v in sorted(by_sector.items())},
    }, indent=2), encoding="utf-8")
    print(f"Total unique structures: {len(merged)}")


if __name__ == "__main__":
    main(sys.argv)