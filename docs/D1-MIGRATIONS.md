# Cloudflare D1 Provisioning & Migration Safety Guide

This document defines the operational architecture, safety guarantees, developer workflows, and disaster recovery procedures for PlaylistOut’s Cloudflare D1 database (`playlistout-stats`).

---

## 1. Single Source of Truth & Architecture

PlaylistOut standardizes on **Cloudflare Wrangler Native Migrations** as the authoritative engine for migration execution and history tracking:
- **Command**: `npx wrangler d1 migrations apply playlistout-stats --remote` (or `--local` in test harnesses).
- **History Table**: `d1_migrations` (`id INTEGER PRIMARY KEY AUTOINCREMENT`, `name TEXT UNIQUE`, `applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
- **No Dual Writers**: Custom execution and split-brain tracking engines have been eliminated.

---

## 2. Normal Deployment vs. Explicit Provisioning

| Dimension | Normal Production Deployment | Explicit Environment Provisioning |
| :--- | :--- | :--- |
| **Trigger** | Push to `main` branch or standard release | Initial deployment, new account, or DR |
| **Missing DB Behavior** | **FAIL CLOSED** (Never auto-creates) | Creates database via Cloudflare REST API |
| **Database Identity** | Verifies name and UUID against `wrangler.jsonc` | Queries Cloudflare API; saves assigned UUID |
| **Config Mutation** | **Zero mutation** (`wrangler.jsonc` is immutable) | Updates `worker/wrangler.jsonc` `database_id` |
| **Command** | GitHub Actions `deploy-worker.yml` | `node scripts/d1/provision-db.js` |

### Production Deployment Sequence
```text
1. Worker Unit & Regression Tests (vitest)
2. D1 Migration Safety Test Suite (npm run test:d1)
3. Migration File Immutability Check (validate-migrations.js)
4. Cloudflare D1 Identity Verification (verify-db.js — fails closed if missing/mismatched)
5. Preflight Migration History Verification (verify-migration-history.js --remote --mode=pre-apply — exact prefix required; untracked fails closed)
6. Wrangler Native Migration Apply (wrangler d1 migrations apply playlistout-stats --remote)
7. Postflight Schema & Exact History Verification (verify-schema.js --remote — tables, columns, indexes, exact history equality)
8. Worker Deployment (wrangler deploy)
9. Admin Secret Configuration
```

---

## 3. Concurrency & Serialization

To prevent concurrent migrations or deployment race conditions:
```yaml
concurrency:
  group: playlistout-production-worker-deploy
  cancel-in-progress: false
```
- Consecutive pushes queue sequentially rather than cancelling in-flight migration jobs.
- Each migration runs to completion before the subsequent job begins.

---

## 4. Developer Guide: Creating New Migrations

### Standard Command
Generate new sequential migration files using Wrangler CLI:
```bash
cd worker
npx wrangler d1 migrations create playlistout-stats <migration_name>
```

### Immutable Migration Policy
- **Historical migrations (`0001`–`0008`) are strictly immutable**.
- Never edit, rename, or delete existing applied migration files.
- All historical migrations are protected by SHA-256 hash baselines in `scripts/d1/migration-manifest.json`. Tampering with any historical file fails both the local pre-push gate and CI.
- Bug fixes or schema updates must always be added as **new versioned migration files** (e.g. `0009_*.sql`).

### Expand / Contract Principle (Ahead-of-Code Safety)
Because migrations run immediately before the new Worker code is deployed, database schema evolves faster than application code:
1. **Backward Compatibility**: Migrations must never break the currently running Worker version (e.g. use `ADD COLUMN` with defaults or nullable columns, add new tables/indexes).
2. **Expand / Contract Lifecycle**:
   - **Phase 1 (Expand)**: Deploy migration adding new tables or columns. Old Worker continues running normally.
   - **Phase 2 (Switch)**: Deploy Worker using the new schema.
   - **Phase 3 (Contract)**: After verifying production stability, deploy a subsequent migration to prune deprecated tables or columns.

---

## 5. Failure Semantics & Disaster Recovery

### Case A: Migration SQL Failure
- **Behavior**: Cloudflare D1 transactions roll back the failing statement batch. The migration is **not recorded** in `d1_migrations`, and the deployment pipeline **halts immediately** (preventing the Worker from deploying).
- **Resolution**:
  1. Inspect the deployment log error detail.
  2. Fix the SQL script or add required prerequisites.
  3. Re-push or re-run the deployment pipeline.

### Case B: Worker Deployment Fails After Migration Succeeded
- **Behavior**: Database migrations succeeded and are recorded in `d1_migrations`. The existing Worker remains active serving traffic.
- **Safety**: Due to the Expand/Contract principle, the database changes are backward-compatible and do not break the current Worker.
- **Resolution**: Fix the Worker build/configuration issue and re-trigger deployment. Migration apply on retry will recognize `0 pending migrations` and no-op.

### Case C: Production Database Corruption
- **Recovery Procedure**: Cloudflare D1 provides automated Time Travel snapshots:
  ```bash
  # Check available time-travel bookmarks / point-in-time
  npx wrangler d1 info playlistout-stats
  
  # Restore database to a safe timestamp (UTC)
  npx wrangler d1 time-travel restore playlistout-stats --timestamp="2026-09-18T12:00:00Z"
  ```
- Automated reverse-SQL rollbacks are intentionally prohibited to prevent data loss.

---

## 6. Legacy Untracked Database Baseline

If an existing production database possesses full schema tables but was provisioned prior to tracking:
- **Normal deploy fails closed** with an explicit error.
- **Explicit baseline command**:
  ```bash
  node scripts/d1/baseline-legacy.js --baseline-existing --confirm
  ```
- **Guarantees**:
  1. Verifies schema evidence (e.g. verifies `city` column in `daily_geo_stats` and `reset_at` in `security_rate_limits`).
  2. Bounded strictly to historical boundary `0001`–`0008`.
  3. Future migrations (e.g. `0009`+) are **never** swallowed and will remain pending for proper application.

---

## 7. Verification & Testing Commands

```bash
# Run local D1 migration safety test suite
npm --prefix worker run test:d1

# Validate migration file naming and immutability
node scripts/d1/validate-migrations.js

# Full pre-push CI gate (includes all 7 automated checks)
npm run gate
```
