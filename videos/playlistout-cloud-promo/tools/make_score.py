"""High-fidelity 120 BPM procedural soundtrack & foley synthesizer for Playlist Out Motion Film.

Style: 120 BPM Funky Bass × Playful Electronic × Light Chiptune × Cozy Rhodes / Marimba.
Format: 48 kHz 16-bit Stereo WAV, 58.0 seconds (1740 frames, 29 bars).
100% procedurally synthesized with NumPy — zero external sample dependencies.
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
BEAT = 60.0 / BPM  # 0.5s = 15 frames
BAR = BEAT * 4     # 2.0s = 60 frames
DURATION = 58.0
N = int(SR * DURATION)

rng = np.random.default_rng(20261108)
timeline = json.loads((ROOT / "src" / "timeline.json").read_text(encoding="utf-8"))
CUES: dict[str, float] = timeline["cues"]


def sec(t: float) -> int:
    return int(round(t * SR))


def midi_to_hz(note: str) -> float:
    names = {
        "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
        "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
    }
    pitch, octave = note[:-1], int(note[-1])
    midi_num = (octave + 1) * 12 + names[pitch]
    return 440.0 * (2.0 ** ((midi_num - 69) / 12.0))


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
# Procedural Musical Instruments
# ---------------------------------------------------------------------------

def env_adsr(n: int, a: float = 0.008, d: float = 0.18, s_level: float = 0.25, r: float = 0.04) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    attack = np.clip(t / max(1e-4, a), 0.0, 1.0)
    decay = s_level + (1.0 - s_level) * np.exp(-np.maximum(0.0, t - a) / max(1e-4, d))
    out = attack * decay
    nr = min(n, sec(r))
    if nr > 0:
        out[-nr:] *= np.linspace(1.0, 0.0, nr) ** 1.3
    return out


def rhodes_piano(note: str, dur: float, amp: float = 0.22) -> np.ndarray:
    f = midi_to_hz(note)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # FM synthesis: Carrier + Modulator for warm bell chime
    mod = np.sin(2.0 * math.pi * f * 2.0 * t) * np.exp(-t * 14.0) * 1.8
    sig = (
        np.sin(2.0 * math.pi * f * t + mod) * 0.72
        + np.sin(2.0 * math.pi * f * 2.0 * t) * 0.24 * np.exp(-t * 8.0)
        + np.sin(2.0 * math.pi * f * 3.0 * t) * 0.08 * np.exp(-t * 16.0)
    )
    env = env_adsr(n, a=0.004, d=dur * 0.8, s_level=0.15, r=0.08)
    return sig * env * amp


def funky_bass(note: str, dur: float, amp: float = 0.35, slap: bool = False) -> np.ndarray:
    f = midi_to_hz(note)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # Rich harmonics with filter envelope
    f_env = np.exp(-t * (24.0 if slap else 12.0))
    phase = 2.0 * math.pi * f * t
    sig = (
        np.sin(phase) * 0.65
        + np.sin(phase * 2.0) * (0.35 + 0.3 * f_env)
        + np.sin(phase * 3.0) * (0.15 + 0.25 * f_env)
        + np.sin(phase * 4.0) * (0.05 + 0.2 * f_env)
    )
    # Slight soft saturation
    sig = np.tanh(sig * 1.4)
    env = env_adsr(n, a=0.002, d=0.22, s_level=0.45, r=0.03)
    return sig * env * amp


def marimba(note: str, dur: float = 0.35, amp: float = 0.26) -> np.ndarray:
    f = midi_to_hz(note)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # Characteristic wooden marimba overtones (1x, 4x, 10x)
    sig = (
        np.sin(2.0 * math.pi * f * t) * 0.75
        + np.sin(2.0 * math.pi * f * 4.0 * t) * 0.3 * np.exp(-t * 32.0)
        + np.sin(2.0 * math.pi * f * 10.0 * t) * 0.1 * np.exp(-t * 60.0)
    )
    # Fast percussive mallet click
    click = rng.uniform(-1, 1, min(n, sec(0.005)))
    sig[: len(click)] += click * 0.2
    env = np.exp(-t * 14.0)
    return sig * env * amp


def chiptune_arp(note: str, dur: float = 0.12, amp: float = 0.18) -> np.ndarray:
    f = midi_to_hz(note)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # 8-bit pulse wave (25% duty cycle)
    phase = (f * t) % 1.0
    pulse = np.where(phase < 0.25, 1.0, -1.0)
    # Bandlimit / soft lowpass
    env = env_adsr(n, a=0.003, d=0.06, s_level=0.6, r=0.02)
    return pulse * env * amp


def kick(amp: float = 0.65) -> np.ndarray:
    dur = 0.38
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # Pitch drop from 160 Hz down to 45 Hz
    f = 45.0 + 115.0 * np.exp(-t * 38.0)
    phase = 2.0 * math.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t * 12.0)
    # Click transient
    click = np.sin(2.0 * math.pi * 900.0 * t[: sec(0.01)]) * np.exp(-t[: sec(0.01)] * 200.0)
    body[: len(click)] += click * 0.35
    return np.tanh(body * 1.3) * amp


def snare(amp: float = 0.42) -> np.ndarray:
    dur = 0.28
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # Tone + white noise
    tone = np.sin(2.0 * math.pi * (180.0 + 80.0 * np.exp(-t * 50.0)) * t) * np.exp(-t * 22.0)
    noise = rng.uniform(-1, 1, n) * np.exp(-t * 18.0)
    sig = tone * 0.45 + noise * 0.55
    return np.tanh(sig * 1.4) * amp


def hihat(open_hat: bool = False, amp: float = 0.18) -> np.ndarray:
    dur = 0.25 if open_hat else 0.05
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # Metallic noise via clustered square waves
    noise = rng.uniform(-1, 1, n)
    for f in [3200, 4700, 6800, 8900]:
        noise += np.sin(2.0 * math.pi * f * t) * 0.15
    decay = 12.0 if open_hat else 75.0
    return noise * np.exp(-t * decay) * amp


# ---------------------------------------------------------------------------
# Procedural Foley SFX
# ---------------------------------------------------------------------------

def sfx_lock_key(amp: float = 0.55) -> np.ndarray:
    n = sec(0.4)
    t = np.arange(n, dtype=np.float64) / SR
    bell = np.sin(2.0 * math.pi * 2400 * t) * np.exp(-t * 18) + np.sin(2.0 * math.pi * 4800 * t) * np.exp(-t * 30) * 0.5
    click = rng.uniform(-1, 1, sec(0.02)) * np.exp(-np.linspace(0, 10, sec(0.02)))
    bell[: len(click)] += click * 0.8
    return bell * amp


def sfx_door_spring(amp: float = 0.6) -> np.ndarray:
    n = sec(0.65)
    t = np.arange(n, dtype=np.float64) / SR
    f = 120.0 + 35.0 * np.sin(2.0 * math.pi * 14 * t)
    phase = 2.0 * math.pi * np.cumsum(f) / SR
    spring = np.sin(phase) * np.exp(-t * 6.0)
    creak = np.sin(2.0 * math.pi * 420 * t) * np.exp(-t * 12) * 0.3
    return (spring + creak) * amp


def sfx_whoosh(dur: float = 0.4, rising: bool = True, amp: float = 0.4) -> np.ndarray:
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    noise = rng.uniform(-1, 1, n)
    sweep = np.linspace(200, 2400, n) if rising else np.linspace(2400, 200, n)
    # Bandpass modulation
    env = np.sin(np.pi * (t / dur)) ** 1.8
    return noise * env * amp


def sfx_jelly_stomp(amp: float = 0.65) -> np.ndarray:
    n = sec(0.35)
    t = np.arange(n, dtype=np.float64) / SR
    # Thump + bubbly chirp
    thump = np.sin(2.0 * math.pi * (80.0 * np.exp(-t * 20)) * t) * np.exp(-t * 12)
    squelch = np.sin(2.0 * math.pi * (600.0 - 400.0 * np.exp(-t * 30)) * t) * np.exp(-t * 18) * 0.5
    return (thump + squelch) * amp


def sfx_paper_unfurl(amp: float = 0.35) -> np.ndarray:
    n = sec(0.6)
    t = np.arange(n, dtype=np.float64) / SR
    noise = rng.uniform(-1, 1, n)
    env = np.sin(np.pi * (t / 0.6)) * np.exp(-t * 4)
    # Lowpass filter emulation
    return np.convolve(noise * env, np.ones(8) / 8, mode="same") * amp


def sfx_check_pop(pitch_hz: float, amp: float = 0.45) -> np.ndarray:
    n = sec(0.2)
    t = np.arange(n, dtype=np.float64) / SR
    pop = np.sin(2.0 * math.pi * (pitch_hz + 300.0 * np.exp(-t * 60)) * t) * np.exp(-t * 28)
    return pop * amp


def sfx_zipper(dur: float = 0.85, amp: float = 0.48) -> np.ndarray:
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # Rapid zipper teeth clicks at ~45 Hz
    teeth = np.sign(np.sin(2.0 * math.pi * 52 * t))
    hiss = rng.uniform(-1, 1, n) * 0.35
    sig = teeth * hiss * np.sin(np.pi * (t / dur))
    return sig * amp


def sfx_mechanical_enter(amp: float = 0.8) -> np.ndarray:
    n = sec(0.45)
    t = np.arange(n, dtype=np.float64) / SR
    # Sharp plastic switch click + heavy bottom-out thump
    click = np.sin(2.0 * math.pi * 3200 * t) * np.exp(-t * 85)
    thump = np.sin(2.0 * math.pi * 65 * t) * np.exp(-t * 15)
    body = click * 0.6 + thump * 0.75
    return np.tanh(body * 1.5) * amp


def sfx_sparkle_chime(amp: float = 0.38) -> np.ndarray:
    n = sec(1.0)
    sig = np.zeros(n, dtype=np.float64)
    freqs = [1800, 2400, 3200, 4200, 5400]
    for idx, f in enumerate(freqs):
        delay = sec(idx * 0.05)
        rem = n - delay
        if rem > 0:
            t = np.arange(rem, dtype=np.float64) / SR
            sig[delay:] += np.sin(2.0 * math.pi * f * t) * np.exp(-t * 12) * 0.25
    return sig * amp


# ---------------------------------------------------------------------------
# Compose the 58-second 120 BPM Soundtrack & Foley Track
# ---------------------------------------------------------------------------

print("Generating musical layers and rhythms...")

# Chord progressions:
# Section A (Bars 1-2, 0-4s): Intro mystery (D minor / Dsus)
# Section B (Bars 3-10, 4-20s): D - G - A - Bm funky groove
# Section C (Bars 11-20, 20-40s): Gmaj7 - A - F#m7 - Bm uplifting progression
# Section D (Bars 21-25, 40-50s): Em7 - A7 - Dmaj7 - B7 terminal chiptune groove
# Section E (Bars 26-27, 50-54s): Gmaj9 - A6 - Dmaj9 expansive flowing
# Section F (Bars 28-29, 54-58s): Dmaj9 final warm resolving cadence

CHORDS_BARS = [
    # Bars 1-2: Trapped, lonely intro
    ("D4", "F4", "A4"),
    ("C4", "E4", "G4"),
    # Bar 3: Breakout rising
    ("D4", "F#4", "A4"),
    # Bars 4-10: Main Funky Groove (D - G - A - Bm)
    ("D4", "F#4", "A4"),
    ("G3", "B3", "D4"),
    ("A3", "C#4", "E4"),
    ("B3", "D4", "F#4"),
    ("D4", "F#4", "A4"),
    ("G3", "B3", "D4"),
    ("A3", "C#4", "E4"),
    # Bars 11-15: Multi-format export (G - A - F#m - Bm - Em)
    ("G3", "B3", "D4"),
    ("A3", "C#4", "E4"),
    ("F#3", "A3", "C#4"),
    ("B3", "D4", "F#4"),
    ("E3", "G3", "B3"),
    # Bars 16-20: Batch export (G - A - Bm - G - A)
    ("G3", "B3", "D4"),
    ("A3", "C#4", "E4"),
    ("B3", "D4", "F#4"),
    ("G3", "B3", "D4"),
    ("A3", "C#4", "E4"),
    # Bars 21-25: CLI Terminal Geek Groove (Em - A - D - Bm - G)
    ("E3", "G3", "B3"),
    ("A3", "C#4", "E4"),
    ("D4", "F#4", "A4"),
    ("B3", "D4", "F#4"),
    ("G3", "B3", "D4"),
    # Bars 26-27: Ecosystem flowing (G - A)
    ("G3", "B3", "D4"),
    ("A3", "C#4", "E4"),
    # Bars 28-29: Finale Warmth (Dmaj9)
    ("D4", "F#4", "A4", "C#5", "E5"),
    ("D4", "F#4", "A4", "C#5", "E5"),
]

BASS_NOTES = [
    "D2", "C2",  # 1-2
    "D2",        # 3
    "D2", "G2", "A2", "B2", "D2", "G2", "A2",  # 4-10
    "G2", "A2", "F#2", "B2", "E2",              # 11-15
    "G2", "A2", "B2", "G2", "A2",              # 16-20
    "E2", "A2", "D2", "B2", "G2",              # 21-25
    "G2", "A2",                                # 26-27
    "D2", "D2",                                # 28-29
]

# 1. Electric Piano / Rhodes chords
for bar_idx, chord in enumerate(CHORDS_BARS):
    bar_start = bar_idx * BAR
    if bar_idx < 2:
        # Soft sparse chords for trapped cage
        for note in chord:
            music.add(bar_start, rhodes_piano(note, dur=1.8, amp=0.18), pan=-0.2)
    elif bar_idx == 2:
        # Rising breakout chime
        for idx, note in enumerate(["D4", "E4", "F#4", "A4", "D5"]):
            music.add(bar_start + idx * 0.35, rhodes_piano(note, dur=1.0, amp=0.22), pan=idx * 0.3 - 0.6)
    elif bar_idx >= 27:
        # Finale warm sustained chord
        for note in chord:
            music.add(bar_start, rhodes_piano(note, dur=3.8, amp=0.24), pan=0.0)
    else:
        # Rhythmic funk comping on beats 1, 2.5, 3.5
        for beat_offset in [0.0, 0.75, 1.5]:
            t = bar_start + beat_offset
            for note in chord:
                music.add(t, rhodes_piano(note, dur=0.45, amp=0.16), pan=0.25)

# 2. Funky Basslines (bars 3 to 27)
for bar_idx in range(2, 27):
    bar_start = bar_idx * BAR
    root = BASS_NOTES[bar_idx]
    # Funky 16th-syncopated bass pattern:
    # Beat 1 (0.0): Root
    # Beat 2 (&, 0.75): Octave up
    # Beat 3 (1.0): Root
    # Beat 4 (1.5): Fifth
    r_hz = root
    oct_up = root[:-1] + str(int(root[-1]) + 1)
    music.add(bar_start + 0.0, funky_bass(r_hz, dur=0.35, amp=0.38, slap=True))
    music.add(bar_start + 0.75, funky_bass(oct_up, dur=0.22, amp=0.32, slap=False))
    music.add(bar_start + 1.0, funky_bass(r_hz, dur=0.32, amp=0.36, slap=True))
    music.add(bar_start + 1.5, funky_bass(oct_up, dur=0.25, amp=0.30, slap=False))

# 3. Drums (kicks, snares, hats from bar 3 onwards)
for bar_idx in range(2, 27):
    bar_start = bar_idx * BAR
    # Kick on beat 1 and beat 3 (plus syncopated kick at 1.75)
    music.add(bar_start + 0.0, kick(0.68))
    music.add(bar_start + 1.0, kick(0.62))
    if bar_idx % 2 == 1:
        music.add(bar_start + 1.75, kick(0.55))

    # Snare on beat 2 and beat 4
    music.add(bar_start + 0.5, snare(0.48))
    music.add(bar_start + 1.5, snare(0.52))

    # Hi-hats: 8th notes with open hat on the offbeats
    for beat_idx in range(8):
        t_hat = bar_start + beat_idx * (BEAT / 2.0)
        is_open = beat_idx in (2, 6)
        music.add(t_hat, hihat(open_hat=is_open, amp=0.18 if is_open else 0.12), pan=-0.3)

# 4. Marimba & Chiptune Melodies (Bars 4 to 26)
PENTATONIC = ["D4", "E4", "F#4", "A4", "B4", "D5", "E5", "F#5"]
for bar_idx in range(3, 27):
    bar_start = bar_idx * BAR
    # Playful bouncy counter-melody
    pattern = [0, 2, 4, 5, 4, 2, 3, 1] if bar_idx % 2 == 0 else [4, 5, 7, 5, 4, 3, 2, 0]
    for step, note_idx in enumerate(pattern):
        note = PENTATONIC[note_idx % len(PENTATONIC)]
        t_note = bar_start + step * 0.25
        music.add(t_note, marimba(note, dur=0.28, amp=0.24), pan=0.35)
        # Chiptune sparkle in CLI & Export scenes
        if 20 <= bar_idx <= 25:
            music.add(t_note, chiptune_arp(note, dur=0.15, amp=0.16), pan=-0.4)

print("Synthesizing scene-accurate foley and hit-points...")

# Foley alignments:
sfx.add(CUES["cage_start"] + 0.2, sfx_lock_key(amp=0.45), pan=-0.3)
sfx.add(CUES["key_fly_in"], sfx_whoosh(dur=0.6, rising=True, amp=0.35), pan=0.4)
sfx.add(CUES["key_unlock"], sfx_lock_key(amp=0.75), pan=-0.1)
sfx.add(CUES["door_spring"], sfx_door_spring(amp=0.7), pan=-0.2)
sfx.add(CUES["breakout_jump"], sfx_whoosh(dur=0.5, rising=True, amp=0.55), pan=0.0)
sfx.add(CUES["brand_land"], sfx_jelly_stomp(amp=0.6), pan=0.1)
sfx.add(CUES["platforms_fan"], sfx_sparkle_chime(amp=0.35), pan=0.2)

sfx.add(CUES["url_paste"], sfx_paper_unfurl(amp=0.4), pan=0.0)
sfx.add(CUES["jelly_stomp"], sfx_jelly_stomp(amp=0.85), pan=0.2)
sfx.add(CUES["table_unfurl"], sfx_paper_unfurl(amp=0.5), pan=-0.1)
sfx.add(CUES["tracks_cascade"], sfx_sparkle_chime(amp=0.45), pan=0.3)

sfx.add(CUES["export_origami"], sfx_paper_unfurl(amp=0.45), pan=-0.2)
sfx.add(CUES["export_stamp"], sfx_jelly_stomp(amp=0.8), pan=0.0)

sfx.add(CUES["check_1"], sfx_check_pop(523.25, amp=0.55), pan=-0.3)  # C5
sfx.add(CUES["check_2"], sfx_check_pop(659.25, amp=0.55), pan=0.0)   # E5
sfx.add(CUES["check_3"], sfx_check_pop(783.99, amp=0.55), pan=0.3)   # G5
sfx.add(CUES["workbook_merge"], sfx_paper_unfurl(amp=0.4), pan=0.1)
sfx.add(CUES["zipper_pull"], sfx_zipper(dur=0.85, amp=0.65), pan=0.2)
sfx.add(CUES["zip_pop"], sfx_jelly_stomp(amp=0.6), pan=0.3)
sfx.add(CUES["zip_pop"] + 0.1, sfx_sparkle_chime(amp=0.4), pan=0.3)

sfx.add(CUES["terminal_boot"], sfx_lock_key(amp=0.4), pan=-0.2)
# Laptop typing chatter
for i in range(12):
    sfx.add(CUES["laptop_type"] + i * 0.12, sfx_check_pop(1200 + rng.uniform(-100, 100), amp=0.22), pan=0.2)
sfx.add(CUES["enter_stomp"], sfx_mechanical_enter(amp=0.9), pan=0.3)
sfx.add(CUES["cli_success"], sfx_sparkle_chime(amp=0.45), pan=0.1)

sfx.add(CUES["eco_flow"], sfx_whoosh(dur=0.8, rising=True, amp=0.4), pan=0.0)
sfx.add(CUES["finale_close"], sfx_paper_unfurl(amp=0.6), pan=0.0)
sfx.add(CUES["mascot_wink"], sfx_check_pop(1975.53, amp=0.45), pan=0.2)  # B6 sparkle


# Master Limiter & Normalization
def export_wav(path: Path, bus: StereoBus, target_db: float = -1.2) -> None:
    max_val = max(np.max(np.abs(bus.L)), np.max(np.abs(bus.R)))
    if max_val > 1e-6:
        target_amp = 10.0 ** (target_db / 20.0)
        scale = target_amp / max_val
        L = np.clip(bus.L * scale, -0.999, 0.999)
        R = np.clip(bus.R * scale, -0.999, 0.999)
    else:
        L, R = bus.L, bus.R

    interleaved = np.empty((N * 2,), dtype=np.int16)
    interleaved[0::2] = (L * 32767).astype(np.int16)
    interleaved[1::2] = (R * 32767).astype(np.int16)

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(interleaved.tobytes())
    print(f"Saved {path.name} ({len(interleaved) // 2 // SR}s)")


# Full mix
full_mix = StereoBus()
full_mix.L = music.L * 0.85 + sfx.L * 0.95
full_mix.R = music.R * 0.85 + sfx.R * 0.95

audio_dir = ROOT / "public" / "audio"
export_wav(audio_dir / "soundtrack.wav", full_mix, target_db=-1.0)
export_wav(audio_dir / "music-only.wav", music, target_db=-1.5)
export_wav(audio_dir / "sfx-only.wav", sfx, target_db=-1.5)

print("Audio generation 100% complete!")
