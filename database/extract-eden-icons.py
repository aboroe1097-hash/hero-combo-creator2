#!/usr/bin/env python3
"""Extract in-game structure sprites from Eden screenshot references."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "assets" / "eden-reference" / "screenshots"
ICONS = ROOT / "assets" / "eden-reference" / "icons"
MANIFEST = ROOT / "assets" / "eden-reference" / "eden-screenshots.manifest.json"

# left, top, right, bottom on 716×1600 phone captures (map band ~y 100–1420)
ICON_CROPS: list[tuple[str, str, tuple[int, int, int, int]]] = [
    ("WC8", "WhatsApp Image 2026-06-10 at 18.59.30.jpeg", (285, 600, 430, 820)),
    ("AT", "WhatsApp Image 2026-06-10 at 18.59.29.jpeg", (290, 590, 435, 810)),
    ("C6", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", (168, 628, 248, 738)),
    ("C5", "WhatsApp Image 2026-06-10 at 18.59.30 (2).jpeg", (330, 545, 410, 655)),
    ("STRHD", "WhatsApp Image 2026-06-10 at 18.59.29 (1).jpeg", (438, 505, 518, 595)),
    ("CS", "WhatsApp Image 2026-06-10 at 18.59.31.jpeg", (395, 430, 475, 520)),
    ("CP1", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", (88, 505, 138, 575)),
    ("CP3", "WhatsApp Image 2026-06-10 at 18.59.31.jpeg", (108, 665, 158, 735)),
    ("CP7", "WhatsApp Image 2026-06-10 at 18.59.30.jpeg", (520, 520, 570, 585)),
    ("ST1", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", (372, 365, 438, 450)),
    ("ST2", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", (488, 405, 558, 490)),
    ("ST3", "WhatsApp Image 2026-06-10 at 18.59.31.jpeg", (220, 720, 280, 795)),
    ("LT2", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", (188, 885, 268, 975)),
    ("LT4", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", (278, 835, 358, 925)),
]

SCREENSHOT_REFS = [
    {
        "id": "c-central",
        "file": "screenshots/WhatsApp Image 2026-06-10 at 18.59.30.jpeg",
        "sector": "C",
        "label": "Central Sector",
        "worldBounds": {"minX": 680, "maxX": 980, "minY": 680, "maxY": 980},
    },
    {
        "id": "ec-central",
        "file": "screenshots/WhatsApp Image 2026-06-10 at 18.59.29.jpeg",
        "sector": "EC",
        "label": "E Central Sector",
        "worldBounds": {"minX": 1080, "maxX": 1620, "minY": 560, "maxY": 1020},
    },
    {
        "id": "wc-central",
        "file": "screenshots/WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg",
        "sector": "WC",
        "label": "W Central Sector",
        "worldBounds": {"minX": 180, "maxX": 720, "minY": 520, "maxY": 1080},
    },
    {
        "id": "overview-ne",
        "file": "screenshots/WhatsApp Image 2026-06-10 at 18.59.29 (1).jpeg",
        "sector": "N2",
        "label": "North overview",
        "worldBounds": {"minX": 480, "maxX": 1100, "minY": 40, "maxY": 520},
    },
    {
        "id": "overview-s",
        "file": "screenshots/WhatsApp Image 2026-06-10 at 18.59.30 (3).jpeg",
        "sector": "S3",
        "label": "South overview",
        "worldBounds": {"minX": 260, "maxX": 820, "minY": 1080, "maxY": 1520},
    },
    {
        "id": "overview-wide",
        "file": "screenshots/WhatsApp Image 2026-06-10 at 18.59.31.jpeg",
        "sector": "FULL",
        "label": "Wide map view",
        "worldBounds": {"minX": 80, "maxX": 1500, "minY": 120, "maxY": 1380},
        "opacity": 0.55,
    },
]


def trim_transparent(img: Image.Image) -> Image.Image:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def extract_icon(stype: str, src: Path, box: tuple[int, int, int, int]) -> Path:
    img = Image.open(src).convert("RGBA")
    crop = img.crop(box)
    # soften phone UI bleed
    w, h = crop.size
    mask = Image.new("L", (w, h), 255)
    crop.putalpha(mask)
    crop = trim_transparent(crop)
    out = ICONS / f"{stype.lower()}.png"
    crop.save(out, "PNG")
    return out


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    extracted = []
    for stype, filename, box in ICON_CROPS:
        src = SHOTS / filename
        if not src.exists():
            print(f"skip {stype}: missing {filename}")
            continue
        out = extract_icon(stype, src, box)
        extracted.append(stype)
        print(f"  {stype} -> {out.name} ({out.stat().st_size} bytes)")

    MANIFEST.write_text(
        json.dumps({"screenshots": SCREENSHOT_REFS, "icons": extracted}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {MANIFEST} — {len(extracted)} icons")


if __name__ == "__main__":
    main()