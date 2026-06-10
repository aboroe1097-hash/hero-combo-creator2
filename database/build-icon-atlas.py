#!/usr/bin/env python3
"""Pack structure icons into one small atlas for fast loading."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "assets" / "eden-reference" / "icons"
OUT_PNG = ROOT / "assets" / "eden-reference" / "icons-atlas.png"
OUT_JSON = ROOT / "assets" / "eden-reference" / "icons-atlas.json"

# Procedural fallback types — atlas only for majors + temple (in-game look where it matters).
ATLAS_TYPES = ["CP1", "ST1", "C5", "C6", "STRHD", "WC8"]
MAX_W, MAX_H = 36, 44


def trim(img: Image.Image) -> Image.Image:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def fit_icon(img: Image.Image) -> Image.Image:
    img = trim(img)
    w, h = img.size
    scale = min(MAX_W / max(w, 1), MAX_H / max(h, 1), 1.0)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    if (nw, nh) != (w, h):
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (MAX_W, MAX_H), (0, 0, 0, 0))
    canvas.paste(img, ((MAX_W - nw) // 2, MAX_H - nh - 2))
    return canvas


def main():
    cells = []
    for stype in ATLAS_TYPES:
        src = ICON_DIR / f"{stype.lower()}.png"
        if not src.exists() and stype == "WC8":
            src = ICON_DIR / "wc8.png"
        if not src.exists():
            print(f"skip {stype}: no file")
            continue
        cells.append((stype, fit_icon(Image.open(src))))

    if not cells:
        raise SystemExit("No icons to pack")

    cols = len(cells)
    atlas = Image.new("RGBA", (MAX_W * cols, MAX_H), (0, 0, 0, 0))
    sprites = {}
    for i, (stype, icon) in enumerate(cells):
        x = i * MAX_W
        atlas.paste(icon, (x, 0))
        sprites[stype] = {"x": x, "y": 0, "w": MAX_W, "h": MAX_H}

    atlas.save(OUT_PNG, optimize=True)
    OUT_JSON.write_text(json.dumps({"cellW": MAX_W, "cellH": MAX_H, "sprites": sprites}, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PNG} ({atlas.size}, {OUT_PNG.stat().st_size} bytes), {len(sprites)} sprites")


if __name__ == "__main__":
    main()