# Storyboard — Playlist Out · Paper Trail

56.000 s · 1,680 frames · 30 fps · 120 BPM (1 beat = 0.5 s, 1 bar = 2 s)

## One-line pitch

A little ink note escapes a playlist trapped among six music apps, carries it
through Playlist Out's real web flow, folds the songs into files, gathers twelve
playlists into one workbook, drops into a terminal, then leaves a trail of paper
and red thread toward the players and a final notebook cover.

## Shot map

| Time | Frames | Picture | Sound |
|---|---|---|---|
| 0:00–0:06 | 0–180 | A close paper stage. Six coloured platform tickets are tied by red thread to one playlist card. The note picks at the tape; the threads snap; the card escapes. The camera is already handing off to the web page that rises from the desk. | Warm Fmaj9/Dm9 pad, Rhodes, vinyl. Snap at 3.58, paper whoosh 4.95, brand stamp 5.42. Drums enter at 4.0. |
| 0:05–0:09 | 150–270 | The Playlist Out web page is fully present. Its hero and search note settle. A QQ Music link is typed; the QQ chip wakes; the parse button is pressed. | Full groove from 6.0. Typing ticks 7.3–8.2, parse click 8.5, small fill. |
| 0:09–0:16 | 270–480 | The result paper unrolls out of the search note. Playlist summary and six song rows write in. The page scrolls to the export panel. The cursor selects JSON; Excel is already selected. | 9.0 paper unfold. Table ticks. 14.9 selection click, 15.9 export click, success chime 16.06. |
| 0:16–0:26 | 480–780 | Song rows peel off and fold into an XLSX file. A JSON card slides out. CSV/TXT/M3U8/Markdown fan out below. The workbook and JSON become the focus. A manila folder opens: “wait, there is more than one playlist.” It folds into the browser; the page turns. | Music dips at 16.2; paper burst, XLSX pop 17.35, JSON pop 18.4, format flops 19.3. Folder 24.3, page turn 25.4. |
| 0:25.2–0:26 | 756–780 | A letterpress cream chapter sheet rises over the old result page: **NEXT PAGE · 02 / 批量手账 / 把 12 张歌单，收进同一本。** It holds for a beat, then lifts to reveal the collection page. The little note rides the page edge. | Paper whoosh at 25.3; music continues. |
| 0:26–0:36 | 780–1080 | The real user-collection page: 12 checked QQ Music playlists, 12/12 selected, multi-sheet Excel selected. Batch progress runs. Twelve cards feed a 12-sheet workbook; ZIP is shown as the alternative. Both settle into an envelope marked “next stop”. | Fullest groove, claps. Batch click 28.08, progress ticks, workbook 30.0, zip 31.4, pack 33.1. |
| 0:35.5–0:46 | 1066–1380 | The envelope gives way to a real Windows PowerShell terminal, taped onto the journal page. `playlistout` prints the six-platform menu; a QQ URL is pasted; details and format list appear; `1, 2` is typed; Excel + JSON lines land. Windows / macOS / Linux badges appear below. | Drums drop at 35.55, terminal roll. Command typing 36.0–36.5, URL 39.0–39.5, format choice 41.2–41.5. Success 43.9. |
| 0:45.5–0:51.4 | 1366–1542 | Terminal recedes. Canonical JSON sits above three player cards — MusicFree (plugin), 洛雪音乐 (JSON import), Listen 1 (JSON restore). BBPlayer is a dashed “即将上线” note; Soundiiz is third-party; Public API / JSON is the open data surface. | Warm reprise at 46.0; pops; three check stamps 48.1; page rip at 51.35. |
| 0:51.35–0:56 | 1540–1680 | A cream cover sheet sweeps up over the collage, becoming the final notebook cover. Logo sticker, title, Chinese tagline, URL, GitHub / MIT. The note lands on the logo's edge. | Drums cut at 51.35, reverse cymbal, Bb–C–Fmaj9 cadence at 52/53/54. Final bell + 2 s tail. |

## Continuous devices

1. **The performer note** (`src/notePath.ts`) is one path over the whole stage.
   It never resets between scenes. It is small and clear of body copy; it is
   deliberately absent during the densest workbook/zip frames.
2. **Red thread** ties platform tags, the JSON payload and the player cards.
   It is broken at the escape, then becomes a dotted guide.
3. **The browser window** stays a stable object from 5 s to 36 s. Scrolling,
   page turning and file cards happen inside/over it. It is never rotated or
   scaled pointlessly.
4. **Paper physics**: cards arrive on springs, tape is pinched, hard shadows
   stay on the lower right, and handwriting draws on with masks rather than
   spinning text.
5. **Data morphs**: track rows → paper strips → workbook; 12 cards → 12 sheet
   tabs; files → envelope → terminal → player cards.
6. **Colour beats**: mint/green = Excel/verified; blue = JSON/API; pink = Listen 1;
   lavender = 洛雪; yellow = journal highlights; red thread = connection.

## Typography hierarchy

- Chinese hero / handwritten headlines: **Ma Shan Zheng** (OFL, the site's own
  `zhnote` preset family), large sizes only.
- Latin handwriting and small annotations: **Caveat** (OFL).
- English brand & bold hand-lettering: **Permanent Marker** (Apache-2.0).
- Technical metadata, URLs, table numbers, terminal: **Space Mono** (OFL).
- Dense Chinese UI copy, status lines, legal/player descriptions:
  **Noto Sans SC** (OFL).

No system KaiTi/楷体 is used as a fake handwriting fallback.

## Frame-level inspection notes

The awkward hand-offs are intentionally overlapped rather than cut:

- 3.58–4.1: thread snap and card lift
- 4.95–6.0: browser sheet rise (the search page content is already mounted)
- 9.0–9.7: result paper unroll while page scrolls
- 16.22–17.4: track ribs fold into file
- 25.2–26.0: folder fly + cream chapter sheet + batch reveal
- 35.5–36.2: terminal sheet over the browser
- 45.5–46.4: terminal recedes under ecosystem cards
- 51.35–52.1: cover wipe
