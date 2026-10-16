# Documentation Archive

This directory is the index for completed PlaylistOut delivery plans and release-era documentation.

## v2.0.0 — QQ Music Web MVP

The original P0–P9 roadmap is complete and frozen with the `v2.0.0` release. It should no longer be used as the active task list.

Historical references:

- [Full P0–P9 Roadmap at v2.0.0](https://github.com/LengxiQwQ/playlistout/blob/v2.0.0/docs/ROADMAP.md)
- [v2.0.0 Release](https://github.com/LengxiQwQ/playlistout/releases/tag/v2.0.0)
- [`v2.0.0` tag](https://github.com/LengxiQwQ/playlistout/tree/v2.0.0)

The active forward-looking roadmap remains at [`docs/ROADMAP.md`](../ROADMAP.md).

## Unified CLI Hardening — Phases 0–7

The unified CLI hardening plan completed on `main` between commits `719db75` (Phase 0) and `a0ccb80` (Phase 7); the final state is covered by 215 CLI tests and a green 4-platform Release CLI dry-run. It was archived on 2026-10-16 and must not be re-executed as an open task list.

- [Unified CLI Hardening Plan (archived)](UNIFIED-CLI-HARDENING-PLAN.md)
- Roadmap mapping: [P4 in `docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md)

## Daily Active (DAU) Telemetry — Phases 1–4

The cross-client DAU telemetry plan completed on `main` between commits `db145da` (Phase 1, Worker infrastructure + migration `0018`) and `20071d6` (Phase 3, dashboard tab + public stats), with the MusicFree 2.2.0 silent heartbeat in `71cc567`. Production verification passed on 2026-10-16 (UTC): Deploy Worker run #171 applied the migration and ran schema / analytics / public-stats reconciliation, and end-to-end probes confirmed registered-plugin acceptance (204), same-day dedup (two heartbeats → +1), invalid-Origin and unregistered-client rejection (403), and the public-stats merge. The 7-day observation window from the plan continues as an operational checklist item; the document itself is a frozen record and must not be re-executed as an open task list.

- [DAU Telemetry Plan (archived)](DAU-TELEMETRY-PLAN.md)

## Archive rule

Completed major roadmaps should remain immutable in their corresponding Git tag/release. The `main` branch should keep only a concise archive index and the current roadmap, rather than duplicating large historical planning documents.
