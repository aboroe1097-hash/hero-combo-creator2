#!/usr/bin/env python3
"""Crop faction map to inner parchment, bake rotation, upscale for Eden planner."""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "faction-division.jpg"
OUT = ROOT / "assets" / "eden-reference" / "faction-division-map.png"
META = ROOT / "assets" / "eden-reference" / "faction-division-map.json"

WORLD_W = 1700
WORLD_H = 1600
# 2× world (3400×3200) + heavy source upscale ≈ 10× detail vs raw screenshot.
OUTPUT_SCALE = 2
SRC_UPSCALE = 10
# Matches browser rotation that looked correct (−π); baked into output.
SOURCE_ROTATION = cv2.ROTATE_180


def detect_inner_diamond(bgr: np.ndarray) -> np.ndarray:
    """Tight inner parchment diamond — excludes UI margins and torn border."""
    h, w = bgr.shape[:2]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    parchment = cv2.inRange(hsv, (8, 20, 85), (40, 110, 255))
    bright = cv2.threshold(gray, 95, 255, cv2.THRESH_BINARY)[1]
    mask = cv2.bitwise_and(parchment, bright)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    inner = cv2.erode(mask, kernel, iterations=14)

    left_pts = []
    right_pts = []
    for y in range(int(h * 0.15), int(h * 0.85)):
        row = np.where(inner[y] > 0)[0]
        if row.size < 25:
            continue
        lw, rw = int(row[0]), int(row[-1])
        if rw - lw > w * 0.85 or lw < 25 or rw > w - 25:
            continue
        left_pts.append([lw, y])
        right_pts.append([rw, y])

    if len(left_pts) < 10:
        raise SystemExit("Could not detect inner map diamond — check faction-division.jpg")

    left_pts = np.array(left_pts, dtype=np.float32)
    right_pts = np.array(right_pts, dtype=np.float32)
    widths = right_pts[:, 0] - left_pts[:, 0]

    upper = np.arange(len(widths)) < len(widths) * 0.55
    top_i = int(np.argmin(np.where(upper, widths, np.inf)))
    lower = np.arange(len(widths)) >= len(widths) * 0.45
    bottom_i = int(np.argmin(np.where(lower, widths, np.inf)))
    mid_i = int(np.argmax(widths))

    top = ((left_pts[top_i] + right_pts[top_i]) / 2).astype(np.float32)
    bottom = ((left_pts[bottom_i] + right_pts[bottom_i]) / 2).astype(np.float32)
    left = left_pts[mid_i].astype(np.float32)
    right = right_pts[mid_i].astype(np.float32)

    return np.array([top, right, bottom, left], dtype=np.float32)


def warp_to_world(bgr: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """Inverse-map world grid → screenshot; only sample inside inner diamond."""
    out_w = WORLD_W * OUTPUT_SCALE
    out_h = WORLD_H * OUTPUT_SCALE

    h, w = bgr.shape[:2]
    bgr = cv2.resize(
        bgr,
        (w * SRC_UPSCALE, h * SRC_UPSCALE),
        interpolation=cv2.INTER_LANCZOS4,
    )
    corners = corners * SRC_UPSCALE

    world_pts = np.array(
        [
            [WORLD_W / 2, 0],
            [WORLD_W, WORLD_H / 2],
            [WORLD_W / 2, WORLD_H],
            [0, WORLD_H / 2],
        ],
        dtype=np.float32,
    )
    homography = cv2.getPerspectiveTransform(world_pts, corners)

    grid_x, grid_y = np.meshgrid(
        np.arange(out_w, dtype=np.float32) / OUTPUT_SCALE,
        np.arange(out_h, dtype=np.float32) / OUTPUT_SCALE,
    )
    coords = np.stack([grid_x, grid_y, np.ones_like(grid_x)], axis=-1).reshape(-1, 3).T
    src = homography @ coords
    src_x = (src[0] / src[2]).reshape(out_h, out_w).astype(np.float32)
    src_y = (src[1] / src[2]).reshape(out_h, out_w).astype(np.float32)

    warped = cv2.remap(
        bgr,
        src_x,
        src_y,
        cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(26, 20, 14),
    )

    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    _, content = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)
    content = cv2.morphologyEx(
        content,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)),
        iterations=2,
    )
    warped = cv2.inpaint(warped, cv2.bitwise_not(content), 6, cv2.INPAINT_TELEA)
    return warped


def post_enhance(bgr: np.ndarray) -> np.ndarray:
    out = cv2.detailEnhance(bgr, sigma_s=10, sigma_r=0.12)
    blur = cv2.GaussianBlur(out, (0, 0), 0.9)
    return cv2.addWeighted(out, 1.45, blur, -0.45, 0)


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source image: {SRC}")

    bgr = cv2.imread(str(SRC))
    if bgr is None:
        raise SystemExit(f"Failed to read {SRC}")

    bgr = cv2.rotate(bgr, SOURCE_ROTATION)
    corners = detect_inner_diamond(bgr)
    warped = warp_to_world(bgr, corners)
    warped = post_enhance(warped)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT), warped, [cv2.IMWRITE_PNG_COMPRESSION, 3])

    meta = {
        "source": str(SRC.relative_to(ROOT)).replace("\\", "/"),
        "output": str(OUT.relative_to(ROOT)).replace("\\", "/"),
        "worldSize": [WORLD_W, WORLD_H],
        "imageSize": [warped.shape[1], warped.shape[0]],
        "outputScale": OUTPUT_SCALE,
        "srcUpscale": SRC_UPSCALE,
        "sourceRotation": "180",
        "bounds": {"minX": 0, "maxX": WORLD_W, "minY": 0, "maxY": WORLD_H},
        "layout": "rect",
        "corners": {
            "top": corners[0].tolist(),
            "right": corners[1].tolist(),
            "bottom": corners[2].tolist(),
            "left": corners[3].tolist(),
        },
    }
    META.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Wrote {OUT} ({warped.shape[1]}x{warped.shape[0]})")
    print(f"Wrote {META}")
    print("Corners:", corners.astype(int).tolist())


if __name__ == "__main__":
    main()