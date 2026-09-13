# PlaylistOut Music Journal Design System

> Version: V1  
> Status: Active  
> Scope: PlaylistOut Web UI, frontend interaction, visual components, responsive behavior, i18n, font profiles, result presentation, statistics presentation, and future frontend extensions.

---

## 1. Design Identity

PlaylistOut's official design language is **Music Journal / 音乐手账**.

PlaylistOut should feel like a real digital music notebook that happens to be functional, rather than a conventional SaaS website with a hand-drawn skin.

The core metaphor is:

- Paper is the interface.
- Sticky notes are task surfaces.
- Tape and stickers are decoration and labels.
- Marker strokes communicate emphasis.
- Song rows feel like records written into a notebook.
- Imperfection creates personality, but must never reduce clarity.

The governing rule is:

> **90% order + 10% deliberate imperfection.**

The visual style may include slightly irregular borders, small rotations, paper shadows, tape, handwriting, doodles, and marker highlights. Important text, data, tables, controls, and actions must remain clear and stable.

---

## 2. Product Priority

PlaylistOut exists to help a user complete one path:

**Paste → Parse → View → Export**

Everything else is secondary.

UI decisions must preserve this order of importance:

1. Playlist parsing
2. Track data
3. Export
4. Playlist cover
5. Track cover
6. Statistics
7. Decoration

A failure in a lower-priority layer must never break a higher-priority layer.

Examples:

- Track cover failure must not break playlist parsing.
- Statistics failure must not hide parsed results.
- A font CDN failure must fall back gracefully.
- Decorative animation failure must have no functional impact.

---

## 3. Current Technical Boundary

The production frontend remains based on the current project architecture:

- React
- TypeScript
- Vite
- Existing frontend API client layer
- Cloudflare Worker backend
- Cloudflare D1 for aggregate statistics
- Vitest + Testing Library for current frontend tests

This redesign is primarily a **presentation-layer and UX refactor**, not a backend rewrite.

Do not replace stable parsing/export/API logic only to match a visual prototype.

The HTML visual prototype may use implementation shortcuts for experimentation. Production code must translate the prototype into maintainable React components and semantic CSS instead of copying prototype-only architecture blindly.

---

## 4. Header

All primary pages use a lightweight shared header.

Desktop structure:

```text
[ icon ] PlaylistOut                         [ Fonts ] [ 中 / EN ] [ GitHub ]
```

The left side contains:

- PlaylistOut icon
- PlaylistOut wordmark

The right side contains:

- Font profile switcher
- Language switcher
- GitHub entry

Do not add unnecessary enterprise navigation such as Product / Pricing / Solutions / Dashboard unless the product genuinely grows to require those destinations.

The brand area may use a small yellow paper/sticker surface with a slight rotation. Clicking the brand returns to the primary page / initial workspace according to the current routing model.

---

## 5. Language System

PlaylistOut V1 officially supports:

- Simplified Chinese (`zh-CN`)
- English (`en-US`)

The header language control should visually belong to the notebook theme. Do not use an unstyled browser-native select box.

Recommended visible forms:

```text
中 / EN
```

or a small paper dropdown.

Language switching should:

- happen without a full page reload;
- update `<html lang>` correctly;
- persist the user's choice in local storage;
- fall back to a deterministic default when no preference exists.

### 5.1 i18n architecture

Use a lightweight typed dictionary rather than introducing a large internationalization framework for only two languages unless future requirements justify it.

Recommended structure:

```text
web/src/i18n/
  index.ts
  zh-CN.ts
  en-US.ts
  LanguageProvider.tsx
  useTranslation.ts
```

All user-visible strings must be routed through the language layer.

Do not scatter bilingual ternaries through UI components.

Prefer stable keys such as:

```text
playlist.input.placeholder
playlist.parse
playlist.loading
playlist.error
playlist.result
playlist.trackCount
export.txt
export.csv
export.xlsx
export.json
stats.today
stats.total
```

---

## 6. Font System

The font switcher is part of the product and remains available to users.

The official default PlaylistOut font profile is the original journal profile:

| Role | Default font |
| --- | --- |
| Brand / major heading | Permanent Marker |
| Handwriting / expressive UI | Caveat |
| Annotation / side note | Nanum Pen Script |
| Data / URL / technical values | Space Mono |
| Chinese fallback | Noto Sans SC or another readable CJK fallback |

The user's font choice is a **font profile**, not one font forced onto every element.

Each profile may define separate fonts for:

- display / brand
- handwriting
- annotation
- data / monospace
- CJK fallback

The font menu should show a real preview of each profile and visually resemble a paper/sticker dropdown.

Persist the selected profile locally.

### 6.1 Font loading

Do not eagerly download every experimental font on initial page load.

Prefer:

- default fonts loaded initially;
- alternative profiles loaded on demand where practical;
- sensible fallback stacks if a font fails.

---

## 7. Page Background

The base page represents notebook paper.

Primary paper color:

```text
#FDFBF7
```

Primary ink:

```text
#2D3436
```

Notebook horizontal line:

```text
#DFE6E9
```

Margin-line accent:

```text
#FF8A80
```

Desktop may show:

- notebook horizontal rules;
- left margin line;
- binder / loose-leaf holes.

Mobile should simplify the metaphor:

- remove or reduce binder holes;
- optionally hide the margin line;
- keep the paper texture / rules;
- reduce decorative noise.

---

## 8. Color Language

PlaylistOut colors come from stationery, not from a conventional SaaS palette.

Core roles:

| Token role | Usage |
| --- | --- |
| Paper | page and large paper surfaces |
| Ink | primary text and outlines |
| Highlighter Yellow | emphasis and hover marker |
| Sticky Yellow | playlist input surface |
| Tape Pink | decoration / tag |
| Tape Cyan | decoration / tag |
| Mint Note | success / statistics |
| Blue Note | secondary information |
| Soft Red | errors |

Primary highlight:

```text
#FFEAA7
```

Avoid introducing unrelated visual languages such as:

- purple/blue AI gradients;
- neon glow;
- cyberpunk styling;
- glassmorphism;
- liquid-glass styling;
- generic enterprise blue gradients.

---

## 9. Paper, Note, Sticker and Tape

Do not model every surface as a generic `Card`.

The design vocabulary is:

- `Paper`
- `StickyNote`
- `Sticker`
- `Tape`
- `MarkerButton`
- `PaperInput`
- `PaperDropdown`
- `PaperModal`

The production implementation should expose reusable primitives for these patterns instead of repeating ad-hoc CSS in feature components.

### 9.1 Hand-drawn border

Use a small, finite set of hand-drawn border variants.

For example:

- Paper A
- Paper B

Do not invent a new random border radius for every component.

### 9.2 Rotation

Rotation communicates human placement, not chaos.

| Element | Recommended rotation |
| --- | --- |
| Body text | 0° |
| Track table/list data | 0° |
| Input field | 0° |
| Large paper | -1° to +1° |
| Sticky note | -2° to +2° |
| Sticker | -3° to +3° |
| Tape | -8° to +8° |
| Pure decoration | max approximately ±12° |

Important information stays horizontal.

### 9.3 Shadow

Use hard paper-like shadows instead of large blurred floating-card shadows.

Typical paper direction:

```text
8px 10px 0 rgba(45, 52, 54, 0.15)
```

Typical interactive button shadow:

```text
3px 3px 0 #2D3436
```

Hover may slightly increase the offset.

---

## 10. Homepage Information Architecture

The homepage order is fixed conceptually as:

```text
Header
↓
Small Hero
↓
Playlist Search Note
↓
Playlist Result Paper
↓
Export Area
↓
Light Product Notes
↓
Statistics Journal
↓
Footer
```

### Critical rule

Nothing should interrupt the path between search and result.

Do not place the following between them:

- today's parse count;
- total parse count;
- platform breakdown;
- marketing features;
- analytics charts;
- unrelated product explanation.

A user who parses a playlist should see the result immediately below the primary input workflow.

---

## 11. Hero

The hero is deliberately small.

It should establish personality, then get out of the way.

Example English tone:

```text
Let your playlist out.
Paste it. Parse it. Take it with you.
```

Example Chinese tone:

```text
把你的歌单带走。
粘贴、解析，然后带走。
```

Avoid oversized landing-page marketing content.

---

## 12. Playlist Search Note

The primary task surface is a large yellow sticky note.

It contains only the essentials:

- URL / playlist input;
- parse action;
- supported-platform indicator;
- loading feedback;
- error feedback when relevant.

It should not become a container for every product advantage, privacy paragraph, badge, or statistic.

The user should immediately understand where to paste a link.

### 12.1 Supported platform truthfulness

Only show platforms that are actually implemented in production.

At the time this design system was created, the production provider implementation is QQ Music.

The design may provide a reusable platform sticker component, but future platforms must only appear after their provider is genuinely available.

---

## 13. UI State Model

The existing semantic states remain useful:

```text
idle
loading
success
error
```

However, the search surface should remain present across the workflow.

Recommended visual structure:

```text
NotebookLayout
  Header
  SearchNote
  [LoadingNote]
  [ErrorNote]
  [ResultPaper]
  InfoNotes
  StatsJournal
  Footer
```

On success, do not replace the entire search experience with a result-only page unless a future routing requirement explicitly demands it.

The user should be able to paste another playlist without first navigating back through a reset-only screen.

---

## 14. Loading

Loading should feel hand-made but restrained.

Good motifs include:

- a hand-drawn circle;
- a pencil/marker progress stroke;
- short handwritten status text.

Example strings:

```text
Reading the playlist...
Writing songs down...
Almost there...
```

or localized equivalents.

Do not make the entire UI constantly shake or wiggle.

---

## 15. Error

Errors should appear as a soft red or pink paper note integrated into the journal.

Example:

```text
Oops — this link doesn't look right.
Try a public QQ Music playlist link.
```

The input remains editable.

Do not fall back to visually unrelated Bootstrap/Material/system alerts.

---

## 16. Playlist Result Paper

Parsed results appear on a large white paper surface directly after the search workflow.

Recommended header content:

```text
PARSED PLAYLIST

[ playlist cover ]
Playlist name
Creator
Track count · Platform
```

Playlist-level cover art is already a first-class concept in the normalized playlist contract and should be displayed when available.

If absent or broken, the UI falls back gracefully.

---

## 17. Track Cover Art

Per-track cover art is an optional progressive enhancement and may be added to the normalized `Track` contract as:

```ts
coverUrl?: string;
```

The current QQ Music raw metadata already exposes album metadata such as an album MID in upstream song objects. Production implementation should inspect and reuse provider metadata to derive or preserve a stable cover URL where feasible.

### Hard constraints

Do not implement track artwork as an N+1 scraping pattern such as one additional upstream API request per song.

Preferred flow:

```text
Provider metadata
↓
Normalize
↓
Track.coverUrl
↓
PlaylistOut API
↓
React UI
```

If a stable cover URL cannot be derived safely from the metadata already available, omit the artwork rather than degrading parsing reliability.

Track-cover behavior:

- cover available → display it;
- cover unavailable → placeholder;
- image load failure → placeholder;
- artwork failure must never fail playlist parsing.

### 17.1 Track artwork presentation

Desktop recommended artwork size:

```text
40–44px square
```

The artwork should remain secondary to track information.

PlaylistOut is a playlist data/export utility, not a music player.

Use lazy loading for track artwork and avoid loading unnecessarily large image assets for tiny thumbnails.

---

## 18. Track List

Desktop may use a table-like structure:

```text
# | Cover | Title | Artist | Album | ...
```

Mobile should be allowed to become a compact vertical track list instead of forcing a wide table.

Track hover may use a subtle yellow highlighter stroke.

Avoid:

- glowing hover effects;
- aggressive scaling;
- generic blue selection states;
- Material DataGrid styling.

---

## 19. Export Area

Current export formats remain visually represented as small paper/sticker controls:

```text
[ TXT ] [ CSV ] [ XLSX ] [ JSON ]
```

The final primary export action may use a strong ink-black button:

```text
EXPORT ↓
```

Large black-filled controls should be reserved for high-priority actions such as Parse and Export.

Existing export business logic should be preserved unless a functional defect requires change.

---

## 20. Statistics Journal

Statistics belong after the core workflow.

They should feel like notes at the end of the journal, not an admin dashboard.

Suggested conceptual layout:

```text
TODAY'S NOTE
- playlists parsed today
- tracks processed today

ALL TIME
- total playlists
- total tracks
- total exports

FROM WHERE?
- platform breakdown
```

The existing statistics API contract should be reused rather than replaced for visual reasons.

If statistics fail to load, the main parsing/export experience remains fully usable.

---

## 21. Footer

The footer should remain lightweight and personal.

Example tone:

```text
Drawn & coded with ♥ by LengxiQwQ
GitHub · Privacy · About
```

Avoid a large corporate mega-footer unless the product scope changes substantially.

---

## 22. Modal Language

Privacy, About, Changelog, or similar dialogs should use a `PaperModal` visual treatment.

The modal should look like another paper placed above the notebook:

- paper background;
- hand-drawn outline;
- optional tape decoration;
- clear close control;
- readable body typography.

Do not use an unrelated generic rounded SaaS dialog without adapting it to the design language.

---

## 23. Motion Language

All animation follows **Paper Motion**.

Allowed examples:

- paper lifting by 1–2px;
- marker/highlighter stroke reveal;
- tape or tiny decoration floating slowly;
- dropdown unfolding like paper;
- subtle hand-drawn arrow appearance.

Avoid:

- particle systems;
- neon pulses;
- dramatic 3D card transforms;
- large parallax effects;
- constant bouncing;
- excessive spring animation.

Typical interaction duration:

```text
150–300ms
```

Slow decorative motion may use approximately 2–5 seconds.

Respect reduced-motion preferences.

---

## 24. Responsive Design

Recommended desktop content width:

```text
1000–1150px
```

Recommended search-note width:

```text
640–720px
```

Recommended result-paper width:

```text
900–1050px
```

Mobile rules:

- single-column layout;
- reduce rotations;
- reduce decorative elements significantly;
- hide/reduce binder decoration;
- convert track table into a mobile-friendly track list where necessary;
- keep Header access to brand, font, and language controls;
- GitHub may collapse to a compact icon/control.

---

## 25. Accessibility

The notebook metaphor must not reduce usability.

Requirements:

- interactive target size around 44×44px where practical;
- visible keyboard focus;
- dropdowns usable by keyboard;
- status is not communicated by color alone;
- decorative elements use `aria-hidden` where appropriate;
- artwork has useful or intentionally empty alternative text according to context;
- body text remains readable even when expressive fonts are used elsewhere;
- important data is never rendered only in a hard-to-read handwriting font.

---

## 26. Performance

Visual personality must remain lightweight.

Requirements:

- lazy-load track artwork;
- request appropriately sized images where possible;
- do not fetch every optional font on first load;
- avoid expensive always-running animation;
- do not introduce heavy UI frameworks solely for styling;
- preserve current efficient API boundaries.

---

## 27. Frontend Component Architecture

Recommended production structure:

```text
web/src/
  design/
    tokens.css
    typography.css
    paper.css
    motion.css
    responsive.css

  components/
    ui/
      Paper.tsx
      StickyNote.tsx
      Sticker.tsx
      Tape.tsx
      MarkerButton.tsx
      PaperInput.tsx
      PaperDropdown.tsx
      PaperModal.tsx

    layout/
      Header.tsx
      NotebookLayout.tsx
      Footer.tsx

    playlist/
      PlaylistInput.tsx
      PlaylistSummary.tsx
      TrackTable.tsx
      ExportToolbar.tsx

    stats/
      StatsJournal.tsx

    settings/
      FontSwitcher.tsx
      LanguageSwitcher.tsx

  i18n/
    zh-CN.ts
    en-US.ts
    index.ts

  hooks/
    usePlaylistParser.ts
    useStats.ts
    useLanguage.ts
    useFontProfile.ts
```

This is a target architecture, not permission to rewrite working modules unnecessarily.

Refactor incrementally and preserve behavior.

---

## 28. CSS and Design Tokens

Production styling should use semantic CSS and shared design tokens.

Do not scatter raw values across feature components.

Example token direction:

```css
:root {
  --paper: #fdfbf7;
  --ink: #2d3436;
  --note-yellow: #fff8bd;
  --highlight-yellow: #ffeaa7;
  --line: #dfe6e9;
  --margin-red: #ff8a80;

  --font-display: "Permanent Marker", cursive;
  --font-hand: "Caveat", cursive;
  --font-note: "Nanum Pen Script", cursive;
  --font-data: "Space Mono", monospace;
}
```

The HTML prototype may use Tailwind for rapid design iteration, but the current production project should not gain Tailwind solely because the prototype used it.

Prefer the current React + semantic CSS direction unless there is a separately approved technical reason to change it.

---

## 29. API Boundary

UI components must not directly scrape or call third-party music services.

Correct architecture:

```text
React UI
↓
web/src/api/client.ts
↓
PlaylistOut API
↓
Cloudflare Worker
↓
Provider
↓
Music service
```

This applies to parsing and normalized metadata.

Feature components must not bypass the API/client boundary with direct upstream calls.

A presentational component such as `TrackRow` may load a normalized image URL supplied by the API, but it must not contain QQ Music metadata construction/scraping logic.

---

## 30. Backend and Business-Logic Preservation

A UI redesign must not casually modify:

- provider parsing behavior;
- pagination correctness;
- normalized API semantics;
- rate-limit behavior;
- analytics privacy guarantees;
- export correctness;
- error contracts;
- security headers;
- existing statistics contracts.

Backend changes are allowed only when the UI requirement genuinely needs a new normalized field or a confirmed functional fix.

The track-artwork field is an example of a justified small contract extension if implemented safely and compatibly.

---

## 31. Product Voice

PlaylistOut copy should be simple, young, light, and slightly playful.

Good:

```text
Let your playlist out.
Your songs are ready.
Take the list with you →
Another playlist?
```

Avoid exaggerated startup language such as:

```text
Unlock the ultimate AI-powered playlist transformation experience.
```

The product is friendly and confident, not corporate and not childish.

---

## 32. What PlaylistOut Must Not Become

The UI must not drift into:

- a conventional admin dashboard;
- Material Design;
- Bootstrap styling;
- generic AI-gradient landing pages;
- glassmorphism;
- a page made entirely from rounded cards;
- uncontrolled random rotations;
- decoration that blocks core workflow;
- visual imitation of Spotify/Apple Music as a player product.

PlaylistOut has its own visual identity: a working music journal.

---

## 33. Review Checklist

Before accepting any new UI component, check:

1. Does it look like it belongs in the same music journal?
2. Does it preserve Paste → Parse → View → Export?
3. Is it using shared tokens/primitives rather than one-off styling?
4. Does it work in Chinese and English?
5. Does it survive missing artwork/data?
6. Does it behave sensibly on mobile?
7. Does it preserve accessibility and keyboard use?
8. Does it avoid unnecessary upstream/API changes?
9. Does it preserve existing tests or replace them with equivalent/better coverage?
10. Is decorative complexity lower priority than reliability?

If the answer to (1) is no, redesign it.

If the answer to (2) is no, remove it or reduce its visual priority.

---

## 34. Design Constitution

> **PlaylistOut is a working digital music journal.**
>
> Paper, sticky notes, tape, marker strokes, handwriting, and small imperfections give it personality, but those elements always serve the product rather than dominate it.
>
> A user should immediately understand where to paste a playlist, see parsed results immediately after parsing, and export them without navigating through marketing or statistics.
>
> The permanent core flow is:
>
> **Paste → Parse → View → Export.**
>
> Everything else is secondary.
