/**
 * Cloudflare D1 Provisioning and Migration Script
 * 
 * Automatically provisions the playlistout-stats D1 database using the
 * Cloudflare REST API, updates worker/wrangler.jsonc with the real database_id,
 * and applies the initial migration.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const workerDir = path.resolve(rootDir, 'worker');
const wranglerPath = path.resolve(workerDir, 'wrangler.jsonc');

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !accountId) {
  console.error('Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be provided.');
  process.exit(1);
}

const DB_NAME = 'playlistout-stats';

async function main() {
  console.log(`Checking D1 database: ${DB_NAME}...`);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. List existing databases
  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
    { headers }
  );

  const listData = await listRes.json();
  if (!listData.success) {
    console.error('Failed to list D1 databases:', JSON.stringify(listData.errors));
    process.exit(1);
  }

  let db = listData.result?.find((d) => d.name === DB_NAME);
  let dbUuid = db?.uuid;

  // 2. Create if not found
  if (!dbUuid) {
    console.log(`Database "${DB_NAME}" not found. Creating new D1 instance...`);
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: DB_NAME }),
      }
    );

    const createData = await createRes.json();
    if (!createData.success) {
      console.error('Failed to create D1 database:', JSON.stringify(createData.errors));
      process.exit(1);
    }

    dbUuid = createData.result.uuid;
    console.log(`Successfully created D1 database "${DB_NAME}" with UUID: ${dbUuid}`);
  } else {
    console.log(`Found existing D1 database "${DB_NAME}" with UUID: ${dbUuid}`);
  }

  // 3. Update worker/wrangler.jsonc with the real database_id
  let wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
  const oldIdMatch = wranglerContent.match(/"database_id":\s*"([^"]+)"/);

  if (oldIdMatch && oldIdMatch[1] !== dbUuid) {
    console.log(`Updating worker/wrangler.jsonc database_id: ${oldIdMatch[1]} -> ${dbUuid}`);
    wranglerContent = wranglerContent.replace(
      `"database_id": "${oldIdMatch[1]}"`,
      `"database_id": "${dbUuid}"`
    );
    // Ensure zone routes block is not present
    if (wranglerContent.includes('"routes"')) {
      wranglerContent = wranglerContent.replace(/\s*"routes":\s*\[\s*\{[\s\S]*?\}\s*\],?/g, '');
      fs.writeFileSync(wranglerPath, wranglerContent, 'utf8');
    }
  } else {
    console.log(`worker/wrangler.jsonc already contains database_id: ${dbUuid}`);
  }

  // 4. Run remote migrations with single-execution history tracking
  console.log('Checking remote migration history on D1...');
  const migrationsDir = path.resolve(workerDir, 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  // Helper to execute SQL queries directly against remote D1 using Cloudflare REST API
  async function queryD1(sql, params = []) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbUuid}/query`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ sql, params }),
      }
    );
    const data = await res.json();
    if (!data.success) {
      throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
    }
    return data.result?.[0]?.results || [];
  }

  // Ensure migration tracking table exists
  await queryD1(`
    CREATE TABLE IF NOT EXISTS d1_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Query already applied migrations
  const appliedRows = await queryD1('SELECT name FROM d1_migrations;');
  const appliedSet = new Set(appliedRows.map((r) => r.name));

  // Check if database was already initialized before migration tracking was introduced
  if (appliedSet.size === 0) {
    const tableRows = await queryD1(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='aggregate_stats';"
    );
    const hasExistingTables = Number(tableRows[0]?.count || 0) > 0;

    if (hasExistingTables) {
      console.log('Existing production database detected without migration tracking table.');
      console.log('Baselining existing migrations (0001-0007) to prevent destructive re-runs (e.g. geo/city clobber)...');
      for (const file of migrationFiles) {
        await queryD1('INSERT OR IGNORE INTO d1_migrations (name) VALUES (?1);', [file]);
        appliedSet.add(file);
      }
      console.log('Baseline established: existing migrations recorded as already applied.');
    }
  }

  // Execute unapplied migrations in order
  for (const migrationFile of migrationFiles) {
    if (appliedSet.has(migrationFile)) {
      console.log(`Migration ${migrationFile} already applied, skipping.`);
      continue;
    }

    try {
      const migrationPath = `./migrations/${migrationFile}`;
      const migrationCmd = `npx wrangler d1 execute ${DB_NAME} --remote --file=${migrationPath} --yes`;
      console.log(`Applying: ${migrationCmd}`);
      execSync(migrationCmd, {
        cwd: workerDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: token,
          CLOUDFLARE_ACCOUNT_ID: accountId,
        },
      });

      // Record in d1_migrations
      await queryD1('INSERT INTO d1_migrations (name) VALUES (?1);', [migrationFile]);
      appliedSet.add(migrationFile);
      console.log(`Migration ${migrationFile} successfully applied and recorded in d1_migrations!`);
    } catch (err) {
      console.error(`Migration ${migrationFile} execution failed:`, err);
      process.exit(1);
    }
  }

  console.log('D1 setup and migration complete!');
}

main().catch((err) => {
  console.error('Fatal error in setup-d1:', err);
  process.exit(1);
});
