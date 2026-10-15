# -*- mode: python ; coding: utf-8 -*-
"""
PlaylistOut PyInstaller Spec
============================
Packages the PlaylistOut Unified CLI into a single-file console executable.
Bundles package.json for runtime version resolution.
"""

import os
import sys

# Compute repository root from spec location
SPEC_DIR = os.path.dirname(os.path.abspath(SPEC))
REPO_ROOT = os.path.abspath(os.path.join(SPEC_DIR, "..", ".."))

# Data files to bundle:
# 1. package.json for version single-source-of-truth in frozen mode
datas = [
    (os.path.join(REPO_ROOT, "package.json"), "."),
]

# Exclusions: only exclude pytest and project tests, preserve standard library
excludes = [
    "pytest",
    "_pytest",
    "cli.tests",
    "scripts.utils.test_insights_authenticity",
]

# Windows executable icon
icon_path = os.path.join(REPO_ROOT, "web", "public", "favicon.ico")
if not (sys.platform == "win32" and os.path.isfile(icon_path)):
    icon_path = None

a = Analysis(
    [os.path.join(REPO_ROOT, "cli", "playlistout.py")],
    pathex=[REPO_ROOT],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="PlaylistOut",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_path,
)
