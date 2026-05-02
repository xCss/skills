#!/usr/bin/env python3
"""Compatibility-stable entry point for the Bilibili publishing workflow CLI."""
from __future__ import annotations

import sys
import importlib
from collections.abc import Callable
from pathlib import Path
from typing import cast

SKILL_ROOT = Path(__file__).resolve().parents[1]
if str(SKILL_ROOT) not in sys.path:
    sys.path.insert(0, str(SKILL_ROOT))

commands_module = importlib.import_module("bilibili_publish.commands")
main = cast(Callable[[list[str] | None], int], getattr(commands_module, "main"))


if __name__ == "__main__":
    raise SystemExit(main(None))
