#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PlaylistOut 本地数据仪表板 (PlaylistOut Local Insights Dashboard)
=============================================================
干净白底极简风 · 中英文双语 · 高密度专业数据看板
White Modern Minimalist · Bilingual (ZH/EN) · High-density Visuals
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

# 确保在 Windows 控制台下不发生 GBK UnicodeEncodeError
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ── 1. 自动依赖自检与环境准备 (Auto Dependency Check) ───────────────────


REQUIRED_PACKAGES: list[str] = []

def ensure_dependencies():
    """检查并自动安装必要依赖 (虽然本脚本主要使用内置标准库，但预留自愈能力)"""
    if not REQUIRED_PACKAGES:
        return
    missing = []
    for pkg in REQUIRED_PACKAGES:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"[Dashboard] 正在自动安装缺失依赖 / Installing: {missing} ...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
            print("[Dashboard] 依赖安装完成 / Dependencies ready.")
        except Exception as e:
            print(f"[Dashboard] 警告: 自动安装依赖失败 ({e})，尝试继续运行...")

ensure_dependencies()

API_URL = "https://playlistout-api.lengxiqwq.com/api/stats"


# ── 2. 数据获取 (Data Fetcher) ────────────────────────────────────────

def fetch_stats(url: str, retries: int = 3) -> dict:
    headers = {
        "User-Agent": "PlaylistOut-Dashboard/2.0 (local-bilingual)",
        "Accept": "application/json",
    }
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("success") and isinstance(data.get("data"), dict):
                    return data["data"]
                raise ValueError(f"API 响应异常: {data}")
        except Exception as e:
            if attempt < retries:
                print(f"[Dashboard] 重试第 {attempt}/{retries} 次: {e}")
                time.sleep(1.5 * attempt)
            else:
                raise


# ── 3. 辅助格式化 (Formatting Helpers) ────────────────────────────────

def s(val, default=0):
    return val if val is not None else default

def n(val) -> str:
    try:
        return f"{int(val):,}"
    except Exception:
        return str(val if val is not None else 0)

def j(obj) -> str:
    return json.dumps(obj, ensure_ascii=False)

def dist_names(lst):
    return j([x.get("name", "?") for x in (lst or [])])

def dist_names_mapped(lst, mapper):
    return j([mapper(x.get("name", "?")) for x in (lst or [])])

def dist_counts(lst):
    return j([s(x.get("count")) for x in (lst or [])])

def dist_pcts(lst):
    return j([s(x.get("percentage")) for x in (lst or [])])

BROWSER_NAME_MAP = {
    "chrome": "Google Chrome",
    "edge": "Microsoft Edge",
    "safari": "Apple Safari",
    "firefox": "Firefox",
    "wechat": "微信 (WeChat)",
    "qqbrowser": "QQ浏览器",
    "quark": "夸克 (Quark)",
    "uc": "UC浏览器",
    "baidu": "百度 (Baidu)",
    "360": "360安全浏览器",
    "sogou": "搜狗 (Sogou)",
    "samsung_browser": "三星浏览器 (Samsung)",
    "miui_browser": "小米浏览器 (MIUI)",
    "huawei_browser": "华为浏览器 (Huawei)",
    "oppo_browser": "OPPO浏览器 (HeyTap)",
    "vivo_browser": "vivo浏览器",
    "honor_browser": "荣耀浏览器 (Honor)",
    "via": "Via极简浏览器",
    "xbrowser": "X浏览器",
    "115_browser": "115浏览器",
    "alipay": "支付宝 (Alipay)",
    "dingtalk": "钉钉 (DingTalk)",
    "weibo": "微博 (Weibo)",
    "bilibili": "哔哩哔哩 (B站)",
    "douyin": "抖音 (Douyin)",
    "opera": "Opera",
    "vivaldi": "Vivaldi",
    "brave": "Brave",
    "yandex": "Yandex",
    "arc": "Arc",
    "tor": "Tor Browser",
    "duckduckgo": "DuckDuckGo",
    "bot_crawler": "爬虫 / 脚本 (Bot)",
    "other": "其他浏览器 (Other)",
}

DEVICE_NAME_MAP = {
    "desktop": "桌面电脑 (Desktop)",
    "mobile": "移动手机 (Mobile)",
    "tablet": "平板电脑 (Tablet)",
    "other": "其他终端 (Other)",
}

OS_NAME_MAP = {
    "windows": "Windows",
    "macos": "macOS",
    "ios": "iOS",
    "android": "Android",
    "linux": "Linux",
    "other": "其他 (Other)",
}

def format_browser_label(name: str) -> str:
    if not name:
        return "未知 (Unknown)"
    key = name.strip().lower()
    if key in BROWSER_NAME_MAP:
        return BROWSER_NAME_MAP[key]
    # Dynamic browser: e.g. "alohabrowser" -> "Alohabrowser", "waterfox" -> "Waterfox"
    clean = key.replace("_", " ")
    return " ".join(word.capitalize() for word in clean.split())

def format_device_label(name: str) -> str:
    if not name:
        return "未知 (Unknown)"
    key = name.strip().lower()
    return DEVICE_NAME_MAP.get(key, name)

def format_os_label(name: str) -> str:
    if not name:
        return "未知 (Unknown)"
    key = name.strip().lower()
    return OS_NAME_MAP.get(key, name)

REFERRER_NAME_MAP = {
    "direct": "直接访问 (Direct)",
    "google": "Google 搜索",
    "baidu": "百度搜索 (Baidu)",
    "bing": "Bing 搜索",
    "sogou": "搜狗搜索 (Sogou)",
    "chatgpt": "ChatGPT (AI)",
    "claude": "Claude (AI)",
    "deepseek": "DeepSeek (AI)",
    "gemini": "Gemini (AI)",
    "copilot": "Copilot (AI)",
    "github": "GitHub",
    "bilibili": "哔哩哔哩 (B站)",
    "zhihu": "知乎 (Zhihu)",
    "v2ex": "V2EX",
    "xiaohongshu": "小红书",
    "wechat": "微信群 / 公众号",
    "weibo": "微博",
    "other": "其他来源 (Other)",
}

INPUT_TYPE_MAP = {
    "web_url": "网页链接 (Web URL)",
    "mobile_share_link": "手机口令/短链 (Mobile Share)",
    "raw_id": "纯歌单 ID (Raw ID)",
    "other": "其他 (Other)",
}

CLIPBOARD_MODE_MAP = {
    "title": "歌名 (Title)",
    "title_artist": "歌名 - 歌手 (Title - Artist)",
    "title_artist_album": "歌名 - 歌手 - 专辑 (Full)",
}

ERROR_CATEGORY_MAP = {
    "error_validation": "链接格式校验错误 (Validation)",
    "error_not_found": "歌单未找到/未公开 (Not Found)",
    "error_upstream": "音乐平台接口异常 (Upstream)",
    "error_rate_limit": "请求触发频控 (Rate Limit)",
    "error_internal": "系统服务异常 (Internal)",
}

PLATFORM_NAME_MAP = {
    "qqmusic": "QQ音乐 (QQ Music)",
    "netease": "网易云音乐 (NetEase)",
    "kugou": "酷狗音乐 (KuGou)",
    "qishui": "汽水音乐 (QiShui)",
}

def format_referrer_label(name: str) -> str:
    if not name:
        return "未知 (Unknown)"
    return REFERRER_NAME_MAP.get(name.strip().lower(), name.capitalize())

def format_input_label(name: str) -> str:
    if not name:
        return "未知 (Unknown)"
    return INPUT_TYPE_MAP.get(name.strip().lower(), name)

def format_clipboard_label(name: str) -> str:
    if not name:
        return "未知 (Unknown)"
    return CLIPBOARD_MODE_MAP.get(name.strip().lower(), name)

def format_error_label(name: str) -> str:
    if not name:
        return "未知 (Unknown)"
    return ERROR_CATEGORY_MAP.get(name.strip().lower(), name)

def format_platform_label(name: str) -> str:
    if not name:
        return "未知 (Unknown)"
    return PLATFORM_NAME_MAP.get(name.strip().lower(), name)




# ── 4. HTML 构建 (Modern White Bilingual Dashboard) ───────────────────

DISPLAY_TZ = dt.timezone(dt.timedelta(hours=8))
DISPLAY_TZ_LABEL = "UTC+8"
PROJECT_LAUNCHED_AT = "2026-09-12"


def parse_iso_timestamp(ts: str | None) -> dt.datetime | None:
    """安全解析 ISO 8601 时间戳字符串，返回带有时区信息的 datetime 对象。异常或缺失时返回 None。"""
    if not ts or not isinstance(ts, str):
        return None
    raw = ts.strip()
    if not raw:
        return None
    try:
        clean = raw.replace("Z", "+00:00")
        parsed = dt.datetime.fromisoformat(clean)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed
    except Exception:
        return None


def format_utc8_timestamp(val: dt.datetime | str | None) -> str:
    """将 datetime 或 ISO 时间字符串格式化为 YYYY-MM-DD HH:mm:ss UTC+8 格式。"""
    if val is None:
        return "—"
    if isinstance(val, dt.datetime):
        dt_val = val.astimezone(DISPLAY_TZ) if val.tzinfo is not None else val.replace(tzinfo=DISPLAY_TZ)
        return f"{dt_val.strftime('%Y-%m-%d %H:%M:%S')} {DISPLAY_TZ_LABEL}"
    if isinstance(val, str):
        parsed = parse_iso_timestamp(val)
        if parsed is not None:
            dt_val = parsed.astimezone(DISPLAY_TZ)
            return f"{dt_val.strftime('%Y-%m-%d %H:%M:%S')} {DISPLAY_TZ_LABEL}"
        return "—"
    return "—"


def compute_dashboard_uptime(
    launched_at: str | None = PROJECT_LAUNCHED_AT,
    now: dt.datetime | None = None,
) -> int | None:
    """计算基于 UTC+8 当前自然日的系统稳定运行天数。"""
    effective_launched = launched_at if launched_at is not None else PROJECT_LAUNCHED_AT
    if not isinstance(effective_launched, str) or not effective_launched.strip():
        return None
    try:
        launch_date = dt.date.fromisoformat(effective_launched.strip())
        if now is None:
            current_date = dt.datetime.now(DISPLAY_TZ).date()
        else:
            if now.tzinfo is not None:
                current_date = now.astimezone(DISPLAY_TZ).date()
            else:
                current_date = now.date()
        diff = (current_date - launch_date).days
        if diff >= 0:
            return diff + 1
        return None
    except (ValueError, TypeError):
        return None


def get_hourly_display_labels(base_utc_date: dt.date | None = None) -> list[str]:
    """生成与 UTC 0..23 小时桶一一对应的 UTC+8 显示标签 (短格式 MM/DD HH:mm 带跨日标注)。"""
    if base_utc_date is None:
        base_utc_date = dt.datetime.now(dt.timezone.utc).date()
    labels = []
    for h in range(24):
        utc_dt = dt.datetime(
            base_utc_date.year, base_utc_date.month, base_utc_date.day,
            h, 0, 0, tzinfo=dt.timezone.utc
        )
        local_dt = utc_dt.astimezone(DISPLAY_TZ)
        labels.append(local_dt.strftime("%m/%d %H:%M"))
    return labels


def build_html(
    stats: dict,
    fetched_at_display: str | None = None,
    _legacy_fetched_at_utc: str | None = None,
    now: dt.datetime | None = None,
) -> str:
    # 基础指标与 Uptime (严格以 UTC+8 日期基准计算)
    raw_launched = stats.get("launchedAt")
    effective_launched = raw_launched if raw_launched is not None else PROJECT_LAUNCHED_AT
    days = compute_dashboard_uptime(effective_launched, now=now)

    uptime_val = f"{days}" if days is not None else "—"
    uptime_badge = f"上线 / Launched: {effective_launched} · 运行 {days} 天 (Days)" if days is not None else "上线 / Launched: 未知 (Unknown)"
    uptime_footer = "连续运行天数 (Days)" if days is not None else "暂无数据 / No Data"

    # 时间信息展示 (统一为 UTC+8)
    raw_generated_at = stats.get("generatedAt")
    api_generated_str = format_utc8_timestamp(raw_generated_at)

    if fetched_at_display is not None:
        local_fetched_str = fetched_at_display.replace("CST (UTC+8)", "UTC+8").replace(" CST", " UTC+8")
    else:
        local_fetched_str = format_utc8_timestamp(now or dt.datetime.now(DISPLAY_TZ))

    visitors_val = stats.get("cumulativeDailyVisitors")
    if visitors_val is None:
        visitors_val = stats.get("totalVisitors")
    visitors = s(visitors_val)
    vis_today = s(stats.get("visitorsToday"))
    pv_total = s(stats.get("totalPageViews"))
    pv_today = s(stats.get("pageViewsToday"))
    parses_total = s(stats.get("totalPlaylistsParsed"))
    parses_today = s(stats.get("playlistsParsedToday"))
    tracks_total = s(stats.get("totalTracksProcessed"))
    tracks_today = s(stats.get("tracksProcessedToday"))
    exports_total = s(stats.get("totalExports"))
    exports_today = s(stats.get("exportsToday"))

    # 小时流量：优先使用 Worker 提供的真实滚动 24 小时 UTC 时间戳。
    # 时区只属于展示层；绝不重新排序或把 UTC 自然日硬伪装成“过去 24 小时”。
    hourly_payload = []
    for item in (stats.get("last24HourlyPageViews") or []):
        if not isinstance(item, dict):
            continue
        parsed_ts = parse_iso_timestamp(item.get("timestamp"))
        if parsed_ts is None:
            continue
        hourly_payload.append({
            "timestamp": parsed_ts.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
            "pageViews": s(item.get("pageViews")),
            "visitors": s(item.get("visitors")),
        })

    hourly_payload.sort(key=lambda item: item["timestamp"])
    hourly_payload = hourly_payload[-24:]
    hourly_source = "rolling24"

    # Backward compatibility only: older Workers expose a UTC-calendar-day 0..23 array.
    # This path is explicitly labelled legacy in the UI and is never presented as a real rolling window.
    if not hourly_payload:
        hourly_source = "legacyUtcDay"
        parsed_gen = parse_iso_timestamp(raw_generated_at)
        if parsed_gen is not None:
            base_utc_date = parsed_gen.astimezone(dt.timezone.utc).date()
        elif now is not None:
            base_utc_date = now.astimezone(dt.timezone.utc).date() if now.tzinfo is not None else now.date()
        else:
            base_utc_date = dt.datetime.now(dt.timezone.utc).date()

        for item in (stats.get("todayHourlyPageViews") or []):
            if not isinstance(item, dict):
                continue
            h = item.get("hour", -1)
            if isinstance(h, int) and 0 <= h <= 23:
                bucket_time = dt.datetime(
                    base_utc_date.year, base_utc_date.month, base_utc_date.day,
                    h, 0, 0, tzinfo=dt.timezone.utc,
                )
                hourly_payload.append({
                    "timestamp": bucket_time.isoformat().replace("+00:00", "Z"),
                    "pageViews": s(item.get("pageViews")),
                    "visitors": s(item.get("visitors")),
                })

    hourly_payload_json = j(hourly_payload)
    hourly_source_json = j(hourly_source)

    # 30天趋势
    recent = list(reversed(stats.get("recentDays") or []))[-30:]
    t_dates = j([r.get("date", "") for r in recent])
    t_parses = j([s(r.get("parses")) for r in recent])
    t_tracks = j([s(r.get("tracks")) for r in recent])
    t_exports = j([s(r.get("exports")) for r in recent])
    t_clips = j([s(r.get("clipboards")) for r in recent])
    t_visitors = j([s(r.get("visitors")) for r in recent])
    t_failures = j([s(r.get("failures")) for r in recent])

    # 地理数据
    geo_raw = stats.get("topGeo") or []
    geo_data = j([
        {
            "country": g.get("country", "?"),
            "count": s(g.get("count")),
            "percentage": s(g.get("percentage")),
        }
        for g in geo_raw
        if isinstance(g, dict)
    ])

    cn_raw = stats.get("chinaProvinces") or []
    cn_labels = j([c.get("province", "?") for c in cn_raw])
    cn_counts = j([s(c.get("count")) for c in cn_raw])
    cn_pcts = dist_pcts(cn_raw)

    # 客户端
    client = stats.get("clientStats") or {}
    br_labels = dist_names_mapped(client.get("browsers"), format_browser_label)
    br_counts = dist_counts(client.get("browsers"))
    br_pcts = dist_pcts(client.get("browsers"))

    dv_labels = dist_names_mapped(client.get("devices"), format_device_label)
    dv_counts = dist_counts(client.get("devices"))
    dv_pcts = dist_pcts(client.get("devices"))

    os_labels = dist_names_mapped(client.get("os"), format_os_label)
    os_counts = dist_counts(client.get("os"))
    os_pcts = dist_pcts(client.get("os"))

    brand_labels = dist_names(client.get("deviceBrands"))
    brand_counts = dist_counts(client.get("deviceBrands"))
    brand_pcts = dist_pcts(client.get("deviceBrands"))



    # 导出格式与剪贴板
    fmt_raw = stats.get("exportFormatsBreakdown") or {}
    fmt_labels, fmt_counts = j(list(fmt_raw.keys())), j(list(fmt_raw.values()))

    cb_raw = stats.get("clipboardFormatsBreakdown") or {}
    cb_labels = j([format_clipboard_label(k) for k in cb_raw.keys()])
    cb_counts = j(list(cb_raw.values()))

    # 平台解析
    plat_raw = stats.get("byPlatform") or {}
    plat_labels = j([format_platform_label(k) for k in plat_raw.keys()])
    plat_counts = j([s((v or {}).get("totalSuccess")) for v in plat_raw.values()])
    plat_today_counts = j([s((v or {}).get("todaySuccess")) for v in plat_raw.values()])
    plat_data = j([
        {
            "key": k,
            "label": format_platform_label(k),
            "total": s((v or {}).get("totalSuccess")),
            "today": s((v or {}).get("todaySuccess")),
        }
        for k, v in plat_raw.items()
    ])

    # 来源、输入方式、延迟与错误
    ref_labels = dist_names_mapped(stats.get("referrerDistribution"), format_referrer_label)
    ref_counts = dist_counts(stats.get("referrerDistribution"))
    ref_pcts = dist_pcts(stats.get("referrerDistribution"))

    inp_labels = dist_names_mapped(stats.get("inputTypeDistribution"), format_input_label)
    inp_counts = dist_counts(stats.get("inputTypeDistribution"))
    inp_pcts = dist_pcts(stats.get("inputTypeDistribution"))

    lat_labels = dist_names(stats.get("latencyDistribution"))
    lat_counts = dist_counts(stats.get("latencyDistribution"))
    lat_pcts = dist_pcts(stats.get("latencyDistribution"))

    err_labels = dist_names_mapped(stats.get("errorCategoryDistribution"), format_error_label)
    err_counts = dist_counts(stats.get("errorCategoryDistribution"))
    err_pcts = dist_pcts(stats.get("errorCategoryDistribution"))

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlaylistOut 数据运营看板 · Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
  <style>
    :root {{
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --card-hover: #f1f5f9;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --text-light: #94a3b8;
      --brand: #2563eb;
      --brand-soft: #eff6ff;
      --emerald: #059669;
      --emerald-soft: #ecfdf5;
      --amber: #d97706;
      --rose: #e11d48;
      --indigo: #4f46e5;
      --cyan: #0891b2;
      --radius: 14px;
      --shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}

    body {{
      background:
        radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 28rem),
        radial-gradient(circle at top right, rgba(8,145,178,0.06), transparent 24rem),
        var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }}

    /* 顶部导航与状态栏 */
    .top-nav {{
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }}

    .brand-section {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .brand-icon {{
      width: 36px;
      height: 36px;
      background: #f1f5f9;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }}

    .title-group h1 {{
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.2px;
    }}

    .title-group .sub {{
      font-size: 11px;
      color: var(--text-muted);
    }}

    .status-group {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .status-badge {{
      background: var(--brand-soft);
      border: 1px solid #bfdbfe;
      color: var(--brand);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
    }}

    .status-time {{
      background: #f1f5f9;
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
    }}

    .control-bar {{
      background: rgba(255,255,255,0.92);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 12px 14px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }}

    .control-group {{
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--text-muted);
      font-size: 11px;
    }}

    .control-group select {{
      border: 1px solid var(--card-border);
      border-radius: 9px;
      background: #fff;
      color: var(--text-main);
      padding: 7px 28px 7px 9px;
      font-size: 11px;
      outline: none;
    }}

    .control-group input[type="checkbox"] {{
      width: 15px;
      height: 15px;
      accent-color: var(--brand);
    }}

    .control-note {{
      margin-left: auto;
      color: var(--text-light);
      font-size: 10px;
      max-width: 600px;
    }}

    .chart-scroll {{
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 5px;
      scrollbar-width: thin;
    }}

    .chart-scroll-inner {{
      min-width: 900px;
      height: 280px;
    }}

    .mini-stats {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }}

    .mini-stat {{
      border: 1px solid #eef2f7;
      border-radius: 9px;
      padding: 8px 10px;
      background: #f8fafc;
    }}

    .mini-stat-name {{
      color: var(--text-muted);
      font-size: 10px;
      margin-bottom: 2px;
    }}

    .mini-stat-value {{
      color: var(--text-main);
      font-weight: 700;
      font-size: 12px;
    }}

    .mini-stat-today {{
      color: var(--text-light);
      font-size: 10px;
      margin-left: 4px;
      font-weight: 500;
    }}

    /* KPI 核心指标网格 */
    .kpi-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }}

    .kpi-card {{
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow);
      transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }}

    .kpi-card:hover {{
      border-color: #cbd5e1;
      transform: translateY(-1px);
      box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
    }}

    .kpi-label {{
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .kpi-label-en {{
      font-size: 9px;
      font-weight: 500;
      color: var(--text-light);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    .kpi-val {{
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.5px;
      line-height: 1.1;
    }}

    .kpi-footer {{
      margin-top: 6px;
      font-size: 11px;
      color: var(--emerald);
      font-weight: 500;
    }}

    .kpi-footer.amber {{
      color: var(--amber);
    }}

    /* 图表布局 */
    .section-title {{
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 22px 0 10px 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .section-title span {{
      color: var(--text-light);
      font-weight: 400;
      text-transform: none;
      font-size: 11px;
    }}

    .chart-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }}

    .chart-grid-3 {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }}

    .chart-card {{
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 16px 18px 18px;
      box-shadow: var(--shadow);
    }}

    .card-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
    }}

    .card-title {{
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }}

    .card-subtitle {{
      font-size: 10px;
      color: var(--text-light);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-top: 1px;
    }}

    .chart-box {{
      position: relative;
    }}

    .chart-box canvas {{
      max-height: 240px;
      width: 100% !important;
    }}

    .chart-box.tall canvas {{
      max-height: 280px;
    }}

    /* 底部页脚 */
    footer {{
      margin-top: 36px;
      padding: 16px 0;
      border-top: 1px solid var(--card-border);
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
    }}

    footer a {{
      color: var(--brand);
      text-decoration: none;
    }}

    @media (max-width: 640px) {{
      body {{ padding: 12px; }}
      .chart-grid, .chart-grid-3 {{ grid-template-columns: 1fr; }}
      .kpi-grid {{ grid-template-columns: repeat(2, 1fr); }}
    }}
  </style>
</head>
<body>

  <!-- 顶部导航 -->
  <div class="top-nav">
    <div class="brand-section">
      <div class="brand-icon">🎵</div>
      <div class="title-group">
        <h1>PlaylistOut 业务运营与流量统计看板</h1>
        <div class="sub">PlaylistOut Live Analytics Dashboard · Storage: UTC · Rolling 24h Display: <span id="displayTimezoneLabel">Malaysia · UTC+8</span></div>
      </div>
    </div>
    <div class="status-group">
      <span class="status-badge">{uptime_badge}</span>
      <span class="status-time">API Generated: {api_generated_str}</span>
      <span class="status-time">Local Fetched: {local_fetched_str}</span>
    </div>
  </div>

  <div class="control-bar">
    <label class="control-group">
      <span>24h 图时区 / Chart TZ</span>
      <select id="timezoneSelect">
        <option value="Asia/Kuala_Lumpur" selected>Malaysia · UTC+8</option>
        <option value="Asia/Shanghai">China · UTC+8</option>
        <option value="UTC">UTC</option>
        <option value="local">Browser Local</option>
      </select>
    </label>
    <label class="control-group">
      <span>24h 流量 / Traffic</span>
      <select id="trafficMetricSelect">
        <option value="both" selected>PV + UV</option>
        <option value="pv">PV only</option>
        <option value="uv">UV only</option>
      </select>
    </label>
    <label class="control-group" title="只影响地区图，不会修改总 PV / UV / 解析量">
      <input id="hideMalaysia" type="checkbox">
      <span>隐藏马来西亚 / Hide MY</span>
    </label>
    <div class="control-note">
      “今日 / 近30天”仍使用 Worker 的 UTC 自然日统计；滚动 24h 使用真实 UTC 时间戳并按所选时区显示。隐藏 MY 只影响地区图。
    </div>
  </div>

  <!-- 核心 KPI -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">
        <span>累计日独立访问人次</span>
        <span class="kpi-label-en">Cumulative Daily Unique Visits</span>
      </div>
      <div class="kpi-val">{n(visitors)}</div>
      <div class="kpi-footer">今日独立 (UTC) / Today Unique (UTC) +{n(vis_today)} · <span title="Daily-deduplicated, no cross-day tracking">每日去重 · 无跨日追踪</span></div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">
        <span>页面浏览 (PV)</span>
        <span class="kpi-label-en">Page Views</span>
      </div>
      <div class="kpi-val">{n(pv_total)}</div>
      <div class="kpi-footer">今日 (UTC) / Today (UTC) +{n(pv_today)}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">
        <span>歌单解析数</span>
        <span class="kpi-label-en">Playlists Parsed</span>
      </div>
      <div class="kpi-val">{n(parses_total)}</div>
      <div class="kpi-footer">今日 (UTC) / Today (UTC) +{n(parses_today)}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">
        <span>歌曲处理数</span>
        <span class="kpi-label-en">Tracks Processed</span>
      </div>
      <div class="kpi-val">{n(tracks_total)}</div>
      <div class="kpi-footer">今日 (UTC) / Today (UTC) +{n(tracks_today)}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">
        <span>文件导出数</span>
        <span class="kpi-label-en">File Exports</span>
      </div>
      <div class="kpi-val">{n(exports_total)}</div>
      <div class="kpi-footer">今日 (UTC) / Today (UTC) +{n(exports_today)}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">
        <span>系统稳定运行</span>
        <span class="kpi-label-en">System Uptime</span>
      </div>
      <div class="kpi-val">{uptime_val}</div>
      <div class="kpi-footer amber">{uptime_footer}</div>
    </div>
  </div>

  <!-- 今日流量与近期趋势 -->
  <div class="section-title">📊 流量走势 <span>/ Traffic Trends & Activity</span></div>
  <div class="chart-grid">
    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">滚动 24 小时流量</div>
          <div class="card-subtitle">Rolling 24 Hours · UTC storage · labels follow selected timezone · current hour may be partial</div>
        </div>
      </div>
      <div class="chart-box tall chart-scroll">
        <div class="chart-scroll-inner">
          <canvas id="chartHourly"></canvas>
        </div>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">近期业务量走势 (近30天)</div>
          <div class="card-subtitle">30-Day Activity · UTC calendar-day buckets (与 Worker 存储口径一致)</div>
        </div>
      </div>
      <div class="chart-box tall">
        <canvas id="chartTrend"></canvas>
      </div>
    </div>
  </div>

  <div class="chart-grid">
    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">近期独立访客走势 (近30天)</div>
          <div class="card-subtitle">30-Day Unique Visitor (UV) Trend</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartVisitors"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">平台解析份额与今日解析</div>
          <div class="card-subtitle">All-time share + today UTC counts for every provider returned by the API</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartPlatform"></canvas>
      </div>
      <div id="platformTodaySummary" class="mini-stats"></div>
    </div>
  </div>

  <!-- 访问地区分布 -->
  <div class="section-title">🌍 访问地区分布 <span>/ Geography & Regions</span></div>
  <div class="chart-grid">
    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">全球地区分布 (Top 10)</div>
          <div class="card-subtitle">Geographic Distribution of Visits · “Hide MY” only changes this chart, never global KPIs</div>
        </div>
      </div>
      <div class="chart-box tall">
        <canvas id="chartGeo"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">中国境内省份分布 (Top 10)</div>
          <div class="card-subtitle">Mainland China Province Distribution</div>
        </div>
      </div>
      <div class="chart-box tall">
        <canvas id="chartChina"></canvas>
      </div>
    </div>
  </div>

  <!-- 客户端与环境 -->
  <div class="section-title">💻 客户端终端与设备品牌 <span>/ Client Devices, Browsers & Mobile Brands</span></div>
  <div class="chart-grid">
    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">主流浏览器占比</div>
          <div class="card-subtitle">Web Browsers (WeChat, Chrome, Edge, Safari, Quark, etc.)</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartBrowser"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">手机与设备品牌</div>
          <div class="card-subtitle">Mobile & Hardware Brands (Apple, Xiaomi, Huawei, OPPO, Vivo, etc.)</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartBrand"></canvas>
      </div>
    </div>
  </div>

  <div class="chart-grid">
    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">设备终端分类</div>
          <div class="card-subtitle">Device Categories (Desktop, Mobile, Tablet)</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartDevice"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">操作系统</div>
          <div class="card-subtitle">Operating Systems (Windows, iOS, Android, macOS, Linux)</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartOS"></canvas>
      </div>
    </div>
  </div>


  <!-- 功能转化与偏好 -->
  <div class="section-title">📦 功能使用与偏好 <span>/ Feature Usage & Formats</span></div>
  <div class="chart-grid-3">
    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">导出文件格式偏好</div>
          <div class="card-subtitle">Export File Format Preferences</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartExportFmt"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">剪贴板模式偏好</div>
          <div class="card-subtitle">Clipboard Fast Copy Preferences</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartClipboard"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">输入方式分布</div>
          <div class="card-subtitle">User Input Link Types</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartInputType"></canvas>
      </div>
    </div>
  </div>

  <!-- 流量来源与网络性能 -->
  <div class="section-title">⚡ 来源渠道与系统性能 <span>/ Referrers & Performance</span></div>
  <div class="chart-grid-3">
    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">访问来源分类</div>
          <div class="card-subtitle">Traffic Referrer Sources</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartReferrer"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">解析耗时分布</div>
          <div class="card-subtitle">Request Latency Buckets</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartLatency"></canvas>
      </div>
    </div>

    <div class="chart-card">
      <div class="card-header">
        <div>
          <div class="card-title">异常分类分布</div>
          <div class="card-subtitle">Failure & Error Categories</div>
        </div>
      </div>
      <div class="chart-box">
        <canvas id="chartError"></canvas>
      </div>
    </div>
  </div>

  <footer>
    PlaylistOut 本地数据仪表板 &middot; 数据源: <a href="{API_URL}" target="_blank">{API_URL}</a> &middot; Local Fetched: {local_fetched_str} &middot; Storage Timezone: UTC · Display selectable above
  </footer>

  <script>
    // 全局 Chart.js 浅色极简主题配置
    Chart.defaults.color = '#64748b';
    Chart.defaults.borderColor = '#f1f5f9';
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    Chart.defaults.font.size = 11;

    // 清新、专业的数据配色系统 (Professional Clean Palette)
    const PALETTE = [
      '#2563eb', // Blue
      '#059669', // Emerald
      '#d97706', // Amber
      '#4f46e5', // Indigo
      '#0891b2', // Cyan
      '#e11d48', // Rose
      '#7c3aed', // Purple
      '#ea580c', // Orange
      '#64748b', // Slate
      '#16a34a', // Green
    ];

    const PALETTE_SOFT = PALETTE.map(c => c + '22');

    const BASE_SCALES = {{
      x: {{
        grid: {{ color: '#f1f5f9' }},
        ticks: {{ color: '#64748b', font: {{ size: 10 }} }}
      }},
      y: {{
        grid: {{ color: '#f1f5f9' }},
        ticks: {{ color: '#64748b', font: {{ size: 10 }} }},
        beginAtZero: true
      }}
    }};

    function resolvePercentage(percentages, index, value, total) {{
      if (Array.isArray(percentages) && index >= 0 && index < percentages.length) {{
        const apiPct = Number(percentages[index]);
        if (Number.isFinite(apiPct)) return apiPct;
      }}
      return total > 0 ? Math.round((value / total) * 100) : 0;
    }}

    // 甜甜圈图构造函数：优先显示 API 提供的真实 percentage，缺失时才由完整数据集计算。
    function createDonut(elementId, labels, data, percentages = null) {{
      const el = document.getElementById(elementId);
      if (!el) return;
      const hasData = Array.isArray(data) && data.length > 0 && data.some(v => v > 0);
      const total = hasData ? data.reduce((a, b) => a + Number(b || 0), 0) : 0;
      return new Chart(el, {{
        type: 'doughnut',
        data: {{
          labels: hasData ? labels : ['暂无数据 / No Data'],
          datasets: [{{
            data: hasData ? data : [1],
            backgroundColor: hasData ? PALETTE : ['#f1f5f9'],
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: hasData ? 4 : 0
          }}]
        }},
        options: {{
          responsive: true,
          cutout: '68%',
          plugins: {{
            legend: {{
              position: 'right',
              labels: {{ boxWidth: 10, padding: 8, font: {{ size: 10 }} }}
            }},
            tooltip: {{
              enabled: hasData,
              callbacks: {{
                label: function(ctx) {{
                  const val = Number(ctx.parsed || 0);
                  const pct = resolvePercentage(percentages, ctx.dataIndex, val, total);
                  return ` ${{ctx.label}}: ${{val.toLocaleString()}} · ${{pct}}%`;
                }}
              }}
            }}
          }}
        }}
      }});
    }}

    // 横向柱状图：同样保留 API percentage，避免用 Top-N 子集重新归一化。
    function createHBar(elementId, labels, data, color, percentages = null) {{
      const el = document.getElementById(elementId);
      if (!el) return;
      const hasData = Array.isArray(data) && data.length > 0 && data.some(v => v > 0);
      const total = hasData ? data.reduce((a, b) => a + Number(b || 0), 0) : 0;
      return new Chart(el, {{
        type: 'bar',
        data: {{
          labels: hasData ? labels : ['暂无数据 / No Data'],
          datasets: [{{
            data: hasData ? data : [0],
            backgroundColor: color || '#2563eb',
            borderRadius: 4
          }}]
        }},
        options: {{
          indexAxis: 'y',
          responsive: true,
          plugins: {{
            legend: {{ display: false }},
            tooltip: {{
              enabled: hasData,
              callbacks: {{
                label: function(ctx) {{
                  const val = Number(ctx.parsed?.x ?? ctx.raw ?? 0);
                  const pct = resolvePercentage(percentages, ctx.dataIndex, val, total);
                  return ` ${{val.toLocaleString()}} · ${{pct}}%`;
                }}
              }}
            }}
          }},
          scales: {{
            x: {{ grid: {{ color: '#f1f5f9' }}, beginAtZero: true }},
            y: {{ grid: {{ display: false }} }}
          }}
        }}
      }});
    }}

    const HOURLY_DATA = {hourly_payload_json};
    const HOURLY_SOURCE = {hourly_source_json};
    const GEO_DATA = {geo_data};
    const PLATFORM_DATA = {plat_data};
    const timezoneSelect = document.getElementById('timezoneSelect');
    const trafficMetricSelect = document.getElementById('trafficMetricSelect');
    const hideMalaysia = document.getElementById('hideMalaysia');
    let hourlyChart = null;
    let geoChart = null;

    function selectedTimeZone() {{
      if (!timezoneSelect || timezoneSelect.value === 'local') {{
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      }}
      return timezoneSelect.value;
    }}

    function selectedTimeZoneLabel() {{
      if (!timezoneSelect) return 'Malaysia · UTC+8';
      return timezoneSelect.options[timezoneSelect.selectedIndex]?.text || timezoneSelect.value;
    }}

    function formatHourLabel(iso) {{
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('zh-CN', {{
        timeZone: selectedTimeZone(),
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }}).format(d);
    }}

    function renderHourlyChart() {{
      const el = document.getElementById('chartHourly');
      if (!el) return;
      if (hourlyChart) hourlyChart.destroy();

      const labels = HOURLY_DATA.map(x => formatHourLabel(x.timestamp));
      const mode = trafficMetricSelect?.value || 'both';
      hourlyChart = new Chart(el, {{
        type: 'bar',
        data: {{
          labels,
          datasets: [
            {{
              label: 'PV 页面浏览 / Page Views',
              data: HOURLY_DATA.map(x => Number(x.pageViews || 0)),
              backgroundColor: '#2563eb',
              borderRadius: 4,
              hidden: mode === 'uv'
            }},
            {{
              label: 'UV 当日首次访问 / Daily-unique first visits',
              data: HOURLY_DATA.map(x => Number(x.visitors || 0)),
              backgroundColor: '#38bdf8',
              borderRadius: 4,
              hidden: mode === 'pv'
            }}
          ]
        }},
        options: {{
          responsive: true,
          maintainAspectRatio: false,
          interaction: {{ mode: 'index', intersect: false }},
          plugins: {{
            legend: {{ position: 'top', labels: {{ boxWidth: 10, padding: 10 }} }},
            tooltip: {{
              callbacks: {{
                title: (items) => {{
                  const idx = items?.[0]?.dataIndex ?? -1;
                  const raw = HOURLY_DATA[idx]?.timestamp;
                  return raw ? `${{formatHourLabel(raw)}} · ${{selectedTimeZoneLabel()}}` : '';
                }}
              }}
            }}
          }},
          scales: BASE_SCALES
        }}
      }});
    }}

    function renderGeoChart() {{
      const filtered = (hideMalaysia?.checked)
        ? GEO_DATA.filter(x => String(x.country).toUpperCase() !== 'MY')
        : GEO_DATA;
      if (geoChart) geoChart.destroy();
      geoChart = createHBar(
        'chartGeo',
        filtered.map(x => x.country),
        filtered.map(x => Number(x.count || 0)),
        '#2563eb'
      );
    }}

    function persistControls() {{
      try {{
        localStorage.setItem('playlistout.dashboard.timezone', timezoneSelect?.value || 'Asia/Kuala_Lumpur');
        localStorage.setItem('playlistout.dashboard.trafficMetric', trafficMetricSelect?.value || 'both');
        localStorage.setItem('playlistout.dashboard.hideMalaysia', hideMalaysia?.checked ? '1' : '0');
      }} catch (_) {{}}
    }}

    function restoreControls() {{
      try {{
        const tz = localStorage.getItem('playlistout.dashboard.timezone');
        const metric = localStorage.getItem('playlistout.dashboard.trafficMetric');
        const hide = localStorage.getItem('playlistout.dashboard.hideMalaysia');
        if (tz && timezoneSelect && [...timezoneSelect.options].some(o => o.value === tz)) timezoneSelect.value = tz;
        if (metric && trafficMetricSelect && [...trafficMetricSelect.options].some(o => o.value === metric)) trafficMetricSelect.value = metric;
        if (hideMalaysia) hideMalaysia.checked = hide === '1';
      }} catch (_) {{}}
    }}

    restoreControls();
    const tzLabel = document.getElementById('displayTimezoneLabel');
    if (tzLabel) tzLabel.textContent = selectedTimeZoneLabel();
    renderHourlyChart();
    renderGeoChart();

    timezoneSelect?.addEventListener('change', () => {{
      const label = document.getElementById('displayTimezoneLabel');
      if (label) label.textContent = selectedTimeZoneLabel();
      persistControls();
      renderHourlyChart();
    }});
    trafficMetricSelect?.addEventListener('change', () => {{
      persistControls();
      renderHourlyChart();
    }});
    hideMalaysia?.addEventListener('change', () => {{
      persistControls();
      renderGeoChart();
    }});

    if (HOURLY_SOURCE !== 'rolling24') {{
      console.warn('Dashboard is using legacy UTC-day hourly data; deploy a Worker with last24HourlyPageViews for a true rolling window.');
    }}

    // 2. 近期趋势走势 (解析 / 导出 / 剪贴板 / 失败)
    const elTrend = document.getElementById('chartTrend');
    if (elTrend) {{
      new Chart(elTrend, {{
        type: 'line',
        data: {{
          labels: {t_dates},
          datasets: [
            {{
              label: '解析 / Parses',
              data: {t_parses},
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37,99,235,0.06)',
              fill: true,
              tension: 0.3,
              pointRadius: 2.5
            }},
            {{
              label: '导出 / Exports',
              data: {t_exports},
              borderColor: '#059669',
              backgroundColor: 'rgba(5,150,105,0.05)',
              fill: true,
              tension: 0.3,
              pointRadius: 2.5
            }},
            {{
              label: '剪贴板 / Clipboards',
              data: {t_clips},
              borderColor: '#d97706',
              fill: false,
              tension: 0.3,
              pointRadius: 2
            }},
            {{
              label: '失败 / Failures',
              data: {t_failures},
              borderColor: '#e11d48',
              borderDash: [4, 4],
              fill: false,
              tension: 0.3,
              pointRadius: 2
            }}
          ]
        }},
        options: {{
          responsive: true,
          interaction: {{ mode: 'index', intersect: false }},
          plugins: {{
            legend: {{ position: 'top', labels: {{ boxWidth: 10, padding: 10 }} }}
          }},
          scales: BASE_SCALES
        }}
      }});
    }}

    // 3. 独立访客走势
    const elVis = document.getElementById('chartVisitors');
    if (elVis) {{
      new Chart(elVis, {{
        type: 'line',
        data: {{
          labels: {t_dates},
          datasets: [{{
            label: '每日独立访客 / Daily Unique Visitors',
            data: {t_visitors},
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79,70,229,0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 3
          }}]
        }},
        options: {{
          responsive: true,
          plugins: {{ legend: {{ display: false }} }},
          scales: BASE_SCALES
        }}
      }});
    }}

    // 4. 平台解析分布
    createDonut('chartPlatform', {plat_labels}, {plat_counts});

    // 5. 地理分布：全球图由可交互的 MY 过滤器管理；中国省份图保持原始真实计数。
    createHBar('chartChina', {cn_labels}, {cn_counts}, '#0891b2');

    // 6. 客户端 (浏览器 / 硬件品牌 / 设备 / 操作系统)
    createDonut('chartBrowser', {br_labels}, {br_counts});
    createDonut('chartBrand', {brand_labels}, {brand_counts});
    createDonut('chartDevice', {dv_labels}, {dv_counts});
    createDonut('chartOS', {os_labels}, {os_counts});

    // 7. 导出格式 & 剪贴板 & 输入类型
    const elExport = document.getElementById('chartExportFmt');
    if (elExport) {{
      new Chart(elExport, {{
        type: 'bar',
        data: {{
          labels: {fmt_labels},
          datasets: [{{
            label: '导出数 / Exports',
            data: {fmt_counts},
            backgroundColor: '#059669',
            borderRadius: 4
          }}]
        }},
        options: {{
          responsive: true,
          plugins: {{ legend: {{ display: false }} }},
          scales: BASE_SCALES
        }}
      }});
    }}

    createDonut('chartClipboard', {cb_labels}, {cb_counts});
    createDonut('chartInputType', {inp_labels}, {inp_counts});

    // 8. 来源、延迟与错误
    createHBar('chartReferrer', {ref_labels}, {ref_counts}, '#4f46e5');

    const elLatency = document.getElementById('chartLatency');
    if (elLatency) {{
      new Chart(elLatency, {{
        type: 'bar',
        data: {{
          labels: {lat_labels},
          datasets: [{{
            label: '请求数 / Requests',
            data: {lat_counts},
            backgroundColor: '#0284c7',
            borderRadius: 4
          }}]
        }},
        options: {{
          responsive: true,
          plugins: {{ legend: {{ display: false }} }},
          scales: BASE_SCALES
        }}
      }});
    }}

    createDonut('chartError', {err_labels}, {err_counts});
  </script>
</body>
</html>"""


# ── 5. 主入口 (Smart CLI Entry) ───────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PlaylistOut 本地数据看板生成器")
    parser.add_argument("--api", default=API_URL, help="API 地址")
    parser.add_argument("--out", default=None, help="自定义输出 HTML 路径")
    parser.add_argument("--no-open", action="store_true", help="不自动在浏览器中打开")
    args = parser.parse_args()

    # 无论用户从哪个目录执行，自动定位仓库根目录
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent
    if not (repo_root / ".git").exists() and (Path.cwd() / ".git").exists():
        repo_root = Path.cwd()

    if args.out:
        out_path = Path(args.out).resolve()
    else:
        out_path = repo_root / "dashboard.html"

    print(f"[Dashboard] 正在从 API 抓取最新统计数据...")
    print(f"            源地址 / Endpoint: {args.api}")
    try:
        stats = fetch_stats(args.api)
    except Exception as e:
        print(f"[Dashboard] [ERROR] 获取数据失败: {e}")
        sys.exit(1)

    now_display = dt.datetime.now(DISPLAY_TZ)
    fetched_at_display = f"{now_display.strftime('%Y-%m-%d %H:%M:%S')} {DISPLAY_TZ_LABEL}"

    print("[Dashboard] 正在渲染白底双语数据看板 / Rendering HTML ...")
    html_content = build_html(stats, fetched_at_display)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_content, encoding="utf-8")
    print(f"[Dashboard] [OK] 看板文件已生成 / File generated:")
    print(f"            {out_path}")
    print(f"[Dashboard] 看板数据生成时间 / Generated at: {fetched_at_display}")

    if not args.no_open:
        print("[Dashboard] 正在唤起默认浏览器查看 / Launching browser ...")
        webbrowser.open(out_path.as_uri())

    print("[Dashboard] 完成 / Done!")


if __name__ == "__main__":
    main()
