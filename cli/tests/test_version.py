# -*- coding: utf-8 -*-
"""
Tests for PlaylistOut Version Resolver & Consistency
"""

import json
import os
import sys
from pathlib import Path
import pytest

from cli.core.version import get_version, _CACHED_VERSION


def test_version_consistency_across_packages():
    """Verify that root, web, and worker package.json share identical versions matching get_version()."""
    repo_root = Path(__file__).resolve().parents[2]

    root_pkg = json.loads((repo_root / "package.json").read_text(encoding="utf-8"))
    web_pkg = json.loads((repo_root / "web" / "package.json").read_text(encoding="utf-8"))
    worker_pkg = json.loads((repo_root / "worker" / "package.json").read_text(encoding="utf-8"))

    version = get_version(strict=True)

    assert root_pkg["version"] == version
    assert web_pkg["version"] == version
    assert worker_pkg["version"] == version
    assert version != "unknown-dev"
    assert len(version.split(".")) >= 3


def test_frozen_version_fail_closed(monkeypatch):
    """When frozen, missing package.json must fail closed (raise RuntimeError)."""
    import cli.core.version as version_mod
    monkeypatch.setattr(version_mod, "_CACHED_VERSION", None)
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "_MEIPASS", "/nonexistent/meipass/path", raising=False)

    with pytest.raises(RuntimeError, match="Missing version metadata in frozen bundle"):
        version_mod.get_version()


def test_frozen_version_reads_meipass(tmp_path, monkeypatch):
    """When frozen and package.json is present in _MEIPASS, return its version."""
    import cli.core.version as version_mod
    monkeypatch.setattr(version_mod, "_CACHED_VERSION", None)
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path), raising=False)

    pkg_file = tmp_path / "package.json"
    pkg_file.write_text(json.dumps({"name": "playlistout", "version": "9.9.9"}), encoding="utf-8")

    assert version_mod.get_version() == "9.9.9"
