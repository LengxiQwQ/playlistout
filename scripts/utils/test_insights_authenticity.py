#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PlaylistOut analytics authenticity and dashboard security regression tests."""

import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.utils.collect import (
    WEBSITE_STATS_API,
    format_china_province_table,
    format_client_distribution,
    format_geo_distribution,
    format_platform_shares,
    render_website_section,
)
from scripts.utils.dashboard import (
    ANALYTICS_PARAMS,
    FEEDBACK_PARAMS,
    HTML,
    PAGE_FILTER_CAPABILITIES,
    QUARANTINE_PARAMS,
    build_local_analytics,
    build_local_feedback,
    build_local_quarantine,
    fetch_dashboard_snapshot,
    get_admin_token,
    reconcile_breakdown_rows,
    reconcile_client_env,
    resolve_page_filter_params,
)


class TestPublicInsightsAuthenticity(unittest.TestCase):
    def test_platform_share_uses_real_counts_only(self):
        stats = {
            "qqmusic": {"totalSuccess": 134},
            "netease": {"totalSuccess": 20},
            "kugou": {"totalSuccess": 28},
            "kuwo": {"totalSuccess": 12},
            "qishui": {"totalSuccess": 8},
            "migu": {"totalSuccess": 15},
        }
        zh = format_platform_shares(stats, "zh")
        self.assertIn("134 次", zh)
        self.assertIn("20 次", zh)
        self.assertIn("28 次", zh)
        self.assertIn("12 次", zh)
        self.assertIn("8 次", zh)
        self.assertIn("15 次", zh)
        self.assertIn("酷我音乐", zh)
        self.assertIn("咪咕音乐", zh)

    def test_empty_platform_share_does_not_fabricate(self):
        value = format_platform_shares(
            {"qqmusic": {"totalSuccess": 0}, "netease": {"totalSuccess": 0}},
            "zh",
        )
        self.assertEqual(value, "暂无数据")

    def test_geo_and_client_empty_states_do_not_fabricate(self):
        self.assertEqual(format_geo_distribution({"topGeo": []}, "zh"), "暂无数据")
        self.assertEqual(
            format_china_province_table({"chinaProvinces": []}, "en"),
            ["No data"],
        )
        devices, browsers = format_client_distribution(
            {"clientStats": {"devices": [], "browsers": []}},
            "en",
        )
        self.assertEqual(devices, "No data")
        self.assertEqual(browsers, "No data")

    def test_public_readme_renderer_excludes_private_dimensions(self):
        stats = {
            "cumulativeDailyVisitors": 10,
            "totalTracksProcessed": 100,
            "byPlatform": {"qqmusic": {"totalSuccess": 2}},
            "topGeo": [{"country": "MY", "count": 10, "percentage": 100}],
            "clientStats": {"devices": [{"name": "desktop", "count": 10}]},
        }
        rendered = render_website_section(stats, "2026-10-05", "en")
        self.assertNotIn("Geographic", rendered)
        self.assertNotIn("Client Devices", rendered)

    def test_collect_still_uses_public_api(self):
        self.assertIn("/api/stats", WEBSITE_STATS_API)
        self.assertNotIn("/api/internal/", WEBSITE_STATS_API)


class TestDashboardV3SecurityAndUX(unittest.TestCase):
    def test_token_resolution_prefers_environment_and_strips_spaces(self):
        with patch.dict(os.environ, {"INSIGHTS_ADMIN_TOKEN": "  secret  "}):
            self.assertEqual(get_admin_token(Path("/missing")), "secret")

    def test_missing_token_is_none(self):
        with patch.dict(os.environ, {"INSIGHTS_ADMIN_TOKEN": ""}):
            self.assertIsNone(get_admin_token(Path("/definitely/missing")))

    def test_dashboard_never_embeds_admin_token(self):
        secret = "super_secret_insights_admin_token_9999"
        self.assertNotIn(secret, HTML)
        self.assertNotIn("INSIGHTS_ADMIN_TOKEN", HTML)
        self.assertNotIn("fbToken", HTML)
        self.assertNotIn("Token 不进入浏览器", HTML)
        self.assertNotIn("先看结果，再下钻原因", HTML)
        self.assertIn("Playlist Out", HTML)

    def test_dashboard_has_no_third_party_browser_script(self):
        self.assertNotIn("cdn.jsdelivr.net", HTML)
        self.assertNotIn("<script src=", HTML)
        self.assertIn("hourlyTimeseries", HTML)

    def test_dashboard_sets_local_security_headers(self):
        source = Path(__file__).with_name("dashboard.py").read_text(encoding="utf-8")
        self.assertIn("Content-Security-Policy", source)
        self.assertIn("connect-src 'self'", source)
        self.assertIn("X-Frame-Options", source)
        self.assertIn("Permissions-Policy", source)

    def test_dashboard_uses_loopback_proxy_and_v2_endpoint(self):
        source = Path(__file__).with_name("dashboard.py").read_text(encoding="utf-8")
        self.assertIn("ThreadingHTTPServer", source)
        self.assertIn("127.0.0.1", source)
        self.assertIn("/api/internal/analytics/v2", source)
        self.assertIn("拒绝监听非 loopback", source)

    def test_dashboard_uses_single_startup_snapshot_for_read_only_views(self):
        source = Path(__file__).with_name("dashboard.py").read_text(encoding="utf-8")
        self.assertIn("/api/internal/analytics/v2/snapshot", source)
        self.assertIn("fetch_dashboard_snapshot(token)", source)
        self.assertIn("build_local_analytics(type(self).snapshot", source)
        self.assertIn("build_local_quarantine(", source)
        self.assertIn("build_local_feedback(type(self).snapshot", source)
        self.assertNotIn('self.proxy("/api/internal/analytics/v2"', source)
        self.assertNotIn('self.proxy("/api/internal/quarantine"', source)
        self.assertNotIn('self.proxy("/api/internal/feedback"', source)
        self.assertIn('path != "/api/refresh"', source)

    def test_snapshot_loader_uses_one_internal_snapshot_request(self):
        body = json.dumps(
            {
                "success": True,
                "data": {
                    "version": 2,
                    "generatedAt": "2026-10-06T10:00:00.000Z",
                    "dailyCore": [],
                    "hourlyCore": [],
                    "breakdowns": [],
                    "geo": [],
                    "clientEnv": [],
                    "quarantine": [],
                    "feedback": [],
                },
            }
        ).encode("utf-8")
        with patch(
            "scripts.utils.dashboard.remote_request",
            return_value=(200, body, "application/json"),
        ) as request:
            snapshot = fetch_dashboard_snapshot("secret")
        self.assertEqual(snapshot["version"], 2)
        request.assert_called_once_with(
            "secret",
            "/api/internal/analytics/v2/snapshot",
        )

    def test_local_snapshot_supports_arbitrary_single_day_and_range(self):
        snapshot = {
            "generatedAt": "2026-10-06T10:00:00.000Z",
            "dailyCore": [
                {
                    "date": "2026-10-04",
                    "channel": "web",
                    "client_id": "official_web",
                    "platform": "qqmusic",
                    "metric": "resolve_request",
                    "count": 2,
                },
                {
                    "date": "2026-10-04",
                    "channel": "web",
                    "client_id": "official_web",
                    "platform": "qqmusic",
                    "metric": "playlist_success",
                    "count": 2,
                },
                {
                    "date": "2026-10-05",
                    "channel": "api",
                    "client_id": "anonymous_api",
                    "platform": "netease",
                    "metric": "resolve_request",
                    "count": 3,
                },
                {
                    "date": "2026-10-05",
                    "channel": "api",
                    "client_id": "anonymous_api",
                    "platform": "netease",
                    "metric": "playlist_success",
                    "count": 3,
                },
            ],
            "hourlyCore": [],
            "breakdowns": [],
            "geo": [],
            "clientEnv": [],
            "quarantine": [],
            "feedback": [],
        }
        one_day = build_local_analytics(
            snapshot,
            {"from": "2026-10-04", "to": "2026-10-04"},
        )
        self.assertEqual(one_day["overview"]["resolve_request"], 2)
        full_range = build_local_analytics(
            snapshot,
            {"from": "2026-10-04", "to": "2026-10-05"},
        )
        self.assertEqual(full_range["overview"]["resolve_request"], 5)
        self.assertEqual(
            full_range["availableDateRange"],
            {"from": "2026-10-04", "to": "2026-10-05"},
        )

    def test_local_snapshot_covers_quarantine_and_feedback_reads(self):
        snapshot = {
            "quarantine": [
                {"id": 1, "incident_date": "2026-10-04", "reason": "bot", "count": 3},
                {"id": 2, "incident_date": "2026-10-05", "reason": "bot", "count": 4},
            ],
            "feedback": [
                {"id": 1, "status": "pending", "last_reported_at": "2026-10-05T00:00:00Z"},
                {"id": 2, "status": "resolved", "last_reported_at": "2026-10-04T00:00:00Z"},
            ],
        }
        quarantine = build_local_quarantine(
            snapshot,
            {"from": "2026-10-05", "to": "2026-10-05", "limit": "100"},
        )
        self.assertEqual(quarantine["totalRecords"], 1)
        self.assertEqual(quarantine["totalEvents"], 4)
        feedback = build_local_feedback(snapshot, {"status": "pending", "limit": "100"})
        self.assertEqual(feedback["total"], 1)
        self.assertEqual(feedback["entries"][0]["id"], 1)

    def test_dashboard_has_human_friendly_navigation_and_filters(self):
        for text in [
            "Overview",
            "Web",
            "Integrations",
            "Reliability",
            "Security",
            "Feedback",
            "Channel",
            "Client",
            "Platform",
            "Country",
            "Region",
            "今天",
            "昨天",
            "前天",
            "大前天",
            "全部历史",
            "近7天",
            "近30天",
            "查看这一天",
            "应用范围",
            "Data Quality",
            "请求目标平台",
            "Client IDs",
            "Common Latency",
        ]:
            self.assertIn(text, HTML)
        self.assertNotIn("Hide MY", HTML)
        self.assertNotIn("隐藏马来西亚", HTML)
        self.assertNotIn("Top 10", HTML)
        self.assertNotIn("Top 15", HTML)
        overview_part = HTML[HTML.find('id="page-overview"'):HTML.find('id="page-feedback"')]
        self.assertIn('id="clientBars"', overview_part)
        self.assertIn('id="countryBars"', overview_part)
        self.assertLess(overview_part.find('id="clientBars"'), overview_part.find('id="countryBars"'))

    def test_dashboard_date_controls_support_single_day_and_arbitrary_range(self):
        self.assertNotIn('id="headPrevDay"', HTML)
        self.assertNotIn('id="headNextDay"', HTML)
        self.assertNotIn('id="headDateDisplay"', HTML)
        self.assertIn('id="filterPrevDay"', HTML)
        self.assertIn('id="filterNextDay"', HTML)
        self.assertIn('id="singleDate"', HTML)
        self.assertIn('id="fromDate"', HTML)
        self.assertIn('id="toDate"', HTML)
        self.assertIn('data-range="daybefore"', HTML)
        self.assertIn('data-range="day3"', HTML)
        self.assertIn('data-range="all"', HTML)
        self.assertIn('id="refreshData"', HTML)
        self.assertIn("stepDay", HTML)
        self.assertIn("shiftDateStr", HTML)
        self.assertIn("AbortController", HTML)
        self.assertIn("CACHE_MS=15000", HTML)
        self.assertNotIn("不重复请求 Worker", HTML)

    def test_dashboard_selector_helpers_are_distinct_and_valid(self):
        self.assertIn(
            'const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));',
            HTML,
        )
        self.assertNotIn(
            'const $=s=>document.querySelector(s),$=s=>Array.from(document.querySelectorAll(s));',
            HTML,
        )
        self.assertIn('$$(".tab").forEach', HTML)
        self.assertIn('$$(".range button").forEach', HTML)

    def test_dashboard_dynamic_selects_use_id_selectors(self):
        self.assertIn('let s=$("#"+id);if(!s)return', HTML)
        self.assertNotIn("let s=$(id),old=s.value", HTML)

    def test_security_quarantine_follows_selected_date_range(self):
        self.assertIn('new URLSearchParams(dates())', HTML)
        source = Path(__file__).with_name("dashboard.py").read_text(encoding="utf-8")
        self.assertIn("build_local_quarantine", source)

    def test_dashboard_explains_filter_scope_boundaries(self):
        self.assertIn("Platform / Country / Region 不会作用于环境数据", HTML)
        self.assertIn("Failure Code、Stage、Latency", HTML)
        self.assertIn("不代表用户或设备身份", HTML)

    def test_dashboard_does_not_hardcode_incident_story(self):
        for stale_story in ["成都", "南京", "上海批量抓取", "2026-10-02"]:
            self.assertNotIn(stale_story, HTML)

    def test_local_proxy_whitelists_query_parameters(self):
        self.assertEqual(
            ANALYTICS_PARAMS,
            {
                "from",
                "to",
                "channel",
                "client",
                "platform",
                "country",
                "region",
                "exclude_my",
                "excludeMy",
            },
        )
        self.assertEqual(
            FEEDBACK_PARAMS,
            {
                "status",
                "limit",
                "offset",
                "id",
                "from",
                "to",
                "platform",
                "country",
                "region",
                "exclude_my",
                "excludeMy",
            },
        )
        self.assertEqual(
            QUARANTINE_PARAMS,
            {
                "limit",
                "offset",
                "reason",
                "date",
                "from",
                "to",
                "platform",
                "country",
                "region",
                "exclude_my",
                "excludeMy",
            },
        )

    def test_page_filter_capabilities_and_parity(self):
        self.assertEqual(PAGE_FILTER_CAPABILITIES["overview"]["supportedDimensions"], [])
        self.assertEqual(PAGE_FILTER_CAPABILITIES["web"]["supportedDimensions"], ["country", "region"])
        self.assertEqual(PAGE_FILTER_CAPABILITIES["reliability"]["supportedDimensions"], ["channel", "client", "platform"])
        self.assertEqual(PAGE_FILTER_CAPABILITIES["usage"]["supportedDimensions"], ["channel", "client", "platform"])
        self.assertEqual(PAGE_FILTER_CAPABILITIES["integrations"]["supportedDimensions"], ["client", "channel"])
        self.assertEqual(PAGE_FILTER_CAPABILITIES["feedback"]["supportedDimensions"], ["platform", "country", "region"])
        self.assertEqual(PAGE_FILTER_CAPABILITIES["security"]["supportedDimensions"], ["platform", "country", "region"])
        self.assertEqual(PAGE_FILTER_CAPABILITIES["dau"]["supportedDimensions"], ["channel", "country", "region"])

        full_query = {
            "from": "2026-10-01",
            "to": "2026-10-10",
            "channel": "web",
            "client": "official_web",
            "platform": "qqmusic",
            "country": "CN",
            "region": "Guangdong",
            "exclude_my": "1",
        }
        ov = resolve_page_filter_params(full_query, "overview")
        self.assertEqual(ov["channel"], "")
        self.assertEqual(ov["client"], "")
        self.assertEqual(ov["platform"], "")
        self.assertEqual(ov["country"], "")
        self.assertEqual(ov["region"], "")

        rel = resolve_page_filter_params(full_query, "reliability")
        self.assertEqual(rel["channel"], "web")
        self.assertEqual(rel["client"], "official_web")
        self.assertEqual(rel["platform"], "qqmusic")
        self.assertEqual(rel["country"], "")
        self.assertEqual(rel["region"], "")

        fb = resolve_page_filter_params(full_query, "feedback")
        self.assertEqual(fb["channel"], "")
        self.assertEqual(fb["client"], "")
        self.assertEqual(fb["platform"], "qqmusic")
        self.assertEqual(fb["country"], "CN")
        self.assertEqual(fb["region"], "Guangdong")

    def test_dau_past_date_and_multi_day_calculation(self):
        snapshot = {
            "dailyCore": [
                {
                    "date": "2026-10-01",
                    "channel": "web",
                    "client_id": "none",
                    "platform": "none",
                    "metric": "visitor_unique",
                    "count": 40,
                },
                {
                    "date": "2026-10-01",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "none",
                    "metric": "active_user",
                    "count": 60,
                },
                {
                    "date": "2026-10-02",
                    "channel": "web",
                    "client_id": "none",
                    "platform": "none",
                    "metric": "visitor_unique",
                    "count": 50,
                },
                {
                    "date": "2026-10-02",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "none",
                    "metric": "active_user",
                    "count": 70,
                },
            ],
            "hourlyCore": [
                {
                    "date": "2026-10-02",
                    "hour": 10,
                    "channel": "web",
                    "client_id": "none",
                    "platform": "none",
                    "metric": "visitor_unique",
                    "count": 15,
                },
            ],
            "breakdowns": [],
            "geo": [],
            "clientEnv": [],
            "quarantine": [],
            "feedback": [],
        }

        # Single-day past date (2026-10-02): comparison date is 2026-10-01
        res = build_local_analytics(snapshot, {"from": "2026-10-02", "to": "2026-10-02"})
        dau = res["dau"]
        self.assertTrue(dau["isSingleDay"])
        self.assertEqual(dau["targetDate"], "2026-10-02")
        self.assertEqual(dau["comparisonDate"], "2026-10-01")
        self.assertEqual(dau["today"]["total"], 120)  # 50 + 70
        self.assertEqual(dau["today"]["web"], 50)
        self.assertEqual(dau["today"]["plugin"], 70)
        self.assertEqual(dau["yesterday"]["total"], 100)  # 40 + 60
        self.assertEqual(dau["yesterday"]["web"], 40)
        self.assertEqual(dau["yesterday"]["plugin"], 60)
        self.assertEqual(dau["windowTotals"]["total"], 120)

        # Platform-agnostic: even when filtering by platform='qqmusic', visitor_unique (platform='none') is preserved
        res_platform = build_local_analytics(snapshot, {"from": "2026-10-02", "to": "2026-10-02", "platform": "qqmusic"})
        self.assertEqual(res_platform["dau"]["today"]["total"], 120)
        # Overview metric must NOT be double-counted
        self.assertEqual(res_platform["overview"]["visitor_unique"], 50)

        # Multi-day window (2026-10-01 to 2026-10-02): 2 days
        res_multi = build_local_analytics(snapshot, {"from": "2026-10-01", "to": "2026-10-02"})
        dau_multi = res_multi["dau"]
        self.assertFalse(dau_multi["isSingleDay"])
        self.assertEqual(dau_multi["windowTotals"]["total"], 220)  # 120 + 100
        self.assertEqual(len(dau_multi["series"]), 2)

    def test_dau_milestone_authoritative_coverage(self):
        snapshot = {
            "dailyCore": [
                {"date": "2026-10-15", "channel": "web", "client_id": "official_web", "platform": "none", "metric": "visitor_unique", "count": 100},
                # Plugin first user is on 2026-10-17; 10-15 and 10-16 had 0 users (no rows)
                {"date": "2026-10-17", "channel": "web", "client_id": "official_web", "platform": "none", "metric": "visitor_unique", "count": 120},
                {"date": "2026-10-17", "channel": "plugin", "client_id": "musicfree", "platform": "none", "metric": "active_user", "count": 5},
            ],
            "hourlyCore": [],
            "breakdowns": [],
            "geo": [],
            "clientEnv": [],
            "quarantine": [],
            "feedback": [],
        }
        res = build_local_analytics(snapshot, {"from": "2026-10-15", "to": "2026-10-17"})
        cov = res["dau"]["coverage"]
        self.assertTrue(cov["plugin"]["hasCoverage"])
        # Authoritative milestone must be 2026-10-15, NOT 2026-10-17
        self.assertEqual(cov["plugin"]["earliestDate"], "2026-10-15")
        self.assertTrue(cov["cli"]["hasCoverage"])
        self.assertEqual(cov["cli"]["earliestDate"], "2026-10-15")

        # In series, 10-15 is covered, so pluginUncollected is false
        p15 = next(s for s in res["dau"]["series"] if s["date"] == "2026-10-15")
        self.assertFalse(p15["pluginUncollected"])
        self.assertEqual(p15["plugin"], 0)

    def test_dau_continuous_calendar_days_zero_filling(self):
        snapshot = {
            "dailyCore": [
                {"date": "2026-10-14", "channel": "web", "client_id": "official_web", "platform": "none", "metric": "visitor_unique", "count": 10},
                # 2026-10-15 has 0 activity (no row)
                {"date": "2026-10-16", "channel": "web", "client_id": "official_web", "platform": "none", "metric": "visitor_unique", "count": 10},
            ],
            "hourlyCore": [],
            "breakdowns": [],
            "geo": [],
            "clientEnv": [],
            "quarantine": [],
            "feedback": [],
        }
        res = build_local_analytics(snapshot, {"from": "2026-10-14", "to": "2026-10-16"})
        series = res["dau"]["series"]
        self.assertEqual(len(series), 3)
        self.assertEqual([s["date"] for s in series], ["2026-10-14", "2026-10-15", "2026-10-16"])
        d15 = series[1]
        self.assertEqual(d15["date"], "2026-10-15")
        self.assertEqual(d15["total"], 0)
        self.assertFalse(d15["webUncollected"])
        # Daily average: (10 + 0 + 10) / 3 = 7, NOT (10 + 10) / 2 = 10
        self.assertEqual(res["dau"]["multiDay"]["dayCount"], 3)
        self.assertEqual(res["dau"]["multiDay"]["dailyAverage"], 7)

    def test_dau_baseline_and_ma7_includes_zero_active_days(self):
        snapshot = {
            "dailyCore": [
                {"date": "2026-10-10", "channel": "web", "client_id": "official_web", "platform": "none", "metric": "visitor_unique", "count": 10},
                {"date": "2026-10-12", "channel": "web", "client_id": "official_web", "platform": "none", "metric": "visitor_unique", "count": 10},
                {"date": "2026-10-17", "channel": "web", "client_id": "official_web", "platform": "none", "metric": "visitor_unique", "count": 10},
            ],
            "hourlyCore": [
                {"date": "2026-10-10", "hour": 12, "channel": "web", "client_id": "official_web", "metric": "visitor_unique", "count": 10},
                {"date": "2026-10-12", "hour": 12, "channel": "web", "client_id": "official_web", "metric": "visitor_unique", "count": 10},
                {"date": "2026-10-17", "hour": 12, "channel": "web", "client_id": "official_web", "metric": "visitor_unique", "count": 10},
            ],
            "breakdowns": [],
            "geo": [],
            "clientEnv": [],
            "quarantine": [],
            "feedback": [],
        }
        res_single = build_local_analytics(snapshot, {"from": "2026-10-17", "to": "2026-10-17"})
        base_h12 = res_single["dau"]["singleDay"]["sevenDayBaseline"][12]["total"]
        # 7-day lookback: 2 active days (10 each) + 5 zero days = 20 / 7 = 3 (rounded)
        self.assertEqual(base_h12, 3)

        res_multi = build_local_analytics(snapshot, {"from": "2026-10-10", "to": "2026-10-17"})
        pt17 = next(s for s in res_multi["dau"]["series"] if s["date"] == "2026-10-17")
        # MA7 includes the 0 days within coverage
        self.assertEqual(pt17["ma7"], 3)

    def test_feedback_and_quarantine_multi_dimension_filtering(self):
        snapshot = {
            "dailyCore": [],
            "hourlyCore": [],
            "breakdowns": [],
            "geo": [],
            "clientEnv": [],
            "quarantine": [
                {"id": 1, "incident_date": "2026-10-01", "platform": "qqmusic", "country": "CN", "region": "Beijing", "count": 2},
                {"id": 2, "incident_date": "2026-10-02", "platform": "netease", "country": "CN", "region": "Shanghai", "count": 5},
                {"id": 3, "incident_date": "2026-10-02", "platform": "qqmusic", "country": "MY", "region": "Selangor", "count": 1},
            ],
            "feedback": [
                {"id": 1, "created_at": "2026-10-01T10:00:00Z", "platform": "qqmusic", "country": "CN", "region": "Beijing", "status": "pending"},
                {"id": 2, "created_at": "2026-10-02T10:00:00Z", "platform": "netease", "country": "CN", "region": "Shanghai", "status": "pending"},
                {"id": 3, "created_at": "2026-10-02T12:00:00Z", "platform": "qqmusic", "country": "MY", "region": "Selangor", "status": "resolved"},
            ],
        }

        # Filter feedback by date range
        fb_date = build_local_feedback(snapshot, {"from": "2026-10-02", "to": "2026-10-02"})
        self.assertEqual(fb_date["total"], 2)

        # Filter feedback by platform
        fb_plat = build_local_feedback(snapshot, {"platform": "qqmusic"})
        self.assertEqual(fb_plat["total"], 2)

        # Filter feedback by country
        fb_cn = build_local_feedback(snapshot, {"country": "CN"})
        self.assertEqual(fb_cn["total"], 2)

        # Filter feedback with exclude_my
        fb_no_my = build_local_feedback(snapshot, {"exclude_my": "1"})
        self.assertEqual(fb_no_my["total"], 2)

        # Filter quarantine by date and platform
        q_filtered = build_local_quarantine(snapshot, {"from": "2026-10-02", "to": "2026-10-02", "platform": "netease"})
        self.assertEqual(q_filtered["totalRecords"], 1)
        self.assertEqual(q_filtered["quarantine"][0]["id"], 2)

    def test_exclude_my_deducts_malaysia_test_records_and_preserves_invariants(self):
        snapshot = {
            "dailyCore": [
                {
                    "date": "2026-10-06",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "netease",
                    "metric": "playlist_success",
                    "count": 20,
                },
                {
                    "date": "2026-10-06",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "netease",
                    "metric": "resolve_failure",
                    "count": 5,
                },
                {
                    "date": "2026-10-06",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "netease",
                    "metric": "resolve_request",
                    "count": 25,
                },
            ],
            "hourlyCore": [],
            "breakdowns": [],
            "geo": [
                {
                    "date": "2026-10-06",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "netease",
                    "country": "MY",
                    "region": "Selangor",
                    "metric": "playlist_success",
                    "count": 15,
                },
                {
                    "date": "2026-10-06",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "netease",
                    "country": "MY",
                    "region": "Selangor",
                    "metric": "resolve_failure",
                    "count": 2,
                },
                {
                    "date": "2026-10-06",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "netease",
                    "country": "MY",
                    "region": "Selangor",
                    "metric": "resolve_request",
                    "count": 17,
                },
            ],
            "clientEnv": [],
            "quarantine": [
                {"id": 1, "incident_date": "2026-10-06", "country": "MY", "count": 2},
                {"id": 2, "incident_date": "2026-10-06", "country": "CN", "count": 5},
            ],
            "feedback": [
                {"id": 1, "country": "MY", "status": "pending"},
                {"id": 2, "country": "CN", "status": "pending"},
            ],
        }

        # 1. Default (exclude_my is OFF by default, as requested by user)
        default_res = build_local_analytics(snapshot, {"from": "2026-10-06", "to": "2026-10-06"})
        self.assertEqual(default_res["overview"]["playlist_success"], 20)
        self.assertEqual(default_res["overview"]["resolve_failure"], 5)
        self.assertEqual(default_res["overview"]["resolve_request"], 25)
        self.assertEqual(len(default_res["geo"]["countries"]), 1)
        self.assertEqual(default_res["geo"]["countries"][0]["name"], "MY")

        # Quarantine & feedback default inclusion (since exclude_my is off by default)
        q_res = build_local_quarantine(snapshot, {})
        self.assertEqual(q_res["totalRecords"], 2)

        fb_res = build_local_feedback(snapshot, {})
        self.assertEqual(fb_res["total"], 2)

        # 2. Explicitly exclude Malaysia (exclude_my=1)
        excluded_res = build_local_analytics(snapshot, {"from": "2026-10-06", "to": "2026-10-06", "exclude_my": "1"})
        self.assertEqual(excluded_res["overview"]["playlist_success"], 5)  # 20 - 15
        self.assertEqual(excluded_res["overview"]["resolve_failure"], 3)   # 5 - 2
        self.assertEqual(excluded_res["overview"]["resolve_request"], 8)   # 5 + 3 = 8
        self.assertEqual(len(excluded_res["geo"]["countries"]), 0)         # MY removed

        q_excluded = build_local_quarantine(snapshot, {"exclude_my": "1"})
        self.assertEqual(q_excluded["totalRecords"], 1)
        self.assertEqual(q_excluded["quarantine"][0]["country"], "CN")

        fb_excluded = build_local_feedback(snapshot, {"exclude_my": "1"})
        self.assertEqual(fb_excluded["total"], 1)
        self.assertEqual(fb_excluded["entries"][0]["country"], "CN")


    def test_dashboard_html_is_data_driven_not_seeded(self):
        forbidden = [
            "86%",
            "68%",
            "62%",
            "952",
            "464",
            "Guangdong 73%",
        ]
        for token in forbidden:
            self.assertNotIn(token, HTML)

    def test_security_page_explicitly_separates_api_from_abuse(self):
        self.assertIn("API 是产品流量", HTML)
        self.assertIn("Quarantine", HTML)

    def test_loopback_handler_does_not_accept_browser_auth_token(self):
        source = Path(__file__).with_name("dashboard.py").read_text(encoding="utf-8")
        self.assertNotIn("Authorization: Bearer", HTML)
        self.assertIn('"Authorization": "Bearer " + token', source)

    def test_client_env_reconciliation_unifies_legacy_tokens(self):
        rows = [
            {
                "date": "2026-10-04",
                "channel": "legacy_mixed",
                "client_id": "legacy_unknown",
                "device_class": "mobile",
                "browser_family": "playlistout_musicfree",
                "os_family": "android",
                "count": 10,
            },
            {
                "date": "2026-10-04",
                "channel": "plugin",
                "client_id": "musicfree",
                "device_class": "mobile",
                "browser_family": "playlistout_plugin",
                "os_family": "android",
                "count": 5,
            },
            {
                "date": "2026-10-04",
                "channel": "plugin",
                "client_id": "musicfree",
                "device_class": "mobile",
                "browser_family": "plugin:musicfree",
                "os_family": "android",
                "count": 15,
            },
        ]
        reconciled = reconcile_client_env(rows)
        self.assertEqual(len(reconciled), 1)
        self.assertEqual(reconciled[0]["browser_family"], "plugin:musicfree")
        self.assertEqual(reconciled[0]["channel"], "plugin")
        self.assertEqual(reconciled[0]["client_id"], "musicfree")
        self.assertEqual(reconciled[0]["count"], 30)

    def test_breakdown_reconciliation_normalizes_latency_buckets(self):
        rows = [
            {
                "date": "2026-10-04",
                "channel": "plugin",
                "client_id": "musicfree",
                "platform": "qqmusic",
                "dimension": "latency_bucket",
                "value": "_500ms",
                "count": 8,
            },
            {
                "date": "2026-10-04",
                "channel": "plugin",
                "client_id": "musicfree",
                "platform": "qqmusic",
                "dimension": "latency_bucket",
                "value": "<500ms",
                "count": 12,
            },
        ]
        reconciled = reconcile_breakdown_rows(rows)
        self.assertEqual(len(reconciled), 1)
        self.assertEqual(reconciled[0]["dimension"], "latency_bucket")
        self.assertEqual(reconciled[0]["value"], "<500ms")
        self.assertEqual(reconciled[0]["count"], 20)

    def test_bbplayer_obeys_exclude_my_and_has_workspace_breakdowns(self):
        snapshot = {
            "generatedAt": "2026-10-07T18:30:00Z",
            "dailyCore": [
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "bbplayer",
                    "platform": "qqmusic",
                    "metric": "resolve_request",
                    "count": 2,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "bbplayer",
                    "platform": "qqmusic",
                    "metric": "playlist_success",
                    "count": 2,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "qqmusic",
                    "metric": "resolve_request",
                    "count": 10,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "qqmusic",
                    "metric": "playlist_success",
                    "count": 10,
                },
            ],
            "geo": [
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "bbplayer",
                    "platform": "qqmusic",
                    "country": "MY",
                    "region": "Selangor",
                    "metric": "resolve_request",
                    "count": 2,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "bbplayer",
                    "platform": "qqmusic",
                    "country": "MY",
                    "region": "Selangor",
                    "metric": "playlist_success",
                    "count": 2,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "qqmusic",
                    "country": "CN",
                    "region": "Guangdong",
                    "metric": "resolve_request",
                    "count": 6,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "qqmusic",
                    "country": "MY",
                    "region": "Selangor",
                    "metric": "resolve_request",
                    "count": 4,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "qqmusic",
                    "country": "MY",
                    "region": "Selangor",
                    "metric": "playlist_success",
                    "count": 4,
                },
            ],
            "breakdowns": [
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "bbplayer",
                    "platform": "qqmusic",
                    "dimension": "client_version",
                    "value": "2.7.0",
                    "count": 2,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "bbplayer",
                    "platform": "qqmusic",
                    "dimension": "host_platform",
                    "value": "android",
                    "count": 2,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "qqmusic",
                    "dimension": "client_version",
                    "value": "0.1.3",
                    "count": 10,
                },
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "musicfree",
                    "platform": "qqmusic",
                    "dimension": "host_platform",
                    "value": "android",
                    "count": 10,
                },
            ],
            "clientEnv": [
                {
                    "date": "2026-10-07",
                    "channel": "plugin",
                    "client_id": "bbplayer",
                    "device_class": "mobile",
                    "browser_family": "bbplayer_playlistout",
                    "os_family": "android",
                    "count": 2,
                }
            ],
            "hourlyCore": [],
            "quarantine": [],
            "feedback": [],
        }
        excluded = build_local_analytics(snapshot, {"exclude_my": "1"})
        self.assertEqual(excluded["overview"]["resolve_request"], 6)
        self.assertEqual(
            excluded["availableFilters"]["clients"],
            [{"name": "musicfree", "count": 6}],
        )
        self.assertIsNone(excluded["breakdowns"].get("bbplayer_version"))
        self.assertEqual(
            excluded["breakdowns"]["musicfree_version"],
            [{"name": "0.1.3", "count": 6}],
        )

        included = build_local_analytics(snapshot, {"exclude_my": "0", "client": "bbplayer"})
        self.assertEqual(included["overview"]["resolve_request"], 2)
        self.assertEqual(
            included["availableFilters"]["clients"],
            [{"name": "musicfree", "count": 10}, {"name": "bbplayer", "count": 2}],
        )
        self.assertEqual(
            included["distributions"]["clients"],
            [{"name": "bbplayer", "count": 2}],
        )
        self.assertEqual(
            included["breakdowns"]["bbplayer_version"],
            [{"name": "2.7.0", "count": 2}],
        )
        self.assertEqual(
            included["breakdowns"]["bbplayer_host"],
            [{"name": "android", "count": 2}],
        )
        self.assertIsNone(included["breakdowns"].get("musicfree_version"))
        self.assertIsNone(included["breakdowns"].get("musicfree_host"))
        self.assertNotIn("b.musicfree_version||b.client_version", HTML)
        self.assertNotIn("b.musicfree_host||b.host_platform", HTML)
        self.assertEqual(
            included["environment"]["browsers"],
            [{"name": "plugin:bbplayer", "count": 2}],
        )
        self.assertIn("bbplayerVersionBars", HTML)
        self.assertIn("bbplayerHostBars", HTML)


class TestStoredSnapshotPrivacy(unittest.TestCase):
    FORBIDDEN_PRIVATE_KEYS = {
        "topGeo",
        "chinaProvinces",
        "clientStats",
        "todayHourlyPageViews",
        "last24HourlyPageViews",
        "clipboardFormatsBreakdown",
        "referrerDistribution",
        "inputTypeDistribution",
        "latencyDistribution",
        "errorCategoryDistribution",
        "resolveOutcomeDistribution",
        "resolveFailureCodeDistribution",
        "resolveFailureClassDistribution",
        "resolveFailureStageDistribution",
    }

    def test_public_repository_tracks_no_d1_sql_backups(self):
        root = Path(__file__).resolve().parents[2]
        backup_dir = root / "insights" / "backups"
        sql_files = sorted(path.name for path in backup_dir.glob("*.sql"))
        self.assertEqual(
            sql_files,
            [],
            "D1 SQL dumps/restores may contain maintainer-only analytics and must stay private",
        )

    def test_public_traffic_snapshot_has_no_private_dimensions(self):
        root = Path(__file__).resolve().parents[2]
        path = root / "insights" / "traffic.json"
        self.assertTrue(path.exists())
        payload = json.loads(path.read_text(encoding="utf-8"))
        website = payload.get("website_latest", {})
        self.assertFalse(self.FORBIDDEN_PRIVATE_KEYS.intersection(website.keys()))

    def test_raw_public_snapshots_have_no_private_dimensions(self):
        root = Path(__file__).resolve().parents[2]
        raw_files = list((root / "insights" / "raw").glob("*.json"))
        self.assertTrue(raw_files)
        for path in raw_files:
            payload = json.loads(path.read_text(encoding="utf-8"))
            website = (payload.get("data") or {}).get("website_stats") or {}
            leaked = self.FORBIDDEN_PRIVATE_KEYS.intersection(website.keys())
            self.assertFalse(leaked, f"Private analytics leaked in {path.name}: {leaked}")


if __name__ == "__main__":
    unittest.main()
