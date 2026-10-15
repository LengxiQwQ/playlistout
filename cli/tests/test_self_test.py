# -*- coding: utf-8 -*-
"""
Tests for Frozen Self-Test Suite
"""

from cli.core.self_test import run_self_test


def test_run_self_test():
    """Verify that the internal self-test runs and returns 0 exit code."""
    result = run_self_test()
    assert result == 0
