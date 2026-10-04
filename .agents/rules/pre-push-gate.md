---
description: Enforce local CI gate before any git push
trigger: always_on
---
# Pre-Push CI Gate Enforcer

Before proposing or executing any `git push` command, the agent MUST run the full local CI gate:
```bash
npm run gate
```

## Mandatory Invariants:
1. **Zero Push Without Local Gate**: NEVER execute or propose `git push` before running `npm run gate` (or `node scripts/ci-gate.js`) and verifying it exits with `0` (ALL GATES PASSED).
2. **Failure Resolution**: If any of the 7 gates fail (workflow validation, secret leak, Python tests, typecheck, player-plugin build/test + web tests/build, worker tests/build, or D1 migrations), the issue MUST be resolved and re-tested locally before attempting to push.
3. **Workflow Syntax Protection**: Never commit or push GitHub Actions workflows with secrets in `if:` conditions or unvalidated YAML.
4. **Credential Non-Leakage**: Verify no `.dev.vars`, `.env.local`, or hardcoded tokens are tracked or present in git diffs.
5. **Universal Plugin Verification**: Step 5 of the CI gate runs `npm run validate:plugins`, which rebuilds/publishes every declared plugin artifact first and then runs every plugin's own test script. Any plugin addition or modification must pass this clean build → publish → test chain before pushing.
