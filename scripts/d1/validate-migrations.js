#!/usr/bin/env node
/**
 * Migration File Validator and Immutability Enforcer
 *
 * Ensures:
 * 1. Migration filenames strictly follow format: 4-digit sequence + descriptive snake_case (e.g. 0001_initial_stats.sql).
 * 2. Migration sequence starts at 0001 and is strictly sequential without gaps or duplicates.
 * 3. Historical migrations (0001-0008) are strictly immutable and match the baseline manifest SHA-256 hashes.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const migrationsDir = path.resolve(rootDir, 'worker/migrations');
const manifestPath = path.resolve(__dirname, 'migration-manifest.json');

export function validateMigrations(options = {}) {
  const dir = options.migrationsDir || migrationsDir;
  const manifestFile = options.manifestPath || manifestPath;

  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations directory not found: ${dir}`);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    throw new Error('No migration files found in migrations directory.');
  }

  // 1. Validate naming format and sequence
  const fileRegex = /^(\d{4})_[a-z0-9_]+\.sql$/;
  let expectedSeq = 1;

  for (const file of files) {
    const match = file.match(fileRegex);
    if (!match) {
      throw new Error(
        `Invalid migration filename format: "${file}". Must match 4-digit prefix and snake_case, e.g. 0001_initial_stats.sql`
      );
    }

    const seqNum = parseInt(match[1], 10);
    if (seqNum !== expectedSeq) {
      throw new Error(
        `Migration sequence gap or out-of-order: expected ${String(expectedSeq).padStart(4, '0')} but got ${file}`
      );
    }
    expectedSeq++;
  }

  // 2. Validate historical immutability
  if (fs.existsSync(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    for (const [historicalFile, expectedHash] of Object.entries(manifest)) {
      const filePath = path.join(dir, historicalFile);
      if (!fs.existsSync(filePath)) {
        throw new Error(
          `Historical migration missing: "${historicalFile}" is part of immutable production history and cannot be deleted or renamed!`
        );
      }

      const fileContent = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
      const actualHash = crypto.createHash('sha256').update(fileContent, 'utf8').digest('hex');

      if (actualHash !== expectedHash) {
        throw new Error(
          `Historical migration mutated: "${historicalFile}" has been altered!\n  Expected hash: ${expectedHash}\n  Actual hash:   ${actualHash}\nHistorical migrations (0001-0008) are immutable in production. Create a new migration for schema changes.`
        );
      }
    }
  }

  return {
    valid: true,
    count: files.length,
    files,
  };
}

// Run directly if invoked from CLI
if (process.argv[1] === __filename) {
  try {
    const result = validateMigrations();
    console.log(`✔ Migration files valid (${result.count} migrations verified, immutable historical baseline intact)`);
    process.exit(0);
  } catch (err) {
    console.error('✖ Migration validation failed:', err.message);
    process.exit(1);
  }
}
