# Analytics backup policy

This directory must not contain raw Cloudflare D1 exports, production database dumps, or historical restore SQL with real analytics rows.

Production recovery uses **Cloudflare D1 Time Travel** and/or backups stored outside the public repository. If a SQL fixture is ever needed for tests, it must use synthetic data and live under an appropriate test-fixture directory instead of this folder.

Repository CI rejects tracked `*.sql` files here.
