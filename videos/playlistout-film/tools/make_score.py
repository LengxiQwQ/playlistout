"""Original 58-second soundtrack & foley synthesizer for Playlist Out Film.

Style: Playful Electronic × Funky Bass × Light Chiptune × Cozy Felt Piano / Marimba.
Tempo: 120 BPM (2.0s per bar, 29 bars = 58.0s), 48 kHz 16-bit Stereo WAV.
100% procedurally synthesized with NumPy — zero external samples or copyrighted recordings.
"""
from __future__ import annotations

import json
import math
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48_000
BPM = 120
BEAT = 60.0 / BPM  # 0.5s
BAR = BEAT * 4     # 2.0s
DURATION = 58.0
N = int(SR * DURATION)

rng = np.random.default_rng(20261108)
timeline = json.loads((ROOT / "src" / "timeline.json").read_text(encoding="utf-8"))
CUES: dict[str, float] = timeline["cues"]


def sec(t: float) -> int:
    return int(round(t * SR))


def midi(note: str) -> int:
    names = {
        "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
        "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
    }
    pitch, octave = note[:-1], int(note[-1])
    return (octave + 1) * 12 + names[pitch]


def hz(note: str) -> float:
    return 440.0 * (2.0 ** ((midi(note) - 69) / 12.0))


def env_adsr(n: int, a: float = 0.008, d: float = 0.18, s_level: float = 0.25, r: float = 0.04) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    attack = np.clip(t / max(1e-4, a), 0.0, 1.0)
    decay = s_level + (1.0 - s_level) * np.exp(-np.maximum(0.0, t - a) / max(1e-4, d))
    out = attack * decay
    nr = min(n, sec(r))
    if nr > 0:
        out[-nr:] *= np.linspace(1.0, 0.0, nr) ** 1.3
    return out


class StereoBus:
    def __init__(self) -> None:
        self.L = np.zeros(N, dtype=np.float64)
        self.R = np.zeros(N, dtype=np.float64)

    def add(self, start: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0) -> None:
        i = sec(start)
        if i < 0 or i >= N or len(sig) == 0:
            return
        s = sig[: N - i]
        angle = (max(-1.0, min(1.0, pan)) + 1.0) * (math.pi / 4.0)
        self.L[i : i + len(s)] += s * gain * math.cos(angle) * 1.414
        self.R[i : i + len(s)] += s * gain * math.sin(angle) * 1.414


music = StereoBus()
sfx = StereoBus()


# ---------------------------------------------------------------------------
# Melodic & Rhythmic Instruments
# ---------------------------------------------------------------------------
def cozy_epiano(note: str, dur: float, amp: float = 0.15) -> np.ndarray:
    f = hz(note)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    mod = np.sin(2 * np.pi * f * 2.0 * t) * 1.4 * np.exp(-t * 8.0)
    sig = (
        np.sin(2 * np.pi * f * t + mod)
        + 0.22 * np.sin(2 * np.pi * f * 2.0 * t)
        + 0.06 * np.sin(2 * np.pi * f * 3.0 * t)
    )
    return sig * env_adsr(n, 0.006, dur * 0.65, 0.18, 0.04) * amp


def chiptune_lead(note: str, dur: float, amp: float = 0.12) -> np.ndarray:
    """Warm filtered pulse/triangle hybrid with subtle vibrato."""
    f = hz(note)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    vib = np.sin(2 * np.pi * 5.8 * t) * 0.004 * np.clip((t - 0.05) * 8.0, 0.0, 1.0)
    phase = 2 * np.pi * f * (1.0 + vib) * t
    # Band-limited soft square + triangle
    sq = (
        np.sin(phase)
        + 0.33 * np.sin(3 * phase)
        + 0.18 * np.sin(5 * phase)
        + 0.08 * np.sin(7 * phase)
    )
    tri = np.sin(phase) - 0.11 * np.sin(3 * phase)
    return (0.65 * sq + 0.35 * tri) * env_adsr(n, 0.005, dur * 0.55, 0.35, 0.025) * amp


def marimba_pop(note: str, dur: float = 0.22, amp: float = 0.14) -> np.ndarray:
    f = hz(note)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    sig = np.sin(2 * np.pi * f * t) + 0.28 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 38.0)
    wood_click = rng.standard_normal(n) * np.exp(-t * 220.0) * 0.08
    return (sig + wood_click) * np.exp(-t * 14.0) * env_adsr(n, 0.002, 0.09, 0.05, 0.02) * amp


def funky_bass(note: str, dur: float, amp: float = 0.24) -> np.ndarray:
    f = hz(note)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    env_mod = np.exp(-t * 18.0) * 3.2
    sig = (
        np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * f * t) * env_mod)
        + 0.45 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 10.0)
    )
    return np.tanh(sig * 1.3) * env_adsr(n, 0.004, dur * 0.6, 0.3, 0.02) * amp


def kick_drum(amp: float = 0.36) -> np.ndarray:
    dur = 0.18
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    freq = 52.0 + 115.0 * np.exp(-t * 36.0)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    click = np.sin(2 * np.pi * 1100.0 * t) * np.exp(-t * 140.0) * 0.18
    return (np.sin(phase) * np.exp(-t * 15.0) + click) * amp


def crisp_snare(amp: float = 0.20) -> np.ndarray:
    dur = 0.13
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    body = np.sin(2 * np.pi * 195.0 * t) * np.exp(-t * 34.0) * 0.55
    snap = rng.standard_normal(n) * np.exp(-t * 28.0) * 0.45
    return (body + snap) * amp


def hihat(open_hat: bool = False, amp: float = 0.07) -> np.ndarray:
    dur = 0.16 if open_hat else 0.045
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # High-frequency metallic shimmer
    n_raw = rng.standard_normal(n)
    diff = np.diff(n_raw, prepend=0.0)
    decay = 16.0 if open_hat else 65.0
    return diff * np.exp(-t * decay) * amp


# ---------------------------------------------------------------------------
# Foley & Action Sound Effects (Synced to Mascot Actions)
# ---------------------------------------------------------------------------
def sfx_boing_jump(pitch_start: float = 280.0, pitch_end: float = 620.0, dur: float = 0.24, amp: float = 0.20) -> np.ndarray:
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    f = pitch_start + (pitch_end - pitch_start) * (t / dur) ** 0.65
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) + 0.25 * np.sin(2 * phase)
    return sig * env_adsr(n, 0.005, dur * 0.7, 0.2, 0.03) * amp


def sfx_button_click(amp: float = 0.24) -> np.ndarray:
    n = sec(0.065)
    t = np.arange(n, dtype=np.float64) / SR
    click1 = np.sin(2 * np.pi * 920.0 * t) * np.exp(-t * 110.0)
    click2 = np.sin(2 * np.pi * 1480.0 * np.maximum(0.0, t - 0.022)) * np.exp(-np.maximum(0.0, t - 0.022) * 140.0)
    return (click1 + 0.8 * click2) * amp


def sfx_paper_whoosh(dur: float = 0.22, amp: float = 0.14) -> np.ndarray:
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    w = rng.standard_normal(n)
    # Simple moving-average smoothing for warm paper rustle
    kernel = np.ones(9) / 9.0
    smooth = np.convolve(w, kernel, mode="same")
    env = np.sin(np.pi * (t / dur)) ** 1.4
    return smooth * env * amp


def sfx_zipper(dur: float = 0.65, amp: float = 0.18) -> np.ndarray:
    n = sec(dur)
    out = np.zeros(n, dtype=np.float64)
    teeth = 18
    for k in range(teeth):
        pos = int((k / teeth) * (n - sec(0.03)))
        tn = sec(0.024)
        tt = np.arange(tn, dtype=np.float64) / SR
        f = 1100.0 + k * 55.0
        tooth = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 150.0)
        out[pos : pos + tn] += tooth
    return out * amp


def sfx_celebration_firework(amp: float = 0.36) -> np.ndarray:
    """Crisp party popper thump + sizzling glitter sparkles + triumphant ascending chimes."""
    dur = 1.3
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    out = np.zeros(n, dtype=np.float64)

    # 1. 礼花发射脆响 (Punchy thump & pop)
    pop_freq = 190.0 + 360.0 * np.exp(-t * 85.0)
    pop = np.sin(2 * np.pi * np.cumsum(pop_freq) / SR) * np.exp(-t * 28.0) * 0.48

    # 2. 空中炸开细密金色火星噼啪声 (Sizzling crackle noise)
    noise = rng.standard_normal(n)
    sizzle = noise * np.exp(-t * 7.5) * 0.16

    # 3. 庆祝礼花清脆胜利琶音 (C6 -> E6 -> G6 -> C7 闪耀星芒风铃音)
    chimes = [(1046.5, 0.03), (1318.5, 0.09), (1567.9, 0.15), (2093.0, 0.22)]
    for f_note, delay in chimes:
        dt = np.maximum(0.0, t - delay)
        bell = (
            np.sin(2 * np.pi * f_note * dt)
            + 0.25 * np.sin(2 * np.pi * f_note * 2.0 * dt)
        ) * np.exp(-dt * 6.0) * (t >= delay)
        out += bell * 0.22

    out += pop + sizzle
    return out * amp


# ---------------------------------------------------------------------------
# 1. Compose the 58-Second Musical Score (120 BPM, 29 Bars)
# ---------------------------------------------------------------------------
# Bars 0..1 (0.0s - 3.5s): Curious sneak-intro in the cage
sneak_notes = [
    (0.0, "D4"), (0.25, "F4"), (0.5, "A4"), (0.75, "G4"),
    (1.0, "D4"), (1.25, "F4"), (1.5, "Bb4"), (1.75, "A4"),
    (2.0, "E4"), (2.25, "G4"), (2.5, "B4"), (2.75, "C5"),
]
for t_note, p in sneak_notes:
    music.add(t_note, marimba_pop(p, 0.20, 0.15), pan=-0.15)
    music.add(t_note, funky_bass(p[:-1] + "2", 0.20, 0.16), pan=0.0)

# Unlock glissando at 2.9s - 3.5s leading into the breakout drop!
unlock_gliss = ["F4", "A4", "C5", "E5", "F5", "A5", "C6"]
for idx, p in enumerate(unlock_gliss):
    music.add(2.88 + idx * 0.075, chiptune_lead(p, 0.18, 0.14), pan=(idx - 3) * 0.15)

# Main Funky Chiptune × Cozy Groove: Bars 2..27 (4.0s - 56.0s)
CHORD_PROGRESSION = [
    # 4-bar loop: Fmaj7 | G7 | Em7 | Am7 - C7
    (["F3", "A3", "C4", "E4"], "F2", ["F5", "A5", "C6", "A5", "G5", "F5", "D5", "C5"]),
    (["G3", "B3", "D4", "F4"], "G2", ["G5", "B5", "D6", "B5", "A5", "G5", "E5", "D5"]),
    (["E3", "G3", "B3", "D4"], "E2", ["E5", "G5", "B5", "D6", "C6", "B5", "G5", "E5"]),
    (["A3", "C4", "E4", "G4"], "A2", ["A5", "C6", "E6", "D6", "C6", "A5", "G5", "F5"]),
]

for bar_idx in range(2, 28):
    bar_start = bar_idx * BAR
    chord, root_bass, arp = CHORD_PROGRESSION[(bar_idx - 2) % 4]

    # Cozy electric piano chords on beats 1 and 3 (with funky syncopation on 2.5)
    for n_name in chord:
        music.add(bar_start + 0.0, cozy_epiano(n_name, 0.85, 0.085), pan=-0.22)
        music.add(bar_start + 0.75, cozy_epiano(n_name, 0.45, 0.065), pan=0.22)
        music.add(bar_start + 1.25, cozy_epiano(n_name, 0.65, 0.075), pan=-0.15)

    # Bouncy Funky Bassline (120 BPM 8th-note groove with octave pops)
    bass_octave = root_bass[:-1] + "3"
    bass_pattern = [
        (0.0, root_bass, 0.22),
        (0.25, bass_octave, 0.18),
        (0.5, root_bass, 0.22),
        (0.75, bass_octave, 0.18),
        (1.0, root_bass, 0.22),
        (1.25, bass_octave, 0.18),
        (1.5, root_bass, 0.20),
        (1.75, bass_octave, 0.20),
    ]
    for offset, b_note, b_dur in bass_pattern:
        music.add(bar_start + offset, funky_bass(b_note, b_dur, 0.20), pan=0.0)

    # Playful Chiptune + Marimba Lead Melody
    for step, m_note in enumerate(arp):
        t_pos = bar_start + step * 0.25
        if step % 2 == 0:
            music.add(t_pos, chiptune_lead(m_note, 0.21, 0.095), pan=0.18 if step % 4 == 0 else -0.18)
        else:
            music.add(t_pos, marimba_pop(m_note, 0.18, 0.09), pan=-0.20 if step % 3 == 0 else 0.20)

    # Crisp Funky Drums (Kick on 1, 2.5, 3; Snare on 2, 4; 8th-note hats)
    for beat_i in range(4):
        bt = bar_start + beat_i * BEAT
        if beat_i in (0, 2):
            music.add(bt, kick_drum(0.34))
        else:
            music.add(bt, crisp_snare(0.19))
        music.add(bt, hihat(False, 0.055), pan=0.12)
        music.add(bt + 0.25, hihat(beat_i == 3, 0.065), pan=-0.12)
    # Funky ghost kick
    music.add(bar_start + 0.75, kick_drum(0.22))

# Final Bar 28 (56.0s - 58.0s): Warm Resolving Cadence in F Major 9!
final_chord = ["F2", "C3", "F3", "A3", "C4", "E4", "G4", "C5", "F5"]
for idx, n_name in enumerate(final_chord):
    music.add(56.0 + idx * 0.03, cozy_epiano(n_name, 1.85, 0.10), pan=(idx - 4) * 0.1)
music.add(56.0, kick_drum(0.32))
music.add(56.0, marimba_pop("F5", 0.6, 0.16))
music.add(56.15, marimba_pop("A5", 0.6, 0.15))
music.add(56.30, marimba_pop("C6", 0.8, 0.16))
music.add(56.45, chiptune_lead("F6", 1.2, 0.12))


# ---------------------------------------------------------------------------
# 2. Layer Action Foley & Mascot Sound Effects from timeline.json
# ---------------------------------------------------------------------------
# Cage rattles
sfx.add(CUES["cage_rattle_1"], marimba_pop("D3", 0.12, 0.18))
sfx.add(CUES["cage_rattle_2"], marimba_pop("Eb3", 0.12, 0.18))

# Key arrive & unlock
sfx.add(CUES["key_arrive"], marimba_pop("C6", 0.16, 0.18))
sfx.add(CUES["cage_unlock"], sfx_button_click(0.28))
sfx.add(CUES["cage_open"], sfx_boing_jump(320, 740, 0.22, 0.22))

# Mascot breakout jump & landing
sfx.add(CUES["mascot_jump_out"], sfx_boing_jump(260, 680, 0.28, 0.24))
sfx.add(CUES["hero_land"], kick_drum(0.25))

# 6 Platforms pop
for i, p_note in enumerate(["F5", "G5", "A5", "C6", "D6", "F6"]):
    sfx.add(CUES["platforms_pop"] + i * 0.12, marimba_pop(p_note, 0.15, 0.16))

# Scene 2: Search card, typing URL, jumping & pressing Parse
sfx.add(CUES["search_card_in"], sfx_paper_whoosh(0.24, 0.18))
for k in range(14):
    sfx.add(CUES["url_type_start"] + k * 0.11, sfx_button_click(0.09), pan=-0.1)
sfx.add(CUES["parse_jump"], sfx_boing_jump(300, 620, 0.22, 0.20))
sfx.add(CUES["parse_click"], sfx_button_click(0.28))
sfx.add(CUES["result_unfold"], sfx_paper_whoosh(0.28, 0.20))
for r in range(5):
    sfx.add(CUES["tracks_cascade"] + r * 0.15, marimba_pop(["C5", "D5", "E5", "G5", "A5"][r], 0.14, 0.14))
sfx.add(CUES["export_click"], sfx_button_click(0.26))

# Scene 3: Export files split & 6-format fan
sfx.add(CUES["files_split"], sfx_paper_whoosh(0.26, 0.20))
sfx.add(CUES["excel_focus"], marimba_pop("G5", 0.18, 0.16))
sfx.add(CUES["json_focus"], sfx_boing_jump(320, 640, 0.22, 0.18))
for i, p_note in enumerate(["C5", "D5", "F5", "G5", "A5", "C6"]):
    sfx.add(CUES["formats_fan"] + i * 0.10, marimba_pop(p_note, 0.14, 0.15))

# Scene 4: Batch checkboxes, button press, workbook & zipper
sfx.add(CUES["batch_enter"], sfx_paper_whoosh(0.24, 0.18))
sfx.add(CUES["check_1"], marimba_pop("C6", 0.15, 0.20))
sfx.add(CUES["check_2"], marimba_pop("E6", 0.15, 0.20))
sfx.add(CUES["check_3"], marimba_pop("G6", 0.15, 0.22))
sfx.add(CUES["batch_click"], sfx_button_click(0.28))
sfx.add(CUES["workbook_open"], sfx_paper_whoosh(0.25, 0.18))
sfx.add(CUES["zip_close"], sfx_zipper(0.65, 0.22))
sfx.add(CUES["zip_close"] + 0.58, sfx_celebration_firework(0.38))

# Scene 5: CLI world
sfx.add(CUES["cli_slide_in"], sfx_paper_whoosh(0.25, 0.18))
for k in range(10):
    sfx.add(CUES["cli_paste_url"] + k * 0.09, sfx_button_click(0.09))
sfx.add(CUES["cli_parsed"], marimba_pop("A5", 0.18, 0.18))
sfx.add(CUES["cli_press_enter"], sfx_button_click(0.30))
sfx.add(CUES["cli_done"], sfx_celebration_firework(0.38))
sfx.add(CUES["cli_done"], marimba_pop("C6", 0.22, 0.20))
sfx.add(CUES["cli_done"] + 0.12, marimba_pop("F6", 0.26, 0.22))

# Scene 6: Ecosystem hops
sfx.add(CUES["eco_hop_mf"], sfx_boing_jump(300, 580, 0.20, 0.20))
sfx.add(CUES["eco_hop_lx"], sfx_boing_jump(340, 640, 0.20, 0.20))
sfx.add(CUES["eco_hop_l1"], sfx_boing_jump(380, 720, 0.20, 0.20))
sfx.add(CUES["eco_api_bar"], sfx_paper_whoosh(0.22, 0.16))

# Scene 7: Finale
sfx.add(CUES["finale_logo_land"], sfx_boing_jump(320, 700, 0.26, 0.22))
sfx.add(CUES["finale_url_pop"], sfx_celebration_firework(0.44))
sfx.add(CUES["finale_url_pop"], marimba_pop("C6", 0.20, 0.18))
sfx.add(CUES["finale_url_pop"] + 0.10, marimba_pop("E6", 0.22, 0.18))
sfx.add(CUES["finale_url_pop"] + 0.20, marimba_pop("G6", 0.24, 0.20))
sfx.add(CUES["finale_url_pop"] + 0.30, marimba_pop("C7", 0.28, 0.22))
sfx.add(CUES["finale_star_wink"], marimba_pop("F6", 0.28, 0.22))


# ---------------------------------------------------------------------------
# 3. Master Mix & Export WAV Files
# ---------------------------------------------------------------------------
def write_wav(path: Path, left: np.ndarray, right: np.ndarray) -> None:
    peak = max(1e-6, float(np.max(np.abs([left, right]))))
    # Normalize to -1.5 dBFS ceiling (~0.84) with gentle soft-knee saturation
    scale = 0.82 / peak
    L_norm = np.tanh(left * scale * 1.05) * 0.84
    R_norm = np.tanh(right * scale * 1.05) * 0.84
    stereo = np.empty((len(L_norm) * 2,), dtype=np.int16)
    stereo[0::2] = np.clip(L_norm * 32767.0, -32768, 32767).astype(np.int16)
    stereo[1::2] = np.clip(R_norm * 32767.0, -32768, 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(stereo.tobytes())


def main() -> None:
    audio_dir = ROOT / "public" / "audio"
    write_wav(audio_dir / "music-only.wav", music.L, music.R)
    write_wav(audio_dir / "sfx-only.wav", sfx.L, sfx.R)
    write_wav(audio_dir / "soundtrack.wav", music.L + sfx.L, music.R + sfx.R)
    print(f"Synthesized 58.0s stereo soundtrack & foley -> {audio_dir / 'soundtrack.wav'}")


if __name__ == "__main__":
    main()
