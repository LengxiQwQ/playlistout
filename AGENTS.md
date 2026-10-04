# PlaylistOut Repository Rules for AI Agents

## 1. Pre-Push Local CI Gate Rule
Before running or proposing any `git push` command, the agent MUST run:
```bash
npm run gate
```
All 7 automated checks (Workflow syntax, Secret leak detection, Python compilation & pytest, TypeScript typecheck, Web tests & build, Worker tests & build including player plugins, D1 migration safety) must pass locally (100% green). Never push if `npm run gate` fails.

## 2. Multi-Player Plugin Architecture & Naming Standards
- **Namespace Isolation**: Each music player plugin integration must reside in `plugins/<player-id>/` with its own `src/`, `test/`, and `scripts/build.js`.
- **URL & File Naming Safety**: Plugin filenames MUST use hyphens (`把你的歌单带走-PlaylistOut.js`). NEVER use parentheses in filenames or URLs, as parentheses break Markdown link syntax and cause mobile clipboard truncation.
- **Platform Display Name**: The runtime metadata display name is `把你的歌单带走 (PlaylistOut)`. Backward compatibility in `isSelfPlatform()` must be preserved.
- **Universal Discovery**: All player plugins are automatically discovered and built via `npm run build:plugins` and tested via `npm run test:plugins`. Never hardcode player artifacts in root configurations.
- **Frontend Decoupling**: Player links in `web/src/components/ecosystem/PluginEcosystem.tsx` must be dynamic, data-driven from integration configs.

## 3. Communication, PR Submission & Mobile Clipboard Invariants
- **No "Zero Copyright Risk" Fluff**: Never claim zero copyright risk or lecture developers. Maintain an objective, factual, and modest technical tone.
- **Technical Strengths**: Highlight genuine achievements: Kugou login-free sheet parsing, NetEase large sheet paging, and standard dual-mode parsing.
- **Mobile Clipboard Limitation**: Mobile React Native clipboards truncate text around ~2000 characters. NEVER advise or advertise pasting raw JSON text on mobile devices (mobile should use URL or subscription import; desktop supports raw JSON pasting).
- **Skills Reference**: Detailed procedures and runbooks are maintained in `.agents/skills/player-plugins/SKILL.md`.
