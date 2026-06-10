#!/usr/bin/env python3
"""Strip checkerboard backgrounds from hand-authored structure PNGs."""
from __future__ import annotations

from collections import Counter
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUT_DIR = ROOT / "assets" / "eden-reference" / "icons"

SOURCES = [
    ("Gate.png", "user-gate.png", 30),
    ("Town.png", "user-town.png", 28),
]


def border_bg_colors(arr: np.ndarray, step: int = 12, top_n: int = 3) -> list[np.ndarray]:
    h, w = arr.shape[:2]
    border: list[tuple[int, int, int]] = []
    for x in range(w):
        border.append(tuple(arr[0, x, :3]))
        border.append(tuple(arr[h - 1, x, :3]))
    for y in range(h):
        border.append(tuple(arr[y, 0, :3]))
        border.append(tuple(arr[y, w - 1, :3]))
    buckets = Counter(((c[0] // step) * step, (c[1] // step) * step, (c[2] // step) * step) for c in border)
    return [np.array(key, dtype=np.int16) for key, _ in buckets.most_common(top_n)]


def remove_speckles(arr: np.ndarray, *, min_area: int = 16, min_lum: int = 245) -> np.ndarray:
    rgb = arr[:, :, :3].astype(np.float32)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    bright = ((arr[:, :, 3] > 20) & (lum >= min_lum)).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(bright, connectivity=8)
    out = arr[:, :, 3].copy()
    for i in range(1, n):
        if int(stats[i, cv2.CC_STAT_AREA]) < min_area:
            out[labels == i] = 0
    return out


def strip_checkerboard(path: Path, tol: int = 30) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    rgb = arr[:, :, :3].astype(np.int16)
    mask = np.zeros(arr.shape[:2], dtype=bool)
    for bg in border_bg_colors(arr):
        mask |= np.max(np.abs(rgb - bg), axis=2) <= tol
    arr[:, :, 3] = np.where(mask, 0, 255).astype(np.uint8)
    arr[:, :, 3] = remove_speckles(arr)
    out = Image.fromarray(arr)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for src_name, out_name, tol in SOURCES:
        src = ASSETS / src_name
        if not src.exists():
            print(f"skip {src_name}: missing")
            continue
        out = strip_checkerboard(src, tol)
        dest = OUT_DIR / out_name
        out.save(dest, optimize=True)
        alpha = np.array(out)[:, :, 3]
        transparent = 100.0 * (alpha == 0).sum() / alpha.size
        print(f"  {src_name} -> {dest.name} {out.size} transparent={transparent:.1f}%")


if __name__ == "__main__":
    main()