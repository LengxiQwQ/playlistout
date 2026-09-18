#!/usr/bin/env node
/**
 * Production D1 Identity Verifier (Fail-Closed)
 *
 * Verifies that:
 * 1. Target database exists in the specified Cloudflare account.
 * 2. Database UUID returned by Cloudflare API strictly matches worker/wrangler.jsonc.
 * 3. Does NOT mutate config files or auto-create missing databases during normal deployment.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const wranglerPath = path.resolve(rootDir, 'worker/wrangler.jsonc');

export function getExpectedDatabaseConfig() {
  if (!fs.existsSync(wranglerPath)) {
    throw new Error(`Wrangler configuration file not found at: ${wranglerPath}`);
  }
  const content = fs.readFileSync(wranglerPath, 'utf8');
  const nameMatch = content.match(/"database_name":\s*"([^"]+)"/);
  const idMatch = content.match(/"database_id":\s*"([^"]+)"/);

  if (!nameMatch || !idMatch) {
    throw new Error('Could not parse database_name and database_id from worker/wrangler.jsonc');
  }

  return {
    databaseName: nameMatch[1],
    databaseId: idMatch[1],
  };
}

export async function verifyDatabaseIdentity(options = {}) {
  const token = options.token || process.env.CLOUDFLARE_API_TOKEN;
  const accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  const expected = options.expected || getExpectedDatabaseConfig();
  const fetchFn = options.fetch || globalThis.fetch;

  if (!token || !accountId) {
    throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be provided to verify remote D1 database.');
  }

  const res = await fetchFn(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = JSON.stringify(errJson.errors || errJson);
    } catch {
      errorDetail = `HTTP status ${res.status}`;
    }
    throw new Error(`Cloudflare API request failed (${res.status}): ${errorDetail}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Cloudflare API returned error: ${JSON.stringify(data.errors)}`);
  }

  const databaseList = data.result || [];
  const db = databaseList.find((d) => d.name === expected.databaseName);

  if (!db || !db.uuid) {
    throw new Error(
      `Production D1 database "${expected.databaseName}" not found in Cloudflare account ${accountId}.\n` +
      'Normal deployment fails closed and will NEVER automatically create an empty production database.\n' +
      'If this is a new environment setup, run explicit provisioning: node scripts/d1/provision-db.js'
    );
  }

  if (db.uuid !== expected.databaseId) {
    throw new Error(
      `Production D1 database "${expected.databaseName}" UUID mismatch!\n` +
      `  Expected in wrangler.jsonc: ${expected.databaseId}\n` +
      `  Actual in Cloudflare API:   ${db.uuid}\n` +
      'Aborting deployment to prevent pointing production Worker to incorrect database.'
    );
  }

  return {
    verified: true,
    databaseName: expected.databaseName,
    databaseId: expected.databaseId,
  };
}

if (process.argv[1] === __filename) {
  verifyDatabaseIdentity()
    .then((result) => {
      console.log(`✔ Verified D1 database "${result.databaseName}" identity: UUID ${result.databaseId} matches wrangler.jsonc.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✖ D1 identity verification failed: ${err.message}`);
      process.exit(1);
    });
}
