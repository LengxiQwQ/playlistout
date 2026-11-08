"""Original 58-second soundtrack & foley synthesizer for Playlist Out Film.

Ported and evolved from videos/playlistout-premiere/tools/make_score.py:
- 120 BPM / F major / 29 bars / 58.0 seconds.
- Multi-movement progression:
  1. Calm Cage Intro (0.0s - 3.5s): Suspenseful felt piano, glockenspiel droplets, low ambient paper air.
  2. Breakout Drop (3.5s - 8.0s): Golden key unlock riser sweep + rimshot launch at 3.5s (Beat 7 / frame 105)
     leading directly into a punchy funky kick drop (Bar 2 / 4.0s), walking bass with octave pops,
     syncopated electric piano comping on offbeats, crisp 16th-note panning hi-hats, and layered claps.
  3. Web Parse & Export (8.0s - 28.0s): Upbeat syncopated groove with marimba counterpoint.
  4. Batch Export (28.0s - 36.0s): Energetic drive with layered claps and rolling shakers.
  5. CLI Scene (36.0s - 46.0s): Driving four-on-the-floor electro house groove with offbeat ticks.
  6. Ecosystem Hops (46.0s - 52.0s): Bouncing marimba and glockenspiel melodic counterpoint.
  7. Grand Brand Finale (52.0s - 58.0s): Triumphant ascending chime fanfare resolving to warm F Major 9.
- Complete action foley: All mascot actions, clicks, whooshes, zipper, and celebration fireworks.
- 100% procedurally synthesized with NumPy — zero external samples or copyrighted recordings.
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
BEAT = 60.0 / BPM  # 0.5s per quarter note (15 frames @ 30fps)
BAR = BEAT * 4     # 2.0s per bar (60 frames @ 30fps)
DURATION = 58.0
BARS = 29
N = int(SR * DURATION)

rng = np.random.default_rng(20261108)

timeline = json.loads((ROOT / "src" / "timeline.json").read_text(encoding="utf-8"))
CUES: dict[str, float] = timeline["cues"]


# -----------------------------------------------------------------------------
# DSP & Math Helpers
# -----------------------------------------------------------------------------
def sec(t: float) -> int:
    return int(round(t * SR))


def midi(name: str) -> int:
    names = {
        "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
        "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
    }
    pitch, octave = name[:-1], int(name[-1])
    return (octave + 1) * 12 + names[pitch]


def hz(name: str) -> float:
    return 440.0 * (2.0 ** ((midi(name) - 69) / 12.0))


def fft_filter(x: np.ndarray, lo: float | None = None, hi: float | None = None) -> np.ndarray:
    if len(x) == 0:
        return x
    x = x.astype(np.float64)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / SR)
    mask = np.ones_like(freqs)
    if lo:
        mask *= 1.0 / (1.0 + np.exp(-(freqs - lo) / max(1.0, lo * 0.12)))
    if hi:
        mask *= 1.0 / (1.0 + np.exp((freqs - hi) / max(1.0, hi * 0.09)))
    return np.fft.irfft(spec * mask, len(x)).astype(np.float64)


def env(n: int, attack: float, decay: float, curve: float = 2.0) -> np.ndarray:
    t = np.arange(n, dtype=np.float64) / SR
    a = 1.0 - np.exp(-t / max(1e-5, attack))
    d = np.exp(-t / max(1e-5, decay))
    return (a * d) ** (1.0 / curve)


def noise(n: int) -> np.ndarray:
    return rng.standard_normal(n)


def fade_edges(x: np.ndarray, a: float = 0.006, r: float = 0.02) -> np.ndarray:
    y = x.copy()
    na, nr = min(len(y), sec(a)), min(len(y), sec(r))
    if na:
        y[:na] *= np.linspace(0.0, 1.0, na) ** 0.6
    if nr:
        y[-nr:] *= np.linspace(1.0, 0.0, nr) ** 1.4
    return y


class Bus:
    def __init__(self) -> None:
        self.L = np.zeros(N, dtype=np.float64)
        self.R = np.zeros(N, dtype=np.float64)

    def add_stereo(self, start: float, left: np.ndarray, right: np.ndarray, gain: float = 1.0) -> None:
        i = sec(start)
        if i >= N or i < 0:
            return
        ln = min(len(left), len(right), N - i)
        self.L[i : i + ln] += left[:ln] * gain
        self.R[i : i + ln] += right[:ln] * gain

    def add(self, start: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0) -> None:
        i = sec(start)
        if i >= N or i < 0 or len(sig) == 0:
            return
        s = sig[: N - i]
        ang = (max(-1.0, min(1.0, pan)) + 1.0) * (math.pi / 4.0)
        self.L[i : i + len(s)] += s * gain * math.cos(ang) * 1.414
        self.R[i : i + len(s)] += s * gain * math.sin(ang) * 1.414


music = Bus()
sfx = Bus()


# -----------------------------------------------------------------------------
# Synthesized Musical Instruments
# -----------------------------------------------------------------------------
def e_piano(name: str, dur: float, amp: float = 0.16) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    mod = np.sin(2 * np.pi * f * 2.01 * t) * 1.6 * np.exp(-t * 7.0)
    body = np.sin(2 * np.pi * f * t + mod) + 0.16 * np.sin(2 * np.pi * f * 2.0 * t + 0.2)
    body += 0.06 * np.sin(2 * np.pi * f * 3.01 * t)
    click = noise(n) * np.exp(-t * 160.0) * 0.06
    return fade_edges((body + click) * env(n, 0.008, 0.42, 1.7) * amp, 0.003, min(0.06, dur * 0.15))


def pluck(name: str, dur: float, amp: float = 0.12, bright: float = 1.0) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    sig = np.zeros(n, dtype=np.float64)
    for k, a in [(1, 1.0), (2, 0.36 * bright), (3, 0.17 * bright), (4, 0.08 * bright), (5, 0.035 * bright)]:
        sig += a * np.sin(2 * np.pi * f * k * t + rng.uniform(0.0, 6.28))
    click = fft_filter(noise(n), 2200, 9500) * np.exp(-t * 130.0) * 0.04
    return fade_edges((sig + click) * env(n, 0.004, 0.25 + 0.35 / max(1.0, f / 220.0), 1.8) * amp, 0.003, 0.03)


def glock(name: str, dur: float, amp: float = 0.10) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    sig = (
        0.78 * np.sin(2 * np.pi * f * t)
        + 0.30 * np.sin(2 * np.pi * f * 2.01 * t)
        + 0.16 * np.sin(2 * np.pi * f * 3.93 * t)
        + 0.09 * np.sin(2 * np.pi * f * 5.42 * t)
    )
    return fade_edges(sig * env(n, 0.002, 0.75, 1.35) * amp, 0.002, 0.12)


def marimba(name: str, dur: float, amp: float = 0.12) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    sig = (
        0.90 * np.sin(2 * np.pi * f * t)
        + 0.32 * np.sin(2 * np.pi * f * 3.96 * t)
        + 0.11 * np.sin(2 * np.pi * f * 9.10 * t)
    )
    return fade_edges(sig * env(n, 0.003, 0.22, 1.5) * amp, 0.002, 0.03)


def bass(name: str, dur: float, amp: float = 0.27, bright: float = 0.25) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    sig = np.sin(2 * np.pi * f * t) + 0.24 * np.sin(2 * np.pi * f * 2.0 * t) + bright * 0.12 * np.sin(2 * np.pi * f * 3.0 * t)
    sig = np.tanh(sig * 1.35) * 0.8
    return fade_edges(sig * env(n, 0.008, 0.35, 1.4) * amp, 0.004, 0.04)


def pad(chord: list[str], dur: float, amp: float = 0.08) -> tuple[np.ndarray, np.ndarray]:
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    L = np.zeros(n, dtype=np.float64)
    R = np.zeros(n, dtype=np.float64)
    for i, note in enumerate(chord):
        f = hz(note)
        for detune, pan in [(-0.0025, -0.65), (0.0, 0.0), (0.0025, 0.65)]:
            sig = np.zeros(n, dtype=np.float64)
            for k in range(1, 9):
                sig += (1.0 / (k ** 1.45)) * np.sin(2 * np.pi * f * k * (1.0 + detune) * t + rng.uniform(0.0, 6.28))
            a = (i + 1) / (len(chord) + 1)
            g = amp * (0.45 + a * 0.5) * 0.34
            L += sig * g * (1.0 - (pan + 1.0) * 0.22)
            R += sig * g * (0.56 + (pan + 1.0) * 0.22)
    e = env(n, 0.45, 3.2, 1.2)
    return fade_edges(L * e, 0.3, 0.7), fade_edges(R * e, 0.3, 0.7)


def lead(name: str, dur: float, amp: float = 0.08) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    sig = np.zeros(n, dtype=np.float64)
    for k in range(1, 9):
        sig += np.sin(2 * np.pi * f * k * t + 0.1 * k) / (k ** 0.9)
    sig = np.tanh(sig * 1.2)
    return fade_edges(sig * env(n, 0.02, 0.45, 1.3) * amp, 0.01, 0.06)


# -----------------------------------------------------------------------------
# Drum Synthesizers (120 BPM Punchy Grid)
# -----------------------------------------------------------------------------
def kick(amp: float = 0.80) -> np.ndarray:
    n = sec(0.32)
    t = np.arange(n, dtype=np.float64) / SR
    f = 48.0 + 110.0 * np.exp(-t * 37.0)
    phase = 2 * np.pi * np.cumsum(f) / SR
    click = noise(n) * np.exp(-t * 95.0) * 0.08
    return (np.sin(phase) + click) * env(n, 0.002, 0.15, 1.1) * amp


def snare(amp: float = 0.20) -> np.ndarray:
    n = sec(0.25)
    t = np.arange(n, dtype=np.float64) / SR
    nz = fft_filter(noise(n), 700, 7500)
    return (nz * 0.85 + 0.18 * np.sin(2 * np.pi * 185.0 * t)) * env(n, 0.002, 0.10, 1.2) * amp


def clap(amp: float = 0.17) -> np.ndarray:
    n = sec(0.20)
    out = np.zeros(n, dtype=np.float64)
    for d in [0.0, 0.011, 0.023, 0.037]:
        ii = sec(d)
        burst = fft_filter(noise(n - ii), 1000, 6000) * np.exp(-np.arange(n - ii, dtype=np.float64) / SR * 28.0)
        out[ii:] += burst * (0.9 - d * 10.0)
    return fade_edges(out * amp, 0.002, 0.03)


def hat(open_hat: bool = False, amp: float = 0.035) -> np.ndarray:
    n = sec(0.16 if open_hat else 0.055)
    nz = noise(n)
    hi = nz - fft_filter(nz, None, 5000)
    return fade_edges(hi * env(n, 0.001, 0.11 if open_hat else 0.018, 1.0) * amp, 0.001, 0.015)


def shaker(amp: float = 0.03) -> np.ndarray:
    n = sec(0.12)
    nz = fft_filter(noise(n), 3800, 12000)
    return fade_edges(nz * env(n, 0.005, 0.055, 1.1) * amp, 0.004, 0.015)


def rim(amp: float = 0.12) -> np.ndarray:
    n = sec(0.08)
    t = np.arange(n, dtype=np.float64) / SR
    return fade_edges(
        (np.sin(2 * np.pi * 920.0 * t) * 0.25 + fft_filter(noise(n), 1500, 10000) * 0.55) * np.exp(-t * 60.0) * amp,
        0.001, 0.01
    )


# -----------------------------------------------------------------------------
# Foley Sound Effects
# -----------------------------------------------------------------------------
def paper_flip(dur: float = 0.28, amp: float = 0.12) -> np.ndarray:
    """Crisp stationery paper rustle."""
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    nz = noise(n)
    sweep = fft_filter(nz, 1000, 5500)
    envl = (np.sin(np.pi * np.minimum(1.0, t / dur)) ** 1.6) * (0.75 + 0.25 * np.sin(2 * np.pi * 4.0 * t))
    sig = sweep * envl * amp
    return fade_edges(sig, 0.008, 0.04)


def click_sfx(dur: float = 0.055, pitch: float = 1800.0, amp: float = 0.12) -> np.ndarray:
    """Tactile mechanical keypress click: punchy body + crisp high transient."""
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    # Transient snap
    snap = np.sin(2 * np.pi * pitch * t) * np.exp(-t * 90.0) * 0.45
    # Microswitch high tick
    tick = fft_filter(noise(n), 2000, 9000) * np.exp(-t * 140.0) * 0.35
    # Key bottom-out thud
    thud = np.sin(2 * np.pi * (pitch * 0.32) * t) * np.exp(-t * 60.0) * 0.30
    sig = (snap + tick + thud) * amp
    return fade_edges(sig, 0.001, 0.01)


def sfx_retro_button(freq: float = 1200.0, amp: float = 0.22, dur: float = 0.065) -> np.ndarray:
    """Delicate vintage arcade / keypad '哔' tone with tactile microswitch click."""
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    f1 = freq
    f2 = freq * 1.5
    tone = 0.68 * np.sin(2 * np.pi * f1 * t) + 0.30 * np.sin(2 * np.pi * f2 * t)
    chirp = np.exp(-t * 260.0) * 0.22 * np.sin(2 * np.pi * f1 * 2.0 * t)
    snap = fft_filter(noise(n), 1400, 7500) * np.exp(-t * 220.0) * 0.12
    e = env(n, 0.002, 0.038, 1.4)
    sig = (tone + chirp + snap) * e
    return fade_edges(sig * amp, 0.001, 0.01)


def pop_sfx(amp: float = 0.14) -> np.ndarray:
    """Perky upward bubble pop."""
    n = sec(0.09)
    t = np.arange(n, dtype=np.float64) / SR
    f = 450.0 + 1400.0 * (1.0 - np.exp(-t * 45.0))
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) * np.exp(-t * 38.0) * amp
    return fade_edges(sig, 0.001, 0.015)


def whoosh_sfx(dur: float = 0.32, amp: float = 0.14, rise: bool = True) -> np.ndarray:
    """Clean dynamic scene whoosh with gentle whistle."""
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    nz = noise(n)
    a = fft_filter(nz, 400, 2600)
    b = fft_filter(nz, 1400, 6500)
    x = t / dur
    noise_sweep = (a * (1.0 - x) + b * x) if rise else (b * (1.0 - x) + a * x)
    f_whistle = 600.0 + 1800.0 * x if rise else 2400.0 - 1800.0 * x
    whistle = np.sin(2 * np.pi * np.cumsum(f_whistle) / SR) * 0.25
    envl = np.sin(np.pi * np.minimum(1.0, t / dur)) ** 1.6
    sig = (noise_sweep * 0.65 + whistle * 0.35) * envl * amp
    return fade_edges(sig, 0.01, 0.05)


def stamp_sfx(amp: float = 0.20) -> np.ndarray:
    """Authoritative rubber stamp ink slap with clear wooden thump."""
    n = sec(0.22)
    t = np.arange(n, dtype=np.float64) / SR
    thud = np.sin(2 * np.pi * 170.0 * t) * np.exp(-t * 30.0) * 0.50
    slap = np.sin(2 * np.pi * 820.0 * t) * np.exp(-t * 70.0) * 0.45
    splat = fft_filter(noise(n), 1200, 6000) * np.exp(-t * 50.0) * 0.35
    sig = (thud + slap + splat) * amp
    return fade_edges(sig, 0.001, 0.03)


def zipper_sfx(dur: float = 0.65, amp: float = 0.16) -> np.ndarray:
    """Audible, crisp zipper teeth interlock pull."""
    n = sec(dur)
    out = np.zeros(n, dtype=np.float64)
    num_teeth = 22
    for i in range(num_teeth):
        pos = int(((i / float(num_teeth)) ** 0.95) * (n - sec(0.035)))
        freq = 1600.0 + i * 45.0
        c = click_sfx(0.035, freq, 0.20)
        ln = min(len(c), n - pos)
        out[pos : pos + ln] += c[:ln] * (0.70 + 0.30 * math.sin(i))
    # Fabric friction slide
    nz = fft_filter(noise(n), 1200, 4800) * np.sin(np.pi * (np.arange(n) / n)) * 0.04
    out += nz
    peak = max(np.max(np.abs(out)), 1e-9)
    out = (out / peak) * amp
    return fade_edges(out, 0.005, 0.03)


def riser(dur: float = 1.00, amp: float = 0.018) -> np.ndarray:
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    nz = noise(n)
    low = fft_filter(nz, 400, 2200)
    high = fft_filter(nz, 1800, 7500)
    x = t / dur
    sig = low * (1.0 - x) + high * x
    envl = np.sin(np.pi * np.minimum(1.0, t / dur)) ** 1.3
    return fade_edges(sig * envl * amp, 0.02, 0.03)


def sfx_boing_jump(pitch_start: float = 280.0, pitch_end: float = 620.0, dur: float = 0.20, amp: float = 0.14) -> np.ndarray:
    """Juicy cartoon boing spring jump."""
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    f = pitch_start + (pitch_end - pitch_start) * ((t / dur) ** 0.65)
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = (np.sin(phase) + 0.30 * np.sin(2.0 * phase) + 0.15 * np.sin(3.0 * phase))
    e = env(n, 0.005, dur * 0.65, 1.4)
    return fade_edges(sig * e * amp, 0.003, 0.03)


def sfx_mascot_swoosh(dur: float = 0.22, amp: float = 0.14, pitch_rise: bool = True) -> np.ndarray:
    """Distinct '咻' cartoon mascot flight."""
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    nz = noise(n)
    if pitch_rise:
        f = 850.0 + 2600.0 * ((t / dur) ** 1.3)
    else:
        f = 3200.0 - 2200.0 * ((t / dur) ** 0.8)
    whistle = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.50
    breeze = fft_filter(nz, 1000, 5500) * 0.40
    e = env(n, 0.010, dur * 0.60, 1.3)
    return fade_edges((breeze + whistle) * e * amp, 0.003, 0.02)


def sfx_scroll_glide(dur: float = 1.90, amp: float = 0.16) -> np.ndarray:
    """Ascending songlist flutter scroll: audible paper flick flutter & rising tone."""
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    out = np.zeros(n, dtype=np.float64)
    num_ticks = 26
    for k in range(num_ticks):
        pos_sec = ((k / float(num_ticks)) ** 1.05) * (dur - 0.04)
        pos = sec(pos_sec)
        freq = 600.0 + 1600.0 * (k / float(num_ticks))
        tick = click_sfx(0.030, freq, 0.22)
        ln = min(len(tick), n - pos)
        out[pos : pos + ln] += tick[:ln] * (0.65 + 0.35 * (k / float(num_ticks)))
    # Harmonic rising glide
    f_sweep = 440.0 + 980.0 * ((t / dur) ** 1.3)
    phase = 2 * np.pi * np.cumsum(f_sweep) / SR
    glide_tone = np.sin(phase) * env(n, 0.10, dur * 0.70, 1.2) * 0.12
    out += glide_tone
    peak = max(np.max(np.abs(out)), 1e-9)
    out = (out / peak) * amp
    return fade_edges(out, 0.02, 0.06)


def sfx_success_fanfare(notes: list[str] = ["C5", "E5", "G5", "C6"], spacing: float = 0.07, amp: float = 0.12) -> np.ndarray:
    """Melodious 4-note ascending '噔噔噔噔' task-success prompt fanfare on major buttons."""
    dur = spacing * len(notes) + 0.55
    n = sec(dur)
    out = np.zeros(n, dtype=np.float64)
    note_dur = 0.35
    for i, note in enumerate(notes):
        body = marimba(note, note_dur, 0.70)
        bell = glock(note, note_dur, 0.35)
        sig = body + bell
        offset = sec(i * spacing)
        ln = min(len(sig), n - offset)
        out[offset : offset + ln] += sig[:ln] * (0.85 + 0.15 * (i / max(1, len(notes) - 1)))
    return fade_edges(out * amp, 0.002, 0.04)


def sfx_celebration_firework(amp: float = 0.24) -> np.ndarray:
    """Festive party-popper pop '嘭！' + sizzling sparkle crackle (pure acoustic, no duplicate chime melody)."""
    dur = 1.10
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    out = np.zeros(n, dtype=np.float64)

    # 1. 礼花发射开花清脆重响 (Crisp snap transient + punchy acoustic thump)
    snap = np.sin(2 * np.pi * 1600.0 * t) * np.exp(-t * 180.0) * 0.35
    thump = np.sin(2 * np.pi * (160.0 + 340.0 * np.exp(-t * 60.0)) * t) * np.exp(-t * 32.0) * 0.45
    body = fft_filter(noise(n), 150, 1200) * np.exp(-t * 40.0) * 0.30
    pop_sig = snap + thump + body

    # 2. 金色火星与彩带噼啪碎裂声 (Sizzling crackle sparkles)
    nz = noise(n)
    sizzle = fft_filter(nz, 1800, 9500) * np.exp(-t * 8.0) * 0.22
    for c_time in [0.02, 0.06, 0.11, 0.18, 0.26, 0.35]:
        c_pos = sec(c_time)
        c_burst = click_sfx(0.045, rng.uniform(2400.0, 5200.0), 0.18)
        ln = min(len(c_burst), n - c_pos)
        out[c_pos : c_pos + ln] += c_burst[:ln]

    # 3. 空中星芒微光闪耀 (Airy high-frequency shimmer dust, NOT melodious bells)
    shimmer = fft_filter(nz, 6000, 14000) * np.exp(-t * 5.0) * 0.10

    out += pop_sig + sizzle + shimmer
    return fade_edges(out * amp, 0.002, 0.06)


# -----------------------------------------------------------------------------
# Harmony & Structural Arrangement (F Major, 120 BPM, 29 Bars = 58.0s)
# -----------------------------------------------------------------------------
CHORDS = [
    ["F3", "A3", "C4", "E4"],       # 0  intro (cage trapped)
    ["D3", "F3", "A3", "C4"],       # 1  cage unlock & breakout riser
    ["Bb2", "D3", "F3", "A3"],      # 2  BREAKOUT DROP / HERO LAND (4.0s)
    ["C3", "E3", "G3", "Bb3"],      # 3  6 platforms pop (6.0s)
    ["F3", "A3", "C4", "E4"],       # 4  parse scene enter (8.0s)
    ["D3", "F3", "A3", "C4"],       # 5  url typing (10.0s)
    ["G3", "Bb3", "D4", "F4"],      # 6  parse click & table unfold (12.0s)
    ["C3", "E3", "G3", "Bb3"],      # 7  tracks cascade (14.0s)
    ["F3", "A3", "C4", "E4"],       # 8  scroll descent (16.0s)
    ["Bb2", "D3", "F3", "A3"],      # 9  export scene enter (18.0s)
    ["C3", "E3", "G3", "Bb3"],      # 10 excel focus (20.0s)
    ["A2", "C3", "E3", "G3"],       # 11 json focus (22.0s)
    ["D3", "F3", "A3", "C4"],       # 12 6 formats fan (24.0s)
    ["G3", "Bb3", "D4", "F4"],      # 13 export stamp (26.0s)
    ["C3", "E3", "G3", "Bb3"],      # 14 batch scene enter (28.0s)
    ["F3", "A3", "C4", "E4"],       # 15 check 1, 2, 3 (30.0s)
    ["D3", "F3", "A3", "C4"],       # 16 batch click & workbook (32.0s)
    ["Bb2", "D3", "F3", "A3"],      # 17 zip close (34.0s)
    ["C3", "E3", "G3", "Bb3"],      # 18 CLI ENTER - FOUR-ON-THE-FLOOR (36.0s)
    ["A2", "C3", "E3", "G3"],       # 19 cli paste url (38.0s)
    ["D3", "F3", "A3", "C4"],       # 20 cli parsed (40.0s)
    ["G3", "Bb3", "D4", "F4"],      # 21 cli choose fmt (42.0s)
    ["C3", "E3", "G3", "Bb3"],      # 22 cli enter key & badges (44.0s)
    ["F3", "A3", "C4", "E4"],       # 23 ECOSYSTEM SCENE (46.0s)
    ["D3", "F3", "A3", "C4"],       # 24 lx music / listen 1 (48.0s)
    ["Bb2", "D3", "F3", "A3"],      # 25 public api (50.0s)
    ["F3", "A3", "C4", "E4"],       # 26 FINALE LOGO LAND (52.0s)
    ["F3", "A3", "C4", "G4"],       # 27 finale url pop & star wink (54.0s)
    ["F3", "A3", "C4", "G4"],       # 28 final resolving Fmaj9 resonance (56.0s - 58.0s)
]

ROOTS = [c[0] for c in CHORDS]


# -----------------------------------------------------------------------------
# 1. INTRO (Bars 0-2, 0.0s - 6.0s): Calm, Curious, Storybook Music-Box Progression
# -----------------------------------------------------------------------------
# Warm, cozy ambient pad underpinning the intro
p0_L, p0_R = pad(CHORDS[0], 2.2, 0.05)
music.add_stereo(0.0, p0_L, p0_R, 0.35)
p1_L, p1_R = pad(CHORDS[1], 2.2, 0.05)
music.add_stereo(2.0, p1_L, p1_R, 0.35)
p2_L, p2_R = pad(CHORDS[2], 2.2, 0.05)
music.add_stereo(4.0, p2_L, p2_R, 0.35)

# Subtle ambient paper air in the background (0.0s - 5.8s)
music.add(0.0, fft_filter(noise(sec(5.8)), 200, 2400) * 0.004, 1.0, -0.2)

# Bar 0 (0.0s - 2.0s, F Major): Peaceful, curious music-box chime & Rhodes
music.add(0.08, glock("A5", 2.6, 0.075), 1.0, 0.20)
music.add(0.50, e_piano("F3", 3.4, 0.085), 1.0, -0.15)
music.add(0.50, e_piano("C4", 3.4, 0.055), 1.0, 0.20)
music.add(0.50, glock("C6", 2.4, 0.055), 1.0, 0.35)
music.add(1.50, pluck("F4", 2.0, 0.050), 1.0, -0.25)

# Bar 1 (2.0s - 4.0s, D minor): In the cage, looking upward
music.add(2.00, e_piano("D3", 2.8, 0.075), 1.0, -0.10)
music.add(2.00, glock("F5", 2.2, 0.055), 1.0, 0.25)
music.add(2.90, pluck("A4", 1.8, 0.050), 1.0, -0.20)
music.add(3.50, e_piano("Bb2", 2.8, 0.075), 1.0, -0.10)
music.add(3.50, glock("D6", 2.6, 0.060), 1.0, 0.30)

# 3.8s: Golden Key descends from above (Key Arrive Sparkle Twinkle)
music.add(3.80, glock("F6", 0.65, 0.045), 1.0, 0.15)
music.add(3.92, glock("A6", 0.65, 0.045), 1.0, 0.20)
music.add(4.04, glock("C7", 0.75, 0.050), 1.0, 0.25)
music.add(4.00, pluck("C5", 1.5, 0.045), 1.0, -0.20)

# Smooth Pre-Drop Bridge (4.50s - 5.95s, building tension after key unlocks at 4.5s):
# 1. Low-to-high white-noise riser sweep creating anticipation
music.add(4.50, fft_filter(noise(sec(1.00)), 600, 7500) * env(sec(1.00), 0.40, 0.50, 1.2) * 0.022, 1.0, 0.0)

# 2. Gentle 8th-note shaker/hat ticks introducing the 120 BPM tempo naturally to the ear
music.add(4.75, shaker(0.014), 1.0, 0.20)
music.add(5.00, shaker(0.016), 1.0, -0.20)
music.add(5.00, rim(0.14), 1.0, 0.25)  # Cage door swings open
music.add(5.25, hat(False, 0.014), 1.0, 0.25)

# 5.5s (Beat 11, Frame 165) - MASCOT_JUMP_OUT: Crisp Rimshot + Open Hat Splash
music.add(5.50, rim(0.16), 1.0, 0.20)
music.add(5.50, hat(True, 0.020), 1.0, 0.30)

# 5.75s: Pre-drop pickup arpeggio & walking bass pickup note leading straight into downbeat drop
music.add(5.75, glock("F6", 0.90, 0.065), 1.0, 0.20)
music.add(5.75, bass("C3", 0.18, 0.15), 1.0, -0.15)


# -----------------------------------------------------------------------------
# 2. CORE GROOVE (Bars 3-25, 6.0s - 52.0s): Upbeat, Funky, Four-on-the-Floor
# -----------------------------------------------------------------------------
for bar in range(3, 26):
    start = bar * BAR
    chord = CHORDS[bar]
    root = ROOTS[bar]

    # --- Electric Piano Comping (Syncopated Offbeats) ---
    hits = [0.0, 1.25, 2.25, 3.25] if bar < 18 else [0.0, 0.75, 1.50, 2.50, 3.25]
    if bar in (9, 10, 11, 12, 13):
        hits = [0.0, 1.0, 1.75, 2.75, 3.50]
    for hit in hits:
        t = start + hit * BEAT
        if t >= 51.8:
            continue
        for k, note in enumerate(chord[1:]):
            music.add(t + k * 0.008, e_piano(note, 0.85, 0.038 if bar < 18 else 0.044), 1.0, -0.30 + k * 0.22)
        if bar >= 23:
            music.add(t, e_piano(chord[0], 1.4, 0.036), 1.0, -0.10)

    # --- Funky Walking Bassline (Octave Pops & Fifths) ---
    if bar < 14:
        bass_pattern = [(0.0, 0.42), (1.25, 0.26), (2.0, 0.34), (3.25, 0.22)]
    elif bar < 18:
        bass_pattern = [(0.0, 0.46), (1.0, 0.22), (1.75, 0.20), (2.5, 0.32), (3.25, 0.18)]
    elif bar < 23:
        # CLI scene: driving 8th-note electro bassline
        bass_pattern = [(0.0, 0.35), (0.75, 0.20), (1.50, 0.22), (2.0, 0.30), (2.75, 0.18), (3.50, 0.18)]
    else:
        bass_pattern = [(0.0, 0.50), (1.50, 0.26), (2.75, 0.30)]

    for hit, dur in bass_pattern:
        music.add(start + hit * BEAT, bass(root, dur, 0.22 if bar < 14 else 0.25), 1.0, -0.15)
        if hit in (1.25, 2.50, 3.25):
            fifth = chord[2] if len(chord) > 2 else root
            music.add(start + hit * BEAT + 0.005, bass(fifth, 0.16, 0.08), 1.0, 0.08)

    # --- Drums ---
    if bar < 18:
        # Web / Parse / Export / Batch: Punchy funk groove
        for b in [0.0, 2.0]:
            # Big punchy kick drop right at bar 3 (6.0s downbeat)!
            music.add(start + b * BEAT, kick(0.72 if bar == 3 else (0.64 if bar < 14 else 0.68)), 1.0, 0.0)
        if bar % 2 == 0:
            music.add(start + 1.75 * BEAT, kick(0.25), 1.0, 0.04)
        for b in [1.0, 3.0]:
            music.add(start + b * BEAT, snare(0.13 if bar < 14 else 0.15), 1.0, 0.10)
        # 16th-note shaker & hi-hats
        for sixteenth in range(16):
            b = sixteenth / 4.0
            if b >= 3.95:
                continue
            if sixteenth % 2 == 0:
                music.add(start + b * BEAT, hat(False, 0.019 if bar < 14 else 0.022), 1.0, 0.34 if sixteenth % 4 else -0.32)
            if sixteenth % 4 == 2:
                music.add(start + b * BEAT, shaker(0.020), 1.0, -0.28)
            if sixteenth % 8 == 6:
                music.add(start + b * BEAT, hat(True, 0.017), 1.0, 0.35)
        if bar >= 14:
            for b in [0.5, 2.5]:
                music.add(start + b * BEAT, clap(0.065), 1.0, 0.28)
    else:
        # CLI Scene (Bars 18-22, 36.0s - 46.0s): Driving FOUR-ON-THE-FLOOR electro pulse!
        for b in [0.0, 1.0, 2.0, 3.0]:
            music.add(start + b * BEAT, kick(0.60 if bar < 22 else 0.52), 1.0, 0.0)
        for b in [0.5, 1.5, 2.5, 3.5]:
            music.add(start + b * BEAT, shaker(0.018), 1.0, 0.30)
        for b in [1.0, 3.0]:
            music.add(start + b * BEAT, clap(0.070), 1.0, 0.22)
        for sixteenth in range(16):
            b = sixteenth / 4.0
            if sixteenth % 2 == 1:
                music.add(start + b * BEAT, hat(False, 0.014), 1.0, -0.36 if sixteenth % 4 else 0.36)

    # Warm pad strings in open sections
    if bar >= 23:
        pL, pR = pad(chord, min(3.4, 58.0 - start), 0.12)
        music.add_stereo(start, pL, pR, 0.55)

    # Playful Pluck Arpeggios
    if bar in (3, 8, 12, 16, 22, 24, 25):
        arp = [chord[2], chord[3], chord[1], chord[2]]
        for j, note in enumerate(arp * 2):
            music.add(start + j * 0.5 * BEAT, pluck(note, 1.2, 0.038, 0.8), 1.0, (j % 4 - 1.5) * 0.30)


# -----------------------------------------------------------------------------
# 3. MELODY & COUNTERPOINT
# -----------------------------------------------------------------------------
melody_bars: dict[int, list[tuple[float, str, float]]] = {
    3: [(0.50, "D6", 0.90), (1.00, "C6", 0.80), (1.50, "A5", 0.90), (2.00, "F5", 1.10)],
    4: [(0.50, "C5", 0.75), (0.75, "F5", 0.80), (1.25, "A5", 1.00), (2.00, "C6", 1.00), (2.50, "A5", 0.70)],
    5: [(0.50, "F5", 0.80), (1.00, "G5", 0.80), (1.50, "A5", 1.00), (2.50, "C6", 1.10), (3.00, "A5", 0.80), (3.50, "G5", 0.60)],
    6: [(0.50, "G5", 0.80), (1.00, "A5", 0.90), (1.50, "C6", 1.10), (2.00, "D6", 1.00), (2.50, "C6", 0.80), (3.00, "A5", 0.70), (3.50, "G5", 0.60)],
    7: [(0.50, "D5", 0.80), (0.75, "F5", 0.80), (1.25, "G5", 0.90), (1.75, "A5", 1.00), (2.50, "C6", 1.00), (3.00, "A5", 0.75)],
    8: [(0.50, "E5", 0.85), (0.75, "G5", 0.85), (1.25, "Bb5", 1.00), (2.00, "A5", 0.90), (2.50, "G5", 0.80), (3.00, "F5", 0.80)],
    9: [(0.50, "C5", 0.80), (0.75, "F5", 0.85), (1.25, "A5", 1.00), (2.00, "C6", 1.05), (2.50, "D6", 0.90), (3.00, "C6", 0.80)],
    10: [(0.50, "D5", 0.80), (1.00, "F5", 0.80), (1.50, "Bb5", 0.95), (2.25, "A5", 0.90), (2.75, "F5", 0.80)],
    11: [(0.50, "E5", 0.80), (1.00, "G5", 0.85), (1.50, "C6", 1.00), (2.50, "Bb5", 0.90), (3.00, "G5", 0.80)],
    12: [(0.50, "C6", 0.90), (1.00, "A5", 0.85), (1.50, "E5", 0.80), (2.00, "G5", 0.85), (2.50, "A5", 0.90), (3.00, "C6", 1.00)],
    13: [(0.50, "D6", 1.00), (1.00, "C6", 0.90), (1.50, "A5", 0.85), (2.25, "F5", 0.80), (2.75, "A5", 0.85), (3.25, "D6", 0.90)],
    14: [(0.50, "G5", 0.85), (1.00, "Bb5", 0.90), (1.50, "D6", 1.00), (2.50, "C6", 0.90), (3.00, "Bb5", 0.80)],
    15: [(0.50, "E5", 0.80), (1.00, "G5", 0.85), (1.50, "C6", 1.00), (2.50, "Bb5", 0.90), (3.00, "G5", 0.80)],
    16: [(0.50, "F5", 0.85), (1.00, "A5", 0.90), (1.50, "C6", 1.00), (2.50, "A5", 0.85), (3.00, "G5", 0.80), (3.50, "F5", 0.75)],
    17: [(0.50, "D5", 0.80), (1.00, "F5", 0.85), (1.50, "A5", 0.90), (2.50, "C6", 0.95), (3.00, "A5", 0.80), (3.50, "F5", 0.70)],
    18: [(0.25, "Bb4", 0.75), (0.75, "D5", 0.80), (1.25, "F5", 0.90), (2.25, "A5", 0.85), (2.75, "F5", 0.75)],
    19: [(0.25, "C5", 0.80), (0.75, "E5", 0.80), (1.25, "G5", 0.90), (2.25, "Bb5", 0.85), (2.75, "G5", 0.75)],
    20: [(0.25, "A4", 0.75), (0.75, "C5", 0.80), (1.25, "E5", 0.85), (2.25, "G5", 0.80), (2.75, "E5", 0.75)],
    21: [(0.25, "D5", 0.80), (0.75, "F5", 0.85), (1.25, "A5", 0.90), (2.25, "C6", 0.90), (2.75, "A5", 0.80)],
    22: [(0.25, "G5", 0.85), (0.75, "Bb5", 0.90), (1.25, "D6", 0.95), (2.25, "C6", 0.90), (2.75, "Bb5", 0.80)],
    23: [(0.25, "E5", 0.80), (0.75, "G5", 0.85), (1.25, "Bb5", 0.90), (2.00, "C6", 0.90), (2.50, "D6", 0.90), (3.00, "C6", 0.80)],
    24: [(0.50, "C6", 0.85), (1.00, "A5", 0.80), (1.50, "F5", 0.80), (2.25, "G5", 0.80), (2.75, "F5", 0.75)],
    25: [(0.50, "D6", 0.90), (1.00, "C6", 0.85), (1.50, "A5", 0.80), (2.25, "F5", 0.75), (2.75, "A5", 0.80)],
}

for bar, events in melody_bars.items():
    start = bar * BAR
    for beat, note, amp in events:
        t = start + beat * BEAT
        if t >= 51.8:
            continue
        music.add(t, glock(note, 1.8, 0.054 * amp), 0.75, 0.25)
        music.add(t + 0.012, pluck(note, 1.1, 0.046 * amp, 0.9), 1.0, -0.26)
        if bar >= 16:
            music.add(t + 0.02, lead(note, 0.6, 0.020 * amp), 1.0, 0.0)

# Marimba counterpoint in export/batch/eco
for bar in [10, 11, 12, 13, 14, 15, 16, 17, 24, 25]:
    start = bar * BAR
    for j, beat in enumerate([0.75, 1.75, 2.75, 3.25]):
        note = [CHORDS[bar][2], CHORDS[bar][3], CHORDS[bar][1], CHORDS[bar][2]][j]
        music.add(start + beat * BEAT, marimba(note, 0.8, 0.034), 1.0, 0.45 if j % 2 else -0.40)


# -----------------------------------------------------------------------------
# 4. FINALE (Bars 26-28, 52.0s - 58.0s): Tidy, Harmonious Resolving Cadence
# -----------------------------------------------------------------------------
# Hold warm, open Fmaj9 pad while the paper settles and mascot waves goodbye
pL, pR = pad(["F3", "A3", "C4", "E4", "G4"], 5.6, 0.17)
music.add_stereo(52.0, pL, pR, 0.75)
music.add(52.0, e_piano("F2", 5.2, 0.15), 1.0, -0.20)
music.add(52.0, e_piano("F4", 5.2, 0.11), 1.0, 0.20)
music.add(52.2, glock("C6", 4.0, 0.075), 1.0, 0.35)
music.add(52.7, glock("A5", 3.5, 0.065), 1.0, -0.30)

# Ascending sparkling chime arpeggio for finale logo
for i, n in enumerate(["F5", "A5", "C6", "F6", "A6", "C7"]):
    music.add(53.2 + i * 0.09, glock(n, 1.4, 0.042), 0.9, (i - 2.5) * 0.20)

# Official website URL pop (54.0s) - melody support
music.add(54.0, pluck("C5", 2.2, 0.050), 1.0, -0.20)
music.add(54.5, glock("D6", 2.0, 0.060), 1.0, 0.30)
music.add(55.0, glock("C6", 2.0, 0.060), 1.0, 0.20)

# Star wink & waving goodbye (55.5s - 58.0s)
music.add(55.5, glock("A5", 1.8, 0.055), 1.0, -0.25)
music.add(56.0, glock("G5", 1.8, 0.050), 1.0, 0.25)

# Final gentle bell cascade on "歌单自由啦，下次见！"
for i, n in enumerate(["C6", "A5", "F5", "C5"]):
    music.add(56.5 + i * 0.09, glock(n, 1.4, 0.032), 0.85, (i - 1.5) * 0.20)


# -----------------------------------------------------------------------------
# 5. ACTION FOLEY SOUND EFFECTS (100% Synced to timeline.json Cues)
# -----------------------------------------------------------------------------
# Scene 1: Cage rattles, key arrive, unlock, jump out, platforms pop
sfx.add(CUES["cage_rattle_1"], marimba("D3", 0.12, 0.080), pan=-0.15)
sfx.add(CUES["cage_rattle_2"], marimba("Eb3", 0.12, 0.080), pan=-0.15)
# Key arrival: soft airy whisper breeze (complementing the 3-note chime in music!)
sfx.add(CUES["key_arrive"], fft_filter(noise(sec(0.35)), 2800, 7500) * env(sec(0.35), 0.01, 0.25, 1.2) * 0.045, pan=0.20)
sfx.add(CUES["cage_unlock"], click_sfx(0.065, 1400.0, 0.16), pan=-0.10)
sfx.add(CUES["cage_open"], pop_sfx(0.14), pan=-0.10)
sfx.add(CUES["mascot_jump_out"], sfx_boing_jump(260.0, 580.0, 0.22, 0.14), pan=0.10)
sfx.add(CUES["mascot_jump_out"], sfx_mascot_swoosh(0.24, 0.14), pan=0.10)
sfx.add(CUES["hero_land"], stamp_sfx(0.18), pan=-0.10)

# 6 Platforms pop in (gentle, musical cascade)
for i, p_note in enumerate(["F5", "G5", "A5", "C6", "D6", "F6"]):
    sfx.add(CUES["platforms_pop"] + i * 0.12, marimba(p_note, 0.12, 0.075), pan=(i - 2.5) * 0.20)

# Scene 2: Web Parse (Search card, typing, jump & click parse, cascade, scroll, export excel)
sfx.add(CUES["search_card_in"], paper_flip(0.28, 0.12), pan=-0.10)
# Mascot leap from center stage into URL input bar
sfx.add(7.90, sfx_mascot_swoosh(0.22, 0.14), pan=-0.20)

for k in range(16):
    sfx.add(CUES["url_type_start"] + k * 0.105, click_sfx(0.038, 1600.0 + rng.uniform(-150.0, 180.0), 0.10), pan=rng.uniform(-0.15, 0.15))

# Mascot big cross-screen leap across to Parse button (800px span!)
sfx.add(CUES["parse_jump"], sfx_boing_jump(300.0, 600.0, 0.20, 0.14), pan=0.20)
sfx.add(CUES["parse_jump"], sfx_mascot_swoosh(0.24, 0.14), pan=0.20)

# Tactile button click feedback + strong ascending "噔噔噔噔" success fanfare!
sfx.add(CUES["parse_click"], sfx_retro_button(1100.0, 0.22), pan=0.20)
sfx.add(CUES["parse_click"] + 0.06, sfx_success_fanfare(["C5", "E5", "G5", "C6"], spacing=0.075, amp=0.12), pan=0.20)

# Mascot leap to right pink companion stage
sfx.add(11.20, sfx_mascot_swoosh(0.22, 0.14), pan=0.20)
sfx.add(CUES["result_unfold"], paper_flip(0.30, 0.12), pan=-0.10)
# Celebratory fireworks popping when table unfolds
sfx.add(CUES["result_unfold"] + 0.05, sfx_celebration_firework(0.22), pan=0.20)

# Table rows cascade: gentle background texture
for r in range(5):
    sfx.add(CUES["tracks_cascade"] + r * 0.14, marimba(["C5", "D5", "E5", "G5", "A5"][r], 0.12, 0.060), pan=(r - 2) * 0.15)

# Dragging scrollbar: Ascending pitch flurry & paper flick flutter through 128 tracks!
sfx.add(12.50, sfx_scroll_glide(2.00, 0.16), pan=0.20)
sfx.add(14.55, click_sfx(0.065, 1850.0, 0.14), pan=0.20)  # Reached bottom snap

# Mascot leaps from bottom up to toolbar Excel button
sfx.add(15.15, sfx_mascot_swoosh(0.24, 0.14), pan=0.10)
sfx.add(CUES["toolbar_highlight"], paper_flip(0.20, 0.10), pan=0.10)

# Export Excel: Clean layered feedback (Retro click -> Fanfare -> Firework pop)
sfx.add(CUES["export_click"], sfx_retro_button(1320.0, 0.22), pan=0.20)
sfx.add(CUES["export_click"] + 0.06, sfx_success_fanfare(["F5", "A5", "C6", "F6"], spacing=0.075, amp=0.12), pan=0.20)
sfx.add(CUES["export_click"] + 0.28, sfx_celebration_firework(0.22), pan=0.20)

# Scene 3: Multi-format Export (Split, Excel focus, JSON focus, 6 formats fan, stamp)
sfx.add(CUES["files_split"], whoosh_sfx(0.35, 0.14, True), pan=-0.15)
sfx.add(CUES["excel_focus"], marimba("G5", 0.15, 0.080), pan=-0.20)

# Mascot leap across to JSON card
sfx.add(21.40, sfx_mascot_swoosh(0.24, 0.14), pan=0.20)
sfx.add(CUES["json_focus"], sfx_boing_jump(320.0, 620.0, 0.20, 0.14), pan=0.20)

# Mascot leap from JSON card back to center stage
sfx.add(24.00, sfx_mascot_swoosh(0.24, 0.14), pan=0.0)

# 6 format cards fan out: gentle marimba cascade + celebratory firework
for i, p_note in enumerate(["C5", "D5", "F5", "G5", "A5", "C6"]):
    sfx.add(CUES["formats_fan"] + i * 0.10, marimba(p_note, 0.12, 0.065), pan=(i - 2.5) * 0.20)
sfx.add(CUES["formats_fan"] + 0.35, sfx_celebration_firework(0.22), pan=0.0)
sfx.add(CUES["export_stamp"], stamp_sfx(0.18), pan=0.0)

# Scene 4: Batch Export (Enter, 3 checks: do re mi -> batch click: tonic return & soar -> zip seal celebration)
sfx.add(CUES["batch_enter"], paper_flip(0.25, 0.12), pan=-0.15)
sfx.add(CUES["check_1"], marimba("C6", 0.16, 0.100), pan=-0.20)
sfx.add(CUES["check_1"], glock("C6", 0.4, 0.040), pan=-0.20)
sfx.add(CUES["check_2"], marimba("D6", 0.16, 0.100), pan=-0.20)
sfx.add(CUES["check_2"], glock("D6", 0.4, 0.040), pan=-0.20)
sfx.add(CUES["check_3"], marimba("E6", 0.16, 0.105), pan=-0.20)
sfx.add(CUES["check_3"], glock("E6", 0.4, 0.040), pan=-0.20)

# Batch button click: tactile retro "哔" + ascending soaring fanfare resolution (Do -> Sol -> High Do)
sfx.add(CUES["batch_click"], sfx_retro_button(1046.5, 0.22), pan=0.15)
sfx.add(CUES["batch_click"] + 0.06, sfx_success_fanfare(["C6", "G6", "C7"], spacing=0.08, amp=0.12), pan=0.15)

sfx.add(CUES["workbook_open"], paper_flip(0.25, 0.12), pan=-0.15)
sfx.add(CUES["zip_close"], zipper_sfx(0.65, 0.16), pan=0.15)

# Packaging complete (34.27s = zipClose + 14 frames, exactly matches <ZipCelebrationFireworks />):
# Crisp completion seal click + high bell ding + celebratory fireworks pop '嘭！' + sparkles!
sfx.add(34.27, click_sfx(0.065, 1900.0, 0.16), pan=0.15)
sfx.add(34.27, glock("C7", 0.8, 0.085), pan=0.15)
sfx.add(34.27, sfx_celebration_firework(0.24), pan=0.15)

# Scene 5: CLI World (Slide in, terminal menu, paste url, parsed, enter key, done, OS chips)
sfx.add(CUES["cli_slide_in"], whoosh_sfx(0.30, 0.14, True), pan=0.15)
sfx.add(CUES["cli_menu_ready"], marimba("F5", 0.15, 0.080), pan=0.20)
for k in range(12):
    sfx.add(CUES["cli_paste_url"] + k * 0.08, click_sfx(0.042, 1350.0 + rng.uniform(-160.0, 220.0), 0.16), pan=0.15)
sfx.add(CUES["cli_parsed"], marimba("A5", 0.15, 0.080), pan=0.20)
sfx.add(CUES["cli_choose_fmt"], sfx_retro_button(1320.0, 0.20), pan=0.10)
sfx.add(CUES["cli_choose_fmt"] + 0.33, click_sfx(0.040, 1380.0, 0.16), pan=0.15)
sfx.add(CUES["cli_choose_fmt"] + 0.42, click_sfx(0.040, 1460.0, 0.16), pan=0.15)

# CLI Enter: punchy key press + "噔噔噔噔" success fanfare + explosion firework (100% matched to burstFrame={pressEnter}!)
sfx.add(CUES["cli_press_enter"], sfx_retro_button(880.0, 0.22), pan=0.20)
sfx.add(CUES["cli_press_enter"], click_sfx(0.065, 680.0, 0.14), pan=0.20)
sfx.add(CUES["cli_press_enter"], sfx_celebration_firework(0.24), pan=0.20)
sfx.add(CUES["cli_press_enter"] + 0.06, sfx_success_fanfare(["C5", "E5", "G5", "C6"], spacing=0.075, amp=0.12), pan=0.20)
for i in range(3):
    sfx.add(CUES["cli_os_badges"] + i * 0.10, pop_sfx(0.12), pan=(i - 1) * 0.25)

# Scene 6: Open-source Players & Ecosystem (MusicFree, LX Music, BBPlayer, Public API)
sfx.add(CUES["eco_enter"], whoosh_sfx(0.28, 0.14, True), pan=-0.15)
sfx.add(CUES["eco_hop_mf"], sfx_boing_jump(300.0, 560.0, 0.18, 0.14), pan=-0.35)
sfx.add(CUES["eco_hop_mf"], sfx_mascot_swoosh(0.18, 0.12), pan=-0.35)

sfx.add(CUES["eco_hop_lx"], sfx_boing_jump(340.0, 620.0, 0.18, 0.14), pan=0.0)
sfx.add(CUES["eco_hop_lx"], sfx_mascot_swoosh(0.18, 0.12), pan=0.0)

sfx.add(CUES["eco_hop_l1"], sfx_boing_jump(380.0, 700.0, 0.18, 0.14), pan=0.35)
sfx.add(CUES["eco_hop_l1"], sfx_mascot_swoosh(0.18, 0.12), pan=0.35)

sfx.add(CUES["eco_api_bar"], sfx_boing_jump(320.0, 640.0, 0.20, 0.14), pan=0.0)

# Scene 7: Grand Finale (Logo land, URL pop with grand fireworks, resolving wave)
# (Tidy & clean: trimmed excess fanfare chime & duplicate bell, letting the song resolve peacefully!)
sfx.add(CUES["finale_enter"], paper_flip(0.20, 0.08), pan=-0.10)
sfx.add(CUES["finale_logo_land"], stamp_sfx(0.18), pan=0.0)

# Website URL Pop (54.0s) - Pure Celebratory Fireworks Pop & Sizzle
sfx.add(CUES["finale_url_pop"], sfx_celebration_firework(0.24), pan=0.0)


# -----------------------------------------------------------------------------
# 6. MASTER MIXING & MASTERING
# -----------------------------------------------------------------------------
def apply_master_eq(x: np.ndarray) -> np.ndarray:
    return fft_filter(x, 32.0, 15500.0)


def reverb_pair(L: np.ndarray, R: np.ndarray, amount: float = 0.18) -> tuple[np.ndarray, np.ndarray]:
    dur = 1.50
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    irL = rng.standard_normal(n) * np.exp(-t * 2.8) * 0.5
    irR = rng.standard_normal(n) * np.exp(-t * 2.8) * 0.5
    irL = fft_filter(irL, 160.0, 7000.0)
    irR = fft_filter(irR, 160.0, 7000.0)
    irL /= np.sqrt(np.sum(irL ** 2)) + 1e-9
    irR /= np.sqrt(np.sum(irR ** 2)) + 1e-9

    def conv(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
        size = len(x) + len(ir) - 1
        nfft = 1 << (size - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[: len(x)]
        return y

    wetL = conv(L, irL) * amount
    wetR = conv(R, irR) * amount
    return wetL, wetR


wetL, wetR = reverb_pair(music.L, music.R, 0.18)
fL, fR = reverb_pair(sfx.L, sfx.R, 0.05)

# Background music slightly lowered (~ -1.3 dB) to let crisp foley and tactile clicks breathe
mixL = music.L * 0.80 + sfx.L * 0.82 + wetL * 0.68 + fL * 0.40
mixR = music.R * 0.80 + sfx.R * 0.82 + wetR * 0.68 + fR * 0.40
mixL = apply_master_eq(mixL)
mixR = apply_master_eq(mixR)

# Remove DC offset
mixL -= np.mean(mixL)
mixR -= np.mean(mixR)

# Soft saturation tastefully catches peaks
drive = 1.06
mixL = np.tanh(mixL * drive) / np.tanh(drive)
mixR = np.tanh(mixR * drive) / np.tanh(drive)

# Musical fades: quick 0.15s in, gentle 1.2s out
fi = sec(0.15)
fo = sec(1.20)
for ch in (mixL, mixR):
    ch[:fi] *= np.linspace(0.0, 1.0, fi) ** 0.8
    ch[-fo:] *= np.linspace(1.0, 0.0, fo) ** 1.5

# Peak normalise to -1.1 dBFS (0.880)
peak = max(float(np.max(np.abs(mixL))), float(np.max(np.abs(mixR))), 1e-9)
gain = 0.880 / peak
mixL *= gain
mixR *= gain

audio_dir = ROOT / "public" / "audio"
audio_dir.mkdir(parents=True, exist_ok=True)


def write_wav(name: str, l: np.ndarray, r: np.ndarray, gain_value: float = 1.0) -> None:
    b = np.stack([np.clip(l * gain_value, -1.0, 1.0), np.clip(r * gain_value, -1.0, 1.0)], axis=1)
    with wave.open(str(audio_dir / name), "wb") as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((b * 32767.0).astype(np.int16).tobytes())


def main() -> None:
    write_wav("soundtrack.wav", mixL, mixR)
    write_wav("music-only.wav", apply_master_eq(music.L + wetL), apply_master_eq(music.R + wetR), 0.82)
    write_wav("sfx-only.wav", apply_master_eq(sfx.L + fL), apply_master_eq(sfx.R + fR), 2.20)

    # Report stems / RMS
    for name, l, r in [("mix", mixL, mixR), ("music", music.L, music.R), ("sfx", sfx.L, sfx.R)]:
        rms = math.sqrt(float(np.mean(l ** 2 + r ** 2) / 2.0))
        pk = max(float(np.max(np.abs(l))), float(np.max(np.abs(r))))
        print(f"{name:5s} rms={20*math.log10(max(rms, 1e-12)):6.1f} dBFS peak={20*math.log10(max(pk, 1e-12)):6.1f} dBFS")
    print(f"Synthesized 58.0s stereo soundtrack & stems -> {audio_dir / 'soundtrack.wav'}")


if __name__ == "__main__":
    main()
