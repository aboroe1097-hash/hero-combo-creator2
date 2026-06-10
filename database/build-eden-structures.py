#!/usr/bin/env python3
"""Deprecated — use build-eden-datasets.py instead."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
subprocess.check_call([sys.executable, str(ROOT / "database" / "build-eden-datasets.py")])