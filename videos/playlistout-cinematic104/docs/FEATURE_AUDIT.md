# Product accuracy audit (checked against public repository in this conversation)

## Verified as actual code/docs functionality

- Web parses QQ Music, NetEase, KuGou (ordinary anonymous limited to first 10 tracks), Kuwo, QiShui and Migu. KuGou concept variant is a special additional path, but not counted as a seventh main platform.
- Export pipeline supports XLSX / JSON / CSV / TXT / M3U8 / Markdown (Web export plugin implementations, README/docs).
- Batch user playlist and ZIP export specified in export docs. The capability depends on the platform and publicly accessible playlists or authorized login.
- MusicFree plugin is present under `plugins/musicfree` and install URL is documented.
- The Web `lxMusic.ts` and `listen1.ts` exporter files are actually present in the repository and have tests. They generate player-specific formats.
- CLI supports Windows, macOS and Linux (platform-specific release bundles); interactive and noninteractive workflows.
- Public API `/api/v1/resolve`, unified JSON, no token needed and rate limits in README/API docs.
- MIT open source.

## Deliberately not depicted as shipped integration

- LX Music / Listen 1: a dedicated **export format** does not mean the player shipped native Playlist Out parsing.
- Soundiiz: only handoff file and manual next-tool workflow is implied; third-party acceptance/success is not guaranteed.
- BBPlayer: described in README as in upcoming app version; video avoids saying it is generally available.
- Planned services and future provider integrations are not shown as delivered.
- We do not show real live API results, real user account files, imported tracks, or music audio files.

## Accuracy references

- https://github.com/LengxiQwQ/playlistout/blob/main/README.md
- https://github.com/LengxiQwQ/playlistout/blob/main/docs/DESIGN-SYSTEM.md
- https://github.com/LengxiQwQ/playlistout/blob/main/docs/EXPORT-FORMATS.md
- https://github.com/LengxiQwQ/playlistout/blob/main/docs/ECOSYSTEM-INTEGRATION.md
- https://github.com/LengxiQwQ/playlistout/tree/main/web/src/utils/export/plugins
