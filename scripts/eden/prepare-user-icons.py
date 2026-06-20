#!/usr/bin/env python3
"""Strip checkerboard backgrounds from hand-authored structure PNGs."""
from __future__ import annotations

from collections import Counter
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets"
ICON_DIR = ROOT / "assets" / "eden-reference" / "icons"
OUT_DIR = ICON_DIR

# (source, output, checkerboard tolerance)
STRIP_SOURCES = [
    ("Gate.png", "user-gate.png", 30),
    ("Town.png", "user-town.png", 28),
    ("stronghold.png", "user-stronghold.png", 22),
    ("Capital.png", "user-capital.png", 28),
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


def strip_checkerboard_border_only(path: Path, tol: int = 30) -> Image.Image:
    """Remove only edge-connected checkerboard — never erase interior art."""
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    bg_colors = border_bg_colors(arr)

    bg_match = np.zeros((h, w), dtype=np.uint8)
    for bg in bg_colors:
        bg_match |= (np.max(np.abs(rgb - bg), axis=2) <= tol).astype(np.uint8)

    reachable = np.zeros((h, w), dtype=np.uint8)
    for x in range(w):
        if bg_match[0, x]:
            reachable[0, x] = 1
        if bg_match[h - 1, x]:
            reachable[h - 1, x] = 1
    for y in range(h):
        if bg_match[y, 0]:
            reachable[y, 0] = 1
        if bg_match[y, w - 1]:
            reachable[y, w - 1] = 1

    kernel = np.ones((3, 3), np.uint8)
    while True:
        grown = cv2.dilate(reachable, kernel, iterations=1)
        grown = (grown & bg_match).astype(np.uint8)
        if int(grown.sum()) == int(reachable.sum()):
            break
        reachable = grown

    arr[:, :, 3] = np.where(reachable > 0, 0, 255).astype(np.uint8)
    arr[:, :, 3] = remove_speckles(arr)
    return tight_crop(Image.fromarray(arr))


def tight_crop(im: Image.Image, margin: int = 4) -> Image.Image:
    """Crop to opaque pixels so map scaling uses the building, not empty margins."""
    arr = np.array(im.convert("RGBA"))
    ys, xs = np.where(arr[:, :, 3] > 128)
    if len(ys) == 0:
        return im
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    return im.crop((
        max(0, x0 - margin),
        max(0, y0 - margin),
        min(im.width, x1 + margin + 1),
        min(im.height, y1 + margin + 1),
    ))


def ensure_capital_icon() -> None:
    """Capital: hand-authored Capital.png, else in-game C5 extract (not town)."""
    dest = OUT_DIR / "user-capital.png"
    hand = ASSETS / "Capital.png"
    if hand.exists():
        return
    for fallback in (ICON_DIR / "c5.png", ICON_DIR / "c6.png"):
        if fallback.exists():
            im = Image.open(fallback).convert("RGBA")
            im.save(dest, optimize=True)
            print(f"  {fallback.name} -> {dest.name} {im.size} (capital fallback)")
            return
    print("  skip Capital: add assets/Capital.png or run extract-eden-icons.py")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for src_name, out_name, tol in STRIP_SOURCES:
        src = ASSETS / src_name
        if not src.exists():
            if out_name == "user-capital.png":
                continue
            print(f"skip {src_name}: missing")
            continue
        out = strip_checkerboard_border_only(src, tol)
        dest = OUT_DIR / out_name
        out.save(dest, optimize=True)
        alpha = np.array(out)[:, :, 3]
        opaque = 100.0 * (alpha > 128).sum() / alpha.size
        transparent = 100.0 * (alpha == 0).sum() / alpha.size
        print(f"  {src_name} -> {dest.name} {out.size} opaque={opaque:.1f}% transparent={transparent:.1f}%")

    ensure_capital_icon()


if __name__ == "__main__":
    main()