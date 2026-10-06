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
    Handler,
    get_admin_token,
)


class TestPublicInsightsAuthenticity(unittest.TestCase):
    def test_platform_share_uses_real_counts_only(self):
        stats = {
            "qqmusic": {"totalSuccess": 134},
            "netease": {"totalSuccess": 20},
            "kugou": {"totalSuccess": 28},
            "qishui": {"totalSuccess": 8},
        }
        zh = format_platform_shares(stats, "zh")
        self.assertIn("134 次", zh)
        self.assertIn("20 次", zh)
        self.assertIn("28 次", zh)
        self.assertIn("8 次", zh)

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
        with patch.dict(os.environ, {}, clear=True):
            self.assertIsNone(get_admin_token(Path("/definitely/missing")))

    def test_dashboard_never_embeds_admin_token(self):
        secret = "super_secret_insights_admin_token_9999"
        self.assertNotIn(secret, HTML)
        self.assertNotIn("INSIGHTS_ADMIN_TOKEN", HTML)
        self.assertNotIn("fbToken", HTML)
        self.assertIn("Token 不进入浏览器", HTML)

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

    def test_dashboard_date_controls_support_single_day_and_arbitrary_range(self):
        self.assertIn('id="singleDate"', HTML)
        self.assertIn('id="fromDate"', HTML)
        self.assertIn('id="toDate"', HTML)
        self.assertIn('data-range="daybefore"', HTML)
        self.assertIn("AbortController", HTML)
        self.assertIn("CACHE_MS=15000", HTML)

    def test_dashboard_dynamic_selects_use_id_selectors(self):
        self.assertIn('let s=$("#"+id);if(!s)return', HTML)
        self.assertNotIn("let s=$(id),old=s.value", HTML)

    def test_security_quarantine_follows_selected_date_range(self):
        self.assertIn('new URLSearchParams(dates())', HTML)
        source = Path(__file__).with_name("dashboard.py").read_text(encoding="utf-8")
        self.assertIn('"date", "from", "to"', source)

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
            {"from", "to", "channel", "client", "platform", "country", "region"},
        )
        self.assertEqual(FEEDBACK_PARAMS, {"status", "limit", "offset", "id"})

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
