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
ANALYTICS_PARAMS = {
    "from", "to", "channel", "client", "platform", "country", "region",
    "exclude_my", "excludeMy",
}
FEEDBACK_PARAMS = {"status", "limit", "offset", "id", "exclude_my", "excludeMy"}
QUARANTINE_PARAMS = {
    "limit", "offset", "reason", "date", "from", "to",
    "exclude_my", "excludeMy",
}



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


def reconcile_daily_core(rows: list[dict]) -> list[dict]:
    reconciled: dict[tuple[str, str, str, str], dict[str, int]] = {}
    legacy_groups: set[tuple[str, str, str, str]] = set()
    for row in rows:
        key = (
            str(row.get("date", "")),
            str(row.get("channel", "")),
            str(row.get("client_id", "")),
            str(row.get("platform", "")),
        )
        metric = str(row.get("metric", ""))
        count = int(row.get("count", 0) or 0)
        if key not in reconciled:
            reconciled[key] = {}
        if metric in {"parse_success_legacy", "parse_failure_legacy"}:
            legacy_groups.add(key)
        reconciled[key][metric] = max(reconciled[key].get(metric, 0), count)

    if not legacy_groups:
        return rows

    result = []
    for (date, channel, client_id, platform), metrics in reconciled.items():
        if (date, channel, client_id, platform) in legacy_groups:
            leg_success = metrics.pop("parse_success_legacy", 0)
            leg_fail = metrics.pop("parse_failure_legacy", 0)
            metrics["playlist_success"] = max(metrics.get("playlist_success", 0), leg_success)
            metrics["resolve_failure"] = max(metrics.get("resolve_failure", 0), leg_fail)
            req = metrics.get("playlist_success", 0) + metrics.get("user_success", 0) + metrics.get("resolve_failure", 0)
            metrics["resolve_request"] = max(metrics.get("resolve_request", 0), req)

        for metric, count in metrics.items():
            if metric not in {"parse_success_legacy", "parse_failure_legacy"}:
                result.append({
                    "date": date,
                    "channel": channel,
                    "client_id": client_id,
                    "platform": platform,
                    "metric": metric,
                    "count": count,
                })
    return result


def reconcile_client_env(rows: list[dict]) -> list[dict]:
    merged: dict[tuple[str, str, str, str, str, str], int] = defaultdict(int)
    for row in rows:
        d = str(row.get("date", ""))
        ch = str(row.get("channel", ""))
        cl = str(row.get("client_id", ""))
        dev = str(row.get("device_class", ""))
        bf = str(row.get("browser_family", ""))
        os_f = str(row.get("os_family", ""))
        cnt = int(row.get("count", 0) or 0)

        # Normalize legacy plugin browser tokens to canonical plugin:musicfree
        if bf in {"playlistout_musicfree", "playlistout_plugin"}:
            bf = "plugin:musicfree"
            if ch == "legacy_mixed":
                ch = "plugin"
            if cl == "legacy_unknown":
                cl = "musicfree"

        merged[(d, ch, cl, dev, bf, os_f)] += cnt

    return [
        {
            "date": d,
            "channel": ch,
            "client_id": cl,
            "device_class": dev,
            "browser_family": bf,
            "os_family": os_f,
            "count": cnt,
        }
        for (d, ch, cl, dev, bf, os_f), cnt in merged.items()
    ]


def reconcile_breakdown_rows(rows: list[dict]) -> list[dict]:
    merged: dict[tuple[str, str, str, str, str, str], int] = defaultdict(int)
    for row in rows:
        d = str(row.get("date", ""))
        ch = str(row.get("channel", ""))
        cl = str(row.get("client_id", ""))
        p = str(row.get("platform", ""))
        dim = str(row.get("dimension", ""))
        val = str(row.get("value", ""))
        cnt = int(row.get("count", 0) or 0)

        # Normalize legacy latency bucket _500ms to canonical <500ms
        if dim == "latency_bucket" and val == "_500ms":
            val = "<500ms"

        merged[(d, ch, cl, p, dim, val)] += cnt

    return [
        {
            "date": d,
            "channel": ch,
            "client_id": cl,
            "platform": p,
            "dimension": dim,
            "value": val,
            "count": cnt,
        }
        for (d, ch, cl, p, dim, val), cnt in merged.items()
    ]


def is_exclude_my(query: dict[str, str]) -> bool:
    if str(query.get("country", "")).strip().upper() == "MY":
        return False
    val = str(query.get("exclude_my", query.get("excludeMy", "1")) or "1").strip().lower()
    return val not in {"0", "false", "no", "off"}


def apply_country_exclusion(
    daily: list[dict],
    geo: list[dict],
    hourly: list[dict],
    excluded_country: str = "MY",
) -> tuple[list[dict], list[dict], list[dict]]:
    filtered_geo = [
        row
        for row in geo
        if str(row.get("country", "")).upper() != excluded_country
    ]
    excluded_map: dict[tuple[str, str, str, str, str], int] = defaultdict(int)
    legacy_parse_req: dict[tuple[str, str], int] = defaultdict(int)

    for row in geo:
        if str(row.get("country", "")).upper() == excluded_country:
            d = str(row.get("date", ""))
            ch = str(row.get("channel", ""))
            cl = str(row.get("client_id", ""))
            p = str(row.get("platform", ""))
            m = str(row.get("metric", ""))
            cnt = int(row.get("count", 0) or 0)
            excluded_map[(d, ch, cl, p, m)] += cnt
            if m == "parse_request":
                legacy_parse_req[(d, p)] += cnt

    if not excluded_map and not legacy_parse_req:
        return daily, filtered_geo, hourly

    grouped_daily: dict[tuple[str, str, str, str], dict[str, int]] = defaultdict(dict)
    for row in daily:
        group_key = (
            str(row.get("date", "")),
            str(row.get("channel", "")),
            str(row.get("client_id", "")),
            str(row.get("platform", "")),
        )
        grouped_daily[group_key][str(row.get("metric", ""))] = int(row.get("count", 0) or 0)

    filtered_daily: list[dict] = []
    daily_totals_before: dict[tuple[str, str], int] = defaultdict(int)
    daily_totals_after: dict[tuple[str, str], int] = defaultdict(int)

    for (d, ch, cl, p), metrics in grouped_daily.items():
        for m, c in list(metrics.items()):
            daily_totals_before[(d, m)] += c
            deduction = excluded_map.get((d, ch, cl, p, m), 0)
            metrics[m] = max(0, c - deduction)

        # In legacy_mixed, parse_request was stored in daily_geo_stats as parse_request
        # while dailyCore aggregated them as playlist_success / resolve_failure / resolve_request.
        if ch == "legacy_mixed" and (d, p) in legacy_parse_req:
            leg_ded = legacy_parse_req[(d, p)]
            succ = metrics.get("playlist_success", 0)
            from_succ = min(succ, leg_ded)
            metrics["playlist_success"] = succ - from_succ
            rem = leg_ded - from_succ
            if rem > 0 and "resolve_failure" in metrics:
                metrics["resolve_failure"] = max(0, metrics["resolve_failure"] - rem)

        if "playlist_success" in metrics or "user_success" in metrics or "resolve_failure" in metrics:
            req = (
                metrics.get("playlist_success", 0)
                + metrics.get("user_success", 0)
                + metrics.get("resolve_failure", 0)
            )
            metrics["resolve_request"] = req

        for m, c in metrics.items():
            daily_totals_after[(d, m)] += c
            if c > 0:
                filtered_daily.append({
                    "date": d,
                    "channel": ch,
                    "client_id": cl,
                    "platform": p,
                    "metric": m,
                    "count": c,
                })

    filtered_hourly: list[dict] = []
    for row in hourly:
        d = str(row.get("date", ""))
        m = str(row.get("metric", ""))
        orig_count = int(row.get("count", 0) or 0)
        tot_before = daily_totals_before.get((d, m), 0)
        tot_after = daily_totals_after.get((d, m), 0)
        if tot_before > 0:
            new_count = int(round(orig_count * (tot_after / tot_before)))
        else:
            new_count = orig_count
        if new_count > 0:
            new_row = dict(row)
            new_row["count"] = new_count
            filtered_hourly.append(new_row)

    return filtered_daily, filtered_geo, filtered_hourly


def build_local_analytics(snapshot: dict, query: dict[str, str]) -> dict:
    raw_daily = reconcile_daily_core([row for row in snapshot.get("dailyCore", []) if isinstance(row, dict)])
    raw_hourly = [row for row in snapshot.get("hourlyCore", []) if isinstance(row, dict)]
    raw_geo = [row for row in snapshot.get("geo", []) if isinstance(row, dict)]
    breakdown_rows = reconcile_breakdown_rows([row for row in snapshot.get("breakdowns", []) if isinstance(row, dict)])
    env_rows = reconcile_client_env([row for row in snapshot.get("clientEnv", []) if isinstance(row, dict)])

    exclude_my = is_exclude_my(query)
    if exclude_my:
        daily, geo_rows, hourly = apply_country_exclusion(raw_daily, raw_geo, raw_hourly, "MY")
    else:
        daily, geo_rows, hourly = raw_daily, raw_geo, raw_hourly


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
        "exclude_my": "1" if exclude_my else "0",
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
        and _matches(row, filters, include_geo=False, omit="country")
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
            "ok": geo_active or exclude_my or int(overview["export"]) == export_total,
            "expected": int(overview["export"]),
            "actual": export_total,
            "note": (
                "Geo filtering intentionally does not correlate reliability/breakdown cubes."
                if (geo_active or exclude_my)
                else "export must equal sum(export_format)"
            ),
        },
        {
            "id": "clipboard_breakdown",
            "ok": geo_active or exclude_my or int(overview["clipboard"]) == clipboard_total,
            "expected": int(overview["clipboard"]),
            "actual": clipboard_total,
            "note": (
                "Geo filtering intentionally does not correlate reliability/breakdown cubes."
                if (geo_active or exclude_my)
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

    fb_rows = [row for row in snapshot.get("feedback", []) if isinstance(row, dict)]
    if exclude_my:
        fb_rows = [row for row in fb_rows if str(row.get("country", "")).upper() != "MY"]
    fb_pending = sum(
        1 for row in fb_rows
        if str(row.get("status", "") or "pending").lower() == "pending"
    )

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
            "pending_feedback": fb_pending,
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
    if is_exclude_my(query):
        rows = [row for row in rows if str(row.get("country", "")).upper() != "MY"]
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
    if is_exclude_my(query):
        all_rows = [row for row in all_rows if str(row.get("country", "")).upper() != "MY"]
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
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate icon" href="/favicon.ico">
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
*{box-sizing:border-box}html{overflow-y:scroll;scrollbar-gutter:stable}body{margin:0;background:var(--bg);color:var(--t);font-family:var(--font);font-size:13px;line-height:1.5}
button,select,input{font:inherit;color:inherit}
.wrap{max-width:1440px;margin:auto;padding:14px 22px}
.top{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--p) 96%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--l);box-shadow:var(--s)}
.head{display:flex;align-items:center;min-height:50px;padding:3px 0}
.brand{display:flex;align-items:center;gap:9px;flex-shrink:0;text-decoration:none;color:inherit;cursor:pointer;transition:opacity .15s}
.brand:hover{opacity:.8}
.logo-img{width:32px;height:32px;border-radius:8px;object-fit:cover;display:block;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.15);border:1px solid var(--l)}
.brand-info{display:flex;flex-direction:column;line-height:1.2}
h1{margin:0;font-size:14px;font-weight:700;letter-spacing:-.2px;display:flex;align-items:center;gap:6px}
.badge-tag{font-size:10px;font-weight:600;padding:1px 5px;border-radius:999px;background:color-mix(in srgb,var(--a) 12%,transparent);color:var(--a);border:1px solid color-mix(in srgb,var(--a) 25%,transparent)}
.muted{font-size:12px;color:var(--m)}
.headright{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:auto}
#updated{font-size:11px;white-space:nowrap;color:var(--m);text-align:right}
.health{padding:4px 9px;border:1px solid var(--l);background:var(--p);border-radius:999px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:6px;min-width:92px;justify-content:center}
.health.good{color:var(--g);border-color:color-mix(in srgb,var(--g) 30%,transparent);background:color-mix(in srgb,var(--g) 8%,transparent)}
.health.bad{color:var(--r);border-color:color-mix(in srgb,var(--r) 30%,transparent);background:color-mix(in srgb,var(--r) 8%,transparent)}
.ghost{height:30px;padding:0 10px;border:1px solid var(--l);border-radius:7px;background:var(--p);cursor:pointer;font-size:12px;font-weight:500;box-shadow:var(--s);transition:background .15s,border-color .15s}
.ghost:hover{background:color-mix(in srgb,var(--p) 85%,var(--a));border-color:var(--a)}

.tabs{display:flex;gap:4px;align-items:center;padding:0;margin:0 0 0 16px;flex-shrink:0}
.tab{border:1px solid transparent;border-radius:8px;padding:4px 10px;background:transparent;color:var(--m);cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;transition:background .12s,color .12s,border-color .12s;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;outline:none}
.tab:hover{color:var(--t);background:color-mix(in srgb,var(--p) 65%,transparent);border-color:var(--l)}
.tab.active{background:var(--p);color:var(--a);border-color:color-mix(in srgb,var(--a) 35%,var(--l))}
.tab:focus-visible{outline:2px solid var(--a);outline-offset:-1px}
.tab-icon{font-size:14px;line-height:1;display:flex;align-items:center}
.tab-text{display:flex;flex-direction:column;align-items:flex-start;line-height:1.15;text-align:left}
.tab-title{font-size:12px;font-weight:600;color:inherit}
.tab-sub{font-size:9.5px;font-weight:600;color:var(--m);letter-spacing:.3px;text-transform:uppercase}
.tab.active .tab-sub{color:color-mix(in srgb,var(--a) 70%,var(--m))}
.tab-badge{padding:1px 5px;border-radius:999px;font-size:10px;font-weight:700;background:var(--w);color:#fff;line-height:1.2;margin-left:2px}
.tab.active .tab-badge{background:var(--w);color:#fff}

.filter-card{padding:12px 16px;margin-bottom:14px;background:var(--p);border:1px solid var(--l);border-radius:var(--rad);box-shadow:var(--s)}
.filter-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--l);min-height:36px}
.filter-card-title{font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;color:var(--t);white-space:nowrap}
.toggle-switch{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:6px;transition:background .15s}
.toggle-switch:hover{background:color-mix(in srgb,var(--p) 80%,var(--a))}
.toggle-switch input{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.toggle-slider{position:relative;width:30px;height:17px;background:var(--l);border-radius:999px;transition:background .2s ease;flex-shrink:0}
.toggle-slider::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.4,0,.2,1)}
.toggle-switch input:checked + .toggle-slider{background:var(--g)}
.toggle-switch input:checked + .toggle-slider::after{transform:translateX(13px)}
.toggle-switch-text{font-size:11.5px;font-weight:600;color:var(--m);white-space:nowrap}
.toggle-switch input:checked ~ .toggle-switch-text{color:var(--t)}
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

.page{display:none;min-height:calc(100vh - 220px)}.page.active{display:block}
.section{display:flex;justify-content:space-between;align-items:end;margin:16px 0 10px}
.section h2{margin:0;font-size:16px;font-weight:700}

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
.bar{display:grid;grid-template-columns:150px 1fr 70px;gap:8px;align-items:center;font-size:12px}
.bn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
.b-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
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
@media(max-width:1240px){.head{flex-wrap:wrap;padding:6px 0;gap:8px}.tabs{order:3;width:100%;justify-content:flex-start;margin:4px 0 0;overflow-x:auto}}
@media(max-width:1100px){.filters{grid-template-columns:repeat(3,1fr)}.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.filters{grid-template-columns:1fr 1fr}.kpis{grid-template-columns:1fr 1fr}.grid2,.grid3{grid-template-columns:1fr}.bar{grid-template-columns:100px 1fr 60px}}
</style></head><body>

<!-- 纤细吸顶导航栏：仅常驻标签页与状态，中英文上下换行，绝不遮挡视野 -->
<header class="top"><div class="wrap">
  <div class="head">
    <a href="https://playlistout.lengxiqwq.com/" target="_blank" rel="noopener noreferrer" class="brand" title="访问 PlaylistOut 官方网站 ↗">
      <img src="/logo-64.png" width="32" height="32" class="logo-img" alt="PlaylistOut" onerror="this.onerror=null;this.src='/favicon.svg'">
      <div class="brand-info">
        <h1>PlaylistOut <span class="badge-tag">Analytics</span></h1>
        <div class="muted" style="font-size:10px;white-space:nowrap">Token 不进入浏览器 · 点击访问官网 ↗</div>
      </div>
    </a>
    <nav class="tabs">
      <button class="tab active" data-page="overview">
        <span class="tab-icon">📊</span>
        <span class="tab-text">
          <span class="tab-title">业务总览</span>
          <span class="tab-sub">Overview</span>
        </span>
      </button>
      <button class="tab" data-page="feedback">
        <span class="tab-icon">🐛</span>
        <span class="tab-text">
          <span class="tab-title">待审歌单</span>
          <span class="tab-sub">Feedback</span>
        </span>
        <span id="navPendingBadge" class="tab-badge" style="display:none">0</span>
      </button>
      <button class="tab" data-page="web">
        <span class="tab-icon">💻</span>
        <span class="tab-text">
          <span class="tab-title">终端地域</span>
          <span class="tab-sub">Web</span>
        </span>
      </button>
      <button class="tab" data-page="reliability">
        <span class="tab-icon">🛡️</span>
        <span class="tab-text">
          <span class="tab-title">稳定偏好</span>
          <span class="tab-sub">Reliability</span>
        </span>
      </button>
      <button class="tab" data-page="integrations">
        <span class="tab-icon">🔌</span>
        <span class="tab-text">
          <span class="tab-title">生态集成</span>
          <span class="tab-sub">Integrations</span>
        </span>
      </button>
      <button class="tab" data-page="security">
        <span class="tab-icon">🔒</span>
        <span class="tab-text">
          <span class="tab-title">安全风控</span>
          <span class="tab-sub">Security</span>
        </span>
      </button>
    </nav>
    <div class="headright">
      <div id="health" class="health">● Loading</div>
      <div id="updated" class="muted" style="font-size:11px">尚未加载</div>
      <button id="refreshData" class="ghost">刷新云端数据</button>
    </div>
  </div>
</div></header>

<main class="wrap"><div id="error"></div>

<!-- 维度与时间筛选工具栏 (作为页面内容卡片，点选后随页面自然滚动，绝不遮挡视野) -->
<div class="card filter-card">
  <div class="filter-card-head">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="filter-card-title"><span>⚙️</span> 维度与时间筛选工具栏 (Filters)</div>
      <div class="muted">单日自动显示小时趋势；从本地快照读取，不重复请求 Worker</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
      <label class="toggle-switch" title="一键排除所有来自马来西亚的测试记录（默认开启）">
        <input type="checkbox" id="switchExcludeMy" checked>
        <span class="toggle-slider"></span>
        <span class="toggle-switch-text">排除 MY 测试</span>
      </label>
      <div id="chips" class="chips"></div>
    </div>
  </div>
  <div class="filters">
    <div class="field date-field">
      <div class="date-tools">
        <div class="range">
          <button data-range="today">今天</button>
          <button data-range="yesterday">昨天</button>
          <button data-range="daybefore">前天</button>
          <button data-range="day3">大前天</button>
          <button data-range="7">近7天</button>
          <button data-range="30">近30天</button>
          <button data-range="all" class="active">全部历史</button>
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

  <div class="grid2" style="margin-top:12px">
    <div class="panel">
      <div class="panel-head"><h3>🌍 访问国家 Top 10</h3><span class="muted" style="font-size:11px">Country</span></div>
      <div id="countryBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🏙️ 活跃省份 / 地区 Top 10</h3><span class="muted" style="font-size:11px">Region</span></div>
      <div id="regionBars" class="bars"></div>
    </div>
  </div>

  <div class="grid2" style="margin-top:12px">
    <div class="panel">
      <div class="panel-head"><h3>🔌 Resolve Clients 接入端</h3><span class="muted" style="font-size:11px">生态分流</span></div>
      <div id="clientBars" class="bars"></div>
      <div class="muted" style="font-size:11px;margin-top:8px;line-height:1.4">💡 历史说明：<strong>历史未细分流量 (V1时期)</strong> 为 V2 架构前积累的历史统计，当时系统尚未细分 Channel/Client 维度。遵循真实性原则，不对其进行虚假推测。</div>
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
            <th style="width:130px">错误代码</th>
            <th style="width:160px">地域 / 城市</th>
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
    <div><h2>生态集成与插件接入 Integrations</h2><div class="muted">客户端生态、MusicFree 插件专区与未来多播放器扩展。</div></div>
  </div>
  <div id="integrationScope" class="scope-note"></div>
  <div id="integrationKpis" class="kpis"></div>

  <div class="grid2" style="margin-top:12px">
    <div class="panel">
      <div class="panel-head"><h3>🔌 接入端全貌分布 Resolve Clients</h3><span class="muted" style="font-size:11px">渠道分流</span></div>
      <div id="integrationClients" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🚀 迁移跳转目标平台 Migration Destinations</h3><span class="muted" style="font-size:11px">服务分流</span></div>
      <div id="migrationBars" class="bars"></div>
    </div>
  </div>

  <!-- 插件专区模块：按播放器插件完全分类隔离 -->
  <div class="section" style="margin-top:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
      <div>
        <h3 style="font-size:15px;margin:0">🧩 播放器插件分类专区 (Player Plugin Workspaces)</h3>
        <div class="muted" style="font-size:11px">多播放器插件架构规范：版本与宿主归属独立分类，不与其它插件混杂。</div>
      </div>
      <div class="chips" style="align-items:center">
        <span class="chip" style="background:color-mix(in srgb,var(--a) 12%,transparent);color:var(--a);font-weight:600">🟣 MusicFree 专区 (活跃)</span>
        <span class="chip" style="opacity:.6">➕ 更多播放器预留 (Extensible)</span>
      </div>
    </div>
  </div>

  <div class="grid2" style="margin-top:4px">
    <div class="panel" style="border-top:3px solid #8b5cf6">
      <div class="panel-head">
        <div>
          <h3 style="color:#8b5cf6">🟣 MusicFree · 插件声明版本 Versions</h3>
          <div class="muted" style="font-size:11px">统一插件版本分布 · 统一紫标规范，避免杂色</div>
        </div>
        <span class="badge" style="background:color-mix(in srgb,#8b5cf6 15%,var(--p));color:#8b5cf6">Plugin: musicfree</span>
      </div>
      <div id="versionBars" class="bars"></div>
    </div>

    <div class="panel" style="border-top:3px solid #8b5cf6">
      <div class="panel-head">
        <div>
          <h3 style="color:#8b5cf6">📱 MusicFree · 宿主客户端环境 Host Platforms</h3>
          <div class="muted" style="font-size:11px">MusicFree 运行的操作系统终端分布</div>
        </div>
        <span class="badge" style="background:color-mix(in srgb,#8b5cf6 15%,var(--p));color:#8b5cf6">Attributed Hosts</span>
      </div>
      <div id="hostBars" class="bars"></div>
    </div>
  </div>

  <div class="grid2" style="margin-top:12px">
    <div class="panel">
      <div class="panel-head"><h3>🛤️ 迁移跳转渠道来源 Migration Providers</h3><span class="muted" style="font-size:11px">来源打标</span></div>
      <div id="migrationProviderBars" class="bars"></div>
    </div>
    <div class="panel" style="background:color-mix(in srgb,var(--p) 92%,var(--bg));border-style:dashed">
      <div class="panel-head"><h3>📦 多播放器插件架构标准说明</h3><span class="badge" style="background:var(--l)">Architecture</span></div>
      <div style="font-size:11.5px;color:var(--m);line-height:1.6">
        PlaylistOut 遵循 <strong>Multi-Player Plugin Architecture</strong> 隔离规范：<br>
        • 所有插件位于 <code>plugins/&lt;player-id&gt;/</code>，拥有独立构建、测试与版本命名空间；<br>
        • 当接入新播放器（如 LX Music 等）时，遥测数据通过 <code>channel=plugin</code> 及对应 <code>client_id</code> 上报；<br>
        • 自动化看板将自动建立独立卡片展示该播放器的专属版本矩阵，绝不将不同播放器的版本混淆并列。
      </div>
    </div>
  </div>
</section>

<!-- 6. 安全风控与防爬隔离 (Security) -->
<section class="page" id="page-security">
  <div class="section">
    <div><h2>安全防护与防爬隔离 Security</h2><div class="muted">API 是产品流量；Bot、429、Quarantine 才是安全层 · 速率限流与遥测沙盒隔离。</div></div>
  </div>
  <div id="securityKpis" class="kpis"></div>

  <!-- 产品经理视角：安全机制与风控策略全景卡片 -->
  <div class="card" style="padding:14px 18px;margin-top:12px;background:color-mix(in srgb,var(--p) 95%,var(--a));border-left:4px solid var(--a)">
    <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:6px;margin-bottom:8px">
      <span>🛡️</span> PlaylistOut 双轨安全防御与遥测隔离体系 (Security Defense & Quarantine Architecture)
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;font-size:11.5px;line-height:1.6">
      <div>
        <div style="font-weight:700;color:var(--t)">1. 为什么被风控拦截？(Trigger Reason)</div>
        <div class="muted" style="margin-top:2px">
          • <strong>自动化爬虫签名</strong>：User-Agent 携带 <code>python-requests</code>、<code>curl</code>、<code>spider</code>、<code>bot</code> 等自动化标识；<br>
          • <strong>API 速率超限</strong>：直接脚本/未带 Web 凭证调用限制为 <strong>6 次/分钟</strong>（平均 10 秒 1 次）；官方 Web 端为 <strong>30 次/分钟</strong>。
        </div>
      </div>
      <div>
        <div style="font-weight:700;color:var(--t)">2. 我们返回了什么报错？(Enforcement Response)</div>
        <div class="muted" style="margin-top:2px">
          • <strong>速率超限</strong>：返回 <code>HTTP 429 Too Many Requests</code> 并注入 <code>Retry-After: 60</code> 头；<br>
          • <strong>非法输入/越权</strong>：返回 <code>HTTP 400 Invalid Input</code> 或 <code>HTTP 403 Forbidden</code>；<br>
          • <strong>解析异常</strong>：返回结构化业务错误码（如 <code>UPSTREAM_TIMEOUT</code> 等）。
        </div>
      </div>
      <div>
        <div style="font-weight:700;color:var(--t)">3. 数据隔离机制 (Quarantine) 的价值？</div>
        <div class="muted" style="margin-top:2px">
          • <strong>指标真实性防线</strong>：爬虫爆破流量被自动旁路沉淀至 <code>quarantined_stats</code> 归档；<br>
          • <strong>核心大盘绝对纯净</strong>：避免数千次爬虫请求扭曲真实用户歌单偏好、地区分布与成功率。
        </div>
      </div>
    </div>
  </div>

  <div class="grid2" style="margin-top:12px">
    <div class="panel">
      <div class="panel-head"><h3>🛑 429 限流触发端点 Rate-limit Endpoints</h3><span class="muted" style="font-size:11px">频控拦截</span></div>
      <div id="rateBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🛡️ 异常隔离原因汇总 Quarantine Summary</h3><span class="muted" style="font-size:11px">规则分类</span></div>
      <div id="quarantineSummary" class="bars"></div>
    </div>
  </div>

  <div class="panel" style="margin-top:12px">
    <div class="panel-head">
      <div>
        <h3>🔍 隔离取证记录 Quarantine Forensics</h3>
        <div class="muted" style="font-size:11px">精确展示触发时间、风控处置规则、地理城市、客户端签名、拦截频次与底层报文。</div>
      </div>
      <span class="badge" style="background:var(--l);font-family:var(--mono)" id="quarantineCountBadge">0 条记录</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:130px">发生时间 (Time)</th>
            <th style="width:190px">风控原因与处置结论</th>
            <th style="width:150px">来源地域与城市 (Geo)</th>
            <th style="width:140px">客户端特征 (Signature)</th>
            <th style="width:130px">目标行为与平台</th>
            <th style="width:90px;text-align:center">拦截频次</th>
            <th style="width:90px;text-align:right">操作</th>
          </tr>
        </thead>
        <tbody id="quarantineRows"></tbody>
      </table>
    </div>
  </div>
</section>

<!-- 取证报文模态框 -->
<div id="forensicModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:99;align-items:center;justify-content:center">
  <div style="background:var(--p);border:1px solid var(--l);border-radius:10px;max-width:640px;width:92%;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.25);max-height:85vh;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--l);padding-bottom:8px">
      <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px">
        <span>🛡️</span> 安全风控底层取证报文 (Forensic Details)
      </div>
      <button id="closeForensicModal" class="btn-sm" style="font-size:14px;padding:2px 8px;cursor:pointer">✕</button>
    </div>
    <div id="forensicContent" style="overflow:auto;font-family:var(--mono);font-size:11px;background:var(--bg);padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-all;line-height:1.5"></div>
  </div>
</div>

<div class="footer">PlaylistOut Analytics V2 · 遵循 Tabler 设计语言 · 本地沙箱无感运行</div>
</main>

<script>
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
let A=null,loadController=null,loadSeq=0,snapshotRange={from:null,to:null},currentFbStatus="pending";
let excludeMy=true; // 默认开启，排除测试地区数据 (MY)
const analyticsCache=new Map(),CACHE_MS=15000;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const fmt=n=>Number(n||0).toLocaleString();
const pct=n=>Number(n||0).toFixed(1)+"%";

function updateExcludeMyUI(){
  let sw=$("#switchExcludeMy");
  if(sw)sw.checked=Boolean(excludeMy);
}

function isoDayOffset(offset){
  let d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+offset);
  return d.toISOString().slice(0,10);
}
function setDateInputs(from,to){
  let f=$("#fromDate"),t=$("#toDate"),s=$("#singleDate"),max=isoDayOffset(0);
  if(f){f.max=max;f.value=from||""}if(t){t.max=max;t.value=to||""}if(s){s.max=max;s.value=(from&&from===to)?from:""}
}
function dates(){
  let f=$("#fromDate")?.value||"",t=$("#toDate")?.value||"";
  if(f&&t&&f>t)[f,t]=[t,f];
  if(f&&t)setDateInputs(f,t);
  return{from:f,to:t};
}
function markPreset(name){
  $$(".range button").forEach(x=>x.classList.toggle("active",x.dataset.range===name));
}
function setPreset(name){
  let to=isoDayOffset(0),from=to;
  if(name==="today"){from=to=isoDayOffset(0)}
  else if(name==="yesterday"){from=to=isoDayOffset(-1)}
  else if(name==="daybefore"){from=to=isoDayOffset(-2)}
  else if(name==="day3"){from=to=isoDayOffset(-3)}
  else if(name==="7"){from=isoDayOffset(-6)}
  else if(name==="30"){from=isoDayOffset(-29)}
  else if(name==="all"){
    from=snapshotRange.from||"";
    to=snapshotRange.to||"";
  }
  setDateInputs(from,to);markPreset(name);return load();
}
function params(){
  let p=new URLSearchParams(dates());
  ["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id),v=el?.value||"";if(v)p.set(id,v)});
  p.set("exclude_my", excludeMy ? "1" : "0");
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

const COUNTRY_META = {
  "CN": { name: "中国 (CN)", color: "#de2910" },
  "US": { name: "美国 (US)", color: "#1e40af" },
  "HK": { name: "中国香港 (HK)", color: "#e11d48" },
  "TW": { name: "中国台湾 (TW)", color: "#0284c7" },
  "JP": { name: "日本 (JP)", color: "#dc2626" },
  "SG": { name: "新加坡 (SG)", color: "#e11d48" },
  "MY": { name: "马来西亚 (MY)", color: "#f59e0b" },
  "GB": { name: "英国 (GB)", color: "#1d4ed8" },
  "DE": { name: "德国 (DE)", color: "#d97706" },
  "FR": { name: "法国 (FR)", color: "#2563eb" },
  "CA": { name: "加拿大 (CA)", color: "#dc2626" },
  "AU": { name: "澳大利亚 (AU)", color: "#059669" },
  "KR": { name: "韩国 (KR)", color: "#2563eb" },
  "RU": { name: "俄罗斯 (RU)", color: "#0284c7" },
  "NL": { name: "荷兰 (NL)", color: "#ea580c" },
  "IN": { name: "印度 (IN)", color: "#ea580c" },
  "VN": { name: "越南 (VN)", color: "#dc2626" },
  "TH": { name: "泰国 (TH)", color: "#4f46e5" },
  "ID": { name: "印尼 (ID)", color: "#dc2626" },
  "PH": { name: "菲律宾 (PH)", color: "#2563eb" },
  "BR": { name: "巴西 (BR)", color: "#16a34a" },
  "IT": { name: "意大利 (IT)", color: "#15803d" },
  "ES": { name: "西班牙 (ES)", color: "#eab308" },
  "MO": { name: "中国澳门 (MO)", color: "#059669" },
  "UNKNOWN": { name: "未知地区", color: "#64748b" }
};

const PROVINCE_NAMES = {
  "Guangdong": "广东 (Guangdong)", "Zhejiang": "浙江 (Zhejiang)", "Jiangsu": "江苏 (Jiangsu)",
  "Beijing": "北京 (Beijing)", "Shanghai": "上海 (Shanghai)", "Sichuan": "四川 (Sichuan)",
  "Shandong": "山东 (Shandong)", "Hubei": "湖北 (Hubei)", "Hunan": "湖南 (Hunan)",
  "Fujian": "福建 (Fujian)", "Henan": "河南 (Henan)", "Hebei": "河北 (Hebei)",
  "Shaanxi": "陕西 (Shaanxi)", "Anhui": "安徽 (Anhui)", "Chongqing": "重庆 (Chongqing)",
  "Tianjin": "天津 (Tianjin)", "Liaoning": "辽宁 (Liaoning)", "Jiangxi": "江西 (Jiangxi)",
  "Guangxi": "广西 (Guangxi)", "Yunnan": "云南 (Yunnan)", "Heilongjiang": "黑龙江 (Heilongjiang)",
  "Jilin": "吉林 (Jilin)", "Shanxi": "山西 (Shanxi)", "Guizhou": "贵州 (Guizhou)",
  "Gansu": "甘肃 (Gansu)", "Hainan": "海南 (Hainan)", "Inner Mongolia": "内蒙古 (Inner Mongolia)",
  "Xinjiang": "新疆 (Xinjiang)", "Ningxia": "宁夏 (Ningxia)", "Qinghai": "青海 (Qinghai)",
  "Tibet": "西藏 (Tibet)"
};

const CORE_BRAND_COLORS = {
  "qqmusic": "#10b981", "netease": "#ef4444", "kugou": "#3b82f6", "qishui": "#f59e0b",
  "plugin:musicfree": "#8b5cf6", "musicfree": "#8b5cf6", "plugin": "#8b5cf6",
  "official_web": "#0284c7", "web": "#0284c7",
  "anonymous_api": "#10b981", "api": "#10b981",
  "legacy_mixed": "#64748b", "legacy_unknown": "#64748b",
  "desktop": "#6366f1", "mobile": "#8b5cf6", "tablet": "#06b6d4",
  "chrome": "#ea4335", "edge": "#0078d7", "safari": "#0284c7", "firefox": "#f97316",
  "qqbrowser": "#2563eb", "wechat": "#07c160", "arkweb": "#cf0a2c", "huawei_browser": "#cf0a2c",
  "miui_browser": "#ff6700", "quark": "#0ea5e9", "baidu": "#2932e1", "slbrowser": "#8b5cf6",
  "bot_crawler": "#64748b",
  "windows": "#0078d7", "android": "#22c55e", "ios": "#6366f1", "macos": "#a855f7",
  "linux": "#f59e0b", "harmonyos": "#cf0a2c",
  "xlsx": "#10b981", "csv": "#3b82f6", "json": "#f59e0b",
  "clean_link": "#10b981", "markdown": "#3b82f6",
  "auto": "#06b6d4", "unknown": "#94a3b8",
  "<500ms": "#10b981", "500-1000ms": "#06b6d4", "500ms_1s": "#06b6d4",
  "1-3s": "#3b82f6", "1s_3s": "#3b82f6",
  "3-5s": "#f59e0b", "3s_5s": "#f59e0b",
  "5s+": "#ef4444", ">5s": "#ef4444",
  "primary": "#10b981", "fallback": "#f59e0b",
  "unsupported_url": "#f59e0b", "incomplete_playlist": "#f97316", "playlist_not_found": "#ef4444",
  "invalid_input": "#e11d48", "parse_error": "#dc2626", "upstream_timeout": "#b91c1c",
  "rate_limited": "#a855f7", "forbidden": "#be123c"
};

const AUTO_PALETTE = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#a855f7", "#0ea5e9", "#e11d48", "#d946ef", "#059669",
  "#2563eb", "#7c3aed", "#d97706", "#4f46e5", "#0284c7",
  "#0d9488", "#be123c", "#64748b", "#15803d"
];

function hashStringColor(str){
  let s = String(str || "").toLowerCase().trim();
  if(!s) return "#64748b";
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return AUTO_PALETTE[Math.abs(h) % AUTO_PALETTE.length];
}

function getBrandColor(name){
  let raw = String(name || "").trim();
  let low = raw.toLowerCase();
  if (CORE_BRAND_COLORS[low]) return CORE_BRAND_COLORS[low];
  // 插件版本号统一采用品牌紫 (#8b5cf6)，避免散乱的彩虹杂色
  if (/^v?\d+(\.\d+)*(-[a-z0-9.]+)?$/i.test(raw)) return "#8b5cf6";
  let up = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(up) && COUNTRY_META[up]?.color) return COUNTRY_META[up].color;
  return hashStringColor(raw);
}

function formatHumanLabel(name){
  let n = String(name || "").trim();
  if (!n) return "—";
  const dict = {
    // 目标音乐平台
    "qqmusic": "QQ音乐", "netease": "网易云音乐", "kugou": "酷狗音乐", "qishui": "汽水音乐",
    "auto": "全自动识别平台 (Auto)",
    "unknown": "未识别平台 / 非标准输入",
    
    // 终端与渠道
    "desktop": "桌面电脑", "mobile": "移动手机", "tablet": "平板设备",
    "plugin:musicfree": "MusicFree", "musicfree": "MusicFree",
    "official_web": "官方网页端", "anonymous_api": "公共匿名 API",
    "legacy_unknown": "历史未细分流量 (V1时期)", "legacy_mixed": "历史混合渠道 (V1时期)",
    "web": "官方网页端", "plugin": "播放器插件", "api": "公共 API",
    
    // 耗时桶
    "<500ms": "< 500ms (极速响应)", "500-1000ms": "500 - 1000ms (正常)", "500ms_1s": "500ms - 1s (正常)",
    "1-3s": "1 - 3s (一般)", "1s_3s": "1s - 3s (一般)",
    "3-5s": "3 - 5s (迟缓)", "3s_5s": "3s - 5s (迟缓)",
    "5s+": "> 5s (超时边缘)", ">5s": "> 5s (超时边缘)",
    
    // 错误代码
    "UNSUPPORTED_URL": "格式不支持 (UNSUPPORTED_URL)", "INCOMPLETE_PLAYLIST": "部分截断/VIP (INCOMPLETE)",
    "PLAYLIST_NOT_FOUND": "歌单未找到 (NOT_FOUND)", "INVALID_INPUT": "输入参数无效 (INVALID)",
    "PARSE_ERROR": "结构解析错误 (PARSE_ERROR)", "UPSTREAM_TIMEOUT": "上游服务超时 (TIMEOUT)",
    "RATE_LIMITED": "访问频控拦截 (RATE_LIMITED)", "FORBIDDEN": "上游拒绝访问 (FORBIDDEN)",
    
    // 输入与模式
    "web_url": "网页直链 (Web URL)", "mobile_share": "手机分享文案 (Mobile Share)", "raw_id": "纯歌单 ID (Raw ID)",
    "primary": "Primary 主解析链路", "fallback": "Fallback 降级重试",
    "clean_link": "净链模式 (Clean Link)", "markdown": "Markdown 表格", "json": "JSON 数据",

    // 安全风控原因
    "auto_quarantined_bot_ua": "探测爬虫特征隔离 (Bot UA)",
    "crawler_script_abuse_chengdu_api": "高频抓取攻击隔离 (Scraper Script)",
    "auto_quarantined_direct_api": "非标直调频控隔离 (Direct API Flood)"
  };

  let low = n.toLowerCase();
  if (dict[n]) return dict[n];
  if (dict[low]) return dict[low];

  // 严格限制为 2 位 ISO 国际国家代码，防止 unknown/auto 误匹配
  let up = n.toUpperCase();
  if (/^[A-Z]{2}$/.test(up) && COUNTRY_META[up]?.name) return COUNTRY_META[up].name;
  if (PROVINCE_NAMES[n]) return PROVINCE_NAMES[n];

  return n;
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
  drawCanvasChart();
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
  bars("#platformBars",f.platforms);
  bars("#clientBars",f.clients);
  bars("#countryBars",A.geo?.countries,10);
  bars("#regionBars",A.geo?.regions,10);

  // Health check
  let checks=q.checks||[];
  $("#health").className="health "+(q.status==="healthy"?"good":"bad");
  $("#health").textContent=q.status==="healthy"?"● Data Healthy":"● Data Integrity Error";
  $("#quality").innerHTML=checks.map(x=>'<div class="notice '+(x.ok?"":"bad")+'">'+(x.ok?"✓ ":"✕ ")+esc(x.id)+'<br><span class="muted">'+esc(x.note)+(x.ok?"":" · expected "+fmt(x.expected)+" / actual "+fmt(x.actual))+'</span></div>').join("")
    +'<div class="muted" style="margin-top:6px">Latest: '+esc(q.latestDate||"—")+' · Legacy mixed: '+pct(q.legacyMixedShare)+'</div>';

  if(A.availableDateRange){
    snapshotRange=A.availableDateRange;
    ["singleDate","fromDate","toDate"].forEach(id=>{let el=$("#"+id);if(el){el.min=snapshotRange.from||"";el.max=snapshotRange.to||isoDayOffset(0)}});
    if($(".range button[data-range='all']")?.classList.contains('active')||!$("#fromDate")?.value){
      setDateInputs(snapshotRange.from||"",snapshotRange.to||"");
    }
  }

  let actFrom=$("#fromDate")?.value||A.filters?.from||snapshotRange.from||"", actTo=$("#toDate")?.value||A.filters?.to||snapshotRange.to||"";
  let chips=['<span class="chip">'+esc(actFrom===actTo?actFrom:(actFrom+" → "+actTo))+'</span>'];
  ["channel","client","platform","country","region"].forEach(id=>{let v=$("#"+id).value;if(v)chips.push('<span class="chip">'+esc(id)+": "+esc(v)+'</span>')});
  $("#chips").innerHTML=chips.join("");

  let badge=$("#navPendingBadge");
  if(badge){
    let pending=Number(o.pending_feedback||0);
    if(pending>0){badge.style.display="inline-block";badge.textContent=pending}
    else{badge.style.display="none"}
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
  options("channel",f.channels);
  options("client",f.clients);
  options("platform",f.platforms);
  options("country",f.countries);
  options("region",f.regions);

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
  let loadTimer=setTimeout(()=>{
    if(seq===loadSeq){
      $("#health").className="health";$("#health").textContent="● Loading";
    }
  },120);
  try{
    $("#error").innerHTML="";
    let data=await api("/api/analytics?"+key,{signal:controller.signal});
    clearTimeout(loadTimer);
    if(seq!==loadSeq)return;
    A=data;cacheSet(key,data);render();
    quarantineLoaded=false;feedbackLoaded=false;
    if($("#page-security")?.classList.contains("active"))quarantine();
    if($("#page-feedback")?.classList.contains("active"))feedback(currentFbStatus);
  }catch(e){
    clearTimeout(loadTimer);
    if(e?.name==="AbortError"||seq!==loadSeq)return;
    $("#health").className="health bad";$("#health").textContent="● Load Failed";
    $("#error").innerHTML='<div class="notice bad">'+esc(e.message)+'</div>';
  }finally{
    clearTimeout(loadTimer);
    if(seq===loadSeq)loadController=null;
  }
}

let quarantineLoaded=false,feedbackLoaded=false;

let currentQuarantineRows = [];
async function quarantine(){
  try{
    let qp=new URLSearchParams(dates());qp.set("limit","100");qp.set("exclude_my",excludeMy?"1":"0");
    let d=await api("/api/quarantine?"+qp.toString()),rows=d.quarantine||[],m=new Map();
    currentQuarantineRows = rows;
    let totalBadge = $("#quarantineCountBadge");
    if(totalBadge) totalBadge.textContent = (d.totalRecords || rows.length) + " 条隔离记录";

    rows.forEach(x=>m.set(x.reason||"unknown",(m.get(x.reason||"unknown")||0)+Number(x.count||0)));
    bars("#quarantineSummary",Array.from(m,([name,count])=>({name,count})));

    $("#quarantineRows").innerHTML = rows.map((x, idx) => {
      let timeStr = esc(String(x.quarantined_at || x.incident_date || "").replace("T", " ").slice(0, 19));
      let reasonCode = String(x.reason || "unknown");
      let reasonHtml = "";
      if (reasonCode === "auto_quarantined_bot_ua") {
        reasonHtml = '<div style="display:flex;flex-direction:column;gap:2px">'
          + '<span class="badge" style="background:color-mix(in srgb,var(--r) 15%,var(--p));color:var(--r);border:1px solid color-mix(in srgb,var(--r) 30%,transparent)">🛑 自动化爬虫 (Bot UA)</span>'
          + '<span class="muted" style="font-size:10.5px">检测到爬虫签名 · 隔离出核心大盘</span>'
          + '</div>';
      } else if (reasonCode.includes("crawler_script_abuse")) {
        reasonHtml = '<div style="display:flex;flex-direction:column;gap:2px">'
          + '<span class="badge" style="background:color-mix(in srgb,var(--r) 15%,var(--p));color:var(--r);border:1px solid color-mix(in srgb,var(--r) 30%,transparent)">🚨 批量抓取攻击 (Abuse)</span>'
          + '<span class="muted" style="font-size:10.5px">单源高频脚本爬取 · 隔离存证</span>'
          + '</div>';
      } else if (reasonCode.includes("direct_api")) {
        reasonHtml = '<div style="display:flex;flex-direction:column;gap:2px">'
          + '<span class="badge" style="background:color-mix(in srgb,var(--w) 15%,var(--p));color:var(--w);border:1px solid color-mix(in srgb,var(--w) 30%,transparent)">⚠️ 匿名直调频控 (Direct API)</span>'
          + '<span class="muted" style="font-size:10.5px">无 Web 会话凭据 · 频控触发</span>'
          + '</div>';
      } else if (reasonCode === "rate_limited") {
        reasonHtml = '<div style="display:flex;flex-direction:column;gap:2px">'
          + '<span class="badge" style="background:color-mix(in srgb,var(--w) 15%,var(--p));color:var(--w);border:1px solid color-mix(in srgb,var(--w) 30%,transparent)">⏳ 429 访问频控 (Rate Limit)</span>'
          + '<span class="muted" style="font-size:10.5px">> 6次/分 · 返回 HTTP 429</span>'
          + '</div>';
      } else {
        reasonHtml = '<span class="badge" style="background:var(--l)">' + esc(reasonCode) + '</span>';
      }

      let geoParts = [];
      if (x.country && x.country !== "UNKNOWN") geoParts.push(formatHumanLabel(x.country));
      if (x.region && x.region !== "UNKNOWN") geoParts.push(formatHumanLabel(x.region));
      if (x.city && x.city !== "UNKNOWN") geoParts.push(esc(x.city));
      let geoStr = geoParts.length ? geoParts.join(" · ") : "未知来源地域";

      let clientSig = x.client_info || "automated / script";
      if (clientSig === "automated") clientSig = "自动化爬虫工具 (Bot)";

      let plat = formatHumanLabel(x.platform || "unknown");
      let metric = x.metric_or_dimension || "resolve_request";

      return '<tr>'
        + '<td class="muted" style="font-size:11px;font-family:var(--mono)">' + timeStr + '</td>'
        + '<td>' + reasonHtml + '</td>'
        + '<td style="font-size:11px;color:var(--t)"><span title="' + esc(geoStr) + '">' + esc(geoStr) + '</span></td>'
        + '<td><span class="badge" style="background:var(--l);font-family:var(--mono)">' + esc(clientSig) + '</span></td>'
        + '<td><span style="font-weight:600;color:' + getBrandColor(x.platform) + '">' + esc(plat) + '</span><br><span class="muted" style="font-size:10.5px">' + esc(metric) + '</span></td>'
        + '<td style="text-align:center"><div style="font-weight:700;font-family:var(--mono)">' + fmt(x.count) + ' 次</div><span class="muted" style="font-size:10px">限 6次/分 · 429</span></td>'
        + '<td style="text-align:right"><button class="btn-sm forensic-view-btn" data-idx="' + idx + '">取证报文</button></td>'
        + '</tr>';
    }).join("") || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--m)">暂无隔离记录</td></tr>';

    $$(".forensic-view-btn").forEach(b => b.onclick = () => {
      let idx = parseInt(b.dataset.idx, 10);
      let item = currentQuarantineRows[idx];
      if (!item) return;
      let modal = $("#forensicModal");
      let content = $("#forensicContent");
      if (modal && content) {
        let displayObj = {
          id: item.id,
          batch_id: item.batch_id,
          incident_date: item.incident_date,
          quarantined_at: item.quarantined_at,
          reason: item.reason,
          source_table: item.source_table,
          platform: item.platform,
          metric_or_dimension: item.metric_or_dimension,
          country: item.country,
          region: item.region,
          city: item.city,
          client_info: item.client_info,
          count: item.count,
          details: null
        };
        try {
          if (item.details_json) displayObj.details = JSON.parse(item.details_json);
        } catch(e) {
          displayObj.details = item.details_json;
        }
        content.textContent = JSON.stringify(displayObj, null, 2);
        modal.style.display = "flex";
      }
    });

    quarantineLoaded=true;
  }catch(e){
    $("#quarantineRows").innerHTML='<tr><td colspan="7" style="color:var(--r);padding:14px">'+esc(e.message)+'</td></tr>';
  }
}

async function feedbackCountCheck(){
  try{
    let d=await api("/api/feedback?status=pending&limit=1&exclude_my="+(excludeMy?"1":"0"));
    let pending=d.counts?.pending??d.total??0;
    let badge=$("#navPendingBadge");
    if(badge){
      if(pending>0){badge.style.display="inline-block";badge.textContent=pending}
      else{badge.style.display="none"}
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
    let url="/api/feedback?limit=100"+(status==="all"?"":"&status="+encodeURIComponent(status))+"&exclude_my="+(excludeMy?"1":"0");
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

      let geoParts = [];
      if (x.country && x.country !== "UNKNOWN") geoParts.push(formatHumanLabel(x.country));
      if (x.region && x.region !== "UNKNOWN") geoParts.push(formatHumanLabel(x.region));
      if (x.city && x.city !== "UNKNOWN") geoParts.push(esc(x.city));
      let geoStr = geoParts.length ? geoParts.join(" · ") : "—";

      return '<tr>'
        + '<td style="font-family:var(--mono)">#'+esc(x.id)+'</td>'
        + '<td><span style="font-weight:600;color:'+getBrandColor(x.platform)+'">'+esc(formatHumanLabel(x.platform||"unknown"))+'</span></td>'
        + '<td>'+urlHtml+'</td>'
        + '<td><span class="badge" style="background:var(--l);font-family:var(--mono)">'+esc(x.error_code||"—")+'</span></td>'
        + '<td style="font-size:11px;color:var(--m)"><span title="'+esc(geoStr)+'">'+esc(geoStr)+'</span></td>'
        + '<td style="text-align:center;font-weight:700;font-family:var(--mono)">'+fmt(x.report_count)+'</td>'
        + '<td class="muted" style="font-size:11px">'+esc(String(x.last_reported_at||x.first_reported_at||"").replace("T"," ").slice(0,19))+'</td>'
        + '<td><span class="badge '+stCls+'">'+stTxt+'</span></td>'
        + '<td style="text-align:right">'+actions+'</td>'
        + '</tr>';
    }).join("")||'<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--m)">当前分类无反馈记录</td></tr>';

    $$('#feedbackRows .status-btn').forEach(b=>b.onclick=async()=>{
      b.disabled=true;
      let orig=b.textContent;
      b.textContent="处理中…";
      try{
        await api('/api/feedback?id='+encodeURIComponent(b.dataset.id)+'&status='+encodeURIComponent(b.dataset.status),{method:'PUT'});
        feedbackLoaded=false;
        await feedback(currentFbStatus);
      }catch(e){
        b.disabled=false;
        b.textContent=orig;
        alert('更新失败：'+e.message);
      }
    });

    $$('#feedbackRows .cp-btn').forEach(b=>b.onclick=()=>{
      navigator.clipboard.writeText(b.dataset.url).then(()=>{
        let o=b.textContent;b.textContent="已复制";setTimeout(()=>b.textContent=o,1200);
      });
    });
    feedbackLoaded=true;
  }catch(e){
    $("#feedbackRows").innerHTML='<tr><td colspan="8">'+esc(e.message)+'</td></tr>';
  }
}

$$(".tab").forEach(b=>b.onclick=()=>{
  if(b.classList.contains("active"))return;
  $$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  $$(".page").forEach(x=>x.classList.remove("active"));
  let p=$("#page-"+b.dataset.page);
  if(p)p.classList.add("active");
  if(window.scrollY>150){
    window.scrollTo({top:0,behavior:"instant"});
  }
  if(b.dataset.page==="security"&&!quarantineLoaded)quarantine();
  if(b.dataset.page==="feedback"&&!feedbackLoaded)feedback(currentFbStatus);
  if(b.dataset.page==="overview")requestAnimationFrame(drawCanvasChart);
});

$$(".fb-tab").forEach(b=>b.onclick=()=>{
  feedback(b.dataset.fbStatus);
});

let sw=$("#switchExcludeMy");
if(sw)sw.onchange=(e)=>{
  excludeMy=e.target.checked;
  if(excludeMy && $("#country").value==="MY")$("#country").value="";
  analyticsCache.clear();
  quarantineLoaded=false;
  feedbackLoaded=false;
  load({force:true});
};

$$(".range button").forEach(b=>b.onclick=()=>setPreset(b.dataset.range));
["channel","client","platform","country","region"].forEach(id=>{
  let el=$("#"+id);
  if(el)el.onchange=()=>{
    if(id==="country")$("#region").value="";
    load();
  };
});
$("#applySingleDate").onclick=()=>{let d=$("#singleDate").value;if(!d)return;setDateInputs(d,d);markPreset("");load()};
$("#singleDate").onchange=()=>{let d=$("#singleDate").value;if(!d)return;setDateInputs(d,d);markPreset("");load()};
$("#applyDateRange").onclick=()=>{dates();markPreset("");load()};
["fromDate","toDate"].forEach(id=>$("#"+id).onkeydown=e=>{if(e.key==="Enter"){$("#applyDateRange").click()}});
$("#reset").onclick=()=>{
  ["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id);if(el)el.value=""});
  excludeMy=true;
  updateExcludeMyUI();
  setPreset("all");
};
$("#refreshData").onclick=async()=>{
  let b=$("#refreshData");
  if(b.disabled)return;
  b.disabled=true;b.textContent="刷新中…";
  try{
    await api("/api/refresh",{method:"POST"});
    analyticsCache.clear();quarantineLoaded=false;feedbackLoaded=false;
    await load({force:true});
  }catch(e){
    $("#error").innerHTML='<div class="notice bad">刷新失败：'+esc(e.message)+'</div>';
  }finally{
    b.disabled=false;b.textContent="刷新云端数据";
  }
};
$("#reloadFeedback").onclick=()=>{feedbackLoaded=false;feedback(currentFbStatus)};

let closeFModal=$("#closeForensicModal");
if(closeFModal)closeFModal.onclick=()=>{$("#forensicModal").style.display="none"};
let fModal=$("#forensicModal");
if(fModal)fModal.onclick=e=>{if(e.target===fModal)fModal.style.display="none"};

markPreset("all");
updateExcludeMyUI();
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
                self.query(QUARANTINE_PARAMS),
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
        elif path in {"/logo.png", "/logo-64.png", "/favicon.ico", "/favicon.svg"}:
            repo_root = Path(__file__).resolve().parents[2]
            name = path.lstrip("/")
            target = repo_root / "web" / "public" / name
            if not target.exists():
                target = repo_root / "web" / "public" / ("logo-64.png" if name.endswith(".png") else "favicon.svg")
            if target.exists():
                ctype = "image/png" if target.suffix == ".png" else ("image/svg+xml" if target.suffix == ".svg" else "image/x-icon")
                self.send_bytes(200, target.read_bytes(), ctype)
                return
            self.send_json(404, {"error": "not_found"})
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
    try:
        server = ThreadingHTTPServer((args.host, args.port), Handler)
    except OSError as exc:
        print(f"\n[Dashboard 错误] 端口 {args.port} 绑定失败（{exc}）。")
        print(f"[Dashboard 提示] 本地已有旧的看板实例在运行，请先关闭之前的命令行窗口，或使用 --port 指定新端口。\n")
        sys.exit(1)
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
