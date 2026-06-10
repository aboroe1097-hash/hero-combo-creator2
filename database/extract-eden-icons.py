#!/usr/bin/env python3
"""Extract in-game structure sprites from Eden screenshot references."""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "assets" / "eden-reference" / "screenshots"
ICONS = ROOT / "assets" / "eden-reference" / "icons"
MANIFEST = ROOT / "assets" / "eden-reference" / "eden-screenshots.manifest.json"

# type, screenshot, kind, center x/y, crop half-size
# Gates = CP3 mosque arch (all levels). Towns = white capital mosque. Stronghold = white castle.
ICON_SOURCES: list[tuple[str, str, str, int, int, int]] = [
    ("CP1", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", "yellow_gate", 495, 484, 28),
    ("CP3", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", "yellow_gate", 495, 484, 28),
    ("CP7", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", "yellow_gate", 495, 484, 28),
    ("ST1", "WhatsApp Image 2026-06-10 at 18.59.30 (2).jpeg", "bright_town", 356, 580, 40),
    ("ST2", "WhatsApp Image 2026-06-10 at 18.59.30 (2).jpeg", "bright_town", 356, 580, 40),
    ("ST3", "WhatsApp Image 2026-06-10 at 18.59.30 (2).jpeg", "bright_town", 356, 580, 40),
    ("LT2", "WhatsApp Image 2026-06-10 at 18.59.30 (2).jpeg", "bright_town", 356, 580, 40),
    ("LT4", "WhatsApp Image 2026-06-10 at 18.59.30 (2).jpeg", "bright_town", 356, 580, 40),
    ("C5", "WhatsApp Image 2026-06-10 at 18.59.30 (2).jpeg", "yellow_neutral", 356, 627, 52),
    ("C6", "WhatsApp Image 2026-06-10 at 18.59.30 (1).jpeg", "yellow_neutral", 160, 730, 52),

    ("WC8", "WhatsApp Image 2026-06-10 at 18.59.30.jpeg", "flood", 347, 955, 145),
    ("AT", "WhatsApp Image 2026-06-10 at 18.59.29.jpeg", "flood", 304, 974, 95),
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


def color_mask(bgr: np.ndarray, kind: str) -> np.ndarray:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    if kind == "blue":
        mask = cv2.inRange(hsv, np.array((90, 60, 60)), np.array((135, 255, 255)))
    else:
        bright = cv2.inRange(hsv, np.array((15, 90, 100)), np.array((40, 255, 255)))
        gold = cv2.inRange(hsv, np.array((10, 50, 120)), np.array((35, 255, 255)))
        mask = cv2.bitwise_or(bright, gold)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    return cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)


def flood_parchment(rgb: np.ndarray, tolerance: int = 12) -> np.ndarray:
    h, w = rgb.shape[:2]
    lo = hi = (tolerance, tolerance, tolerance)
    bg = np.zeros((h, w), dtype=bool)
    seeds = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2),
    ]
    for seed in seeds:
        work = rgb.copy()
        mask = np.zeros((h + 2, w + 2), np.uint8)
        cv2.floodFill(work, mask, seed, (0, 0, 0), lo, hi, cv2.FLOODFILL_MASK_ONLY)
        bg |= mask[1:-1, 1:-1] > 0
    return (~bg).astype(np.uint8) * 255


def trim_alpha(rgba: np.ndarray, pad: int = 2) -> np.ndarray:
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 20)
    if xs.size == 0:
        return rgba
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(rgba.shape[1] - 1, x1 + pad)
    y1 = min(rgba.shape[0] - 1, y1 + pad)
    return rgba[y0 : y1 + 1, x0 : x1 + 1]


def pick_component_id(
    mask: np.ndarray,
    anchor_x: float,
    anchor_y: float,
    *,
    max_aspect: float = 2.4,
    min_area: int = 120,
    max_area: int | None = None,
) -> int | None:
    n, _, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    best = None
    best_score = -1.0
    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < min_area:
            continue
        if max_area is not None and area > max_area:
            continue
        w = int(stats[i, cv2.CC_STAT_WIDTH])
        h = int(stats[i, cv2.CC_STAT_HEIGHT])
        aspect = max(w, h) / max(1, min(w, h))
        if aspect > max_aspect:
            continue
        cx, cy = centroids[i]
        dist = ((cx - anchor_x) ** 2 + (cy - anchor_y) ** 2) ** 0.5
        score = area / (1.0 + dist * 0.2)
        if score > best_score:
            best_score = score
            best = i
    return best


def component_at_point(mask: np.ndarray, px: int, py: int) -> np.ndarray:
    flood = mask.copy()
    h, w = mask.shape
    ff_mask = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(flood, ff_mask, (px, py), 255)
    return flood


def nearest_mask_pixel(mask: np.ndarray, px: int, py: int, max_dist: int = 55) -> tuple[int, int] | None:
    ys, xs = np.where(mask > 0)
    if xs.size == 0:
        return None
    dist = (xs - px) ** 2 + (ys - py) ** 2
    i = int(dist.argmin())
    if dist[i] > max_dist * max_dist:
        return None
    return int(xs[i]), int(ys[i])


def extract_colored(
    bgr: np.ndarray,
    cx: int,
    cy: int,
    half: int,
    kind: str,
    *,
    pad: int = 6,
    dilate: int = 10,
    max_component_area: int | None = None,
) -> np.ndarray | None:
    h, w = bgr.shape[:2]
    x0, x1 = max(0, cx - half), min(w, cx + half)
    y0, y1 = max(0, cy - half), min(h, cy + half)
    roi = bgr[y0 : y1 + 1, x0 : x1 + 1]
    px, py = cx - x0, cy - y0

    cm = color_mask(roi, kind)
    comp_id = pick_component_id(
        cm,
        px,
        py,
        max_aspect=2.5 if kind == "blue" else 2.8,
        max_area=max_component_area,
    )
    if comp_id is None:
        seed = nearest_mask_pixel(cm, px, py)
        if seed is None:
            return None
        comp = component_at_point(cm, *seed)
    else:
        labels = cv2.connectedComponentsWithStats(cm, connectivity=8)[1]
        comp = (labels == comp_id).astype(np.uint8) * 255

    if dilate > 0:
        dilate_iters = 1 if kind == "blue" else 2
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate, dilate))
        comp = cv2.dilate(comp, kernel, iterations=dilate_iters)

    ys, xs = np.where(comp > 0)
    if xs.size == 0:
        return None

    bx0, bx1 = max(0, xs.min() - pad), min(roi.shape[1] - 1, xs.max() + pad)
    by0, by1 = max(0, ys.min() - pad), min(roi.shape[0] - 1, ys.max() + pad)
    crop = roi[by0 : by1 + 1, bx0 : bx1 + 1]
    sub = comp[by0 : by1 + 1, bx0 : bx1 + 1]
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)

    rgba = np.zeros((*rgb.shape[:2], 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb
    rgba[:, :, 3] = sub
    return trim_alpha(rgba, pad=1)


def neutralize_guild_color(rgba: np.ndarray) -> np.ndarray:
    """Map guild blue/yellow/purple tints back to default beige structure art."""
    out = rgba.copy()
    mask = rgba[:, :, 3] > 20
    if not mask.any():
        return out
    rgb = rgba[:, :, :3].astype(np.float32)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    beige = np.stack(
        [
            np.clip(lum * 1.06, 0, 255),
            np.clip(lum * 0.99, 0, 255),
            np.clip(lum * 0.84, 0, 255),
        ],
        axis=2,
    )
    out[:, :, :3][mask] = beige[mask].astype(np.uint8)
    return out


def to_white_structure(rgba: np.ndarray) -> np.ndarray:
    """Remap structure pixels to warm white tones (not dark guild-neutral silhouettes)."""
    out = rgba.copy()
    mask = rgba[:, :, 3] > 20
    if not mask.any():
        return out
    rgb = rgba[:, :, :3].astype(np.float32)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    masked = lum[mask]
    lo, hi = float(masked.min()), float(masked.max())
    span = max(hi - lo, 1.0)
    norm = np.clip((lum - lo) / span, 0.0, 1.0)
    white = np.stack(
        [
            np.clip(188 + norm * 67, 0, 255),
            np.clip(182 + norm * 63, 0, 255),
            np.clip(162 + norm * 58, 0, 255),
        ],
        axis=2,
    )
    out[:, :, :3][mask] = white[mask].astype(np.uint8)
    return out


def extract_bright_structure(
    bgr: np.ndarray,
    cx: int,
    cy: int,
    half: int,
    *,
    lum_percentile: float = 92,
    anchor_dy: int = -25,
    pad: int = 2,
) -> np.ndarray | None:
    """Isolate bright neutral structures (town mosque) from parchment map tiles."""
    h, w = bgr.shape[:2]
    x0, x1 = max(0, cx - half), min(w, cx + half)
    y0, y1 = max(0, cy - half), min(h, cy + half)
    roi = bgr[y0 : y1 + 1, x0 : x1 + 1]
    rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    mask = (lum >= np.percentile(lum, lum_percentile)).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    px = cx - x0
    py = max(0, min(roi.shape[0] - 1, cy - y0 + anchor_dy))
    comp_id = pick_component_id(mask, px, py, min_area=30, max_area=900, max_aspect=3.2)
    if comp_id is None:
        comp_id = pick_component_id(mask, cx - x0, cy - y0, min_area=30, max_area=900, max_aspect=3.2)
    if comp_id is None:
        return None

    labels = cv2.connectedComponentsWithStats(mask, connectivity=8)[1]
    kept = np.zeros_like(mask)
    kept[labels == comp_id] = mask[labels == comp_id]

    ys, xs = np.where(kept > 0)
    if xs.size == 0:
        return None
    bx0, bx1 = max(0, xs.min() - pad), min(roi.shape[1] - 1, xs.max() + pad)
    by0, by1 = max(0, ys.min() - pad), min(roi.shape[0] - 1, ys.max() + pad)
    crop = rgb[by0 : by1 + 1, bx0 : bx1 + 1]
    sub = kept[by0 : by1 + 1, bx0 : bx1 + 1]

    rgba = np.zeros((*crop.shape[:2], 4), dtype=np.uint8)
    rgba[:, :, :3] = crop
    rgba[:, :, 3] = sub
    return trim_alpha(rgba, pad=1)


def extract_flood(
    bgr: np.ndarray,
    cx: int,
    cy: int,
    half: int,
    *,
    pad: int = 4,
    min_area: int = 120,
) -> np.ndarray | None:
    h, w = bgr.shape[:2]
    x0, x1 = max(0, cx - half), min(w, cx + half)
    y0, y1 = max(0, cy - half), min(h, cy + half)
    roi = bgr[y0 : y1 + 1, x0 : x1 + 1]
    rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
    alpha = flood_parchment(rgb, tolerance=12)

    px, py = cx - x0, cy - y0
    labels = cv2.connectedComponentsWithStats((alpha > 20).astype(np.uint8), connectivity=8)[1]
    label_at = labels[py, px] if alpha[py, px] > 20 else 0
    if label_at == 0:
        comp_id = pick_component_id(alpha, px, py, max_aspect=3.0, min_area=min_area)
        if comp_id is None:
            return None
        label_at = comp_id

    kept = np.zeros_like(alpha)
    kept[labels == label_at] = alpha[labels == label_at]

    rgba = np.zeros((*rgb.shape[:2], 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb
    rgba[:, :, 3] = kept
    return trim_alpha(rgba, pad=pad)


def extract_icon(stype: str, src: Path, kind: str, cx: int, cy: int, half: int) -> Path:
    bgr = cv2.imread(str(src))
    if bgr is None:
        raise FileNotFoundError(src)

    if kind == "flood":
        rgba = extract_flood(bgr, cx, cy, half)
    elif kind == "flood_gate":
        rgba = extract_flood(bgr, cx, cy, half, pad=2, min_area=35)
        if rgba is not None:
            rgba = neutralize_guild_color(rgba)
    elif kind == "flood_neutral":
        rgba = extract_flood(bgr, cx, cy, half)
        if rgba is not None:
            rgba = neutralize_guild_color(rgba)
    elif kind == "yellow_gate":
        rgba = extract_colored(bgr, cx, cy, half, "yellow", pad=0, dilate=4)
        if rgba is not None:
            rgba = neutralize_guild_color(rgba)
            rgba = trim_alpha(rgba, pad=0)
    elif kind == "bright_town":
        rgba = extract_bright_structure(bgr, cx, cy, half)
        if rgba is not None:
            rgba = neutralize_guild_color(rgba)
            rgba = to_white_structure(rgba)
    elif kind == "yellow_town":
        rgba = extract_colored(
            bgr, cx, cy, half, "yellow", pad=2, dilate=0, max_component_area=3500
        )
        if rgba is not None:
            rgba = neutralize_guild_color(rgba)
            rgba = trim_alpha(rgba, pad=1)
    elif kind == "yellow_white":
        rgba = extract_colored(bgr, cx, cy, half, "yellow", pad=4, dilate=10)
        if rgba is not None:
            rgba = neutralize_guild_color(rgba)
            rgba = to_white_structure(rgba)
    elif kind == "yellow_neutral":
        rgba = extract_colored(
            bgr, cx, cy, half, "yellow",
            pad=4,
            dilate=10,
        )
        if rgba is not None:
            rgba = neutralize_guild_color(rgba)
    elif kind == "flood_white":
        rgba = extract_flood(bgr, cx, cy, half)
        if rgba is not None:
            rgba = to_white_structure(rgba)
    else:
        rgba = extract_colored(
            bgr, cx, cy, half, kind,
            pad=4,
            dilate=0 if kind == "blue" else 10,
        )

    if rgba is None:
        raise RuntimeError(f"failed to extract {stype}")

    out = ICONS / f"{stype.lower()}.png"
    Image.fromarray(rgba).save(out, "PNG")
    return out


def opaque_pct(path: Path) -> float:
    im = Image.open(path).convert("RGBA")
    a = np.array(im)[:, :, 3]
    return 100.0 * (a > 20).sum() / a.size


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    extracted = []
    for stype, filename, kind, cx, cy, half in ICON_SOURCES:
        src = SHOTS / filename
        if not src.exists():
            print(f"skip {stype}: missing {filename}")
            continue
        out = extract_icon(stype, src, kind, cx, cy, half)
        im = Image.open(out)
        extracted.append(stype)
        print(f"  {stype} -> {out.name} {im.size} opaque={opaque_pct(out):.1f}%")

    MANIFEST.write_text(
        json.dumps({"screenshots": SCREENSHOT_REFS, "icons": extracted}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {MANIFEST} — {len(extracted)} icons")


if __name__ == "__main__":
    main()