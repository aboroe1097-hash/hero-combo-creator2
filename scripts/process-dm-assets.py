"""Classify, crop, and validate the supplied DM equipment captures.

The source screenshots do not have reliable dimensions for distinguishing asset
types, so this script uses a reviewed filename-to-item map and verifies every
tier against the dominant HSV colour of the cropped equipment card.

The script is intentionally non-destructive: it creates or overwrites only the
mapped tiered equipment PNGs and ``assets/dm/asset-mapping.json``. Existing flat
equipment, material, stockpile, and enhancement assets are never removed.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import TypedDict

from PIL import Image


SOURCE_PREFIX = "WhatsApp Image 2026-07-13 at "
SOURCE_SUFFIX = ".jpeg"
CRAFT_CARD_CROP = (255, 280, 461, 486)
OUTPUT_SIZE = (128, 128)
VALID_TIERS = ("blue", "purple", "gold")
VALID_SLOTS = ("accessory", "amulet", "armor", "boots", "helmet", "weapon")
DRAGONITE_PER_NORMAL_PIECE = {"blue": 140, "purple": 696, "gold": 17_300}


class AssetSpec(TypedDict):
    set_id: str
    tier: str
    slot: str
    item: str
    crop: tuple[int, int, int, int]
    source_format: str


def source_name(timestamp: str) -> str:
    return f"{SOURCE_PREFIX}{timestamp}{SOURCE_SUFFIX}"


def craft_specs(
    set_id: str,
    item: str,
    slot: str,
    timestamps: dict[str, str],
) -> dict[str, AssetSpec]:
    return {
        source_name(timestamp): {
            "set_id": set_id,
            "tier": tier,
            "slot": slot,
            "item": item,
            "crop": CRAFT_CARD_CROP,
            "source_format": "craft-screen",
        }
        for tier, timestamp in timestamps.items()
    }


CLASSIFICATIONS: dict[str, AssetSpec] = {}
OPTIONAL_SOURCES: set[str] = set()


def register(specs: dict[str, AssetSpec]) -> None:
    overlap = CLASSIFICATIONS.keys() & specs.keys()
    if overlap:
        raise RuntimeError(f"Duplicate source classification: {sorted(overlap)}")
    CLASSIFICATIONS.update(specs)


# Steel Cavalry: Feathered Helm is absent from the original source folder and
# is accepted as three optional supplemental captures.
register(
    craft_specs(
        "steel-cavalry",
        "Steel Cavalry Cowl",
        "accessory",
        {"blue": "12.39.47", "purple": "12.39.57", "gold": "12.40.01"},
    )
)


def supplemental_craft_spec(filename: str, tier: str, item: str, slot: str) -> None:
    register(
        {
            filename: {
                "set_id": "steel-cavalry",
                "tier": tier,
                "slot": slot,
                "item": item,
                "crop": CRAFT_CARD_CROP,
                "source_format": "supplemental-craft-screen",
            }
        }
    )
    OPTIONAL_SOURCES.add(filename)


supplemental_craft_spec(
    "codex-clipboard-77fb9027-9186-4c04-8986-dd0479b78065.png",
    "blue",
    "Steel Cavalry Feathered Helm",
    "helmet",
)
supplemental_craft_spec(
    "codex-clipboard-b5fa4bca-c5e8-47c5-96f0-c1694b052638.png",
    "purple",
    "Steel Cavalry Feathered Helm",
    "helmet",
)
supplemental_craft_spec(
    "codex-clipboard-5e1e88ed-a29f-4f98-8ee3-fad5681af1e6.png",
    "gold",
    "Steel Cavalry Feathered Helm",
    "helmet",
)
register(
    craft_specs(
        "steel-cavalry",
        "Steel Cavalry Jade Belt",
        "amulet",
        {"blue": "12.39.48 (1)", "purple": "12.39.52", "gold": "12.39.49 (1)"},
    )
)
register(
    craft_specs(
        "steel-cavalry",
        "Steel Cavalry Golden Plate",
        "armor",
        {"blue": "12.39.48", "purple": "12.39.54", "gold": "12.39.53"},
    )
)
register(
    craft_specs(
        "steel-cavalry",
        "Steel Cavalry Greaves",
        "boots",
        {"blue": "12.39.51", "purple": "12.39.49", "gold": "12.39.54 (1)"},
    )
)
register(
    craft_specs(
        "steel-cavalry",
        "Steel Cavalry Ranseur",
        "weapon",
        {"blue": "12.39.59 (1)", "purple": "12.40.02", "gold": "12.40.03 (1)"},
    )
)

# Ranger.
register(
    craft_specs(
        "ranger",
        "Ranger's Heart",
        "accessory",
        {"blue": "12.39.58", "purple": "12.39.59", "gold": "12.40.14"},
    )
)
register(
    craft_specs(
        "ranger",
        "Ranger's Soul",
        "amulet",
        {"blue": "12.40.06 (1)", "purple": "12.40.00 (1)", "gold": "12.39.55 (1)"},
    )
)
register(
    craft_specs(
        "ranger",
        "Ranger's Suit",
        "armor",
        {"blue": "12.39.53 (1)", "purple": "12.40.00", "gold": "12.40.05"},
    )
)
register(
    craft_specs(
        "ranger",
        "Ranger's Boots",
        "boots",
        {"blue": "12.40.03", "purple": "12.40.04", "gold": "12.39.53 (2)"},
    )
)
register(
    craft_specs(
        "ranger",
        "Ranger's Headband",
        "helmet",
        {"blue": "12.40.09", "purple": "12.39.59 (2)", "gold": "12.39.55"},
    )
)
register(
    craft_specs(
        "ranger",
        "Ranger's Long Bow",
        "weapon",
        {"blue": "12.40.05 (2)", "purple": "12.40.05 (1)", "gold": "12.40.08"},
    )
)

# Dreadnaught.
register(
    craft_specs(
        "dreadnaught",
        "Dreadnaught's Bulwark",
        "accessory",
        {"blue": "12.40.20", "purple": "12.40.24", "gold": "12.40.07"},
    )
)
register(
    craft_specs(
        "dreadnaught",
        "Dreadnaught's Calling",
        "amulet",
        {"blue": "12.40.21 (2)", "purple": "12.40.12", "gold": "12.40.10 (3)"},
    )
)
register(
    craft_specs(
        "dreadnaught",
        "Dreadnaught's Ebony Plate",
        "armor",
        {"blue": "12.40.06", "purple": "12.40.10 (2)", "gold": "12.40.10"},
    )
)
register(
    craft_specs(
        "dreadnaught",
        "Dreadnaught's Treads",
        "boots",
        {"blue": "12.40.22", "purple": "12.40.17 (1)", "gold": "12.40.15 (2)"},
    )
)
register(
    craft_specs(
        "dreadnaught",
        "Dreadnaught's Crown",
        "helmet",
        {"blue": "12.40.18", "purple": "12.40.20 (1)", "gold": "12.40.26 (2)"},
    )
)
register(
    craft_specs(
        "dreadnaught",
        "Dreadnaught's Sabre",
        "weapon",
        {"blue": "12.40.13", "purple": "12.40.15 (1)", "gold": "12.40.17"},
    )
)


def dragon_spec(
    timestamp: str,
    tier: str,
    slot: str,
    item: str,
    crop: tuple[int, int, int, int],
) -> None:
    register(
        {
            source_name(timestamp): {
                "set_id": "dragon-master",
                "tier": tier,
                "slot": slot,
                "item": item,
                "crop": crop,
                "source_format": "card-crop",
            }
        }
    )


# Dragon Master captures have varying framing, so each crop was measured against
# the visible coloured card border rather than inferred from image dimensions.
dragon_spec("12.40.10 (1)", "gold", "helmet", "Dragon Master's Crown", (63, 149, 377, 463))
dragon_spec("12.40.11", "gold", "amulet", "Dragon Master's Golden Belt", (100, 161, 413, 474))
dragon_spec("12.40.16", "gold", "armor", "Dragon Master's Breastplate", (118, 199, 430, 511))
dragon_spec("12.40.21", "gold", "boots", "Dragon Master's Sabatons", (94, 160, 407, 473))
dragon_spec("12.40.23", "gold", "weapon", "Dragon Master's Blade", (77, 147, 391, 461))
dragon_spec("12.40.26", "gold", "accessory", "Dragon Master's Stiletto", (73, 134, 387, 448))

dragon_spec("12.40.19", "purple", "helmet", "Dragon Master's Crown", (84, 144, 398, 458))
dragon_spec("12.40.21 (1)", "purple", "armor", "Dragon Master's Breastplate", (108, 152, 422, 466))
dragon_spec("12.40.24 (1)", "purple", "amulet", "Dragon Master's Golden Belt", (106, 148, 419, 461))
dragon_spec("12.40.24 (2)", "purple", "accessory", "Dragon Master's Stiletto", (87, 150, 401, 464))
dragon_spec("12.40.25", "purple", "weapon", "Dragon Master's Blade", (89, 136, 403, 450))
dragon_spec("12.40.26 (1)", "purple", "boots", "Dragon Master's Sabatons", (101, 152, 415, 466))

dragon_spec("12.40.13 (1)", "blue", "armor", "Dragon Master's Breastplate", (94, 162, 408, 476))
dragon_spec("12.40.15", "blue", "weapon", "Dragon Master's Blade", (76, 144, 390, 458))
dragon_spec("12.40.20 (2)", "blue", "boots", "Dragon Master's Sabatons", (112, 164, 426, 478))
dragon_spec("12.40.26 (3)", "blue", "helmet", "Dragon Master's Crown", (78, 138, 392, 452))
dragon_spec("12.40.27 (1)", "blue", "amulet", "Dragon Master's Golden Belt", (145, 158, 459, 472))
dragon_spec("12.40.27", "blue", "accessory", "Dragon Master's Stiletto", (76, 131, 390, 445))


EXPECTED_OUTPUTS = {
    f"equipment/{set_id}/{tier}/{slot}.png"
    for set_id in ("dragon-master", "ranger", "dreadnaught", "steel-cavalry")
    for tier in VALID_TIERS
    for slot in VALID_SLOTS
}


def detect_tier(card: Image.Image) -> tuple[str, dict[str, int]]:
    """Return the dominant tier colour using PIL HSV values."""
    hue_ranges = {
        "gold": (14, 54),
        "blue": (142, 178),
        "purple": (177, 223),
    }
    counts: Counter[str] = Counter()
    hsv = card.convert("RGB").convert("HSV")
    pixels = hsv.get_flattened_data() if hasattr(hsv, "get_flattened_data") else hsv.getdata()
    for hue, saturation, value in pixels:
        if saturation < 64 or value < 50:
            continue
        for tier, (minimum, maximum) in hue_ranges.items():
            if minimum <= hue <= maximum:
                counts[tier] += 1
                break
    result = {tier: counts[tier] for tier in VALID_TIERS}
    detected = max(result, key=result.get)
    if result[detected] < card.width * card.height * 0.12:
        raise ValueError(f"Tier colour is not dominant enough for safe classification: {result}")
    return detected, result


def source_images(source_dir: Path, supplemental_sources: list[Path]) -> dict[str, Path]:
    images = {
        path.name: path
        for path in source_dir.iterdir()
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    }
    for path in supplemental_sources:
        if not path.is_file():
            raise ValueError(f"Supplemental source does not exist: {path}")
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            raise ValueError(f"Unsupported supplemental source type: {path}")
        if path.name in images:
            raise ValueError(f"Duplicate source filename: {path.name}")
        images[path.name] = path
    return images


def output_path(output_dir: Path, spec: AssetSpec) -> Path:
    return output_dir / "equipment" / spec["set_id"] / spec["tier"] / f'{spec["slot"]}.png'


def validate_specs(images: dict[str, Path]) -> None:
    unknown = sorted(images.keys() - CLASSIFICATIONS.keys())
    missing = sorted((CLASSIFICATIONS.keys() - OPTIONAL_SOURCES) - images.keys())
    if unknown or missing:
        details = []
        if unknown:
            details.append(f"unclassified source files: {unknown}")
        if missing:
            details.append(f"mapped source files not found: {missing}")
        raise ValueError("; ".join(details))

    targets = []
    for spec in CLASSIFICATIONS.values():
        if spec["tier"] not in VALID_TIERS or spec["slot"] not in VALID_SLOTS:
            raise ValueError(f"Invalid classification: {spec}")
        targets.append((spec["set_id"], spec["tier"], spec["slot"]))
    duplicates = [target for target, count in Counter(targets).items() if count > 1]
    if duplicates:
        raise ValueError(f"Multiple sources map to the same output: {duplicates}")


def process(
    source_dir: Path,
    supplemental_sources: list[Path],
    output_dir: Path,
    mapping_path: Path,
) -> dict[str, object]:
    images = source_images(source_dir, supplemental_sources)
    validate_specs(images)
    records: list[dict[str, object]] = []

    for name in sorted(images):
        spec = CLASSIFICATIONS[name]
        source = images[name]
        target = output_path(output_dir, spec)
        target.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(source) as opened:
            original = opened.convert("RGB")
            crop = spec["crop"]
            if crop[0] < 0 or crop[1] < 0 or crop[2] > original.width or crop[3] > original.height:
                raise ValueError(f"Crop {crop} exceeds {name} dimensions {original.size}")
            card = original.crop(crop)
            detected_tier, tier_pixels = detect_tier(card)
            if detected_tier != spec["tier"]:
                raise ValueError(
                    f"Tier mismatch for {name}: mapped={spec['tier']} detected={detected_tier} "
                    f"counts={tier_pixels}"
                )
            resized = card.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
            resized.save(target, format="PNG", optimize=True)
            source_dimensions = [original.width, original.height]

        relative_target = target.relative_to(output_dir.parent.parent).as_posix()
        record: dict[str, object] = {
            "source": name,
            "sourceDimensions": source_dimensions,
            "kind": "equipment",
            "set": spec["set_id"],
            "tier": spec["tier"],
            "item": spec["item"],
            "gameSlot": spec["slot"],
            "filename": f'{spec["slot"]}.png',
            "output": relative_target,
            "crop": list(spec["crop"]),
            "sourceFormat": spec["source_format"],
            "classificationMethod": "reviewed-visible-name-and-icon; tier-verified-by-hsv",
            "detectedTier": detected_tier,
            "tierPixelCounts": tier_pixels,
            "outputDimensions": list(OUTPUT_SIZE),
        }
        if spec["set_id"] != "dragon-master":
            record["craftingResources"] = {
                "dragonite": DRAGONITE_PER_NORMAL_PIECE[spec["tier"]]
            }
        records.append(record)

    produced = {
        Path(record["output"]).relative_to("assets/dm").as_posix()
        for record in records
    }
    missing_expected = sorted(EXPECTED_OUTPUTS - produced)
    mapping: dict[str, object] = {
        "schemaVersion": 1,
        "sourceDirectory": source_dir.name,
        "supplementalSources": [path.name for path in supplemental_sources],
        "summary": {
            "sourceFiles": len(images),
            "equipmentFiles": len(records),
            "materialFiles": 0,
            "outputsWritten": len(records),
            "normalGearDragonitePerPiece": DRAGONITE_PER_NORMAL_PIECE,
            "missingExpectedEquipment": missing_expected,
            "notes": [
                "All supplied source images are equipment; no standalone material source images were present.",
                "Existing material, stockpile, enhancement, and flat equipment assets were left unchanged.",
            ],
        },
        "assets": records,
    }
    mapping_path.parent.mkdir(parents=True, exist_ok=True)
    mapping_path.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return mapping


def validate_outputs(output_dir: Path, mapping: dict[str, object] | None = None) -> list[str]:
    errors: list[str] = []
    for path in output_dir.rglob("*"):
        if not path.is_file():
            continue
        normalized = path.as_posix()
        expected = None
        if "/equipment/" in normalized and path.suffix.lower() == ".png":
            expected = 128
        elif "/materials/" in normalized and "/stockpile/" not in normalized and path.suffix.lower() == ".png":
            expected = 56
        if expected is None:
            continue
        try:
            with Image.open(path) as image:
                if image.format != "PNG":
                    errors.append(f"{path}: format {image.format} != PNG")
                if image.size != (expected, expected):
                    errors.append(f"{path}: {image.size} != {expected}x{expected}")
        except OSError as error:
            errors.append(f"{path}: unreadable image ({error})")

    if mapping is not None:
        assets = mapping.get("assets", [])
        if not isinstance(assets, list):
            errors.append("asset-mapping.json: assets must be an array")
        elif len(assets) != mapping.get("summary", {}).get("sourceFiles"):
            errors.append(
                "asset-mapping.json: asset count does not match summary.sourceFiles"
            )
    return errors


def parse_args() -> argparse.Namespace:
    default_source = Path.home() / "Downloads" / "WhatsApp Unknown 2026-07-13 at 12.46.03"
    default_output = Path(__file__).resolve().parents[1] / "assets" / "dm"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=default_source, help="Folder containing source JPEGs")
    parser.add_argument(
        "--supplemental",
        action="append",
        type=Path,
        default=[],
        help="Additional mapped JPG/PNG source; repeat once per file",
    )
    parser.add_argument("--output", type=Path, default=default_output, help="assets/dm output directory")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate existing generated assets without rewriting them",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_dir = args.source.expanduser().resolve()
    supplemental_sources = [path.expanduser().resolve() for path in args.supplemental]
    output_dir = args.output.expanduser().resolve()
    mapping_path = output_dir / "asset-mapping.json"
    if not source_dir.is_dir():
        raise SystemExit(f"Source directory does not exist: {source_dir}")

    if args.validate_only:
        mapping = None
        if mapping_path.is_file():
            mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    else:
        mapping = process(source_dir, supplemental_sources, output_dir, mapping_path)

    errors = validate_outputs(output_dir, mapping)
    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    if args.validate_only:
        print("All dimensions valid")
    else:
        summary = mapping["summary"]
        print(
            f"Processed {summary['sourceFiles']} source files into "
            f"{summary['outputsWritten']} lossless equipment PNGs."
        )
        print(f"Mapping: {mapping_path}")
        print(f"Missing expected equipment: {len(summary['missingExpectedEquipment'])}")
        for path in summary["missingExpectedEquipment"]:
            print(f"- {path}")
        print("All dimensions valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
