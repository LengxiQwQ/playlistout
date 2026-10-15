#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PlaylistOut CLI Standalone Build Orchestrator
=============================================
Builds and packages the PlaylistOut standalone executable for the current platform.
Executes platform-local PyInstaller builds and packages standard release archives.

Targets:
  - windows-x64: PlaylistOut-v{version}-windows-x64.exe
  - linux-x64:   PlaylistOut-v{version}-linux-x64.tar.gz
  - macos-arm64: PlaylistOut-v{version}-macos-arm64.tar.gz
  - macos-x64:   PlaylistOut-v{version}-macos-x64.tar.gz

Usage:
  python scripts/release/build-cli.py
  python scripts/release/build-cli.py --target windows-x64
  python scripts/release/build-cli.py --target linux-x64 --version 2.2.0
"""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

# Configure stdout/stderr for UTF-8 on Windows
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from cli.core.version import get_version

SUPPORTED_TARGETS = ("windows-x64", "linux-x64", "macos-arm64", "macos-x64")


def detect_host_target() -> str:
    """Detect platform target from current running OS and architecture."""
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "windows":
        if machine in ("amd64", "x86_64"):
            return "windows-x64"
        raise RuntimeError(f"Unsupported Windows CPU architecture: {machine}")
    elif system == "linux":
        if machine in ("x86_64", "amd64"):
            return "linux-x64"
        raise RuntimeError(f"Unsupported Linux CPU architecture: {machine}")
    elif system == "darwin":
        if machine in ("arm64", "aarch64"):
            return "macos-arm64"
        elif machine in ("x86_64", "amd64"):
            return "macos-x64"
        raise RuntimeError(f"Unsupported macOS CPU architecture: {machine}")
    else:
        raise RuntimeError(f"Unsupported operating system: {system}")


def generate_windows_version_file(version: str, target_path: Path):
    """Generate PyInstaller Windows VSVersionInfo file dynamically from single version source."""
    import re
    from PyInstaller.utils.win32.versioninfo import (
        VSVersionInfo, FixedFileInfo, StringFileInfo, StringTable, StringStruct, VarFileInfo, VarStruct
    )

    nums = [int(x) for x in re.findall(r'\d+', version)]
    while len(nums) < 4:
        nums.append(0)
    ver_tuple = tuple(nums[:4])

    vi = VSVersionInfo(
        ffi=FixedFileInfo(
            filevers=ver_tuple,
            prodvers=ver_tuple,
            mask=0x3F,
            flags=0x0,
            OS=0x40004,
            fileType=0x1,
            subtype=0x0,
            date=(0, 0)
        ),
        kids=[
            StringFileInfo([
                StringTable(
                    '040904b0',
                    [
                        StringStruct('CompanyName', 'LengxiQwQ'),
                        StringStruct('FileDescription', 'Playlist Out CLI'),
                        StringStruct('FileVersion', version),
                        StringStruct('InternalName', 'PlaylistOut'),
                        StringStruct('LegalCopyright', 'Copyright (c) 2026 LengxiQwQ. Released under MIT License.'),
                        StringStruct('OriginalFilename', 'PlaylistOut.exe'),
                        StringStruct('ProductName', 'Playlist Out'),
                        StringStruct('ProductVersion', version),
                    ]
                )
            ]),
            VarFileInfo([VarStruct('Translation', [1033, 1200])])
        ]
    )
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(str(vi), encoding='utf-8')
    print(f"[✓] Generated Windows VERSIONINFO resource at: {target_path}")


def clean_cli_build_dirs(work_dir: Path, dist_dir: Path, staging_dir: Path, artifacts_dir: Path):
    """Clean only CLI-owned build and staging directories."""
    for path in (work_dir, dist_dir, staging_dir, artifacts_dir):
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
    for path in (work_dir, dist_dir, staging_dir, artifacts_dir):
        path.mkdir(parents=True, exist_ok=True)


def build_cli(target: str, expected_version: str = None) -> Path:
    host_target = detect_host_target()
    if target != host_target:
        raise RuntimeError(
            f"Cannot build target '{target}' on host platform '{host_target}'. "
            "Cross-compilation is not supported by PyInstaller."
        )

    version = get_version(strict=True)
    if expected_version and expected_version != version:
        raise RuntimeError(
            f"Version mismatch: requested '{expected_version}' but package.json is '{version}'"
        )

    print("=" * 64)
    print(f"[*] Building PlaylistOut Standalone CLI")
    print(f"   Target:    {target}")
    print(f"   Version:   v{version}")
    print(f"   Python:    {platform.python_version()} ({platform.architecture()[0]})")
    print(f"   Host:      {platform.platform()}")
    print("=" * 64)

    # Scoped CLI-owned workspace directories
    cli_build_base = REPO_ROOT / ".build" / "cli"
    work_dir = cli_build_base / "work"
    dist_dir = cli_build_base / "dist"
    staging_dir = REPO_ROOT / "dist" / "cli" / "staging"
    artifacts_dir = REPO_ROOT / "dist" / "cli" / "artifacts"

    clean_cli_build_dirs(work_dir, dist_dir, staging_dir, artifacts_dir)

    # For Windows targets, generate native VSVersionInfo resource dynamically
    if target == "windows-x64":
        version_file = cli_build_base / "version_info.txt"
        generate_windows_version_file(version, version_file)

    spec_file = REPO_ROOT / "cli" / "packaging" / "playlistout.spec"
    if not spec_file.is_file():
        raise FileNotFoundError(f"PyInstaller spec file missing at: {spec_file}")

    # Invoke PyInstaller with isolated workpath and distpath
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--workpath", str(work_dir),
        "--distpath", str(dist_dir),
        str(spec_file),
    ]

    print(f"[*] Executing PyInstaller: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(REPO_ROOT))
    if result.returncode != 0:
        raise RuntimeError(f"PyInstaller build failed with exit code {result.returncode}")

    binary_name = "PlaylistOut.exe" if sys.platform == "win32" else "PlaylistOut"
    built_binary = dist_dir / binary_name
    if not built_binary.is_file():
        raise FileNotFoundError(f"Expected binary not found after build: {built_binary}")

    # Stage the raw executable
    staged_binary = staging_dir / binary_name
    shutil.copy2(built_binary, staged_binary)
    if sys.platform != "win32":
        os.chmod(staged_binary, 0o755)
    print(f"[✓] Executable staged at: {staged_binary}")

    # Package according to target conventions
    if target == "windows-x64":
        asset_name = f"PlaylistOut-v{version}-windows-x64.exe"
        final_asset = artifacts_dir / asset_name
        shutil.copy2(staged_binary, final_asset)
        print(f"[✓] Windows standalone asset created: {final_asset}")

    elif target == "linux-x64":
        asset_name = f"PlaylistOut-v{version}-linux-x64.tar.gz"
        final_asset = artifacts_dir / asset_name
        with tarfile.open(final_asset, "w:gz") as tar:
            tar.add(staged_binary, arcname="PlaylistOut")
        print(f"[✓] Linux tar.gz archive created: {final_asset}")

    elif target in ("macos-arm64", "macos-x64"):
        # Create double-clickable .command launcher for macOS
        command_script = staging_dir / "PlaylistOut.command"
        command_content = (
            "#!/bin/sh\n"
            'DIR="$(cd "$(dirname "$0")" && pwd)"\n'
            'exec "$DIR/PlaylistOut" "$@"\n'
        )
        command_script.write_text(command_content, encoding="utf-8")
        os.chmod(command_script, 0o755)

        asset_name = f"PlaylistOut-v{version}-{target}.tar.gz"
        final_asset = artifacts_dir / asset_name
        with tarfile.open(final_asset, "w:gz") as tar:
            tar.add(staged_binary, arcname="PlaylistOut")
            tar.add(command_script, arcname="PlaylistOut.command")
        print(f"[✓] macOS archive created (with .command launcher): {final_asset}")

    else:
        raise ValueError(f"Unknown target: {target}")

    # Generate staging manifest for CI / build validation
    manifest = {
        "project": "PlaylistOut",
        "target": target,
        "version": version,
        "asset_name": asset_name,
        "asset_path": str(final_asset),
        "staged_binary": str(staged_binary),
        "python_version": platform.python_version(),
        "platform": platform.platform(),
    }
    manifest_path = artifacts_dir / "staging-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print("\n" + "=" * 64)
    print(f"[✓] Build completed successfully!")
    print(f"   Asset:   {final_asset.name} ({final_asset.stat().st_size:,} bytes)")
    print(f"   Binary:  {staged_binary}")
    print("=" * 64 + "\n")
    return final_asset


def main():
    parser = argparse.ArgumentParser(description="PlaylistOut CLI Release Builder")
    parser.add_argument(
        "--target",
        choices=SUPPORTED_TARGETS,
        default=None,
        help="Target platform (defaults to auto-detection from host OS/arch)",
    )
    parser.add_argument(
        "--version",
        default=None,
        help="Expected version (must match root package.json if supplied)",
    )

    args = parser.parse_args()
    target = args.target or detect_host_target()

    try:
        build_cli(target, expected_version=args.version)
    except Exception as e:
        print(f"\n[-] Build failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
