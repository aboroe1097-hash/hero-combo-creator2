#!/usr/bin/env python3
"""Analyze season5 north sector gaps."""
import csv
from pathlib import Path

DB = Path(__file__).resolve().parent


def load(path):
    return list(csv.DictReader(path.open(encoding="utf-8-sig"), delimiter=";"))


s3 = load(DB / "Eden_Normal_NorthvSouth_Season3_Map.txt")
s5 = load(DB / "Eden_Wonders_NorthvSouth_Season5_Map.txt")
c3 = {(r["x"], r["y"]) for r in s3}
c5 = {(r["x"], r["y"]) for r in s5}
print("coord overlap s3/s5:", len(c3 & c5))

n1 = [r for r in s5 if r["sector"] == "N1"]
n4 = [r for r in s5 if r["sector"] == "N4"]
print("N1==N4 rows:", len(n1), len(n4), "identical:", n1 == n4)

# N3 y range vs NE y range in s3
n3 = [r for r in s5 if r["sector"] == "N3"]
ne = [r for r in s3 if r["sector"] == "NE"]
print("N3 y max:", max(int(r["y"]) for r in n3))
print("NE y max:", max(int(r["y"]) for r in ne))
print("N3 structures with y>305:", sum(1 for r in n3 if int(r["y"]) > 305))