#!/usr/bin/env python3
"""Bake Eden live-map tile pyramid from reference PNG (placeholder until real captures)."""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "eden-reference" / "faction-division-map.png"
OUT_ROOT = ROOT / "assets" / "eden-live"
MANIFEST_PATH = OUT_ROOT / "manifest.json"

WORLD_W, WORLD_H = 1600, 1600
TILE_SIZE = 512

LEVELS = [
    {"id": "L0", "zoomMax": 0.45, "scale": 1.0},
    {"id": "L1", "zoomMax": 1.2, "scale": 2.0},
    {"id": "L2", "zoomMax": 999, "scale": 4.0},
]


def bake_level(src: Image.Image, level_id: str, scale: float) -> int:
    sw = max(1, int(round(WORLD_W * scale)))
    sh = max(1, int(round(WORLD_H * scale)))
    scaled = src.resize((sw, sh), Image.Resampling.LANCZOS)

    cols = math.ceil(WORLD_W / TILE_SIZE)
    rows = math.ceil(WORLD_H / TILE_SIZE)
    out_dir = OUT_ROOT / "tiles" / level_id
    out_dir.mkdir(parents=True, exist_ok=True)

    tile_px = max(1, int(round(TILE_SIZE * scale)))
    count = 0
    for row in range(rows):
        for col in range(cols):
            x0 = int(round(col * TILE_SIZE * scale))
            y0 = int(round(row * TILE_SIZE * scale))
            x1 = min(sw, x0 + tile_px)
            y1 = min(sh, y0 + tile_px)
            tile = scaled.crop((x0, y0, x1, y1))
            if tile.size != (tile_px, tile_px):
                padded = Image.new("RGB", (tile_px, tile_px), (26, 20, 14))
                padded.paste(tile, (0, 0))
                tile = padded
            tile.save(out_dir / f"{col}_{row}.webp", "WEBP", quality=82, method=4)
            count += 1
    return count


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Source map not found: {SRC}")

    src = Image.open(SRC).convert("RGB")
    if src.size != (WORLD_W, WORLD_H):
        src = src.resize((WORLD_W, WORLD_H), Image.Resampling.LANCZOS)

    total = 0
    for lv in LEVELS:
        n = bake_level(src, lv["id"], lv["scale"])
        total += n
        print(f"{lv['id']}: {n} tiles")

    manifest = {
        "worldSize": [WORLD_W, WORLD_H],
        "tileSize": TILE_SIZE,
        "tileRoot": "assets/eden-live/tiles/",
        "tileExt": "webp",
        "levels": [{"id": lv["id"], "zoomMax": lv["zoomMax"]} for lv in LEVELS],
        "status": "placeholder",
        "source": str(SRC.relative_to(ROOT)).replace("\\", "/"),
        "tileCount": total,
    }
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST_PATH} ({total} tiles)")


if __name__ == "__main__":
    main()
