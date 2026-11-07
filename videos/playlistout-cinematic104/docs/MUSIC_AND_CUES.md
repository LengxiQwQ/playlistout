# Original music score and edit points

**Tempo:** 120.000 BPM (2 beats/second) · 4/4 · 52 bars · exactly 104.000 s.

**Sound style:** original plucky toy-funk + playful electronic chiptune. Synthesized directly in Python/NumPy, no commercial samples, external loops or copyright-managed stock music.

**Core instruments:** warm pitch-sliding funk bass, FM-style mallet plucks, light chiptune lead, simple warm chord pad, synthetic kick/snare/hat. Musical hook: a repeating 12-note original call/response over four-bar Cmaj7 → Am7 → Fmaj7 → G7 harmony. Four-note logo signature at opening, midpoint and final chorus. Stems supplied.

**Events** (selected examples; full event timestamps in `scripts/generate_music.py`):

- 0.5 / 1.5 / 2.5 / 3.5 s: platform stamp pops.
- 6.75 / 7.75 / 8 / 8.75 / 9.25 s: five-point camera handoff (riser, chiptune cue, center impact, landing tick, settled world). The same timing repeats at each 8s boundary, with varied spatial trajectories.
- 18 / 20 s: input focus and parse click.
- 29 s: export control; 32–37 s: six formats popping.
- 50 / 52 / 54 s: selection / stack / ZIP cues.
- 58 / 60 s: plugin installation highlights; 64 / 72 s: export-format routing.
- 89 / 91 / 93 s: keyboard accents on CLI demonstration.
- 100 / 101 / 102 / 103.5 s: closing signature.

Every chapter begins on a bar boundary. Stems are edit-friendly WAV and the soundtrack generator has fixed RNG seed for reproducibility. Waveforms are generated exclusively for this project.

**V2 sound redesign:** For every internal chapter boundary `k*8`, a synthesised stereo journey sweep starts at `k*8−1.25` (on an eighth note), a rising tone accents `k*8−0.25`, a percussive landing marks the bar downbeat `k*8`, and a small click punctuates `k*8+0.75`. The backing music briefly dips around the downbeat to leave transient space; the soundtrack stays one continuous original composition.
