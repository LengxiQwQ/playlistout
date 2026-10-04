# Naming Conventions and Routing Architecture

## File Naming Standard

- **Filename format**: `把你的歌单带走-PlaylistOut.js`
- **Why Hyphen (`-`) Instead of Parentheses**:
  - URLs containing unencoded parentheses `(...)` break Markdown hyperlink syntax `[text](https://.../foo(bar).js)`. Most Markdown parsers will truncate the link at the closing parenthesis.
  - Mobile chat apps and clipboards often split URLs containing parentheses.
  - The hyphen `-` is URL-safe and requires no percent-encoding `%28` / `%29`, remaining readable and copy-friendly across all operating systems.

## Platform Display Name

- **Internal Runtime Property**: `platform: "把你的歌单带走 (PlaylistOut)"`
- Inside JavaScript string literals and the player UI, parentheses are clean and visually separate the Chinese brand name from the English repository name.
- **Backward Compatibility**:
  - `isSelfPlatform(name)` must accept both the legacy `"PlaylistOut"` and the standardized `"把你的歌单带走 (PlaylistOut)"`.

## URL Routing Layout

```text
https://playlistout.lengxiqwq.com/
└── plugins/
    ├── index.json                                          # Global catalog of all player plugins
    ├── musicfree/                                          # Player: MusicFree
    │   ├── 把你的歌单带走-PlaylistOut.js                     # Direct plugin file
    │   └── plugins.json                                    # Dedicated MusicFree subscription
    └── <other-player>/                                     # Future player
        ├── 把你的歌单带走-PlaylistOut.js
        └── plugins.json
```
