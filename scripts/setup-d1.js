/**
 * D1 Provisioning Script Wrapper (R8 Modular Architecture)
 *
 * For explicit provisioning of a new D1 instance or disaster recovery,
 * this delegates directly to scripts/d1/provision-db.js.
 *
 * For normal production deployment, use:
 *   - node scripts/d1/verify-db.js
 *   - npx wrangler d1 migrations apply playlistout-stats --remote
 *   - node scripts/d1/verify-schema.js --remote
 */

import { provisionDatabase } from './d1/provision-db.js';

provisionDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`Fatal error in setup-d1: ${err.message}`);
    process.exit(1);
  });
