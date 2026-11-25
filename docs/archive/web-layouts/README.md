# Web Layouts & Style Switcher Archive

Archived on 2026-11-25 when the web app was streamlined to keep only two viewport-bound default pages without an in-app layout switcher: **之字形日记 (Layout A / Timeline)** for desktop (`> 768px`) and **软木拼贴 (Layout B / Pinboard)** for mobile (`<= 768px`).

## Archived Components (`components/`)

- [`App.multi-style.tsx`](components/App.multi-style.tsx) — Multi-style `App.tsx` supporting `legacy` single-column mode and `LayoutDemoView` (`a` / `b` / `c` / `d`) switching.
- [`LayoutDemoViews.tsx`](components/LayoutDemoViews.tsx) — Multi-layout view switcher containing:
  - `LayoutADemo`: 之字形日记 (Modern Cozy Macaron Stationery)
  - `LayoutBDemo`: 软木板拼贴 (Pastel Linen Pinboard Bento Collage — kept as active `PinboardLayout`)
  - `LayoutCDemo`: 侧栏手帐 (Sticky Sidebar Open Planner Book)
  - `LayoutDDemo`: 分屏首页 + 横向货架 (Split Hero & Anime Sticky-Note Edition)
- [`HeroVariants.tsx`](components/HeroVariants.tsx) — Hero section variants `?hero=0..5` (used by Layout A) and dev floating switcher.
- [`StyleContext.tsx`](components/StyleContext.tsx) — React context + query/hash/localStorage persistence (`?style=` / `?layout=`, `playlistout-journal-style`).
- [`StyleSwitcher.tsx`](components/StyleSwitcher.tsx) & [`StyleSwitcher.test.tsx`](components/StyleSwitcher.test.tsx) — Desktop dropdown style switcher component and test suite.
- [`MobileSettingsDrawer.with-styles.tsx`](components/MobileSettingsDrawer.with-styles.tsx) — Mobile drawer snapshot including the 5-card style selector section.

## Archived Styles (`styles/`)

- [`layout-demos.css`](styles/layout-demos.css) — Shared style picker menu + base A/B/C/D demo layout CSS.
- [`layout-a.css`](styles/layout-a.css) — Layout A (之字形日记) theme & sticker CSS.
- [`layout-c.css`](styles/layout-c.css) — Layout C (侧栏手帐) theme CSS.
- [`layout-d.css`](styles/layout-d.css) — Layout D (晴空便签) theme CSS.
- [`hero-variants.css`](styles/hero-variants.css) — Hero Variants 0..5 CSS.
