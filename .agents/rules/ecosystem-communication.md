---
description: Communication standards, PR submission guidelines, and copy invariants
trigger: always_on
---
# Ecosystem Communication & Copywriting Rules

When drafting user-facing documentation, README files, or Pull Request descriptions for third-party player projects, follow these rules.

## Mandatory invariants

1. **No "Zero Copyright Risk" fluff**
   - Never claim "零版权风险" or lecture upstream developers about copyright.
   - Focus on verified technical behavior: playlist parsing, metadata formatting, export, and interoperability.

2. **Technical honesty and modest tone**
   - Avoid aggressive marketing language, excessive emojis, or exaggerated claims.
   - Describe only capabilities verified by the current implementation and tests.
   - Do not reuse an old player integration's claims without checking the current target.

3. **Player-specific installation instructions**
   - Read `plugins/<player-id>/plugin.config.json` and the generated ecosystem manifest before quoting URLs.
   - Do not assume every player uses the same artifact filename, module format, or subscription descriptor.
   - Mention `plugins.json` only for an integration that actually declares that subscription artifact.

4. **Mobile clipboard guidance**
   - Do not instruct mobile users to paste large raw playlist JSON strings.
   - Recommend the target integration's supported online URL flow, file import, subscription/import feed, or other declared mechanism.
   - Desktop-only clipboard JSON guidance must be clearly labeled as such when applicable.
