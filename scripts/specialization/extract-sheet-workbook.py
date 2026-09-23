#!/usr/bin/env python3
"""Extract the Unit Specilization workbook into a normalized evidence snapshot.

Source artifact: database/specialization-sheet-unit-specilization.xlsx, the
community workbook maintained by Ivan & CrazyDD / ΜΟΛΩΝ ΛΑΒΕ (youtube.com/@TheRocNoobs).

The workbook is the authoritative record for per-node Virtue Badge (medal) costs:
every troop tab holds the tower's four researches stacked vertically, and each
research lists its nodes with a per-level cost and an exact section total.

Output: database/specialization-sheet/evidence.json — a review-friendly snapshot that
scripts/specialization/build-sheet-evidence.mjs turns into the shipped data module.

Usage:
    python scripts/specialization/extract-sheet-workbook.py
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKBOOK = REPO_ROOT / "database" / "specialization-sheet-unit-specilization.xlsx"
OUTPUT = REPO_ROOT / "database" / "specialization-sheet" / "evidence.json"

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
CELL_RE = re.compile(r"^([A-Z]+)(\d+)$")
TAB_RE = re.compile(r"^(Footman|Cavalry|Archer) Training (I|II|III|IV|V|VI|VII|VIII|IX|X)$")
TROOP_BY_TAB = {"Footman": "footman", "Cavalry": "cavalry", "Archer": "archer"}
ROMAN = {name: index for index, name in enumerate(
    ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"], start=1
)}

SPREADSHEET_ID = "1ZR9d38cXAbEfbEnp1QqVZtlRFGbliDMVW76NBMGfXPg"


def column_index(reference: str) -> int:
    letters = CELL_RE.match(reference).group(1)
    index = 0
    for letter in letters:
        index = index * 26 + (ord(letter) - ord("A") + 1)
    return index - 1


def load_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = []
    for entry in root.findall(f"{{{MAIN_NS}}}si"):
        strings.append("".join(node.text or "" for node in entry.iter(f"{{{MAIN_NS}}}t")))
    return strings


def cell_text(cell: ET.Element, shared: list[str]) -> str:
    kind = cell.get("t")
    if kind == "inlineStr":
        node = cell.find(f"{{{MAIN_NS}}}is")
        return "".join(part.text or "" for part in node.iter(f"{{{MAIN_NS}}}t")) if node is not None else ""
    value = cell.find(f"{{{MAIN_NS}}}v")
    if value is None:
        return ""
    if kind == "s":
        return shared[int(value.text)]
    return value.text or ""


def number(text: str) -> int | float | None:
    cleaned = text.replace(",", "").replace("%", "").strip()
    if cleaned == "":
        return None
    try:
        value = float(cleaned)
    except ValueError:
        return None
    return int(value) if value.is_integer() else value


def read_rows(archive: zipfile.ZipFile, target: str, shared: list[str]) -> list[dict[int, str]]:
    root = ET.fromstring(archive.read(target))
    rows = []
    for row in root.iter(f"{{{MAIN_NS}}}row"):
        cells: dict[int, str] = {}
        for cell in row.findall(f"{{{MAIN_NS}}}c"):
            reference = cell.get("r")
            if not reference:
                continue
            cells[column_index(reference)] = cell_text(cell, shared)
        if cells:
            rows.append(cells)
    return rows


def label(text: str) -> str:
    """Google writes whole numbers as floats ("1.0"); keep node labels tidy."""
    cleaned = text.strip()
    return cleaned[:-2] if re.fullmatch(r"\d+\.0+", cleaned) else cleaned


def parse_tab(rows: list[dict[int, str]]) -> list[dict]:
    """Split a troop tab into its vertically stacked research sections."""
    sections: list[dict] = []
    current: dict | None = None
    for cells in rows:
        first = label(cells.get(0) or "")
        second = (cells.get(1) or "").strip()
        if second == "Skill":
            continue
        if first == "":
            # Section total row: the next node number sits in column D, the total in
            # column F. A blank "next number" means the section simply ends.
            total = number(cells.get(5, ""))
            if current is not None and total not in (None, 0):
                current["total"] = total
                sections.append(current)
                current = None
            continue
        if not first.replace(".", "").isdigit():
            continue
        if current is None:
            current = {"nodes": []}
        costs = []
        level1 = number(cells.get(3, ""))
        level2 = number(cells.get(4, ""))
        if level1 is not None:
            costs.append(level1)
        if level2 is not None:
            costs.append(level2)
        current["nodes"].append(
            {
                "sourceRow": first,
                "name": second,
                "buff": (cells.get(2) or "").strip(),
                "costs": costs,
            }
        )
    if current is not None and current["nodes"]:
        sections.append(current)
    return sections


def render_snapshot(payload: dict) -> str:
    """One node per line, so a changed cost is a one-line diff."""
    lines = ['{']
    for key, value in payload.items():
        if key == "tabs":
            continue
        lines.append(f' {json.dumps(key)}: {json.dumps(value, ensure_ascii=False)},')
    lines.append(' "tabs": [')
    tab_blocks = []
    for tab in payload["tabs"]:
        section_blocks = []
        for section in tab["sections"]:
            nodes = ",\n".join(
                '        ' + json.dumps(node, ensure_ascii=False) for node in section["nodes"]
            )
            section_blocks.append(
                "     {\n"
                f'      "index": {section["index"]},\n'
                f'      "total": {json.dumps(section["total"])},\n'
                '      "nodes": [\n'
                f"{nodes}\n"
                "      ]\n"
                "     }"
            )
        tab_blocks.append(
            "  {\n"
            f'   "tab": {json.dumps(tab["tab"], ensure_ascii=False)},\n'
            f'   "troop": {json.dumps(tab["troop"])},\n'
            f'   "tower": {tab["tower"]},\n'
            '   "sections": [\n'
            + ",\n".join(section_blocks)
            + "\n   ]\n"
            "  }"
        )
    lines.append(",\n".join(tab_blocks))
    lines.append(" ]")
    lines.append("}")
    rendered = "\n".join(lines) + "\n"
    if json.loads(rendered) != payload:
        raise SystemExit("snapshot render did not round-trip; refusing to write")
    return rendered


def main() -> int:
    if not WORKBOOK.exists():
        print(f"missing workbook: {WORKBOOK}", file=sys.stderr)
        return 1

    archive = zipfile.ZipFile(WORKBOOK)
    shared = load_shared_strings(archive)
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {
        relationship.get("Id"): relationship.get("Target")
        for relationship in relationships
    }
    sheets = [
        (sheet.get("name"), "xl/" + targets[sheet.get(f"{{{REL_NS}}}id")].lstrip("/"))
        for sheet in workbook.find(f"{{{MAIN_NS}}}sheets")
    ]

    tabs = []
    problems = []
    for name, target in sheets:
        match = TAB_RE.match(name)
        if not match:
            continue
        sections = parse_tab(read_rows(archive, target, shared))
        for index, section in enumerate(sections, start=1):
            section["index"] = index
            listed = section.get("total")
            summed = sum(cost for node in section["nodes"] for cost in node["costs"])
            if listed is None:
                problems.append(f"{name} section {index}: no stated total")
            elif listed != summed:
                problems.append(f"{name} section {index}: stated {listed} != summed {summed}")
            for node in section["nodes"]:
                if not node["costs"]:
                    problems.append(f"{name} section {index}: node {node['sourceRow']} has no cost")
        tabs.append(
            {
                "tab": name,
                "troop": TROOP_BY_TAB[match.group(1)],
                "tower": ROMAN[match.group(2)],
                "sections": sections,
            }
        )

    tabs.sort(key=lambda tab: (tab["tower"], tab["troop"]))
    payload = {
        "spreadsheetId": SPREADSHEET_ID,
        "title": "Unit Specilization",
        "maintainers": "Ivan & CrazyDD / ΜΟΛΩΝ ΛΑΒΕ",
        "maintainersUrl": "https://www.youtube.com/@TheRocNoobs",
        "observedAt": "2026-09-23",
        "workbookSha256": hashlib.sha256(WORKBOOK.read_bytes()).hexdigest(),
        "workbookFile": WORKBOOK.name,
        "tabs": tabs,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render_snapshot(payload), encoding="utf-8")

    node_count = sum(len(section["nodes"]) for tab in tabs for section in tab["sections"])
    cell_count = sum(
        len(node["costs"]) for tab in tabs for section in tab["sections"] for node in section["nodes"]
    )
    print(f"tabs={len(tabs)} sections={sum(len(tab['sections']) for tab in tabs)} nodes={node_count} costCells={cell_count}")
    print(f"wrote {OUTPUT.relative_to(REPO_ROOT)} (sha256 {payload['workbookSha256'][:12]}…)")
    if problems:
        print(f"{len(problems)} problem(s):")
        for problem in problems[:20]:
            print("  -", problem)
        return 1
    print("all sections reconcile with their stated totals")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
