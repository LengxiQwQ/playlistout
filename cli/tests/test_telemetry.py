# -*- coding: utf-8 -*-
"""
Tests for PlaylistOut CLI Telemetry & Insights Integration
==========================================================
Verifies non-blocking execution, privacy opt-outs, payload formatting,
headers, silent fail-open behavior, and batch event packaging.
"""

import os
import sys
import json
import time
from unittest.mock import patch, MagicMock

import pytest

from cli.core.telemetry import (
    set_telemetry_enabled,
    is_telemetry_enabled,
    clear_event_queue,
    get_platform_system,
    get_telemetry_url,
    queue_event,
    flush_telemetry,
    report_export,
    report_export_formats,
    report_resolve,
    _dispatch_event_payload,
)


@pytest.fixture(autouse=True)
def reset_telemetry_state():
    """Ensure telemetry state is reset before and after every test."""
    set_telemetry_enabled(None)
    clear_event_queue()
    yield
    set_telemetry_enabled(None)
    clear_event_queue()


def test_platform_system_mapping():
    with patch("sys.platform", "win32"):
        assert get_platform_system() == "windows"
    with patch("sys.platform", "darwin"):
        assert get_platform_system() == "macos"
    with patch("sys.platform", "linux"):
        assert get_platform_system() == "linux"
    with patch("sys.platform", "freebsd"):
        assert get_platform_system() == "other"


def test_telemetry_opt_out_mechanisms(monkeypatch):
    # Default under pytest has PYTEST_CURRENT_TEST set, so is_telemetry_enabled() is False
    assert not is_telemetry_enabled()

    # If programmatic override is True, it overrides environment
    set_telemetry_enabled(True)
    assert is_telemetry_enabled()

    # Programmatic override to False
    set_telemetry_enabled(False)
    assert not is_telemetry_enabled()

    # Clear programmatic override
    set_telemetry_enabled(None)

    # When PYTEST_CURRENT_TEST is temporarily cleared
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)

    # Test DO_NOT_TRACK=1
    monkeypatch.setenv("DO_NOT_TRACK", "1")
    assert not is_telemetry_enabled()

    monkeypatch.delenv("DO_NOT_TRACK", raising=False)
    monkeypatch.setenv("PLAYLISTOUT_NO_TELEMETRY", "1")
    assert not is_telemetry_enabled()

    monkeypatch.delenv("PLAYLISTOUT_NO_TELEMETRY", raising=False)

    # Test sys.argv flag --no-telemetry
    with patch.object(sys, "argv", ["main.py", "--no-telemetry"]):
        assert not is_telemetry_enabled()

    # Test sys.argv flag --self-test
    with patch.object(sys, "argv", ["main.py", "--self-test"]):
        assert not is_telemetry_enabled()

    # Normal state without opt-outs
    with patch.object(sys, "argv", ["main.py"]):
        assert is_telemetry_enabled()


def test_telemetry_custom_base_url(monkeypatch):
    monkeypatch.setenv("PLAYLISTOUT_API_BASE_URL", "http://127.0.0.1:8787")
    assert get_telemetry_url() == "http://127.0.0.1:8787/api/event"


@patch("requests.post")
def test_dispatch_event_payload_headers_and_body(mock_post):
    payload = {"type": "export", "platform": "qqmusic", "format": "xlsx", "trackCount": 50}

    _dispatch_event_payload(payload)

    assert mock_post.called
    call_args, call_kwargs = mock_post.call_args
    assert call_args[0].endswith("/api/event")
    headers = call_kwargs["headers"]
    assert headers["X-PlaylistOut-Client-Type"] == "cli"
    assert headers["X-PlaylistOut-Client-Id"] == "official_cli"
    assert "X-PlaylistOut-Client-Version" in headers
    assert headers["X-PlaylistOut-Host"] in ("windows", "macos", "linux", "other")
    assert headers["X-PlaylistOut-Device-Class"] == "desktop"
    assert call_kwargs["timeout"] == 2.0

    sent_body = json.loads(call_kwargs["data"])
    assert sent_body == payload


@patch("requests.post", side_effect=Exception("Network connection failed"))
def test_dispatch_event_payload_silent_fail_open(mock_post):
    """Network exceptions MUST be completely swallowed without raising."""
    payload = {"type": "visit"}
    # Should not raise any exception
    _dispatch_event_payload(payload)


@patch("cli.core.telemetry._dispatch_event_payload")
def test_report_export_single(mock_dispatch):
    set_telemetry_enabled(True)

    report_export("QQMUSIC", "XLSX", 120, auto_flush=True)
    time.sleep(0.05)

    assert mock_dispatch.call_count == 1
    payload = mock_dispatch.call_args[0][0]
    assert payload["type"] == "export"
    assert payload["platform"] == "qqmusic"
    assert payload["format"] == "xlsx"
    assert payload["trackCount"] == 120


@patch("cli.core.telemetry._dispatch_event_payload")
def test_report_export_formats_batches_in_single_request(mock_dispatch):
    """Multiple formats from one export session must be packed into 1 single HTTP request."""
    set_telemetry_enabled(True)

    report_export_formats("netease", ["xlsx", "csv", "json"], 30, auto_flush=True)
    time.sleep(0.05)

    # Exactly 1 HTTP request sent, not 3!
    assert mock_dispatch.call_count == 1
    batch_payload = mock_dispatch.call_args[0][0]
    assert batch_payload["type"] == "batch"
    events = batch_payload["events"]
    assert len(events) == 3
    assert [e["format"] for e in events] == ["xlsx", "csv", "json"]
    for e in events:
        assert e["platform"] == "netease"
        assert e["trackCount"] == 30


@patch("cli.core.telemetry._dispatch_event_payload")
def test_report_resolve_with_auto_flush(mock_dispatch):
    set_telemetry_enabled(True)

    report_resolve(
        platform="kugou",
        outcome="failure",
        latency_ms=1450.2,
        failure_code="upstream_error",
        auto_flush=True,
    )
    time.sleep(0.05)

    assert mock_dispatch.called
    payload = mock_dispatch.call_args[0][0]
    assert payload["type"] == "resolve"
    assert payload["platform"] == "kugou"
    assert payload["outcome"] == "failure"
    assert payload["latencyMs"] == 1450
    assert payload["failureCode"] == "upstream_error"


@patch("cli.core.telemetry._dispatch_event_payload")
def test_single_event_dispatch_unwrapped(mock_dispatch):
    set_telemetry_enabled(True)

    queue_event({"type": "resolve", "platform": "qqmusic", "outcome": "success_playlist"})
    flush_telemetry(wait=True)

    assert mock_dispatch.call_count == 1
    payload = mock_dispatch.call_args[0][0]
    # Single event should not be wrapped in batch
    assert payload["type"] == "resolve"
    assert payload["platform"] == "qqmusic"


@patch("cli.core.telemetry._dispatch_event_payload")
def test_batch_multi_playlist_export_single_http_request(mock_dispatch):
    """
    Simulates a batch export of 5 playlists each exporting 2 formats.
    Total events: 1 resolve + (5 * 2) exports = 11 events.
    Verifies that all events across all playlists are packed into EXACTLY 1 single HTTP request
    with 0 data loss.
    """
    set_telemetry_enabled(True)

    # 1. Resolve user playlists (queued, auto_flush=False)
    report_resolve("qqmusic", "success_user", track_count=5, auto_flush=False)

    # 2. Loop over 5 playlists, exporting xlsx and csv (queued, auto_flush=False)
    for i in range(5):
        report_export_formats("qqmusic", ["xlsx", "csv"], track_count=20 + i, auto_flush=False)

    # During the loop, no network calls should have been made
    assert not mock_dispatch.called

    # 3. Batch flow finishes and flushes once
    flush_telemetry(wait=True)

    # Exactly 1 HTTP request made!
    assert mock_dispatch.call_count == 1
    batch_payload = mock_dispatch.call_args[0][0]
    assert batch_payload["type"] == "batch"
    events = batch_payload["events"]

    # 1 resolve + 10 exports = 11 events preserved
    assert len(events) == 11
    assert events[0]["type"] == "resolve"
    assert events[0]["outcome"] == "success_user"

    export_events = events[1:]
    assert len(export_events) == 10
    assert all(e["type"] == "export" for e in export_events)
    assert all(e["platform"] == "qqmusic" for e in export_events)
    # Formats alternates xlsx, csv
    assert [e["format"] for e in export_events] == ["xlsx", "csv"] * 5


@patch("cli.core.telemetry._dispatch_event_payload")
def test_batch_over_100_events_chunks_safely(mock_dispatch):
    """
    Simulates a huge export session producing 250 events (e.g. 125 playlists x 2 formats).
    Verifies that events are chunked into batches of at most 100 items each,
    ensuring they never exceed the Worker's 200-event batch limit.
    """
    set_telemetry_enabled(True)

    for i in range(250):
        queue_event({"type": "export", "platform": "netease", "format": "xlsx", "trackCount": i})

    flush_telemetry(wait=True)

    # 250 events / 100 = 3 chunks (100, 100, 50)
    assert mock_dispatch.call_count == 3
    chunk1 = mock_dispatch.call_args_list[0][0][0]
    chunk2 = mock_dispatch.call_args_list[1][0][0]
    chunk3 = mock_dispatch.call_args_list[2][0][0]

    assert chunk1["type"] == "batch"
    assert len(chunk1["events"]) == 100
    assert chunk2["type"] == "batch"
    assert len(chunk2["events"]) == 100
    assert chunk3["type"] == "batch"
    assert len(chunk3["events"]) == 50

