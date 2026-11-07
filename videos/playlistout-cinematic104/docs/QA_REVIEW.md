# Visual quality review — second pass

**Original pilot problems actually observed:**

1. Collisions between kinetic headings, six platform badges and the travelling song card.
2. Product browser too small, floating file badges over export buttons.
3. Chinese monospaced fallback rendered square glyphs in screenshot captions and simulated JSON.
4. Border and button sizes inconsistent across unrelated UI parts.
5. Too many static panels and weak cues in player/CLI sections.

**V2 Cinematic director cut (current deliverable):**

- Wide shots preserve the measured right 820px stage and 690px headline zone; **close-ups deliberately magnify the stage and fade the headline** while keeping buttons inside the image.
- Six platform tags are now positioned outside the travelling card's text zone.
- `mono` automatically switches Chinese to Noto CJK compatible fonts. No square-glyph placeholder typography for Chinese text.
- Export icon emerges into the spare left margin rather than covering the export toolbar.
- One persistent paper/safe-area design vocabulary for UI border widths, radii and caption space.
- MusicFree highlights its actual three step surfaces; player file arrows have moving markers; CLI command types with a cursor.
- 12 **physical camera moves** use a shared 24,960px world; no hard slide wipes. Incoming and outgoing scenes physically coexist on one long paper canvas. Four variations of the travelling yellow playlist ticket momentarily occlude the joins. Scene camera push-ins make the information flow wide → close → wide rather than 8s static titles.
- Original 120 BPM backing track with rewritten stereophonic sweeps, tape-slap and chiptune hits precisely timed to camera boundaries (−1.25s / beat / +0.75s).

**Technical checks:**

- 3120 SVG frames are deterministically exported; each is nonempty and XML-parsable.
- `quality_check.py` samples 90 frames across all 104 seconds, including every chapter, camera close-ups and transition positions; all contact sheets included. Final video additionally inspected with a contact sheet **extracted from the encoded MP4**.
- Full video metadata is independently verified after render for 1920×1080, 30fps, 104.000s, H.264, AAC stereo.
- The active source code and encoded MP4 share the exact frame function; the fallback renderer does not substitute separate hand-authored slides. Original V1 intermediate videos are excluded from the package.

**Known limitation:** This is an illustrated motion recreation based on the real frontend code and documented features, not live screen capture. Remotion CLI itself could not be installed/tested in the current network-restricted environment; offline production was tested instead.
