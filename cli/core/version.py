# -*- coding: utf-8 -*-
"""
Playlist Out CLI Version Resolver
=================================
Reads version from the root package.json (single source of truth).
In frozen mode, reads the bundled package.json from sys._MEIPASS.
In frozen mode or strict release mode, fails closed if the version cannot be determined.
In source development mode, returns 'unknown-dev' if package.json cannot be found.
"""

import json
import os
import sys
from typing import Optional

_CACHED_VERSION: Optional[str] = None


def get_version(strict: bool = False) -> str:
    """
    Get the Playlist Out version string.
    :param strict: If True, raise RuntimeError if version cannot be determined.
                   Always True in frozen mode.
    """
    global _CACHED_VERSION
    if _CACHED_VERSION is not None:
        return _CACHED_VERSION

    # 1. Frozen mode: must read from sys._MEIPASS
    if getattr(sys, "frozen", False):
        base_dir = getattr(sys, "_MEIPASS", None)
        if base_dir:
            pkg_path = os.path.join(base_dir, "package.json")
            if os.path.isfile(pkg_path):
                try:
                    with open(pkg_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    version = (data.get("version") or "").strip()
                    if version:
                        _CACHED_VERSION = version
                        return _CACHED_VERSION
                except Exception as e:
                    raise RuntimeError(f"Corrupted version metadata in frozen bundle: {e}") from e
        raise RuntimeError("Missing version metadata in frozen bundle (package.json not found in sys._MEIPASS)")

    # 2. Source development mode: search upwards for root package.json
    current_dir = os.path.dirname(os.path.abspath(__file__))
    search_dir = current_dir
    for _ in range(5):
        pkg_path = os.path.join(search_dir, "package.json")
        if os.path.isfile(pkg_path):
            try:
                with open(pkg_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("name") == "playlistout" and data.get("version"):
                    _CACHED_VERSION = data["version"].strip()
                    return _CACHED_VERSION
            except Exception as e:
                if strict:
                    raise RuntimeError(f"Failed to parse root package.json: {e}") from e
        parent = os.path.dirname(search_dir)
        if parent == search_dir:
            break
        search_dir = parent

    if strict:
        raise RuntimeError("Could not find root package.json version source of truth")

    return "unknown-dev"


__version__ = get_version()
