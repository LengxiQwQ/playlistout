#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PlaylistOut Insights Authenticity & Synthetic Data Elimination Test Suite (Phase R1)
Verifies that no analytics paths fabricate, estimate, infer, seed, or invent data.
"""

import unittest
from scripts.utils.collect import (
    format_platform_shares,
    format_geo_distribution,
    format_china_province_table,
    format_client_distribution,
    render_website_section,
    compute_running_days,
)
from scripts.utils.dashboard import build_html


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
        self.assertIn("createHBar('chartGeo', [], [],", html)
        self.assertIn("createHBar('chartChina', [], [],", html)
        self.assertIn("createDonut('chartBrowser', [], []);", html)
        self.assertIn("createDonut('chartDevice', [], []);", html)
        self.assertIn("createDonut('chartPlatform', [], []);", html)


if __name__ == "__main__":
    unittest.main()
