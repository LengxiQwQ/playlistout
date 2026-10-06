#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PlaylistOut Analytics V2 local dashboard.

The browser talks only to a loopback Python proxy. INSIGHTS_ADMIN_TOKEN remains
inside the Python process and is never written into HTML or JavaScript.
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REMOTE_BASE = os.environ.get(
    "PLAYLISTOUT_API_BASE", "https://playlistout-api.lengxiqwq.com"
).rstrip("/")
ANALYTICS_PARAMS = {"from", "to", "channel", "client", "platform", "country", "region"}
FEEDBACK_PARAMS = {"status", "limit", "offset", "id"}


def get_admin_token(repo_root: Path | None = None) -> str | None:
    token = os.environ.get("INSIGHTS_ADMIN_TOKEN", "").strip()
    if token:
        return token
    if repo_root is None:
        repo_root = Path(__file__).resolve().parents[2]
    for path in (
        repo_root / ".dev.vars",
        repo_root / ".env.local",
        repo_root / "worker" / ".dev.vars",
        repo_root / "worker" / ".env.local",
    ):
        if not path.exists():
            continue
        try:
            for raw in path.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key.strip() == "INSIGHTS_ADMIN_TOKEN":
                    value = value.strip().strip('"').strip("'")
                    if value:
                        return value
        except OSError:
            pass
    return None


def remote_request(
    token: str,
    path: str,
    method: str = "GET",
    query: dict[str, str] | None = None,
):
    url = REMOTE_BASE + path
    if query:
        url += "?" + urllib.parse.urlencode(query)
    request = urllib.request.Request(
        url,
        method=method,
        headers={
            "Accept": "application/json",
            "Authorization": "Bearer " + token,
            "User-Agent": "PlaylistOut-Dashboard/3.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return (
                int(response.status),
                response.read(),
                response.headers.get("Content-Type", "application/json"),
            )
    except urllib.error.HTTPError as exc:
        return (
            int(exc.code),
            exc.read(),
            exc.headers.get("Content-Type", "application/json"),
        )
    except urllib.error.URLError:
        payload = json.dumps(
            {
                "success": False,
                "error": {
                    "code": "UPSTREAM_UNAVAILABLE",
                    "message": "Dashboard proxy could not reach the PlaylistOut API.",
                },
            },
            ensure_ascii=False,
        ).encode("utf-8")
        return 502, payload, "application/json; charset=utf-8"


CORE_METRICS = (
    "resolve_request",
    "playlist_success",
    "user_success",
    "resolve_failure",
    "tracks_processed",
    "export",
    "clipboard",
    "page_view",
    "visitor_unique",
    "rate_limited",
    "migration_handoff",
)


def fetch_dashboard_snapshot(token: str) -> dict:
    status, body, _content_type = remote_request(
        token,
        "/api/internal/analytics/v2/snapshot",
    )
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("云端 Analytics 快照返回了无效 JSON。") from exc
    if status != 200 or not payload.get("success"):
        message = (
            (payload.get("error") or {}).get("message")
            if isinstance(payload, dict)
            else None
        )
        raise RuntimeError(message or f"拉取云端 Analytics 快照失败（HTTP {status}）。")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("云端 Analytics 快照缺少 data。")
    return data


def _query_value(query: dict[str, str], key: str) -> str:
    return str(query.get(key, "") or "").strip()


def _matches(
    row: dict,
    filters: dict[str, str],
    *,
    include_geo: bool = False,
    environment: bool = False,
    omit: str | None = None,
) -> bool:
    date_value = str(row.get("date", ""))
    if date_value < filters["from"] or date_value > filters["to"]:
        return False
    if omit != "channel" and filters.get("channel") and row.get("channel") != filters["channel"]:
        return False
    if omit != "client" and filters.get("client") and row.get("client_id") != filters["client"]:
        return False
    if not environment and omit != "platform" and filters.get("platform") and row.get("platform") != filters["platform"]:
        return False
    if include_geo:
        if omit != "country" and filters.get("country") and row.get("country") != filters["country"]:
            return False
        if omit != "region" and filters.get("region") and row.get("region") != filters["region"]:
            return False
    return True


def _sum_by(rows: list[dict], key: str) -> list[dict]:
    totals: dict[str, int] = defaultdict(int)
    for row in rows:
        name = str(row.get(key, "") or "")
        totals[name] += int(row.get("count", 0) or 0)
    return [
        {"name": name, "count": count}
        for name, count in sorted(totals.items(), key=lambda item: (-item[1], item[0]))
        if name
    ]


def build_local_analytics(snapshot: dict, query: dict[str, str]) -> dict:
    daily = [row for row in snapshot.get("dailyCore", []) if isinstance(row, dict)]
    hourly = [row for row in snapshot.get("hourlyCore", []) if isinstance(row, dict)]
    breakdown_rows = [row for row in snapshot.get("breakdowns", []) if isinstance(row, dict)]
    geo_rows = [row for row in snapshot.get("geo", []) if isinstance(row, dict)]
    env_rows = [row for row in snapshot.get("clientEnv", []) if isinstance(row, dict)]

    all_dates = sorted({str(row.get("date")) for row in daily if row.get("date")})
    latest = all_dates[-1] if all_dates else ""
    earliest = all_dates[0] if all_dates else ""
    from_date = _query_value(query, "from") or earliest or latest
    to_date = _query_value(query, "to") or latest or earliest
    if from_date > to_date:
        from_date, to_date = to_date, from_date

    filters = {
        "from": from_date,
        "to": to_date,
        "channel": _query_value(query, "channel").lower(),
        "client": _query_value(query, "client").lower(),
        "platform": _query_value(query, "platform").lower(),
        "country": _query_value(query, "country").upper(),
        "region": _query_value(query, "region"),
    }
    geo_active = bool(filters["country"] or filters["region"])

    source = geo_rows if geo_active else daily
    filtered_source = [
        row
        for row in source
        if _matches(row, filters, include_geo=geo_active)
    ]

    overview_raw: dict[str, int] = defaultdict(int)
    for row in filtered_source:
        overview_raw[str(row.get("metric", ""))] += int(row.get("count", 0) or 0)
    overview = {metric: overview_raw.get(metric, 0) for metric in CORE_METRICS}
    resolve_request = int(overview["resolve_request"])
    resolve_terminal = (
        int(overview["playlist_success"])
        + int(overview["user_success"])
        + int(overview["resolve_failure"])
    )

    by_day: dict[str, dict] = {}
    for row in filtered_source:
        day = str(row.get("date", ""))
        metric = str(row.get("metric", ""))
        if not day or not metric:
            continue
        target = by_day.setdefault(day, {"date": day})
        target[metric] = int(target.get(metric, 0)) + int(row.get("count", 0) or 0)
    timeseries = [by_day[key] for key in sorted(by_day)]

    hourly_timeseries: list[dict] = []
    if not geo_active and from_date == to_date:
        by_hour: dict[int, dict] = {}
        for row in hourly:
            if not _matches(row, filters):
                continue
            hour = int(row.get("hour", 0) or 0)
            metric = str(row.get("metric", ""))
            target = by_hour.setdefault(hour, {"date": from_date, "hour": hour})
            target[metric] = int(target.get(metric, 0)) + int(row.get("count", 0) or 0)
        hourly_timeseries = [by_hour[key] for key in sorted(by_hour)]

    breakdown_totals: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in breakdown_rows:
        if not _matches(row, filters):
            continue
        dimension = str(row.get("dimension", ""))
        value = str(row.get("value", ""))
        if dimension and value:
            breakdown_totals[dimension][value] += int(row.get("count", 0) or 0)
    breakdowns = {
        dimension: [
            {"name": name, "count": count}
            for name, count in sorted(values.items(), key=lambda item: (-item[1], item[0]))[:50]
        ]
        for dimension, values in breakdown_totals.items()
    }

    filtered_geo = [
        row for row in geo_rows if _matches(row, filters, include_geo=True)
    ]
    countries = _sum_by(
        [row for row in filtered_geo if row.get("country") != "UNKNOWN"],
        "country",
    )[:50]
    regions = _sum_by(
        [row for row in filtered_geo if row.get("region") != "UNKNOWN"],
        "region",
    )[:80]

    def filter_option_rows(omit: str, metrics: set[str]) -> list[dict]:
        return [
            row
            for row in daily
            if str(row.get("metric", "")) in metrics
            and _matches(row, filters, omit=omit)
        ]

    channels = _sum_by(filter_option_rows("channel", {"resolve_request"}), "channel")
    clients = _sum_by(filter_option_rows("client", {"resolve_request"}), "client_id")
    platforms = _sum_by(
        filter_option_rows("platform", {"resolve_request", "export", "clipboard"}),
        "platform",
    )

    country_option_rows = [
        row
        for row in geo_rows
        if row.get("country") != "UNKNOWN"
        and _matches(row, filters, include_geo=True, omit="country")
    ]
    region_option_rows = [
        row
        for row in geo_rows
        if row.get("region") != "UNKNOWN"
        and _matches(row, filters, include_geo=True, omit="region")
    ]

    filtered_env = [
        row
        for row in env_rows
        if _matches(row, filters, environment=True)
    ]
    devices = _sum_by(filtered_env, "device_class")
    browsers = _sum_by(filtered_env, "browser_family")
    operating_systems = _sum_by(filtered_env, "os_family")

    export_total = sum(item["count"] for item in breakdowns.get("export_format", []))
    clipboard_total = sum(item["count"] for item in breakdowns.get("clipboard_mode", []))

    invalid_count = 0
    for rows in (daily, hourly, breakdown_rows, geo_rows):
        for row in rows:
            if row.get("date") == "TOTAL" or row.get("platform") == "all":
                invalid_count += 1

    filtered_resolve = [
        row
        for row in daily
        if row.get("metric") == "resolve_request" and _matches(row, filters)
    ]
    total_count = sum(int(row.get("count", 0) or 0) for row in filtered_resolve)
    legacy_count = sum(
        int(row.get("count", 0) or 0)
        for row in filtered_resolve
        if row.get("channel") == "legacy_mixed"
    )

    checks = [
        {
            "id": "resolve_invariant",
            "ok": resolve_request == resolve_terminal,
            "expected": resolve_request,
            "actual": resolve_terminal,
            "note": "resolve_request must equal playlist_success + user_success + resolve_failure",
        },
        {
            "id": "export_breakdown",
            "ok": geo_active or int(overview["export"]) == export_total,
            "expected": int(overview["export"]),
            "actual": export_total,
            "note": (
                "Geo filtering intentionally does not correlate reliability/breakdown cubes."
                if geo_active
                else "export must equal sum(export_format)"
            ),
        },
        {
            "id": "clipboard_breakdown",
            "ok": geo_active or int(overview["clipboard"]) == clipboard_total,
            "expected": int(overview["clipboard"]),
            "actual": clipboard_total,
            "note": (
                "Geo filtering intentionally does not correlate reliability/breakdown cubes."
                if geo_active
                else "clipboard must equal sum(clipboard_mode)"
            ),
        },
        {
            "id": "forbidden_rollups",
            "ok": invalid_count == 0,
            "expected": 0,
            "actual": invalid_count,
            "note": "V2 tables must never contain TOTAL/all rollups",
        },
    ]

    success_count = int(overview["playlist_success"]) + int(overview["user_success"])
    return {
        "version": 2,
        "filters": filters,
        "generatedAt": snapshot.get("generatedAt"),
        "availableDateRange": {"from": earliest or None, "to": latest or None},
        "overview": {
            **overview,
            "success_rate": round(success_count / resolve_request * 100, 2)
            if resolve_request > 0
            else 0,
            "active_clients": len([item for item in clients if item["count"] > 0]),
        },
        "timeseries": timeseries,
        "hourlyTimeseries": hourly_timeseries,
        "breakdowns": breakdowns,
        "environment": {
            "devices": devices,
            "browsers": browsers,
            "operatingSystems": operating_systems,
            "filterScope": "Environment supports date/channel/client filters. Platform and geography are intentionally separate privacy cubes.",
        },
        "geo": {
            "countries": countries,
            "regions": regions,
            "filterScope": "Geography is intentionally stored in a separate privacy-preserving cube. Geo filters affect overview/timeseries/geo, not reliability breakdowns.",
        },
        "availableFilters": {
            "channels": channels,
            "clients": clients,
            "platforms": platforms,
            "countries": _sum_by(country_option_rows, "country")[:50],
            "regions": _sum_by(region_option_rows, "region")[:80],
        },
        "dataQuality": {
            "status": "healthy" if all(check["ok"] for check in checks) else "error",
            "checks": checks,
            "latestDate": latest or None,
            "legacyMixedShare": round(legacy_count / total_count * 100, 2)
            if total_count > 0
            else 0,
        },
    }


def build_local_quarantine(snapshot: dict, query: dict[str, str]) -> dict:
    rows = [row for row in snapshot.get("quarantine", []) if isinstance(row, dict)]
    from_date = _query_value(query, "from")
    to_date = _query_value(query, "to")
    if from_date and to_date and from_date > to_date:
        from_date, to_date = to_date, from_date
    reason = _query_value(query, "reason")
    try:
        limit = max(1, min(500, int(_query_value(query, "limit") or "100")))
    except ValueError:
        limit = 100

    filtered = []
    for row in rows:
        incident_date = str(row.get("incident_date", ""))
        if from_date and incident_date < from_date:
            continue
        if to_date and incident_date > to_date:
            continue
        if reason and row.get("reason") != reason:
            continue
        filtered.append(row)
    filtered.sort(
        key=lambda row: (
            str(row.get("incident_date", "")),
            int(row.get("id", 0) or 0),
        ),
        reverse=True,
    )
    visible = filtered[:limit]
    return {
        "quarantine": visible,
        "totalRecords": len(filtered),
        "totalEvents": sum(int(row.get("count", 0) or 0) for row in filtered),
    }



def build_local_feedback(snapshot: dict, query: dict[str, str]) -> dict:
    rows = [row for row in snapshot.get("feedback", []) if isinstance(row, dict)]
    status = _query_value(query, "status")
    if status:
        rows = [row for row in rows if str(row.get("status", "")) == status]
    rows.sort(
        key=lambda row: (
            str(row.get("last_reported_at", "") or row.get("first_reported_at", "")),
            int(row.get("id", 0) or 0),
        ),
        reverse=True,
    )
    try:
        limit = max(1, min(200, int(_query_value(query, "limit") or "50")))
    except ValueError:
        limit = 50
    try:
        offset = max(0, int(_query_value(query, "offset") or "0"))
    except ValueError:
        offset = 0
    return {
        "entries": rows[offset : offset + limit],
        "total": len(rows),
    }


HTML = r'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PlaylistOut Analytics</title>
<style>
:root{color-scheme:light dark;--bg:#f6f8fb;--p:#fff;--t:#172033;--m:#6b7585;--l:#e5e9f0;--a:#2563eb;--g:#18853b;--r:#c83434;--s:0 8px 26px rgba(30,45,70,.06)}
@media(prefers-color-scheme:dark){:root{--bg:#0d1117;--p:#151b23;--t:#e6edf3;--m:#8b949e;--l:#29313c;--a:#6ea8fe;--g:#4ac26b;--r:#ff7b72;--s:none}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}button,select,input{font:inherit;color:inherit}.wrap{max-width:1440px;margin:auto;padding:18px 24px}.top{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--l)}.head{display:flex;justify-content:space-between;gap:16px;align-items:center}.headright{display:flex;flex-direction:column;align-items:flex-end;gap:5px}h1{margin:0;font-size:23px}.muted{font-size:12px;color:var(--m)}.health{padding:7px 11px;border:1px solid var(--l);background:var(--p);border-radius:999px;font-size:12px}.health.good{color:var(--g)}.health.bad{color:var(--r)}.filters{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr)) auto;gap:9px;margin-top:14px}.date-field{grid-column:1/-1}.field label{display:block;font-size:11px;color:var(--m);margin:0 0 5px 2px}.field select,.field input,.ghost{height:38px;width:100%;padding:0 9px;border:1px solid var(--l);border-radius:9px;background:var(--p)}.date-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.date-group{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.date-group .date-label{font-size:11px;color:var(--m);white-space:nowrap}.date-group input{width:150px}.date-tools .ghost{width:auto;white-space:nowrap}.range{display:flex;gap:5px;flex-wrap:wrap}.range button{height:38px;padding:0 10px;border:1px solid var(--l);border-radius:9px;background:var(--p);cursor:pointer}.range button.active{background:var(--a);color:#fff;border-color:var(--a)}.range-note{font-size:11px;color:var(--m);align-self:center}.tabs{display:flex;gap:4px;overflow:auto;padding-top:13px}.tab{border:0;border-radius:8px;padding:9px 12px;background:transparent;color:var(--m);cursor:pointer;white-space:nowrap}.tab.active{background:var(--p);color:var(--t);box-shadow:var(--s)}.page{display:none}.page.active{display:block}.section{display:flex;justify-content:space-between;align-items:end;margin:24px 0 12px}.section h2{margin:0;font-size:18px}.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.card,.panel{background:var(--p);border:1px solid var(--l);border-radius:13px;box-shadow:var(--s)}.card{padding:15px}.label{font-size:12px;color:var(--m)}.value{font-size:25px;font-weight:700;margin-top:7px}.grid2{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.panel{padding:16px;min-width:0}.panel h3{font-size:14px;margin:0 0 12px}.chart{height:300px}.trend-chart{height:300px;display:flex;flex-direction:column;gap:8px}.trend-chart svg{width:100%;height:260px;display:block}.trend-grid{stroke:var(--l);stroke-width:1}.trend-success{fill:none;stroke:var(--g);stroke-width:3}.trend-failure{fill:none;stroke:var(--r);stroke-width:3}.trend-dot-success{fill:var(--g)}.trend-dot-failure{fill:var(--r)}.trend-axis{fill:var(--m);font-size:11px}.trend-legend{display:flex;gap:14px;font-size:11px;color:var(--m)}.legend-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}.legend-success{background:var(--g)}.legend-failure{background:var(--r)}.scope-note{padding:10px 12px;border:1px solid var(--l);border-radius:10px;background:var(--p);font-size:12px;color:var(--m);margin:0 0 12px}.scope-note.warn{border-color:#d59a2d;color:var(--t)}.bars{display:flex;flex-direction:column;gap:9px}.bar{display:grid;grid-template-columns:135px 1fr 62px;gap:8px;align-items:center;font-size:12px}.bn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.track{height:8px;background:var(--l);border-radius:8px;overflow:hidden}.fill{height:100%;background:var(--a)}.num{text-align:right;color:var(--m);font-variant-numeric:tabular-nums}.notice{padding:10px 12px;border:1px solid var(--l);border-radius:10px;margin:8px 0;font-size:12px}.notice.bad{border-color:var(--r);color:var(--r)}.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{padding:5px 8px;border:1px solid var(--l);border-radius:999px;background:var(--p);font-size:11px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px 8px;border-bottom:1px solid var(--l);text-align:left}th{color:var(--m)}.scroll{overflow:auto;max-height:520px}.status{border:1px solid var(--l);border-radius:7px;background:var(--bg);padding:4px 6px;cursor:pointer}.footer{text-align:center;color:var(--m);font-size:11px;padding:30px}.ghost{cursor:pointer}
@media(max-width:1100px){.filters{grid-template-columns:repeat(3,1fr)}.date-field{grid-column:1/-1}.kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.wrap{padding:14px}.filters{grid-template-columns:1fr 1fr}.date-field{grid-column:1/-1}.date-tools{align-items:stretch}.date-group{width:100%}.date-group input{flex:1;min-width:130px}.range{width:100%}.kpis{grid-template-columns:1fr 1fr}.grid2,.grid3{grid-template-columns:1fr}.bar{grid-template-columns:100px 1fr 52px}}
</style></head><body>
<div class="top"><div class="wrap"><div class="head"><div><h1>PlaylistOut Analytics</h1><div class="muted">Analytics V2 · Token 不进入浏览器 · 启动时一次性拉取云端快照 · 后续筛选均在本机完成</div></div><div class="headright"><div id="health" class="health">● Loading</div><div id="updated" class="muted">尚未加载</div><button id="refreshData" class="ghost" style="width:auto;height:32px">刷新云端数据</button></div></div>
<div class="filters"><div class="field date-field"><label>日期（UTC 日桶）</label><div class="date-tools"><div class="date-group"><span class="date-label">单日</span><input id="singleDate" type="date" aria-label="查看单日"><button id="applySingleDate" class="ghost">查看这一天</button></div><div class="date-group"><span class="date-label">范围</span><input id="fromDate" type="date" aria-label="开始日期"><span class="date-label">至</span><input id="toDate" type="date" aria-label="结束日期"><button id="applyDateRange" class="ghost">应用范围</button></div><div class="range"><button data-range="today">今天</button><button data-range="yesterday">昨天</button><button data-range="daybefore">前天</button><button data-range="day3">大前天</button><button data-range="7" class="active">近7天</button><button data-range="30">近30天</button><button data-range="all">全部历史</button></div><span class="range-note">单日自动显示小时趋势；任意日期和范围都从本地快照读取，不重复请求 Worker</span></div></div><div class="field"><label>Channel</label><select id="channel"><option value="">全部</option><option>web</option><option>plugin</option><option>api</option><option>legacy_mixed</option></select></div><div class="field"><label>Client</label><select id="client"><option value="">全部</option></select></div><div class="field"><label>Platform</label><select id="platform"><option value="">全部</option><option>qqmusic</option><option>netease</option><option>kugou</option><option>qishui</option></select></div><div class="field"><label>Country</label><select id="country"><option value="">全部</option></select></div><div class="field"><label>Region</label><select id="region"><option value="">全部</option></select></div><div class="field"><label>&nbsp;</label><button id="reset" class="ghost">重置</button></div></div>
<div class="tabs"><button class="tab active" data-page="overview">Overview</button><button class="tab" data-page="web">Web</button><button class="tab" data-page="integrations">Integrations</button><button class="tab" data-page="reliability">Reliability</button><button class="tab" data-page="security">Security</button><button class="tab" data-page="feedback">Feedback</button></div></div></div>
<main class="wrap"><div id="error"></div>
<section class="page active" id="page-overview"><div class="section"><div><h2>整体情况</h2><div class="muted">先看结果，再下钻原因。</div></div><div id="chips" class="chips"></div></div><div id="overviewKpis" class="kpis"></div><div class="grid2"><div class="panel"><h3>请求趋势</h3><div class="muted" style="margin-bottom:8px">单日范围显示小时趋势，多日范围显示每日趋势；小时标签按浏览器本地时区展示。</div><div id="trend" class="trend-chart" role="img" aria-label="请求趋势"></div></div><div class="panel"><h3>请求目标平台</h3><div id="platformBars" class="bars"></div></div></div><div class="grid3"><div class="panel"><h3>Resolve Clients</h3><div id="clientBars" class="bars"></div></div><div class="panel"><h3>国家 / 地区</h3><div id="countryBars" class="bars"></div></div><div class="panel"><h3>Data Quality</h3><div id="quality"></div></div></div></section>
<section class="page" id="page-web"><div class="section"><div><h2>Web</h2><div class="muted">官网访问、来源与客户端环境。</div></div></div><div id="webScope" class="scope-note" hidden></div><div id="webKpis" class="kpis"></div><div class="grid3"><div class="panel"><h3>Referrer</h3><div id="referrerBars" class="bars"></div></div><div class="panel"><h3>Browser</h3><div id="browserBars" class="bars"></div></div><div class="panel"><h3>Device / OS</h3><div id="deviceBars" class="bars"></div><hr><div id="osBars" class="bars"></div></div></div></section>
<section class="page" id="page-integrations"><div class="section"><div><h2>Integrations</h2><div class="muted">MusicFree、Public API 与未来集成。</div></div></div><div id="integrationScope" class="scope-note"></div><div id="integrationKpis" class="kpis"></div><div class="grid3"><div class="panel"><h3>Clients</h3><div id="integrationClients" class="bars"></div></div><div class="panel"><h3>Versions</h3><div id="versionBars" class="bars"></div></div><div class="panel"><h3>Host Platforms</h3><div id="hostBars" class="bars"></div></div><div class="panel"><h3>Migration Destinations</h3><div id="migrationBars" class="bars"></div></div></div></section>
<section class="page" id="page-reliability"><div class="section"><div><h2>Reliability</h2><div class="muted">失败原因、阶段与延迟；可靠性 cube 不伪造地理关联。</div></div></div><div id="reliabilityScope" class="scope-note" hidden></div><div id="reliabilityKpis" class="kpis"></div><div class="grid3"><div class="panel"><h3>Failure Code</h3><div id="failureCodeBars" class="bars"></div></div><div class="panel"><h3>Failure Stage</h3><div id="failureStageBars" class="bars"></div></div><div class="panel"><h3>Latency</h3><div id="latencyBars" class="bars"></div></div></div><div class="grid3"><div class="panel"><h3>Requested Type</h3><div id="requestedTypeBars" class="bars"></div></div><div class="panel"><h3>Provider Failure Path</h3><div id="providerBars" class="bars"></div></div><div class="panel"><h3>Endpoint</h3><div id="endpointBars" class="bars"></div></div></div></section>
<section class="page" id="page-security"><div class="section"><div><h2>Security</h2><div class="muted">API 是产品流量；Bot、429、Quarantine 才是安全层。</div></div></div><div id="securityKpis" class="kpis"></div><div class="grid2"><div class="panel"><h3>Rate-limit Endpoints</h3><div id="rateBars" class="bars"></div></div><div class="panel"><h3>Quarantine Summary</h3><div id="quarantineSummary" class="bars"></div></div></div><div class="panel" style="margin-top:12px"><h3>最近隔离记录</h3><div class="scroll"><table><thead><tr><th>Date</th><th>Reason</th><th>Platform</th><th>Dimension</th><th>Region</th><th>Count</th></tr></thead><tbody id="quarantineRows"></tbody></table></div></div></section>
<section class="page" id="page-feedback"><div class="section"><div><h2>Feedback</h2><div class="muted">解析失败反馈工作流。</div></div><button id="reloadFeedback" class="ghost" style="width:auto">刷新</button></div><div class="panel"><div class="scroll"><table><thead><tr><th>ID</th><th>时间</th><th>Platform</th><th>Error</th><th>Reports</th><th>Status</th><th>操作</th></tr></thead><tbody id="feedbackRows"></tbody></table></div></div></section>
<div class="footer">PlaylistOut Analytics V2 · Local loopback proxy</div></main>
<script>
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));let A=null,loadController=null,loadSeq=0,snapshotRange={from:null,to:null};const analyticsCache=new Map(),CACHE_MS=15000;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));const fmt=n=>Number(n||0).toLocaleString();const pct=n=>Number(n||0).toFixed(1)+"%";
function isoDayOffset(offset){let d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)}
function setDateInputs(from,to){let f=$("#fromDate"),t=$("#toDate"),s=$("#singleDate"),max=isoDayOffset(0);if(f){f.max=max;f.value=from}if(t){t.max=max;t.value=to}if(s){s.max=max;s.value=from===to?from:""}}
function dates(){let f=$("#fromDate")?.value||isoDayOffset(-6),t=$("#toDate")?.value||isoDayOffset(0);if(f>t)[f,t]=[t,f];setDateInputs(f,t);return{from:f,to:t}}
function markPreset(name){$$(".range button").forEach(x=>x.classList.toggle("active",x.dataset.range===name))}
function setPreset(name){let to=isoDayOffset(0),from=to;if(name==="yesterday"){from=to=isoDayOffset(-1)}else if(name==="daybefore"){from=to=isoDayOffset(-2)}else if(name==="day3"){from=to=isoDayOffset(-3)}else if(name==="7"){from=isoDayOffset(-6)}else if(name==="30"){from=isoDayOffset(-29)}else if(name==="all"&&snapshotRange.from&&snapshotRange.to){from=snapshotRange.from;to=snapshotRange.to}else if(name==="all"){return}setDateInputs(from,to);markPreset(name);return load()}
function params(){let p=new URLSearchParams(dates());["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id),v=el?.value||"";if(v)p.set(id,v)});return p}
async function api(url,opts={}){let r=await fetch(url,opts),j={};try{j=await r.json()}catch(e){}if(!r.ok||j.success===false)throw new Error(j?.error?.message||("HTTP "+r.status));return j.data??j}
function cacheSet(key,data){analyticsCache.set(key,{at:Date.now(),data});if(analyticsCache.size>24)analyticsCache.delete(analyticsCache.keys().next().value)}
function bars(id,arr,limit=10){let el=$(id),a=(arr||[]).slice(0,limit);if(!a.length){el.innerHTML='<div class="muted">暂无数据</div>';return}let max=Math.max(...a.map(x=>Number(x.count||0)),1);el.innerHTML=a.map(x=>'<div class="bar"><div class="bn" title="'+esc(x.name)+'">'+esc(x.name)+'</div><div class="track"><div class="fill" style="width:'+Math.max(1,Number(x.count||0)/max*100)+'%"></div></div><div class="num">'+fmt(x.count)+'</div></div>').join("")}
function kpis(id,rows){$(id).innerHTML=rows.map(x=>'<div class="card"><div class="label">'+esc(x[0])+'</div><div class="value">'+esc(x[1])+'</div><div class="muted">'+esc(x[2]||"")+'</div></div>').join("")}
function options(id,arr){let s=$("#"+id);if(!s)return;let old=s.value;s.innerHTML='<option value="">全部</option>'+(arr||[]).map(x=>'<option value="'+esc(x.name)+'">'+esc(x.name)+' · '+fmt(x.count)+'</option>').join("");if(Array.from(s.options).some(o=>o.value===old))s.value=old}
function countNamed(arr,name){return Number((arr||[]).find(x=>x.name===name)?.count||0)}
function scopeNote(id,text,show,warn=false){let el=$(id);if(!el)return;el.hidden=!show;if(show){el.textContent=text;el.className="scope-note"+(warn?" warn":"")}}
function trendLabel(row){if(row&&row.date&&row.hour!==undefined){let h=String(Number(row.hour)).padStart(2,"0"),d=new Date(row.date+"T"+h+":00:00Z");return d.toLocaleString(undefined,{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false})}return String(row?.date||"").slice(5)}
function renderTrend(id,rows){let el=$(id),a=rows||[];if(!a.length){el.innerHTML='<div class="muted">暂无趋势数据</div>';return}let ok=a.map(x=>Number(x.playlist_success||0)+Number(x.user_success||0)),fail=a.map(x=>Number(x.resolve_failure||0)),max=Math.max(1,...ok,...fail),W=800,H=240,L=46,R=12,T=12,B=34,w=W-L-R,h=H-T-B,x=i=>a.length===1?L+w/2:L+i/(a.length-1)*w,y=v=>T+h-Number(v||0)/max*h,points=v=>v.map((n,i)=>x(i)+","+y(n)).join(" "),ticks=[0,.5,1].map(r=>{let yy=T+h-r*h,val=Math.round(max*r);return '<line class="trend-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'"></line><text class="trend-axis" x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end">'+fmt(val)+'</text>'}).join(""),step=Math.max(1,Math.ceil(a.length/6)),labels=a.map((row,i)=>i%step===0||i===a.length-1?'<text class="trend-axis" x="'+x(i)+'" y="'+(H-10)+'" text-anchor="middle">'+esc(trendLabel(row))+'</text>':"").join(""),dots=(vals,cls)=>vals.map((v,i)=>'<circle class="'+cls+'" cx="'+x(i)+'" cy="'+y(v)+'" r="2.8"></circle>').join("");el.innerHTML='<div class="trend-legend"><span><span class="legend-dot legend-success"></span>Success</span><span><span class="legend-dot legend-failure"></span>Failure</span></div><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+ticks+'<polyline class="trend-success" points="'+points(ok)+'"></polyline><polyline class="trend-failure" points="'+points(fail)+'"></polyline>'+dots(ok,"trend-dot-success")+dots(fail,"trend-dot-failure")+labels+'</svg>'}
function render(){
  let o=A.overview||{},b=A.breakdowns||{},e=A.environment||{},f=A.availableFilters||{},q=A.dataQuality||{},succ=Number(o.playlist_success||0)+Number(o.user_success||0);
  let apiReq=countNamed(f.channels,"api"),pluginReq=countNamed(f.channels,"plugin"),webReq=countNamed(f.channels,"web"),musicfreeReq=countNamed(f.clients,"musicfree"),anonymousApiReq=countNamed(f.clients,"anonymous_api");
  kpis("#overviewKpis",[["Requests",fmt(o.resolve_request),"统一 resolve_request 口径"],["Success",fmt(succ),pct(o.success_rate)+" 成功率"],["Tracks",fmt(o.tracks_processed),"处理歌曲"],["Exports",fmt(o.export),"文件导出"],["Failures",fmt(o.resolve_failure),"最终失败"],["Client IDs",fmt(o.active_clients),"活跃客户端类别，不代表用户/安装数"]]);
  renderTrend("#trend",(A.hourlyTimeseries||[]).length?A.hourlyTimeseries:(A.timeseries||[]));
  bars("#platformBars",b.requested_platform);bars("#clientBars",f.clients);bars("#countryBars",A.geo?.countries);
  let checks=q.checks||[];$("#health").className="health "+(q.status==="healthy"?"good":"bad");$("#health").textContent=q.status==="healthy"?"● Data Healthy":"● Data Integrity Error";
  $("#quality").innerHTML=checks.map(x=>'<div class="notice '+(x.ok?"":"bad")+'">'+(x.ok?"✓ ":"✕ ")+esc(x.id)+'<br><span class="muted">'+esc(x.note)+(x.ok?"":" · expected "+fmt(x.expected)+" / actual "+fmt(x.actual))+'</span></div>').join("")+'<div class="muted">Latest: '+esc(q.latestDate||"—")+' · Legacy mixed: '+pct(q.legacyMixedShare)+'</div>';
  let d=dates(),chips=['<span class="chip">'+esc(d.from===d.to?d.from:(d.from+" → "+d.to))+'</span>'];["channel","client","platform","country","region"].forEach(id=>{let v=$("#"+id).value;if(v)chips.push('<span class="chip">'+esc(id)+": "+esc(v)+'</span>')});$("#chips").innerHTML=chips.join("");
  if(A.availableDateRange){snapshotRange=A.availableDateRange;["singleDate","fromDate","toDate"].forEach(id=>{let el=$("#"+id);if(el){el.min=snapshotRange.from||"";el.max=snapshotRange.to||isoDayOffset(0)}})}let generated=A.generatedAt?new Date(A.generatedAt).toLocaleString():"—";$("#updated").textContent="快照 "+generated+" · 最新数据 "+esc(q.latestDate||"—");
  kpis("#webKpis",[["Web Requests",fmt(webReq),"resolve_request"],["Page Views",fmt(o.page_view),"官网访问"],["Daily Uniques",fmt(o.visitor_unique),"每日匿名去重"],["Exports",fmt(o.export),"官网导出事件"],["Clipboard",fmt(o.clipboard),"官网复制事件"],["Top Browser",e.browsers?.[0]?.name||"—",""]]);
  let envPartial=Boolean($("#platform").value||$("#country").value||$("#region").value);
  scopeNote("#webScope","Browser / Device / OS 仅支持日期、Channel、Client 筛选；当前 Platform / Country / Region 不会作用于环境数据。",envPartial,true);
  bars("#referrerBars",b.referrer_source);bars("#browserBars",e.browsers);bars("#deviceBars",e.devices,6);bars("#osBars",e.operatingSystems,6);
  kpis("#integrationKpis",[["API Requests",fmt(apiReq),"Public API resolve_request"],["Plugin Requests",fmt(pluginReq),"插件 resolve_request"],["MusicFree",fmt(musicfreeReq),"已识别 MusicFree 请求"],["Anonymous API",fmt(anonymousApiReq),"未注册 API 客户端"],["Client IDs",fmt(o.active_clients),"活跃客户端类别"],["Migration Handoffs",fmt(o.migration_handoff),"迁移服务跳转"]]);
  scopeNote("#integrationScope","Requests 使用 resolve_request 口径；Version / Host 仅来自已声明的 plugin attribution，不代表用户或设备身份。",true,false);
  bars("#integrationClients",f.clients);bars("#versionBars",b.client_version);bars("#hostBars",b.host_platform);bars("#migrationBars",b.migration_destination);
  kpis("#reliabilityKpis",[["Success Rate",pct(o.success_rate),""],["Failures",fmt(o.resolve_failure),""],["Requests",fmt(o.resolve_request),""],["Rate Limited",fmt(o.rate_limited),""],["Top Failure",b.failure_code?.[0]?.name||"—",""],["Common Latency",b.latency_bucket?.[0]?.name||"—","出现次数最多的延迟桶"]]);
  let geoPartial=Boolean($("#country").value||$("#region").value);
  scopeNote("#reliabilityScope","Country / Region 只作用于 Overview、趋势和 Geo cube；Failure Code、Stage、Latency 等可靠性 breakdown 不做地理关联，因此不会随地理筛选变化。",geoPartial,true);
  bars("#failureCodeBars",b.failure_code);bars("#failureStageBars",b.failure_stage);bars("#latencyBars",b.latency_bucket);bars("#requestedTypeBars",b.requested_type);bars("#providerBars",b.provider_failure_path);bars("#endpointBars",b.endpoint);
  kpis("#securityKpis",[["Rate Limited",fmt(o.rate_limited),"HTTP 429"],["API Channel",fmt(apiReq),"正常产品流量"],["Plugin Channel",fmt(pluginReq),"正常产品流量"],["Quarantine","见下方","安全取证"],["Legacy Mixed",pct(q.legacyMixedShare),"历史未知来源"],["Data Health",q.status==="healthy"?"Healthy":"Error",""]]);bars("#rateBars",b.rate_limit_endpoint);
  options("client",f.clients);options("country",A.geo?.countries);options("region",A.geo?.regions)
}
async function load({force=false}={}){let key=params().toString(),seq=++loadSeq,cached=analyticsCache.get(key);if(loadController)loadController.abort();if(!force&&cached&&Date.now()-cached.at<CACHE_MS){A=cached.data;render();if($("#page-security")?.classList.contains("active"))quarantine();return}let controller=new AbortController();loadController=controller;try{$("#error").innerHTML="";$("#health").className="health";$("#health").textContent="● Loading";$("#updated").textContent="正在加载…";let data=await api("/api/analytics?"+key,{signal:controller.signal});if(seq!==loadSeq)return;A=data;cacheSet(key,data);render();if($("#page-security")?.classList.contains("active"))quarantine()}catch(e){if(e?.name==="AbortError"||seq!==loadSeq)return;$("#health").className="health bad";$("#health").textContent="● Load Failed";$("#updated").textContent="加载失败";$("#error").innerHTML='<div class="notice bad">'+esc(e.message)+'</div>'}finally{if(seq===loadSeq)loadController=null}}
async function quarantine(){try{let qp=new URLSearchParams(dates());qp.set("limit","100");let d=await api("/api/quarantine?"+qp.toString()),rows=d.quarantine||[],m=new Map();rows.forEach(x=>m.set(x.reason||"unknown",(m.get(x.reason||"unknown")||0)+Number(x.count||0)));bars("#quarantineSummary",Array.from(m,([name,count])=>({name,count})));$("#quarantineRows").innerHTML=rows.map(x=>'<tr><td>'+esc(x.incident_date)+'</td><td>'+esc(x.reason)+'</td><td>'+esc(x.platform)+'</td><td>'+esc(x.metric_or_dimension)+'</td><td>'+esc([x.country,x.region,x.city].filter(Boolean).join(" / "))+'</td><td>'+fmt(x.count)+'</td></tr>').join("")||'<tr><td colspan="6">暂无隔离记录</td></tr>'}catch(e){$("#quarantineRows").innerHTML='<tr><td colspan="6">'+esc(e.message)+'</td></tr>'}}
async function feedback(){try{let d=await api("/api/feedback?limit=100"),rows=d.entries||[];$("#feedbackRows").innerHTML=rows.map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+esc(x.last_reported_at||x.created_at||"")+'</td><td>'+esc(x.platform||"unknown")+'</td><td>'+esc(x.error_code||"")+'</td><td>'+fmt(x.report_count)+'</td><td>'+esc(x.status)+'</td><td>'+["pending","resolved","ignored"].map(s=>'<button class="status" data-id="'+x.id+'" data-status="'+s+'">'+s+'</button>').join(" ")+'</td></tr>').join("")||'<tr><td colspan="7">暂无反馈</td></tr>';$$('#feedbackRows .status').forEach(b=>b.onclick=async()=>{if(!confirm('确认将反馈 #'+b.dataset.id+' 标记为 '+b.dataset.status+'？'))return;try{await api('/api/feedback?id='+encodeURIComponent(b.dataset.id)+'&status='+encodeURIComponent(b.dataset.status),{method:'PUT'});await feedback()}catch(e){alert('更新失败：'+e.message)}})}catch(e){$("#feedbackRows").innerHTML='<tr><td colspan="7">'+esc(e.message)+'</td></tr>'}}
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".page").forEach(x=>x.classList.remove("active"));$("#page-"+b.dataset.page).classList.add("active");if(b.dataset.page==="security")quarantine();if(b.dataset.page==="feedback")feedback()});$$(".range button").forEach(b=>b.onclick=()=>setPreset(b.dataset.range));["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id);if(el)el.onchange=()=>load()});$("#applySingleDate").onclick=()=>{let d=$("#singleDate").value;if(!d)return;setDateInputs(d,d);markPreset("");load()};$("#singleDate").onchange=()=>{let d=$("#singleDate").value;if(!d)return;setDateInputs(d,d);markPreset("");load()};$("#applyDateRange").onclick=()=>{dates();markPreset("");load()};["fromDate","toDate"].forEach(id=>$("#"+id).onkeydown=e=>{if(e.key==="Enter"){$("#applyDateRange").click()}});$("#reset").onclick=()=>{["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id);if(el)el.value=""});setDateInputs(isoDayOffset(-6),isoDayOffset(0));markPreset("7");load({force:true})};$("#refreshData").onclick=async()=>{if(!confirm("重新从云端拉取一次完整 Analytics 快照？"))return;let b=$("#refreshData");b.disabled=true;b.textContent="刷新中…";try{await api("/api/refresh",{method:"POST"});analyticsCache.clear();await load({force:true})}catch(e){alert("刷新失败："+e.message)}finally{b.disabled=false;b.textContent="刷新云端数据"}};$("#reloadFeedback").onclick=feedback;setDateInputs(isoDayOffset(-6),isoDayOffset(0));markPreset("7");load();
</script></body></html>'''


class Handler(BaseHTTPRequestHandler):
    token = ""
    snapshot: dict = {}

    def log_message(self, fmt: str, *args: object) -> None:
        print("[Dashboard] " + (fmt % args))

    def send_bytes(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
            "base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        )
        self.send_header(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=()",
        )
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status: int, payload: dict) -> None:
        self.send_bytes(
            status,
            json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            "application/json; charset=utf-8",
        )

    def query(self, allowed: set[str]) -> dict[str, str]:
        parsed = urllib.parse.urlparse(self.path)
        raw = urllib.parse.parse_qs(parsed.query, keep_blank_values=False)
        return {
            key: values[-1]
            for key, values in raw.items()
            if key in allowed and values
        }

    def proxy(self, path: str, allowed: set[str], method: str = "GET") -> None:
        query = self.query(allowed)
        status, body, content_type = remote_request(self.token, path, method, query)
        self.send_bytes(status, body, content_type)

    def do_GET(self) -> None:  # noqa: N802
        path = urllib.parse.urlparse(self.path).path
        if path in {"/", "/index.html"}:
            self.send_bytes(200, HTML.encode("utf-8"), "text/html; charset=utf-8")
        elif path == "/api/analytics":
            data = build_local_analytics(type(self).snapshot, self.query(ANALYTICS_PARAMS))
            self.send_json(200, {"success": True, "data": data})
        elif path == "/api/feedback":
            data = build_local_feedback(type(self).snapshot, self.query(FEEDBACK_PARAMS))
            self.send_json(200, {"success": True, "data": data})
        elif path == "/api/quarantine":
            data = build_local_quarantine(
                type(self).snapshot,
                self.query({"limit", "offset", "reason", "date", "from", "to"}),
            )
            self.send_json(200, {"success": True, "data": data})
        elif path == "/health":
            self.send_json(
                200,
                {
                    "ok": True,
                    "snapshotGeneratedAt": type(self).snapshot.get("generatedAt"),
                },
            )
        else:
            self.send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if urllib.parse.urlparse(self.path).path != "/api/refresh":
            self.send_json(405, {"error": "method_not_allowed"})
            return
        try:
            snapshot = fetch_dashboard_snapshot(self.token)
        except RuntimeError as exc:
            self.send_json(
                502,
                {
                    "success": False,
                    "error": {
                        "code": "SNAPSHOT_REFRESH_FAILED",
                        "message": str(exc),
                    },
                },
            )
            return
        type(self).snapshot = snapshot
        self.send_json(
            200,
            {
                "success": True,
                "data": {
                    "generatedAt": snapshot.get("generatedAt"),
                    "dailyRows": len(snapshot.get("dailyCore", [])),
                    "hourlyRows": len(snapshot.get("hourlyCore", [])),
                },
            },
        )

    def do_PUT(self) -> None:  # noqa: N802
        if urllib.parse.urlparse(self.path).path != "/api/feedback":
            self.send_json(405, {"error": "method_not_allowed"})
            return

        query = self.query(FEEDBACK_PARAMS)
        status, body, content_type = remote_request(
            self.token,
            "/api/internal/feedback",
            "PUT",
            query,
        )
        if status == 200:
            try:
                feedback_id = int(query.get("id", "0"))
            except ValueError:
                feedback_id = 0
            new_status = query.get("status", "")
            for row in type(self).snapshot.get("feedback", []):
                if isinstance(row, dict) and int(row.get("id", 0) or 0) == feedback_id:
                    row["status"] = new_status
                    if new_status != "resolved":
                        row["resolved_at"] = None
                    break
        self.send_bytes(status, body, content_type)


def main() -> None:
    parser = argparse.ArgumentParser(description="PlaylistOut Analytics V2 本地仪表板")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4178)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()
    if args.host not in {"127.0.0.1", "localhost", "::1"}:
        print("[Dashboard] 拒绝监听非 loopback 地址。")
        sys.exit(2)
    repo_root = Path(__file__).resolve().parents[2]
    token = get_admin_token(repo_root)
    if not token:
        print("[Dashboard] 缺少 INSIGHTS_ADMIN_TOKEN。")
        sys.exit(1)
    print("[Dashboard] 正在一次性拉取云端 Analytics V2 快照…")
    try:
        snapshot = fetch_dashboard_snapshot(token)
    except RuntimeError as exc:
        print("[Dashboard] 快照加载失败：" + str(exc))
        sys.exit(1)

    Handler.token = token
    Handler.snapshot = snapshot
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = "http://127.0.0.1:" + str(args.port) + "/"
    print("[Dashboard] PlaylistOut Analytics V2")
    print("[Dashboard] " + url)
    print("[Dashboard] Token 仅存在本地 Python 进程中。")
    print(
        "[Dashboard] 云端快照已加载："
        + str(len(snapshot.get("dailyCore", [])))
        + " 个日聚合行，"
        + str(len(snapshot.get("hourlyCore", [])))
        + " 个小时聚合行。"
    )
    print("[Dashboard] 后续日期/平台/地区筛选只读取本地内存，不再请求 Worker。")
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Dashboard] 已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
