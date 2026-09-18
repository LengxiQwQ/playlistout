# PlaylistOut Repository Rules

## Pre-Push Local CI Gate Rule
Before running or proposing any `git push` command, you MUST run:
```bash
npm run gate
```
All 6 automated checks (Workflow syntax, Secret leak detection, Python compilation & pytest, TypeScript typecheck, Web tests & build, Worker tests & build) must pass locally (100% green). Never push if `npm run gate` fails.
