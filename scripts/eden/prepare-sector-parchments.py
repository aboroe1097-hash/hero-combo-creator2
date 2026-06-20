#!/usr/bin/env python3
"""Crop & clean per-sector reference sheets — map parchment only, no tables/logo."""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC_MANIFEST = ROOT / "assets" / "eden_wonders" / "manifest.json"
OUT_DIR = ROOT / "assets" / "eden-reference" / "sector-parchments"
OUT_MANIFEST = OUT_DIR / "manifest.json"

PARCHMENT_BGR = (158, 196, 212)  # #d4c4a0
PAD = 4


def _colorful_mask(hsv: np.ndarray) -> np.ndarray:
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    return (s > 38) & (v > 55)


def _near_white_mask(hsv: np.ndarray) -> np.ndarray:
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    return (s < 38) & (v > 205)


def _gray_chrome_mask(hsv: np.ndarray) -> np.ndarray:
    s, v = hsv[:, :, 1], hsv[:, :, 2]
    return (s < 28) & (v > 75) & (v < 215)


def find_map_extent(colorful: np.ndarray, min_run: int = 120) -> tuple[int, int]:
    """Longest vertical band of map pixels (stops before coordinate table)."""
    h, w = colorful.shape[:2]
    x0, x1 = int(w * 0.08), int(w * 0.92)
    best = (0, 0, 0)
    run_start = None
    for y in range(36, h):
        frac = colorful[y, x0:x1].mean()
        if frac > 0.05:
            if run_start is None:
                run_start = y
        elif run_start is not None:
            run_len = y - run_start
            if run_len > best[2]:
                best = (run_start, y - 1, run_len)
            run_start = None
    if run_start is not None:
        run_len = h - run_start
        if run_len > best[2]:
            best = (run_start, h - 1, run_len)
    if best[2] < min_run:
        return 36, int(h * 0.72)
    return best[0], best[1]


def horizontal_extent(colorful: np.ndarray, top: int, bottom: int) -> tuple[int, int]:
    region = colorful[top : bottom + 1, :]
    if not region.any():
        return 0, colorful.shape[1] - 1
    ys, xs = np.where(region)
    return int(xs.min()), int(xs.max())


def crop_map_only(bgr: np.ndarray) -> tuple[np.ndarray, dict]:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    colorful = _colorful_mask(hsv)
    h, w = bgr.shape[:2]

    top, bottom = find_map_extent(colorful)
    left, right = horizontal_extent(colorful, top, bottom)

    top = max(0, top - PAD)
    bottom = min(h - 1, bottom + PAD)
    left = max(0, left - PAD)
    right = min(w - 1, right + PAD)

    crop = bgr[top : bottom + 1, left : right + 1].copy()
    meta = {
        "left": left,
        "top": top,
        "width": right - left + 1,
        "height": bottom - top + 1,
        "sourceWidth": w,
        "sourceHeight": h,
    }
    return crop, meta


def light_clean(bgr: np.ndarray) -> np.ndarray:
    """Remove battle-gray margins and corner logo only — keep map art intact."""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    hh, ww = bgr.shape[:2]
    gray = _gray_chrome_mask(hsv)
    near_white = _near_white_mask(hsv)
    h, s, v = cv2.split(hsv)
    gold = (h < 38) & (s > 55) & (v > 85)

    edge = np.zeros((hh, ww), bool)
    mx = max(8, int(ww * 0.07))
    my = max(8, int(hh * 0.06))
    edge[:my, :] = True
    edge[hh - my :, :] = True
    edge[:, :mx] = True
    edge[:, ww - mx :] = True

    logo = np.zeros((hh, ww), bool)
    logo[int(hh * 0.68) :, int(ww * 0.48) :] = True

    replace = edge & (gray | near_white)
    replace |= logo & (gold | gray | near_white)

    out = bgr.copy()
    out[replace] = PARCHMENT_BGR
    return out


def main() -> None:
    if not SRC_MANIFEST.exists():
        raise SystemExit(f"Missing {SRC_MANIFEST}")

    src_meta = json.loads(SRC_MANIFEST.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    sectors_out = []
    for entry in src_meta.get("sectors", []):
        sid = entry["id"]
        src_path = ROOT / "assets" / "eden_wonders" / entry["file"]
        if not src_path.exists():
            print(f"SKIP missing {src_path}")
            continue

        bgr = cv2.imread(str(src_path))
        if bgr is None:
            print(f"SKIP unreadable {src_path}")
            continue

        cropped, crop = crop_map_only(bgr)
        cleaned = light_clean(cropped)
        out_name = f"{sid}.png"
        out_path = OUT_DIR / out_name
        cv2.imwrite(str(out_path), cleaned, [cv2.IMWRITE_PNG_COMPRESSION, 3])

        sectors_out.append({
            "id": sid,
            "label": entry.get("label", sid),
            "file": out_name,
            "source": f"assets/eden_wonders/{entry['file']}",
            "imageSize": [cleaned.shape[1], cleaned.shape[0]],
            "pixelCrop": crop,
        })
        print(f"{sid}: {crop['sourceWidth']}x{crop['sourceHeight']} -> {cleaned.shape[1]}x{cleaned.shape[0]}")

    manifest = {
        "version": 2,
        "label": "Processed sector parchments (map only — no tables/logo)",
        "sourceManifest": "assets/eden_wonders/manifest.json",
        "sectors": sectors_out,
    }
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {len(sectors_out)} parchments to {OUT_DIR}")
    print(f"Wrote {OUT_MANIFEST}")


if __name__ == "__main__":
    main()