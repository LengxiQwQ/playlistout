# Architecture Evolution Roadmap & Resumption Rules

When the user or another agent requests:
> "按照路线图继续重构，继续走。" (Continue refactoring per roadmap)

Follow these invariants:

## 1. Status Source of Truth
- Always check [`docs/ARCHITECTURE-EVOLUTION.md`](file:///d:/Projects/playlistout/docs/ARCHITECTURE-EVOLUTION.md) first to see the current active Phase (P0, P1, P2, or P3) and completed checklists.
- Never guess what's done or restart from scratch. Resume from the first uncompleted task in the current phase.

## 2. Constitutional Invariants
- §1 Non-goals: Never add lyrics scraping, audio extraction, server-side playlist persistence, or `/proxy?url=...`.
- §5 Client-Side Export: Worker must not generate or host export file bytes.
- §8 Security: Strict origin verification; maintain path-specific CORS (e.g. `/api/event` exact match).
- §11 CLI Independence: Standalone CLI tools must remain runnable independently in their own directories.

## 3. Implementation Gotchas
- HTTP 405 Method Not Allowed: Endpoints must return 405 on unsupported methods with `Allow` header matching previous test expectations.
- CORS: Directly wrap `getCorsHeaders` and `handleOptions` from `cors.ts`.
- Python imports: Include `sys.path.insert(0, ...)` for `cli/core/` imports in standalone vendor scripts.

## 4. Phase Completion & Verification
- At the end of each Phase:
  1. Run `npm run gate` to verify 100% green (all 8 steps).
  2. Invoke an independent subagent with acceptance criteria and NO prior conversation context to verify the phase.
  3. Update `docs/ARCHITECTURE-EVOLUTION.md` to mark tasks/phases complete.
  4. Commit code changes cleanly.
