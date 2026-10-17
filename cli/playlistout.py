# -*- coding: utf-8 -*-
"""
Playlist Out CLI Entry Point
============================
Main unified executable entrypoint (alias for main.py).
"""

import os
import sys

_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_CURRENT_DIR, ".."))
for _p in (_REPO_ROOT, _CURRENT_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from cli.main import main, run_cli_entry

if __name__ == "__main__":
    run_cli_entry()
