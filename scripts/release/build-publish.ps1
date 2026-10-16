<#
.SYNOPSIS
    PlaylistOut 一键打包发布脚本 (PowerShell 版)
.DESCRIPTION
    自动调用 Python 打包引擎，在本地构建 Windows 单文件 exe，
    若检测到 Docker 则自动在容器内交叉编译 Linux 单文件 tar.gz，
    产物统一输出至项目根目录 publish/ 文件夹。
#>

[CmdletBinding()]
param(
    [string]$Target,
    [string]$OutputDir = "publish",
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path "$ScriptDir\..\.."

Set-Location $RepoRoot

$PyArgs = @("scripts/release/build-publish.py", "--output-dir", $OutputDir)

if ($Target) {
    $PyArgs += @("--target", $Target)
}
if ($NoOpen) {
    $PyArgs += "--no-open"
}

python @PyArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "打包编译失败，退出码: $LASTEXITCODE"
    exit $LASTEXITCODE
}
