#!/usr/bin/env python3
"""Build js/eden-datasets.generated.js from database/*.txt per eden-datasets.manifest.json"""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "database"
MANIFEST = DB / "eden-datasets.manifest.json"
OUT_JS = ROOT / "js" / "eden-datasets.generated.js"

SECTOR_LABELS = {
    "C": "Central Sector",
    "N": "North Sector",
    "NE": "North East Sector",
    "NW": "North West Sector",
    "NC": "North Central Sector",
    "E": "East Sector",
    "EC": "Eastern Central Sector",
    "W": "West Sector",
    "WC": "West Central Sector",
    "S": "South Sector",
    "SC": "South Central Sector",
    "SE": "South East Sector",
    "SW": "South West Sector",
    "N1": "North Sector 1",
    "N2": "North Sector 2",
    "N3": "North Sector 3",
    "N4": "North Sector 4",
    "S2": "South Sector 2",
    "S3": "South Sector 3",
    "S4": "South Sector 4",
}

TYPE_ALIASES = {
    "CP?": "CP1",
    "?": "CP1",
}

HEADER_ALIASES = {
    "structure": "type",
    "stype": "type",
    "ov": "points",
}


def zone_prefix(zone: str) -> str:
    return str(zone).split(",")[0].strip().lower()


def make_id(sector: str, zone: str, stype: str, index: int) -> str:
    zp = zone_prefix(zone)
    sec = str(sector).strip().lower()
    t = str(stype).strip().lower()
    if zp == sec or str(zone).strip() == str(sector).strip():
        return f"{sec}-{t}-{index}"
    return f"{zp}-{t}-{index}"


def is_intish(value: str) -> bool:
    try:
        int(float(value))
        return True
    except (TypeError, ValueError):
        return False


def normalize_type(raw: str) -> str:
    t = str(raw or "").strip()
    return TYPE_ALIASES.get(t, t)


def parse_row(fields: list[str], line_no: int, path: Path) -> dict:
    if len(fields) < 6:
        raise SystemExit(f"{path.name} row {line_no}: expected at least 6 columns, got {len(fields)}")

    sector = fields[0].strip()
    zone = fields[1].strip()
    stype = fields[2].strip()
    x_raw = fields[3]
    y_raw = fields[4]
    points_raw = fields[5] if len(fields) > 5 else ""
    guild = fields[6].strip() if len(fields) > 6 else ""

    # Malformed rows: zone suffix and type occupy extra columns before x/y.
    if len(fields) >= 7 and not is_intish(x_raw) and is_intish(fields[4]) and is_intish(fields[5]):
        zone = f"{zone},{fields[2].strip()}"
        stype = fields[3].strip()
        x_raw = fields[4]
        y_raw = fields[5]
        points_raw = fields[6] if len(fields) > 6 else ""
        guild = fields[7].strip() if len(fields) > 7 else ""

    if not is_intish(x_raw) or not is_intish(y_raw):
        raise SystemExit(f"{path.name} row {line_no}: invalid coordinates ({x_raw}, {y_raw})")

    stype = normalize_type(stype)
    if not sector or not zone or not stype:
        raise SystemExit(f"{path.name} row {line_no}: sector, zone, and type are required")

    points = int(float(points_raw)) if str(points_raw).strip() else None

    return {
        "sector": sector,
        "zone": zone,
        "type": stype,
        "x": int(float(x_raw)),
        "y": int(float(y_raw)),
        "points": points,
        "guild": guild,
    }


def read_delimited(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8-sig")
    delimiter = ";" if ";" in text.splitlines()[0] else ","
    rows = []
    reader = csv.reader(text.splitlines(), delimiter=delimiter)
    header = None
    col_idx: dict[str, int] = {}

    for line_no, fields in enumerate(reader, start=1):
        if not fields or all(not str(f).strip() for f in fields):
            continue
        if header is None:
            header = [HEADER_ALIASES.get(str(h).strip().lower(), str(h).strip().lower()) for h in fields]
            col_idx = {h: i for i, h in enumerate(header)}
            for required in ("sector", "zone", "type", "x", "y"):
                if required not in col_idx:
                    raise SystemExit(f"{path.name}: missing column '{required}' in header {header}")
            continue

        if "sector" in col_idx:
            x_val = fields[col_idx["x"]] if col_idx["x"] < len(fields) else ""
            y_val = fields[col_idx["y"]] if col_idx["y"] < len(fields) else ""
            if not is_intish(x_val) or not is_intish(y_val):
                rows.append(parse_row(fields, line_no, path))
                continue
            row = {
                "sector": fields[col_idx["sector"]].strip(),
                "zone": fields[col_idx["zone"]].strip(),
                "type": normalize_type(fields[col_idx["type"]].strip()),
                "x": int(float(x_val)),
                "y": int(float(y_val)),
                "points": None,
                "guild": "",
            }
            if "points" in col_idx and col_idx["points"] < len(fields) and fields[col_idx["points"]].strip():
                row["points"] = int(float(fields[col_idx["points"]]))
            if "guild" in col_idx and col_idx["guild"] < len(fields):
                row["guild"] = fields[col_idx["guild"]].strip()
            if "id" in col_idx and col_idx["id"] < len(fields) and fields[col_idx["id"]].strip():
                row["id"] = fields[col_idx["id"]].strip()
            rows.append(row)
        else:
            rows.append(parse_row(fields, line_no, path))

    return rows


def build_sector_map(rows: list[dict]) -> dict[str, list]:
    by_sector: dict[str, list] = defaultdict(list)
    type_counts: dict[tuple[str, str], int] = defaultdict(int)

    for row in sorted(rows, key=lambda r: (r["sector"], r["zone"], r["type"], r["y"], r["x"])):
        sec = row["sector"]
        type_counts[(sec, row["type"])] += 1
        struct_id = row.get("id") or make_id(sec, row["zone"], row["type"], type_counts[(sec, row["type"])])
        entry = {
            "id": struct_id,
            "zone": row["zone"],
            "type": row["type"],
            "x": row["x"],
            "y": row["y"],
            "guild": row.get("guild", "") or "",
        }
        if row.get("points") is not None:
            entry["points"] = row["points"]
        by_sector[sec].append(entry)

    return dict(by_sector)


def build_full_sectors(sector_map: dict[str, list]) -> dict:
    sectors = {}
    pad = 48

    for sector_key, structures in sorted(sector_map.items()):
        zones = sorted({s["zone"] for s in structures}, key=lambda z: (len(z), z))
        xs = [s["x"] for s in structures]
        ys = [s["y"] for s in structures]
        zone_centers = {}
        for zone in zones:
            zs = [s for s in structures if s["zone"] == zone]
            ax = sum(s["x"] for s in zs) / len(zs)
            ay = sum(s["y"] for s in zs) / len(zs)
            zone_centers[zone] = {"x": round(ax), "y": round(ay)}

        landmark = next((s for s in structures if s["type"] in ("AT", "WCB", "WC8")), None)
        if landmark:
            key = landmark["zone"] if landmark["zone"] in zone_centers else zones[0]
            zone_centers[key] = {"x": landmark["x"], "y": landmark["y"]}

        sectors[sector_key] = {
            "label": SECTOR_LABELS.get(sector_key, f"{sector_key} Sector"),
            "zones": zones,
            "bounds": {
                "minX": min(xs) - pad,
                "maxX": max(xs) + pad,
                "minY": min(ys) - pad,
                "maxY": max(ys) + pad,
            },
            "zoneCenters": zone_centers,
            "structures": structures,
        }

    return sectors


def js_string(value) -> str:
    return json.dumps(value, ensure_ascii=True)


def emit_structure(s: dict) -> str:
    parts = [
        f"id: {js_string(s['id'])}",
        f"zone: {js_string(s['zone'])}",
        f"type: {js_string(s['type'])}",
        f"x: {s['x']}",
        f"y: {s['y']}",
    ]
    if "points" in s:
        parts.append(f"points: {s['points']}")
    parts.append(f"guild: {js_string(s.get('guild', ''))}")
    return "{ " + ", ".join(parts) + " }"


def emit_sector(sector_key: str, sector: dict, indent: str) -> list[str]:
    lines = [f"{indent}{js_string(sector_key)}: {{"]
    lines.append(f"{indent}  label: {js_string(sector['label'])},")
    lines.append(f"{indent}  zones: {json.dumps(sector['zones'], ensure_ascii=True)},")
    b = sector["bounds"]
    lines.append(
        f"{indent}  bounds: {{ minX: {b['minX']}, maxX: {b['maxX']}, minY: {b['minY']}, maxY: {b['maxY']} }},"
    )
    lines.append(f"{indent}  zoneCenters: {{")
    for zone, center in sorted(sector["zoneCenters"].items()):
        lines.append(f"{indent}    {js_string(zone)}: {{ x: {center['x']}, y: {center['y']} }},")
    lines.append(f"{indent}  }},")
    lines.append(f"{indent}  structures: [")
    for s in sector["structures"]:
        lines.append(f"{indent}    {emit_structure(s)},")
    lines.append(f"{indent}  ],")
    lines.append(f"{indent}}},")
    return lines


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    catalog = []
    overlays = {}
    full_sectors = {}
    built_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for ds in manifest["datasets"]:
        entry = {
            "id": ds["id"],
            "labelKey": ds["labelKey"],
            "descKey": ds["descKey"],
            "sectorMode": ds.get("sectorMode", "merge"),
            "replaceSectors": ds.get("replaceSectors", []),
            "source": ds.get("file"),
            "structureCount": 0,
        }
        file_name = ds.get("file")
        if file_name:
            path = DB / file_name
            if not path.exists():
                entry["missingFile"] = file_name
            else:
                rows = read_delimited(path)
                sector_map = build_sector_map(rows)
                overlays[ds["id"]] = sector_map
                if ds.get("sectorMode") == "full":
                    full_sectors[ds["id"]] = build_full_sectors(sector_map)
                entry["structureCount"] = len(rows)
                entry["sectors"] = sorted(sector_map.keys())
        catalog.append(entry)

    lines = [
        "// AUTO-GENERATED — do not edit",
        "// Rebuild: python database/build-eden-datasets.py",
        f"// Built: {built_at}",
        "",
        "export const EDEN_DATASETS_BUILT_AT = " + js_string(built_at) + ";",
        "",
        "export const EDEN_DATASET_CATALOG = " + json.dumps(catalog, indent=2) + ";",
        "",
        "export const EDEN_DATASET_SECTORS = {",
    ]
    for ds_id, sectors in full_sectors.items():
        lines.append(f"  {js_string(ds_id)}: {{")
        for sector_key, sector in sorted(sectors.items()):
            lines.extend(emit_sector(sector_key, sector, "    "))
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("export const EDEN_DATASET_OVERLAYS = {")
    for ds_id, sector_map in overlays.items():
        lines.append(f"  {js_string(ds_id)}: {{")
        for sector, structs in sorted(sector_map.items()):
            lines.append(f"    {js_string(sector)}: [")
            for s in structs:
                lines.append(f"      {emit_structure(s)},")
            lines.append("    ],")
        lines.append("  },")
    lines.append("};")
    lines.append("")

    OUT_JS.write_text("\n".join(lines), encoding="utf-8")
    counts = ", ".join(f"{d['id']}={d.get('structureCount', 0)}" for d in catalog)
    print(f"Wrote {OUT_JS} — {counts}")


if __name__ == "__main__":
    main()