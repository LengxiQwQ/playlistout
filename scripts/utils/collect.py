#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GitHub 仓库洞察采集脚本（Repository Insights Collector）

每天抓取 GitHub Traffic API 数据并永久存档，防止 14 天窗口过期丢失：

  1. 抓取 5 个 REST 端点（views / clones / referrers / paths / repo 元数据）
  2. 原始完整响应 → insights/raw/<UTC时间戳>.json   （永久归档，零丢弃）
  3. 整理存档     → insights/traffic.json
       views/clones:          按日期 upsert（14 天内刷新，窗口外保留）
       referrers/paths/repo:  快照追加（带 fetched_at，历史全保留）
  4. 更新 README  → README.md (中文) / README.en.md (英文) 的 <!-- INSIGHTS:START/END --> 区块

环境变量：
  TRAFFIC_TOKEN / GITHUB_PAT_TOKEN / WINGET_TOKEN  必需：带 public_repo/repo scope 的 PAT（GITHUB_TOKEN 无法读 traffic API）
  GITHUB_REPOSITORY 可选：owner/repo；不设时从 git remote 推导
命令行参数：
  --root <dir>  输出根目录（默认：脚本所在仓库根）
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API_BASE = "https://api.github.com"
WEBSITE_STATS_API = os.environ.get(
    "WEBSITE_STATS_API", "https://playlistout-api.lengxiqwq.com/api/stats"
)


# ── 基础工具 ───────────────────────────────────────────────────────

def log(msg: str) -> None:
    print(f"[insights] {msg}", flush=True)


def fetch_website_stats(retries: int = 3) -> dict | None:
    """抓取 Cloudflare Worker 提供的网站聚合运营数据（实时 PV/UV/解析/导出统计）。"""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; PlaylistOutInsights/1.0; +https://playlistout.lengxiqwq.com)",
        "Accept": "application/json",
    }
    url = WEBSITE_STATS_API
    log(f"fetching website stats from {url}")
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success") and isinstance(data.get("data"), dict):
                    return data["data"]
                log(f"  website stats response invalid or missing success flag: {data}")
                return None
        except urllib.error.HTTPError as e:
            if attempt < retries:
                log(f"  website stats HTTP {e.code}, retry {attempt}/{retries}")
                time.sleep(2 ** attempt)
                continue
            log(f"WARNING: website stats failed HTTP {e.code}")
            return None
        except Exception as e:
            if attempt < retries:
                log(f"  website stats request failed ({e}), retry {attempt}/{retries}")
                time.sleep(2 ** attempt)
                continue
            log(f"WARNING: website stats request failed: {e}")
            return None
    return None


def resolve_repo() -> str:
    """解析 owner/repo，优先 GITHUB_REPOSITORY，否则从 git remote 推导。"""
    repo = os.environ.get("GITHUB_REPOSITORY")
    if repo:
        return repo.strip().strip("/")
    try:
        remote = subprocess.check_output(
            ["git", "remote", "get-url", "origin"], text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        raise SystemExit(
            "Cannot resolve repo: set GITHUB_REPOSITORY or run inside a git repository"
        )
    m = re.search(r"(?:https?://|git@)[^/:]+[:/]([^/]+/[^/]+?)(?:\.git)?$", remote)
    if not m:
        raise SystemExit(f"Cannot parse git remote: {remote}")
    return m.group(1)


def api_get(token: str, path: str, retries: int = 3):
    """GET 一个 REST 端点，指数退避重试；403/404/网络错误可恢复则继续。"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "playlistout-insights",
    }
    url = API_BASE + path
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 403 and e.headers.get("X-RateLimit-Remaining") == "0":
                reset = int(e.headers.get("X-RateLimit-Reset", "0"))
                wait = min(max(1, reset - int(time.time())), 60)
                log(f"rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            if e.code == 404:
                log(f"  {path} -> 404 (endpoint not available)")
                return None
            if attempt < retries:
                log(f"  {path} HTTP {e.code}, retry {attempt}/{retries}")
                time.sleep(2 ** attempt)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < retries:
                log(f"  {path} network error, retry {attempt}/{retries}")
                time.sleep(2 ** attempt)
                continue
            raise
    return None


def fmt_num(v) -> str:
    return f"{int(v):,}"


# ── A. 抓取 ────────────────────────────────────────────────────────

def collect(token: str, repo: str) -> dict:
    endpoints = {
        "views":     f"/repos/{repo}/traffic/views",
        "clones":    f"/repos/{repo}/traffic/clones",
        "referrers": f"/repos/{repo}/traffic/popular/referrers",
        "paths":     f"/repos/{repo}/traffic/popular/paths",
        "repo_meta": f"/repos/{repo}",
    }
    results = {}
    for key, path in endpoints.items():
        log(f"fetching {path}")
        results[key] = api_get(token, path)
    return results


# ── B. 全量归档 + 整理合并 ────────────────────────────────────────

def archive_raw(root: Path, payload: dict) -> dict:
    """原始完整响应永久归档到 insights/raw/，永不覆盖。"""
    ts_file = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    raw_dir = root / "insights" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    out = raw_dir / f"{ts_file}.json"
    if out.exists():  # 同一分钟重复跑，避免覆盖
        out = raw_dir / f"{ts_file}-{int(time.time() * 1000) % 1000}.json"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"archived raw -> insights/raw/{out.name}")
    return payload


def merge(payload: dict, traffic_path: Path) -> dict:
    """把本次抓取合并进存档：views/clones 按日 upsert，其余快照追加。"""
    data = payload.get("data", {})
    fetched_at = payload.get("fetched_at", "")
    existing: dict = {}
    if traffic_path.exists():
        try:
            existing = json.loads(traffic_path.read_text(encoding="utf-8"))
        except Exception as e:
            log(f"WARNING: corrupted {traffic_path.name}, starting fresh: {e}")

    views: dict = existing.get("views", {})
    clones: dict = existing.get("clones", {})

    v = data.get("views") or {}
    for day in v.get("views", []):
        date = (day.get("timestamp") or "")[:10]
        if date:
            views[date] = {"count": day.get("count", 0), "uniques": day.get("uniques", 0)}
    c = data.get("clones") or {}
    for day in c.get("clones", []):
        date = (day.get("timestamp") or "")[:10]
        if date:
            clones[date] = {"count": day.get("count", 0), "uniques": day.get("uniques", 0)}

    result = {
        "views": dict(sorted(views.items())),
        "clones": dict(sorted(clones.items())),
        "referrer_snapshots": list(existing.get("referrer_snapshots", [])),
        "path_snapshots": list(existing.get("path_snapshots", [])),
        "repo_meta_snapshots": list(existing.get("repo_meta_snapshots", [])),
        "website_snapshots": list(existing.get("website_snapshots", [])),
        "updated_at": fetched_at,
    }

    if data.get("referrers") is not None:
        result["referrer_snapshots"].append(
            {"fetched_at": fetched_at, "referrers": data["referrers"]}
        )
    if data.get("paths") is not None:
        result["path_snapshots"].append(
            {"fetched_at": fetched_at, "paths": data["paths"]}
        )
    if data.get("repo_meta") is not None:
        m = data["repo_meta"]
        result["repo_meta_snapshots"].append(
            {
                "fetched_at": fetched_at,
                "stars": m.get("stargazers_count"),
                "forks": m.get("forks_count"),
                "watchers": m.get("subscribers_count"),
                "open_issues": m.get("open_issues_count"),
                "network": m.get("network_count"),
                "pushed_at": m.get("pushed_at"),
            }
        )

    # 合并网站运营统计
    website_stats = data.get("website_stats")
    if website_stats is not None:
        result["website_snapshots"].append(
            {
                "fetched_at": fetched_at,
                "total_visitors": website_stats.get("totalVisitors", 0),
                "visitors_today": website_stats.get("visitorsToday", 0),
                "total_page_views": website_stats.get("totalPageViews", 0),
                "page_views_today": website_stats.get("pageViewsToday", 0),
                "total_playlists_parsed": website_stats.get("totalPlaylistsParsed", 0),
                "playlists_parsed_today": website_stats.get("playlistsParsedToday", 0),
                "total_tracks_processed": website_stats.get("totalTracksProcessed", 0),
                "tracks_processed_today": website_stats.get("tracksProcessedToday", 0),
                "total_exports": website_stats.get("totalExports", 0),
                "exports_today": website_stats.get("exportsToday", 0),
                "export_formats_breakdown": website_stats.get("exportFormatsBreakdown", {}),
            }
        )
        result["website_latest"] = website_stats
    elif existing.get("website_latest"):
        result["website_latest"] = existing["website_latest"]

    return result


def compute_metrics(merged: dict, data: dict) -> dict:
    """从最新抓取算 14 天聚合，从存档算累计。"""
    views_latest = data.get("views") or {}
    clones_latest = data.get("clones") or {}
    return {
        "views_14": views_latest.get("count", 0),
        "views_14_uniq": views_latest.get("uniques", 0),
        "clones_14": clones_latest.get("count", 0),
        "clones_14_uniq": clones_latest.get("uniques", 0),
        "views_all": sum(d.get("count", 0) for d in merged["views"].values()),
        "clones_all": sum(d.get("count", 0) for d in merged["clones"].values()),
        "first_date": min(merged["views"]) if merged["views"] else "",
    }


# ── D. 渲染双语 Markdown ───────────────────────────────────────────

COUNTRY_NAMES = {
    "zh": {
        "CN": "🇨🇳 中国大陆",
        "HK": "🇭🇰 中国香港",
        "TW": "🇨🇳 中国台湾",
        "MO": "🇲🇴 中国澳门",
        "US": "🇺🇸 美国",
        "JP": "🇯🇵 日本",
        "SG": "🇸🇬 新加坡",
        "MY": "🇲🇾 马来西亚",
        "GB": "🇬🇧 英国",
        "CA": "🇨🇦 加拿大",
        "AU": "🇦🇺 澳大利亚",
        "DE": "🇩🇪 德国",
        "OTHER": "🌐 其他国家/地区",
    },
    "en": {
        "CN": "🇨🇳 Mainland China",
        "HK": "🇭🇰 Hong Kong",
        "TW": "🇨🇳 Taiwan",
        "MO": "🇲🇴 Macao",
        "US": "🇺🇸 United States",
        "JP": "🇯🇵 Japan",
        "SG": "🇸🇬 Singapore",
        "MY": "🇲🇾 Malaysia",
        "GB": "🇬🇧 United Kingdom",
        "CA": "🇨🇦 Canada",
        "AU": "🇦🇺 Australia",
        "DE": "🇩🇪 Germany",
        "OTHER": "🌐 Other Regions",
    },
}


def compute_running_days(launched_at: str) -> int:
    try:
        launch = dt.date.fromisoformat(launched_at or "2026-09-12")
        today = dt.datetime.now(dt.timezone.utc).date()
        return max(1, (today - launch).days + 1)
    except Exception:
        return 1


def format_platform_shares(by_platform: dict, lang: str) -> str:
    qq = (by_platform.get("qqmusic") or {}).get("totalSuccess", 0)
    netease = (by_platform.get("netease") or {}).get("totalSuccess", 0)
    total = qq + netease
    if total == 0:
        return "暂无数据" if lang == "zh" else "No data"
    qq_pct = round((qq / total) * 100)
    netease_pct = 100 - qq_pct
    if lang == "zh":
        return f"QQ 音乐 **{qq_pct}%** ({fmt_num(qq)} 次) ｜ 网易云音乐 **{netease_pct}%** ({fmt_num(netease)} 次)"
    else:
        return f"QQ Music **{qq_pct}%** ({fmt_num(qq)} parses) ｜ NetEase Cloud Music **{netease_pct}%** ({fmt_num(netease)} parses)"


PROVINCE_NAMES: dict[str, dict[str, str]] = {
    # 23 省
    "Guangdong": {"zh": "广东省", "en": "Guangdong"},
    "GD": {"zh": "广东省", "en": "Guangdong"},
    "Zhejiang": {"zh": "浙江省", "en": "Zhejiang"},
    "ZJ": {"zh": "浙江省", "en": "Zhejiang"},
    "Jiangsu": {"zh": "江苏省", "en": "Jiangsu"},
    "JS": {"zh": "江苏省", "en": "Jiangsu"},
    "Shandong": {"zh": "山东省", "en": "Shandong"},
    "SD": {"zh": "山东省", "en": "Shandong"},
    "Henan": {"zh": "河南省", "en": "Henan"},
    "HA": {"zh": "河南省", "en": "Henan"},
    "HEN": {"zh": "河南省", "en": "Henan"},
    "Sichuan": {"zh": "四川省", "en": "Sichuan"},
    "SC": {"zh": "四川省", "en": "Sichuan"},
    "Hubei": {"zh": "湖北省", "en": "Hubei"},
    "HB": {"zh": "湖北省", "en": "Hubei"},
    "HUB": {"zh": "湖北省", "en": "Hubei"},
    "Hunan": {"zh": "湖南省", "en": "Hunan"},
    "HN": {"zh": "湖南省", "en": "Hunan"},
    "HUN": {"zh": "湖南省", "en": "Hunan"},
    "Hebei": {"zh": "河北省", "en": "Hebei"},
    "HE": {"zh": "河北省", "en": "Hebei"},
    "HEB": {"zh": "河北省", "en": "Hebei"},
    "Fujian": {"zh": "福建省", "en": "Fujian"},
    "FJ": {"zh": "福建省", "en": "Fujian"},
    "Anhui": {"zh": "安徽省", "en": "Anhui"},
    "AH": {"zh": "安徽省", "en": "Anhui"},
    "Liaoning": {"zh": "辽宁省", "en": "Liaoning"},
    "LN": {"zh": "辽宁省", "en": "Liaoning"},
    "Shaanxi": {"zh": "陕西省", "en": "Shaanxi"},
    "SN": {"zh": "陕西省", "en": "Shaanxi"},
    "SAX": {"zh": "陕西省", "en": "Shaanxi"},
    "Jiangxi": {"zh": "江西省", "en": "Jiangxi"},
    "JX": {"zh": "江西省", "en": "Jiangxi"},
    "Yunnan": {"zh": "云南省", "en": "Yunnan"},
    "YN": {"zh": "云南省", "en": "Yunnan"},
    "Guizhou": {"zh": "贵州省", "en": "Guizhou"},
    "GZ": {"zh": "贵州省", "en": "Guizhou"},
    "Shanxi": {"zh": "山西省", "en": "Shanxi"},
    "SX": {"zh": "山西省", "en": "Shanxi"},
    "Jilin": {"zh": "吉林省", "en": "Jilin"},
    "JL": {"zh": "吉林省", "en": "Jilin"},
    "Heilongjiang": {"zh": "黑龙江省", "en": "Heilongjiang"},
    "HL": {"zh": "黑龙江省", "en": "Heilongjiang"},
    "HLJ": {"zh": "黑龙江省", "en": "Heilongjiang"},
    "Hainan": {"zh": "海南省", "en": "Hainan"},
    "HI": {"zh": "海南省", "en": "Hainan"},
    "HAI": {"zh": "海南省", "en": "Hainan"},
    "Gansu": {"zh": "甘肃省", "en": "Gansu"},
    "GS": {"zh": "甘肃省", "en": "Gansu"},
    "Qinghai": {"zh": "青海省", "en": "Qinghai"},
    "QH": {"zh": "青海省", "en": "Qinghai"},
    "Taiwan": {"zh": "台湾省", "en": "Taiwan"},
    "TW": {"zh": "台湾省", "en": "Taiwan"},

    # 4 直辖市
    "Beijing": {"zh": "北京市", "en": "Beijing"},
    "BJ": {"zh": "北京市", "en": "Beijing"},
    "Shanghai": {"zh": "上海市", "en": "Shanghai"},
    "SH": {"zh": "上海市", "en": "Shanghai"},
    "Tianjin": {"zh": "天津市", "en": "Tianjin"},
    "TJ": {"zh": "天津市", "en": "Tianjin"},
    "Chongqing": {"zh": "重庆市", "en": "Chongqing"},
    "CQ": {"zh": "重庆市", "en": "Chongqing"},

    # 5 自治区
    "Guangxi": {"zh": "广西壮族自治区", "en": "Guangxi"},
    "GX": {"zh": "广西壮族自治区", "en": "Guangxi"},
    "Inner Mongolia": {"zh": "内蒙古自治区", "en": "Inner Mongolia"},
    "Nei Mongol": {"zh": "内蒙古自治区", "en": "Inner Mongolia"},
    "NM": {"zh": "内蒙古自治区", "en": "Inner Mongolia"},
    "Xinjiang": {"zh": "新疆维吾尔自治区", "en": "Xinjiang"},
    "XJ": {"zh": "新疆维吾尔自治区", "en": "Xinjiang"},
    "Ningxia": {"zh": "宁夏回族自治区", "en": "Ningxia"},
    "NX": {"zh": "宁夏回族自治区", "en": "Ningxia"},
    "Tibet": {"zh": "西藏自治区", "en": "Tibet"},
    "Xizang": {"zh": "西藏自治区", "en": "Tibet"},
    "XZ": {"zh": "西藏自治区", "en": "Tibet"},

    # 2 特别行政区
    "Hong Kong": {"zh": "香港特别行政区", "en": "Hong Kong"},
    "HK": {"zh": "香港特别行政区", "en": "Hong Kong"},
    "Macau": {"zh": "澳门特别行政区", "en": "Macau"},
    "Macao": {"zh": "澳门特别行政区", "en": "Macau"},
    "MO": {"zh": "澳门特别行政区", "en": "Macau"},
}


def get_province_display_name(raw_name: str, lang: str) -> str:
    cleaned = (raw_name or "").strip()
    if cleaned in PROVINCE_NAMES:
        return PROVINCE_NAMES[cleaned][lang]
    for k, v in PROVINCE_NAMES.items():
        if k.lower() == cleaned.lower():
            return v[lang]
    return cleaned


def format_china_province_table(stats: dict, lang: str) -> list[str]:
    raw_provinces = stats.get("chinaProvinces")
    items = []
    if raw_provinces and isinstance(raw_provinces, list) and len(raw_provinces) > 0:
        total_count = sum(
            p.get("count", 0)
            for p in raw_provinces
            if isinstance(p, dict) and isinstance(p.get("count"), (int, float))
        )
        for p in raw_provinces:
            if not isinstance(p, dict):
                continue
            prov = p.get("province", "")
            if not prov or prov == "UNKNOWN":
                continue
            if "percentage" in p and p["percentage"] is not None:
                pct = p["percentage"]
            elif total_count > 0 and "count" in p:
                pct = round((p.get("count", 0) / total_count) * 100)
            else:
                pct = 0
            disp = get_province_display_name(prov, lang)
            items.append((disp, pct))

    if not items:
        return ["暂无数据" if lang == "zh" else "No data"]

    # 取前 8 个省份，排成紧凑美观的 4 行 x 4 列表格
    items = items[:8]

    if lang == "zh":
        headers = "| 省份 / 直辖市 | 访客占比 | 省份 / 直辖市 | 访客占比 |"
        sep = "| :---: | :---: | :---: | :---: |"
    else:
        headers = "| Province / Municipality | Share | Province / Municipality | Share |"
        sep = "| :---: | :---: | :---: | :---: |"

    table_lines = [headers, sep]
    for i in range(0, len(items), 2):
        l_name, l_pct = items[i]
        if i + 1 < len(items):
            r_name, r_pct = items[i + 1]
            table_lines.append(f"| {l_name} | **{l_pct}%** | {r_name} | **{r_pct}%** |")
        else:
            table_lines.append(f"| {l_name} | **{l_pct}%** | — | — |")
    return table_lines


def clean_device_name(name: str, lang: str) -> str:
    n = (name or "").lower()
    if "desktop" in n or "桌面" in n:
        return "桌面电脑" if lang == "zh" else "Desktop"
    if "mobile" in n or "移动" in n or "手机" in n:
        return "移动手机" if lang == "zh" else "Mobile"
    if "tablet" in n or "平板" in n:
        return "平板电脑" if lang == "zh" else "Tablet"
    return name


def clean_browser_name(name: str, lang: str) -> str:
    n = (name or "").lower()
    if "other" in n or "其他" in n:
        return "其他浏览器" if lang == "zh" else "Other"
    mapping = {
        "chrome": "Chrome",
        "edge": "Edge",
        "safari": "Safari",
        "firefox": "Firefox",
        "wechat": "微信" if lang == "zh" else "WeChat",
        "qqbrowser": "QQ浏览器" if lang == "zh" else "QQ Browser",
    }
    if n in mapping:
        return mapping[n]
    return name.capitalize() if name.islower() else name


def format_geo_distribution(stats: dict, lang: str) -> str:
    raw_geo = stats.get("topGeo")
    names = COUNTRY_NAMES.get(lang, COUNTRY_NAMES["zh"])
    items = []
    if raw_geo and isinstance(raw_geo, list) and len(raw_geo) > 0:
        total_count = sum(
            g.get("count", 0)
            for g in raw_geo
            if isinstance(g, dict) and isinstance(g.get("count"), (int, float))
        )
        for g in raw_geo:
            if not isinstance(g, dict):
                continue
            c = g.get("country", "OTHER").upper()
            if "percentage" in g and g["percentage"] is not None:
                pct = g["percentage"]
            elif total_count > 0 and "count" in g:
                pct = round((g.get("count", 0) / total_count) * 100)
            else:
                pct = 0
            c_name = names.get(c, f"🌐 {c}")
            items.append(f"{c_name} **{pct}%**")
    if not items:
        return "暂无数据" if lang == "zh" else "No data"
    return " ｜ ".join(items)


def format_client_distribution(stats: dict, lang: str) -> tuple[str, str]:
    raw_client = stats.get("clientStats") or {}
    devices = raw_client.get("devices")
    browsers = raw_client.get("browsers")

    def _render_items(items: list, clean_fn, limit: int) -> str:
        if not items or not isinstance(items, list):
            return "暂无数据" if lang == "zh" else "No data"
        valid = [it for it in items if isinstance(it, dict) and it.get("name")]
        if not valid:
            return "暂无数据" if lang == "zh" else "No data"

        total_count = sum(
            it.get("count", 0)
            for it in valid
            if isinstance(it.get("count"), (int, float))
        )

        rendered = []
        for it in valid[:limit]:
            name = clean_fn(it["name"], lang)
            if "percentage" in it and it["percentage"] is not None:
                pct = it["percentage"]
            elif total_count > 0 and "count" in it:
                pct = round((it.get("count", 0) / total_count) * 100)
            else:
                pct = 0
            rendered.append(f"{name} **{pct}%**")
        return " ｜ ".join(rendered) if rendered else ("暂无数据" if lang == "zh" else "No data")

    dev_str = _render_items(devices, clean_device_name, 3)
    browser_str = _render_items(browsers, clean_browser_name, 4)

    return dev_str, browser_str


def render_website_section(stats: dict, updated_at: str, lang: str) -> str:
    """生成全维度双语网站运营数据 Markdown 看板（严格区分中英文，去除重复时间戳与趋势）。"""
    if not stats:
        return "<!-- WEBSITE_STATS:START -->\n<!-- WEBSITE_STATS:END -->"

    running_days = compute_running_days(stats.get("launchedAt", "2026-09-12"))
    launched_date = stats.get("launchedAt", "2026-09-12")

    visitors_total = fmt_num(stats.get("totalVisitors", 0))
    visitors_today = fmt_num(stats.get("visitorsToday", 0))
    pv_total = fmt_num(stats.get("totalPageViews", 0))
    pv_today = fmt_num(stats.get("pageViewsToday", 0))
    parses_total = fmt_num(stats.get("totalPlaylistsParsed", 0))
    parses_today = fmt_num(stats.get("playlistsParsedToday", 0))
    tracks_total = fmt_num(stats.get("totalTracksProcessed", 0))
    tracks_today = fmt_num(stats.get("tracksProcessedToday", 0))
    exports_total = fmt_num(stats.get("totalExports", 0))
    exports_today = fmt_num(stats.get("exportsToday", 0))

    # 导出格式偏好分布（区分纯中文与纯英文）
    breakdown = stats.get("exportFormatsBreakdown") or {}
    total_export_fmt = sum(breakdown.values()) or 1
    fmt_order = ["xlsx", "txt", "csv", "json"]
    if lang == "zh":
        fmt_labels = {
            "xlsx": "Excel 表格 (.xlsx)",
            "txt": "TXT 纯文本",
            "csv": "CSV 表格",
            "json": "JSON 数据",
        }
    else:
        fmt_labels = {
            "xlsx": "Excel (.xlsx)",
            "txt": "TXT",
            "csv": "CSV",
            "json": "JSON",
        }

    fmt_parts = []
    for f in fmt_order:
        count = breakdown.get(f, 0)
        if count > 0:
            pct = round(count * 100 / total_export_fmt)
            fmt_parts.append(f"{fmt_labels[f]} **{pct}%**")
    fmt_str = " ｜ ".join(fmt_parts) if fmt_parts else ("暂无数据" if lang == "zh" else "No data")

    # 平台份额、地理分布、设备环境、省份分布
    platform_str = format_platform_shares(stats.get("byPlatform") or {}, lang)
    geo_str = format_geo_distribution(stats, lang)
    dev_str, browser_str = format_client_distribution(stats, lang)
    province_table_lines = format_china_province_table(stats, lang)

    if lang == "zh":
        lines = [
            "### 🌐 网站运营与活跃数据看板",
            "",
            "> 📊 数据由 [Cloudflare D1 边缘节点](https://playlistout-api.lengxiqwq.com/api/stats) 实时聚合计算，每日自动化同步存档。",
            "",
            "#### 📌 核心流量与使用规模",
            "",
            "| 👥 独立访客 (UV) | 📄 页面浏览 (PV) | 🎵 解析歌单数 | 💿 处理歌曲数 | 📦 文件导出数 | ⏱️ 稳定运行 |",
            "| :---: | :---: | :---: | :---: | :---: | :---: |",
            f"| **{visitors_total}**<br><sub>今日 +{visitors_today}</sub> | **{pv_total}**<br><sub>今日 +{pv_today}</sub> | **{parses_total}**<br><sub>今日 +{parses_today}</sub> | **{tracks_total}**<br><sub>今日 +{tracks_today}</sub> | **{exports_total}**<br><sub>今日 +{exports_today}</sub> | **{running_days} 天**<br><sub>上线于 {launched_date}</sub> |",
            "",
            "#### 🗺️ 访客地理归属与设备分布",
            f"- **🌍 主要地区来源：** {geo_str}",
            f"- **💻 访问设备类型：** {dev_str}",
            f"- **🌐 主流浏览器：** {browser_str}",
            "",
            "#### 🇨🇳 境内访客省份分布",
            "",
            *province_table_lines,
            "",
            "#### 📊 业务转化与平台偏好",
            f"- **🎵 平台解析份额：** {platform_str}",
            f"- **📦 导出格式偏好：** {fmt_str}",
            "",
            "> 🛡️ **隐私保证**：本统计严格遵循开源宪法规范，所有数据均由边缘节点以粗粒度匿名原子计数存储，**绝不记录真实 IP 地址、私密歌单内容或个人身份凭据**。",
        ]
    else:
        lines = [
            "### 🌐 Live Website Statistics & Insights",
            "",
            "> 📊 Data aggregated in real-time via [Cloudflare D1 Edge Node](https://playlistout-api.lengxiqwq.com/api/stats) and synced daily.",
            "",
            "#### 📌 Core Metrics & Usage Volume",
            "",
            "| 👥 Unique Visitors (UV) | 📄 Page Views (PV) | 🎵 Playlists Parsed | 💿 Tracks Processed | 📦 Exports | ⏱️ Uptime |",
            "| :---: | :---: | :---: | :---: | :---: | :---: |",
            f"| **{visitors_total}**<br><sub>Today +{visitors_today}</sub> | **{pv_total}**<br><sub>Today +{pv_today}</sub> | **{parses_total}**<br><sub>Today +{parses_today}</sub> | **{tracks_total}**<br><sub>Today +{tracks_today}</sub> | **{exports_total}**<br><sub>Today +{exports_today}</sub> | **{running_days} Days**<br><sub>Since {launched_date}</sub> |",
            "",
            "#### 🗺️ Geographic & Client Distribution",
            f"- **🌍 Top Visitor Regions:** {geo_str}",
            f"- **💻 Client Devices:** {dev_str}",
            f"- **🌐 Browsers:** {browser_str}",
            "",
            "#### 🇨🇳 Mainland China Visitor Province Distribution",
            "",
            *province_table_lines,
            "",
            "#### 📊 Feature Usage & Platform Breakdown",
            f"- **🎵 Platform Shares:** {platform_str}",
            f"- **📦 Export Format Distribution:** {fmt_str}",
            "",
            "> 🛡️ **Privacy Guarantee**: All metrics are stored as discrete, coarse-grained anonymous aggregate counters in accordance with Project Constitution. **No raw IP addresses, private playlist contents, or personal credentials are ever stored.**",
        ]

    return "<!-- WEBSITE_STATS:START -->\n" + "\n".join(lines) + "\n<!-- WEBSITE_STATS:END -->"


def render_section(metrics: dict, refs: list, paths: list, updated_at: str, lang: str,
                   repo: str = "") -> str:
    """生成双语 GitHub 仓库流量极简数据区块：纯 Markdown 文本，无多余图标。"""
    first = metrics.get("first_date") or "—"
    top = " · ".join(x.get("referrer", "") for x in refs[:6] if x.get("referrer")) or "—"

    # 热门内容路径（剥掉 /owner/repo 前缀、blob/tree 冗余段；跳过仓库主页 Home）
    names = []
    for it in (paths or [])[:15]:
        name = (it.get("path") or "").lstrip("/")
        if repo and name.lower().startswith(repo.lower()):
            name = name[len(repo):]
        name = re.sub(r"^/?(blob|tree)/[^/]+/", "", name).strip("/")
        if not name:
            continue  # 仓库主页 Home 冗余，跳过
        if name not in names:
            names.append(name)
        if len(names) >= 4:
            break
    content = " · ".join(names) if names else "—"

    if lang == "zh":
        lines = [
            "**📊 仓库流量**",
            "",
            f"访问次数：**{fmt_num(metrics['views_all'])}** ｜ 不重复访客：**{fmt_num(metrics['views_14_uniq'])}**（近 14 天） ｜ 仓库克隆：**{fmt_num(metrics['clones_all'])}** ｜ 不重复克隆：**{fmt_num(metrics['clones_14_uniq'])}**（近 14 天）",
            "",
            f"**热门来源（近 14 天）：** {top}  ",
            f"**热门内容（近 14 天）：** {content}",
            "",
            f"> 数据开始：{first} · 最后更新：{updated_at}",
        ]
    else:
        lines = [
            "**📊 Repository Traffic**",
            "",
            f"Views: **{fmt_num(metrics['views_all'])}** ｜ Uniques: **{fmt_num(metrics['views_14_uniq'])}** (14-day) ｜ Clones: **{fmt_num(metrics['clones_all'])}** ｜ Cloners: **{fmt_num(metrics['clones_14_uniq'])}** (14-day)",
            "",
            f"**Top referrers (14-day):** {top}  ",
            f"**Top content (14-day):** {content}",
            "",
            f"> Data since {first} · Last updated: {updated_at}",
        ]

    return "<!-- INSIGHTS:START -->\n" + "\n".join(lines) + "\n<!-- INSIGHTS:END -->"


def update_readme_block(root: Path, filename: str, tag_name: str, content: str) -> None:
    """按标签名替换 README 中的 <!-- TAG:START --> ... <!-- TAG:END --> 区块。"""
    path = root / filename
    if not path.exists():
        log(f"SKIP {filename}: file not found")
        return
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(rf"<!-- {tag_name}:START -->.*?<!-- {tag_name}:END -->", re.DOTALL)
    if not pattern.search(text):
        log(f"SKIP {filename}: no {tag_name} placeholder block")
        return
    new_text = pattern.sub(content, text, count=1)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        log(f"updated {filename} [{tag_name}]")
    else:
        log(f"{filename} [{tag_name}]: unchanged")


def update_readme(root: Path, section: str, filename: str) -> None:
    """向后兼容原有 update_readme 签名"""
    update_readme_block(root, filename, "INSIGHTS", section)


# ── 入口 ──────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="GitHub repository & website insights collector")
    parser.add_argument("--root", default=None, help="output root (default: repo root)")
    args = parser.parse_args()

    root = Path(args.root).resolve() if args.root else Path(__file__).resolve().parent.parent.parent
    token = os.environ.get("TRAFFIC_TOKEN") or os.environ.get("GITHUB_PAT_TOKEN") or os.environ.get("WINGET_TOKEN")

    repo = ""
    try:
        repo = resolve_repo()
    except Exception as e:
        log(f"resolve_repo info: {e}")

    log(f"repo={repo}  root={root}")

    # 1. 抓取 GitHub 仓库流量（如果有 TOKEN）
    data = {}
    if token and repo:
        data = collect(token, repo)
        if data.get("views") is None and data.get("clones") is None:
            log("WARNING: no GitHub traffic data fetched at all")
    else:
        log("TRAFFIC_TOKEN not set or repo unresolvable; skipping GitHub traffic collection")

    # 2. 抓取网站运营数据（Cloudflare Worker D1 聚合统计）
    website_stats = fetch_website_stats()
    if website_stats:
        data["website_stats"] = website_stats

    payload = {
        "fetched_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data": data,
    }
    archive_raw(root, payload)

    traffic_path = root / "insights" / "traffic.json"
    merged = merge(payload, traffic_path)
    traffic_path.parent.mkdir(parents=True, exist_ok=True)
    traffic_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    log(f"wrote {traffic_path.name} (views={len(merged.get('views', {}))} days)")

    fetched = dt.datetime.fromisoformat(payload["fetched_at"].replace("Z", "+00:00"))
    cn = fetched.astimezone(dt.timezone(dt.timedelta(hours=8)))
    updated_at = cn.strftime("%Y-%m-%d")

    # 3. 渲染并更新网站运营统计看板 (WEBSITE_STATS 区块)
    effective_website_stats = website_stats or merged.get("website_latest") or {}
    if effective_website_stats:
        update_readme_block(
            root, "README.md", "WEBSITE_STATS",
            render_website_section(effective_website_stats, updated_at, "zh")
        )
        update_readme_block(
            root, "README.en.md", "WEBSITE_STATS",
            render_website_section(effective_website_stats, updated_at, "en")
        )

    # 4. 渲染并更新 GitHub 仓库流量 (INSIGHTS 区块)
    if data.get("views") or data.get("clones") or merged.get("views"):
        metrics = compute_metrics(merged, data)
        refs = ((data.get("referrers") or []) if isinstance(data.get("referrers"), list) else [])
        paths = ((data.get("paths") or []) if isinstance(data.get("paths"), list) else [])
        update_readme_block(
            root, "README.md", "INSIGHTS",
            render_section(metrics, refs, paths, updated_at, "zh", repo)
        )
        update_readme_block(
            root, "README.en.md", "INSIGHTS",
            render_section(metrics, refs, paths, updated_at, "en", repo)
        )

    log("done")


if __name__ == "__main__":
    sys.exit(main())
