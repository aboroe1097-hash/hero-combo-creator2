#!/usr/bin/env python3
"""Pack structure icons into one atlas for fast loading."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ICON_DIR = ROOT / "assets" / "eden-reference" / "icons"
OUT_PNG = ROOT / "assets" / "eden-reference" / "icons-atlas.png"
OUT_JSON = ROOT / "assets" / "eden-reference" / "icons-atlas.json"

# All types with extracted PNGs; aliases share sprites in JS.
ATLAS_TYPES = [
    "CP1", "CP3", "CP7", "ST1", "ST2", "ST3", "LT2", "LT4",
    "C5", "C6", "CS", "STRHD", "AT", "WC8",
]

USER_ICON_SOURCES: dict[str, Path] = {
    "CP1": ICON_DIR / "user-gate.png",
    "CP3": ICON_DIR / "user-gate.png",
    "CP7": ICON_DIR / "user-gate.png",
    "ST1": ICON_DIR / "user-town.png",
    "ST2": ICON_DIR / "user-town.png",
    "ST3": ICON_DIR / "user-town.png",
    "LT2": ICON_DIR / "user-town.png",
    "LT4": ICON_DIR / "user-town.png",
    "STRHD": ICON_DIR / "user-stronghold.png",
    "CS": ICON_DIR / "user-stronghold.png",
    "C5": ICON_DIR / "user-capital.png",
    "C6": ICON_DIR / "user-capital.png",
}
MAX_W, MAX_H = 96, 96
PAD = 2


def trim(img: Image.Image) -> Image.Image:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def fit_icon(img: Image.Image) -> Image.Image:
    img = trim(img)
    w, h = img.size
    if not w or not h:
        return Image.new("RGBA", (MAX_W, MAX_H), (0, 0, 0, 0))
    scale = min((MAX_W - PAD * 2) / w, (MAX_H - PAD * 2) / h)
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    if (nw, nh) != (w, h):
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (MAX_W, MAX_H), (0, 0, 0, 0))
    canvas.paste(img, ((MAX_W - nw) // 2, MAX_H - nh - PAD))
    return canvas


def resolve_icon_src(stype: str) -> Path | None:
    user = USER_ICON_SOURCES.get(stype)
    if user and user.exists():
        return user
    src = ICON_DIR / f"{stype.lower()}.png"
    return src if src.exists() else None


def main() -> None:
    import subprocess
    subprocess.run(
        ["python", str(ROOT / "database" / "prepare-user-icons.py")],
        check=False,
        cwd=ROOT,
    )
    cells = []
    for stype in ATLAS_TYPES:
        src = resolve_icon_src(stype)
        if src is None:
            print(f"skip {stype}: no file")
            continue
        cells.append((stype, fit_icon(Image.open(src))))
        print(f"  {stype} <- {src.name}")

    if not cells:
        raise SystemExit("No icons to pack")

    cols = len(cells)
    atlas = Image.new("RGBA", (MAX_W * cols, MAX_H), (0, 0, 0, 0))
    sprites = {}
    for i, (stype, icon) in enumerate(cells):
        x = i * MAX_W
        atlas.paste(icon, (x, 0), icon)
        sprites[stype] = {"x": x, "y": 0, "w": MAX_W, "h": MAX_H}

    atlas.save(OUT_PNG, optimize=True)
    OUT_JSON.write_text(
        json.dumps({"cellW": MAX_W, "cellH": MAX_H, "sprites": sprites}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {OUT_PNG} ({atlas.size}, {OUT_PNG.stat().st_size} bytes), {len(sprites)} sprites")


if __name__ == "__main__":
    main()