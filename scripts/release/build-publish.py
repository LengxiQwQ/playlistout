#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PlaylistOut One-Click Release Builder
=====================================
Builds standalone executables and packages them directly into the root 'publish/' directory.
Automatically verifies version consistency, builds the host target (Windows/Linux/macOS),
supports local dual-target builds (Windows + Linux via Docker or WSL),
calculates SHA-256 checksums, and opens the destination folder.

Usage:
  python scripts/release/build-publish.py
  npm run build:publish
  python scripts/release/build-publish.py --no-open
"""

import os
import sys
import shutil
import hashlib
import platform
import argparse
import subprocess
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

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from cli.core.version import get_version

import importlib.util
_BUILD_CLI_PATH = SCRIPT_DIR / "build-cli.py"
_spec = importlib.util.spec_from_file_location("build_cli_mod", str(_BUILD_CLI_PATH))
_build_cli_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_build_cli_mod)

build_cli = _build_cli_mod.build_cli
detect_host_target = _build_cli_mod.detect_host_target
SUPPORTED_TARGETS = _build_cli_mod.SUPPORTED_TARGETS


def compute_sha256(file_path: Path) -> str:
    """计算文件的 SHA-256 哈希值"""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()


def reveal_path(target_path: Path):
    """跨平台打开目录或定位文件"""
    try:
        abs_p = str(target_path.resolve())
        if platform.system() == "Windows":
            os.startfile(abs_p)
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", abs_p])
        else:
            subprocess.Popen(["xdg-open", abs_p])
    except Exception:
        pass


def is_docker_available() -> bool:
    """检查当前系统是否安装并运行 Docker 守护进程"""
    if not shutil.which("docker"):
        return False
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except Exception:
        return False


def build_linux_via_docker(publish_dir: Path, version: str) -> bool:
    """在 Windows 宿主机上借助 Docker 容器编译原生 Linux 单文件产物"""
    print("\n" + "=" * 68)
    print("🐳 检测到 Docker 环境，正在启动 Linux 容器进行交叉编译 (linux-x64)...")
    print("=" * 68)

    posix_repo = str(REPO_ROOT.resolve()).replace("\\", "/")
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{posix_repo}:/app",
        "-w", "/app",
        "python:3.14-slim",
        "bash", "-c",
        "apt-get update -qq && apt-get install -y -qq binutils gcc >/dev/null 2>&1 && "
        "pip install -q -r cli/requirements-release.txt && "
        "python scripts/release/build-cli.py --target linux-x64"
    ]
    try:
        result = subprocess.run(docker_cmd)
        if result.returncode == 0:
            linux_tar = REPO_ROOT / "dist" / "cli" / "artifacts" / f"PlaylistOut-v{version}-linux-x64.tar.gz"
            if linux_tar.is_file():
                shutil.copy2(linux_tar, publish_dir / linux_tar.name)
                print(f"[✓] Docker Linux 编译成功！产物已就绪: {linux_tar.name}")
                return True
        print("[-] Docker Linux 编译失败，请检查 Docker 控制台输出")
    except Exception as e:
        print(f"[-] Docker 启动异常: {e}")
    return False


def is_wsl_available() -> bool:
    """检查 Windows 系统是否安装并可用 WSL (含 python3)"""
    if sys.platform != "win32" or not shutil.which("wsl"):
        return False
    try:
        res = subprocess.run(
            ["wsl", "-e", "bash", "-c", "python3 --version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return res.returncode == 0
    except Exception:
        return False


def build_linux_via_wsl(publish_dir: Path, version: str) -> bool:
    """在 Windows 宿主机上借助 WSL 编译原生 Linux 单文件产物"""
    print("\n" + "=" * 68)
    print("🐧 检测到 WSL 环境，正在启动 WSL 进行 Linux 编译 (linux-x64)...")
    print("=" * 68)
    try:
        p_res = subprocess.run(
            ["wsl", "wslpath", "-a", str(REPO_ROOT)],
            capture_output=True,
            text=True
        )
        if p_res.returncode != 0:
            return False
        wsl_repo_path = p_res.stdout.strip()

        cmd = [
            "wsl", "-e", "bash", "-c",
            f"cd '{wsl_repo_path}' && "
            "python3 -m pip install -q -r cli/requirements-release.txt && "
            "python3 scripts/release/build-cli.py --target linux-x64"
        ]
        result = subprocess.run(cmd)
        if result.returncode == 0:
            linux_tar = REPO_ROOT / "dist" / "cli" / "artifacts" / f"PlaylistOut-v{version}-linux-x64.tar.gz"
            if linux_tar.is_file():
                shutil.copy2(linux_tar, publish_dir / linux_tar.name)
                print(f"[✓] WSL Linux 编译成功！产物已就绪: {linux_tar.name}")
                return True
        print("[-] WSL Linux 编译失败，请检查终端日志")
    except Exception as e:
        print(f"[-] WSL 编译异常: {e}")
    return False


def main():
    parser = argparse.ArgumentParser(
        description="PlaylistOut 一键打包发布脚本 (自动编译并将最终资产输出至 publish/ 目录)"
    )
    parser.add_argument(
        "--target",
        choices=SUPPORTED_TARGETS,
        default=None,
        help="目标平台 (默认自动检测当前宿主机操作系统: windows-x64 / linux-x64 / macos-arm64 / macos-x64)",
    )
    parser.add_argument(
        "--output-dir",
        default="publish",
        help="输出归集目录名 (默认: publish)",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="编译完成后不自动打开目标文件夹",
    )

    args = parser.parse_args()

    # 1. 严格校验版本一致性
    version = get_version(strict=True)
    host_target = detect_host_target()
    target = args.target or host_target

    print("=" * 68)
    print("🚀 PlaylistOut 一键发布构建器 (One-Click Release Publisher)")
    print(f"   当前版本:   v{version}")
    print(f"   宿主平台:   {platform.platform()} ({host_target})")
    print(f"   发布目录:   {args.output_dir}/")
    print("=" * 68)

    # 2. 准备输出目录 (publish/)
    publish_dir = REPO_ROOT / args.output_dir
    publish_dir.mkdir(parents=True, exist_ok=True)

    built_assets = []

    # 3. 编译宿主目标 (Windows 或 Linux 等)
    print(f"\n[*] 正在启动 PyInstaller 构建当前平台版本 ({target})...")
    asset_file = build_cli(target=target, expected_version=version)
    dest_asset = publish_dir / asset_file.name
    shutil.copy2(asset_file, dest_asset)
    built_assets.append(dest_asset)
    print(f"[✓] {target} 构建成功，已归集: {dest_asset.name}")

    # 4. 本地双端构建扩展 (Windows 宿主下额外尝试编译 Linux)
    if host_target == "windows-x64":
        linux_built = False
        if is_docker_available():
            linux_built = build_linux_via_docker(publish_dir, version)
        elif is_wsl_available():
            linux_built = build_linux_via_wsl(publish_dir, version)

        if linux_built:
            built_assets.append(publish_dir / f"PlaylistOut-v{version}-linux-x64.tar.gz")
        else:
            print("\n" + "─" * 68)
            print("💡 本地双端构建提示 (Windows + Linux)：")
            print("   • 本地编译 Linux 原生二进制需要虚拟化运行环境支持 (Docker 或 WSL)。")
            print("   • 本地编译方式：启动 Docker Desktop 或运行 wsl --install 配置 WSL，")
            print("     再次运行本脚本将全自动同时打出 Windows + Linux 双端安装包！")
            print(f"   • 云端一键草稿：推送 Tag 标签 (git tag v{version} && git push origin v{version})，")
            print("     GitHub Actions 将全自动矩阵构建 Win/Linux/Mac 全平台并自动创建好 Release 草稿！")
            print("─" * 68)

    # 5. 更新并维护统一的 SHA-256 校验和清单
    checksum_file = publish_dir / "SHA256SUMS.txt"
    checksums = {}
    if checksum_file.is_file():
        for line in checksum_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and "  " in line:
                h, name = line.split("  ", 1)
                checksums[name.strip()] = h.strip()

    for item in built_assets:
        cur_hash = compute_sha256(item)
        checksums[item.name] = cur_hash

    lines = [f"{checksums[name]}  {name}" for name in sorted(checksums.keys())]
    checksum_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n[✓] 已更新校验和文件: {checksum_file.name}")

    # 6. 生成发布指引说明
    guide_file = publish_dir / "README.txt"
    guide_lines = [
        f"PlaylistOut 单文件发布清单 (Release v{version})",
        "=" * 50,
        f"打包环境: {platform.platform()}",
        "",
        "发布产物列表：",
    ]
    for asset in sorted(built_assets, key=lambda x: x.name):
        size_mb = asset.stat().st_size / (1024 * 1024)
        guide_lines.append(f"  • {asset.name} ({size_mb:.2f} MB)")
        guide_lines.append(f"    SHA-256: {checksums.get(asset.name, 'N/A')}")
        guide_lines.append("")

    guide_lines.extend([
        "使用说明：",
        "- Windows: 双击 .exe 即可运行，按 Ctrl+C 退出后将保留在命令行提示符下，绝不闪退。",
        "- Linux: 解压 tar.gz 后，在终端中执行 ./PlaylistOut 即可。",
        "- 开源仓库: https://github.com/LengxiQwQ/playlistout",
    ])
    guide_file.write_text("\n".join(guide_lines), encoding="utf-8")

    print("\n" + "=" * 68)
    print("🎉 打包完成！全部文件已就绪在发布目录：")
    print(f"   📂 目标路径: {publish_dir.resolve()}")
    for asset in built_assets:
        size_mb = asset.stat().st_size / (1024 * 1024)
        print(f"   📦 产物文件: {asset.name} ({size_mb:.2f} MB)")
    print("=" * 68 + "\n")

    if not args.no_open:
        reveal_path(publish_dir)


if __name__ == "__main__":
    main()
