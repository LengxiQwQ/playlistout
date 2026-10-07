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
    all_rows = [row for row in snapshot.get("feedback", []) if isinstance(row, dict)]
    status_counts = {"all": len(all_rows), "pending": 0, "resolved": 0, "ignored": 0}
    for row in all_rows:
        s = str(row.get("status", "") or "pending").lower()
        if s in status_counts:
            status_counts[s] += 1
        else:
            status_counts["pending"] += 1

    status = _query_value(query, "status").lower()
    rows = all_rows
    if status and status != "all":
        rows = [row for row in rows if str(row.get("status", "") or "pending").lower() == status]
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
        "counts": status_counts,
    }


HTML = r'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PlaylistOut Analytics · 数据与审查控制台</title>
<style>
:root{
  --bg:#f4f6fa;--p:#ffffff;--t:#1e293b;--m:#64748b;--l:#e2e8f0;--a:#206bc4;
  --g:#10b981;--r:#ef4444;--w:#f59e0b;--s:0 1px 3px rgba(0,0,0,.05);--rad:8px;
  --font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
}
@media(prefers-color-scheme:dark){
  :root{
    --bg:#0f172a;--p:#1e293b;--t:#f8fafc;--m:#94a3b8;--l:#334155;--a:#3b82f6;
    --g:#34d399;--r:#f87171;--w:#fbbf24;--s:0 1px 3px rgba(0,0,0,.3);
  }
}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font-family:var(--font);font-size:13px;line-height:1.5}
button,select,input{font:inherit;color:inherit}
.wrap{max-width:1440px;margin:auto;padding:14px 22px}
.top{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--p) 96%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--l);box-shadow:var(--s)}
.head{display:flex;justify-content:space-between;gap:12px;align-items:center;min-height:48px;padding:4px 0}
.brand{display:flex;align-items:center;gap:10px;shrink:0}
.logo{width:30px;height:30px;border-radius:7px;background:var(--a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;box-shadow:0 2px 6px rgba(32,107,196,.3)}
h1{margin:0;font-size:16px;font-weight:700;letter-spacing:-.2px;display:flex;align-items:center;gap:8px}
.badge-tag{font-size:11px;font-weight:500;padding:1px 6px;border-radius:999px;background:color-mix(in srgb,var(--a) 12%,transparent);color:var(--a);border:1px solid color-mix(in srgb,var(--a) 25%,transparent)}
.muted{font-size:12px;color:var(--m)}
.headright{display:flex;align-items:center;gap:8px;shrink:0}
.health{padding:4px 9px;border:1px solid var(--l);background:var(--p);border-radius:999px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:6px}
.health.good{color:var(--g);border-color:color-mix(in srgb,var(--g) 30%,transparent);background:color-mix(in srgb,var(--g) 8%,transparent)}
.health.bad{color:var(--r);border-color:color-mix(in srgb,var(--r) 30%,transparent);background:color-mix(in srgb,var(--r) 8%,transparent)}
.ghost{height:30px;padding:0 10px;border:1px solid var(--l);border-radius:7px;background:var(--p);cursor:pointer;font-size:12px;font-weight:500;box-shadow:var(--s);transition:all .15s}
.ghost:hover{background:color-mix(in srgb,var(--p) 85%,var(--a));border-color:var(--a)}

.tabs{display:flex;gap:4px;overflow:auto;padding:0;margin:0 8px}
.tab{border:0;border-radius:7px;padding:6px 11px;background:transparent;color:var(--m);cursor:pointer;white-space:nowrap;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;transition:all .15s}
.tab:hover{color:var(--t);background:color-mix(in srgb,var(--p) 60%,transparent)}
.tab.active{background:var(--a);color:#fff;box-shadow:0 1px 3px rgba(32,107,196,.3)}
.tab-badge{padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;background:var(--w);color:#fff}
.tab.active .tab-badge{background:#fff;color:var(--a)}

.filter-card{padding:12px 16px;margin-bottom:14px;background:var(--p);border:1px solid var(--l);border-radius:var(--rad);box-shadow:var(--s)}
.filter-card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--l);flex-wrap:wrap}
.filter-card-title{font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;color:var(--t)}
.filters{display:grid;grid-template-columns:repeat(5,minmax(130px,1fr)) auto;gap:8px}
.date-field{grid-column:1/-1}
.field label{display:block;font-size:11px;color:var(--m);font-weight:600;margin:0 0 4px 2px}
.field select,.field input{height:34px;width:100%;padding:0 8px;border:1px solid var(--l);border-radius:7px;background:var(--p);font-size:12px}
.date-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.date-group{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
.date-group .date-label{font-size:11px;color:var(--m);font-weight:600;white-space:nowrap}
.date-group input{width:140px;height:32px}
.date-tools .ghost{height:32px}
.range{display:flex;gap:4px;flex-wrap:wrap}
.range button{height:32px;padding:0 9px;border:1px solid var(--l);border-radius:7px;background:var(--p);cursor:pointer;font-size:12px;color:var(--m);transition:all .15s}
.range button:hover{color:var(--t);border-color:var(--m)}
.range button.active{background:var(--a);color:#fff;border-color:var(--a);font-weight:600}
.range-note{font-size:11px;color:var(--m);margin-left:auto}

.page{display:none}.page.active{display:block}
.section{display:flex;justify-content:space-between;align-items:end;margin:16px 0 10px}
.section h2{margin:0;font-size:16px;font-weight:700}
.alert-banner{background:color-mix(in srgb,var(--w) 12%,var(--p));border:1px solid color-mix(in srgb,var(--w) 35%,transparent);border-radius:var(--rad);padding:10px 14px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;gap:12px}
.alert-content{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--t)}
.alert-icon{width:24px;height:24px;border-radius:6px;background:var(--w);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;shrink:0}
.alert-btn{padding:4px 10px;border-radius:6px;background:var(--w);color:#fff;border:0;cursor:pointer;font-weight:600;font-size:11px;white-space:nowrap}

.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.card,.panel{background:var(--p);border:1px solid var(--l);border-radius:var(--rad);box-shadow:var(--s)}
.kpi-card{padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;min-height:92px}
.kpi-label{font-size:11px;font-weight:600;color:var(--m);display:flex;justify-content:space-between;align-items:center}
.kpi-val{font-size:22px;font-weight:700;font-family:var(--mono);margin:4px 0 2px;letter-spacing:-.5px}
.kpi-sub{font-size:11px;color:var(--m)}

.grid2{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
.panel{padding:14px;min-width:0}
.panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--l)}
.panel h3{font-size:13px;font-weight:700;margin:0;display:flex;align-items:center;gap:6px}

.trend-box{position:relative;height:260px;width:100%}
.trend-box canvas{width:100%!important;height:100%!important;display:block;cursor:crosshair}
.trend-legend{display:flex;gap:12px;font-size:11px;color:var(--m);align-items:center}
.legend-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
.chart-tooltip{position:absolute;pointer-events:none;display:none;background:var(--p);border:1px solid var(--l);border-radius:7px;padding:8px 10px;font-size:11px;box-shadow:0 4px 14px rgba(0,0,0,.12);z-index:10;transform:translate(-50%,-110%);min-width:140px}
.chart-tooltip-title{font-weight:600;color:var(--m);margin-bottom:4px;border-bottom:1px solid var(--l);padding-bottom:3px}
.chart-tooltip-row{display:flex;justify-content:space-between;gap:8px;margin:2px 0}

.bars{display:flex;flex-direction:column;gap:8px}
.bar{display:grid;grid-template-columns:140px 1fr 70px;gap:8px;align-items:center;font-size:12px}
.bn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
.b-dot{width:6px;height:6px;border-radius:50%;shrink:0}
.track{height:7px;background:var(--l);border-radius:999px;overflow:hidden}
.fill{height:100%;border-radius:999px;transition:width .2s}
.num{text-align:right;color:var(--m);font-variant-numeric:tabular-nums;font-family:var(--mono);font-size:11px}
.num .pct{color:var(--t);font-weight:700;margin-left:4px}

.chips{display:flex;flex-wrap:wrap;gap:5px}
.chip{padding:3px 7px;border:1px solid var(--l);border-radius:999px;background:var(--p);font-size:11px;color:var(--m)}
.scope-note{padding:8px 12px;border:1px solid var(--l);border-radius:7px;background:var(--p);font-size:11px;color:var(--m);margin-bottom:10px}
.scope-note.warn{border-color:color-mix(in srgb,var(--w) 40%,transparent);color:var(--t)}
.notice{padding:8px 12px;border:1px solid var(--l);border-radius:7px;margin:8px 0;font-size:12px}
.notice.bad{border-color:var(--r);color:var(--r)}

.table-wrap{overflow:auto;max-height:560px}
table{width:100%;border-collapse:collapse;font-size:12px;text-align:left}
th,td{padding:8px 10px;border-bottom:1px solid var(--l);vertical-align:middle}
th{color:var(--m);font-weight:600;font-size:11px;background:color-mix(in srgb,var(--p) 92%,var(--bg));position:sticky;top:0;z-index:2}
tbody tr:hover{background:color-mix(in srgb,var(--p) 90%,var(--a))}
.url-cell{font-family:var(--mono);font-size:11px;color:var(--a);max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn-sm{padding:2px 7px;border:1px solid var(--l);border-radius:5px;background:var(--p);font-size:11px;cursor:pointer;font-weight:500;transition:all .15s}
.btn-sm:hover{background:color-mix(in srgb,var(--p) 80%,var(--a));border-color:var(--a)}
.btn-sm.ok{background:color-mix(in srgb,var(--g) 10%,var(--p));color:var(--g);border-color:color-mix(in srgb,var(--g) 30%,transparent)}
.badge{padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;display:inline-block}
.badge.pending{background:color-mix(in srgb,var(--w) 15%,var(--p));color:var(--w);border:1px solid color-mix(in srgb,var(--w) 30%,transparent)}
.badge.resolved{background:color-mix(in srgb,var(--g) 15%,var(--p));color:var(--g);border:1px solid color-mix(in srgb,var(--g) 30%,transparent)}
.badge.ignored{background:color-mix(in srgb,var(--m) 15%,var(--p));color:var(--m);border:1px solid color-mix(in srgb,var(--m) 30%,transparent)}
.footer{text-align:center;color:var(--m);font-size:11px;padding:24px 0}
@media(max-width:1100px){.head{flex-wrap:wrap}.filters{grid-template-columns:repeat(3,1fr)}.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.filters{grid-template-columns:1fr 1fr}.kpis{grid-template-columns:1fr 1fr}.grid2,.grid3{grid-template-columns:1fr}.bar{grid-template-columns:100px 1fr 60px}}
</style></head><body>

<!-- 纤细吸顶导航栏：仅常驻标签页与状态，绝不遮挡视野 -->
<header class="top"><div class="wrap">
  <div class="head">
    <div class="brand">
      <div class="logo">PO</div>
      <div>
        <h1>PlaylistOut Analytics <span class="badge-tag">Tabler UI</span></h1>
        <div class="muted" style="font-size:11px">Token 不进入浏览器 · 本地安全快照</div>
      </div>
    </div>
    <nav class="tabs">
      <button class="tab active" data-page="overview">📊 总览 Overview</button>
      <button class="tab" data-page="feedback">🐛 待审歌单 Feedback <span id="navPendingBadge" class="tab-badge" style="display:none">0</span></button>
      <button class="tab" data-page="web">💻 终端与地域 Web</button>
      <button class="tab" data-page="reliability">🛡️ 稳定性与偏好 Reliability</button>
      <button class="tab" data-page="integrations">🔌 生态集成 Integrations</button>
      <button class="tab" data-page="security">🔒 安全风控 Security</button>
    </nav>
    <div class="headright">
      <div id="health" class="health">● Loading</div>
      <div id="updated" class="muted">尚未加载</div>
      <button id="refreshData" class="ghost">刷新云端数据</button>
    </div>
  </div>
</div></header>

<main class="wrap"><div id="error"></div>

<!-- 维度与时间筛选工具栏 (作为页面内容卡片，点选后随页面自然滚动，绝不遮挡视野) -->
<div class="card filter-card">
  <div class="filter-card-head">
    <div class="filter-card-title"><span>⚙️</span> 维度与时间筛选工具栏 (Filters)</div>
    <div class="muted">单日自动显示小时趋势；任意日期和范围都从本地快照读取，不重复请求 Worker</div>
    <div id="chips" class="chips" style="margin-left:auto"></div>
  </div>
  <div class="filters">
    <div class="field date-field">
      <div class="date-tools">
        <div class="range">
          <button data-range="today">今天</button>
          <button data-range="yesterday">昨天</button>
          <button data-range="daybefore">前天</button>
          <button data-range="day3">大前天</button>
          <button data-range="7" class="active">近7天</button>
          <button data-range="30">近30天</button>
          <button data-range="all">全部历史</button>
        </div>
        <div class="date-group">
          <span class="date-label">单日</span>
          <input id="singleDate" type="date" aria-label="查看单日">
          <button id="applySingleDate" class="ghost">查看这一天</button>
        </div>
        <div class="date-group">
          <span class="date-label">范围</span>
          <input id="fromDate" type="date" aria-label="开始日期">
          <span class="date-label">至</span>
          <input id="toDate" type="date" aria-label="结束日期">
          <button id="applyDateRange" class="ghost">应用范围</button>
        </div>
      </div>
    </div>
    <div class="field"><label for="channel">来源渠道 Channel</label><select id="channel"><option value="">全部</option><option>web</option><option>plugin</option><option>api</option><option>legacy_mixed</option></select></div>
    <div class="field"><label for="client">接入端 Client</label><select id="client"><option value="">全部</option></select></div>
    <div class="field"><label for="platform">目标平台 Platform</label><select id="platform"><option value="">全部</option><option>qqmusic</option><option>netease</option><option>kugou</option><option>qishui</option></select></div>
    <div class="field"><label for="country">国家 Country</label><select id="country"><option value="">全部</option></select></div>
    <div class="field"><label for="region">地区 Region</label><select id="region"><option value="">全部</option></select></div>
    <div class="field" style="display:flex;align-items:end"><button id="reset" class="ghost" style="width:100%">重置</button></div>
  </div>
</div>

<!-- 1. 业务总览 (Overview) -->
<section class="page active" id="page-overview">
  <div id="overviewAlert" class="alert-banner" style="display:none">
    <div class="alert-content">
      <div class="alert-icon">!</div>
      <div>发现 <strong id="alertPendingCount">0</strong> 条用户上报失败的歌单等待审查，包含真实 URL。</div>
    </div>
    <button class="alert-btn" id="gotoFeedback">前往审查 ➜</button>
  </div>

  <div class="section">
    <div><h2>整体情况 Overview</h2><div class="muted">先看结果，再下钻原因。</div></div>
  </div>
  <div id="overviewKpis" class="kpis"></div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>📈 请求趋势 (Request Trend)</h3>
          <div class="muted" style="font-size:11px">单日范围显示小时趋势，多日范围显示每日趋势；全画幅任意滑动，自动纵向磁吸对准。</div>
        </div>
        <div class="trend-legend">
          <span><span class="legend-dot" style="background:var(--g)"></span>成功解析</span>
          <span><span class="legend-dot" style="background:var(--r)"></span>最终失败</span>
        </div>
      </div>
      <div class="trend-box" id="trendBox">
        <canvas id="trendCanvas"></canvas>
        <div id="trendTip" class="chart-tooltip">
          <div id="tipTitle" class="chart-tooltip-title"></div>
          <div class="chart-tooltip-row"><span style="color:var(--g)">● 成功解析:</span><strong id="tipOk"></strong></div>
          <div class="chart-tooltip-row"><span style="color:var(--r)">● 最终失败:</span><strong id="tipFail"></strong></div>
          <div class="chart-tooltip-row" style="border-top:1px solid var(--l);padding-top:2px"><span class="muted">成功率:</span><strong id="tipRate"></strong></div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>🎵 请求目标平台</h3>
        <span class="muted" style="font-size:11px">Platform Share</span>
      </div>
      <div id="platformBars" class="bars"></div>
    </div>
  </div>

  <div class="grid3">
    <div class="panel">
      <div class="panel-head"><h3>🔌 Resolve Clients 接入端</h3><span class="muted" style="font-size:11px">生态分流</span></div>
      <div id="clientBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🌍 国家 / 地区 Top 10</h3><span class="muted" style="font-size:11px">Country</span></div>
      <div id="countryBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🩺 数据完整性 Data Quality</h3><span class="muted" style="font-size:11px">守恒与约束</span></div>
      <div id="quality"></div>
    </div>
  </div>
</section>

<!-- 2. 待审歌单 Review 工作台 (Feedback) -->
<section class="page" id="page-feedback">
  <div class="section">
    <div>
      <h2>待审歌单与失败排查 (Review & Feedback)</h2>
      <div class="muted">解析失败反馈工作流：审查用户上报的真实失败歌单链接，快速复现、一键标记修复并同步云端。</div>
    </div>
    <div style="display:flex;gap:6px;align-items:center">
      <button class="ghost fb-tab active" data-fb-status="pending" id="fbBtnPending">待处理 Pending (<span id="fbCountPending">0</span>)</button>
      <button class="ghost fb-tab" data-fb-status="all" id="fbBtnAll">全部 All (<span id="fbCountAll">0</span>)</button>
      <button class="ghost fb-tab" data-fb-status="resolved" id="fbBtnResolved">已修复 Resolved (<span id="fbCountResolved">0</span>)</button>
      <button class="ghost fb-tab" data-fb-status="ignored" id="fbBtnIgnored">已忽略 Ignored (<span id="fbCountIgnored">0</span>)</button>
      <button id="reloadFeedback" class="ghost">刷新</button>
    </div>
  </div>

  <div class="panel">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:50px">ID</th>
            <th style="width:90px">平台</th>
            <th>歌单链接 (Playlist URL) · 支持一键测试复现</th>
            <th style="width:140px">错误代码</th>
            <th style="width:60px;text-align:center">频次</th>
            <th style="width:130px">最近上报时间</th>
            <th style="width:70px">状态</th>
            <th style="width:130px;text-align:right">操作</th>
          </tr>
        </thead>
        <tbody id="feedbackRows"></tbody>
      </table>
    </div>
  </div>
</section>

<!-- 3. 终端与地域 (Web - 老版数据全复原) -->
<section class="page" id="page-web">
  <div class="section">
    <div><h2>官网访客与终端环境 Web</h2><div class="muted">官网访问、来源与客户端环境。</div></div>
  </div>
  <div id="webScope" class="scope-note" hidden></div>
  <div id="webKpis" class="kpis"></div>

  <div class="grid3">
    <div class="panel">
      <div class="panel-head"><h3>🔗 访问来源分类 Referrer</h3></div>
      <div id="referrerBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🌐 主流浏览器 Browser</h3></div>
      <div id="browserBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>💻 设备终端与系统 Device / OS</h3></div>
      <div id="deviceBars" class="bars"></div>
      <hr style="border:0;border-top:1px solid var(--l);margin:10px 0">
      <div id="osBars" class="bars"></div>
    </div>
  </div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><h3>🌍 全球访问国家分布 Top 15</h3><span class="muted" style="font-size:11px">Country</span></div>
      <div id="webCountryBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🏙️ 境内省份与主要城市分布 Top 15</h3><span class="muted" style="font-size:11px">Region</span></div>
      <div id="webRegionBars" class="bars"></div>
    </div>
  </div>
</section>

<!-- 4. 稳定性与偏好 (Reliability - 老版数据全复原) -->
<section class="page" id="page-reliability">
  <div class="section">
    <div><h2>稳定性诊断与偏好 Reliability</h2><div class="muted">失败原因、阶段、链路与耗时；可靠性 breakdown 不做地理关联。</div></div>
  </div>
  <div id="reliabilityScope" class="scope-note" hidden></div>
  <div id="reliabilityKpis" class="kpis"></div>

  <div class="grid3">
    <div class="panel">
      <div class="panel-head"><h3>⚠️ 失败错误代码 Failure Code</h3></div>
      <div id="failureCodeBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🚦 失败触发阶段 Failure Stage</h3></div>
      <div id="failureStageBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>⏱️ 解析耗时分布桶 Latency</h3></div>
      <div id="latencyBars" class="bars"></div>
    </div>
  </div>

  <div class="grid3">
    <div class="panel">
      <div class="panel-head"><h3>📥 用户输入方式 Requested Type</h3></div>
      <div id="requestedTypeBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🛣️ 解析链路路径 Provider Path</h3></div>
      <div id="providerBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🎯 业务调用端点 Endpoint</h3></div>
      <div id="endpointBars" class="bars"></div>
    </div>
  </div>

  <div class="grid3">
    <div class="panel">
      <div class="panel-head"><h3>📊 导出歌单规模分布 Playlist Size</h3></div>
      <div id="exportSizeBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>📄 导出文件格式偏好 Export Format</h3></div>
      <div id="exportFormatBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>📋 剪贴板快速复制偏好 Clipboard</h3></div>
      <div id="clipboardModeBars" class="bars"></div>
    </div>
  </div>
</section>

<!-- 5. 生态集成与插件接入 (Integrations) -->
<section class="page" id="page-integrations">
  <div class="section">
    <div><h2>生态集成与插件接入 Integrations</h2><div class="muted">MusicFree、Public API 与未来集成。</div></div>
  </div>
  <div id="integrationScope" class="scope-note"></div>
  <div id="integrationKpis" class="kpis"></div>

  <div class="grid3">
    <div class="panel">
      <div class="panel-head"><h3>🔌 接入客户端分类 Clients</h3></div>
      <div id="integrationClients" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>📦 插件声明版本 Versions</h3></div>
      <div id="versionBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>📱 宿主客户端环境 Host Platforms</h3></div>
      <div id="hostBars" class="bars"></div>
    </div>
  </div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><h3>🚀 迁移跳转目标平台 Migration Destinations</h3></div>
      <div id="migrationBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🛤️ 迁移跳转渠道来源 Migration Providers</h3></div>
      <div id="migrationProviderBars" class="bars"></div>
    </div>
  </div>
</section>

<!-- 6. 安全风控与防爬隔离 (Security) -->
<section class="page" id="page-security">
  <div class="section">
    <div><h2>安全防护与防爬隔离 Security</h2><div class="muted">API 是产品流量；Bot、429、Quarantine 才是安全层。</div></div>
  </div>
  <div id="securityKpis" class="kpis"></div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><h3>🛑 429 限流触发端点 Rate-limit Endpoints</h3></div>
      <div id="rateBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🛡️ 异常隔离原因汇总 Quarantine Summary</h3></div>
      <div id="quarantineSummary" class="bars"></div>
    </div>
  </div>

  <div class="panel" style="margin-top:12px">
    <div class="panel-head"><h3>最近隔离记录 Quarantine Forensics</h3></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Reason</th><th>Platform</th><th>Dimension</th><th>Region</th><th>Count</th></tr></thead>
        <tbody id="quarantineRows"></tbody>
      </table>
    </div>
  </div>
</section>

<div class="footer">PlaylistOut Analytics V2 · 遵循 Tabler 设计语言 · 本地沙箱无感运行</div>
</main>

<script>
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
let A=null,loadController=null,loadSeq=0,snapshotRange={from:null,to:null},currentFbStatus="pending";
const analyticsCache=new Map(),CACHE_MS=15000;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const fmt=n=>Number(n||0).toLocaleString();
const pct=n=>Number(n||0).toFixed(1)+"%";

function isoDayOffset(offset){
  let d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+offset);
  return d.toISOString().slice(0,10);
}
function setDateInputs(from,to){
  let f=$("#fromDate"),t=$("#toDate"),s=$("#singleDate"),max=isoDayOffset(0);
  if(f){f.max=max;f.value=from}if(t){t.max=max;t.value=to}if(s){s.max=max;s.value=from===to?from:""}
}
function dates(){
  let f=$("#fromDate")?.value||isoDayOffset(-6),t=$("#toDate")?.value||isoDayOffset(0);
  if(f>t)[f,t]=[t,f];
  setDateInputs(f,t);
  return{from:f,to:t};
}
function markPreset(name){
  $$(".range button").forEach(x=>x.classList.toggle("active",x.dataset.range===name));
}
function setPreset(name){
  let to=isoDayOffset(0),from=to;
  if(name==="yesterday"){from=to=isoDayOffset(-1)}
  else if(name==="daybefore"){from=to=isoDayOffset(-2)}
  else if(name==="day3"){from=to=isoDayOffset(-3)}
  else if(name==="7"){from=isoDayOffset(-6)}
  else if(name==="30"){from=isoDayOffset(-29)}
  else if(name==="all"&&snapshotRange.from&&snapshotRange.to){from=snapshotRange.from;to=snapshotRange.to}
  else if(name==="all"){return}
  setDateInputs(from,to);markPreset(name);return load();
}
function params(){
  let p=new URLSearchParams(dates());
  ["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id),v=el?.value||"";if(v)p.set(id,v)});
  return p;
}
async function api(url,opts={}){
  let r=await fetch(url,opts),j={};
  try{j=await r.json()}catch(e){}
  if(!r.ok||j.success===false)throw new Error(j?.error?.message||("HTTP "+r.status));
  return j.data??j;
}
function cacheSet(key,data){
  analyticsCache.set(key,{at:Date.now(),data});
  if(analyticsCache.size>24)analyticsCache.delete(analyticsCache.keys().next().value);
}

function getBrandColor(name){
  let n=String(name||"").toLowerCase();
  if(n==="qqmusic")return"#10b981";
  if(n==="netease")return"#ef4444";
  if(n==="kugou")return"#3b82f6";
  if(n==="qishui")return"#f59e0b";
  if(n==="xlsx")return"#10b981";
  if(n==="csv")return"#3b82f6";
  if(n==="json")return"#f59e0b";
  if(n==="desktop")return"#6366f1";
  if(n==="mobile")return"#8b5cf6";
  if(n==="tablet")return"#06b6d4";
  return"var(--a)";
}

function formatHumanLabel(name){
  let n=String(name||"");
  const dict={
    "qqmusic":"QQ音乐 (qqmusic)","netease":"网易云音乐 (netease)","kugou":"酷狗音乐 (kugou)","qishui":"汽水音乐 (qishui)",
    "desktop":"桌面端电脑 (desktop)","mobile":"手机移动端 (mobile)","tablet":"平板设备 (tablet)",
    "UNSUPPORTED_URL":"格式不支持 (UNSUPPORTED_URL)","INCOMPLETE_PLAYLIST":"部分截断/VIP (INCOMPLETE)",
    "PLAYLIST_NOT_FOUND":"歌单未找到 (NOT_FOUND)","INVALID_INPUT":"输入参数无效 (INVALID)",
    "PARSE_ERROR":"结构解析错误 (PARSE_ERROR)","UPSTREAM_TIMEOUT":"上游服务超时 (TIMEOUT)",
    "web_url":"网页直链 (Web URL)","mobile_share":"手机分享文案 (Mobile Share)","raw_id":"纯歌单 ID (Raw ID)",
    "primary":"Primary 主解析链路","fallback":"Fallback 降级重试"
  };
  return dict[n]||n;
}

function bars(id,arr,limit=12){
  let el=$(id),a=(arr||[]).slice(0,limit);
  if(!a.length){el.innerHTML='<div class="muted" style="padding:4px 0">暂无数据</div>';return}
  let total=a.reduce((s,x)=>s+Number(x.count||0),0);
  let max=Math.max(...a.map(x=>Number(x.count||0)),1);
  el.innerHTML=a.map(x=>{
    let c=getBrandColor(x.name),lbl=formatHumanLabel(x.name);
    let p=total>0?(Number(x.count||0)/total*100).toFixed(1)+"%":"0.0%";
    return '<div class="bar">'
      +'<div class="bn" title="'+esc(x.name)+'"><span class="b-dot" style="background:'+c+'"></span>'+esc(lbl)+'</div>'
      +'<div class="track"><div class="fill" style="width:'+Math.max(1,Number(x.count||0)/max*100)+'%;background:'+c+'"></div></div>'
      +'<div class="num">'+fmt(x.count)+'<span class="pct">'+p+'</span></div>'
      +'</div>';
  }).join("");
}

function kpis(id,rows){
  $(id).innerHTML=rows.map(x=>'<div class="card kpi-card"><div class="kpi-label"><span>'+esc(x[0])+'</span></div><div class="kpi-val">'+esc(x[1])+'</div><div class="kpi-sub">'+esc(x[2]||"")+'</div></div>').join("");
}

function options(id,arr){
  let s=$("#"+id);if(!s)return;
  let old=s.value;
  s.innerHTML='<option value="">全部</option>'+(arr||[]).map(x=>'<option value="'+esc(x.name)+'">'+esc(formatHumanLabel(x.name))+' · '+fmt(x.count)+'</option>').join("");
  if(Array.from(s.options).some(o=>o.value===old))s.value=old;
}

function countNamed(arr,name){return Number((arr||[]).find(x=>x.name===name)?.count||0)}

function scopeNote(id,text,show,warn=false){
  let el=$(id);if(!el)return;
  el.hidden=!show;
  if(show){el.textContent=text;el.className="scope-note"+(warn?" warn":"")}
}

function trendLabel(row){
  if(row&&row.date&&row.hour!==undefined){
    let h=String(Number(row.hour)).padStart(2,"0"),d=new Date(row.date+"T"+h+":00:00Z");
    return d.toLocaleString(undefined,{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
  }
  return String(row?.date||"").slice(5);
}

// 智能全画幅磁吸 Canvas 走势图 (告别瞄准小圆点)
let currentTrendData=[];
function drawCanvasChart(){
  let canvas=$("#trendCanvas");if(!canvas)return;
  let box=$("#trendBox"),rect=box.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  canvas.width=rect.width*window.devicePixelRatio;
  canvas.height=rect.height*window.devicePixelRatio;
  let ctx=canvas.getContext("2d");
  ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
  let W=rect.width,H=rect.height,padL=40,padR=16,padT=18,padB=26,pw=W-padL-padR,ph=H-padT-padB;
  let a=currentTrendData;
  ctx.clearRect(0,0,W,H);
  if(!a.length){
    ctx.fillStyle="#94a3b8";ctx.font="12px var(--font)";ctx.textAlign="center";
    ctx.fillText("暂无走势数据",W/2,H/2);return;
  }
  let ok=a.map(x=>Number(x.playlist_success||0)+Number(x.user_success||0)),fail=a.map(x=>Number(x.resolve_failure||0));
  let max=Math.max(1,...ok,...fail);
  let getX=i=>a.length===1?padL+pw/2:padL+(i/(a.length-1))*pw;
  let getY=v=>padT+ph-(Number(v||0)/max)*ph;

  // 1. 水平虚线与 Y 刻度
  ctx.strokeStyle="color-mix(in srgb, var(--l) 80%, transparent)";
  ctx.lineWidth=1;ctx.fillStyle="#94a3b8";ctx.font="10px var(--mono)";ctx.textAlign="right";
  [0,.5,1].forEach(r=>{
    let y=padT+ph-r*ph,val=Math.round(max*r);
    ctx.beginPath();ctx.setLineDash([3,3]);ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
    ctx.fillText(fmt(val),padL-6,y+3);
  });
  ctx.setLineDash([]);

  // 2. X 轴标签
  ctx.textAlign="center";let step=Math.max(1,Math.ceil(a.length/7));
  a.forEach((row,i)=>{
    if(i%step===0||i===a.length-1){
      ctx.fillText(trendLabel(row),getX(i),H-8);
    }
  });

  // 3. 成功折线 (绿色)
  ctx.beginPath();
  ok.forEach((v,i)=>{let x=getX(i),y=getY(v);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
  ctx.strokeStyle="#10b981";ctx.lineWidth=2.5;ctx.stroke();

  // 4. 失败折线 (红色)
  ctx.beginPath();
  fail.forEach((v,i)=>{let x=getX(i),y=getY(v);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
  ctx.strokeStyle="#ef4444";ctx.lineWidth=2;ctx.stroke();

  // 5. 磁吸指针高亮
  if(canvas._activeIdx>=0&&canvas._activeIdx<a.length){
    let idx=canvas._activeIdx,snapX=getX(idx),yOk=getY(ok[idx]),yFail=getY(fail[idx]);
    ctx.beginPath();ctx.strokeStyle="#3b82f6";ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
    ctx.moveTo(snapX,padT);ctx.lineTo(snapX,H-padB);ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle="#10b981";ctx.beginPath();ctx.arc(snapX,yOk,4.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();

    ctx.fillStyle="#ef4444";ctx.beginPath();ctx.arc(snapX,yFail,4,0,Math.PI*2);ctx.fill();
    ctx.stroke();
  }
}

function initTrendInteractions(){
  let box=$("#trendBox"),canvas=$("#trendCanvas"),tip=$("#trendTip");
  if(!box||!canvas||box._inited)return;
  box._inited=true;
  box.addEventListener("mousemove",e=>{
    let rect=box.getBoundingClientRect(),a=currentTrendData;
    if(!a||!a.length)return;
    let padL=40,padR=16,pw=rect.width-padL-padR,mouseX=e.clientX-rect.left;
    if(mouseX<padL-15||mouseX>rect.width-padR+15){
      tip.style.display="none";canvas._activeIdx=-1;drawCanvasChart();return;
    }
    let ratio=Math.max(0,Math.min(1,(mouseX-padL)/pw));
    let idx=a.length===1?0:Math.round(ratio*(a.length-1));
    canvas._activeIdx=idx;
    let row=a[idx],ok=Number(row.playlist_success||0)+Number(row.user_success||0),fail=Number(row.resolve_failure||0);
    let total=ok+fail,rate=total>0?(ok/total*100).toFixed(1)+"%":"0.0%";
    $("#tipTitle").textContent=trendLabel(row);
    $("#tipOk").textContent=fmt(ok);
    $("#tipFail").textContent=fmt(fail);
    $("#tipRate").textContent=rate;

    let snapX=a.length===1?padL+pw/2:padL+(idx/(a.length-1))*pw;
    tip.style.left=snapX+"px";
    tip.style.top="30px";
    tip.style.display="block";
    drawCanvasChart();
  });
  box.addEventListener("mouseleave",()=>{
    tip.style.display="none";canvas._activeIdx=-1;drawCanvasChart();
  });
  window.addEventListener("resize",()=>drawCanvasChart());
}

function renderTrend(id,rows){
  currentTrendData=rows||[];
  initTrendInteractions();
  setTimeout(drawCanvasChart,20);
}

function render(){
  let o=A.overview||{},b=A.breakdowns||{},e=A.environment||{},f=A.availableFilters||{},q=A.dataQuality||{};
  let succ=Number(o.playlist_success||0)+Number(o.user_success||0);
  let apiReq=countNamed(f.channels,"api"),pluginReq=countNamed(f.channels,"plugin"),webReq=countNamed(f.channels,"web");
  let musicfreeReq=countNamed(f.clients,"musicfree"),anonymousApiReq=countNamed(f.clients,"anonymous_api");

  // 1. Overview KPIs
  kpis("#overviewKpis",[
    ["Requests",fmt(o.resolve_request),"统一 resolve_request 口径"],
    ["Success",fmt(succ),pct(o.success_rate)+" 成功率"],
    ["Tracks",fmt(o.tracks_processed),"处理歌曲 · 均单 "+(o.resolve_request>0?Math.round(o.tracks_processed/o.resolve_request):0)+" 首"],
    ["Exports",fmt(o.export),"文件导出总量"],
    ["Failures",fmt(o.resolve_failure),"最终失败解析"],
    ["Client IDs",fmt(o.active_clients),"活跃客户端类别，不代表用户/安装数"]
  ]);

  renderTrend("#trend",(A.hourlyTimeseries||[]).length?A.hourlyTimeseries:(A.timeseries||[]));
  bars("#platformBars",b.requested_platform);
  bars("#clientBars",f.clients);
  bars("#countryBars",A.geo?.countries);

  // Health check
  let checks=q.checks||[];
  $("#health").className="health "+(q.status==="healthy"?"good":"bad");
  $("#health").textContent=q.status==="healthy"?"● Data Healthy":"● Data Integrity Error";
  $("#quality").innerHTML=checks.map(x=>'<div class="notice '+(x.ok?"":"bad")+'">'+(x.ok?"✓ ":"✕ ")+esc(x.id)+'<br><span class="muted">'+esc(x.note)+(x.ok?"":" · expected "+fmt(x.expected)+" / actual "+fmt(x.actual))+'</span></div>').join("")
    +'<div class="muted" style="margin-top:6px">Latest: '+esc(q.latestDate||"—")+' · Legacy mixed: '+pct(q.legacyMixedShare)+'</div>';

  let d=dates(),chips=['<span class="chip">'+esc(d.from===d.to?d.from:(d.from+" → "+d.to))+'</span>'];
  ["channel","client","platform","country","region"].forEach(id=>{let v=$("#"+id).value;if(v)chips.push('<span class="chip">'+esc(id)+": "+esc(v)+'</span>')});
  $("#chips").innerHTML=chips.join("");

  if(A.availableDateRange){
    snapshotRange=A.availableDateRange;
    ["singleDate","fromDate","toDate"].forEach(id=>{let el=$("#"+id);if(el){el.min=snapshotRange.from||"";el.max=snapshotRange.to||isoDayOffset(0)}});
  }
  let generated=A.generatedAt?new Date(A.generatedAt).toLocaleString():"—";
  $("#updated").textContent="快照 "+generated+" · 最新数据 "+esc(q.latestDate||"—");

  // 2. Web Page (全维度复原)
  kpis("#webKpis",[
    ["Web Requests",fmt(webReq),"resolve_request"],
    ["Page Views",fmt(o.page_view),"官网访问"],
    ["Daily Uniques",fmt(o.visitor_unique),"每日匿名去重"],
    ["Exports",fmt(o.export),"官网导出事件"],
    ["Clipboard",fmt(o.clipboard),"官网复制事件"],
    ["Top Browser",e.browsers?.[0]?.name||"—","最多访问浏览器"]
  ]);
  let envPartial=Boolean($("#platform").value||$("#country").value||$("#region").value);
  scopeNote("#webScope","Browser / Device / OS 仅支持日期、Channel、Client 筛选；当前 Platform / Country / Region 不会作用于环境数据。",envPartial,true);
  bars("#referrerBars",b.referrer_source);
  bars("#browserBars",e.browsers);
  bars("#deviceBars",e.devices);
  bars("#osBars",e.operatingSystems);
  bars("#webCountryBars",A.geo?.countries,15);
  bars("#webRegionBars",A.geo?.regions,15);

  // 3. Reliability Page (全维度复原)
  kpis("#reliabilityKpis",[
    ["Success Rate",pct(o.success_rate),"成功率"],
    ["Failures",fmt(o.resolve_failure),"失败解析"],
    ["Requests",fmt(o.resolve_request),"总请求数"],
    ["Rate Limited",fmt(o.rate_limited),"HTTP 429 频控"],
    ["Top Failure",b.failure_code?.[0]?.name||"—","最频发错误"],
    ["Common Latency",b.latency_bucket?.[0]?.name||"—","出现次数最多的延迟桶"]
  ]);
  let geoPartial=Boolean($("#country").value||$("#region").value);
  scopeNote("#reliabilityScope","Country / Region 只作用于 Overview、趋势和 Geo cube；Failure Code、Stage、Latency 等可靠性 breakdown 不做地理关联，因此不会随地理筛选变化。",geoPartial,true);
  bars("#failureCodeBars",b.failure_code);
  bars("#failureStageBars",b.failure_stage);
  bars("#latencyBars",b.latency_bucket);
  bars("#requestedTypeBars",b.requested_type);
  bars("#providerBars",b.provider_failure_path);
  bars("#endpointBars",b.endpoint);
  bars("#exportSizeBars",b.export_playlist_size);
  bars("#exportFormatBars",b.export_format);
  bars("#clipboardModeBars",b.clipboard_mode);

  // 4. Integrations Page
  kpis("#integrationKpis",[
    ["API Requests",fmt(apiReq),"Public API resolve_request"],
    ["Plugin Requests",fmt(pluginReq),"插件 resolve_request"],
    ["MusicFree",fmt(musicfreeReq),"已识别 MusicFree 请求"],
    ["Anonymous API",fmt(anonymousApiReq),"未注册 API 客户端"],
    ["Client IDs",fmt(o.active_clients),"活跃客户端类别"],
    ["Migration Handoffs",fmt(o.migration_handoff),"迁移服务跳转"]
  ]);
  scopeNote("#integrationScope","Requests 使用 resolve_request 口径；Version / Host 仅来自已声明的 plugin attribution，不代表用户或设备身份。",true,false);
  bars("#integrationClients",f.clients);
  bars("#versionBars",b.client_version);
  bars("#hostBars",b.host_platform);
  bars("#migrationBars",b.migration_destination);
  bars("#migrationProviderBars",b.migration_provider);

  // 5. Security Page
  kpis("#securityKpis",[
    ["Rate Limited",fmt(o.rate_limited),"HTTP 429"],
    ["API Channel",fmt(apiReq),"正常产品流量"],
    ["Plugin Channel",fmt(pluginReq),"正常产品流量"],
    ["Quarantine","见下方","安全取证"],
    ["Legacy Mixed",pct(q.legacyMixedShare),"历史未知来源"],
    ["Data Health",q.status==="healthy"?"Healthy":"Error",""]
  ]);
  bars("#rateBars",b.rate_limit_endpoint);

  // Select dropdowns
  options("client",f.clients);
  options("country",A.geo?.countries);
  options("region",A.geo?.regions);

  // Check Feedback for Alert Banner
  feedbackCountCheck();
}

async function load({force=false}={}){
  let key=params().toString(),seq=++loadSeq,cached=analyticsCache.get(key);
  if(loadController)loadController.abort();
  if(!force&&cached&&Date.now()-cached.at<CACHE_MS){
    A=cached.data;render();
    if($("#page-security")?.classList.contains("active"))quarantine();
    if($("#page-feedback")?.classList.contains("active"))feedback(currentFbStatus);
    return;
  }
  let controller=new AbortController();loadController=controller;
  try{
    $("#error").innerHTML="";
    $("#health").className="health";$("#health").textContent="● Loading";$("#updated").textContent="正在加载…";
    let data=await api("/api/analytics?"+key,{signal:controller.signal});
    if(seq!==loadSeq)return;
    A=data;cacheSet(key,data);render();
    if($("#page-security")?.classList.contains("active"))quarantine();
    if($("#page-feedback")?.classList.contains("active"))feedback(currentFbStatus);
  }catch(e){
    if(e?.name==="AbortError"||seq!==loadSeq)return;
    $("#health").className="health bad";$("#health").textContent="● Load Failed";$("#updated").textContent="加载失败";
    $("#error").innerHTML='<div class="notice bad">'+esc(e.message)+'</div>';
  }finally{
    if(seq===loadSeq)loadController=null;
  }
}

async function quarantine(){
  try{
    let qp=new URLSearchParams(dates());qp.set("limit","100");
    let d=await api("/api/quarantine?"+qp.toString()),rows=d.quarantine||[],m=new Map();
    rows.forEach(x=>m.set(x.reason||"unknown",(m.get(x.reason||"unknown")||0)+Number(x.count||0)));
    bars("#quarantineSummary",Array.from(m,([name,count])=>({name,count})));
    $("#quarantineRows").innerHTML=rows.map(x=>'<tr><td>'+esc(x.incident_date)+'</td><td>'+esc(x.reason)+'</td><td>'+esc(x.platform)+'</td><td>'+esc(x.metric_or_dimension)+'</td><td>'+esc([x.country,x.region,x.city].filter(Boolean).join(" / "))+'</td><td>'+fmt(x.count)+'</td></tr>').join("")||'<tr><td colspan="6">暂无隔离记录</td></tr>';
  }catch(e){
    $("#quarantineRows").innerHTML='<tr><td colspan="6">'+esc(e.message)+'</td></tr>';
  }
}

async function feedbackCountCheck(){
  try{
    let d=await api("/api/feedback?status=pending&limit=1");
    let pending=d.counts?.pending??d.total??0;
    let badge=$("#navPendingBadge"),banner=$("#overviewAlert");
    if(pending>0){
      if(badge){badge.style.display="inline-block";badge.textContent=pending}
      if(banner){banner.style.display="flex";$("#alertPendingCount").textContent=pending}
    }else{
      if(badge)badge.style.display="none";
      if(banner)banner.style.display="none";
    }
    if(d.counts){
      $("#fbCountAll").textContent=d.counts.all||0;
      $("#fbCountPending").textContent=d.counts.pending||0;
      $("#fbCountResolved").textContent=d.counts.resolved||0;
      $("#fbCountIgnored").textContent=d.counts.ignored||0;
    }
  }catch(e){}
}

async function feedback(status="pending"){
  currentFbStatus=status;
  $$(".fb-tab").forEach(b=>b.classList.toggle("active",b.dataset.fbStatus===status));
  try{
    let url="/api/feedback?limit=100"+(status==="all"?"":"&status="+encodeURIComponent(status));
    let d=await api(url),rows=d.entries||[];
    if(d.counts){
      $("#fbCountAll").textContent=d.counts.all||0;
      $("#fbCountPending").textContent=d.counts.pending||0;
      $("#fbCountResolved").textContent=d.counts.resolved||0;
      $("#fbCountIgnored").textContent=d.counts.ignored||0;
      let badge=$("#navPendingBadge");
      if(badge){
        if(d.counts.pending>0){badge.style.display="inline-block";badge.textContent=d.counts.pending}
        else{badge.style.display="none"}
      }
    }
    $("#feedbackRows").innerHTML=rows.map(x=>{
      let urlStr=esc(x.url||"—");
      let urlHtml=x.url
        ? '<div style="display:flex;align-items:center;gap:6px">'
          + '<span class="url-cell" title="'+urlStr+'">'+urlStr+'</span>'
          + '<button class="btn-sm cp-btn" data-url="'+urlStr+'">复制</button>'
          + '<a href="'+urlStr+'" target="_blank" rel="noreferrer" class="btn-sm" style="text-decoration:none;color:var(--a)">测试 ↗</a>'
          + '</div>'
        : '<span class="muted">—</span>';
      let st=x.status||"pending";
      let stCls=st==="resolved"?"resolved":(st==="ignored"?"ignored":"pending");
      let stTxt=st==="resolved"?"已修复":(st==="ignored"?"已忽略":"待处理");
      let actions=['pending','resolved','ignored'].filter(s=>s!==st).map(s=>{
        let txt=s==="resolved"?"标为修复":(s==="ignored"?"忽略":"重开");
        let cls=s==="resolved"?"btn-sm ok":"btn-sm";
        return '<button class="'+cls+' status-btn" data-id="'+x.id+'" data-status="'+s+'">'+txt+'</button>';
      }).join(" ");

      return '<tr>'
        + '<td style="font-family:var(--mono)">#'+esc(x.id)+'</td>'
        + '<td><span style="font-weight:600;color:'+getBrandColor(x.platform)+'">'+esc(formatHumanLabel(x.platform||"unknown"))+'</span></td>'
        + '<td>'+urlHtml+'</td>'
        + '<td><span class="badge" style="background:var(--l);font-family:var(--mono)">'+esc(x.error_code||"—")+'</span></td>'
        + '<td style="text-align:center;font-weight:700;font-family:var(--mono)">'+fmt(x.report_count)+'</td>'
        + '<td class="muted" style="font-size:11px">'+esc(String(x.last_reported_at||x.first_reported_at||"").replace("T"," ").slice(0,19))+'</td>'
        + '<td><span class="badge '+stCls+'">'+stTxt+'</span></td>'
        + '<td style="text-align:right">'+actions+'</td>'
        + '</tr>';
    }).join("")||'<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--m)">当前分类无反馈记录</td></tr>';

    $$('#feedbackRows .status-btn').forEach(b=>b.onclick=async()=>{
      let sTxt=b.dataset.status==='resolved'?'已修复':(b.dataset.status==='ignored'?'已忽略':'待处理');
      if(!confirm('确认将反馈 #'+b.dataset.id+' 标记为 '+sTxt+'？'))return;
      try{
        await api('/api/feedback?id='+encodeURIComponent(b.dataset.id)+'&status='+encodeURIComponent(b.dataset.status),{method:'PUT'});
        await feedback(currentFbStatus);
      }catch(e){alert('更新失败：'+e.message)}
    });

    $$('#feedbackRows .cp-btn').forEach(b=>b.onclick=()=>{
      navigator.clipboard.writeText(b.dataset.url).then(()=>{
        let o=b.textContent;b.textContent="已复制";setTimeout(()=>b.textContent=o,1200);
      });
    });
  }catch(e){
    $("#feedbackRows").innerHTML='<tr><td colspan="8">'+esc(e.message)+'</td></tr>';
  }
}

$$(".tab").forEach(b=>b.onclick=()=>{
  $$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  $$(".page").forEach(x=>x.classList.remove("active"));
  $("#page-"+b.dataset.page).classList.add("active");
  if(b.dataset.page==="security")quarantine();
  if(b.dataset.page==="feedback")feedback(currentFbStatus);
  if(b.dataset.page==="overview")setTimeout(drawCanvasChart,30);
});

$$(".fb-tab").forEach(b=>b.onclick=()=>{
  feedback(b.dataset.fbStatus);
});

$("#gotoFeedback").onclick=()=>{
  $$(".tab").forEach(x=>x.classList.remove("active"));
  $$(".tab").find(x=>x.dataset.page==="feedback")?.classList.add("active");
  $$(".page").forEach(x=>x.classList.remove("active"));
  $("#page-feedback").classList.add("active");
  feedback("pending");
};

$$(".range button").forEach(b=>b.onclick=()=>setPreset(b.dataset.range));
["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id);if(el)el.onchange=()=>load()});
$("#applySingleDate").onclick=()=>{let d=$("#singleDate").value;if(!d)return;setDateInputs(d,d);markPreset("");load()};
$("#singleDate").onchange=()=>{let d=$("#singleDate").value;if(!d)return;setDateInputs(d,d);markPreset("");load()};
$("#applyDateRange").onclick=()=>{dates();markPreset("");load()};
["fromDate","toDate"].forEach(id=>$("#"+id).onkeydown=e=>{if(e.key==="Enter"){$("#applyDateRange").click()}});
$("#reset").onclick=()=>{
  ["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id);if(el)el.value=""});
  setDateInputs(isoDayOffset(-6),isoDayOffset(0));markPreset("7");load({force:true});
};
$("#refreshData").onclick=async()=>{
  if(!confirm("重新从云端拉取一次完整 Analytics 快照？"))return;
  let b=$("#refreshData");b.disabled=true;b.textContent="刷新中…";
  try{await api("/api/refresh",{method:"POST"});analyticsCache.clear();await load({force:true})}
  catch(e){alert("刷新失败："+e.message)}
  finally{b.disabled=false;b.textContent="刷新云端数据"}
};
$("#reloadFeedback").onclick=()=>feedback(currentFbStatus);

setDateInputs(isoDayOffset(-6),isoDayOffset(0));
markPreset("7");
load();
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
