#!/usr/bin/env node
/**
 * Explicit D1 Provisioning Script
 *
 * Used for initial environment setup, disaster recovery, or explicit operator provisioning.
 * 1. Finds or creates the D1 database.
 * 2. Updates worker/wrangler.jsonc with the real database_id (without requiring "routes" block).
 * 3. Applies initial migrations using Wrangler native runner.
 * 4. Verifies post-provisioning schema completeness.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyD1Schema } from './verify-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const workerDir = path.resolve(rootDir, 'worker');
const wranglerPath = path.resolve(workerDir, 'wrangler.jsonc');

export function updateWranglerDatabaseId(filePath, newUuid) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const oldMatch = content.match(/"database_id":\s*"([^"]+)"/);

  if (!oldMatch) {
    throw new Error(`Could not find "database_id" in ${filePath}`);
  }

  const oldUuid = oldMatch[1];
  if (oldUuid === newUuid) {
    return { updated: false, oldUuid, newUuid };
  }

  const updatedContent = content.replace(
    `"database_id": "${oldUuid}"`,
    `"database_id": "${newUuid}"`
  );

  fs.writeFileSync(filePath, updatedContent, 'utf8');

  // Verify file was correctly updated
  const verifiedContent = fs.readFileSync(filePath, 'utf8');
  const verifyMatch = verifiedContent.match(/"database_id":\s*"([^"]+)"/);
  if (!verifyMatch || verifyMatch[1] !== newUuid) {
    throw new Error(`Failed to update database_id in ${filePath}`);
  }

  return { updated: true, oldUuid, newUuid };
}

export async function provisionDatabase(options = {}) {
  const token = options.token || process.env.CLOUDFLARE_API_TOKEN;
  const accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  const dbName = options.databaseName || 'playlistout-stats';
  const fetchFn = options.fetch || globalThis.fetch;
  const configPath = options.wranglerPath || wranglerPath;

  if (!token || !accountId) {
    throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be provided for D1 provisioning.');
  }

  console.log(`Checking D1 database: "${dbName}" in account ${accountId}...`);
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. List existing databases
  const listRes = await fetchFn(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
    { headers }
  );

  if (!listRes.ok) {
    throw new Error(`Failed to query Cloudflare D1 list API: HTTP ${listRes.status}`);
  }

  const listData = await listRes.json();
  if (!listData.success) {
    throw new Error(`Cloudflare D1 list failed: ${JSON.stringify(listData.errors)}`);
  }

  let db = (listData.result || []).find((d) => d.name === dbName);
  let dbUuid = db?.uuid;

  // 2. Create if not found
  if (!dbUuid) {
    console.log(`Database "${dbName}" not found. Creating new D1 instance...`);
    const createRes = await fetchFn(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: dbName }),
      }
    );

    if (!createRes.ok) {
      throw new Error(`Failed to create D1 database: HTTP ${createRes.status}`);
    }

    const createData = await createRes.json();
    if (!createData.success) {
      throw new Error(`Cloudflare D1 create failed: ${JSON.stringify(createData.errors)}`);
    }

    dbUuid = createData.result?.uuid;
    console.log(`Successfully created D1 database "${dbName}" with UUID: ${dbUuid}`);
  } else {
    console.log(`Found existing D1 database "${dbName}" with UUID: ${dbUuid}`);
  }

  // 3. Update configuration
  const updateResult = updateWranglerDatabaseId(configPath, dbUuid);
  if (updateResult.updated) {
    console.log(`Updated database_id in ${path.basename(configPath)}: ${updateResult.oldUuid} -> ${updateResult.newUuid}`);
  } else {
    console.log(`${path.basename(configPath)} already contains database_id: ${dbUuid}`);
  }

  // 4. Apply migrations if not skipped
  if (!options.skipMigrations) {
    console.log('Applying pending migrations using Wrangler native runner...');
    execSync(`npx wrangler d1 migrations apply ${dbName} --remote`, {
      cwd: workerDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ACCOUNT_ID: accountId,
      },
    });

    // 5. Verify schema
    console.log('Verifying remote schema...');
    await verifyD1Schema({ remote: true, databaseName: dbName });
  }

  console.log(`✔ D1 Provisioning complete for "${dbName}" (${dbUuid}).`);
  return { dbName, dbUuid };
}

if (process.argv[1] === __filename) {
  provisionDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`✖ Provisioning failed: ${err.message}`);
      process.exit(1);
    });
}
