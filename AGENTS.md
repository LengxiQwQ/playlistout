# PlaylistOut Repository Rules for AI Agents

## 1. Pre-Push Local CI Gate Rule
Before running or proposing any `git push` command, the agent MUST run:
```bash
npm run gate
```
All 7 automated checks must pass locally. Never push if `npm run gate` fails.

## 2. Multi-Player Plugin Architecture
- **Namespace Isolation**: Every player integration lives in `plugins/<player-id>/` and is self-described by `plugin.config.json` plus `package.json`.
- **Player IDs**: Use lowercase kebab-case. The directory name and `plugin.config.json#id` must match exactly.
- **Player-Specific Layouts Are Allowed**: Different player SDKs may require different filenames, module formats, subscription formats, source layouts, or test frameworks. Do not impose MusicFree's artifact name or `plugins.json` on other players.
- **Build Ownership**: Plugin build scripts may write only inside their own plugin directory (normally `dist/`). They MUST NOT write to `web/public/plugins`.
- **Single Publisher**: `scripts/build-plugins.js` is the only owner of `web/public/plugins`. It discovers plugins, validates declared artifacts, publishes each plugin under `/plugins/<player-id>/`, and generates `/plugins/index.json`.
- **Generated Output**: Never hand-edit or commit `web/public/plugins`; it is generated during build/deploy.
- **Testing**: Root commands discover each plugin's `package.json` `build`/`test` scripts. Use `npm run validate:plugins` before web production builds.
- **Dependencies**: A plugin with npm dependencies must keep a plugin-local lockfile. Root runners install those dependencies deterministically on clean machines.
- **Frontend Decoupling**: Available plugin cards come from `/plugins/index.json`. Do not add player-specific conditions, constants, summaries, URLs, or counters to `PluginEcosystem.tsx`.
- **Roadmap Separation**: Proposed/planned integrations may remain in the static roadmap list until a real plugin directory exists.

Detailed plugin procedures are maintained in `.agents/skills/player-plugins/SKILL.md` and `plugins/README.md`.

## 3. Communication, PR Submission & Mobile Clipboard Invariants
- **No "Zero Copyright Risk" Fluff**: Never claim zero copyright risk or lecture developers. Maintain an objective, factual, and modest technical tone.
- **Technical Strengths**: Describe only capabilities verified by the current implementation.
- **Mobile Clipboard Limitation**: Do not advise mobile users to paste large raw playlist JSON strings. Use the target integration's supported online/import mechanism instead.
