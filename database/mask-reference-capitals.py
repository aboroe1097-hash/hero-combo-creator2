#!/usr/bin/env python3
"""Inpaint baked capital icons on the faction reference map at known world coords."""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "faction-division2.png"
OUT = ROOT / "assets" / "eden-reference" / "faction-division-map.png"

WORLD_W = 1700
WORLD_H = 1600
# Classic layout capitals (eden-map-data.js) — world coords
CAPITALS = [
    (613, 605),
    (991, 702),
    (1385, 606),
    (634, 942),
    (262, 850),
    (813, 947),
]
MASK_RADIUS_WORLD = 26


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing {SRC}")

    bgr = cv2.imread(str(SRC))
    if bgr is None:
        raise SystemExit(f"Failed to read {SRC}")

    h, w = bgr.shape[:2]
    sx = w / WORLD_W
    sy = h / WORLD_H
    r_px = int(MASK_RADIUS_WORLD * max(sx, sy))

    for wx, wy in CAPITALS:
        px = int(round(wx * sx))
        py = int(round(wy * sy))
        mask = np.zeros((h, w), np.uint8)
        cv2.circle(mask, (px, py), r_px, 255, -1)
        bgr = cv2.inpaint(bgr, mask, 12, cv2.INPAINT_TELEA)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT), bgr, [cv2.IMWRITE_PNG_COMPRESSION, 3])
    print(f"Wrote {OUT} ({w}x{h}), masked {len(CAPITALS)} capitals")


if __name__ == "__main__":
    main()