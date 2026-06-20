#!/usr/bin/env python3
"""Build Eden reference map at 1:1 world coords (1700x1600 px) and mask baked capitals."""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "faction-division2.png"
OUT = ROOT / "assets" / "eden-reference" / "faction-division-map.png"
META = ROOT / "assets" / "eden-reference" / "faction-division-map.json"

WORLD_W = 1700
WORLD_H = 1600
# Classic layout capitals (eden-map-data.js) — world coords = image pixels
CAPITALS = [
    (613, 605),
    (991, 702),
    (1385, 606),
    (634, 942),
    (262, 850),
    (813, 947),
]
MASK_RADIUS_WORLD = 26


def resize_to_world(bgr: np.ndarray) -> np.ndarray:
    """Map faction-division2 linearly onto 1700x1600 (1 px = 1 world unit)."""
    return cv2.resize(bgr, (WORLD_W, WORLD_H), interpolation=cv2.INTER_LANCZOS4)


def mask_capitals(bgr: np.ndarray) -> np.ndarray:
    h, w = bgr.shape[:2]
    out = bgr.copy()
    r_px = MASK_RADIUS_WORLD

    for wx, wy in CAPITALS:
        px, py = int(wx), int(wy)
        if px < 0 or py < 0 or px >= w or py >= h:
            continue
        mask = np.zeros((h, w), np.uint8)
        cv2.circle(mask, (px, py), r_px, 255, -1)
        out = cv2.inpaint(out, mask, 12, cv2.INPAINT_TELEA)
    return out


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing {SRC}")

    bgr = cv2.imread(str(SRC))
    if bgr is None:
        raise SystemExit(f"Failed to read {SRC}")

    resized = resize_to_world(bgr)
    masked = mask_capitals(resized)
    source = str(SRC.relative_to(ROOT)).replace("\\", "/")
    bounds = {"minX": 0, "maxX": WORLD_W, "minY": 0, "maxY": WORLD_H}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT), masked, [cv2.IMWRITE_PNG_COMPRESSION, 3])

    meta = {
        "source": source,
        "output": str(OUT.relative_to(ROOT)).replace("\\", "/"),
        "worldSize": [WORLD_W, WORLD_H],
        "imageSize": [WORLD_W, WORLD_H],
        "layout": "rect",
        "bounds": bounds,
        "worldOffset": {"x": -60, "y": -65},
        "pixelPerfect": True,
        "trimBaked": True,
    }
    META.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Wrote {OUT} ({WORLD_W}x{WORLD_H}) — 1:1 world coords")
    print(f"Masked {len(CAPITALS)} capitals")
    print(f"Wrote {META}")


if __name__ == "__main__":
    main()