#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PlaylistOut Insights Authenticity & Synthetic Data Elimination Test Suite (Phase R1)
Verifies that no analytics paths fabricate, estimate, infer, seed, or invent data.
"""

import json
import unittest
from pathlib import Path
import os
import glob
from unittest.mock import patch, MagicMock

from scripts.utils.collect import (
    format_platform_shares,
    format_geo_distribution,
    format_china_province_table,
    format_client_distribution,
    render_website_section,
    compute_running_days,
    fetch_website_stats,
    WEBSITE_STATS_API,
)
from scripts.utils.dashboard import (
    build_html,
    parse_iso_timestamp,
    format_utc8_timestamp,
    compute_dashboard_uptime,
    get_hourly_display_labels,
    get_admin_token,
    merge_maintainer_payload,
    fetch_stats,
    DISPLAY_TZ,
    DISPLAY_TZ_LABEL,
    format_resolve_outcome_label,
    format_resolve_failure_class_label,
    format_resolve_failure_code_label,
    format_resolve_failure_stage_label,
    format_requested_type_label,
    format_provider_failure_path_label,
)


class TestInsightsAuthenticity(unittest.TestCase):
    """Test verification suite for R1: Eliminate Synthetic Analytics Data."""

    # Test 1: Platform shares — NetEase estimation removed & zero total handled
    def test_platform_shares_real_data_qq_only(self):
        """Input: qqmusic = 100, netease = 0 -> qqmusic = 100%, netease = 0%, no 72 or estimate."""
        by_platform = {
            "qqmusic": {"totalSuccess": 100},
            "netease": {"totalSuccess": 0},
        }
        res_zh = format_platform_shares(by_platform, "zh")
        res_en = format_platform_shares(by_platform, "en")

        # Must show real 100% and 0%
        self.assertIn("100%", res_zh)
        self.assertIn("0%", res_zh)
        self.assertIn("100 次", res_zh)
        self.assertIn("0 次", res_zh)

        self.assertIn("100%", res_en)
        self.assertIn("0%", res_en)
        self.assertIn("100 parses", res_en)
        self.assertIn("0 parses", res_en)

        # Must NEVER contain 72 or any fake estimates
        self.assertNotIn("72", res_zh)
        self.assertNotIn("72", res_en)

    def test_platform_shares_all_current_providers(self):
        """KuGou and QiShui must participate in the real denominator instead of being silently dropped."""
        by_platform = {
            "qqmusic": {"totalSuccess": 134},
            "netease": {"totalSuccess": 20},
            "kugou": {"totalSuccess": 28},
            "qishui": {"totalSuccess": 8},
        }
        res_zh = format_platform_shares(by_platform, "zh")
        res_en = format_platform_shares(by_platform, "en")

        self.assertIn("QQ 音乐", res_zh)
        self.assertIn("网易云音乐", res_zh)
        self.assertIn("酷狗音乐", res_zh)
        self.assertIn("汽水音乐", res_zh)
        self.assertIn("KuGou Music", res_en)
        self.assertIn("QiShui Music", res_en)

        # 190 total => 134/190 ~= 71%, 20/190 ~= 11%, 28/190 ~= 15%, 8/190 ~= 4%
        self.assertIn("**71%** (134 次)", res_zh)
        self.assertIn("**11%** (20 次)", res_zh)
        self.assertIn("**15%** (28 次)", res_zh)
        self.assertIn("**4%** (8 次)", res_zh)

    def test_platform_shares_both_zero(self):
        """When total parses are 0, must show 暂无数据 / No data, never QQ 100% fake."""
        by_platform = {
            "qqmusic": {"totalSuccess": 0},
            "netease": {"totalSuccess": 0},
        }
        res_zh = format_platform_shares(by_platform, "zh")
        res_en = format_platform_shares(by_platform, "en")

        self.assertEqual(res_zh, "暂无数据")
        self.assertEqual(res_en, "No data")
        self.assertNotIn("100%", res_zh)
        self.assertNotIn("100%", res_en)

    def test_platform_shares_real_counts(self):
        """Real counts must be rendered accurately."""
        by_platform = {
            "qqmusic": {"totalSuccess": 120},
            "netease": {"totalSuccess": 9},
        }
        res_zh = format_platform_shares(by_platform, "zh")
        self.assertIn("120 次", res_zh)
        self.assertIn("9 次", res_zh)
        self.assertIn("93%", res_zh)
        self.assertIn("7%", res_zh)

    # Test 2: topGeo = [] -> No data / 暂无数据, no hardcoded country percentages
    def test_geo_distribution_empty(self):
        """When topGeo is empty, must display 暂无数据 / No data without fake countries or percentages."""
        stats = {"topGeo": []}
        res_zh = format_geo_distribution(stats, "zh")
        res_en = format_geo_distribution(stats, "en")

        self.assertEqual(res_zh, "暂无数据")
        self.assertEqual(res_en, "No data")

        # Must not contain old synthetic fallback percentages
        for fake in ["86%", "6%", "4%", "2%"]:
            self.assertNotIn(fake, res_zh)
            self.assertNotIn(fake, res_en)

    def test_geo_distribution_real(self):
        """When topGeo has real data, render correctly."""
        stats = {
            "topGeo": [
                {"country": "MY", "count": 952, "percentage": 65},
                {"country": "US", "count": 464, "percentage": 32},
            ]
        }
        res_zh = format_geo_distribution(stats, "zh")
        res_en = format_geo_distribution(stats, "en")

        self.assertIn("马来西亚", res_zh)
        self.assertIn("65%", res_zh)
        self.assertIn("美国", res_zh)
        self.assertIn("32%", res_zh)

        self.assertIn("Malaysia", res_en)
        self.assertIn("65%", res_en)
        self.assertIn("United States", res_en)
        self.assertIn("32%", res_en)

    # Test 3: chinaProvinces = [] -> No data / 暂无数据, no fake province rankings
    def test_china_provinces_empty(self):
        """When chinaProvinces is empty, must display 暂无数据 / No data, no fake table."""
        stats = {"chinaProvinces": []}
        res_zh = format_china_province_table(stats, "zh")
        res_en = format_china_province_table(stats, "en")

        self.assertEqual(res_zh, ["暂无数据"])
        self.assertEqual(res_en, ["No data"])

        # Must not contain any fake provinces from previous fallback
        fake_provinces_zh = ["广东", "浙江", "北京", "江苏", "上海", "四川", "山东", "湖北"]
        fake_provinces_en = ["Guangdong", "Zhejiang", "Beijing", "Jiangsu", "Shanghai", "Sichuan", "Shandong", "Hubei"]

        for p in fake_provinces_zh:
            self.assertNotIn(p, "".join(res_zh))
        for p in fake_provinces_en:
            self.assertNotIn(p, "".join(res_en))

        # Must not contain fake table headers
        self.assertNotIn("| 省份", "".join(res_zh))
        self.assertNotIn("| Province", "".join(res_en))

    def test_china_provinces_real(self):
        """When chinaProvinces has real data, table renders accurately."""
        stats = {
            "chinaProvinces": [
                {"province": "Guangdong", "count": 10, "percentage": 38},
                {"province": "Shanghai", "count": 7, "percentage": 27},
            ]
        }
        res_zh = format_china_province_table(stats, "zh")
        res_en = format_china_province_table(stats, "en")

        self.assertTrue(any("广东省" in line and "38%" in line for line in res_zh))
        self.assertTrue(any("上海市" in line and "27%" in line for line in res_zh))

        self.assertTrue(any("Guangdong" in line and "38%" in line for line in res_en))
        self.assertTrue(any("Shanghai" in line and "27%" in line for line in res_en))

    # Test 4: clientStats empty -> No data / 暂无数据, no hardcoded devices/browsers
    def test_client_distribution_empty(self):
        """When clientStats devices and browsers are empty, must return 暂无数据 / No data."""
        stats = {"clientStats": {"devices": [], "browsers": []}}
        dev_zh, br_zh = format_client_distribution(stats, "zh")
        dev_en, br_en = format_client_distribution(stats, "en")

        self.assertEqual(dev_zh, "暂无数据")
        self.assertEqual(br_zh, "暂无数据")
        self.assertEqual(dev_en, "No data")
        self.assertEqual(br_en, "No data")

        # Must not contain old fake percentages
        for fake in ["68%", "30%", "2%", "62%", "21%", "13%"]:
            self.assertNotIn(fake, dev_zh)
            self.assertNotIn(fake, br_zh)
            self.assertNotIn(fake, dev_en)
            self.assertNotIn(fake, br_en)

    # Test 5: Real client data correctly rendered
    def test_client_distribution_real(self):
        """Real devices: desktop = 4, mobile = 6 -> Desktop 40%, Mobile 60%."""
        stats = {
            "clientStats": {
                "devices": [
                    {"name": "mobile", "count": 6, "percentage": 60},
                    {"name": "desktop", "count": 4, "percentage": 40},
                ],
                "browsers": [
                    {"name": "chrome", "count": 8, "percentage": 80},
                    {"name": "edge", "count": 2, "percentage": 20},
                ],
            }
        }
        dev_zh, br_zh = format_client_distribution(stats, "zh")
        dev_en, br_en = format_client_distribution(stats, "en")

        self.assertIn("移动手机 **60%**", dev_zh)
        self.assertIn("桌面电脑 **40%**", dev_zh)
        self.assertIn("Mobile **60%**", dev_en)
        self.assertIn("Desktop **40%**", dev_en)

        self.assertIn("Chrome **80%**", br_zh)
        self.assertIn("Edge **20%**", br_zh)
        self.assertIn("Chrome **80%**", br_en)
        self.assertIn("Edge **20%**", br_en)

    def test_client_distribution_count_only_computation(self):
        """When percentage is omitted from raw clientStats, computes dynamically from counts."""
        stats = {
            "clientStats": {
                "devices": [
                    {"name": "desktop", "count": 4},
                    {"name": "mobile", "count": 6},
                ],
            }
        }
        dev_zh, _ = format_client_distribution(stats, "zh")
        self.assertIn("桌面电脑 **40%**", dev_zh)
        self.assertIn("移动手机 **60%**", dev_zh)

    # Acceptance test: Full render_website_section with Case A and Case B
    def test_render_section_case_a(self):
        """Case A: qqmusic = 100, netease = 0 -> no netease fake numbers in README block."""
        stats = {
            "byPlatform": {
                "qqmusic": {"totalSuccess": 100},
                "netease": {"totalSuccess": 0},
            }
        }
        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        self.assertIn("QQ 音乐 **100%** (100 次)", md_zh)
        self.assertIn("网易云音乐 **0%** (0 次)", md_zh)
        self.assertNotIn("72", md_zh)

        self.assertIn("QQ Music **100%** (100 parses)", md_en)
        self.assertIn("NetEase Cloud Music **0%** (0 parses)", md_en)
        self.assertNotIn("72", md_en)

    def test_render_section_case_b(self):
        """Case B: topGeo = [], chinaProvinces = [], clientStats = {devices: [], browsers: []} -> explicit No data."""
        stats = {
            "topGeo": [],
            "chinaProvinces": [],
            "clientStats": {"devices": [], "browsers": []},
        }
        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        # Must explicitly show 暂无数据 / No data
        self.assertIn("暂无数据", md_zh)
        self.assertIn("No data", md_en)

        # None of the old fake percentages may appear
        for fake in ["86%", "68%", "62%", "28%", "18%", "14%"]:
            self.assertNotIn(fake, md_zh)
            self.assertNotIn(fake, md_en)

    # Dashboard check: build_html should render without synthetic data
    def test_dashboard_build_html_empty_stats(self):
        """Dashboard HTML with empty stats should not contain fabricated metrics."""
        empty_stats = {
            "totalVisitors": 0,
            "topGeo": [],
            "chinaProvinces": [],
            "clientStats": {"browsers": [], "devices": [], "os": []},
            "byPlatform": {},
        }
        html = build_html(empty_stats, "2026-09-18 00:00:00 CST", "2026-09-17 16:00:00 UTC")
        self.assertIn("暂无数据 / No Data", html)
        self.assertIn("const GEO_DATA = [];", html)
        self.assertIn("renderGeoChart();", html)
        self.assertIn("createHBar('chartChina', [], [],", html)
        self.assertIn("createDonut('chartBrowser', [], [], []);", html)
        self.assertIn("createDonut('chartDevice', [], [], []);", html)
        self.assertIn("createDonut('chartPlatform', [], []);", html)

    def test_dashboard_full_contract_fixture_consumes_every_current_field(self):
        """A sentinel-rich full contract must survive into the generated dashboard without silent field loss."""
        stats = {
            "launchedAt": "2026-09-12",
            "cumulativeDailyVisitors": 1001,
            "totalVisitors": 1001,
            "visitorsToday": 101,
            "totalPageViews": 2002,
            "pageViewsToday": 202,
            "totalPlaylistsParsed": 303,
            "playlistsParsedToday": 33,
            "totalTracksProcessed": 40404,
            "tracksProcessedToday": 4444,
            "totalExports": 505,
            "exportsToday": 55,
            "exportFormatsBreakdown": {"txt": 11, "csv": 22, "xlsx": 33, "json": 44},
            "byPlatform": {
                "qqmusic": {"totalSuccess": 111, "todaySuccess": 1},
                "netease": {"totalSuccess": 222, "todaySuccess": 2},
                "kugou": {"totalSuccess": 333, "todaySuccess": 3},
                "qishui": {"totalSuccess": 444, "todaySuccess": 4},
            },
            "recentDays": [{
                "date": "2026-09-18",
                "parses": 777,
                "tracks": 8888,
                "exports": 666,
                "clipboards": 555,
                "visitors": 444,
                "failures": 333,
            }],
            "generatedAt": "2026-09-18T07:00:00Z",
            "todayHourlyPageViews": [{"hour": 7, "pageViews": 707, "visitors": 77}],
            "last24HourlyPageViews": [
                {"timestamp": "2026-09-18T06:00:00Z", "pageViews": 606, "visitors": 66},
                {"timestamp": "2026-09-18T07:00:00Z", "pageViews": 707, "visitors": 77},
            ],
            "topGeo": [
                {"country": "MY", "count": 321, "percentage": 61},
                {"country": "US", "count": 123, "percentage": 23},
            ],
            "chinaProvinces": [{"province": "Guangdong", "count": 654, "percentage": 73}],
            "clientStats": {
                "browsers": [{"name": "chrome", "count": 765, "percentage": 76}],
                "devices": [{"name": "desktop", "count": 876, "percentage": 87}],
                "os": [{"name": "windows", "count": 987, "percentage": 98}],
                "deviceBrands": [{"name": "Windows PC", "count": 432, "percentage": 43}],
            },
            "clipboardFormatsBreakdown": {
                "title": 12,
                "title_artist": 23,
                "title_artist_album": 34,
            },
            "referrerDistribution": [{"name": "github", "count": 345, "percentage": 34}],
            "inputTypeDistribution": [{"name": "web_url", "count": 456, "percentage": 45}],
            "latencyDistribution": [{"name": "<500ms", "count": 567, "percentage": 56}],
            "errorCategoryDistribution": [{"name": "error_timeout", "count": 678, "percentage": 67}],
        }

        html = build_html(stats)

        for visible in ["1,001", "2,002", "303", "40,404", "505"]:
            self.assertIn(visible, html)

        # Recent-day tracks used to be dropped; it must now have its own dataset.
        self.assertIn("label: '歌曲 / Tracks'", html)
        self.assertIn("data: [8888]", html)
        self.assertIn("yAxisID: 'yTracks'", html)

        # Every platform plus todaySuccess must be serialized into the interactive summary.
        for key in ["qqmusic", "netease", "kugou", "qishui"]:
            self.assertIn(f'"key": "{key}"', html)
        self.assertIn('"today": 4', html)
        self.assertIn("platformTodaySummary", html)

        # API percentages are preserved, not silently recomputed from truncated Top-N arrays.
        for pct in [61, 23, 73, 76, 87, 98, 43, 34, 45, 56, 67]:
            self.assertIn(str(pct), html)
        self.assertIn("filtered.map(x => Number(x.percentage || 0))", html)
        self.assertIn("error_timeout", json.dumps(stats))
        self.assertIn("请求超时 (Timeout)", html)

        # Both the rolling field and legacy UTC-day field remain handled.
        self.assertIn('const HOURLY_SOURCE = "rolling24";', html)
        self.assertIn("2026-09-18T07:00:00Z", html)

    def test_latest_archived_real_snapshot_round_trips_without_unknown_fields(self):
        """Replay the latest actually-collected website snapshot and fail if the API grows an unreviewed top-level field."""
        repo_root = Path(__file__).resolve().parents[2]
        traffic_path = repo_root / "insights" / "traffic.json"
        self.assertTrue(traffic_path.exists(), "insights/traffic.json must exist for real-data replay")

        traffic = json.loads(traffic_path.read_text(encoding="utf-8"))
        stats = traffic.get("website_latest") or {}
        self.assertTrue(stats, "website_latest must contain a real archived Worker snapshot")

        covered_top_level = {
            "launchedAt",
            "cumulativeDailyVisitors",
            "totalVisitors",
            "visitorsToday",
            "totalPageViews",
            "pageViewsToday",
            "totalPlaylistsParsed",
            "playlistsParsedToday",
            "totalTracksProcessed",
            "tracksProcessedToday",
            "totalExports",
            "exportsToday",
            "exportFormatsBreakdown",
            "byPlatform",
            "recentDays",
            "generatedAt",
            "todayHourlyPageViews",
            "last24HourlyPageViews",
            "topGeo",
            "chinaProvinces",
            "clientStats",
            "clipboardFormatsBreakdown",
            "referrerDistribution",
            "inputTypeDistribution",
            "latencyDistribution",
            "errorCategoryDistribution",
        }
        unknown = set(stats) - covered_top_level
        self.assertEqual(unknown, set(), f"Worker snapshot contains dashboard-unreviewed fields: {sorted(unknown)}")

        html = build_html(stats)

        # Core KPI values from the real snapshot must survive formatting.
        for key in [
            "cumulativeDailyVisitors",
            "totalPageViews",
            "totalPlaylistsParsed",
            "totalTracksProcessed",
            "totalExports",
        ]:
            if key in stats:
                self.assertIn(f"{int(stats[key]):,}", html)

        # Re-run every currently present dimensional family through a concrete dashboard consumer.
        for key in (stats.get("byPlatform") or {}):
            self.assertIn(f'"key": "{key}"', html)

        if stats.get("recentDays"):
            recent = list(reversed(stats["recentDays"]))[-30:]
            tracks = [int((r or {}).get("tracks") or 0) for r in recent]
            self.assertIn(f"data: {json.dumps(tracks, ensure_ascii=False)}", html)

        if stats.get("topGeo"):
            for item in stats["topGeo"]:
                self.assertIn(f'"country": "{item.get("country")}"', html)
                self.assertIn(f'"percentage": {int(item.get("percentage") or 0)}', html)

        if stats.get("chinaProvinces"):
            pcts = [int((x or {}).get("percentage") or 0) for x in stats["chinaProvinces"]]
            self.assertIn(json.dumps(pcts, ensure_ascii=False), html)

        for family in ["browsers", "devices", "os", "deviceBrands"]:
            items = (stats.get("clientStats") or {}).get(family) or []
            if items:
                pcts = [int((x or {}).get("percentage") or 0) for x in items]
                self.assertIn(json.dumps(pcts, ensure_ascii=False), html)

        for field in [
            "referrerDistribution",
            "inputTypeDistribution",
            "latencyDistribution",
            "errorCategoryDistribution",
        ]:
            items = stats.get(field) or []
            if items:
                pcts = [int((x or {}).get("percentage") or 0) for x in items]
                self.assertIn(json.dumps(pcts, ensure_ascii=False), html)

    # R1.1 Tests: Uptime Authenticity & Elimination of Fabricated Running Days
    def test_uptime_test_a_valid_date(self):
        """Test A: Valid date (2026-09-12) calculates real running days, never falling back to No data."""
        import datetime as dt
        from scripts.utils.collect import PROJECT_LAUNCHED_AT

        self.assertEqual(PROJECT_LAUNCHED_AT, "2026-09-12")
        days = compute_running_days("2026-09-12", today=dt.date(2026, 9, 18))
        self.assertEqual(days, 7)

        stats = {"launchedAt": "2026-09-12"}
        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        self.assertIn("上线于 2026-09-12", md_zh)
        self.assertIn("Since 2026-09-12", md_en)
        self.assertNotIn("暂无数据", md_zh.split("|")[6])  # Uptime cell specifically has data
        self.assertNotIn("No data", md_en.split("|")[6])

    def test_uptime_test_b_invalid_date(self):
        """Test B: Invalid date ('abc') must return None/unknown and render 暂无数据 / No data, NEVER 1 or 5."""
        self.assertIsNone(compute_running_days("abc"))
        self.assertIsNone(compute_running_days("invalid-date-string"))

        stats = {"launchedAt": "abc"}
        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        row_zh = [l for l in md_zh.splitlines() if l.startswith("| **")][0]
        row_en = [l for l in md_en.splitlines() if l.startswith("| **")][0]
        uptime_cell_zh = [c.strip() for c in row_zh.split("|") if c.strip()][-1]
        uptime_cell_en = [c.strip() for c in row_en.split("|") if c.strip()][-1]

        self.assertEqual(uptime_cell_zh, "暂无数据")
        self.assertEqual(uptime_cell_en, "No data")

        # Must strictly never fabricate 1 or 5
        self.assertNotIn("1 天", md_zh)
        self.assertNotIn("1 Day", md_en)
        self.assertNotIn("5 天", md_zh)
        self.assertNotIn("5 Days", md_en)

    def test_uptime_test_c_future_date(self):
        """Test C: Future date must return None and render No data; must NOT secretly clamp to 1 via max(1, ...)."""
        import datetime as dt

        self.assertIsNone(compute_running_days("2099-01-01"))
        self.assertIsNone(compute_running_days("2026-09-25", today=dt.date(2026, 9, 18)))

        stats = {"launchedAt": "2099-01-01"}
        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        row_zh = [l for l in md_zh.splitlines() if l.startswith("| **")][0]
        row_en = [l for l in md_en.splitlines() if l.startswith("| **")][0]
        uptime_cell_zh = [c.strip() for c in row_zh.split("|") if c.strip()][-1]
        uptime_cell_en = [c.strip() for c in row_en.split("|") if c.strip()][-1]

        self.assertEqual(uptime_cell_zh, "暂无数据")
        self.assertEqual(uptime_cell_en, "No data")

        self.assertNotIn("1 天", md_zh)
        self.assertNotIn("1 Day", md_en)

    def test_uptime_test_d_missing_source_canonical_metadata(self):
        """Test D: Missing source correctly uses canonical PROJECT_LAUNCHED_AT metadata."""
        import datetime as dt
        from scripts.utils.collect import PROJECT_LAUNCHED_AT

        # Direct call with None defaults to verified canonical metadata
        days = compute_running_days(None, today=dt.date(2026, 9, 18))
        self.assertEqual(days, 7)

        # Stats without launchedAt key uses canonical metadata
        stats_no_launch = {"totalVisitors": 10}
        md_zh = render_website_section(stats_no_launch, "2026-09-18", "zh")
        self.assertIn(f"上线于 {PROJECT_LAUNCHED_AT}", md_zh)

        # Explicitly empty string is invalid and must result in No data
        self.assertIsNone(compute_running_days(""))
        stats_empty_launch = {"launchedAt": ""}
        md_zh_empty = render_website_section(stats_empty_launch, "2026-09-18", "zh")
        row_empty = [l for l in md_zh_empty.splitlines() if l.startswith("| **")][0]
        uptime_cell = [c.strip() for c in row_empty.split("|") if c.strip()][-1]
        self.assertEqual(uptime_cell, "暂无数据")

    def test_dashboard_uptime_handling(self):
        """Dashboard must handle invalid and future launch dates without pretending uptime is 1."""
        # Invalid date
        html_invalid = build_html({"launchedAt": "invalid"}, "2026-09-18", "2026-09-18")
        self.assertIn("未知 (Unknown)", html_invalid)
        self.assertNotIn("运行 1 天", html_invalid)

        # Future date
        html_future = build_html({"launchedAt": "2099-01-01"}, "2026-09-18", "2026-09-18")
        self.assertIn("未知 (Unknown)", html_future)
        self.assertNotIn("运行 1 天", html_future)

    # ── R2: Visitor & UV Semantics Test Suite ───────────────────────────

    def test_r2_collector_prefers_canonical_cumulative_visitors(self):
        """Test 27: Collector prefers canonical cumulativeDailyVisitors over legacy totalVisitors."""
        stats = {
            "cumulativeDailyVisitors": 123,
            "totalVisitors": 999,
            "visitorsToday": 10,
            "launchedAt": "2026-09-12",
        }
        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        # Must render 123 (canonical), not 999 (divergent legacy)
        self.assertIn("**123**", md_zh)
        self.assertNotIn("**999**", md_zh)
        self.assertIn("**123**", md_en)
        self.assertNotIn("**999**", md_en)

    def test_r2_collector_backward_compatibility_fallback(self):
        """Test 28: Collector falls back to totalVisitors when cumulativeDailyVisitors is omitted."""
        stats = {
            "totalVisitors": 123,
            "visitorsToday": 10,
            "launchedAt": "2026-09-12",
        }
        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        self.assertIn("**123**", md_zh)
        self.assertIn("**123**", md_en)
        # Even on legacy fallback, table headers must use authentic cumulative wording
        self.assertIn("👥 累计日独立访问", md_zh)
        self.assertIn("👥 Cumulative Daily Unique Visits", md_en)

    def test_r2_readme_renderer_wording_and_privacy_note(self):
        """Test 30: README renderer produces authentic cumulative phrasing and concise privacy explanation."""
        stats = {
            "cumulativeDailyVisitors": 309,
            "totalVisitors": 309,
            "visitorsToday": 103,
            "launchedAt": "2026-09-12",
        }
        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        # Check Chinese labels & privacy notice
        self.assertIn("👥 累计日独立访问", md_zh)
        self.assertIn("今日独立 +103", md_zh)
        self.assertIn("累计日独立访问 = 每天匿名去重后的访客数累加；同一访客跨日可能再次计入，PlaylistOut 不进行跨日追踪。", md_zh)
        self.assertNotIn("独立访客 (UV)", md_zh)

        # Check English labels & privacy notice
        self.assertIn("👥 Cumulative Daily Unique Visits", md_en)
        self.assertIn("Today unique +103", md_en)
        self.assertIn("Cumulative Daily Unique Visits = the sum of daily deduplicated visitor counts; the same visitor may count again on another day because PlaylistOut performs no cross-day tracking.", md_en)
        self.assertNotIn("Unique Visitors (UV)", md_en)

    def test_r2_dashboard_visitor_semantics(self):
        """Test 31: Local Dashboard reflects cumulative daily unique visits and explains no cross-day tracking."""
        stats = {
            "cumulativeDailyVisitors": 123,
            "totalVisitors": 999,
            "visitorsToday": 10,
            "launchedAt": "2026-09-12",
        }
        html = build_html(stats, "2026-09-18", "2026-09-18")

        # Prefers canonical 123
        self.assertIn("123", html)
        self.assertNotIn(">999<", html)
        # Correct KPI labels
        self.assertIn("累计日独立访问人次", html)
        self.assertIn("Cumulative Daily Unique Visits", html)
    # ── R2.5: Local Dashboard UTC+8 Display & Polish Test Suite ─────────
    def test_r2_5_test_a_utc_to_utc8_same_day(self):
        """Test A: UTC -> UTC+8 same day: 2026-09-18T01:00:00Z -> 2026-09-18 09:00:00 UTC+8."""
        res = format_utc8_timestamp("2026-09-18T01:00:00Z")
        self.assertEqual(res, "2026-09-18 09:00:00 UTC+8")

    def test_r2_5_test_b_utc_to_utc8_date_rollover(self):
        """Test B: UTC -> UTC+8 date rollover: 2026-09-18T20:30:00Z -> 2026-09-19 04:30:00 UTC+8."""
        res = format_utc8_timestamp("2026-09-18T20:30:00Z")
        self.assertEqual(res, "2026-09-19 04:30:00 UTC+8")

    def test_r2_5_test_c_malformed_timestamp(self):
        """Test C: Malformed or empty timestamps return '—' safely without crashing."""
        self.assertEqual(format_utc8_timestamp("abc"), "—")
        self.assertEqual(format_utc8_timestamp(""), "—")
        self.assertEqual(format_utc8_timestamp("   "), "—")
        self.assertEqual(format_utc8_timestamp(None), "—")
        self.assertIsNone(parse_iso_timestamp("abc"))
        self.assertIsNone(parse_iso_timestamp(""))
        self.assertIsNone(parse_iso_timestamp(None))

    def test_r2_5_test_d_missing_generated_at(self):
        """Test D: Missing, empty, or invalid generatedAt allows dashboard to generate safely with '—'."""
        empty_gen_stats = {
            "generatedAt": None,
            "cumulativeDailyVisitors": 10,
            "visitorsToday": 2,
        }
        html = build_html(empty_gen_stats)
        self.assertIn("API Generated: —", html)
        self.assertNotIn("Invalid Date", html)

        malformed_gen_stats = {
            "generatedAt": "invalid-timestamp",
            "cumulativeDailyVisitors": 10,
        }
        html_malformed = build_html(malformed_gen_stats)
        self.assertIn("API Generated: —", html_malformed)

    def test_r2_5_test_e_uptime_uses_utc8_date(self):
        """Test E: Uptime calculation uses UTC+8 calendar date at boundaries.
        Boundary: UTC 2026-09-18 17:00 -> UTC+8 2026-09-19 01:00.
        Launch date: 2026-09-12.
        Under UTC calendar (2026-09-18), uptime would be 7 days.
        Under UTC+8 calendar (2026-09-19), uptime MUST be 8 days.
        """
        import datetime as dt

        boundary_utc = dt.datetime(2026, 9, 18, 17, 0, 0, tzinfo=dt.timezone.utc)
        days = compute_dashboard_uptime("2026-09-12", now=boundary_utc)
        self.assertEqual(days, 8)

        # In HTML rendering
        stats = {"launchedAt": "2026-09-12"}
        html = build_html(stats, now=boundary_utc)
        self.assertIn("运行 8 天", html)
        self.assertIn("<div class=\"kpi-val\">8</div>", html)

    def test_r2_5_test_f_hourly_label_conversion(self):
        """Legacy helper stays correct; dashboard prefers timestamped rolling-24h data and interactive timezone rendering."""
        import datetime as dt

        base_date = dt.date(2026, 9, 18)
        labels = get_hourly_display_labels(base_date)
        self.assertEqual(labels[0], "09/18 08:00")
        self.assertEqual(labels[16], "09/19 00:00")

        stats = {
            "generatedAt": "2026-09-18T06:30:00Z",
            "last24HourlyPageViews": [
                {"timestamp": "2026-09-17T07:00:00.000Z", "pageViews": 100, "visitors": 50},
                {"timestamp": "2026-09-18T06:00:00.000Z", "pageViews": 200, "visitors": 80},
            ],
            "topGeo": [
                {"country": "MY", "count": 90, "percentage": 90},
                {"country": "US", "count": 10, "percentage": 10},
            ],
        }
        html = build_html(stats)

        self.assertIn("滚动 24 小时流量", html)
        self.assertIn("Rolling 24 Hours", html)
        self.assertIn("2026-09-17T07:00:00Z", html)
        self.assertIn("2026-09-18T06:00:00Z", html)
        self.assertIn('const HOURLY_SOURCE = "rolling24";', html)
        self.assertIn('id="timezoneSelect"', html)
        self.assertIn('value="Asia/Kuala_Lumpur"', html)
        self.assertIn('id="trafficMetricSelect"', html)
        self.assertIn('id="hideMalaysia"', html)
        self.assertIn("隐藏马来西亚 / Hide MY", html)
        self.assertIn("Storage: UTC", html)
        self.assertIn("GEO_DATA.filter(x => String(x.country).toUpperCase() !== 'MY')", html)

    def test_r2_5_test_g_display_metadata_and_cleanliness(self):
        """Test G: Local Dashboard header, footer and timezone labels are clean and unambiguous."""
        stats = {
            "generatedAt": "2026-09-18T04:29:58Z",
            "launchedAt": "2026-09-12",
        }
        html = build_html(stats, "2026-09-18 12:30:00 UTC+8")

        # Must have API Generated and Local Fetched
        self.assertIn("API Generated: 2026-09-18 12:29:58 UTC+8", html)
        self.assertIn("Local Fetched: 2026-09-18 12:30:00 UTC+8", html)
        self.assertIn("Storage: UTC", html)
        self.assertIn("Display selectable above", html)

        # Must not have ambiguous CST
        self.assertNotIn("CST", html)

    # ── R3: Geographic Percentage Denominators & Visit Terminology Suite ───────
    def test_r3_geographic_visit_wording_chinese_markdown(self):
        """Test R3.1: Chinese Markdown uses '访问' (visit events), never misleading '访客' (visitors)."""
        stats = {
            "topGeo": [
                {"country": "MY", "count": 952, "percentage": 65},
                {"country": "US", "count": 464, "percentage": 32},
            ],
            "chinaProvinces": [
                {"province": "Guangdong", "count": 10, "percentage": 38},
                {"province": "Shanghai", "count": 7, "percentage": 27},
            ],
        }
        prov_lines = format_china_province_table(stats, "zh")
        self.assertIn("| 省份 / 直辖市 | 访问占比 | 省份 / 直辖市 | 访问占比 |", prov_lines)
        prov_str = "".join(prov_lines)
        self.assertNotIn("访客占比", prov_str)
        self.assertNotIn("境内访客省份分布", prov_str)

    def test_r3_geographic_visit_wording_english_markdown(self):
        """Test R3.2: English Markdown uses 'Visit', never misleading 'Visitor' in geo sections."""
        stats = {
            "topGeo": [
                {"country": "MY", "count": 952, "percentage": 65},
                {"country": "US", "count": 464, "percentage": 32},
            ],
            "chinaProvinces": [
                {"province": "Guangdong", "count": 10, "percentage": 38},
                {"province": "Shanghai", "count": 7, "percentage": 27},
            ],
        }
        prov_lines = format_china_province_table(stats, "en")
        self.assertIn("| Province / Municipality | Share | Province / Municipality | Share |", prov_lines)
        prov_str = "".join(prov_lines)
        self.assertNotIn("Visitor", prov_str)

    def test_r3_dashboard_geographic_wording(self):
        """Test R3.3: Local Dashboard titles strictly adhere to visit events for geography."""
        stats = {
            "topGeo": [{"country": "MY", "count": 952, "percentage": 65}],
            "chinaProvinces": [{"province": "Guangdong", "count": 10, "percentage": 38}],
            "cumulativeDailyVisitors": 309,
            "launchedAt": "2026-09-12",
        }
        html = build_html(stats)

        # Must contain authentic visit phrasing
        self.assertIn("🌍 访问地区分布", html)
        self.assertIn("Geographic Distribution of Visits", html)
        self.assertIn("Hide MY", html)

        # Must NOT contain visitor phrasing in geo sections
        self.assertNotIn("访客地理归属", html)
        self.assertNotIn("Global Visitor Geography", html)

    def test_r3_no_rescaling_fallback_when_percentage_missing(self):
        """Test R3.4: When percentage is omitted from API, never fall back to re-normalizing by top sum."""
        stats_geo = {
            "topGeo": [
                {"country": "MY", "count": 10},
                {"country": "US", "count": 10},
            ]
        }
        geo_zh = format_geo_distribution(stats_geo, "zh")
        # If it re-normalized by sum(10+10)=20, it would produce 50%.
        # Authenticity requires 0% rather than synthetic top-sum normalization.
        self.assertNotIn("50%", geo_zh)
        self.assertIn("0%", geo_zh)

        stats_prov = {
            "chinaProvinces": [
                {"province": "Guangdong", "count": 10},
                {"province": "Shanghai", "count": 10},
            ]
        }
        prov_zh = format_china_province_table(stats_prov, "zh")
        prov_zh_str = "".join(prov_zh)
        self.assertNotIn("50%", prov_zh_str)
        self.assertIn("0%", prov_zh_str)


# ── R6: Public / Private Analytics Split Test Suite ────────────────────────
class TestR6PublicPrivateSplit(unittest.TestCase):
    """Test suite for R6: Public / Private Analytics Split."""

    FORBIDDEN_PRIVATE_KEYS = {
        "topGeo", "chinaProvinces", "clientStats",
        "todayHourlyPageViews", "last24HourlyPageViews",
        "clipboardFormatsBreakdown", "referrerDistribution",
        "inputTypeDistribution", "latencyDistribution",
        "errorCategoryDistribution", "playlistSizeDistribution",
        "providerPathDistribution", "exportPlaylistSizeDistribution",
        "clipboardPlaylistSizeDistribution", "rateLimitEndpointDistribution",
        "operationalRecentDays",
        # R7 Resolve Failure Telemetry (Private Only - both canonical and alias names)
        "resolveOutcomes", "resolveFailureCodes",
        "resolveFailureClasses", "resolveFailureStages",
        "resolveRequestedTypes", "resolveRequestedPlatforms",
        "resolveInputTypes", "resolveInputTypeDistribution",
        "resolveFailuresByPlatform", "providerFailurePaths",
        "resolveOutcomeDistribution", "resolveFailureCodeDistribution",
        "resolveFailureClassDistribution", "resolveFailureStageDistribution",
        "resolveRequestedTypeDistribution", "resolveRequestedPlatformDistribution",
        "providerFailurePathDistribution",
    }

    def test_r6_render_website_section_excludes_all_private_dimensions(self):
        """render_website_section must strictly exclude all private sections from public README."""
        stats = {
            "launchedAt": "2026-09-12",
            "cumulativeDailyVisitors": 343,
            "totalVisitors": 343,
            "visitorsToday": 15,
            "totalPageViews": 2655,
            "pageViewsToday": 147,
            "totalPlaylistsParsed": 190,
            "playlistsParsedToday": 5,
            "totalTracksProcessed": 64893,
            "tracksProcessedToday": 1602,
            "totalExports": 641,
            "exportsToday": 36,
            "exportFormatsBreakdown": {"xlsx": 412, "txt": 204, "csv": 15, "json": 10},
            "byPlatform": {
                "qqmusic": {"totalSuccess": 134, "todaySuccess": 3},
                "netease": {"totalSuccess": 20, "todaySuccess": 1},
            },
            "recentDays": [
                {"date": "2026-09-18", "parses": 5, "tracks": 1602, "exports": 36}
            ],
            # Even if private keys exist in a raw dictionary, render_website_section must ignore them
            "topGeo": [{"country": "MY", "count": 10, "percentage": 100}],
            "chinaProvinces": [{"province": "Guangdong", "count": 10, "percentage": 100}],
            "clientStats": {"devices": [{"name": "Desktop", "count": 10, "percentage": 100}]},
        }

        md_zh = render_website_section(stats, "2026-09-18", "zh")
        md_en = render_website_section(stats, "2026-09-18", "en")

        # Must include public KPI, platform shares, export formats
        self.assertIn("343", md_zh)
        self.assertIn("64,893", md_zh)
        self.assertIn("QQ 音乐", md_zh)
        self.assertIn("Excel 表格 (.xlsx)", md_zh)
        self.assertIn("QQ Music", md_en)
        self.assertIn("Excel (.xlsx)", md_en)

        # Must NOT include geographic or device distribution
        self.assertNotIn("访问地区分布", md_zh)
        self.assertNotIn("主要地区来源", md_zh)
        self.assertNotIn("访问设备类型", md_zh)
        self.assertNotIn("主流浏览器", md_zh)
        self.assertNotIn("境内访问省份分布", md_zh)
        self.assertNotIn("Geographic & Client Distribution", md_en)
        self.assertNotIn("Top Visit Regions", md_en)
        self.assertNotIn("Client Devices", md_en)
        self.assertNotIn("Mainland China Visit Province Distribution", md_en)

    def test_r6_traffic_snapshot_cleanliness(self):
        """Sanitized traffic.json must have 0 private keys in website_latest and 0 extra keys in recentDays."""
        repo_root = Path(__file__).resolve().parents[2]
        traffic_path = repo_root / "insights" / "traffic.json"
        self.assertTrue(traffic_path.exists())
        traffic = json.loads(traffic_path.read_text(encoding="utf-8"))

        w = traffic.get("website_latest", {})
        leaked = self.FORBIDDEN_PRIVATE_KEYS.intersection(set(w.keys()))
        self.assertEqual(leaked, set(), f"Private keys leaked in traffic.json: {leaked}")

        allowed_recent_keys = {"date", "parses", "tracks", "exports"}
        for day in w.get("recentDays", []):
            extra = set(day.keys()) - allowed_recent_keys
            self.assertEqual(extra, set(), f"Private keys leaked in traffic.json recentDays: {extra}")

    def test_r6_raw_snapshots_cleanliness(self):
        """All insights/raw/*.json files must have 0 private keys in data.website_stats."""
        repo_root = Path(__file__).resolve().parents[2]
        raw_files = list((repo_root / "insights" / "raw").glob("*.json"))
        self.assertGreater(len(raw_files), 0)

        allowed_recent_keys = {"date", "parses", "tracks", "exports"}
        for p in raw_files:
            data = json.loads(p.read_text(encoding="utf-8"))
            ws = (data.get("data") or {}).get("website_stats")
            if not ws:
                continue
            leaked = self.FORBIDDEN_PRIVATE_KEYS.intersection(set(ws.keys()))
            self.assertEqual(leaked, set(), f"Private keys leaked in {p.name}: {leaked}")

            for day in ws.get("recentDays", []):
                extra = set(day.keys()) - allowed_recent_keys
                self.assertEqual(extra, set(), f"Private keys in recentDays in {p.name}: {extra}")

    def test_r6_dashboard_admin_token_resolution(self):
        """Test token resolution from env var and fallback files."""
        # 1. From env var
        with patch.dict(os.environ, {"INSIGHTS_ADMIN_TOKEN": "test_env_token"}):
            self.assertEqual(get_admin_token(), "test_env_token")

        # 2. From env var stripped
        with patch.dict(os.environ, {"INSIGHTS_ADMIN_TOKEN": "  token_with_spaces  "}):
            self.assertEqual(get_admin_token(), "token_with_spaces")

        # 3. None when missing
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(get_admin_token(repo_root=Path("/non/existent/path")))

    def test_r6_dashboard_fetch_stats_requires_token(self):
        """fetch_stats must reject missing token with ValueError."""
        with patch("scripts.utils.dashboard.get_admin_token", return_value=None):
            with self.assertRaises(ValueError) as ctx:
                fetch_stats("https://example.com/api/internal/stats", token=None)
            self.assertIn("INSIGHTS_ADMIN_TOKEN is missing", str(ctx.exception))

    def test_r6_dashboard_payload_merging(self):
        """merge_maintainer_payload correctly merges public and insights responses."""
        public_data = {
            "launchedAt": "2026-09-12",
            "totalVisitors": 100,
            "recentDays": [
                {"date": "2026-09-18", "parses": 10, "tracks": 200, "exports": 5},
                {"date": "2026-09-17", "parses": 8, "tracks": 150, "exports": 3},
            ]
        }
        insights_data = {
            "topGeo": [{"country": "MY", "count": 50, "percentage": 100}],
            "operationalRecentDays": [
                {"date": "2026-09-18", "clipboards": 4, "visitors": 12, "failures": 1},
                {"date": "2026-09-17", "clipboards": 2, "visitors": 9, "failures": 0},
            ]
        }

        merged = merge_maintainer_payload(public_data, insights_data)
        self.assertEqual(merged["totalVisitors"], 100)
        self.assertEqual(merged["topGeo"], [{"country": "MY", "count": 50, "percentage": 100}])

        # Check merged recentDays
        days_map = {d["date"]: d for d in merged["recentDays"]}
        self.assertEqual(days_map["2026-09-18"]["parses"], 10)
        self.assertEqual(days_map["2026-09-18"]["clipboards"], 4)
        self.assertEqual(days_map["2026-09-18"]["visitors"], 12)
        self.assertEqual(days_map["2026-09-18"]["failures"], 1)
        self.assertEqual(days_map["2026-09-17"]["parses"], 8)
        self.assertEqual(days_map["2026-09-17"]["clipboards"], 2)

    def test_r6_dashboard_html_token_non_leakage(self):
        """build_html must not render token secrets when admin_token is not provided."""
        secret = "super_secret_insights_admin_token_9999"
        stats = {
            "launchedAt": "2026-09-12",
            "totalVisitors": 100,
            "recentDays": [],
            "topGeo": [],
        }
        html = build_html(stats, "2026-09-18 12:00:00 UTC+8")
        self.assertNotIn(secret, html)
        self.assertNotIn("INSIGHTS_ADMIN_TOKEN", html)
        self.assertIn('<script type="text/plain" id="fbToken"></script>', html)

    def test_r6_dashboard_html_embeds_token_when_provided(self):
        """Feedback panel requires admin_token embedded for PUT API calls (local-only dashboard)."""
        secret = "super_secret_insights_admin_token_9999"
        stats = {
            "launchedAt": "2026-09-12",
            "totalVisitors": 100,
            "recentDays": [],
            "topGeo": [],
        }
        html = build_html(stats, "2026-09-18 12:00:00 UTC+8", admin_token=secret)
        self.assertIn(secret, html)
        self.assertIn('id="fbToken"', html)

    def test_r6_collect_calls_public_api_only(self):
        """WEBSITE_STATS_API points to public /api/stats, not internal endpoint."""
        self.assertIn("/api/stats", WEBSITE_STATS_API)
        self.assertNotIn("/api/internal/stats", WEBSITE_STATS_API)


# ── R7: Resolve Failure Telemetry Test Suite ──────────────────────────────
class TestR7ResolveFailureTelemetry(unittest.TestCase):
    """Test suite for R7: Resolve Failure Telemetry & Dashboard Visualizations."""

    def test_r7_formatters(self):
        """Formatters must produce clear bilingual labels for R7 enum tokens."""
        self.assertIn("Playlist Success", format_resolve_outcome_label("success_playlist"))
        self.assertIn("User Success", format_resolve_outcome_label("success_user"))
        self.assertIn("Final Failure", format_resolve_outcome_label("failure"))

        self.assertIn("Input", format_resolve_failure_class_label("input"))
        self.assertIn("Not Found", format_resolve_failure_class_label("not_found"))
        self.assertIn("Upstream Error", format_resolve_failure_class_label("upstream"))
        self.assertIn("Timeout", format_resolve_failure_class_label("timeout"))
        self.assertIn("Ambiguous", format_resolve_failure_class_label("ambiguous"))

        self.assertIn("PLAYLIST_NOT_FOUND", format_resolve_failure_code_label("playlist_not_found"))
        self.assertIn("INVALID_INPUT", format_resolve_failure_code_label("invalid_input"))

        self.assertIn("Input Validation", format_resolve_failure_stage_label("input_validation"))
        self.assertIn("Disambiguation Probe", format_resolve_failure_stage_label("disambiguation_probe"))

        self.assertIn("Auto", format_requested_type_label("auto"))
        self.assertIn("Primary", format_provider_failure_path_label("primary"))

    def test_r7_dashboard_html_renders_all_resolve_cards(self):
        """build_html must render all 8 R7 cards, donut charts, and the failure rate card."""
        stats = {
            "launchedAt": "2026-09-12",
            "totalVisitors": 100,
            "recentDays": [],
            "topGeo": [],
            "resolveOutcomeDistribution": [
                {"name": "success_playlist", "count": 15, "percentage": 75},
                {"name": "failure", "count": 5, "percentage": 25},
            ],
            "resolveFailureClassDistribution": [
                {"name": "not_found", "count": 3, "percentage": 60},
                {"name": "upstream", "count": 2, "percentage": 40},
            ],
            "resolveFailureCodeDistribution": [
                {"name": "playlist_not_found", "count": 3, "percentage": 60},
                {"name": "upstream_error", "count": 2, "percentage": 40},
            ],
            "resolveFailureStageDistribution": [
                {"name": "disambiguation_probe", "count": 3, "percentage": 60},
                {"name": "provider_fetch", "count": 2, "percentage": 40},
            ],
            "resolveRequestedTypeDistribution": [
                {"name": "auto", "count": 12, "percentage": 60},
                {"name": "playlist", "count": 8, "percentage": 40},
            ],
            "resolveRequestedPlatformDistribution": [
                {"name": "auto", "count": 14, "percentage": 70},
                {"name": "qqmusic", "count": 6, "percentage": 30},
            ],
            "resolveInputTypeDistribution": [
                {"name": "standard_url", "count": 15, "percentage": 75},
                {"name": "short_url", "count": 5, "percentage": 25},
            ],
            "resolveFailuresByPlatform": [
                {"name": "qqmusic", "count": 3, "percentage": 60},
                {"name": "netease", "count": 2, "percentage": 40},
            ],
            "providerFailurePathDistribution": [
                {"name": "fallback", "count": 2, "percentage": 100},
            ],
        }

        html = build_html(stats, "2026-09-18 12:00:00 UTC+8")

        # 1. KPI failure rate rendered correctly: 5 failures / 20 resolves = 25.0%
        self.assertIn("25.0%", html)
        self.assertIn("5 失败 / 20 请求", html)

        # 2. Section title
        self.assertIn("解析失败诊断与可靠性", html)

        # 3. Canvas IDs
        expected_canvases = [
            "chartResOutcome",
            "chartResFailClass",
            "chartResFailCode",
            "chartResFailStage",
            "chartResPlatFail",
            "chartProvFailPath",
            "chartResReqType",
            "chartResReqPlat",
            "chartResInputType",
        ]
        for canvas_id in expected_canvases:
            self.assertIn(f'id="{canvas_id}"', html)
            self.assertIn(f"createDonut('{canvas_id}'", html)

    def test_r7_dashboard_html_empty_r7_data(self):
        """build_html handles empty/missing R7 data gracefully without exceptions."""
        stats = {
            "launchedAt": "2026-09-12",
            "totalVisitors": 100,
            "recentDays": [],
            "topGeo": [],
        }
        html = build_html(stats, "2026-09-18 12:00:00 UTC+8")
        self.assertIn("暂无数据 (No data)", html)
        self.assertIn("自 R7 上线起统计", html)
        self.assertIn('id="chartResOutcome"', html)


if __name__ == "__main__":
    unittest.main()
