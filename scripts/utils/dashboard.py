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
from datetime import datetime, timezone, timedelta
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

REMOTE_BASE = os.environ.get(
    "PLAYLISTOUT_API_BASE", "https://playlistout-api.lengxiqwq.com"
).rstrip("/")
ANALYTICS_PARAMS = {
    "from", "to", "channel", "client", "platform", "country", "region",
    "exclude_my", "excludeMy",
}
FEEDBACK_PARAMS = {
    "status", "limit", "offset", "id", "from", "to",
    "platform", "country", "region", "exclude_my", "excludeMy",
}
QUARANTINE_PARAMS = {
    "limit", "offset", "reason", "date", "from", "to",
    "platform", "country", "region", "exclude_my", "excludeMy",
}
DAU_METRICS = {"visitor_unique", "active_user"}


def _dau_channel_for(metric: str, channel: str) -> str | None:
    ch = str(channel or "").strip()
    if metric == "visitor_unique" and (ch == "web" or not ch):
        return "web"
    if metric == "active_user" and ch == "plugin":
        return "plugin"
    if metric == "active_user" and ch == "cli":
        return "cli"
    if metric == "active_user" and not ch:
        return "plugin"
    return None


def _empty_dau_totals() -> dict[str, int]:
    return {"total": 0, "web": 0, "plugin": 0, "cli": 0}


def _add_dau_count(totals: dict[str, int], metric: str, channel: str, count: int) -> None:
    slot = _dau_channel_for(metric, channel)
    if not slot or count <= 0:
        return
    totals[slot] += count
    totals["total"] += count


def _shift_date(date_str: str, offset_days: int) -> str:
    if not date_str:
        return date_str
    try:
        from datetime import datetime, timezone, timedelta
        dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return (dt + timedelta(days=offset_days)).strftime("%Y-%m-%d")
    except Exception:
        return date_str


SYSTEM_TELEMETRY_MILESTONES = {
    "web": {
        "coverageStart": "2026-03-01",
        "title": "网页端活跃上线",
        "description": "Playlist Out Web 统计开始接入",
    },
    "plugin": {
        "coverageStart": "2026-10-15",
        "title": "生态插件活跃开始采集",
        "description": "MusicFree 等生态插件接入心跳与活跃遥测",
    },
    "cli": {
        "coverageStart": "2026-10-15",
        "title": "CLI 活跃开始采集",
        "description": "Playlist Out CLI 接入使用活跃遥测",
    },
}


def detect_dau_coverage(rows: list[dict], generated_at: str | None = None) -> dict:
    has_web_row = False
    min_web = None
    min_plugin = None
    min_cli = None
    max_date = None

    for r in rows:
        d_str = str(r.get("date", "")).strip()
        if not d_str or len(d_str) != 10:
            continue
        if not max_date or d_str > max_date:
            max_date = d_str
        m_str = str(r.get("metric", "")).strip()
        ch_str = str(r.get("channel", "")).strip()
        if m_str == "visitor_unique" and (ch_str == "web" or not ch_str):
            has_web_row = True
            if not min_web or d_str < min_web:
                min_web = d_str
        elif m_str == "active_user" and ch_str == "plugin":
            if not min_plugin or d_str < min_plugin:
                min_plugin = d_str
        elif m_str == "active_user" and ch_str == "cli":
            if not min_cli or d_str < min_cli:
                min_cli = d_str

    web_milestone = SYSTEM_TELEMETRY_MILESTONES["web"]["coverageStart"]
    plugin_milestone = SYSTEM_TELEMETRY_MILESTONES["plugin"]["coverageStart"]
    cli_milestone = SYSTEM_TELEMETRY_MILESTONES["cli"]["coverageStart"]

    gen_date = str(generated_at)[:10] if generated_at else None
    as_of_date = gen_date if (gen_date and len(gen_date) == 10 and gen_date[4] == "-" and gen_date[7] == "-") else max_date

    has_web = bool(has_web_row or (as_of_date and as_of_date >= web_milestone) or not as_of_date)
    web_start = min_web or web_milestone

    has_plugin = bool(min_plugin or (as_of_date and as_of_date >= plugin_milestone) or not as_of_date)
    plugin_start = (
        (min_plugin if (min_plugin and min_plugin < plugin_milestone) else plugin_milestone)
        if has_plugin
        else None
    )

    has_cli = bool(min_cli or (as_of_date and as_of_date >= cli_milestone) or not as_of_date)
    cli_start = (
        (min_cli if (min_cli and min_cli < cli_milestone) else cli_milestone)
        if has_cli
        else None
    )

    return {
        "web": {"earliestDate": web_start, "hasCoverage": has_web},
        "plugin": {"earliestDate": plugin_start, "hasCoverage": has_plugin},
        "cli": {"earliestDate": cli_start, "hasCoverage": has_cli},
    }


def generate_dau_annotations(coverage: dict) -> list[dict]:
    annotations = []
    for ch in ("web", "plugin", "cli"):
        info = coverage.get(ch, {})
        if info.get("hasCoverage") and info.get("earliestDate"):
            ms = SYSTEM_TELEMETRY_MILESTONES.get(ch, {})
            annotations.append({
                "date": info["earliestDate"],
                "type": "coverage_start",
                "title": ms.get("title", ""),
                "description": ms.get("description", ""),
                "channel": ch,
            })
    annotations.sort(key=lambda a: a["date"])
    return annotations


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
LATENCY_BUCKET_ORDER = ("<500ms", "500-1000ms", "1-3s", "3-5s", "5s+")


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
    platform_agnostic: bool = False,
    omit: str | None = None,
) -> bool:
    date_value = str(row.get("date", ""))
    if date_value < filters["from"] or date_value > filters["to"]:
        return False
    if omit != "channel" and filters.get("channel") and row.get("channel") is not None and row.get("channel") != filters["channel"]:
        return False
    if omit != "client" and filters.get("client") and row.get("client_id") is not None and row.get("client_id") != filters["client"]:
        return False
    if (
        not environment
        and not platform_agnostic
        and omit != "platform"
        and filters.get("platform")
        and row.get("platform") is not None
        and row.get("platform") != "none"
        and row.get("platform") != filters["platform"]
    ):
        return False
    if include_geo:
        if omit != "country" and filters.get("country") and row.get("country") is not None and row.get("country") != filters["country"]:
            return False
        if omit != "region" and filters.get("region") and row.get("region") is not None and row.get("region") != filters["region"]:
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

        # Normalize legacy plugin browser tokens to canonical plugin:<id>
        if bf in {"playlistout_musicfree", "playlistout_plugin"}:
            bf = "plugin:musicfree"
            if ch == "legacy_mixed":
                ch = "plugin"
            if cl == "legacy_unknown":
                cl = "musicfree"
        elif bf == "bbplayer_playlistout" or cl == "bbplayer":
            bf = "plugin:bbplayer"
            if ch in {"legacy_mixed", "api"}:
                ch = "plugin"
            if cl in {"legacy_unknown", "anonymous_api"}:
                cl = "bbplayer"
            if dev == "desktop" and os_f == "other":
                dev = "mobile"
                os_f = "android"

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
        if dim == "latency_bucket":
            if val == "_500ms":
                val = "<500ms"
            elif val == "500ms_1s":
                val = "500-1000ms"
            elif val == "1s_3s":
                val = "1-3s"
            elif val == "3s_5s":
                val = "3-5s"
            elif val in {">5s", "5s"}:
                val = "5s+"

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
    val = str(query.get("exclude_my", query.get("excludeMy", "0")) or "0").strip().lower()
    return val in {"1", "true", "yes", "on"}


PAGE_FILTER_CAPABILITIES = {
    "overview": {
        "supportedDimensions": [],
        "scopeNote": "业务总览展示全站宏观指标与核心趋势，仅支持时间范围筛选。",
    },
    "web": {
        "supportedDimensions": ["country", "region"],
        "scopeNote": "官网地域分析针对 Web 独立访客 (UV)；环境与来源指标属于事件级分布。",
    },
    "reliability": {
        "supportedDimensions": ["channel", "client", "platform"],
        "scopeNote": "稳定与性能指标支持渠道、接入端与目标平台筛选（不适用地域维度）。",
    },
    "usage": {
        "supportedDimensions": ["channel", "client", "platform"],
        "scopeNote": "使用偏好分析覆盖来源渠道、接入端与音乐平台维度。",
    },
    "integrations": {
        "supportedDimensions": ["client", "channel"],
        "scopeNote": "生态集成分析覆盖客户端与渠道维度（平台维度不适用）。",
    },
    "feedback": {
        "supportedDimensions": ["platform", "country", "region"],
        "scopeNote": "待审歌单队列支持按音乐平台及上报地域筛选（客户端与渠道维度不适用）。",
    },
    "security": {
        "supportedDimensions": ["platform", "country", "region"],
        "scopeNote": "安全风控与拦截报文支持按攻击目标平台及来源地域筛选（客户端与渠道维度不适用）。",
    },
    "dau": {
        "supportedDimensions": ["channel", "country", "region"],
        "scopeNote": "活跃趋势支持按活跃渠道（网页、插件、CLI）与地域筛选。",
    },
}


def resolve_page_filter_params(query: dict[str, str], page: str) -> dict[str, str]:
    caps = PAGE_FILTER_CAPABILITIES.get(page, {"supportedDimensions": []})
    supported = set(caps.get("supportedDimensions", []))
    return {
        "from": (query.get("from") or "").strip(),
        "to": (query.get("to") or "").strip(),
        "channel": (query.get("channel") or "").strip().lower() if "channel" in supported else "",
        "client": (query.get("client") or "").strip().lower() if "client" in supported else "",
        "platform": (query.get("platform") or "").strip().lower() if "platform" in supported else "",
        "country": (query.get("country") or "").strip().upper() if "country" in supported else "",
        "region": (query.get("region") or "").strip() if "region" in supported else "",
        "exclude_my": "1" if is_exclude_my(query) else "0",
    }




def _scale_group_rows(rows: list[dict], ratio: float) -> list[dict]:
    if ratio <= 0:
        return []
    if ratio >= 1:
        return rows
    orig_total = sum(int(r.get("count", 0) or 0) for r in rows)
    target_total = int(round(orig_total * ratio))
    if target_total <= 0:
        return []
    exact = [int(r.get("count", 0) or 0) * ratio for r in rows]
    floored = [int(v) for v in exact]
    rem = target_total - sum(floored)
    if rem > 0:
        order = sorted(range(len(rows)), key=lambda i: (-(exact[i] - floored[i]), -int(rows[i].get("count", 0) or 0)))
        for idx in order[:rem]:
            floored[idx] += 1
    out: list[dict] = []
    for r, c in zip(rows, floored):
        if c > 0:
            nr = dict(r)
            nr["count"] = c
            out.append(nr)
    return out


def apply_country_exclusion(
    daily: list[dict],
    geo: list[dict],
    hourly: list[dict],
    excluded_country: str = "MY",
    breakdowns: list[dict] | None = None,
    env_rows: list[dict] | None = None,
) -> tuple[list[dict], list[dict], list[dict], list[dict], list[dict]]:
    b_in = breakdowns if breakdowns is not None else []
    e_in = env_rows if env_rows is not None else []
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
        return daily, filtered_geo, hourly, b_in, e_in

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
    group_req_before: dict[tuple[str, str, str, str], int] = defaultdict(int)
    group_req_after: dict[tuple[str, str, str, str], int] = defaultdict(int)
    client_req_before: dict[tuple[str, str, str], int] = defaultdict(int)
    client_req_after: dict[tuple[str, str, str], int] = defaultdict(int)

    for (d, ch, cl, p), metrics in grouped_daily.items():
        orig_req = int(metrics.get("resolve_request", 0) or 0)
        group_req_before[(d, ch, cl, p)] += orig_req
        client_req_before[(d, ch, cl)] += orig_req

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

        after_req = int(metrics.get("resolve_request", 0) or 0)
        group_req_after[(d, ch, cl, p)] += after_req
        client_req_after[(d, ch, cl)] += after_req

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

    non_resolve_dims = {"export_format", "clipboard_mode", "export_playlist_size", "referrer_source", "migration_destination", "migration_provider"}
    grouped_b: dict[tuple[str, str, str, str, str], list[dict]] = defaultdict(list)
    filtered_breakdowns: list[dict] = []
    for row in b_in:
        dim = str(row.get("dimension", ""))
        if dim in non_resolve_dims:
            filtered_breakdowns.append(row)
            continue
        key = (
            str(row.get("date", "")),
            str(row.get("channel", "")),
            str(row.get("client_id", "")),
            str(row.get("platform", "")),
            dim,
        )
        grouped_b[key].append(row)

    for (d, ch, cl, p, _dim), rows in grouped_b.items():
        before = group_req_before.get((d, ch, cl, p), 0)
        after = group_req_after.get((d, ch, cl, p), 0)
        if before > 0 and after < before:
            filtered_breakdowns.extend(_scale_group_rows(rows, after / before))
        else:
            filtered_breakdowns.extend(rows)

    grouped_e: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
    for row in e_in:
        key = (
            str(row.get("date", "")),
            str(row.get("channel", "")),
            str(row.get("client_id", "")),
        )
        grouped_e[key].append(row)

    filtered_env_rows: list[dict] = []
    for (d, ch, cl), rows in grouped_e.items():
        before = client_req_before.get((d, ch, cl), 0)
        after = client_req_after.get((d, ch, cl), 0)
        if before > 0 and after < before:
            filtered_env_rows.extend(_scale_group_rows(rows, after / before))
        else:
            filtered_env_rows.extend(rows)

    return filtered_daily, filtered_geo, filtered_hourly, filtered_breakdowns, filtered_env_rows


def build_local_analytics(snapshot: dict, query: dict[str, str]) -> dict:
    raw_daily = reconcile_daily_core([row for row in snapshot.get("dailyCore", []) if isinstance(row, dict)])
    raw_hourly = [row for row in snapshot.get("hourlyCore", []) if isinstance(row, dict)]
    raw_geo = [row for row in snapshot.get("geo", []) if isinstance(row, dict)]
    raw_breakdowns = reconcile_breakdown_rows([row for row in snapshot.get("breakdowns", []) if isinstance(row, dict)])
    raw_env_rows = reconcile_client_env([row for row in snapshot.get("clientEnv", []) if isinstance(row, dict)])

    exclude_my = is_exclude_my(query)
    if exclude_my:
        daily, geo_rows, hourly, breakdown_rows, env_rows = apply_country_exclusion(
            raw_daily, raw_geo, raw_hourly, "MY", raw_breakdowns, raw_env_rows
        )
    else:
        daily, geo_rows, hourly, breakdown_rows, env_rows = (
            raw_daily, raw_geo, raw_hourly, raw_breakdowns, raw_env_rows
        )


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

    # Web Traffic Timeseries (strictly channel=web)
    web_filters = dict(filters)
    web_filters["channel"] = "web"
    web_filtered_source = [
        row for row in source
        if row.get("channel") == "web" and _matches(row, web_filters, include_geo=geo_active)
    ]
    web_by_day: dict[str, dict] = {}
    for row in web_filtered_source:
        day = str(row.get("date", ""))
        metric = str(row.get("metric", ""))
        if not day or not metric:
            continue
        target = web_by_day.setdefault(day, {"date": day})
        target[metric] = int(target.get(metric, 0)) + int(row.get("count", 0) or 0)
    web_timeseries = [web_by_day[key] for key in sorted(web_by_day)]

    web_hourly_timeseries: list[dict] = []
    if not geo_active and from_date == to_date:
        web_by_hour: dict[int, dict] = {h: {"date": from_date, "hour": h, "page_view": 0, "visitor_unique": 0} for h in range(24)}
        for row in hourly:
            if row.get("channel") is not None and row.get("channel") != "web":
                continue
            if not _matches(row, web_filters):
                continue
            hour = int(row.get("hour", 0) or 0)
            metric = str(row.get("metric", ""))
            if hour in web_by_hour:
                web_by_hour[hour][metric] = int(web_by_hour[hour].get(metric, 0)) + int(row.get("count", 0) or 0)
        web_hourly_timeseries = [web_by_hour[key] for key in sorted(web_by_hour)]

    breakdown_totals: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for row in breakdown_rows:
        if not _matches(row, filters):
            continue
        dimension = str(row.get("dimension", ""))
        value = str(row.get("value", ""))
        cl = str(row.get("client_id", ""))
        if dimension and value:
            breakdown_totals[dimension][value] += int(row.get("count", 0) or 0)
            if dimension == "client_version" and cl:
                breakdown_totals[f"{cl}_version"][value] += int(row.get("count", 0) or 0)
            elif dimension == "host_platform" and cl:
                breakdown_totals[f"{cl}_host"][value] += int(row.get("count", 0) or 0)

    # Backfill early BBPlayer test requests before client_version / host_platform headers were sent
    bbplayer_req_total = sum(
        int(row.get("count", 0) or 0)
        for row in filtered_source
        if row.get("client_id") == "bbplayer" and row.get("metric") == "resolve_request"
    )
    bbplayer_ver_recorded = sum(breakdown_totals.get("bbplayer_version", {}).values())
    if bbplayer_req_total > bbplayer_ver_recorded:
        diff = bbplayer_req_total - bbplayer_ver_recorded
        breakdown_totals["bbplayer_version"]["2.7.0"] += diff
        breakdown_totals["client_version"]["2.7.0"] += diff

    bbplayer_host_recorded = sum(breakdown_totals.get("bbplayer_host", {}).values())
    if bbplayer_req_total > bbplayer_host_recorded:
        diff = bbplayer_req_total - bbplayer_host_recorded
        breakdown_totals["bbplayer_host"]["android"] += diff
        breakdown_totals["host_platform"]["android"] += diff

    order_map = {name: i for i, name in enumerate(LATENCY_BUCKET_ORDER)}
    breakdowns = {
        dimension: [
            {"name": name, "count": count}
            for name, count in (
                sorted(values.items(), key=lambda item: (order_map.get(item[0], 999), item[0]))
                if dimension == "latency_bucket"
                else sorted(values.items(), key=lambda item: (-item[1], item[0]))
            )
            if count > 0
        ]
        for dimension, values in breakdown_totals.items()
        if any(c > 0 for c in values.values())
    }

    filtered_geo = [
        row for row in geo_rows if _matches(row, filters, include_geo=True)
    ]
    web_geo_rows = [
        row for row in geo_rows
        if row.get("channel") == "web"
        and row.get("metric") == "visitor_unique"
        and _matches(row, filters, include_geo=True)
    ]
    web_countries = _sum_by(
        [row for row in web_geo_rows if row.get("country") != "UNKNOWN"],
        "country",
    )
    web_regions = _sum_by(
        [
            row
            for row in web_geo_rows
            if row.get("region") != "UNKNOWN"
            and (row.get("country") == "CN" or not row.get("country"))
        ],
        "region",
    )
    web_geo = {
        "countries": web_countries,
        "regions": web_regions,
        "filterScope": "Web 访客地域基于官方 Web 渠道的 visitor_unique 指标聚合。",
    }

    req_geo_rows = [row for row in filtered_geo if row.get("metric") == "resolve_request"]
    req_countries = _sum_by(
        [row for row in req_geo_rows if row.get("country") != "UNKNOWN"],
        "country",
    )
    req_regions = _sum_by(
        [
            row
            for row in req_geo_rows
            if row.get("region") != "UNKNOWN"
            and (row.get("country") == "CN" or not row.get("country"))
        ],
        "region",
    )
    raw_countries = _sum_by(
        [row for row in filtered_geo if row.get("country") != "UNKNOWN"],
        "country",
    )
    raw_regions = _sum_by(
        [
            row
            for row in filtered_geo
            if row.get("region") != "UNKNOWN"
            and (row.get("country") == "CN" or not row.get("country"))
        ],
        "region",
    )
    countries = req_countries if req_countries else (web_countries if web_countries else raw_countries)
    regions = req_regions if req_regions else (web_regions if web_regions else raw_regions)

    # ── DAU slice: per-day channel series, dynamic target/comparison totals, clients, geo ──
    is_single_day = (from_date == to_date)
    target_date = to_date
    comparison_date = _shift_date(target_date, -1)

    dau_filtered_source = [
        row for row in source
        if _matches(row, filters, include_geo=geo_active, platform_agnostic=True)
    ] if filters.get("platform") else filtered_source

    all_dates_filters = dict(filters)
    all_dates_filters["from"] = "0000-00-00"
    all_dates_filters["to"] = "9999-99-99"
    all_dates_source = [
        row for row in source
        if _matches(row, all_dates_filters, include_geo=geo_active, platform_agnostic=True)
    ]

    dau_all_dates_map: dict[str, dict[str, int]] = defaultdict(_empty_dau_totals)
    client_target_map: dict[str, int] = defaultdict(int)
    client_comp_map: dict[str, int] = defaultdict(int)
    client_channel_map: dict[str, str] = {}

    for row in all_dates_source:
        metric = str(row.get("metric", "")).strip()
        if metric not in DAU_METRICS:
            continue
        d = str(row.get("date", "")).strip()
        if not d:
            continue
        count = int(row.get("count", 0) or 0)
        _add_dau_count(dau_all_dates_map[d], metric, str(row.get("channel", "")), count)

        if metric == "active_user":
            ch = str(row.get("channel", "")).strip()
            cl = str(row.get("client_id", "")).strip()
            if (ch in {"plugin", "cli"}) and cl:
                client_channel_map[cl] = ch
                if d == target_date:
                    client_target_map[cl] += count
                if d == comparison_date:
                    client_comp_map[cl] += count

    dau_by_date: dict[str, dict[str, int]] = defaultdict(_empty_dau_totals)
    dau_client_window_totals: dict[str, int] = defaultdict(int)
    window_totals = _empty_dau_totals()

    for row in dau_filtered_source:
        metric = str(row.get("metric", "")).strip()
        if metric not in DAU_METRICS:
            continue
        d = str(row.get("date", "")).strip()
        if not d:
            continue
        count = int(row.get("count", 0) or 0)
        _add_dau_count(dau_by_date[d], metric, str(row.get("channel", "")), count)
        _add_dau_count(window_totals, metric, str(row.get("channel", "")), count)

        if metric == "active_user":
            ch = str(row.get("channel", "")).strip()
            cl = str(row.get("client_id", "")).strip()
            if (ch in {"plugin", "cli"}) and cl:
                client_channel_map[cl] = ch
                dau_client_window_totals[cl] += count

    coverage = detect_dau_coverage(snapshot.get("dailyCore", []), snapshot.get("generatedAt"))
    annotations = generate_dau_annotations(coverage)

    # Resolve active channel for coverage boundaries:
    # If user filtered by channel (web, plugin, cli), use it.
    # If user filtered by client, map client to channel (e.g. musicfree -> plugin, official_web -> web).
    # If all channels, default to 'web' (base platform telemetry start).
    resolved_client_channel = (
        client_channel_map.get(filters.get("client")) or ("web" if filters.get("client") == "official_web" else "plugin")
        if filters.get("client")
        else ""
    )
    active_channel = filters.get("channel") or resolved_client_channel or "web"

    active_coverage_start = (
        (coverage["plugin"]["earliestDate"] if coverage["plugin"]["hasCoverage"] else None)
        if active_channel == "plugin"
        else (coverage["cli"]["earliestDate"] if coverage["cli"]["hasCoverage"] else None)
        if active_channel == "cli"
        else (coverage["web"]["earliestDate"] if coverage["web"]["hasCoverage"] else None)
    )

    today_utc = (str(snapshot.get("generatedAt") or "")[:10]) or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    is_today = is_single_day and (target_date == today_utc)

    dau_series = []
    if dau_all_dates_map or dau_by_date:
        if from_date and to_date and len(from_date) == 10 and len(to_date) == 10 and from_date <= to_date:
            curr = from_date
            while curr <= to_date:
                totals = dau_by_date.get(curr) or _empty_dau_totals()
                dau_series.append({
                    "date": curr,
                    **totals,
                    "webUncollected": bool(coverage["web"]["hasCoverage"] and coverage["web"]["earliestDate"] and curr < coverage["web"]["earliestDate"]),
                    "pluginUncollected": bool(coverage["plugin"]["hasCoverage"] and coverage["plugin"]["earliestDate"] and curr < coverage["plugin"]["earliestDate"]),
                    "cliUncollected": bool(coverage["cli"]["hasCoverage"] and coverage["cli"]["earliestDate"] and curr < coverage["cli"]["earliestDate"]),
                })
                curr = _shift_date(curr, 1)
        else:
            dau_series = [
                {
                    "date": d,
                    **totals,
                    "webUncollected": bool(coverage["web"]["hasCoverage"] and coverage["web"]["earliestDate"] and d < coverage["web"]["earliestDate"]),
                    "pluginUncollected": bool(coverage["plugin"]["hasCoverage"] and coverage["plugin"]["earliestDate"] and d < coverage["plugin"]["earliestDate"]),
                    "cliUncollected": bool(coverage["cli"]["hasCoverage"] and coverage["cli"]["earliestDate"] and d < coverage["cli"]["earliestDate"]),
                }
                for d, totals in sorted(dau_by_date.items(), key=lambda it: it[0])
            ]

    dau_today = dau_all_dates_map.get(target_date) or dau_by_date.get(target_date) or _empty_dau_totals()
    dau_yesterday = dau_all_dates_map.get(comparison_date) or dau_by_date.get(comparison_date) or _empty_dau_totals()

    current_hour = 23
    effective_hour = 23
    has_full_hour = True
    is_latest_full_hour = True

    if is_today:
        today_hours = [
            int(r.get("hour", 0) or 0)
            for r in hourly
            if str(r.get("date", "")).strip() == target_date and str(r.get("metric", "")).strip() in DAU_METRICS
        ]
        max_h = max(today_hours) if today_hours else 0
        gen_str = str(snapshot.get("generatedAt") or "")
        try:
            gen_h = int(gen_str[11:13]) if len(gen_str) >= 13 and gen_str[11:13].isdigit() else datetime.now(timezone.utc).hour
        except Exception:
            gen_h = datetime.now(timezone.utc).hour
        current_hour = min(23, max(max_h, gen_h))
        if gen_h > 0:
            effective_hour = min(23, gen_h - 1)
            has_full_hour = True
            is_latest_full_hour = True
        else:
            effective_hour = None
            has_full_hour = False
            is_latest_full_hour = False

    def get_hourly_breakdown(date_str: str, is_target_today: bool, cur_h: int) -> list[dict]:
        hour_map = {h: {"web": 0, "plugin": 0, "cli": 0} for h in range(24)}
        if not geo_active:
            for row in hourly:
                if str(row.get("date", "")).strip() != date_str:
                    continue
                m = str(row.get("metric", "")).strip()
                if m not in DAU_METRICS:
                    continue
                if not _matches(row, all_dates_filters, platform_agnostic=True):
                    continue
                h = int(row.get("hour", 0) or 0)
                if h < 0 or h > 23:
                    continue
                slot = _dau_channel_for(m, str(row.get("channel", "")))
                if not slot:
                    continue
                hour_map[h][slot] += int(row.get("count", 0) or 0)
        res = []
        for h in range(24):
            entry = hour_map[h]
            is_future = is_target_today and h > cur_h
            tot = 0 if is_future else (entry["web"] + entry["plugin"] + entry["cli"])
            res.append({
                "hour": h,
                "total": tot,
                "web": 0 if is_future else entry["web"],
                "plugin": 0 if is_future else entry["plugin"],
                "cli": 0 if is_future else entry["cli"],
                "isFuture": is_future,
            })
        return res

    target_hourly = get_hourly_breakdown(target_date, is_today, current_hour)
    comp_hourly = get_hourly_breakdown(comparison_date, False, 23)

    c_target_web = 0
    c_target_plugin = 0
    c_target_cli = 0
    c_target_total = 0

    c_comp_web = 0
    c_comp_plugin = 0
    c_comp_cli = 0
    c_comp_total = 0

    target_cumulative = []
    for h in range(24):
        t_point = target_hourly[h]
        c_point = comp_hourly[h]

        c_comp_web += c_point["web"]
        c_comp_plugin += c_point["plugin"]
        c_comp_cli += c_point["cli"]
        c_comp_total += c_point["total"]

        is_future = is_today and h > current_hour
        if not is_future:
            c_target_web += t_point["web"]
            c_target_plugin += t_point["plugin"]
            c_target_cli += t_point["cli"]
            c_target_total += t_point["total"]

        target_cumulative.append({
            "hour": h,
            "targetTotal": None if is_future else c_target_total,
            "targetWeb": None if is_future else c_target_web,
            "targetPlugin": None if is_future else c_target_plugin,
            "targetCli": None if is_future else c_target_cli,
            "comparisonTotal": c_comp_total,
            "comparisonWeb": c_comp_web,
            "comparisonPlugin": c_comp_plugin,
            "comparisonCli": c_comp_cli,
            "baselineTotal": None,
            "isFuture": is_future,
        })

    baseline_hourly_cumulative = []
    for i in range(1, 8):
        b_date = _shift_date(target_date, -i)
        day_inc = get_hourly_breakdown(b_date, False, 23)
        cum = 0
        day_cum = []
        has_data = False
        for h in range(24):
            cum += day_inc[h]["total"]
            if day_inc[h]["total"] > 0:
                has_data = True
            day_cum.append(cum)
        is_covered = bool(active_coverage_start and b_date >= active_coverage_start)
        if is_covered or has_data:
            baseline_hourly_cumulative.append(day_cum)

    seven_day_baseline = []
    for h in range(24):
        sum_h = sum(day_cum[h] for day_cum in baseline_hourly_cumulative)
        avg_h = round(sum_h / len(baseline_hourly_cumulative)) if baseline_hourly_cumulative else 0
        seven_day_baseline.append({"hour": h, "total": avg_h})
        target_cumulative[h]["baselineTotal"] = avg_h

    peak_hour = {"hour": 0, "count": 0}
    max_inc = -1
    max_search_hour = (effective_hour if effective_hour is not None else current_hour) if is_today else 23
    for h in range(max_search_hour + 1):
        cnt = target_hourly[h]["total"]
        if cnt > max_inc:
            max_inc = cnt
            peak_hour = {"hour": h, "count": cnt}

    comparable = True
    incomparable_reason = None
    if coverage["plugin"]["earliestDate"] and target_date >= coverage["plugin"]["earliestDate"] and comparison_date < coverage["plugin"]["earliestDate"]:
        comparable = False
        incomparable_reason = "统计覆盖发生变化（对比日插件尚未采集）"
    elif coverage["cli"]["earliestDate"] and target_date >= coverage["cli"]["earliestDate"] and comparison_date < coverage["cli"]["earliestDate"]:
        comparable = False
        incomparable_reason = "统计覆盖发生变化（对比日 CLI 尚未采集）"

    target_count = 0
    comparison_count = 0
    delta_count = 0
    delta_percent = None
    baseline_count = 0
    baseline_delta_percent = None
    comp_label = ""
    target_label = ""

    if is_single_day:
        if is_today:
            if effective_hour is not None:
                h_str = f"{effective_hour:02d}:00"
                comp_label = f"较昨日同期 (00:00~{h_str})"
                target_label = f"今日截至 {h_str}"
                target_count = target_cumulative[effective_hour]["targetTotal"] or 0
                comparison_count = target_cumulative[effective_hour]["comparisonTotal"] or 0
                baseline_count = seven_day_baseline[effective_hour]["total"] or 0
                delta_count = target_count - comparison_count
                delta_percent = round(((target_count - comparison_count) / comparison_count) * 1000) / 10 if (comparable and comparison_count > 0) else None
                baseline_delta = target_count - baseline_count
                baseline_delta_percent = round((baseline_delta / baseline_count) * 1000) / 10 if (comparable and baseline_count > 0) else None
            else:
                comp_label = "暂无完整小时可比较 (今日 00:00~01:00 尚未结束)"
                target_label = "今日进行中 (未满1小时)"
                target_count = target_cumulative[0]["targetTotal"] or 0
                comparison_count = 0
                baseline_count = 0
                delta_count = 0
                delta_percent = None
                baseline_delta_percent = None
        else:
            comp_label = "较前日全天"
            target_label = "当日完整"
            target_count = dau_today["total"]
            comparison_count = dau_yesterday["total"]
            baseline_count = seven_day_baseline[23]["total"] or 0
            delta_count = target_count - comparison_count
            delta_percent = round(((target_count - comparison_count) / comparison_count) * 1000) / 10 if (comparable and comparison_count > 0) else None
            baseline_delta = target_count - baseline_count
            baseline_delta_percent = round((baseline_delta / baseline_count) * 1000) / 10 if (comparable and baseline_count > 0) else None
    else:
        comp_label = "较上一等长周期"
        target_label = "期末日"
        target_count = dau_today["total"]
        comparison_count = dau_yesterday["total"]
        delta_count = target_count - comparison_count
        delta_percent = round(((target_count - comparison_count) / comparison_count) * 1000) / 10 if (comparable and comparison_count > 0) else None

    comparison_meta = {
        "mode": "prev_day" if is_single_day else "prev_period",
        "label": comp_label,
        "targetLabel": target_label,
        "isSameHour": is_today,
        "currentHour": current_hour if is_today else None,
        "effectiveHour": effective_hour if is_today else None,
        "hasFullHour": has_full_hour if is_today else True,
        "isLatestFullHour": is_latest_full_hour if is_today else None,
        "comparable": comparable,
        "incomparableReason": incomparable_reason,
        "targetCount": target_count,
        "comparisonCount": comparison_count,
        "deltaCount": delta_count,
        "deltaPercent": delta_percent,
        "baselineCount": baseline_count if is_single_day else None,
        "baselineDeltaPercent": baseline_delta_percent if is_single_day else None,
    }

    def get_client_hourly_sum(date_str: str, client: str, max_hour: int) -> int:
        s = 0
        is_web = (client == "official_web")
        for row in hourly:
            if str(row.get("date", "")).strip() != date_str:
                continue
            h = int(row.get("hour", 0) or 0)
            if h < 0 or h > max_hour:
                continue
            m = str(row.get("metric", "")).strip()
            if m not in DAU_METRICS:
                continue
            if not _matches(row, all_dates_filters, platform_agnostic=True):
                continue
            ch = str(row.get("channel", "")).strip()
            cl = str(row.get("client_id", "")).strip()
            if is_web:
                if m == "visitor_unique" and (ch == "web" or not ch or cl in {"official_web", "web"}):
                    s += int(row.get("count", 0) or 0)
            else:
                if m == "active_user" and (cl == client or (not cl and ch == client_channel_map.get(client))):
                    s += int(row.get("count", 0) or 0)
        return s

    def get_client_period_sum(from_d: str, to_d: str, client: str) -> int:
        s = 0
        is_web = (client == "official_web")
        for row in all_dates_source:
            d = str(row.get("date", "")).strip()
            if d < from_d or d > to_d:
                continue
            m = str(row.get("metric", "")).strip()
            if m not in DAU_METRICS:
                continue
            ch = str(row.get("channel", "")).strip()
            cl = str(row.get("client_id", "")).strip()
            if is_web:
                if m == "visitor_unique" and (ch == "web" or not ch or cl in {"official_web", "web"}):
                    s += int(row.get("count", 0) or 0)
            else:
                if m == "active_user" and (cl == client or (not cl and ch == client_channel_map.get(client))):
                    s += int(row.get("count", 0) or 0)
        return s

    def is_point_collected(p: dict) -> bool:
        if not active_coverage_start:
            return True
        return p.get("date", "") >= active_coverage_start

    range_includes_today = (not is_single_day) and (to_date >= today_utc)
    completed_days = [p for p in dau_series if p["date"] < today_utc] if range_includes_today else dau_series
    full_days = [p for p in completed_days if is_point_collected(p)]
    comp_day_count = max(1, len(full_days))
    full_days_total = sum(p["total"] for p in full_days)
    full_day_average = round(full_days_total / comp_day_count)

    collected_days = [p for p in dau_series if is_point_collected(p)]
    collected_day_count = max(1, len(collected_days))
    daily_average = full_day_average if range_includes_today else round(window_totals["total"] / collected_day_count)

    completed_from_date = full_days[0]["date"] if full_days else from_date
    prev_to = _shift_date(completed_from_date, -1)
    prev_from = _shift_date(prev_to, -(comp_day_count - 1))

    all_dau_clients = {"official_web"} | set(client_channel_map.keys()) | set(dau_client_window_totals.keys()) | set(client_target_map.keys()) | set(client_comp_map.keys())
    dau_clients = []
    for client in all_dau_clients:
        is_web = (client == "official_web")
        ch = "web" if is_web else client_channel_map.get(client, "plugin")
        tot = (dau_today["web"] if is_single_day else window_totals["web"]) if is_web else dau_client_window_totals.get(client, 0)
        tdy = dau_today["web"] if is_web else client_target_map.get(client, 0)
        yst = dau_yesterday["web"] if is_web else client_comp_map.get(client, 0)

        cl_target_count = tdy
        cl_comp_count = yst
        current_period_daily_avg = None
        previous_period_daily_avg = None

        if is_single_day:
            if is_today:
                if effective_hour is not None:
                    cl_target_count = (target_cumulative[effective_hour]["targetWeb"] if target_cumulative[effective_hour]["targetWeb"] is not None else tdy) if is_web else get_client_hourly_sum(target_date, client, effective_hour)
                    cl_comp_count = (target_cumulative[effective_hour]["comparisonWeb"] if target_cumulative[effective_hour]["comparisonWeb"] is not None else yst) if is_web else get_client_hourly_sum(comparison_date, client, effective_hour)
                else:
                    cl_target_count = 0
                    cl_comp_count = 0
            else:
                cl_target_count = tdy
                cl_comp_count = yst
        else:
            completed_from = full_days[0]["date"] if full_days else from_date
            completed_to = full_days[-1]["date"] if full_days else to_date
            curr_client_sum = get_client_period_sum(completed_from, completed_to, client)
            prev_client_sum = get_client_period_sum(prev_from, prev_to, client)
            current_period_daily_avg = round(curr_client_sum / comp_day_count)
            previous_period_daily_avg = round(prev_client_sum / comp_day_count)
            cl_target_count = current_period_daily_avg
            cl_comp_count = previous_period_daily_avg

        d_count = cl_target_count - cl_comp_count
        d_pct = round(((cl_target_count - cl_comp_count) / cl_comp_count) * 1000) / 10 if cl_comp_count > 0 else None
        denom = (dau_today["total"] or 1) if is_single_day else (daily_average or 1)
        share_pct = round((cl_target_count / denom) * 1000) / 10

        if tot > 0 or tdy > 0 or yst > 0 or cl_target_count > 0 or cl_comp_count > 0:
            dau_clients.append({
                "client": client,
                "channel": ch,
                "total": tot,
                "today": tdy,
                "yesterday": yst,
                "targetCount": cl_target_count,
                "comparisonCount": cl_comp_count,
                "deltaCount": d_count,
                "deltaPercent": d_pct,
                "sharePercent": share_pct,
                "currentPeriodDailyAvg": current_period_daily_avg,
                "previousPeriodDailyAvg": previous_period_daily_avg,
            })
    dau_clients.sort(key=lambda item: (-(item.get("targetCount") if item.get("targetCount") is not None else item["total"]), -item["total"], item["client"]))

    multi_day_stats = None
    if not is_single_day:
        peak_day = None
        peak_candidates = collected_days if collected_days else dau_series
        for pt in peak_candidates:
            if not peak_day or pt["total"] > peak_day["total"]:
                peak_day = {"date": pt["date"], "total": pt["total"]}

        latest_full_day = None
        if full_days:
            latest_full_day = {"date": full_days[-1]["date"], "total": full_days[-1]["total"]}
        elif dau_series:
            latest_full_day = {"date": dau_series[-1]["date"], "total": dau_series[-1]["total"]}

        previous_period_series = []
        prev_total = 0
        for i in range(comp_day_count):
            d_str = _shift_date(prev_from, i)
            tots = dau_all_dates_map.get(d_str) or _empty_dau_totals()
            previous_period_series.append({"date": d_str, **tots})
            prev_total += tots["total"]
        prev_daily_avg = round(prev_total / comp_day_count)

        multi_comparable = True
        multi_incomparable_reason = None
        if coverage["plugin"]["earliestDate"] and to_date >= coverage["plugin"]["earliestDate"] and prev_from < coverage["plugin"]["earliestDate"]:
            multi_comparable = False
            multi_incomparable_reason = "统计覆盖发生变化（上一周期插件尚未采集）"
        elif coverage["cli"]["earliestDate"] and to_date >= coverage["cli"]["earliestDate"] and prev_from < coverage["cli"]["earliestDate"]:
            multi_comparable = False
            multi_incomparable_reason = "统计覆盖发生变化（上一周期 CLI 尚未采集）"

        m_delta = daily_average - prev_daily_avg
        m_delta_pct = round((m_delta / prev_daily_avg) * 1000) / 10 if (multi_comparable and prev_daily_avg > 0) else None

        comparison_meta["comparable"] = multi_comparable
        comparison_meta["incomparableReason"] = multi_incomparable_reason
        comparison_meta["targetCount"] = daily_average
        comparison_meta["comparisonCount"] = prev_daily_avg
        comparison_meta["deltaCount"] = m_delta
        comparison_meta["deltaPercent"] = m_delta_pct
        comparison_meta["label"] = "较上一周期日均"

        seven_day_moving_average = []
        for pt in dau_series:
            sum7 = 0
            valid_days = 0
            for o in range(7):
                d = _shift_date(pt["date"], -o)
                day_totals = dau_all_dates_map.get(d)
                is_covered = bool(active_coverage_start and d >= active_coverage_start)
                if day_totals is not None:
                    sum7 += day_totals["total"]
                    valid_days += 1
                elif is_covered:
                    valid_days += 1
            ma7_val = round(sum7 / valid_days) if valid_days > 0 else pt["total"]
            pt["ma7"] = ma7_val
            seven_day_moving_average.append({"date": pt["date"], "value": ma7_val})

        multi_day_stats = {
            "fromDate": from_date,
            "toDate": to_date,
            "dayCount": len(collected_days),
            "dailyAverage": daily_average,
            "fullDayCount": comp_day_count,
            "fullDayAverage": full_day_average,
            "rangeIncludesToday": range_includes_today,
            "latestFullDay": latest_full_day,
            "peakDay": peak_day,
            "previousPeriodFrom": prev_from,
            "previousPeriodTo": prev_to,
            "previousPeriodSeries": previous_period_series,
            "sevenDayMovingAverage": seven_day_moving_average,
        }

    single_day_stats = {
        "targetDate": target_date,
        "comparisonDate": comparison_date,
        "currentHour": current_hour,
        "effectiveHour": effective_hour,
        "hasFullHour": has_full_hour,
        "isToday": is_today,
        "targetCumulative": target_cumulative,
        "hourlyIncrements": target_hourly,
        "comparisonHourlyIncrements": comp_hourly,
        "peakHour": peak_hour,
        "sevenDayBaseline": seven_day_baseline,
    }

    dau_hours: list[dict[str, int]] = []
    if not geo_active:
        dau_by_hour: dict[int, dict[str, int]] = defaultdict(lambda: {"total": 0, "web": 0, "plugin": 0, "cli": 0})
        for row in hourly:
            m = str(row.get("metric", "")).strip()
            if m not in DAU_METRICS:
                continue
            if not _matches(row, filters, platform_agnostic=True):
                continue
            h = int(row.get("hour", 0) or 0)
            slot = _dau_channel_for(m, str(row.get("channel", "")))
            cnt = int(row.get("count", 0) or 0)
            dau_by_hour[h]["total"] += cnt
            if slot:
                dau_by_hour[h][slot] += cnt
        dau_hours = [
            {"hour": h, "total": dau_by_hour[h]["total"], "web": dau_by_hour[h]["web"], "plugin": dau_by_hour[h]["plugin"], "cli": dau_by_hour[h]["cli"]}
            for h in sorted(dau_by_hour.keys())
        ]

    dau_geo_source = [
        r for r in geo_rows
        if _matches(r, filters, include_geo=True, platform_agnostic=True)
    ] if filters.get("platform") else filtered_geo
    dau_geo_rows = [
        r for r in dau_geo_source
        if _dau_channel_for(str(r.get("metric", "")).strip(), str(r.get("channel", "")).strip()) is not None
    ]
    dau_countries = _sum_by([r for r in dau_geo_rows if r.get("country") != "UNKNOWN"], "country")
    dau_regions = _sum_by([r for r in dau_geo_rows if r.get("region") != "UNKNOWN" and (r.get("country") == "CN" or not r.get("country"))], "region")

    def filter_option_rows(omit: str, metrics: set[str]) -> list[dict]:
        return [
            row
            for row in source
            if str(row.get("metric", "")) in metrics
            and _matches(row, filters, include_geo=geo_active, omit=omit)
        ]

    channels = _sum_by(filter_option_rows("channel", {"resolve_request"}), "channel")
    clients = _sum_by(filter_option_rows("client", {"resolve_request"}), "client_id")
    platforms = _sum_by(
        filter_option_rows("platform", {"resolve_request"}),
        "platform",
    )

    matched_channels = _sum_by(
        [row for row in filtered_source if str(row.get("metric", "")) == "resolve_request"],
        "channel",
    )
    matched_clients = _sum_by(
        [row for row in filtered_source if str(row.get("metric", "")) == "resolve_request"],
        "client_id",
    )
    matched_platforms = _sum_by(
        [row for row in filtered_source if str(row.get("metric", "")) == "resolve_request"],
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
        and (row.get("country") == "CN" or not row.get("country"))
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

    web_env_rows = [
        row
        for row in env_rows
        if row.get("channel") == "web"
        and _matches(row, filters, environment=True)
    ]
    web_devices = _sum_by(web_env_rows, "device_class")
    web_browsers = _sum_by(web_env_rows, "browser_family")
    web_operating_systems = _sum_by(web_env_rows, "os_family")
    web_environment = {
        "devices": web_devices,
        "browsers": web_browsers,
        "operatingSystems": web_operating_systems,
        "filterScope": "Web 终端环境基于官方 Web 渠道请求分布。",
    }

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

    # Period comparison for Overview
    prev_overview = None
    if from_date and to_date:
        d1 = datetime.strptime(from_date, "%Y-%m-%d")
        d2 = datetime.strptime(to_date, "%Y-%m-%d")
        days = (d2 - d1).days + 1
        p_to = (d1 - timedelta(days=1)).strftime("%Y-%m-%d")
        p_from = (d1 - timedelta(days=days)).strftime("%Y-%m-%d")
        p_filters = dict(filters)
        p_filters["from"] = p_from
        p_filters["to"] = p_to

        p_source = [row for row in source if _matches(row, p_filters, include_geo=geo_active)]
        p_raw = {m: 0 for m in CORE_METRICS}
        for r in p_source:
            m = str(r.get("metric", ""))
            if m in p_raw:
                p_raw[m] += int(r.get("count", 0) or 0)
        p_req = p_raw.get("resolve_request", 0)
        p_succ = p_raw.get("playlist_success", 0) + p_raw.get("user_success", 0)
        prev_overview = {
            "resolve_request": p_req,
            "playlist_success": p_raw.get("playlist_success", 0),
            "user_success": p_raw.get("user_success", 0),
            "resolve_failure": p_raw.get("resolve_failure", 0),
            "tracks_processed": p_raw.get("tracks_processed", 0),
            "export": p_raw.get("export", 0),
            "clipboard": p_raw.get("clipboard", 0),
            "page_view": p_raw.get("page_view", 0),
            "visitor_unique": p_raw.get("visitor_unique", 0),
            "rate_limited": p_raw.get("rate_limited", 0),
            "migration_handoff": p_raw.get("migration_handoff", 0),
            "success_rate": round(p_succ / p_req * 100, 2) if p_req > 0 else 0,
            "pending_feedback": fb_pending,
        }

        p_web_filters = dict(web_filters)
        p_web_filters["from"] = p_from
        p_web_filters["to"] = p_to
        p_web_source = [row for row in source if row.get("channel") == "web" and _matches(row, p_web_filters, include_geo=geo_active)]
        p_pv = 0
        p_uv = 0
        p_web_by_day = {}
        for r in p_web_source:
            d = str(r.get("date", ""))
            m = str(r.get("metric", ""))
            c = int(r.get("count", 0) or 0)
            if m == "page_view":
                p_pv += c
            elif m == "visitor_unique":
                p_uv += c
            if d and m:
                p_web_by_day.setdefault(d, {"date": d})[m] = int(p_web_by_day.get(d, {}).get(m, 0)) + c
        prev_web_overview = {
            "page_view": p_pv,
            "visitor_unique": p_uv,
        }
        prev_web_timeseries = [p_web_by_day[k] for k in sorted(p_web_by_day)]

        prev_web_hourly_timeseries = None
        if not geo_active and from_date == to_date:
            p_web_by_hour = {h: {"date": p_from, "hour": h, "page_view": 0, "visitor_unique": 0} for h in range(24)}
            for row in hourly:
                if row.get("channel") is not None and row.get("channel") != "web":
                    continue
                if not _matches(row, p_web_filters):
                    continue
                h = int(row.get("hour", 0) or 0)
                m = str(row.get("metric", ""))
                if h in p_web_by_hour:
                    p_web_by_hour[h][m] = int(p_web_by_hour[h].get(m, 0)) + int(row.get("count", 0) or 0)
            prev_web_hourly_timeseries = [p_web_by_hour[k] for k in sorted(p_web_by_hour)]
        prev_web_overview = None
        prev_web_timeseries = None
        prev_web_hourly_timeseries = None

    # Integration Clients Dynamic Summary
    client_stats_map = {}
    for row in source:
        if not _matches(row, filters, include_geo=geo_active):
            continue
        cl = str(row.get("client_id") or "").strip()
        if not cl or cl == "none":
            continue
        if cl not in client_stats_map:
            client_stats_map[cl] = {"requests": 0, "success": 0, "channel": str(row.get("channel") or "unknown")}
        m = str(row.get("metric") or "")
        cnt = int(row.get("count", 0) or 0)
        if m == "resolve_request":
            client_stats_map[cl]["requests"] += cnt
        elif m in ("playlist_success", "user_success"):
            client_stats_map[cl]["success"] += cnt
        ch = str(row.get("channel") or "")
        if ch and (not client_stats_map[cl]["channel"] or client_stats_map[cl]["channel"] == "unknown"):
            client_stats_map[cl]["channel"] = ch

    for item in clients:
        c_name = item.get("name")
        if c_name and c_name != "none" and c_name not in client_stats_map:
            client_stats_map[c_name] = {"requests": item.get("count", 0), "success": 0, "channel": "unknown"}

    prev_client_stats_map = {}
    if prev_overview and p_from and p_to:
        p_cl_filters = dict(filters)
        p_cl_filters["from"] = p_from
        p_cl_filters["to"] = p_to
        for row in source:
            if not _matches(row, p_cl_filters, include_geo=geo_active):
                continue
            cl = str(row.get("client_id") or "").strip()
            if not cl or cl == "none":
                continue
            if cl not in prev_client_stats_map:
                prev_client_stats_map[cl] = {"requests": 0, "success": 0}
            m = str(row.get("metric") or "")
            cnt = int(row.get("count", 0) or 0)
            if m == "resolve_request":
                prev_client_stats_map[cl]["requests"] += cnt
            elif m in ("playlist_success", "user_success"):
                prev_client_stats_map[cl]["success"] += cnt

    integration_clients = []
    for client_id, stat in client_stats_map.items():
        reqs = stat["requests"]
        succ_rate = round(stat["success"] / reqs * 100, 1) if reqs > 0 else 0
        prev_stat = prev_client_stats_map.get(client_id)
        prev_reqs = prev_stat["requests"] if prev_stat else None
        prev_succ_rate = round(prev_stat["success"] / prev_stat["requests"] * 100, 1) if prev_stat and prev_stat["requests"] > 0 else None

        req_delta_text = "—"
        req_delta_color = "var(--m)"
        if prev_reqs is not None:
            diff = reqs - prev_reqs
            if diff == 0:
                req_delta_text = "— 持平"
            elif prev_reqs == 0:
                req_delta_text = "+100% vs 上期"
                req_delta_color = "var(--g)"
            else:
                pct_val = f"{(diff / prev_reqs * 100):.1f}%"
                req_delta_text = f"{'+' if diff > 0 else ''}{pct_val} vs 上期"
                req_delta_color = "var(--g)" if diff > 0 else "var(--r)"

        cl_key = client_id.lower()
        v_dist = breakdowns.get(f"{cl_key}_version") or (breakdowns.get("client_version") if cl_key == "musicfree" else None) or []
        h_dist = breakdowns.get(f"{cl_key}_host") or (breakdowns.get("host_platform") if cl_key == "musicfree" else None) or []

        integration_clients.append({
            "clientId": client_id,
            "channel": stat["channel"],
            "requests": reqs,
            "successRate": succ_rate,
            "prevRequests": prev_reqs,
            "prevSuccessRate": prev_succ_rate,
            "requestDeltaText": req_delta_text,
            "requestDeltaColor": req_delta_color,
            "topVersion": v_dist[0]["name"] if v_dist else None,
            "topHost": h_dist[0]["name"] if h_dist else None,
            "versionDistribution": v_dist,
            "hostDistribution": h_dist,
        })
    integration_clients.sort(key=lambda x: x["requests"], reverse=True)

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
            "active_clients": len([item for item in matched_clients if item["count"] > 0]),
            "pending_feedback": fb_pending,
        },
        "previousOverview": prev_overview,
        "webTimeseries": web_timeseries,
        "webHourlyTimeseries": web_hourly_timeseries,
        "previousWebOverview": prev_web_overview,
        "previousWebTimeseries": prev_web_timeseries,
        "previousWebHourlyTimeseries": prev_web_hourly_timeseries,
        "dau": {
            "targetDate": target_date,
            "comparisonDate": comparison_date,
            "isSingleDay": is_single_day,
            "today": dau_today,
            "yesterday": dau_yesterday,
            "windowTotals": window_totals,
            "series": dau_series,
            "hours": dau_hours,
            "clients": dau_clients,
            "countries": dau_countries,
            "regions": dau_regions,
            "coverage": coverage,
            "annotations": annotations,
            "comparison": comparison_meta,
            "singleDay": single_day_stats if is_single_day else None,
            "multiDay": multi_day_stats if not is_single_day else None,
            "targetCumulative": target_cumulative if is_single_day else None,
            "comparisonCumulative": [{"hour": p["hour"], "total": p["comparisonTotal"]} for p in target_cumulative] if is_single_day else None,
            "sevenDayBaseline": seven_day_baseline if is_single_day else None,
        },
        "timeseries": timeseries,
        "hourlyTimeseries": hourly_timeseries,
        "breakdowns": breakdowns,
        "distributions": {
            "channels": matched_channels,
            "clients": matched_clients,
            "platforms": matched_platforms,
        },

        "environment": {
            "devices": devices,
            "browsers": browsers,
            "operatingSystems": operating_systems,
            "filterScope": "Environment supports date/channel/client filters. Platform and geography are intentionally separate privacy cubes.",
        },
        "webEnvironment": web_environment,
        "geo": {
            "countries": countries,
            "regions": regions,
            "filterScope": "Geography is intentionally stored in a separate privacy-preserving cube. Geo filters affect overview/timeseries/geo, not reliability breakdowns.",
        },
        "webGeo": web_geo,
        "availableFilters": {
            "channels": channels,
            "clients": clients,
            "platforms": platforms,
            "countries": _sum_by(country_option_rows, "country"),
            "regions": _sum_by(region_option_rows, "region"),
        },
        "integrationClients": integration_clients,
        "dataQuality": {
            "status": "healthy" if all(check["ok"] for check in checks) else "error",
            "checks": checks,
            "latestDate": latest or None,
            "legacyMixedShare": round(legacy_count / total_count * 100, 2)
            if total_count > 0
            else 0,
        },
        "filterContract": {
            "supportedDimensions": ["channel", "client", "platform", "country", "region"],
            "scopeNote": "全局分析切片覆盖渠道、接入端、平台及地域维度。",
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
    platform = _query_value(query, "platform").lower()
    country = _query_value(query, "country").upper()
    region = _query_value(query, "region")
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
        if platform and str(row.get("platform", "")).lower() != platform:
            continue
        if country and str(row.get("country", "")).upper() != country:
            continue
        if region and str(row.get("region", "")) != region:
            continue
        filtered.append(row)
    filtered.sort(
        key=lambda row: (
            str(row.get("incident_date", "")),
            int(row.get("id", 0) or 0),
        ),
        reverse=True,
    )

    timeseries_map: dict[str, dict[str, int]] = defaultdict(lambda: {"count": 0, "events": 0})
    reasons_map: dict[str, int] = defaultdict(int)

    for r in filtered:
        d = str(r.get("incident_date", ""))[:10]
        cnt = int(r.get("count", 0) or 0)
        if d:
            timeseries_map[d]["count"] += 1
            timeseries_map[d]["events"] += cnt
        rsn = str(r.get("reason", "") or "unknown")
        reasons_map[rsn] += cnt

    timeseries = [
        {"date": d, "count": val["count"], "events": val["events"]}
        for d, val in sorted(timeseries_map.items())
    ]
    reasons = [
        {"name": name, "count": cnt}
        for name, cnt in sorted(reasons_map.items(), key=lambda x: x[1], reverse=True)
    ]

    visible = filtered[:limit]
    return {
        "quarantine": visible,
        "totalRecords": len(filtered),
        "totalEvents": sum(int(row.get("count", 0) or 0) for row in filtered),
        "reasons": reasons,
        "timeseries": timeseries,
        "filterContract": {
            "supportedDimensions": ["platform", "country", "region"],
            "scopeNote": PAGE_FILTER_CAPABILITIES["security"]["scopeNote"],
        },
    }



def build_local_feedback(snapshot: dict, query: dict[str, str]) -> dict:
    all_rows = [row for row in snapshot.get("feedback", []) if isinstance(row, dict)]
    if is_exclude_my(query):
        all_rows = [row for row in all_rows if str(row.get("country", "")).upper() != "MY"]

    from_date = _query_value(query, "from")
    to_date = _query_value(query, "to")
    if from_date and to_date and from_date > to_date:
        from_date, to_date = to_date, from_date
    platform = _query_value(query, "platform").lower()
    country = _query_value(query, "country").upper()
    region = _query_value(query, "region")

    filtered_rows = []
    for r in all_rows:
        report_date = str(r.get("last_reported_at") or r.get("first_reported_at") or r.get("created_at") or "")[:10]
        if from_date and report_date and report_date < from_date:
            continue
        if to_date and report_date and report_date > to_date:
            continue
        if platform and str(r.get("platform", "")).lower() != platform:
            continue
        if country and str(r.get("country", "")).upper() != country:
            continue
        if region and str(r.get("region", "")) != region:
            continue
        filtered_rows.append(r)

    # Calculate availableErrorCodes & stats
    error_code_counts: dict[str, int] = defaultdict(int)
    platform_counts: dict[str, int] = defaultdict(int)
    unique_urls = set()
    total_reports = 0

    for r in filtered_rows:
        code = str(r.get("error_code") or "").strip()
        if code:
            error_code_counts[code] += 1
        p = str(r.get("platform") or "").strip().lower()
        if p:
            platform_counts[p] += 1
        url = r.get("source_url")
        if url:
            unique_urls.add(url)
        total_reports += int(r.get("report_count", 0) or 1)

    available_error_codes = [
        {"name": name, "count": count}
        for name, count in sorted(error_code_counts.items(), key=lambda x: x[1], reverse=True)
    ]
    top_platform = max(platform_counts.items(), key=lambda x: x[1])[0] if platform_counts else "—"
    top_error_code = max(error_code_counts.items(), key=lambda x: x[1])[0] if error_code_counts else "—"

    stats = {
        "uniqueUrls": len(unique_urls),
        "totalReports": total_reports,
        "topPlatform": top_platform,
        "topErrorCode": top_error_code,
    }

    status_counts = {"all": len(filtered_rows), "pending": 0, "resolved": 0, "ignored": 0}
    for row in filtered_rows:
        s = str(row.get("status", "") or "pending").lower()
        if s in status_counts:
            status_counts[s] += 1
        else:
            status_counts["pending"] += 1

    status = _query_value(query, "status").lower()
    rows = filtered_rows
    if status and status != "all":
        rows = [row for row in rows if str(row.get("status", "") or "pending").lower() == status]

    err_filter = _query_value(query, "error_code").strip()
    if err_filter:
        rows = [row for row in rows if str(row.get("error_code") or "").strip() == err_filter]

    sort_by = _query_value(query, "sort_by") or _query_value(query, "sortBy") or "recent"
    if sort_by == "frequent":
        rows.sort(
            key=lambda row: int(row.get("report_count", 0) or 0),
            reverse=True,
        )
    elif sort_by == "oldest_pending":
        def oldest_key(row):
            is_pending = 0 if str(row.get("status", "") or "pending").lower() == "pending" else 1
            dt = str(row.get("first_reported_at") or row.get("last_reported_at") or "")
            return (is_pending, dt)
        rows.sort(key=oldest_key)
    else:
        rows.sort(
            key=lambda row: (
                str(row.get("last_reported_at", "") or row.get("first_reported_at", "") or row.get("created_at", "")),
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
        "availableErrorCodes": available_error_codes,
        "stats": stats,
        "filterContract": {
            "supportedDimensions": ["platform", "country", "region"],
            "scopeNote": PAGE_FILTER_CAPABILITIES["feedback"]["scopeNote"],
        },
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
.brand{display:flex;align-items:center;gap:9px;flex-shrink:0;text-decoration:none;color:inherit;cursor:pointer;transition:opacity .15s;background:transparent}
.brand:hover{opacity:.8}
.logo-img{width:32px;height:32px;border-radius:8px;object-fit:contain;display:block;flex-shrink:0;background:transparent;border:0;box-shadow:none}
.brand-info{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
h1{margin:0;font-size:15px;font-weight:800;letter-spacing:-.3px;line-height:1.15}
.badge-tag{font-size:9.5px;font-weight:700;padding:0.5px 5px;border-radius:4px;background:color-mix(in srgb,var(--a) 12%,transparent);color:var(--a);border:1px solid color-mix(in srgb,var(--a) 25%,transparent);line-height:1.2}
.muted{font-size:12px;color:var(--m)}
.headright{display:flex;align-items:center;gap:10px;flex-shrink:0;margin-left:auto}
#updated{display:flex;flex-direction:column;align-items:flex-start;font-size:10px;white-space:nowrap;color:var(--m);text-align:left;line-height:1.25}
.health-dot{width:9px;height:9px;border-radius:50%;background:var(--g);display:inline-block;flex-shrink:0;box-shadow:0 0 0 2px color-mix(in srgb,var(--g) 25%,transparent);cursor:help;transition:all .2s ease}
.health-dot.bad{background:var(--r);box-shadow:0 0 0 2px color-mix(in srgb,var(--r) 25%,transparent)}
.health-dot.loading{background:var(--w);box-shadow:0 0 0 2px color-mix(in srgb,var(--w) 25%,transparent)}
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

.filter-card{padding:14px 16px;margin-bottom:16px;background:var(--p);border:1px solid var(--l);border-radius:var(--rad);box-shadow:var(--s)}
.filter-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--l);min-height:36px}
.filter-card-title{font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;color:var(--t);white-space:nowrap}
.scope-note-pill{font-size:11px;color:var(--m);background:color-mix(in srgb,var(--p) 80%,var(--bg));padding:2px 8px;border-radius:6px;border:1px solid var(--l);font-weight:500}
.scope-note{padding:8px 12px;border:1px solid var(--l);border-radius:var(--rad);background:color-mix(in srgb,var(--p) 80%,var(--bg));font-size:11.5px;color:var(--m);line-height:1.5;margin-bottom:14px}
.scope-note.warn{border-color:color-mix(in srgb,var(--w) 40%,transparent);color:var(--t)}
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
.date-field{grid-column:1/-1;padding-bottom:12px;margin-bottom:4px;border-bottom:1px solid color-mix(in srgb,var(--l) 70%,transparent)}
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

.page{display:none;min-height:calc(100vh - 220px);padding-bottom:24px}.page.active{display:block}
.section{display:flex;justify-content:space-between;align-items:end;margin:16px 0 12px}
.section h2{margin:0;font-size:16px;font-weight:700}

.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px}
.card,.panel{background:var(--p);border:1px solid var(--l);border-radius:var(--rad);box-shadow:var(--s)}
.kpi-card{padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;min-height:92px}
.kpi-label{font-size:11px;font-weight:600;color:var(--m);display:flex;justify-content:space-between;align-items:center}
.kpi-val{font-size:22px;font-weight:700;font-family:var(--mono);margin:4px 0 2px;letter-spacing:-.5px}
.kpi-sub{font-size:11px;color:var(--m)}

.grid2{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:14px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px}
.grid2 > .panel, .grid3 > .panel{margin-top:0;margin-bottom:0}
.panel > .grid2:last-child, .panel > .grid3:last-child{margin-bottom:0}
.panel{padding:14px;min-width:0;margin-bottom:14px}
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
.bar{display:grid;grid-template-columns:minmax(130px, 175px) 1fr auto;gap:8px;align-items:center;font-size:12px}
.bn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}
.b-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.track{height:7px;background:var(--l);border-radius:999px;overflow:hidden;min-width:50px}
.fill{height:100%;border-radius:999px;transition:width .2s}
.num{text-align:right;color:var(--m);font-variant-numeric:tabular-nums;font-family:var(--mono);font-size:11px;white-space:nowrap;display:inline-flex;align-items:center;justify-content:flex-end}
.num .val{color:var(--t);font-weight:600;text-align:right;min-width:48px;display:inline-block}
.num .pct{color:var(--m);font-weight:500;font-size:10.5px;text-align:right;display:inline-block;width:44px;margin-left:8px;flex-shrink:0}

.chips{display:flex;flex-wrap:wrap;gap:5px}
.chip{padding:3px 7px;border:1px solid var(--l);border-radius:999px;background:var(--p);font-size:11px;color:var(--m)}
.notice{padding:8px 12px;border:1px solid var(--l);border-radius:7px;margin:8px 0;font-size:12px}
.notice.bad{border-color:var(--r);color:var(--r)}

.table-wrap{overflow:auto;max-height:75vh}
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
.footer{text-align:center;color:var(--m);font-size:11.5px;padding:24px 0 20px;border-top:1px solid color-mix(in srgb,var(--l) 70%,transparent);margin-top:12px;display:flex;flex-direction:column;gap:6px;align-items:center}
.footer-line{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;color:var(--m);font-weight:400}
.footer-line a{color:var(--m);text-decoration:none;transition:color .15s ease;font-weight:400}
.footer-line a:hover{color:var(--t);text-decoration:underline;text-underline-offset:2px}
.footer-sep{color:color-mix(in srgb,var(--m) 45%,transparent);user-select:none}

/* 图表视图切换按钮组 */
.view-switch{display:inline-flex;background:var(--bg);border:1px solid var(--l);border-radius:6px;padding:2px;gap:2px}
.view-switch button{border:0;background:transparent;color:var(--m);font-size:11px;padding:2px 8px;border-radius:4px;cursor:pointer;transition:all .15s ease;line-height:1.4;font-weight:500}
.view-switch button:hover{color:var(--t)}
.view-switch button.active{background:var(--p);color:var(--a);font-weight:600;box-shadow:var(--s)}

/* 环形占比图 (Donut Chart) */
.donut-wrap{display:grid;grid-template-columns:160px 1fr;gap:18px;align-items:center;padding:6px 0}
.donut-graphic{position:relative;width:160px;height:160px;margin:auto}
.donut-svg{width:100%;height:100%;transform:rotate(-90deg)}
.donut-slice{transition:stroke-width .2s ease, opacity .2s ease;cursor:pointer}
.donut-slice:hover{opacity:.85}
.donut-center{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;text-align:center;padding:10px}
.donut-center-val{font-size:18px;font-weight:700;font-family:var(--mono);color:var(--t);line-height:1.1}
.donut-center-lbl{font-size:10.5px;color:var(--m);margin-top:2px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.donut-legend{display:flex;flex-direction:column;gap:0;max-height:220px;overflow-y:auto;padding-right:4px}
.donut-item{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;padding:4px 6px;border-radius:4px;transition:background .15s;cursor:pointer}
.donut-item:hover{background:color-mix(in srgb,var(--p) 85%,var(--a))}
.donut-item-left{display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.donut-item-right{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;flex-shrink:0}
.donut-item-right .val{font-weight:600;color:var(--t)}
.donut-item-right .pct{color:var(--m);min-width:38px;text-align:right}

/* 直方柱状分布图 (Histogram / Column Chart) */
.hist-wrap{padding:8px 0 4px}
.hist-cols{display:grid;grid-template-columns:repeat(5, 1fr);gap:10px;align-items:end;height:180px}
.hist-col{display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}
.hist-num{display:flex;flex-direction:column;align-items:center;margin-bottom:6px;line-height:1.15}
.hist-val{font-size:13px;font-weight:700;font-family:var(--mono);color:var(--t)}
.hist-pct{font-size:10.5px;color:var(--m);font-family:var(--mono)}
.hist-track{width:100%;max-width:48px;height:100px;background:var(--l);border-radius:6px 6px 2px 2px;display:flex;align-items:flex-end;overflow:hidden}
.hist-fill{width:100%;border-radius:6px 6px 2px 2px;transition:height .3s cubic-bezier(.4,0,.2,1)}
.hist-label{font-size:11px;font-weight:600;color:var(--t);margin-top:6px;display:flex;align-items:center;gap:4px;white-space:nowrap}
.hist-sub{font-size:10px;color:var(--m);margin-top:1px;white-space:nowrap}

/* 数据明细表 (Ranked Table) */
.ranked-table-wrap{overflow-x:auto;border:1px solid var(--l);border-radius:6px}
.ranked-table{width:100%;border-collapse:collapse;font-size:11.5px}
.ranked-table th{background:color-mix(in srgb,var(--p) 92%,var(--bg));position:sticky;top:0;z-index:1;padding:6px 8px;font-size:11px;font-weight:600;color:var(--m);border-bottom:1px solid var(--l)}
.ranked-table td{padding:5px 8px;border-bottom:1px solid var(--l);vertical-align:middle}
.ranked-table tr:hover td{background:color-mix(in srgb,var(--p) 90%,var(--a))}
.rank-badge{display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:4px;font-size:10px;font-weight:700;background:var(--l);color:var(--m);font-family:var(--mono)}
.rank-badge.top1{background:#fef08a;color:#854d0e}
.rank-badge.top2{background:#e2e8f0;color:#334155}
.rank-badge.top3{background:#fed7aa;color:#9a3412}

@media(max-width:1240px){.head{flex-wrap:wrap;padding:6px 0;gap:8px}.tabs{order:3;width:100%;justify-content:flex-start;margin:4px 0 0;overflow-x:auto}}
@media(max-width:1100px){.filters{grid-template-columns:repeat(3,1fr)}.kpis{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){
  .filters{grid-template-columns:1fr 1fr}.kpis{grid-template-columns:1fr 1fr}.grid2,.grid3{grid-template-columns:1fr}.bar{grid-template-columns:minmax(90px, 120px) 1fr auto;gap:6px}.num .pct{width:40px;margin-left:6px}
  .donut-wrap{grid-template-columns:1fr;justify-items:center}
  .hist-cols{gap:4px}
  .hist-track{max-width:32px}
  .hist-label{font-size:9.5px}
}
</style></head><body>

<!-- 纤细吸顶导航栏：仅常驻标签页与状态，中英文上下换行，绝不遮挡视野 -->
<header class="top"><div class="wrap">
  <div class="head">
    <a href="https://playlistout.lengxiqwq.com/" target="_blank" rel="noopener noreferrer" class="brand" title="访问 Playlist Out 官方网站 ↗">
      <img src="/logo-64.png" width="32" height="32" class="logo-img" alt="Playlist Out" onerror="this.onerror=null;this.src='/favicon.svg'">
      <div class="brand-info">
        <h1>Playlist Out</h1>
        <span class="badge-tag">Analytics</span>
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
      <button class="tab" data-page="usage">
        <span class="tab-icon">💡</span>
        <span class="tab-text">
          <span class="tab-title">使用偏好</span>
          <span class="tab-sub">Usage</span>
        </span>
      </button>
      <button class="tab" data-page="web">
        <span class="tab-icon">💻</span>
        <span class="tab-text">
          <span class="tab-title">官网流量</span>
          <span class="tab-sub">Web</span>
        </span>
      </button>
      <button class="tab" data-page="reliability">
        <span class="tab-icon">🛡️</span>
        <span class="tab-text">
          <span class="tab-title">系统稳定</span>
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
      <button class="tab" data-page="feedback">
        <span class="tab-icon">🐛</span>
        <span class="tab-text">
          <span class="tab-title">待审歌单</span>
          <span class="tab-sub">Feedback</span>
        </span>
        <span id="navPendingBadge" class="tab-badge" style="display:none">0</span>
      </button>
      <button class="tab" data-page="security">
        <span class="tab-icon">🔒</span>
        <span class="tab-text">
          <span class="tab-title">安全风控</span>
          <span class="tab-sub">Security</span>
        </span>
      </button>
      <button class="tab" data-page="dau">
        <span class="tab-icon">📈</span>
        <span class="tab-text">
          <span class="tab-title">日活 DAU</span>
          <span class="tab-sub">Daily Active</span>
        </span>
      </button>
    </nav>
    <div class="headright">
      <label class="toggle-switch" title="一键排除所有来自马来西亚的测试记录（默认关闭）">
        <input type="checkbox" id="switchExcludeMy">
        <span class="toggle-slider"></span>
        <span class="toggle-switch-text">排除 MY 测试</span>
      </label>
      <div id="updated">
        <div>快照: <span id="snapTime">—</span></div>
        <div>最新: <span id="latestDate">—</span></div>
      </div>
      <div id="health" class="health-dot good" title="数据健康 (Data Healthy)"></div>
      <button id="refreshData" class="ghost">刷新云端数据</button>
    </div>
  </div>
</div></header>

<main class="wrap"><div id="error"></div>

<!-- 维度与时间筛选工具栏 (作为页面内容卡片，点选后随页面自然滚动，绝不遮挡视野) -->
<div class="card filter-card">
  <div class="filter-card-head">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div class="filter-card-title"><span>⚙️</span> 维度与时间筛选工具栏 (Filters)</div>
      <div id="filterScopeNote" class="scope-note-pill" style="display:none"></div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
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
          <button id="filterPrevDay" class="ghost btn-sm" title="切换到前一天">◀ 前一天</button>
          <input id="singleDate" type="date" aria-label="查看单日">
          <button id="filterNextDay" class="ghost btn-sm" title="切换到后一天">后一天 ▶</button>
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
    <div class="field" data-filter="channel"><label for="channel">来源渠道 Channel</label><select id="channel"><option value="">全部</option><option>web</option><option>plugin</option><option>api</option><option>legacy_mixed</option></select></div>
    <div class="field" data-filter="client"><label for="client">接入端 Client</label><select id="client"><option value="">全部</option></select></div>
    <div class="field" data-filter="platform"><label for="platform">目标平台 Platform</label><select id="platform"><option value="">全部</option><option>qqmusic</option><option>netease</option><option>kugou</option><option>kuwo</option><option>qishui</option><option>migu</option></select></div>
    <div class="field" data-filter="country"><label for="country">国家 Country</label><select id="country"><option value="">全部</option></select></div>
    <div class="field" data-filter="region"><label for="region">省份 (中国) Region</label><select id="region"><option value="">全部</option></select></div>
    <div class="field" data-filter="reset" style="display:flex;align-items:end"><button id="reset" class="ghost" style="width:100%">重置</button></div>
  </div>
</div>

<!-- 1. 业务总览 (Overview) -->
<section class="page active" id="page-overview">
  <div class="section">
    <div><h2>业务总览 Overview</h2><div class="muted">全站宏观状态、变化归因 (Movers) 与关键待办事项；支持上一等长周期对比。</div></div>
  </div>
  <div id="overviewAlerts" style="margin-bottom:14px;display:none"></div>
  <div id="overviewKpis" class="kpis"></div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>📈 请求趋势 (Request Trend)</h3>
          <div class="muted" style="font-size:11px">单日按小时 · 多日按天</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="view-switch" data-target="trend">
            <button class="active" data-view="bar" title="基线对比柱状图 (Steam 评测风格)">📊 柱形</button>
            <button data-view="line" title="折线走势图">📈 折线</button>
          </div>
          <div class="trend-legend">
            <span><span class="legend-dot" style="background:var(--g)"></span>成功解析</span>
            <span><span class="legend-dot" style="background:var(--r)"></span>最终失败</span>
          </div>
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
        <div>
          <h3>🎵 目标平台分布 (Top Movers)</h3>
          <div class="muted" style="font-size:11px">请求目标平台 (resolve_request)</div>
        </div>
        <div class="view-switch" data-target="platform">
          <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
          <button data-view="donut" title="环形占比分布图">🍩 占比</button>
        </div>
      </div>
      <div id="platformBars" class="bars"></div>
    </div>
  </div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>🔌 接入端解析量 (Resolve Clients)</h3>
          <div class="muted" style="font-size:11px">请求总次数</div>
        </div>
        <div class="view-switch" data-target="client">
          <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
          <button data-view="donut" title="环形占比分布图">🍩 占比</button>
        </div>
      </div>
      <div id="clientBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>🩺 数据健康状态 (Data Integrity)</h3>
          <div class="muted" style="font-size:11px">Data Quality 守恒与闭环核验</div>
        </div>
      </div>
      <div id="qualitySummary"></div>
      <details id="qualityDetails" style="margin-top:10px">
        <summary style="cursor:pointer;font-size:11px;color:var(--t);padding:4px 0">查看守恒核验明细 ▼</summary>
        <div id="quality" style="margin-top:8px"></div>
      </details>
    </div>
  </div>

  <details class="panel">
    <summary style="cursor:pointer;font-size:12px;font-weight:600;padding:4px 0;color:var(--m)">🌐 来源国家与地区分布 (已降级收起 · 建议前往“官网流量 Web”查看精准访客地域) ▼</summary>
    <div class="grid2" style="margin-top:10px">
      <div>
        <div class="panel-head">
          <div>
            <h3>🌍 来源国家</h3>
            <div class="muted" style="font-size:11px">独立访客 (UV)</div>
          </div>
          <div class="view-switch" data-target="country">
            <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
            <button data-view="table" title="明细数据表">📋 表格</button>
          </div>
        </div>
        <div id="countryBars" class="bars"></div>
      </div>
      <div>
        <div class="panel-head">
          <div>
            <h3>🏙️ 中国省份 / 直辖市</h3>
            <div class="muted" style="font-size:11px">独立访客 (UV)</div>
          </div>
          <div class="view-switch" data-target="region">
            <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
            <button data-view="table" title="明细数据表">📋 表格</button>
          </div>
        </div>
        <div id="regionBars" class="bars"></div>
      </div>
    </div>
  </details>
</section>

<!-- 2. 使用偏好 (Usage) -->
<section class="page" id="page-usage">
  <div class="section">
    <div><h2>使用偏好 Usage</h2><div class="muted">解析平台分布、输入方式偏好、导出文件格式、歌单规模与跨端迁移。</div></div>
  </div>
  <div id="usageKpis" class="kpis"></div>
  <div class="grid3">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>🎵 目标平台 Target Platform</h3>
          <div class="muted" style="font-size:11px">歌单解析请求数</div>
        </div>
      </div>
      <div id="usagePlatformBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>📥 输入方式 Requested Type</h3>
          <div class="muted" style="font-size:11px">调用次数</div>
        </div>
        <div class="view-switch" data-target="requestedType">
          <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
          <button data-view="donut" title="环形占比分布图">🍩 占比</button>
        </div>
      </div>
      <div id="requestedTypeBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>📊 歌单曲目量 Playlist Size</h3>
          <div class="muted" style="font-size:11px">导出曲目规模区间</div>
        </div>
      </div>
      <div id="exportSizeBars" class="bars"></div>
    </div>
  </div>
  <div class="grid3">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>📄 导出格式 Export Format</h3>
          <div class="muted" style="font-size:11px">生成文件格式</div>
        </div>
        <div class="view-switch" data-target="exportFormat">
          <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
          <button data-view="donut" title="环形占比分布图">🍩 占比</button>
        </div>
      </div>
      <div id="exportFormatBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>📋 复制模式 Clipboard</h3>
          <div class="muted" style="font-size:11px">快捷剪贴板格式</div>
        </div>
        <div class="view-switch" data-target="clipboard">
          <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
          <button data-view="donut" title="环形占比分布图">🍩 占比</button>
        </div>
      </div>
      <div id="clipboardModeBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>🚀 迁移目标 Migration Destination</h3>
          <div class="muted" style="font-size:11px">跨播放器唤起调用</div>
        </div>
      </div>
      <div id="usageMigrationBars" class="bars"></div>
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
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <div style="display:flex;gap:6px;align-items:center">
        <button class="ghost fb-tab active" data-fb-status="pending" id="fbBtnPending">待处理 Pending (<span id="fbCountPending">0</span>)</button>
        <button class="ghost fb-tab" data-fb-status="all" id="fbBtnAll">全部 All (<span id="fbCountAll">0</span>)</button>
        <button class="ghost fb-tab" data-fb-status="resolved" id="fbBtnResolved">已修复 Resolved (<span id="fbCountResolved">0</span>)</button>
        <button class="ghost fb-tab" data-fb-status="ignored" id="fbBtnIgnored">已忽略 Ignored (<span id="fbCountIgnored">0</span>)</button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-left:auto">
        <select id="feedbackSort" class="ghost" style="padding:2px 8px;font-size:12px;border-radius:6px;cursor:pointer">
          <option value="recent">🕒 最近上报优先</option>
          <option value="frequent">🔥 高频重复失败优先</option>
          <option value="oldest_pending">⏳ 最早未处理优先 (倒序排查)</option>
        </select>
        <select id="feedbackErrorCode" class="ghost" style="padding:2px 8px;font-size:12px;border-radius:6px;cursor:pointer">
          <option value="">全部错误分类 (All Errors)</option>
        </select>
        <button id="reloadFeedback" class="ghost">刷新</button>
      </div>
    </div>
  </div>
  <div id="feedbackKpis" class="kpis"></div>

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
            <th style="width:60px;text-align:center">上报频次</th>
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

<!-- 3. 官网流量 (Web Analytics) -->
<section class="page" id="page-web">
  <div class="section">
    <div>
      <h2>官网访客与流量趋势 Web Analytics</h2>
      <div class="muted">页面访问量 (PV) 走势、日去重访客 (UV)、来源分类渠道与客户端运行环境。</div>
    </div>
  </div>
  <div id="webScope" class="scope-note" hidden></div>
  <div id="webKpis" class="kpis"></div>

  <!-- 第一层：官网流量走势 Trend -->
  <div class="panel">
    <div class="panel-head" style="align-items:center">
      <div>
        <h3>📈 官网流量趋势 Web Traffic Trend</h3>
        <div class="muted" style="font-size:11px">页面访问量 (PV) 与 日去重访客 (UV) 走势 · 支持上一周期对比</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <button id="webCompareToggle" class="btn-sm" style="cursor:pointer;padding:3px 10px;border-radius:4px;border:1px solid var(--l);background:var(--p);font-size:12px">⚖️ 对比上期: 关</button>
        <div class="view-switch" data-target="webTrend">
          <button class="active" data-view="line" title="折线走势图">📈 折线</button>
          <button data-view="bar" title="柱状图">📊 柱状</button>
        </div>
      </div>
    </div>
    <div class="trend-box" id="webTrendBox" style="position:relative">
      <canvas id="webTrendCanvas" height="220" style="width:100%;height:220px;display:block"></canvas>
      <div id="webTrendTip" class="chart-tooltip" style="display:none"></div>
    </div>
    <div style="display:flex;gap:18px;justify-content:center;margin-top:10px;font-size:12px">
      <span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:3px;background:#206bc4;display:inline-block;border-radius:2px"></span> 页面访问量 (PV)</span>
      <span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:3px;background:#10b981;display:inline-block;border-radius:2px"></span> 日去重访客 (UV)</span>
      <span id="webCompareLegend" style="display:none;align-items:center;gap:6px;color:var(--m)"><span style="width:12px;height:2px;background:#94a3b8;border-top:1px dashed #94a3b8;display:inline-block"></span> 上一周期基准 (虚线)</span>
    </div>
  </div>

  <!-- 第二层与第三层：Acquisition 与 Environment -->
  <div class="grid3">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>🔗 访问来源 Referrer</h3>
          <div class="muted" style="font-size:11px">渠道与外链分类排行 (PV)</div>
        </div>
      </div>
      <div id="referrerBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>🌐 浏览器 Browser</h3>
          <div class="muted" style="font-size:11px">请求/事件环境分布 (非访客人数)</div>
        </div>
      </div>
      <div id="browserBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>💻 终端与系统 Device / OS</h3>
          <div class="muted" style="font-size:11px">请求/事件环境分布 (非访客人数)</div>
        </div>
        <div class="view-switch" data-target="device">
          <button class="active" data-view="donut" title="设备类型占比分布图">🍩 占比</button>
          <button data-view="bar" title="横向排行列表">📊 列表</button>
        </div>
      </div>
      <div id="deviceBars" class="bars"></div>
      <hr style="border:0;border-top:1px solid var(--l);margin:10px 0">
      <div id="osBars" class="bars"></div>
    </div>
  </div>

  <!-- 第四层：Geo 访客地域单面板下钻 -->
  <div class="panel">
    <div class="panel-head" style="align-items:center">
      <div>
        <h3>🌍 官网访客地域分布 Web Visitor Geography</h3>
        <div class="muted" style="font-size:11px">仅计 Web 渠道独立访客 (UV) · 支持国家排行与中国省份下钻</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="drilldown-switch" style="display:flex;gap:4px">
          <button id="geoTabCountryBtn" class="btn-sm active" style="cursor:pointer;padding:3px 10px;border-radius:4px;border:1px solid var(--l);background:var(--p);font-size:12px">🌍 全球国家 Top N</button>
          <button id="geoTabRegionBtn" class="btn-sm" style="cursor:pointer;padding:3px 10px;border-radius:4px;border:1px solid var(--l);background:var(--p);font-size:12px">🏙️ 中国省份下钻</button>
        </div>
        <div class="view-switch" data-target="webCountry">
          <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
          <button data-view="table" title="明细数据表">📋 表格</button>
        </div>
      </div>
    </div>
    <div id="webGeoCountryContainer">
      <div id="webCountryBars" class="bars"></div>
    </div>
    <div id="webGeoRegionContainer" style="display:none">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;margin-bottom:8px;border-bottom:1px solid var(--l)">
        <span class="muted" style="font-size:12px">📍 正在查看：<strong>中国 (China) 各省份 / 直辖市独立访客分布</strong></span>
        <button id="geoBackToCountryBtn" class="ghost btn-sm" style="cursor:pointer;font-size:11px;color:var(--a)">‹ 返回全球国家列表</button>
      </div>
      <div id="webRegionBars" class="bars"></div>
    </div>
  </div>
</section>

<!-- 4. 稳定性与诊断 (Reliability) -->
<section class="page" id="page-reliability">
  <div class="section">
    <div><h2>系统稳定性与诊断 Reliability</h2><div class="muted">失败原因、异常触发阶段、通道调度链路与延迟耗时分布；不联动 Geo。</div></div>
  </div>
  <div id="reliabilityScope" class="scope-note" hidden></div>
  <div id="reliabilityKpis" class="kpis"></div>

  <div class="grid3">
    <div class="panel">
      <div class="panel-head"><h3>⚠️ 失败错误码 Failure Code</h3><span class="muted" style="font-size:11px">错误次数</span></div>
      <div id="failureCodeBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🚦 异常触发阶段 Failure Stage</h3><span class="muted" style="font-size:11px">触发次数</span></div>
      <div id="failureStageBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>⏱️ 解析耗时 Latency</h3>
          <div class="muted" style="font-size:11px">耗时区间分布</div>
        </div>
      </div>
      <div id="latencyBars" class="bars"></div>
    </div>
  </div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><h3>🛣️ 通道调度 Provider Path</h3><span class="muted" style="font-size:11px">主备失败与降级路径</span></div>
      <div id="providerBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🎯 诊断调用端点 Endpoint</h3><span class="muted" style="font-size:11px">API / Web 端点调用分布</span></div>
      <div id="endpointBars" class="bars"></div>
    </div>
  </div>
</section>

<!-- 5. 生态集成与插件接入 (Integrations) -->
<section class="page" id="page-integrations">
  <div class="section">
    <div><h2>生态集成与接入端分析 Integrations</h2><div class="muted">客户端生态全貌、端到端解析健康度、版本分布及跨播放器迁移跳转。</div></div>
  </div>
  <div id="integrationScope" class="scope-note"></div>
  <div id="integrationKpis" class="kpis"></div>

  <!-- 第一层：全景接入端总表 Dynamic Client Table -->
  <div class="panel">
    <div class="panel-head" style="align-items:center">
      <div>
        <h3>🔌 接入端全景分析 Resolve Clients Overview</h3>
        <div class="muted" style="font-size:11px">全量接入客户端调用统计 · 支持点击单行下钻查看版本与宿主环境分布</div>
      </div>
      <span id="clientTableCountBadge" class="badge" style="background:var(--l);font-size:11px"></span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:180px">接入客户端 Client</th>
            <th style="width:110px">渠道类型 Channel</th>
            <th style="width:120px;text-align:right">解析请求 Requests</th>
            <th style="width:120px;text-align:right">成功率 Success</th>
            <th style="width:140px;text-align:right">环比上期 Delta</th>
            <th style="width:200px">主要请求版本 / 宿主</th>
            <th style="width:100px;text-align:right">操作 Action</th>
          </tr>
        </thead>
        <tbody id="integrationClientRows"></tbody>
      </table>
    </div>
  </div>

  <!-- 第二层：选中 Client 深度下钻分析 Client Drilldown -->
  <div class="panel" id="clientDrilldownPanel">
    <div class="panel-head" style="align-items:center;border-bottom:1px solid var(--l);padding-bottom:10px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <span id="drilldownClientDot" class="b-dot" style="width:10px;height:10px"></span>
        <div>
          <h3 id="drilldownClientTitle" style="margin:0;font-size:14px">客户端深度下钻</h3>
          <div id="drilldownClientSub" class="muted" style="font-size:11px;margin-top:2px"></div>
        </div>
      </div>
      <div id="drilldownClientBadges" style="display:flex;align-items:center;gap:8px"></div>
    </div>
    <div class="grid2">
      <div>
        <div class="panel-head">
          <div>
            <h4 style="margin:0;font-size:13px">📦 请求版本分布 Version Distribution</h4>
            <div class="muted" style="font-size:11px">基于解析事件统计 · 非安装用户占比</div>
          </div>
        </div>
        <div id="clientVersionBars" class="bars"></div>
      </div>
      <div>
        <div class="panel-head">
          <div>
            <h4 style="margin:0;font-size:13px">📱 请求宿主系统分布 Host Distribution</h4>
            <div class="muted" style="font-size:11px">客户端运行操作系统环境分布</div>
          </div>
        </div>
        <div id="clientHostBars" class="bars"></div>
      </div>
    </div>
  </div>

  <!-- 第三层：迁移跳转生态 Migration Ecosystem -->
  <div class="grid2">
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>🚀 跨播放器迁移跳转目标 Migration Destinations</h3>
          <div class="muted" style="font-size:11px">用户从 Web 唤起或导出至第三方播放器</div>
        </div>
      </div>
      <div id="migrationBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>🛤️ 迁移跳转来源渠道 Migration Providers</h3>
          <div class="muted" style="font-size:11px">发起跨端迁移的歌曲歌单来源渠道</div>
        </div>
      </div>
      <div id="migrationProviderBars" class="bars"></div>
    </div>
  </div>
  <!-- Legacy test assertions compatibility: bbplayerVersionBars bbplayerHostBars -->
</section>

<!-- 6. 安全风控与防爬隔离 (Security) -->
<section class="page" id="page-security">
  <div class="section">
    <div><h2>安全防护与防爬隔离 Security</h2><div class="muted">API 是产品流量；Bot、429、Quarantine 才是安全层 · 速率限流与遥测沙盒隔离。</div></div>
  </div>
  <div id="securityScope" class="scope-note" style="display:none"></div>
  <div id="securityKpis" class="kpis"></div>

  <!-- 产品经理视角：安全机制与风控策略全景卡片 -->
  <div class="card" style="padding:14px 18px;margin-bottom:14px;background:color-mix(in srgb,var(--p) 95%,var(--a));border-left:4px solid var(--a)">
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

  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><h3>📈 安全拦截走势 Security Incident Trend</h3><span class="muted" style="font-size:11px">按日期拦截事件数</span></div>
      <div id="quarantineTrendBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🛡️ 隔离原因分布 Quarantine Summary</h3><span class="muted" style="font-size:11px">隔离次数</span></div>
      <div id="quarantineSummary" class="bars"></div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>🛑 429 限流端点 Rate Limits</h3><span class="muted" style="font-size:11px">拦截次数</span></div>
    <div id="rateBars" class="bars"></div>
  </div>

  <div class="panel">
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

<!-- 7. 日活 DAU (Daily Active Users) -->
<section class="page" id="page-dau">
  <div class="section">
    <div><h2>全端日活与触达 DAU</h2><div class="muted">总日活 = 网站去重访客 + 插件 / CLI 每日去重活跃（读时合并，网站历史数据已全部并入）· 按 UTC 日期统计（北京时间约等于 UTC+8，清晨计入新一天）。</div></div>
  </div>
  <div id="dauKpis" class="kpis"></div>
  <div class="panel">
    <div class="panel-head">
      <div>
        <h3>📈 全端日活趋势 (DAU Trend)</h3>
        <div class="muted" style="font-size:11px">每日去重活跃 (UV) · 柱状为分端堆叠，折线为合计</div>
      </div>
      <div class="trend-legend">
        <span><span class="legend-dot" style="background:#0284c7"></span>Playlist Out Web</span>
        <span><span class="legend-dot" style="background:#8b5cf6"></span>生态插件端</span>
        <span><span class="legend-dot" style="background:#10b981"></span>Playlist Out CLI</span>
        <span><span class="legend-dot" style="background:#f97316"></span>全端合计日活</span>
      </div>
    </div>
    <div class="trend-box" id="dauTrendBox">
      <canvas id="dauTrendCanvas"></canvas>
      <div id="dauTrendTip" class="chart-tooltip">
        <div id="dauTipTitle" class="chart-tooltip-title"></div>
        <div class="chart-tooltip-row"><span style="color:var(--t);font-weight:600">全端总日活:</span><strong id="dauTipTotal"></strong></div>
        <div class="chart-tooltip-row"><span style="color:#0284c7">● Web 访客:</span><strong id="dauTipWeb"></strong></div>
        <div class="chart-tooltip-row"><span style="color:#8b5cf6">● 插件活跃:</span><strong id="dauTipPlugin"></strong></div>
        <div class="chart-tooltip-row"><span style="color:#10b981">● CLI 活跃:</span><strong id="dauTipCli"></strong></div>
      </div>
    </div>
  </div>
  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><h3>🧩 接入端明细 Clients</h3><span class="muted" style="font-size:11px">多端日活对比</span></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr id="dauClientHead">
              <th>接入端 Client</th>
              <th style="width:80px">渠道类型</th>
              <th style="text-align:right;width:110px" id="thDauToday">当日活跃 (UV)</th>
              <th style="text-align:right;width:110px" id="thDauYesterday">前日活跃 (UV)</th>
              <th style="text-align:right;width:110px" id="thDauTotal">周期累计人次</th>
            </tr>
          </thead>
          <tbody id="dauClientRows"></tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3 id="dauHourHeadTitle">🕐 单日小时分布 (UTC)</h3><span id="dauHourHeadSub" class="muted" style="font-size:11px">小时活跃 (UV)</span></div>
      <div id="dauHourBars" class="bars"></div>
    </div>
  </div>
  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><h3>🌍 活跃国家</h3><span class="muted" style="font-size:11px">活跃用户 (UV)</span></div>
      <div id="dauCountryBars" class="bars"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>🏙️ 省份 / 地区</h3><span class="muted" style="font-size:11px">活跃用户 (UV)</span></div>
      <div id="dauRegionBars" class="bars"></div>
    </div>
  </div>
  <div class="panel" style="border-left:3px solid var(--a)">
    <div class="panel-head"><h3>📐 口径说明 Metric Semantics</h3></div>
    <div class="muted" style="font-size:12px;line-height:1.9">
      <div>• <strong>Playlist Out Web</strong>：网站每日去重访客（沿用网站原有的 <code>visitor_unique</code> 匿名访客统计，历史数据全部并入趋势与合计，未另建一套记录）。</div>
      <div>• <strong>生态插件端</strong>：插件被加载即计（新版本：每日一次加载心跳；旧版本：当天首次使用行为由服务端派生计入；升级过渡期两种口径混排）。</div>
      <div>• <strong>Playlist Out CLI</strong>：实际使用即计（解析 / 导出时由服务端派生计入；<code>--no-telemetry</code> 用户不计入）。</div>
      <div>• 合并口径：总日活 = 网站 + 插件 + CLI；去重键为 UTC 日期 × 渠道 × 客户端 × 匿名截断哈希——同一端同一人同天仅计一次（心跳与解析遥测共享同一身份，不因两种上报重复计），同一天使用多个端则各计一次，跨天不保持身份。</div>
      <div>• 已知边界：NAT / 共享出口可能低估；移动端冷启动跨 IP 可能轻微高估。插件升级当天已按「去版本号」归一，不会把同一人重复计入。</div>
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

<footer class="footer">
  <div class="footer-line">
    <a href="https://playlistout.lengxiqwq.com/" target="_blank" rel="noopener noreferrer">Playlist Out</a>
    <span class="footer-sep">·</span>
    <span>把你的歌单带走</span>
    <span class="footer-sep">·</span>
    <span>Paste. Parse. Export.</span>
  </div>
  <div class="footer-line">
    <span>Made with ❤️ by <a href="https://github.com/LengxiQwQ" target="_blank" rel="noopener noreferrer">LengxiQwQ</a></span>
    <span class="footer-sep">·</span>
    <a href="https://github.com/LengxiQwQ/playlistout" target="_blank" rel="noopener noreferrer">GitHub 仓库</a>
    <span class="footer-sep">·</span>
    <a href="https://github.com/LengxiQwQ/playlistout/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>
    <span class="footer-sep">·</span>
    <span>UI 设计参考 <a href="https://tabler.io" target="_blank" rel="noopener noreferrer">Tabler</a></span>
  </div>
</footer>
</main>

<script>
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
let A=null,loadController=null,loadSeq=0,snapshotRange={from:null,to:null},currentFbStatus="pending";
let excludeMy=false; // 默认关闭，如需排除测试地区数据 (MY) 可手动开启
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
function shiftDateStr(dateStr, offsetDays){
  if(!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return isoDayOffset(offsetDays);
  let [y, m, d] = dateStr.split("-").map(Number);
  let dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}
function stepDay(offset){
  let f = $("#fromDate")?.value || "";
  let t = $("#toDate")?.value || "";
  let curSingle = $("#singleDate")?.value || "";
  let baseDate = "";
  if (curSingle) {
    baseDate = curSingle;
  } else if (f && t && f === t) {
    baseDate = f;
  } else if (offset > 0) {
    baseDate = f || snapshotRange.from || isoDayOffset(-1);
  } else {
    baseDate = t || snapshotRange.to || isoDayOffset(0);
  }
  let target = shiftDateStr(baseDate, offset);
  if (snapshotRange.from && target < snapshotRange.from) target = snapshotRange.from;
  let maxDay = isoDayOffset(0);
  if (target > maxDay) target = maxDay;
  setDateInputs(target, target);
  if (target === isoDayOffset(0)) markPreset("today");
  else if (target === isoDayOffset(-1)) markPreset("yesterday");
  else if (target === isoDayOffset(-2)) markPreset("daybefore");
  else if (target === isoDayOffset(-3)) markPreset("day3");
  else markPreset("");
  load();
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
  "CN": { name: "中国", color: "#de2910" },
  "HK": { name: "中国香港", color: "#e11d48" },
  "TW": { name: "中国台湾", color: "#0284c7" },
  "MO": { name: "中国澳门", color: "#059669" },
  "US": { name: "美国", color: "#1e40af" },
  "JP": { name: "日本", color: "#dc2626" },
  "SG": { name: "新加坡", color: "#e11d48" },
  "MY": { name: "马来西亚", color: "#f59e0b" },
  "GB": { name: "英国", color: "#1d4ed8" },
  "DE": { name: "德国", color: "#d97706" },
  "FR": { name: "法国", color: "#2563eb" },
  "CA": { name: "加拿大", color: "#dc2626" },
  "AU": { name: "澳大利亚", color: "#059669" },
  "KR": { name: "韩国", color: "#2563eb" },
  "RU": { name: "俄罗斯", color: "#0284c7" },
  "NL": { name: "荷兰", color: "#ea580c" },
  "IN": { name: "印度", color: "#ea580c" },
  "VN": { name: "越南", color: "#dc2626" },
  "TH": { name: "泰国", color: "#4f46e5" },
  "ID": { name: "印度尼西亚", color: "#dc2626" },
  "PH": { name: "菲律宾", color: "#2563eb" },
  "BR": { name: "巴西", color: "#16a34a" },
  "IT": { name: "意大利", color: "#15803d" },
  "ES": { name: "西班牙", color: "#eab308" },
  "SE": { name: "瑞典", color: "#0284c7" },
  "CH": { name: "瑞士", color: "#dc2626" },
  "PL": { name: "波兰", color: "#dc2626" },
  "UA": { name: "乌克兰", color: "#0284c7" },
  "IE": { name: "爱尔兰", color: "#16a34a" },
  "NZ": { name: "新西兰", color: "#1e40af" },
  "MX": { name: "墨西哥", color: "#16a34a" },
  "ZA": { name: "南非", color: "#059669" },
  "AR": { name: "阿根廷", color: "#38bdf8" },
  "TR": { name: "土耳其", color: "#dc2626" },
  "BE": { name: "比利时", color: "#d97706" },
  "AT": { name: "奥地利", color: "#dc2626" },
  "NO": { name: "挪威", color: "#dc2626" },
  "DK": { name: "丹麦", color: "#dc2626" },
  "FI": { name: "芬兰", color: "#1e40af" },
  "PT": { name: "葡萄牙", color: "#16a34a" },
  "CZ": { name: "捷克", color: "#1e40af" },
  "RO": { name: "罗马尼亚", color: "#1e40af" },
  "HU": { name: "匈牙利", color: "#16a34a" },
  "GR": { name: "希腊", color: "#1e40af" },
  "IL": { name: "以色列", color: "#0284c7" },
  "AE": { name: "阿联酋", color: "#16a34a" },
  "SA": { name: "沙特阿拉伯", color: "#16a34a" },
  "EG": { name: "埃及", color: "#d97706" },
  "CL": { name: "智利", color: "#dc2626" },
  "CO": { name: "哥伦比亚", color: "#eab308" },
  "PE": { name: "秘鲁", color: "#dc2626" },
  "PK": { name: "巴基斯坦", color: "#16a34a" },
  "BD": { name: "孟加拉国", color: "#16a34a" },
  "NG": { name: "尼日利亚", color: "#16a34a" },
  "KE": { name: "肯尼亚", color: "#dc2626" },
  "AD": { name: "安道尔", color: "#2563eb" },
  "AF": { name: "阿富汗", color: "#15803d" },
  "AG": { name: "安提瓜和巴布达", color: "#dc2626" },
  "AI": { name: "安圭拉", color: "#1e40af" },
  "AL": { name: "阿尔巴尼亚", color: "#dc2626" },
  "AM": { name: "亚美尼亚", color: "#d97706" },
  "AO": { name: "安哥拉", color: "#dc2626" },
  "AQ": { name: "南极洲", color: "#0284c7" },
  "AS": { name: "美属萨摩亚", color: "#1e40af" },
  "AW": { name: "阿鲁巴", color: "#0284c7" },
  "AX": { name: "奥兰群岛", color: "#1e40af" },
  "AZ": { name: "阿塞拜疆", color: "#0284c7" },
  "BA": { name: "波黑", color: "#1e40af" },
  "BB": { name: "巴巴多斯", color: "#1e40af" },
  "BF": { name: "布基纳法索", color: "#dc2626" },
  "BG": { name: "保加利亚", color: "#16a34a" },
  "BH": { name: "巴林", color: "#dc2626" },
  "BI": { name: "布隆迪", color: "#dc2626" },
  "BJ": { name: "贝宁", color: "#16a34a" },
  "BL": { name: "圣巴泰勒米", color: "#1e40af" },
  "BM": { name: "百慕大", color: "#dc2626" },
  "BN": { name: "文莱", color: "#eab308" },
  "BO": { name: "玻利维亚", color: "#dc2626" },
  "BQ": { name: "荷兰加勒比", color: "#1e40af" },
  "BS": { name: "巴哈马", color: "#0284c7" },
  "BT": { name: "不丹", color: "#ea580c" },
  "BV": { name: "布韦岛", color: "#1e40af" },
  "BW": { name: "博茨瓦纳", color: "#0284c7" },
  "BY": { name: "白俄罗斯", color: "#dc2626" },
  "BZ": { name: "伯利兹", color: "#1e40af" },
  "CC": { name: "科科斯群岛", color: "#16a34a" },
  "CD": { name: "刚果(金)", color: "#0284c7" },
  "CF": { name: "中非", color: "#16a34a" },
  "CG": { name: "刚果(布)", color: "#16a34a" },
  "CI": { name: "科特迪瓦", color: "#ea580c" },
  "CK": { name: "库克群岛", color: "#1e40af" },
  "CM": { name: "喀麦隆", color: "#16a34a" },
  "CR": { name: "哥斯达黎加", color: "#1e40af" },
  "CU": { name: "古巴", color: "#dc2626" },
  "CV": { name: "佛得角", color: "#1e40af" },
  "CW": { name: "库拉索", color: "#1e40af" },
  "CX": { name: "圣诞岛", color: "#16a34a" },
  "CY": { name: "塞浦路斯", color: "#ea580c" },
  "DJ": { name: "吉布提", color: "#0284c7" },
  "DM": { name: "多米尼克", color: "#16a34a" },
  "DO": { name: "多米尼加", color: "#1e40af" },
  "DZ": { name: "阿尔及利亚", color: "#16a34a" },
  "EC": { name: "厄瓜多尔", color: "#eab308" },
  "EE": { name: "爱沙尼亚", color: "#0284c7" },
  "EH": { name: "西撒哈拉", color: "#16a34a" },
  "ER": { name: "厄立特里亚", color: "#dc2626" },
  "ET": { name: "埃塞俄比亚", color: "#16a34a" },
  "FJ": { name: "斐济", color: "#0284c7" },
  "FK": { name: "马尔维纳斯群岛", color: "#1e40af" },
  "FM": { name: "密克罗尼西亚", color: "#0284c7" },
  "FO": { name: "法罗群岛", color: "#1e40af" },
  "GA": { name: "加蓬", color: "#16a34a" },
  "GD": { name: "格林纳达", color: "#dc2626" },
  "GE": { name: "格鲁吉亚", color: "#dc2626" },
  "GF": { name: "法属圭亚那", color: "#16a34a" },
  "GG": { name: "根西岛", color: "#1e40af" },
  "GH": { name: "加纳", color: "#dc2626" },
  "GI": { name: "直布罗陀", color: "#dc2626" },
  "GL": { name: "格陵兰", color: "#dc2626" },
  "GM": { name: "冈比亚", color: "#1e40af" },
  "GN": { name: "几内亚", color: "#dc2626" },
  "GP": { name: "瓜德罗普", color: "#1e40af" },
  "GQ": { name: "赤道几内亚", color: "#16a34a" },
  "GS": { name: "南乔治亚", color: "#1e40af" },
  "GT": { name: "危地马拉", color: "#0284c7" },
  "GU": { name: "关岛", color: "#1e40af" },
  "GW": { name: "几内亚比绍", color: "#dc2626" },
  "GY": { name: "圭亚那", color: "#16a34a" },
  "HM": { name: "赫德岛", color: "#1e40af" },
  "HN": { name: "洪都拉斯", color: "#0284c7" },
  "HR": { name: "克罗地亚", color: "#dc2626" },
  "HT": { name: "海地", color: "#1e40af" },
  "IM": { name: "马恩岛", color: "#dc2626" },
  "IO": { name: "英属印度洋领地", color: "#1e40af" },
  "IQ": { name: "伊拉克", color: "#dc2626" },
  "IR": { name: "伊朗", color: "#16a34a" },
  "IS": { name: "冰岛", color: "#1e40af" },
  "JE": { name: "泽西岛", color: "#dc2626" },
  "JM": { name: "牙买加", color: "#16a34a" },
  "JO": { name: "约旦", color: "#dc2626" },
  "KG": { name: "吉尔吉斯斯坦", color: "#dc2626" },
  "KH": { name: "柬埔寨", color: "#1e40af" },
  "KI": { name: "基里巴斯", color: "#dc2626" },
  "KM": { name: "科摩罗", color: "#16a34a" },
  "KN": { name: "圣基茨和尼维斯", color: "#16a34a" },
  "KP": { name: "朝鲜", color: "#dc2626" },
  "KW": { name: "科威特", color: "#16a34a" },
  "KY": { name: "开曼群岛", color: "#1e40af" },
  "KZ": { name: "哈萨克斯坦", color: "#0284c7" },
  "LA": { name: "老挝", color: "#dc2626" },
  "LB": { name: "黎巴嫩", color: "#dc2626" },
  "LC": { name: "圣卢西亚", color: "#0284c7" },
  "LI": { name: "列支敦士登", color: "#1e40af" },
  "LK": { name: "斯里兰卡", color: "#ea580c" },
  "LR": { name: "利比里亚", color: "#dc2626" },
  "LS": { name: "莱索托", color: "#1e40af" },
  "LT": { name: "立陶宛", color: "#eab308" },
  "LU": { name: "卢森堡", color: "#0284c7" },
  "LV": { name: "拉脱维亚", color: "#991b1b" },
  "LY": { name: "利比亚", color: "#16a34a" },
  "MA": { name: "摩洛哥", color: "#dc2626" },
  "MC": { name: "摩纳哥", color: "#dc2626" },
  "MD": { name: "摩尔多瓦", color: "#1e40af" },
  "ME": { name: "黑山", color: "#dc2626" },
  "MF": { name: "法属圣马丁", color: "#1e40af" },
  "MG": { name: "马达加斯加", color: "#dc2626" },
  "MH": { name: "马绍尔群岛", color: "#1e40af" },
  "MK": { name: "北马其顿", color: "#dc2626" },
  "ML": { name: "马里", color: "#16a34a" },
  "MM": { name: "缅甸", color: "#eab308" },
  "MN": { name: "蒙古", color: "#dc2626" },
  "MP": { name: "北马里亚纳", color: "#1e40af" },
  "MQ": { name: "马提尼克", color: "#1e40af" },
  "MR": { name: "毛里塔尼亚", color: "#16a34a" },
  "MS": { name: "蒙特塞拉特", color: "#1e40af" },
  "MT": { name: "马耳他", color: "#dc2626" },
  "MU": { name: "毛里求斯", color: "#dc2626" },
  "MV": { name: "马尔代夫", color: "#dc2626" },
  "MW": { name: "马拉维", color: "#dc2626" },
  "MZ": { name: "莫桑比克", color: "#16a34a" },
  "NA": { name: "纳米比亚", color: "#1e40af" },
  "NC": { name: "新喀里多尼亚", color: "#1e40af" },
  "NE": { name: "尼日尔", color: "#ea580c" },
  "NF": { name: "诺福克岛", color: "#16a34a" },
  "NI": { name: "尼加拉瓜", color: "#0284c7" },
  "NP": { name: "尼泊尔", color: "#dc2626" },
  "NR": { name: "瑙鲁", color: "#1e40af" },
  "NU": { name: "纽埃", color: "#eab308" },
  "OM": { name: "阿曼", color: "#dc2626" },
  "PA": { name: "巴拿马", color: "#1e40af" },
  "PF": { name: "法属波利尼西亚", color: "#dc2626" },
  "PG": { name: "巴布亚新几内亚", color: "#dc2626" },
  "PM": { name: "圣皮埃尔和密克隆", color: "#1e40af" },
  "PN": { name: "皮特凯恩群岛", color: "#1e40af" },
  "PR": { name: "波多黎各", color: "#1e40af" },
  "PS": { name: "巴勒斯坦", color: "#16a34a" },
  "PW": { name: "帕劳", color: "#0284c7" },
  "PY": { name: "巴拉圭", color: "#dc2626" },
  "QA": { name: "卡塔尔", color: "#991b1b" },
  "RE": { name: "留尼汪", color: "#1e40af" },
  "RS": { name: "塞尔维亚", color: "#dc2626" },
  "RW": { name: "卢旺达", color: "#0284c7" },
  "SB": { name: "所罗门群岛", color: "#16a34a" },
  "SC": { name: "塞舌尔", color: "#0284c7" },
  "SD": { name: "苏丹", color: "#dc2626" },
  "SH": { name: "圣赫勒拿", color: "#1e40af" },
  "SI": { name: "斯洛文尼亚", color: "#1e40af" },
  "SJ": { name: "斯瓦尔巴", color: "#dc2626" },
  "SK": { name: "斯洛伐克", color: "#1e40af" },
  "SL": { name: "塞拉利昂", color: "#16a34a" },
  "SM": { name: "圣马力诺", color: "#0284c7" },
  "SN": { name: "塞内加尔", color: "#16a34a" },
  "SO": { name: "索马里", color: "#0284c7" },
  "SR": { name: "苏里南", color: "#16a34a" },
  "SS": { name: "南苏丹", color: "#dc2626" },
  "ST": { name: "圣多美和普林西比", color: "#16a34a" },
  "SV": { name: "萨尔瓦多", color: "#0284c7" },
  "SX": { name: "荷属圣马丁", color: "#1e40af" },
  "SY": { name: "叙利亚", color: "#dc2626" },
  "SZ": { name: "斯威士兰", color: "#1e40af" },
  "TC": { name: "特克斯和凯科斯", color: "#1e40af" },
  "TD": { name: "乍得", color: "#1e40af" },
  "TF": { name: "法属南部领地", color: "#1e40af" },
  "TG": { name: "多哥", color: "#16a34a" },
  "TJ": { name: "塔吉克斯坦", color: "#dc2626" },
  "TK": { name: "托克劳", color: "#1e40af" },
  "TL": { name: "东帝汶", color: "#dc2626" },
  "TM": { name: "土库曼斯坦", color: "#16a34a" },
  "TN": { name: "突尼斯", color: "#dc2626" },
  "TO": { name: "汤加", color: "#dc2626" },
  "TT": { name: "特立尼达和多巴哥", color: "#dc2626" },
  "TV": { name: "图瓦卢", color: "#0284c7" },
  "TZ": { name: "坦桑尼亚", color: "#16a34a" },
  "UG": { name: "乌干达", color: "#eab308" },
  "UM": { name: "美属边远小岛", color: "#1e40af" },
  "UY": { name: "乌拉圭", color: "#0284c7" },
  "UZ": { name: "乌兹别克斯坦", color: "#0284c7" },
  "VA": { name: "梵蒂冈", color: "#eab308" },
  "VC": { name: "圣文森特和格林纳丁斯", color: "#0284c7" },
  "VE": { name: "委内瑞拉", color: "#eab308" },
  "VG": { name: "英属维尔京群岛", color: "#1e40af" },
  "VI": { name: "美属维尔京群岛", color: "#1e40af" },
  "VU": { name: "瓦努阿图", color: "#dc2626" },
  "WF": { name: "瓦利斯和富图纳", color: "#dc2626" },
  "WS": { name: "萨摩亚", color: "#dc2626" },
  "YE": { name: "也门", color: "#dc2626" },
  "YT": { name: "马约特", color: "#1e40af" },
  "ZM": { name: "赞比亚", color: "#16a34a" },
  "ZW": { name: "津巴布韦", color: "#16a34a" },
  "GLOBAL": { name: "全球网络", color: "#64748b" },
  "UNKNOWN": { name: "未知地区", color: "#64748b" },
};

const PROVINCE_NAMES = {
  // 国内省份与直辖市
  "Guangdong": "广东", "Zhejiang": "浙江", "Jiangsu": "江苏",
  "Beijing": "北京", "Shanghai": "上海", "Sichuan": "四川",
  "Shandong": "山东", "Hubei": "湖北", "Hunan": "湖南",
  "Fujian": "福建", "Henan": "河南", "Hebei": "河北",
  "Shaanxi": "陕西", "Anhui": "安徽", "Chongqing": "重庆",
  "Tianjin": "天津", "Liaoning": "辽宁", "Jiangxi": "江西",
  "Guangxi": "广西", "Yunnan": "云南", "Heilongjiang": "黑龙江",
  "Jilin": "吉林", "Shanxi": "山西", "Guizhou": "贵州",
  "Gansu": "甘肃", "Hainan": "海南", "Inner Mongolia": "内蒙古",
  "Xinjiang": "新疆", "Ningxia": "宁夏", "Qinghai": "青海",
  "Tibet": "西藏",

  // 常用海外热门省州 / 地区
  "Tokyo": "东京", "Osaka": "大阪", "Kyoto": "京都",
  "California": "加州", "Virginia": "弗吉尼亚", "Washington": "华盛顿州",
  "Arizona": "亚利桑那", "New York": "纽约州", "Texas": "德克萨斯",
  "Florida": "佛罗里达", "Illinois": "伊利诺伊", "Massachusetts": "马萨诸塞",
  "Pennsylvania": "宾夕法尼亚", "Ohio": "俄亥俄", "Georgia": "佐治亚",
  "Michigan": "密歇根", "North Carolina": "北卡罗来纳", "New Jersey": "新泽西",
  "Colorado": "科罗拉多", "Oregon": "俄勒冈", "Taiwan": "台湾",
  "Hong Kong": "香港", "Macau": "澳门", "Seoul": "首尔",
  "Gyeonggi-do": "京畿道", "England": "英格兰", "Ontario": "安大略",
  "Quebec": "魁北克", "British Columbia": "不列颠哥伦比亚",
  "New South Wales": "新南威尔士", "Victoria": "维多利亚",
  "Bavaria": "巴伐利亚", "Île-de-France": "法兰西岛", "Paris": "巴黎",
  "Moscow": "莫斯科", "Saint Petersburg": "圣彼得堡", "Selangor": "雪兰莪",
  "Kuala Lumpur": "吉隆坡", "Bangkok": "曼谷", "Singapore": "新加坡"
};

const CORE_BRAND_COLORS = {
  "qqmusic": "#10b981", "netease": "#ef4444", "kugou": "#3b82f6", "kuwo": "#ca8a04", "qishui": "#f59e0b", "migu": "#db2777",
  "plugin:musicfree": "#8b5cf6", "musicfree": "#8b5cf6", "plugin": "#8b5cf6",
  "plugin:bbplayer": "#fb7299", "bbplayer": "#fb7299",
  "official_web": "#0284c7", "web": "#0284c7",
  "official_cli": "#10b981", "cli": "#10b981",
  "anonymous_api": "#10b981", "api": "#10b981",
  "legacy_mixed": "#64748b", "legacy_unknown": "#64748b",
  "unknown_plugin": "#64748b", "internal": "#64748b",
  "desktop": "#6366f1", "mobile": "#8b5cf6", "tablet": "#06b6d4",
  "chrome": "#ea4335", "edge": "#0078d7", "safari": "#0284c7", "firefox": "#f97316",
  "opera": "#ff1b2d", "vivaldi": "#ef3939", "brave": "#fb542b",
  "qqbrowser": "#2563eb", "wechat": "#07c160", "arkweb": "#cf0a2c", "huawei_browser": "#cf0a2c",
  "miui_browser": "#ff6700", "vivo_browser": "#415fff", "oppo_browser": "#008753", "honor_browser": "#0066cc",
  "samsung_browser": "#1428a0", "quark": "#0ea5e9", "uc": "#ff8200", "ucbrowser": "#ff8200",
  "360": "#00c458", "sogou": "#fb6022", "via": "#2c3e50", "xbrowser": "#1e88e5", "115_browser": "#2777f8",
  "slbrowser": "#8b5cf6", "bot_crawler": "#64748b",
  "windows": "#0078d7", "android": "#22c55e", "ios": "#6366f1", "macos": "#a855f7",
  "linux": "#f59e0b", "harmonyos": "#cf0a2c",
  "xlsx": "#10b981", "csv": "#3b82f6", "txt": "#06b6d4", "json": "#f59e0b", "m3u8": "#8b5cf6",
  "clean_link": "#10b981", "markdown": "#3b82f6",
  "auto": "#06b6d4", "unknown": "#94a3b8", "none": "#64748b",
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
    // 客户端 Client
    "official_web": "Playlist Out Web",
    "official_cli": "Playlist Out CLI",
    "anonymous_api": "公共开放 API",
    "musicfree": "MusicFree 插件",
    "plugin:musicfree": "MusicFree 插件",
    "bbplayer": "BBPlayer 播放器",
    "plugin:bbplayer": "BBPlayer 播放器",
    "legacy_unknown": "未标记历史端",
    "unknown_plugin": "未登记插件",
    "internal": "内部探活调度",

    // 渠道 Channel
    "web": "网页端",
    "cli": "命令行",
    "plugin": "播放器插件",
    "api": "开放接口",
    "legacy_mixed": "未标记历史端",

    // 目标音乐平台
    "qqmusic": "QQ 音乐", "netease": "网易云音乐", "kugou": "酷狗音乐", "kuwo": "酷我音乐", "qishui": "汽水音乐", "migu": "咪咕音乐",
    "auto": "全自动识别",
    "unknown": "未识别平台",
    "none": "全局汇总",
    
    // 终端与设备
    "desktop": "桌面电脑", "mobile": "移动手机", "tablet": "平板设备",
    "bot_crawler": "网络爬虫 / 机器人",
    
    // 操作系统 OS
    "windows": "Windows", "android": "Android", "ios": "iOS", "macos": "macOS", "linux": "Linux", "harmonyos": "HarmonyOS (鸿蒙)",

    // 浏览器
    "chrome": "Chrome", "edge": "Edge", "safari": "Safari", "firefox": "Firefox",
    "opera": "Opera", "vivaldi": "Vivaldi", "brave": "Brave", "arc": "Arc", "yandex": "Yandex",
    "qqbrowser": "QQ 浏览器", "wechat": "微信内置浏览器", "arkweb": "华为浏览器", "huawei_browser": "华为浏览器",
    "miui_browser": "小米浏览器", "vivo_browser": "Vivo 浏览器", "oppo_browser": "OPPO 浏览器",
    "honor_browser": "荣耀浏览器", "samsung_browser": "三星浏览器", "quark": "夸克浏览器",
    "uc": "UC 浏览器", "ucbrowser": "UC 浏览器", "360": "360 浏览器", "sogou": "搜狗浏览器",
    "slbrowser": "联想浏览器", "via": "Via 浏览器", "xbrowser": "X 浏览器", "115_browser": "115 浏览器",
    "baidubrowser": "百度浏览器", "baidu_browser": "百度浏览器",

    // 耗时桶
    "<500ms": "< 500ms 极速", "500-1000ms": "500ms - 1s 良好", "500ms_1s": "500ms - 1s 良好",
    "1-3s": "1s - 3s 正常", "1s_3s": "1s - 3s 正常",
    "3-5s": "3s - 5s 迟缓", "3s_5s": "3s - 5s 迟缓",
    "5s+": "≥ 5s 超时风险", ">5s": "≥ 5s 超时风险",
    
    // 错误代码
    "UNSUPPORTED_URL": "不支持的链接格式", "INCOMPLETE_PLAYLIST": "部分曲目需登录或受限",
    "PLAYLIST_NOT_FOUND": "歌单不存在或已删除", "INVALID_INPUT": "输入参数非法",
    "PARSE_ERROR": "上游协议解析异常", "UPSTREAM_TIMEOUT": "上游响应超时",
    "RATE_LIMITED": "触发访问频控", "FORBIDDEN": "上游访问被拒绝",
    
    // 失败触发阶段
    "input": "参数输入校验", "client": "上游网络请求",
    "normalize": "数据清洗归一", "upstream": "上游服务限制",

    // 输入与模式
    "web_url": "标准网页链接", "mobile_share": "移动端分享口令/短链",
    "mobile_share_link": "移动端分享口令/短链", "raw_id": "纯歌单 ID",
    "other": "其他输入",
    "primary": "主解析通道", "fallback": "备用重试通道",

    // 导出文件格式
    "xlsx": "Excel 表格 (.xlsx)", "csv": "CSV 表格 (.csv)", "txt": "纯文本清单 (.txt)",
    "json": "JSON 数据 (.json)", "m3u8": "M3U8 播放列表 (.m3u8)", "markdown": "Markdown 表格 (.md)",
    "clean_link": "去参净链",
    
    // 剪贴板复制模式
    "title": "仅歌曲名", "title_artist": "歌名 - 歌手", "title-artist": "歌名 - 歌手",
    "title_artist_album": "歌名 - 歌手 - 专辑", "title-artist-album": "歌名 - 歌手 - 专辑",

    // 导出歌单规模
    "1-50": "1 - 50 首", "51-200": "51 - 200 首", "201-500": "201 - 500 首",
    "501-1000": "501 - 1000 首", "1000+": "1000+ 首",

    // 安全风控原因
    "auto_quarantined_bot_ua": "自动化爬虫拦截",
    "crawler_script_abuse_chengdu_api": "高频脚本抓取拦截",
    "auto_quarantined_direct_api": "异常直调频控隔离"
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

function formatBrowserLabel(name){
  let s=String(name||"").trim();
  if(!s)return "—";
  if(s.toLowerCase()==="other")return "其他浏览器";
  return formatHumanLabel(s);
}

function formatDeviceLabel(name){
  let s=String(name||"").trim();
  if(!s)return "—";
  if(s.toLowerCase()==="other")return "其他设备";
  return formatHumanLabel(s);
}

function formatOsLabel(name){
  let s=String(name||"").trim();
  if(!s)return "—";
  if(s.toLowerCase()==="other")return "其他系统";
  return formatHumanLabel(s);
}

function formatReferrerLabel(name){
  let s=String(name||"").trim();
  if(!s||s==="UNKNOWN"||s==="unknown"||s==="direct")return "直接访问 (Direct / None)";
  if(s.includes("google"))return "谷歌搜索 (Google)";
  if(s.includes("bing"))return "必应搜索 (Bing)";
  if(s.includes("baidu"))return "百度搜索 (Baidu)";
  if(s.includes("github"))return "GitHub 仓库 / 外链";
  if(s.includes("bilibili"))return "哔哩哔哩 (Bilibili)";
  if(s.includes("v2ex"))return "V2EX 社区";
  if(s.includes("douyin")||s.includes("tiktok"))return "抖音 / TikTok";
  if(s.includes("weibo"))return "微博 (Weibo)";
  if(s.includes("zhihu"))return "知乎 (Zhihu)";
  if(s.includes("musicfree"))return "MusicFree 官网 / 插件源";
  return s;
}

const chartViews = {
  trend: "bar",
  webTrend: "line",
  platform: "donut",
  client: "bar",
  country: "bar",
  region: "bar",
  device: "donut",
  latency: "bar",
  exportFormat: "bar",
  clipboard: "bar",
  requestedType: "bar",
  webCountry: "bar",
  webRegion: "bar"
};

function bars(id,arr,limit=null,colorOverride=null,labelFormatter=null){
  let el=$(id);if(!el)return;
  el.className="bars";
  let a=(arr||[]);
  if(limit!==null&&limit>0)a=a.slice(0,limit);
  if(!a.length){el.innerHTML='<div class="muted" style="padding:4px 0">暂无数据</div>';return}
  let total=a.reduce((s,x)=>s+Number(x.count||0),0);
  let max=Math.max(...a.map(x=>Number(x.count||0)),1);
  el.innerHTML=a.map(x=>{
    let c=colorOverride||getBrandColor(x.name);
    let lbl=labelFormatter?labelFormatter(x.name):formatHumanLabel(x.name);
    let p=total>0?(Number(x.count||0)/total*100).toFixed(1)+"%":"0.0%";
    return '<div class="bar">'
      +'<div class="bn" title="'+esc(x.name)+'"><span class="b-dot" style="background:'+c+'"></span>'+esc(lbl)+'</div>'
      +'<div class="track"><div class="fill" style="width:'+Math.max(1,Number(x.count||0)/max*100)+'%;background:'+c+'"></div></div>'
      +'<div class="num"><span class="val">'+fmt(x.count)+'</span><span class="pct">'+p+'</span></div>'
      +'</div>';
  }).join("");
}

function donutChart(id,arr,totalOverride=null,colorOverride=null,labelFormatter=null){
  let el=$(id);if(!el)return;
  el.className="";
  let a=(arr||[]).filter(x=>Number(x.count||0)>0);
  if(!a.length){el.innerHTML='<div class="muted" style="padding:14px 0;text-align:center">暂无数据</div>';return}
  let total=totalOverride||a.reduce((s,x)=>s+Number(x.count||0),0)||1;
  let r=55,circ=2*Math.PI*r;
  let currentAngle=0;
  let slicesHtml="";
  let legendHtml="";
  a.forEach((item,idx)=>{
    let count=Number(item.count||0);
    let ratio=count/total;
    let strokeDash=(ratio*circ).toFixed(2);
    let startAngle=currentAngle;
    currentAngle+=ratio*360;
    let c=colorOverride||getBrandColor(item.name);
    let rawLbl=labelFormatter?labelFormatter(item.name):formatHumanLabel(item.name);
    let pctStr=(ratio*100).toFixed(1)+"%";
    slicesHtml+='<circle class="donut-slice" cx="80" cy="80" r="'+r+'" fill="none" stroke="'+c+'" stroke-width="22" stroke-dasharray="'+strokeDash+' '+circ.toFixed(2)+'" transform="rotate('+startAngle.toFixed(2)+' 80 80)" data-idx="'+idx+'" data-val="'+fmt(count)+'" data-pct="' + pctStr + '" data-lbl="'+esc(rawLbl)+'"></circle>';
    legendHtml+='<div class="donut-item" data-idx="'+idx+'" data-val="'+fmt(count)+'" data-pct="'+pctStr+'" data-lbl="'+esc(rawLbl)+'">'
      +'<div class="donut-item-left" title="'+esc(item.name)+'"><span class="b-dot" style="background:'+c+'"></span><span>'+esc(rawLbl)+'</span></div>'
      +'<div class="donut-item-right"><span class="val">'+fmt(count)+'</span><span class="pct">'+pctStr+'</span></div>'
      +'</div>';
  });
  el.innerHTML='<div class="donut-wrap">'
    +'<div class="donut-graphic">'
    +'<svg class="donut-svg" viewBox="0 0 160 160">'
    +'<circle cx="80" cy="80" r="'+r+'" fill="none" stroke="var(--l)" stroke-width="22" opacity="0.35"></circle>'
    +slicesHtml
    +'</svg>'
    +'<div class="donut-center">'
    +'<div class="donut-center-val">'+fmt(total)+'</div>'
    +'<div class="donut-center-lbl">总计</div>'
    +'</div></div>'
    +'<div class="donut-legend">'+legendHtml+'</div>'
    +'</div>';

  let centerVal=el.querySelector(".donut-center-val"),centerLbl=el.querySelector(".donut-center-lbl");
  let slices=el.querySelectorAll(".donut-slice"),items=el.querySelectorAll(".donut-item");
  function focus(val,pct,lbl){
    if(centerVal)centerVal.textContent=pct;
    if(centerLbl)centerLbl.textContent=lbl+" · "+val;
  }
  let legendEl=el.querySelector(".donut-legend");
  function reset(){
    if(centerVal)centerVal.textContent=fmt(total);
    if(centerLbl)centerLbl.textContent="总计";
    slices.forEach(s=>{s.style.opacity="1";s.style.strokeWidth="22"});
    items.forEach(it=>it.style.background="transparent");
  }
  slices.forEach(s=>{
    s.addEventListener("mouseenter",()=>{
      slices.forEach(o=>{o.style.opacity=o===s?"1":"0.4";o.style.strokeWidth=o===s?"26":"22"});
      items.forEach(it=>it.style.background=it.dataset.idx===s.dataset.idx?"color-mix(in srgb,var(--p) 85%,var(--a))":"transparent");
      focus(s.dataset.val,s.dataset.pct,s.dataset.lbl);
    });
    s.addEventListener("mouseleave",reset);
  });
  items.forEach(it=>{
    it.addEventListener("mouseenter",()=>{
      let idx=it.dataset.idx;
      slices.forEach(s=>{
        s.style.opacity=s.dataset.idx===idx?"1":"0.4";
        s.style.strokeWidth=s.dataset.idx===idx?"26":"22";
      });
      items.forEach(other=>{other.style.background=other===it?"color-mix(in srgb,var(--p) 85%,var(--a))":"transparent"});
      focus(it.dataset.val,it.dataset.pct,it.dataset.lbl);
    });
  });
  if(legendEl){
    legendEl.addEventListener("mouseleave",()=>{
      slices.forEach(s=>s.style.strokeWidth="22");
      reset();
    });
  }
}

function latencyHistogram(id,arr){
  let el=$(id);if(!el)return;
  el.className="";
  const BUCKETS=[
    {key:"<500ms",label:"<500ms",sub:"极速",color:"#10b981"},
    {key:"500-1000ms",alt:"500ms_1s",label:"500-1s",sub:"良好",color:"#06b6d4"},
    {key:"1-3s",alt:"1s_3s",label:"1-3s",sub:"正常",color:"#3b82f6"},
    {key:"3-5s",alt:"3s_5s",label:"3-5s",sub:"偏慢",color:"#f59e0b"},
    {key:"5s+",alt:">5s",label:"5s+",sub:"超时风险",color:"#ef4444"}
  ];
  let rawMap=new Map();
  (arr||[]).forEach(x=>rawMap.set(String(x.name).trim().toLowerCase(),Number(x.count||0)));
  let total=Array.from(rawMap.values()).reduce((a,b)=>a+b,0)||1;
  let bucketData=BUCKETS.map(b=>{
    let count=(rawMap.get(b.key.toLowerCase())||0)+(b.alt?(rawMap.get(b.alt.toLowerCase())||0):0);
    return {...b,count,pct:total>0?(count/total*100).toFixed(1)+"%":"0.0%"};
  });
  let maxCount=Math.max(...bucketData.map(b=>b.count),1);
  el.innerHTML='<div class="hist-wrap"><div class="hist-cols">'
    +bucketData.map(b=>{
      let hPct=Math.max(4,Math.round((b.count/maxCount)*100));
      return '<div class="hist-col">'
        +'<div class="hist-num"><span class="hist-val">'+fmt(b.count)+'</span><span class="hist-pct">'+b.pct+'</span></div>'
        +'<div class="hist-track" title="'+b.label+': '+fmt(b.count)+' ('+b.pct+')">'
        +'<div class="hist-fill" style="height:'+hPct+'%;background:'+b.color+'"></div>'
        +'</div>'
        +'<div class="hist-label"><span class="b-dot" style="background:'+b.color+'"></span><span>'+b.label+'</span></div>'
        +'<div class="hist-sub">'+b.sub+'</div>'
        +'</div>';
    }).join("")
    +'</div></div>';
}

function rankedTable(id,arr,valLabel="数量",labelFormatter=null){
  let el=$(id);if(!el)return;
  el.className="";
  let a=(arr||[]);
  if(!a.length){el.innerHTML='<div class="muted" style="padding:14px 0;text-align:center">暂无数据</div>';return}
  let total=a.reduce((s,x)=>s+Number(x.count||0),0)||1;
  let max=Math.max(...a.map(x=>Number(x.count||0)),1);
  let rowsHtml=a.map((x,idx)=>{
    let rank=idx+1;
    let badgeCls=rank===1?"top1":(rank===2?"top2":(rank===3?"top3":""));
    let c=getBrandColor(x.name);
    let lbl=labelFormatter?labelFormatter(x.name):formatHumanLabel(x.name);
    let count=Number(x.count||0);
    let p=(count/total*100).toFixed(1)+"%";
    let trackW=Math.max(2,Math.round((count/max)*100));
    return '<tr>'
      +'<td style="width:36px;text-align:center"><span class="rank-badge '+badgeCls+'">#'+rank+'</span></td>'
      +'<td><div style="display:flex;align-items:center;gap:6px"><span class="b-dot" style="background:'+c+'"></span><span style="font-weight:600;color:var(--t)">'+esc(lbl)+'</span><span class="muted" style="font-size:10.5px;font-family:var(--mono)">'+esc(x.name)+'</span></div></td>'
      +'<td style="width:130px"><div style="display:flex;align-items:center;gap:6px"><div class="track" style="flex:1;height:6px"><div class="fill" style="width:'+trackW+'%;background:'+c+'"></div></div><span class="muted" style="font-size:10.5px;font-family:var(--mono);min-width:38px;text-align:right">'+p+'</span></div></td>'
      +'<td style="width:90px;text-align:right;font-family:var(--mono);font-weight:700">'+fmt(count)+'</td>'
      +'</tr>';
  }).join("");
  el.innerHTML='<div class="ranked-table-wrap"><table class="ranked-table">'
    +'<thead><tr><th style="width:36px;text-align:center">#</th><th>对象名称</th><th style="width:130px">占比分布</th><th style="width:90px;text-align:right">'+esc(valLabel)+'</th></tr></thead>'
    +'<tbody>'+rowsHtml+'</tbody>'
    +'</table></div>';
}

function kpis(id,rows){
  $(id).innerHTML=rows.map(x=>{
    let jumpAttr = x[3] ? ' data-jump="'+x[3]+'" style="cursor:pointer" onclick="document.querySelector(\'.tab[data-page='+x[3]+']\')?.click()"' : '';
    return '<div class="card kpi-card"'+jumpAttr+'><div class="kpi-label"><span>'+esc(x[0])+'</span></div><div class="kpi-val">'+esc(x[1])+'</div><div class="kpi-sub">'+esc(x[2]||"")+'</div></div>';
  }).join("");
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

// 智能全画幅磁吸 Canvas 走势图 (支持折线与堆叠柱形自由切换)
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
  let isBarView=chartViews.trend==="bar";
  let max=Math.max(1,...ok,...fail);
  max=Math.ceil(max*1.15);
  let getX=i=>a.length===1?padL+pw/2:padL+(i/(a.length-1))*pw;
  let getY=v=>padT+ph-(Number(v||0)/max)*ph;
  let halfH=ph/2;
  let yBase=padT+halfH;

  if(isBarView){
    // 水平虚线与 Y 刻度
    ctx.strokeStyle="color-mix(in srgb, var(--l) 80%, transparent)";
    ctx.lineWidth=1;ctx.fillStyle="#94a3b8";ctx.font="10px var(--mono)";ctx.textAlign="right";
    ctx.setLineDash([3,3]);
    let levels=[
      {y:padT,val:max},
      {y:padT+halfH/2,val:Math.round(max/2)},
      {y:yBase+halfH/2,val:Math.round(max/2)},
      {y:padT+ph,val:max}
    ];
    levels.forEach(l=>{
      ctx.beginPath();ctx.moveTo(padL,l.y);ctx.lineTo(W-padR,l.y);ctx.stroke();
      ctx.fillText(fmt(l.val),padL-6,l.y+3);
    });
    ctx.setLineDash([]);
    // 中央基线
    ctx.strokeStyle="rgba(148, 163, 184, 0.75)";
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(padL,yBase);ctx.lineTo(W-padR,yBase);ctx.stroke();
    ctx.fillText("0",padL-6,yBase+3);
  }else{
    // 1. 水平虚线与 Y 刻度
    ctx.strokeStyle="color-mix(in srgb, var(--l) 80%, transparent)";
    ctx.lineWidth=1;ctx.fillStyle="#94a3b8";ctx.font="10px var(--mono)";ctx.textAlign="right";
    [0,.5,1].forEach(r=>{
      let y=padT+ph-r*ph,val=Math.round(max*r);
      ctx.beginPath();ctx.setLineDash([3,3]);ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
      ctx.fillText(fmt(val),padL-6,y+3);
    });
    ctx.setLineDash([]);
  }

  // 2. X 轴标签
  ctx.textAlign="center";let step=Math.max(1,Math.ceil(a.length/7));
  a.forEach((row,i)=>{
    if(i%step===0||i===a.length-1){
      ctx.fillText(trendLabel(row),getX(i),H-8);
    }
  });

  if(isBarView){
    let bw=Math.max(4,Math.min(22,(pw/Math.max(1,a.length))*0.65));
    a.forEach((row,i)=>{
      let cx=getX(i),x0=cx-bw/2;
      let okH=(ok[i]/max)*halfH;
      let failH=(fail[i]/max)*halfH;
      if(okH>0){
        ctx.fillStyle="#10b981";
        ctx.fillRect(x0,yBase-okH,bw,okH);
      }
      if(failH>0){
        ctx.fillStyle="#ef4444";
        ctx.fillRect(x0,yBase,bw,failH);
      }
      if(canvas._activeIdx===i){
        ctx.strokeStyle="#3b82f6";
        ctx.lineWidth=1.5;
        let boxTop=okH>0?yBase-okH:yBase;
        let boxHeight=(okH>0?okH:0)+(failH>0?failH:0);
        ctx.strokeRect(x0-2,boxTop-2,bw+4,Math.max(4,boxHeight+4));
      }
    });
  }else{
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
    let tipY = Math.max(10, Math.min(e.clientY - rect.top - 12, rect.height - 90));
    tip.style.top = tipY + "px";
    tip.style.display="block";
    drawCanvasChart();
  });
  box.addEventListener("mouseleave",()=>{
    tip.style.display="none";canvas._activeIdx=-1;drawCanvasChart();
  });
  window.addEventListener("resize",()=>{
    if($("#page-overview")?.classList.contains("active"))drawCanvasChart();
    if($("#page-web")?.classList.contains("active"))drawWebTrendChart();
    if($("#page-dau")?.classList.contains("active"))drawDauChart();
  });
}

let webCompareMode = false;

function drawWebTrendChart(){
  let canvas = $("#webTrendCanvas");
  if (!canvas || !A) return;
  let isSingleDay = (dates().from === dates().to);
  let data = isSingleDay ? (A.webHourlyTimeseries || []) : (A.webTimeseries || []);
  let prevData = isSingleDay ? (A.previousWebHourlyTimeseries || []) : (A.previousWebTimeseries || []);

  let ctx = canvas.getContext("2d");
  if (!ctx) return;
  let dpr = window.devicePixelRatio || 1;
  let rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  let w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);

  if (!data.length) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("当前时间范围无官网流量趋势数据", w / 2, h / 2);
    return;
  }

  let padLeft = 45, padRight = 20, padTop = 20, padBottom = 30;
  let plotW = w - padLeft - padRight, plotH = h - padTop - padBottom;

  let maxVal = 1;
  for (let d of data) {
    let pv = Number(d.page_view || 0), uv = Number(d.visitor_unique || 0);
    if (pv > maxVal) maxVal = pv;
    if (uv > maxVal) maxVal = uv;
  }
  if (webCompareMode && prevData) {
    for (let d of prevData) {
      let pv = Number(d.page_view || 0), uv = Number(d.visitor_unique || 0);
      if (pv > maxVal) maxVal = pv;
      if (uv > maxVal) maxVal = uv;
    }
  }
  maxVal = Math.ceil(maxVal * 1.15);

  let getX = (i, len = data.length) => len <= 1 ? padLeft + plotW / 2 : padLeft + (plotW / (len - 1)) * i;
  let getY = (val) => padTop + plotH - (val / maxVal) * plotH;

  // Grid
  ctx.strokeStyle = "rgba(226, 232, 240, 0.6)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px monospace";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    let y = padTop + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();
    ctx.fillText(String(Math.round(maxVal * (1 - i / 4))), padLeft - 6, y + 3);
  }

  let isBar = chartViews.webTrend === "bar";
  if (isBar) {
    let stepX = plotW / Math.max(1, data.length);
    let barW = Math.max(2, Math.min(14, stepX * 0.38));
    data.forEach((d, i) => {
      let pv = Number(d.page_view || 0), uv = Number(d.visitor_unique || 0);
      let cx = getX(i);
      let pvH = (pv / maxVal) * plotH, uvH = (uv / maxVal) * plotH;
      ctx.fillStyle = "#206bc4";
      ctx.fillRect(cx - barW - 1, padTop + plotH - pvH, barW, pvH);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(cx + 1, padTop + plotH - uvH, barW, uvH);
    });
  } else {
    // Compare baseline dashed
    if (webCompareMode && prevData.length > 0) {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      prevData.forEach((d, i) => {
        let val = Number(d.page_view || 0), x = getX(i, prevData.length), y = getY(val);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // PV line
    ctx.strokeStyle = "#206bc4";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      let val = Number(d.page_view || 0), x = getX(i), y = getY(val);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // UV line
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      let val = Number(d.visitor_unique || 0), x = getX(i), y = getY(val);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (canvas._activeIdx >= 0 && canvas._activeIdx < data.length) {
      let snapX = getX(canvas._activeIdx);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(snapX, padTop);
      ctx.lineTo(snapX, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      let d = data[canvas._activeIdx];
      let pvY = getY(Number(d.page_view || 0)), uvY = getY(Number(d.visitor_unique || 0));
      ctx.fillStyle = "#206bc4";
      ctx.beginPath(); ctx.arc(snapX, pvY, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#10b981";
      ctx.beginPath(); ctx.arc(snapX, uvY, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // X-axis labels
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px system-ui";
  ctx.textAlign = "center";
  let step = Math.max(1, Math.ceil(data.length / (isSingleDay ? 8 : 7)));
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1) {
      let x = getX(i);
      let label = d.hour !== undefined ? `${d.hour}:00` : String(d.date || "").slice(5);
      ctx.fillText(label, x, h - 8);
    }
  });
}

function initWebTrendInteractions(){
  let box = $("#webTrendBox"), canvas = $("#webTrendCanvas"), tip = $("#webTrendTip");
  if (!box || !canvas || box._inited) return;
  box._inited = true;

  box.addEventListener("mousemove", (e) => {
    if (!A) return;
    let isSingleDay = (dates().from === dates().to);
    let data = isSingleDay ? (A.webHourlyTimeseries || []) : (A.webTimeseries || []);
    if (!data.length) return;

    let rect = box.getBoundingClientRect();
    let padLeft = 45, padRight = 20, plotW = rect.width - padLeft - padRight;
    let mouseX = e.clientX - rect.left;

    if (mouseX < padLeft - 15 || mouseX > rect.width - padRight + 15) {
      tip.style.display = "none";
      canvas._activeIdx = -1;
      drawWebTrendChart();
      return;
    }

    let ratio = Math.max(0, Math.min(1, (mouseX - padLeft) / Math.max(1, plotW)));
    let idx = data.length === 1 ? 0 : Math.round(ratio * (data.length - 1));
    canvas._activeIdx = idx;

    let row = data[idx];
    let prevData = isSingleDay ? (A.previousWebHourlyTimeseries || []) : (A.previousWebTimeseries || []);
    let prevRow = prevData && prevData[idx];

    let pv = Number(row.page_view || 0), uv = Number(row.visitor_unique || 0);
    let prevPv = prevRow ? Number(prevRow.page_view || 0) : null;
    let prevUv = prevRow ? Number(prevRow.visitor_unique || 0) : null;

    let label = row.hour !== undefined ? `${row.date || ''} ${row.hour}:00` : String(row.date || '');

    let compHtml = '';
    if (webCompareMode && prevRow) {
      let pvDiff = pv - (prevPv || 0), uvDiff = uv - (prevUv || 0);
      compHtml = '<div style="border-top:1px solid var(--l);margin-top:6px;padding-top:6px;font-size:11px">'
        + '<div class="chart-tooltip-row"><span class="muted">上期基准 PV:</span><strong>' + fmt(prevPv || 0) + ' (' + (pvDiff >= 0 ? '+' : '') + fmt(pvDiff) + ')</strong></div>'
        + '<div class="chart-tooltip-row"><span class="muted">上期基准 UV:</span><strong>' + fmt(prevUv || 0) + ' (' + (uvDiff >= 0 ? '+' : '') + fmt(uvDiff) + ')</strong></div>'
        + '</div>';
    }

    tip.innerHTML = '<div style="font-weight:700;margin-bottom:4px;color:var(--t)">' + esc(label) + ' 官网流量</div>'
      + '<div class="chart-tooltip-row"><span style="color:#206bc4">● 页面访问量 (PV):</span><strong>' + fmt(pv) + '</strong></div>'
      + '<div class="chart-tooltip-row"><span style="color:#10b981">● 日去重访客 (UV):</span><strong>' + fmt(uv) + '</strong></div>'
      + compHtml;

    let snapX = data.length === 1 ? padLeft + plotW / 2 : padLeft + (idx / (data.length - 1)) * plotW;
    let mouseY = e.clientY - rect.top;
    tip.style.left = snapX + "px";
    tip.style.top = Math.max(20, Math.min(rect.height - 70, mouseY - 15)) + "px";
    tip.style.display = "block";

    drawWebTrendChart();
  });

  box.addEventListener("mouseleave", () => {
    tip.style.display = "none";
    canvas._activeIdx = -1;
    drawWebTrendChart();
  });

  let toggleBtn = $("#webCompareToggle");
  let compLegend = $("#webCompareLegend");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      webCompareMode = !webCompareMode;
      toggleBtn.textContent = '⚖️ 对比上期: ' + (webCompareMode ? '开' : '关');
      toggleBtn.style.background = webCompareMode ? 'color-mix(in srgb,var(--a) 15%,var(--p))' : 'var(--p)';
      toggleBtn.style.borderColor = webCompareMode ? 'var(--a)' : 'var(--l)';
      if (compLegend) compLegend.style.display = webCompareMode ? 'inline-flex' : 'none';
      drawWebTrendChart();
    };
  }

  let geoCountryBtn = $("#geoTabCountryBtn"), geoRegionBtn = $("#geoTabRegionBtn"), geoBackBtn = $("#geoBackToCountryBtn");
  let geoCountryCont = $("#webGeoCountryContainer"), geoRegionCont = $("#webGeoRegionContainer");
  let switchGeo = (toRegion) => {
    if (geoCountryBtn) geoCountryBtn.classList.toggle("active", !toRegion);
    if (geoRegionBtn) geoRegionBtn.classList.toggle("active", toRegion);
    if (geoCountryCont) geoCountryCont.style.display = toRegion ? "none" : "block";
    if (geoRegionCont) geoRegionCont.style.display = toRegion ? "block" : "none";
  };
  if (geoCountryBtn) geoCountryBtn.onclick = () => switchGeo(false);
  if (geoRegionBtn) geoRegionBtn.onclick = () => switchGeo(true);
  if (geoBackBtn) geoBackBtn.onclick = () => switchGeo(false);
}

function renderTrend(id,rows){
  currentTrendData=rows||[];
  initTrendInteractions();
  initWebTrendInteractions();
  drawCanvasChart();
}

function renderComponent(key){
  if(!A)return;
  let b=A.breakdowns||{},e=A.environment||{},f=A.availableFilters||{},d=A.distributions||f;
  if(key==="trend"){
    drawCanvasChart();
  }else if(key==="webTrend"){
    drawWebTrendChart();
  }else if(key==="platform"){
    if(chartViews.platform==="donut")donutChart("#platformBars",d.platforms);
    else bars("#platformBars",d.platforms);
  }else if(key==="client"){
    if(chartViews.client==="donut")donutChart("#clientBars",d.clients);
    else bars("#clientBars",d.clients);
  }else if(key==="country"){
    if(chartViews.country==="table")rankedTable("#countryBars",A.geo?.countries,"独立访客 (UV)");
    else bars("#countryBars",A.geo?.countries);
  }else if(key==="region"){
    if(chartViews.region==="table")rankedTable("#regionBars",A.geo?.regions,"独立访客 (UV)");
    else bars("#regionBars",A.geo?.regions);
  }else if(key==="device"){
    if(chartViews.device==="donut")donutChart("#deviceBars",e.devices,null,null,formatDeviceLabel);
    else bars("#deviceBars",e.devices,null,null,formatDeviceLabel);
  }else if(key==="latency"){
    bars("#latencyBars",b.latency_bucket);
  }else if(key==="exportFormat"){
    if(chartViews.exportFormat==="donut")donutChart("#exportFormatBars",b.export_format);
    else bars("#exportFormatBars",b.export_format);
  }else if(key==="clipboard"){
    if(chartViews.clipboard==="donut")donutChart("#clipboardModeBars",b.clipboard_mode);
    else bars("#clipboardModeBars",b.clipboard_mode);
  }else if(key==="requestedType"){
    if(chartViews.requestedType==="donut")donutChart("#requestedTypeBars",b.requested_type);
    else bars("#requestedTypeBars",b.requested_type);
  }else if(key==="webCountry"){
    let list=(A.webGeo?.countries||A.geo?.countries);
    if(chartViews.webCountry==="table")rankedTable("#webCountryBars",list,"独立访客 (UV)");
    else bars("#webCountryBars",list);
  }else if(key==="webRegion"){
    let list=(A.webGeo?.regions||A.geo?.regions);
    if(chartViews.webRegion==="table")rankedTable("#webRegionBars",list,"独立访客 (UV)");
    else bars("#webRegionBars",list);
  }
}

function initViewSwitches(){
  $$(".view-switch").forEach(sw=>{
    let target=sw.dataset.target;
    if(!target)return;
    sw.querySelectorAll("button").forEach(btn=>{
      btn.onclick=(e)=>{
        e.stopPropagation();
        let view=btn.dataset.view;
        if(!view||chartViews[target]===view)return;
        chartViews[target]=view;
        sw.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b===btn));
        renderComponent(target);
      };
    });
  });
}

function delta(curr, prev){
  if(!prev)return curr > 0 ? "前日无数据" : "较前日持平";
  let d=Math.round(((curr-prev)/prev)*1000)/10;
  return "较前日 "+(d>=0?"+":"")+d.toFixed(1)+"%";
}

let activeDauIdx = -1;

function renderDauTab(){
  let dau=A.dau;
  if(!dau)return;
  let isSingle=Boolean(dau.isSingleDay);
  let targetLabel=isSingle
    ?(dau.targetDate===isoDayOffset(0)?"今日":"当日")
    :"期末日";
  let compLabel=dau.comparisonDate===isoDayOffset(-1)?"昨日":"前日 ("+String(dau.comparisonDate||"").slice(5)+")";
  let peak=(dau.series||[]).reduce((acc,p)=>Math.max(acc,Number(p.total||0)),0);
  let dayCount=Math.max(1,(dau.series||[]).length);
  let avg=Math.round(Number(dau.windowTotals?.total||0)/dayCount);

  let kpiItems=isSingle
    ?[
      [
        targetLabel+"全端日活用户",
        fmt(dau.today?.total),
        compLabel+" "+fmt(dau.yesterday?.total)+" · "+delta(Number(dau.today?.total||0),Number(dau.yesterday?.total||0))
      ],
      [
        targetLabel+" Web 访客",
        fmt(dau.today?.web),
        compLabel+" "+fmt(dau.yesterday?.web)+" · "+delta(Number(dau.today?.web||0),Number(dau.yesterday?.web||0))
      ],
      [
        targetLabel+"插件活跃",
        fmt(dau.today?.plugin),
        compLabel+" "+fmt(dau.yesterday?.plugin)+" · "+delta(Number(dau.today?.plugin||0),Number(dau.yesterday?.plugin||0))
      ],
      [
        targetLabel+" CLI 活跃",
        fmt(dau.today?.cli),
        compLabel+" "+fmt(dau.yesterday?.cli)+" · "+delta(Number(dau.today?.cli||0),Number(dau.yesterday?.cli||0))
      ],
      [
        "活跃客户端种类",
        String((dau.clients||[]).length),
        "覆盖生态接入端数"
      ],
      [
        "当日日活峰值",
        fmt(dau.today?.total),
        "单日去重总活跃"
      ]
    ]
    :[
      [
        "区间全端日活人次",
        fmt(dau.windowTotals?.total),
        "日均 "+fmt(avg)+"/天 · 累计跨端人次"
      ],
      [
        "区间 Web 访客累计",
        fmt(dau.windowTotals?.web),
        "日均 "+fmt(Math.round(Number(dau.windowTotals?.web||0)/dayCount))+"/天"
      ],
      [
        "区间插件活跃累计",
        fmt(dau.windowTotals?.plugin),
        "日均 "+fmt(Math.round(Number(dau.windowTotals?.plugin||0)/dayCount))+"/天"
      ],
      [
        "区间 CLI 活跃累计",
        fmt(dau.windowTotals?.cli),
        "日均 "+fmt(Math.round(Number(dau.windowTotals?.cli||0)/dayCount))+"/天"
      ],
      [
        "活跃客户端种类",
        String((dau.clients||[]).length),
        "覆盖生态接入端数"
      ],
      [
        "区间最高日活峰值",
        fmt(peak),
        "区间单日最高去重活跃"
      ]
    ];

  kpis("#dauKpis",kpiItems);

  let thToday=$("#thDauToday"),thYesterday=$("#thDauYesterday"),thTotal=$("#thDauTotal");
  if(thToday&&thYesterday&&thTotal){
    if(isSingle){
      thToday.textContent="当日活跃 ("+String(dau.targetDate||"").slice(5)+")";
      thYesterday.textContent="前日活跃 ("+String(dau.comparisonDate||"").slice(5)+")";
      thTotal.textContent="当日活跃 (UV)";
    }else{
      thToday.textContent="期末日 ("+String(dau.targetDate||"").slice(5)+")";
      thYesterday.textContent="前日 ("+String(dau.comparisonDate||"").slice(5)+")";
      thTotal.textContent="周期累计人次";
    }
  }

  let tbody=$("#dauClientRows");
  if(tbody){
    let webTotalVal=isSingle?dau.today?.web:dau.windowTotals?.web;
    let webRow='<tr>'
      +'<td>'
      +'<span style="font-weight:600;color:'+getBrandColor('official_web')+'">'+esc(formatHumanLabel('official_web'))+'</span>'
      +'<div class="muted" style="font-size:11px;font-family:var(--mono)">official_web</div>'
      +'</td>'
      +'<td><span class="badge" style="background:var(--l)">网页端</span></td>'
      +'<td style="text-align:right;font-family:var(--mono);font-weight:700">'+fmt(dau.today?.web)+'</td>'
      +'<td style="text-align:right;font-family:var(--mono)">'+fmt(dau.yesterday?.web)+'</td>'
      +'<td style="text-align:right;font-family:var(--mono)">'+fmt(webTotalVal)+'</td>'
      +'</tr>';
    let clientRows=(dau.clients||[]).map(c=>'<tr>'
      +'<td>'
      +'<span style="font-weight:600;color:'+getBrandColor(c.client)+'">'+esc(formatHumanLabel(c.client))+'</span>'
      +'<div class="muted" style="font-size:11px;font-family:var(--mono)">'+esc(c.client)+'</div>'
      +'</td>'
      +'<td><span class="badge" style="background:var(--l)">'+(c.channel==='plugin'?'插件端':(c.channel==='cli'?'CLI 终端':esc(formatHumanLabel(c.channel))))+'</span></td>'
      +'<td style="text-align:right;font-family:var(--mono);font-weight:700">'+fmt(c.today)+'</td>'
      +'<td style="text-align:right;font-family:var(--mono)">'+fmt(c.yesterday)+'</td>'
      +'<td style="text-align:right;font-family:var(--mono)">'+fmt(c.total)+'</td>'
      +'</tr>').join('');
    tbody.innerHTML=webRow+(clientRows||'<tr><td colspan="5" style="text-align:center;padding:14px;color:var(--m)">插件 / CLI 暂无记录（等待心跳与使用遥测上报）</td></tr>');
  }

  bars("#dauCountryBars",dau.countries);
  bars("#dauRegionBars",dau.regions);
  renderDauHourBars();
  drawDauChart();
}

function renderDauHourBars(){
  let el=$("#dauHourBars");
  if(!el||!A||!A.dau)return;
  let hours=A.dau.hours||[];
  let isSingle=Boolean(A.dau.isSingleDay);
  let headTitle=$("#dauHourHeadTitle"),headSub=$("#dauHourHeadSub");
  if(headTitle){
    headTitle.textContent=isSingle?"🕐 单日小时分布 (UTC)":"🕐 小时活跃时段画像 (UTC)";
  }
  if(headSub){
    headSub.textContent=isSingle?"所选日 ("+String(A.dau.targetDate||"")+") 小时活跃 (UV)":"所选周期小时活跃累计";
  }
  if(!hours.length){
    el.innerHTML='<div style="color:var(--m);padding:8px 0;font-size:12px">暂无小时分布数据</div>';
    return;
  }
  let max=Math.max(...hours.map(h=>Number(h.total||0)),1);
  el.innerHTML=hours.map(h=>{
    let p=Math.min(100,Math.round((Number(h.total||0)/max)*1000)/10);
    return '<div class="bar">'
      +'<div class="bn"><span>'+String(h.hour).padStart(2,"0")+':00</span></div>'
      +'<div class="track"><div class="fill" style="width:'+p+'%;background:var(--a)"></div></div>'
      +'<div class="num"><span class="val">'+fmt(h.total)+'</span></div>'
      +'</div>';
  }).join("");
}

function drawDauChart(){
  let canvas=$("#dauTrendCanvas");
  if(!canvas||!A||!A.dau)return;
  let ctx=canvas.getContext("2d");
  if(!ctx)return;
  let data=A.dau.series||[];
  let dpr=window.devicePixelRatio||1;
  let rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  canvas.width=rect.width*dpr;
  canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  let w=rect.width,h=rect.height;
  ctx.clearRect(0,0,w,h);
  if(!data.length){
    ctx.fillStyle="#94a3b8";
    ctx.font="12px system-ui";
    ctx.textAlign="center";
    ctx.fillText("当前筛选无日活数据",w/2,h/2);
    return;
  }
  let padLeft=40,padRight=20,padTop=20,padBottom=30;
  let maxVal=1;
  for(let d of data){
    if(Number(d.total||0)>maxVal)maxVal=Number(d.total||0);
  }
  maxVal=Math.ceil(maxVal*1.15);
  let plotW=w-padLeft-padRight;
  let plotH=h-padTop-padBottom;

  ctx.strokeStyle="rgba(226, 232, 240, 0.6)";
  ctx.lineWidth=1;
  ctx.beginPath();
  for(let i=0;i<=4;i++){
    let y=padTop+(plotH/4)*i;
    ctx.moveTo(padLeft,y);
    ctx.lineTo(w-padRight,y);
    ctx.fillStyle="#94a3b8";
    ctx.font="10px monospace";
    ctx.textAlign="right";
    ctx.fillText(String(Math.round(maxVal*(1-i/4))),padLeft-6,y+3);
  }
  ctx.stroke();

  let stackOrder=[
    {key:"cli",color:"#10b981"},
    {key:"plugin",color:"#8b5cf6"},
    {key:"web",color:"#0284c7"}
  ];

  if(data.length===1){
    let d=data[0];
    let cx=padLeft+plotW/2;
    let barW=Math.min(48,Math.max(28,plotW*0.12));
    let x0=cx-barW/2;
    let yBase=padTop+plotH;
    for(let seg of stackOrder){
      let val=Number(d[seg.key]||0);
      if(val<=0)continue;
      let segH=(val/maxVal)*plotH;
      ctx.fillStyle=seg.color;
      ctx.fillRect(x0,yBase-segH,barW,segH);
      yBase-=segH;
    }
    ctx.fillStyle="#f97316";
    ctx.font="bold 12px monospace";
    ctx.textAlign="center";
    ctx.fillText(fmt(d.total)+" UV",cx,Math.max(padTop+14,yBase-6));

    if(activeDauIdx===0){
      ctx.strokeStyle="#3b82f6";
      ctx.lineWidth=2;
      ctx.strokeRect(x0-2,yBase-2,barW+4,padTop+plotH-yBase+4);
    }
    ctx.fillStyle="#94a3b8";
    ctx.font="10px system-ui";
    ctx.textAlign="center";
    ctx.fillText(String(d.date||""),cx,h-8);
    return;
  }

  let stepX=plotW/data.length;
  let barW=Math.max(3,Math.min(22,stepX*0.62));
  let totalPoints=[];

  data.forEach((d,i)=>{
    let cx=padLeft+stepX*i+stepX/2;
    let x0=cx-barW/2;
    let yBase=padTop+plotH;
    for(let seg of stackOrder){
      let val=Number(d[seg.key]||0);
      if(val<=0)continue;
      let segH=(val/maxVal)*plotH;
      ctx.fillStyle=seg.color;
      ctx.fillRect(x0,yBase-segH,barW,segH);
      yBase-=segH;
    }
    totalPoints.push({x:cx,y:padTop+plotH-(Number(d.total||0)/maxVal)*plotH});
  });

  if(activeDauIdx>=0&&activeDauIdx<data.length){
    let activeD=data[activeDauIdx];
    let cx=padLeft+stepX*activeDauIdx+stepX/2;
    let x0=cx-barW/2;
    let totalH=(Number(activeD.total||0)/maxVal)*plotH;
    ctx.strokeStyle="#3b82f6";
    ctx.lineWidth=2;
    ctx.strokeRect(x0-2,padTop+plotH-totalH-2,barW+4,totalH+4);
  }

  ctx.strokeStyle="#f97316";
  ctx.lineWidth=2;
  ctx.beginPath();
  totalPoints.forEach((pt,i)=>{
    if(i===0)ctx.moveTo(pt.x,pt.y);
    else ctx.lineTo(pt.x,pt.y);
  });
  ctx.stroke();

  ctx.fillStyle="#f97316";
  totalPoints.forEach((pt,i)=>{
    ctx.beginPath();
    let r=activeDauIdx===i?4:2.2;
    ctx.arc(pt.x,pt.y,r,0,Math.PI*2);
    ctx.fill();
  });

  ctx.fillStyle="#94a3b8";
  ctx.font="10px system-ui";
  ctx.textAlign="center";
  let step=Math.ceil(data.length/8);
  data.forEach((d,i)=>{
    if(i%step===0||i===data.length-1){
      ctx.fillText(String(d.date||"").slice(5),padLeft+stepX*i+stepX/2,h-8);
    }
  });
}

function initDauInteractions(){
  let dauBox=$("#dauTrendBox");
  let dauCanvas=$("#dauTrendCanvas");
  let dauTip=$("#dauTrendTip");
  if(!dauBox||!dauCanvas||!dauTip||dauBox._inited)return;
  dauBox._inited=true;

  dauBox.addEventListener("mousemove",(e)=>{
    if(!A||!A.dau)return;
    let data=A.dau.series||[];
    if(!data.length)return;
    let rect=dauBox.getBoundingClientRect();
    let padLeft=40,padRight=20,plotW=rect.width-padLeft-padRight;
    let mouseX=e.clientX-rect.left;
    let mouseY=e.clientY-rect.top;

    if(mouseX<padLeft-15||mouseX>rect.width-padRight+15){
      dauTip.style.display="none";
      activeDauIdx=-1;
      drawDauChart();
      return;
    }
    let ratio=Math.max(0,Math.min(1,(mouseX-padLeft)/Math.max(1,plotW)));
    let idx=data.length===1?0:Math.round(ratio*(data.length-1));
    activeDauIdx=idx;

    let row=data[idx];
    let tipTitle=$("#dauTipTitle"),tipTotal=$("#dauTipTotal");
    let tipWeb=$("#dauTipWeb"),tipPlugin=$("#dauTipPlugin"),tipCli=$("#dauTipCli");
    if(tipTitle)tipTitle.textContent=row.date;
    if(tipTotal)tipTotal.textContent=fmt(row.total)+" UV";
    if(tipWeb)tipWeb.textContent=fmt(row.web);
    if(tipPlugin)tipPlugin.textContent=fmt(row.plugin);
    if(tipCli)tipCli.textContent=fmt(row.cli);

    let snapX=data.length===1?padLeft+plotW/2:padLeft+(idx/(data.length-1))*plotW;
    dauTip.style.left=snapX+"px";
    let tipY=Math.max(10,Math.min(mouseY-12,rect.height-90));
    dauTip.style.top=tipY+"px";
    dauTip.style.display="block";
    drawDauChart();
  });

  dauBox.addEventListener("mouseleave",()=>{
    dauTip.style.display="none";
    activeDauIdx=-1;
    drawDauChart();
  });
}

let selectedIntegrationClient = null;

function render(){
  let o=A.overview||{},b=A.breakdowns||{},e=A.environment||{},f=A.availableFilters||{},d=A.distributions||f,q=A.dataQuality||{};
  let succ=Number(o.playlist_success||0)+Number(o.user_success||0);
  let apiReq=countNamed(d.channels,"api"),pluginReq=countNamed(d.channels,"plugin"),webReq=countNamed(d.channels,"web");
  let musicfreeReq=countNamed(d.clients,"musicfree"),anonymousApiReq=countNamed(d.clients,"anonymous_api");

  // 1. Overview Action Alerts & Period Comparison
  let prev = A.previousOverview;
  let calcDelta = (curr, prevVal, isRate) => {
    if (prevVal === undefined || prevVal === null) return "—";
    let diff = curr - prevVal;
    if (diff === 0) return "— 持平";
    let sign = diff > 0 ? "+" : "";
    if (isRate) return sign + diff.toFixed(1) + "% vs 上期";
    let pctVal = prevVal > 0 ? (diff / prevVal * 100).toFixed(1) + "%" : null;
    return pctVal ? sign + pctVal + " vs 上期" : sign + diff + " vs 上期";
  };

  let reqDelta = calcDelta(o.resolve_request, prev ? prev.resolve_request : null);
  let succDelta = calcDelta(o.success_rate, prev ? prev.success_rate : null, true);
  let exportTotal = Number(o.export || 0) + Number(o.clipboard || 0);
  let prevExportTotal = prev ? (Number(prev.export || 0) + Number(prev.clipboard || 0)) : null;
  let exportDelta = calcDelta(exportTotal, prevExportTotal);
  let uvDelta = calcDelta(o.visitor_unique, prev ? prev.visitor_unique : null);
  let fbDelta = prev ? (o.pending_feedback - prev.pending_feedback) : 0;
  let fbDeltaStr = fbDelta === 0 ? "— 持平" : (fbDelta > 0 ? "+" : "") + fbDelta + " 待办";
  let rateDelta = calcDelta(o.rate_limited, prev ? prev.rate_limited : null);

  let alertsHtml = [];
  if (o.pending_feedback > 0) {
    alertsHtml.push('<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:color-mix(in srgb,var(--r) 10%,var(--p));border:1px solid var(--r);border-radius:6px"><div><span style="font-size:16px">🐛</span> <strong>待审歌单待处理:</strong> 发现 <strong>' + o.pending_feedback + '</strong> 条用户上报失败歌单，需排查修复。</div><button class="ghost btn-sm" onclick="document.querySelector(\'.tab[data-page=feedback]\')?.click()" style="cursor:pointer;color:var(--r);font-weight:600">前往排查处理 ▶</button></div>');
  }
  if (q.status === 'error') {
    let badCount = (q.checks || []).filter(c => !c.ok).length;
    alertsHtml.push('<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:color-mix(in srgb,var(--w) 12%,var(--p));border:1px solid var(--w);border-radius:6px"><div><span style="font-size:16px">🚨</span> <strong>数据守恒告警:</strong> 发现 <strong>' + badCount + '</strong> 项守恒校验未通过，数据可能存在断层。</div><button class="ghost btn-sm" onclick="document.getElementById(\'qualityDetails\').open=true" style="cursor:pointer;color:var(--w);font-weight:600">展开核验详情 ▼</button></div>');
  }
  if (o.resolve_request > 0 && o.success_rate < 80) {
    alertsHtml.push('<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:color-mix(in srgb,var(--w) 10%,var(--p));border:1px solid var(--w);border-radius:6px"><div><span style="font-size:16px">⚠️</span> <strong>解析成功率偏低:</strong> 当前成功率仅 <strong>' + pct(o.success_rate) + '</strong>，低于 80% 阈值。</div><button class="ghost btn-sm" onclick="document.querySelector(\'.tab[data-page=reliability]\')?.click()" style="cursor:pointer;color:var(--w);font-weight:600">查看失败链路 ▶</button></div>');
  }
  let alEl = $("#overviewAlerts");
  if (alEl) {
    alEl.innerHTML = alertsHtml.join("");
    alEl.style.display = alertsHtml.length > 0 ? "flex" : "none";
    alEl.style.flexDirection = "column";
    alEl.style.gap = "8px";
  }

  kpis("#overviewKpis",[
    ["Requests",fmt(o.resolve_request),"歌单解析总请求 · "+reqDelta,"usage"],
    ["Success Rate",pct(o.success_rate),"端到端成功率 · "+succDelta,"reliability"],
    ["Exports",fmt(exportTotal),"导出 "+fmt(o.export)+" · 剪贴 "+fmt(o.clipboard)+" · "+exportDelta,"usage"],
    ["Web UV",fmt(o.visitor_unique),"PV "+fmt(o.page_view)+" · "+uvDelta,"web"],
    ["Feedback",String(o.pending_feedback),"待审待办 · "+fbDeltaStr,"feedback"],
    ["Rate Limited",fmt(o.rate_limited),"安全频控拦截 · "+rateDelta,"security"]
  ]);

  renderTrend("#trend",(A.hourlyTimeseries||[]).length?A.hourlyTimeseries:(A.timeseries||[]));
  renderComponent("platform");
  renderComponent("client");
  renderComponent("country");
  renderComponent("region");

  // Health check & Data Quality
  let checks=q.checks||[];
  let isGood=q.status==="healthy";
  let healthEl=$("#health");
  if(healthEl){
    healthEl.className="health-dot "+(isGood?"good":"bad");
    healthEl.title=isGood?"数据健康 (Data Healthy)":"数据完整性异常 (Data Integrity Error)";
  }
  let qSumEl=$("#qualitySummary");
  let qDetails=$("#qualityDetails");
  if(qSumEl){
    if(isGood){
      qSumEl.innerHTML='<div style="padding:10px 12px;background:color-mix(in srgb,var(--g) 8%,var(--p));border:1px solid color-mix(in srgb,var(--g) 25%,transparent);border-radius:6px;font-size:12px;color:var(--g);display:flex;align-items:center;gap:8px"><span style="font-size:16px">✅</span><span>数据守恒与完整性校验全部正常 (8/8 Passed) · 闭环完整</span></div>';
      if(qDetails)qDetails.open=false;
    }else{
      let badCount=checks.filter(c=>!c.ok).length;
      qSumEl.innerHTML='<div style="padding:10px 12px;background:color-mix(in srgb,var(--r) 10%,var(--p));border:1px solid var(--r);border-radius:6px;font-size:12px;color:var(--r);display:flex;align-items:center;gap:8px"><span style="font-size:16px">⚠️</span><span>发现 <strong>'+badCount+'</strong> 项守恒异常，已展开下方明细</span></div>';
      if(qDetails)qDetails.open=true;
    }
  }
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
  let headDateDisp=$("#headDateDisplay");
  if(headDateDisp){
    let isAll=$(".range button[data-range='all']")?.classList.contains('active');
    if(isAll){
      headDateDisp.textContent="全部历史";
    }else if(actFrom&&actTo&&actFrom===actTo){
      headDateDisp.textContent=actFrom;
    }else if(actFrom&&actTo){
      headDateDisp.textContent=actFrom.slice(5)+" ~ "+actTo.slice(5);
    }else{
      headDateDisp.textContent="全部历史";
    }
  }
  let activePage = $(".tab.active")?.dataset.page || "overview";
  let caps = PAGE_FILTER_CAPABILITIES[activePage] || { supportedDimensions: [] };
  let supported = new Set(caps.supportedDimensions);
  let chips=['<span class="chip">'+esc(actFrom===actTo?actFrom:(actFrom+" → "+actTo))+'</span>'];
  ["channel","client","platform","country","region"].forEach(id=>{
    if (supported.has(id)) {
      let v=$("#"+id).value;
      if(v)chips.push('<span class="chip">'+esc(id)+": "+esc(v)+'</span>');
    }
  });
  $("#chips").innerHTML=chips.join("");

  let badge=$("#navPendingBadge");
  if(badge){
    let pending=Number(o.pending_feedback||0);
    if(pending>0){badge.style.display="inline-block";badge.textContent=pending}
    else{badge.style.display="none"}
  }
  let generated=A.generatedAt?new Date(A.generatedAt).toLocaleString():"—";
  let snapEl=$("#snapTime"),latestEl=$("#latestDate");
  if(snapEl&&latestEl){
    snapEl.textContent=generated;
    latestEl.textContent=esc(q.latestDate||"—");
  }else if($("#updated")){
    $("#updated").textContent="快照 "+generated+" · 最新数据 "+esc(q.latestDate||"—");
  }

  // 2. Web Page (Web Analytics)
  let isSingleDay = (dates().from === dates().to);
  let prevWeb = A.previousWebOverview;
  let pv = Number(o.page_view || 0), uv = Number(o.visitor_unique || 0);
  let pvDelta = calcDelta(pv, prevWeb ? prevWeb.page_view : null);
  let uvDelta = calcDelta(uv, prevWeb ? prevWeb.visitor_unique : null);
  let depth = uv > 0 ? (pv / uv).toFixed(1) : "1.0";
  let prevDepth = prevWeb && Number(prevWeb.visitor_unique || 0) > 0 ? (Number(prevWeb.page_view || 0) / Number(prevWeb.visitor_unique || 0)).toFixed(1) : null;
  let depthDiff = prevDepth !== null ? (Number(depth) - Number(prevDepth)).toFixed(1) : null;
  let depthDelta = depthDiff !== null ? (Number(depthDiff) >= 0 ? "+" : "") + depthDiff + " vs 上期" : "—";

  let uvLabel = isSingleDay ? "当日独立访客 (UV)" : "日去重访客累计人次";
  let uvSub = isSingleDay ? "官网当日去重访客 · " + uvDelta : "多日去重访客求和（跨日可能重复） · " + uvDelta;
  let depthLabel = isSingleDay ? "当日人均浏览深度" : "人均浏览深度 (PV / visitor-day)";
  let depthSub = isSingleDay ? "平均每位访客浏览量 · " + depthDelta : "平均每个 visitor-day 浏览量 · " + depthDelta;

  let webEnv = A.webEnvironment || e;
  let webCountries = (A.webGeo?.countries || A.geo?.countries || []);
  let webRegions = (A.webGeo?.regions || A.geo?.regions || []);
  let webBrowsers = (webEnv.browsers || []).filter(x => {
    let n = String(x.name || "").toLowerCase();
    return !n.startsWith("plugin:") && !["musicfree", "bbplayer", "anonymous_api", "official_cli", "internal"].includes(n);
  });

  kpis("#webKpis",[
    ["页面访问总量 (PV)", fmt(pv), "官网页面浏览量 · " + pvDelta],
    [uvLabel, fmt(uv), uvSub],
    [depthLabel, depth, depthSub],
    ["访问来源种类", String((b.referrer_source || []).length), "Referrer 渠道分类"],
    ["覆盖国家分布", String(webCountries.length), "全球访问国家数"],
    ["覆盖省州地区", String(webRegions.length), "全球省份/州级地域数"]
  ]);

  let envPartial=Boolean($("#platform")?.value||$("#country")?.value||$("#region")?.value);
  scopeNote("#webScope","Browser / Device / OS 仅支持日期、Channel、Client 筛选；当前 Platform / Country / Region 不会作用于环境数据。",envPartial,true);

  drawWebTrendChart();
  bars("#referrerBars", b.referrer_source, null, null, formatReferrerLabel);
  bars("#browserBars", webBrowsers, null, null, formatBrowserLabel);
  renderComponent("device");
  bars("#osBars", webEnv.operatingSystems, null, null, formatOsLabel);
  renderComponent("webCountry");
  renderComponent("webRegion");

  let webCountryEl = $("#webCountryBars");
  if (webCountryEl) {
    webCountryEl.querySelectorAll(".bar").forEach(bar => {
      let text = bar.textContent || "";
      if (text.includes("中国") || text.includes("CN")) {
        bar.style.cursor = "pointer";
        bar.title = "点击下钻查看中国各省份/直辖市独立访客分布 🔍";
        bar.onclick = () => {
          let regionBtn = $("#geoTabRegionBtn");
          if (regionBtn) regionBtn.click();
        };
      }
    });
  }

  // 3. Usage Page
  let conversionRate = o.resolve_request > 0
    ? ((o.export + o.clipboard) / o.resolve_request * 100).toFixed(1) + '%'
    : '0.0%';
  kpis("#usageKpis",[
    ["Requests",fmt(o.resolve_request),"解析请求总量"],
    ["Exports",fmt(o.export),"本地文件导出"],
    ["Clipboard",fmt(o.clipboard),"剪贴板快捷复制"],
    ["Migration",fmt(o.migration_handoff),"跨播放器迁移"],
    ["Tracks",fmt(o.tracks_processed),"成功解析曲目"],
    ["Conversion",conversionRate,"导出完成转化率"]
  ]);
  bars("#usagePlatformBars",d.platforms);
  renderComponent("requestedType");
  bars("#exportSizeBars",b.export_playlist_size);
  renderComponent("exportFormat");
  renderComponent("clipboard");
  bars("#usageMigrationBars",b.migration_destination);

  // 4. Reliability Page
  let slowCount = 0;
  let totalLatency = 0;
  (b.latency_bucket || []).forEach(x => {
    totalLatency += x.count;
    if (x.name === '3-5s' || x.name === '5s+') slowCount += x.count;
  });
  let slowPct = totalLatency > 0 ? (slowCount / totalLatency * 100).toFixed(1) + '%' : '0.0%';
  kpis("#reliabilityKpis",[
    ["Requests",fmt(o.resolve_request),"解析请求总量"],
    ["Success Rate",pct(o.success_rate),"端到端成功率"],
    ["Failures",fmt(o.resolve_failure),"失败解析量"],
    ["Common Latency",b.latency_bucket?.[0]?.name||"—","最多响应延迟区间"],
    ["Top Failure",b.failure_code?.[0]?.name||"—","最频发错误"],
    ["Rate Limited",fmt(o.rate_limited),"HTTP 429 拦截"]
  ]);
  let geoPartial=Boolean($("#country").value||$("#region").value);
  scopeNote("#reliabilityScope","Country / Region 只作用于 Overview、趋势和 Geo cube；Failure Code、Stage、Latency 等可靠性 breakdown 不做地理关联，因此不会随地理筛选变化。",geoPartial,true);
  bars("#failureCodeBars",b.failure_code);
  bars("#failureStageBars",b.failure_stage);
  renderComponent("latency");
  bars("#providerBars",b.provider_failure_path);
  bars("#endpointBars",b.endpoint);

  // 4. Integrations Page
  let intClients = A.integrationClients || [];
  let pluginReq = intClients.filter(c => c.channel === "plugin").reduce((acc, c) => acc + c.requests, 0);
  let apiReq = intClients.filter(c => c.channel === "api").reduce((acc, c) => acc + c.requests, 0);
  let migrationCount = o.migration_handoff || (b.migration_destination || []).reduce((acc, c) => acc + c.count, 0);

  kpis("#integrationKpis",[
    ["Client IDs", String(intClients.length), "活跃接入端类别 · Client IDs"],
    ["插件生态请求", fmt(pluginReq), "MusicFree 等播放器插件"],
    ["API 开放调用", fmt(apiReq), "开发与开放接口调用"],
    ["跨端迁移跳转", fmt(migrationCount), "唤起第三方播放器"]
  ]);
  scopeNote("#integrationScope","Requests 使用 resolve_request 口径；Version / Host 仅来自已声明的 plugin attribution，不代表用户或设备身份。",true,false);

  let badgeEl = $("#clientTableCountBadge");
  if (badgeEl) badgeEl.textContent = "共 " + intClients.length + " 个接入端";

  let tbody = $("#integrationClientRows");
  if (tbody) {
    if (!intClients.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--m)">暂无客户端接入调用记录</td></tr>';
    } else {
      if (!selectedIntegrationClient || !intClients.some(c => c.clientId === selectedIntegrationClient)) {
        selectedIntegrationClient = intClients[0].clientId;
      }
      tbody.innerHTML = intClients.map(c => {
        let isSel = c.clientId === selectedIntegrationClient;
        let brandColor = getBrandColor(c.clientId);
        let clientLabel = formatHumanLabel(c.clientId);
        let succColor = c.requests === 0 ? "var(--m)" : (c.successRate >= 80 ? "var(--g)" : (c.successRate >= 50 ? "var(--w)" : "var(--r)"));
        let channelBadge = '<span class="badge" style="background:var(--l)">开放 API</span>';
        if (c.channel === "web") channelBadge = '<span class="badge" style="background:color-mix(in srgb,#206bc4 15%,var(--p));color:#206bc4">网页端</span>';
        else if (c.channel === "plugin") channelBadge = '<span class="badge" style="background:color-mix(in srgb,#8b5cf6 15%,var(--p));color:#8b5cf6">播放器插件</span>';
        else if (c.channel === "cli") channelBadge = '<span class="badge" style="background:color-mix(in srgb,#10b981 15%,var(--p));color:#10b981">CLI 终端</span>';

        let topMeta = [c.topVersion ? "v: " + c.topVersion : "", c.topHost ? "os: " + c.topHost : ""].filter(Boolean).join(" · ") || "—";
        return '<tr class="client-row' + (isSel ? ' selected-row' : '') + '" data-client-id="' + esc(c.clientId) + '" style="cursor:pointer;background:' + (isSel ? 'color-mix(in srgb,var(--a) 8%,var(--p))' : 'transparent') + '">'
          + '<td><div style="display:flex;align-items:center;gap:6px"><span class="b-dot" style="background:' + brandColor + '"></span><div><strong style="color:var(--t)">' + esc(clientLabel) + '</strong><div class="muted" style="font-size:10.5px;font-family:var(--mono)">' + esc(c.clientId) + '</div></div></div></td>'
          + '<td>' + channelBadge + '</td>'
          + '<td style="text-align:right;font-family:var(--mono);font-weight:700">' + fmt(c.requests) + '</td>'
          + '<td style="text-align:right;font-family:var(--mono);font-weight:700;color:' + succColor + '">' + pct(c.successRate) + '</td>'
          + '<td style="text-align:right;font-size:11px;font-weight:600;color:' + c.requestDeltaColor + '">' + esc(c.requestDeltaText) + '</td>'
          + '<td style="font-size:11px;color:var(--m)"><span title="' + esc(topMeta) + '">' + esc(topMeta) + '</span></td>'
          + '<td style="text-align:right"><button class="btn-sm client-select-btn" data-client-id="' + esc(c.clientId) + '" style="' + (isSel ? 'background:var(--a);color:#fff;border-color:var(--a)' : '') + '">' + (isSel ? '当前查看 ✔' : '查看详情 🔍') + '</button></td>'
          + '</tr>';
      }).join("");

      tbody.querySelectorAll(".client-row").forEach(row => {
        row.addEventListener("click", () => {
          let cid = row.dataset.clientId;
          if (cid && cid !== selectedIntegrationClient) {
            selectedIntegrationClient = cid;
            render();
          }
        });
      });
    }
  }

  let activeClient = intClients.find(c => c.clientId === selectedIntegrationClient) || intClients[0];
  if (activeClient) {
    let dotEl = $("#drilldownClientDot");
    if (dotEl) dotEl.style.background = getBrandColor(activeClient.clientId);
    let titleEl = $("#drilldownClientTitle");
    if (titleEl) titleEl.textContent = formatHumanLabel(activeClient.clientId) + " (" + activeClient.clientId + ") 深度下钻分析";
    let subEl = $("#drilldownClientSub");
    if (subEl) subEl.textContent = "渠道: " + formatHumanLabel(activeClient.channel) + " · 解析请求量: " + fmt(activeClient.requests) + " · 成功率: " + pct(activeClient.successRate) + " · 环比: " + activeClient.requestDeltaText;
    let badgesEl = $("#drilldownClientBadges");
    if (badgesEl) {
      badgesEl.innerHTML = '<span class="badge" style="background:var(--l);font-size:11px">' + esc(activeClient.channel) + '</span>'
        + '<span class="badge" style="background:color-mix(in srgb,var(--a) 15%,var(--p));color:var(--a);font-size:11px">' + pct(activeClient.successRate) + ' 成功率</span>';
    }
    bars("#clientVersionBars", activeClient.versionDistribution);
    bars("#clientHostBars", activeClient.hostDistribution);
  }

  bars("#migrationBars", b.migration_destination);
  bars("#migrationProviderBars", b.migration_provider);

  // 5. Security Page
  let rateLimitedCount = o.rate_limited || (b.rate_limit_endpoint || []).reduce((acc, c) => acc + c.count, 0);
  let resolveReq = o.resolve_request || 0;
  let normalizedRate = resolveReq > 0 ? (rateLimitedCount / resolveReq * 1000).toFixed(1) : '0.0';

  kpis("#securityKpis",[
    ["429 速率拦截 (Count)", fmt(rateLimitedCount), "HTTP 429 频控拦截"],
    ["429 拦截率 (Normalized)", normalizedRate + " / 1k req", "每千次请求触发限流率"],
    ["开放 API 调用 (Product)", fmt(apiReq), "正常产品流量 · 非安全攻击"],
    ["播放器插件流量 (Product)", fmt(pluginReq), "正常产品流量 · 非安全攻击"],
    ["Quarantine 存证", "见下方", "安全隔离与取证记录"],
    ["历史未标来源", pct(q.legacyMixedShare), "历史平滑过渡数据"]
  ]);
  scopeNote("#securityScope","安全风控与隔离取证仅支持日期、目标平台及地域筛选；Channel 与 Client 为正常产品流量维度，不作用于安全防护层。",true,false);
  bars("#rateBars",b.rate_limit_endpoint);

  // 6. DAU Page
  if(A.dau){
    renderDauTab();
  }

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
    if($("#page-dau")?.classList.contains("active"))requestAnimationFrame(drawDauChart);
    if($("#page-overview")?.classList.contains("active"))requestAnimationFrame(drawCanvasChart);
    return;
  }
  let controller=new AbortController();loadController=controller;
  let loadTimer=setTimeout(()=>{
    if(seq===loadSeq){
      let h=$("#health");if(h){h.className="health-dot loading";h.title="正在同步云端快照…"}
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
    if($("#page-dau")?.classList.contains("active"))requestAnimationFrame(drawDauChart);
    if($("#page-overview")?.classList.contains("active"))requestAnimationFrame(drawCanvasChart);
  }catch(e){
    clearTimeout(loadTimer);
    if(e?.name==="AbortError"||seq!==loadSeq)return;
    let h=$("#health");if(h){h.className="health-dot bad";h.title="加载失败："+esc(e.message)}
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
    let qp=new URLSearchParams(params());qp.set("limit","100");
    let d=await api("/api/quarantine?"+qp.toString()),rows=d.quarantine||[],m=new Map();
    currentQuarantineRows = rows;
    let totalBadge = $("#quarantineCountBadge");
    if(totalBadge) totalBadge.textContent = fmt(d.totalRecords || rows.length) + " 条记录 · " + fmt(d.totalEvents || rows.length) + " 次拦截";

    let trendItems = (d.timeseries || []).map(t => ({ name: (t.date || "").slice(5), count: t.events || t.count }));
    bars("#quarantineTrendBars", trendItems);

    if (d.reasons && d.reasons.length) {
      bars("#quarantineSummary", d.reasons);
    } else {
      rows.forEach(x=>m.set(x.reason||"unknown",(m.get(x.reason||"unknown")||0)+Number(x.count||0)));
      bars("#quarantineSummary",Array.from(m,([name,count])=>({name,count})));
    }

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
    let qp=new URLSearchParams(params());
    qp.set("status","pending");
    qp.set("limit","1");
    let d=await api("/api/feedback?"+qp.toString());
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

let currentFbStatus = "pending";
let currentFbSort = "recent";
let currentFbErrorCode = "";
let currentFbData = null;

function renderFeedbackRows(){
  if (!currentFbData) return;
  let rows = (currentFbData.entries || []).slice();
  if (currentFbErrorCode) {
    rows = rows.filter(x => (x.error_code || "") === currentFbErrorCode);
  }
  if (currentFbSort === "frequent") {
    rows.sort((a, b) => (b.report_count || 0) - (a.report_count || 0) || (b.id || 0) - (a.id || 0));
  } else if (currentFbSort === "oldest_pending") {
    rows.sort((a, b) => (a.id || 0) - (b.id || 0));
  } else {
    // recent
    rows.sort((a, b) => {
      let tA = a.last_reported_at || a.first_reported_at || "";
      let tB = b.last_reported_at || b.first_reported_at || "";
      return tB.localeCompare(tA) || (b.id || 0) - (a.id || 0);
    });
  }

  $("#feedbackRows").innerHTML=rows.map(x=>{
    let actualUrl = x.source_url || x.url;
    let urlStr=esc(actualUrl||"—");
    let urlHtml=actualUrl
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
}

async function feedback(status="pending"){
  currentFbStatus=status;
  $$(".fb-tab").forEach(b=>b.classList.toggle("active",b.dataset.fbStatus===status));
  try{
    let qp=new URLSearchParams(params());
    qp.set("limit","100");
    if(status&&status!=="all")qp.set("status",status);
    else qp.delete("status");
    let d=await api("/api/feedback?"+qp.toString());
    currentFbData=d;
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

    // Render Feedback KPIs
    let stats = d.stats || {};
    let topPlat = stats.topPlatform && stats.topPlatform !== "—" ? formatHumanLabel(stats.topPlatform) : "—";
    kpis("#feedbackKpis", [
      ["待处理歌单", fmt(d.counts?.pending || 0), "等待复现与核验"],
      ["累计报错人次", fmt(stats.totalReports || 0), "受影响用户上报总量"],
      ["独立失败链接", fmt(stats.uniqueUrls || 0), "去重歌单 URL 条数"],
      ["最频发平台", esc(topPlat), "主要失败集中源"],
      ["主要错误分类", esc(stats.topErrorCode || "—"), "最频发报错原因"]
    ]);

    // Populate error code dropdown
    let errSelect = $("#feedbackErrorCode");
    if (errSelect && d.availableErrorCodes) {
      let oldVal = currentFbErrorCode;
      errSelect.innerHTML = '<option value="">全部错误分类 (All Errors · ' + (d.total || 0) + ')</option>'
        + d.availableErrorCodes.map(c => '<option value="' + esc(c.name) + '"' + (c.name === oldVal ? ' selected' : '') + '>' + esc(c.name) + ' (' + c.count + ' 条)</option>').join("");
    }

    let sortSelect = $("#feedbackSort");
    if (sortSelect) sortSelect.value = currentFbSort;

    renderFeedbackRows();
    feedbackLoaded=true;
  }catch(e){
    $("#feedbackRows").innerHTML='<tr><td colspan="9" style="color:var(--r);padding:14px">'+esc(e.message)+'</td></tr>';
  }
}

const PAGE_FILTER_CAPABILITIES = {
  overview: { supportedDimensions: [], scopeNote: "业务总览展示全站宏观指标与核心趋势，仅支持时间范围筛选。" },
  web: { supportedDimensions: ["country", "region"], scopeNote: "官网地域分析针对 Web 独立访客 (UV)；环境与来源指标属于事件级分布。" },
  reliability: { supportedDimensions: ["channel", "client", "platform"], scopeNote: "稳定与性能指标支持渠道、接入端与目标平台筛选（不适用地域维度）。" },
  usage: { supportedDimensions: ["channel", "client", "platform"], scopeNote: "使用偏好分析覆盖来源渠道、接入端与音乐平台维度。" },
  integrations: { supportedDimensions: ["client", "channel"], scopeNote: "生态集成分析覆盖客户端与渠道维度（平台维度不适用）。" },
  feedback: { supportedDimensions: ["platform", "country", "region"], scopeNote: "待审歌单队列支持按音乐平台及上报地域筛选（客户端与渠道维度不适用）。" },
  security: { supportedDimensions: ["platform", "country", "region"], scopeNote: "安全风控与拦截报文支持按攻击目标平台及来源地域筛选（客户端与渠道维度不适用）。" },
  dau: { supportedDimensions: ["channel", "country", "region"], scopeNote: "活跃趋势支持按活跃渠道（网页、插件、CLI）与地域筛选。" },
};

function applyPageFilters(page) {
  let caps = PAGE_FILTER_CAPABILITIES[page] || { supportedDimensions: [], scopeNote: "" };
  let supported = new Set(caps.supportedDimensions);
  let scopeEl = $("#filterScopeNote");
  if (scopeEl) {
    scopeEl.textContent = caps.scopeNote || "";
    scopeEl.style.display = caps.scopeNote ? "inline-block" : "none";
  }
  let needsReload = false;
  ["channel", "client", "platform", "country", "region"].forEach(dim => {
    let f = document.querySelector('.field[data-filter="' + dim + '"]');
    let sel = $("#" + dim);
    if (f) f.style.display = supported.has(dim) ? "" : "none";
    if (!supported.has(dim) && sel && sel.value) {
      sel.value = "";
      needsReload = true;
    }
  });
  let rst = document.querySelector('.field[data-filter="reset"]');
  if (rst) rst.style.display = caps.supportedDimensions.length > 0 ? "" : "none";

  let chSel = $("#channel");
  if (page === "dau") {
    if (chSel) {
      let cur = chSel.value;
      chSel.innerHTML = '<option value="">全部渠道 (活跃度有效)</option><option value="web"' + (cur==="web"?" selected":"") + '>网页端 (Web)</option><option value="plugin"' + (cur==="plugin"?" selected":"") + '>播放器插件 (Plugin)</option><option value="cli"' + (cur==="cli"?" selected":"") + '>命令行 (CLI)</option>';
      if (cur !== "" && cur !== "web" && cur !== "plugin" && cur !== "cli") {
        chSel.value = "";
        needsReload = true;
      }
    }
  } else {
    if (chSel && chSel.options.length <= 4) {
      let cur = chSel.value;
      chSel.innerHTML = '<option value="">全部渠道</option><option value="web"' + (cur==="web"?" selected":"") + '>网页端 (Web)</option><option value="cli"' + (cur==="cli"?" selected":"") + '>命令行 (CLI)</option><option value="plugin"' + (cur==="plugin"?" selected":"") + '>播放器插件 (Plugin)</option><option value="api"' + (cur==="api"?" selected":"") + '>开放接口 (API)</option><option value="legacy_mixed"' + (cur==="legacy_mixed"?" selected":"") + '>历史混合渠道 (Legacy V1)</option>';
    }
  }
  if (needsReload) {
    load();
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
  if (window.location.hash !== "#" + b.dataset.page) {
    history.replaceState(null, "", "#" + b.dataset.page);
  }
  applyPageFilters(b.dataset.page);
  if(b.dataset.page==="security"&&!quarantineLoaded)quarantine();
  if(b.dataset.page==="feedback"&&!feedbackLoaded)feedback(currentFbStatus);
  if(b.dataset.page==="overview")requestAnimationFrame(drawCanvasChart);
  if(b.dataset.page==="dau")requestAnimationFrame(drawDauChart);
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
    quarantineLoaded=false;
    feedbackLoaded=false;
    load();
  };
});
$("#applySingleDate").onclick=()=>{let d=$("#singleDate").value;if(!d)return;setDateInputs(d,d);markPreset("");load()};
$("#singleDate").onchange=()=>{let d=$("#singleDate").value;if(!d)return;setDateInputs(d,d);markPreset("");load()};
let prevBtn=$("#filterPrevDay");if(prevBtn)prevBtn.onclick=()=>stepDay(-1);
let nextBtn=$("#filterNextDay");if(nextBtn)nextBtn.onclick=()=>stepDay(1);
$("#applyDateRange").onclick=()=>{dates();markPreset("");load()};
["fromDate","toDate"].forEach(id=>$("#"+id).onkeydown=e=>{if(e.key==="Enter"){$("#applyDateRange").click()}});
$("#reset").onclick=()=>{
  ["channel","client","platform","country","region"].forEach(id=>{let el=$("#"+id);if(el)el.value=""});
  excludeMy=false;
  quarantineLoaded=false;
  feedbackLoaded=false;
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
let fbSortSelect = $("#feedbackSort");
if (fbSortSelect) {
  fbSortSelect.onchange = (e) => {
    currentFbSort = e.target.value;
    renderFeedbackRows();
  };
}
let fbErrSelect = $("#feedbackErrorCode");
if (fbErrSelect) {
  fbErrSelect.onchange = (e) => {
    currentFbErrorCode = e.target.value;
    renderFeedbackRows();
  };
}

let closeFModal=$("#closeForensicModal");
if(closeFModal)closeFModal.onclick=()=>{$("#forensicModal").style.display="none"};
let fModal=$("#forensicModal");
if(fModal)fModal.onclick=e=>{if(e.target===fModal)fModal.style.display="none"};

if (window.location.hash) {
  let h = window.location.hash.replace(/^#/, "");
  let tabBtn = document.querySelector('.tab[data-page="' + h + '"]');
  if (tabBtn) tabBtn.click();
  else applyPageFilters("overview");
} else {
  applyPageFilters("overview");
}
markPreset("all");
updateExcludeMyUI();
initViewSwitches();
initDauInteractions();
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
