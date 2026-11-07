"""Original score and foley for Playlist Out — a little music-journal film.

Everything is synthesised locally with numpy. No samples, loops or third-party
recordings. 120 BPM / F major / 28 bars / 56 seconds. Cue times are read from
src/timeline.json so the picture edit and the music share one clock.
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
BEAT = 60 / BPM
BAR = BEAT * 4
DURATION = 56.0
N = int(SR * DURATION)
rng = np.random.default_rng(20261107)

timeline = json.loads((ROOT / "src" / "timeline.json").read_text(encoding="utf-8"))
CUES = timeline["cues"]

# ----------------------------------------------------------------------------- helpers
def sec(t: float) -> int:
    return int(round(t * SR))

def midi(name: str) -> int:
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
             "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    pitch, octave = name[:-1], int(name[-1])
    return (octave + 1) * 12 + names[pitch]

def hz(name: str) -> float:
    return 440.0 * 2 ** ((midi(name) - 69) / 12)

def fft_filter(x: np.ndarray, lo: float | None = None, hi: float | None = None) -> np.ndarray:
    if len(x) == 0:
        return x
    x = x.astype(np.float64)
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    mask = np.ones_like(freqs)
    if lo:
        mask *= 1 / (1 + np.exp(-(freqs - lo) / max(1.0, lo * 0.12)))
    if hi:
        mask *= 1 / (1 + np.exp((freqs - hi) / max(1.0, hi * 0.09)))
    return np.fft.irfft(spec * mask, len(x)).astype(np.float64)

def env(n: int, attack: float, decay: float, curve: float = 2.0) -> np.ndarray:
    t = np.arange(n) / SR
    a = 1 - np.exp(-t / max(1e-5, attack))
    d = np.exp(-t / max(1e-5, decay))
    return (a * d) ** (1.0 / curve)

def noise(n: int) -> np.ndarray:
    return rng.standard_normal(n)

def pad_to(n: int, arr: np.ndarray) -> np.ndarray:
    if len(arr) >= n:
        return arr[:n]
    return np.pad(arr, (0, n - len(arr)))

def fade_edges(x: np.ndarray, a: float = 0.006, r: float = 0.02) -> np.ndarray:
    y = x.copy()
    na, nr = min(len(y), sec(a)), min(len(y), sec(r))
    if na:
        y[:na] *= np.linspace(0, 1, na) ** 0.6
    if nr:
        y[-nr:] *= np.linspace(1, 0, nr) ** 1.4
    return y

class Bus:
    def __init__(self):
        self.L = np.zeros(N, dtype=np.float64)
        self.R = np.zeros(N, dtype=np.float64)

    def add_stereo(self, start: float, left: np.ndarray, right: np.ndarray, gain: float = 1.0):
        i = sec(start)
        if i >= N:
            return
        ln = min(len(left), len(right), N - i)
        self.L[i:i + ln] += left[:ln] * gain
        self.R[i:i + ln] += right[:ln] * gain

    def add(self, start: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0, bus: "Bus | None" = None):
        target = bus if bus is not None else self
        i = sec(start)
        if i >= N:
            return
        s = sig[: N - i]
        ang = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
        target.L[i:i + len(s)] += s * gain * math.cos(ang) * 1.414
        target.R[i:i + len(s)] += s * gain * math.sin(ang) * 1.414

music = Bus()
sfx = Bus()

# ----------------------------------------------------------------------------- instruments
def e_piano(name: str, dur: float, amp: float = 0.16) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * 2.01 * t) * 1.6 * np.exp(-t * 7)
    body = np.sin(2 * np.pi * f * t + mod) + 0.16 * np.sin(2 * np.pi * f * 2 * t + 0.2)
    body += 0.06 * np.sin(2 * np.pi * f * 3.01 * t)
    click = noise(n) * np.exp(-t * 160) * 0.06
    return fade_edges((body + click) * env(n, 0.008, 0.42, 1.7) * amp, 0.003, min(0.06, dur * 0.15))

def pluck(name: str, dur: float, amp: float = 0.12, bright: float = 1.0) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for k, a in [(1, 1.0), (2, 0.36 * bright), (3, 0.17 * bright), (4, 0.08 * bright), (5, 0.035 * bright)]:
        sig += a * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28))
    click = fft_filter(noise(n), 2200, 9500) * np.exp(-t * 130) * 0.04
    return fade_edges((sig + click) * env(n, 0.004, 0.25 + 0.35 / max(1.0, f / 220), 1.8) * amp, 0.003, 0.03)

def glock(name: str, dur: float, amp: float = 0.1) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n) / SR
    sig = (0.78 * np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t) +
           0.16 * np.sin(2 * np.pi * f * 3.93 * t) + 0.09 * np.sin(2 * np.pi * f * 5.42 * t))
    return fade_edges(sig * env(n, 0.002, 0.75, 1.35) * amp, 0.002, 0.12)

def marimba(name: str, dur: float, amp: float = 0.12) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n) / SR
    sig = (0.9 * np.sin(2 * np.pi * f * t) + 0.32 * np.sin(2 * np.pi * f * 3.96 * t) +
           0.11 * np.sin(2 * np.pi * f * 9.1 * t))
    return fade_edges(sig * env(n, 0.003, 0.22, 1.5) * amp, 0.002, 0.03)

def bass(name: str, dur: float, amp: float = 0.27, bright: float = 0.25) -> np.ndarray:
    f = hz(name)
    n = sec(dur)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * f * t) + 0.24 * np.sin(2 * np.pi * f * 2 * t) + bright * 0.12 * np.sin(2 * np.pi * f * 3 * t)
    sig = np.tanh(sig * 1.35) * 0.8
    return fade_edges(sig * env(n, 0.008, 0.35, 1.4) * amp, 0.004, 0.04)

def pad(chord: list[str], dur: float, amp: float = 0.08) -> tuple[np.ndarray, np.ndarray]:
    n = sec(dur)
    t = np.arange(n) / SR
    L = np.zeros(n); R = np.zeros(n)
    for i, note in enumerate(chord):
        f = hz(note)
        for detune, pan in [(-0.0025, -0.65), (0.0, 0.0), (0.0025, 0.65)]:
            sig = np.zeros(n)
            for k in range(1, 9):
                sig += (1 / k ** 1.45) * np.sin(2 * np.pi * f * k * (1 + detune) * t + rng.uniform(0, 6.28))
            a = (i + 1) / (len(chord) + 1)
            g = amp * (0.45 + a * 0.5) * 0.34
            L += sig * g * (1 - (pan + 1) * 0.22)
            R += sig * g * (0.56 + (pan + 1) * 0.22)
    e = env(n, 0.45, 3.2, 1.2)
    return fade_edges(L * e, 0.3, 0.7), fade_edges(R * e, 0.3, 0.7)

def kick(amp: float = 0.8) -> np.ndarray:
    n = sec(0.32); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 37)
    phase = 2 * np.pi * np.cumsum(f) / SR
    click = noise(n) * np.exp(-t * 95) * 0.08
    return (np.sin(phase) + click) * env(n, 0.002, 0.15, 1.1) * amp

def snare(amp: float = 0.2) -> np.ndarray:
    n = sec(0.25); t = np.arange(n) / SR
    nz = fft_filter(noise(n), 700, 7500)
    return (nz * 0.85 + 0.18 * np.sin(2 * np.pi * 185 * t)) * env(n, 0.002, 0.10, 1.2) * amp

def clap(amp: float = 0.17) -> np.ndarray:
    n = sec(0.2); t = np.arange(n) / SR
    out = np.zeros(n)
    for d in [0.0, 0.011, 0.023, 0.037]:
        ii = sec(d)
        burst = fft_filter(noise(n - ii), 1000, 6000) * np.exp(-np.arange(n - ii) / SR * 28)
        out[ii:] += burst * (0.9 - d * 10)
    return fade_edges(out * amp, 0.002, 0.03)

def hat(open_hat: bool = False, amp: float = 0.035) -> np.ndarray:
    n = sec(0.16 if open_hat else 0.055); t = np.arange(n) / SR
    nz = noise(n)
    hi = nz - fft_filter(nz, None, 5000)
    return fade_edges(hi * env(n, 0.001, 0.11 if open_hat else 0.018, 1.0) * amp, 0.001, 0.015)

def shaker(amp: float = 0.03) -> np.ndarray:
    n = sec(0.12); t = np.arange(n) / SR
    nz = fft_filter(noise(n), 3800, 12000)
    return fade_edges(nz * env(n, 0.005, 0.055, 1.1) * amp, 0.004, 0.015)

def rim(amp: float = 0.12) -> np.ndarray:
    n = sec(0.08); t = np.arange(n) / SR
    return fade_edges((np.sin(2 * np.pi * 920 * t) * 0.25 + fft_filter(noise(n), 1500, 10000) * 0.55) * np.exp(-t * 60) * amp, 0.001, 0.01)

def lead(name: str, dur: float, amp: float = 0.08) -> np.ndarray:
    f = hz(name)
    n = sec(dur); t = np.arange(n) / SR
    sig = np.zeros(n)
    for k in range(1, 9):
        sig += np.sin(2 * np.pi * f * k * t + 0.1 * k) / k ** 0.9
    sig = np.tanh(sig * 1.2)
    return fade_edges(sig * env(n, 0.02, 0.45, 1.3) * amp, 0.01, 0.06)

def chime_run(notes: list[str], spacing: float, amp: float = 0.11, pan: float = 0.2):
    for i, note in enumerate(notes):
        music.add(CUES["finale_logo"] + i * spacing, glock(note, 2.4, amp), 1.0, pan + (i % 3 - 1) * 0.2)
        music.add(CUES["finale_logo"] + i * spacing + 0.012, pluck(note, 1.8, amp * 0.5, 0.7), 1.0, pan - 0.2)

# ----------------------------------------------------------------------------- harmony & structure
# One chord per bar. The arrangement follows the film's seven movements.
CHORDS = [
    ["F3", "A3", "C4", "E4"],       # 1  intro
    ["D3", "F3", "A3", "C4"],       # 2
    ["Bb2", "D3", "F3", "A3"],      # 3
    ["C3", "E3", "G3", "Bb3"],      # 4  parse
    ["F3", "A3", "C4", "E4"],       # 5
    ["D3", "F3", "A3", "C4"],       # 6
    ["G3", "Bb3", "D4", "F4"],      # 7
    ["C3", "E3", "G3", "Bb3"],      # 8
    ["F3", "A3", "C4", "E4"],       # 9
    ["Bb2", "D3", "F3", "A3"],      # 10 export
    ["C3", "E3", "G3", "Bb3"],      # 11
    ["A2", "C3", "E3", "G3"],       # 12
    ["D3", "F3", "A3", "C4"],       # 13
    ["G3", "Bb3", "D4", "F4"],      # 14 batch
    ["C3", "E3", "G3", "Bb3"],      # 15
    ["F3", "A3", "C4", "E4"],       # 16
    ["D3", "F3", "A3", "C4"],       # 17
    ["Bb2", "D3", "F3", "A3"],      # 18 cli
    ["C3", "E3", "G3", "Bb3"],      # 19
    ["A2", "C3", "E3", "G3"],       # 20
    ["D3", "F3", "A3", "C4"],       # 21
    ["G3", "Bb3", "D4", "F4"],      # 22
    ["C3", "E3", "G3", "Bb3"],      # 23
    ["F3", "A3", "C4", "E4"],       # 24 eco
    ["D3", "F3", "A3", "C4"],       # 25
    ["Bb2", "D3", "F3", "A3"],      # 26
    ["F3", "A3", "C4", "E4"],       # 27 finale
    ["F3", "A3", "C4", "G4"],       # 28
]

ROOTS = [c[0] for c in CHORDS]
UPPER = ["F4", "A4", "C5", "E5", "D5", "G5", "Bb4", "D5"]

def chord_notes(bar: int) -> list[str]:
    return CHORDS[bar]

def is_section(bar: int, start: int, end: int) -> bool:
    return start <= bar < end

# ----------------------------------------------------------------------------- intro (bars 0-2)
music.add(0.0, fft_filter(noise(sec(5.8)), 200, 2400) * 0.006, 1.0, -0.2)
music.add(0.08, glock("A5", 2.7, 0.08), 1.0, 0.2)
music.add(0.5, e_piano("F3", 3.6, 0.12), 1.0, -0.15)
music.add(0.5, e_piano("C4", 3.6, 0.08), 1.0, 0.2)
music.add(0.5, glock("C6", 2.6, 0.055), 1.0, 0.4)
music.add(1.5, pluck("F4", 2.0, 0.06), 1.0, -0.3)
music.add(2.0, e_piano("D3", 2.7, 0.1), 1.0, -0.1)
music.add(2.0, glock("F5", 2.4, 0.065), 1.0, 0.28)
music.add(2.9, pluck("A4", 1.8, 0.06), 1.0, -0.25)
music.add(3.5, e_piano("Bb2", 3.6, 0.1), 1.0, -0.1)
music.add(3.5, glock("D6", 3.0, 0.06), 1.0, 0.35)
music.add(4.0, pluck("C5", 1.5, 0.055), 1.0, -0.25)
# small pre-drop lift
music.add(4.5, fft_filter(noise(sec(1.35)), 700, 9000) * env(sec(1.35), 0.5, 0.55, 1.2) * 0.035, 1.0, 0.0)
music.add(5.0, rim(0.2), 1.0, 0.25)
music.add(5.5, kick(0.65), 1.0, 0.0)
music.add(5.75, glock("F6", 0.9, 0.08), 0.85, 0.2)

# ----------------------------------------------------------------------------- groove sections
# The core comping / drums / bass are generated per bar with section-specific variations.
def in_finale(bar: int) -> bool:
    return bar >= 26

for bar in range(28):
    start = bar * BAR
    if bar < 3 or in_finale(bar):
        continue
    chord = chord_notes(bar)
    # Electric-piano comp: a little lazy, with syncopated offbeats.
    hits = [0.0, 1.25, 2.25, 3.25] if bar < 18 else [0.0, 0.75, 1.5, 2.5, 3.25]
    if bar in (9, 10, 11, 12, 13):
        hits = [0.0, 1.0, 1.75, 2.75, 3.5]
    for j, hit in enumerate(hits):
        t = start + hit * BEAT
        if t >= 51.8:
            continue
        for k, note in enumerate(chord[1:]):
            music.add(t + k * 0.008, e_piano(note, 0.85, 0.037 if bar < 18 else 0.042), 1.0, -0.3 + k * 0.22)
        if bar >= 24:
            music.add(t, e_piano(chord[0], 1.4, 0.035), 1.0, -0.1)
    # Bass
    root = ROOTS[bar]
    if bar < 14:
        pattern = [(0.0, 0.42), (1.25, 0.26), (2.0, 0.34), (3.25, 0.22)]
    elif bar < 18:
        pattern = [(0.0, 0.46), (1.0, 0.22), (1.75, 0.2), (2.5, 0.32), (3.25, 0.18)]
    elif bar < 24:
        pattern = [(0.0, 0.35), (0.75, 0.2), (1.5, 0.22), (2.0, 0.3), (2.75, 0.18), (3.5, 0.18)]
    else:
        pattern = [(0.0, 0.5), (1.5, 0.26), (2.75, 0.3)]
    for hit, dur in pattern:
        music.add(start + hit * BEAT, bass(root, dur, 0.21 if bar < 14 else 0.24), 1.0, -0.15)
        if hit in (1.25, 2.5, 3.25):
            fifth = chord[2] if len(chord) > 2 else root
            music.add(start + hit * BEAT + 0.005, bass(fifth, 0.16, 0.07), 1.0, 0.08)
    # Drums
    if bar < 17:
        for b in [0.0, 2.0]:
            music.add(start + b * BEAT, kick(0.6 if bar < 14 else 0.68), 1.0, 0.0)
        if bar % 2 == 0:
            music.add(start + 1.75 * BEAT, kick(0.24), 1.0, 0.04)
        for b in [1.0, 3.0]:
            music.add(start + b * BEAT, snare(0.12 if bar < 14 else 0.14), 1.0, 0.1)
        # shaker / hats
        for sixteenth in range(16):
            b = sixteenth / 4
            if b >= 3.95:
                continue
            if sixteenth % 2 == 0:
                music.add(start + b * BEAT, hat(False, 0.018 if bar < 14 else 0.021), 1.0, 0.34 if sixteenth % 4 else -0.32)
            if sixteenth % 4 == 2:
                music.add(start + b * BEAT, shaker(0.019), 1.0, -0.28)
            if sixteenth % 8 == 6:
                music.add(start + b * BEAT, hat(True, 0.016), 1.0, 0.35)
        if bar >= 14:
            for b in [0.5, 2.5]:
                music.add(start + b * BEAT, clap(0.06), 1.0, 0.28)
    else:
        # CLI: a lighter electronic pulse with four-on-the-floor and offbeat ticks
        for b in [0.0, 1.0, 2.0, 3.0]:
            music.add(start + b * BEAT, kick(0.58 if bar < 22 else 0.5), 1.0, 0.0)
        for b in [0.5, 1.5, 2.5, 3.5]:
            music.add(start + b * BEAT, shaker(0.017), 1.0, 0.3)
        for b in [1.0, 3.0]:
            music.add(start + b * BEAT, clap(0.065), 1.0, 0.22)
        for sixteenth in range(16):
            b = sixteenth / 4
            if sixteenth % 2 == 1:
                music.add(start + b * BEAT, hat(False, 0.012), 1.0, -0.36 if sixteenth % 4 else 0.36)
    # Warm pad/strings in the more open sections
    if bar >= 24 or bar in (0, 1, 2):
        pL, pR = pad(chord, min(3.4, 56 - start), 0.11 if bar < 3 else 0.14)
        music.add_stereo(start, pL, pR, 0.55)
    # Arpeggios that make the world feel hand-made
    if bar in (2, 8, 12, 16, 22, 24, 25):
        arp = [chord[2], chord[3], chord[1], chord[2]]
        for j, note in enumerate(arp * 2):
            music.add(start + j * 0.5 * BEAT, pluck(note, 1.2, 0.035, 0.8), 1.0, (j % 4 - 1.5) * 0.3)

# ----------------------------------------------------------------------------- melody
melody_bars = {
    1: [(0.5, "C5", 0.7), (1.0, "F5", 0.7), (1.5, "A5", 1.0)],
    2: [(0.5, "D5", 0.65), (1.0, "F5", 0.65), (1.5, "C6", 1.1)],
    3: [(0.5, "D6", 0.9), (1.0, "C6", 0.8), (1.5, "A5", 0.9), (2.0, "F5", 1.1)],
    4: [(0.5, "C5", 0.75), (0.75, "F5", 0.8), (1.25, "A5", 1.0), (2.0, "C6", 1.0), (2.5, "A5", 0.7)],
    5: [(0.5, "F5", 0.8), (1.0, "G5", 0.8), (1.5, "A5", 1.0), (2.5, "C6", 1.1), (3.0, "A5", 0.8), (3.5, "G5", 0.6)],
    6: [(0.5, "G5", 0.8), (1.0, "A5", 0.9), (1.5, "C6", 1.1), (2.0, "D6", 1.0), (2.5, "C6", 0.8), (3.0, "A5", 0.7), (3.5, "G5", 0.6)],
    7: [(0.5, "D5", 0.8), (0.75, "F5", 0.8), (1.25, "G5", 0.9), (1.75, "A5", 1.0), (2.5, "C6", 1.0), (3.0, "A5", 0.75)],
    8: [(0.5, "E5", 0.85), (0.75, "G5", 0.85), (1.25, "Bb5", 1.0), (2.0, "A5", 0.9), (2.5, "G5", 0.8), (3.0, "F5", 0.8)],
    9: [(0.5, "C5", 0.8), (0.75, "F5", 0.85), (1.25, "A5", 1.0), (2.0, "C6", 1.05), (2.5, "D6", 0.9), (3.0, "C6", 0.8)],
    10: [(0.5, "D5", 0.8), (1.0, "F5", 0.8), (1.5, "Bb5", 0.95), (2.25, "A5", 0.9), (2.75, "F5", 0.8)],
    11: [(0.5, "E5", 0.8), (1.0, "G5", 0.85), (1.5, "C6", 1.0), (2.5, "Bb5", 0.9), (3.0, "G5", 0.8)],
    12: [(0.5, "C6", 0.9), (1.0, "A5", 0.85), (1.5, "E5", 0.8), (2.0, "G5", 0.85), (2.5, "A5", 0.9), (3.0, "C6", 1.0)],
    13: [(0.5, "D6", 1.0), (1.0, "C6", 0.9), (1.5, "A5", 0.85), (2.25, "F5", 0.8), (2.75, "A5", 0.85), (3.25, "D6", 0.9)],
    14: [(0.5, "G5", 0.85), (1.0, "Bb5", 0.9), (1.5, "D6", 1.0), (2.5, "C6", 0.9), (3.0, "Bb5", 0.8)],
    15: [(0.5, "E5", 0.8), (1.0, "G5", 0.85), (1.5, "C6", 1.0), (2.5, "Bb5", 0.9), (3.0, "G5", 0.8)],
    16: [(0.5, "F5", 0.85), (1.0, "A5", 0.9), (1.5, "C6", 1.0), (2.5, "A5", 0.85), (3.0, "G5", 0.8), (3.5, "F5", 0.75)],
    17: [(0.5, "D5", 0.8), (1.0, "F5", 0.85), (1.5, "A5", 0.9), (2.5, "C6", 0.95), (3.0, "A5", 0.8), (3.5, "F5", 0.7)],
    18: [(0.25, "Bb4", 0.75), (0.75, "D5", 0.8), (1.25, "F5", 0.9), (2.25, "A5", 0.85), (2.75, "F5", 0.75)],
    19: [(0.25, "C5", 0.8), (0.75, "E5", 0.8), (1.25, "G5", 0.9), (2.25, "Bb5", 0.85), (2.75, "G5", 0.75)],
    20: [(0.25, "A4", 0.75), (0.75, "C5", 0.8), (1.25, "E5", 0.85), (2.25, "G5", 0.8), (2.75, "E5", 0.75)],
    21: [(0.25, "D5", 0.8), (0.75, "F5", 0.85), (1.25, "A5", 0.9), (2.25, "C6", 0.9), (2.75, "A5", 0.8)],
    22: [(0.25, "G5", 0.85), (0.75, "Bb5", 0.9), (1.25, "D6", 0.95), (2.25, "C6", 0.9), (2.75, "Bb5", 0.8)],
    23: [(0.25, "E5", 0.8), (0.75, "G5", 0.85), (1.25, "Bb5", 0.9), (2.0, "C6", 0.9), (2.5, "D6", 0.9), (3.0, "C6", 0.8)],
    24: [(0.5, "C6", 0.85), (1.0, "A5", 0.8), (1.5, "F5", 0.8), (2.25, "G5", 0.8), (2.75, "F5", 0.75)],
    25: [(0.5, "D6", 0.9), (1.0, "C6", 0.85), (1.5, "A5", 0.8), (2.25, "F5", 0.75), (2.75, "A5", 0.8)],
    26: [(0.5, "F5", 0.8), (1.0, "G5", 0.8), (1.5, "A5", 0.85), (2.25, "Bb5", 0.85), (2.75, "C6", 0.9)],
}
for bar, events in melody_bars.items():
    if bar >= 26:
        continue
    start = bar * BAR
    for beat, note, amp in events:
        t = start + beat * BEAT
        if t >= 51.8:
            continue
        music.add(t, glock(note, 1.8, 0.052 * amp), 0.75, 0.25)
        music.add(t + 0.012, pluck(note, 1.1, 0.045 * amp, 0.9), 1.0, -0.26)
        if bar >= 16:
            music.add(t + 0.02, lead(note, 0.6, 0.018 * amp), 1.0, 0.0)

# add a marimba counterpoint for export/batch/eco
for bar in [10, 11, 12, 13, 14, 15, 16, 17, 24, 25]:
    start = bar * BAR
    for j, beat in enumerate([0.75, 1.75, 2.75, 3.25]):
        note = [CHORDS[bar][2], CHORDS[bar][3], CHORDS[bar][1], CHORDS[bar][2]][j]
        music.add(start + beat * BEAT, marimba(note, 0.8, 0.032), 1.0, 0.45 if j % 2 else -0.4)

# ----------------------------------------------------------------------------- finale
final_bar = 26 * BAR
# Hold a warm, open chord while the paper settles.
pL, pR = pad(["F3", "A3", "C4", "E4", "G4"], 4.6, 0.16)
music.add_stereo(52.0, pL, pR, 0.72)
music.add(52.0, e_piano("F2", 4.2, 0.14), 1.0, -0.2)
music.add(52.0, e_piano("F4", 4.2, 0.1), 1.0, 0.2)
music.add(52.0, glock("C6", 3.8, 0.08), 1.0, 0.35)
music.add(52.8, glock("A5", 3.3, 0.07), 1.0, -0.3)
music.add(53.4, glock("F5", 2.9, 0.06), 1.0, 0.15)
music.add(54.0, pluck("C5", 2.0, 0.05), 1.0, -0.2)
music.add(54.5, glock("D6", 1.7, 0.045), 1.0, 0.4)
music.add(55.0, glock("F6", 1.6, 0.055), 1.0, 0.2)
music.add(55.0, pluck("A5", 1.4, 0.03), 1.0, -0.2)
for i, n in enumerate(["F6", "C6", "A5", "F5"]):
    music.add(55.2 + i * 0.055, glock(n, 0.85, 0.018), 0.9, (i - 1.5) * 0.2)

# tiny intro-to-first-bar pickup arpeggio
for i, n in enumerate(["C5", "F5", "A5", "C6"]):
    music.add(5.7 + i * 0.075, pluck(n, 0.35, 0.03, 0.8), 1.0, (i - 1.5) * 0.25)

# ----------------------------------------------------------------------------- foley
def paper_flip(dur=0.42, amp=0.08, tilt=0.0) -> np.ndarray:
    n = sec(dur); t = np.arange(n) / SR
    nz = noise(n)
    sweep = fft_filter(nz, 900, 4500)
    envl = (np.sin(np.pi * np.minimum(1, t / dur)) ** 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t))
    return fade_edges(sweep * envl * amp, 0.01, 0.08)

def click_sfx(amp=0.13, pitch=1700) -> np.ndarray:
    n = sec(0.08); t = np.arange(n) / SR
    return fade_edges((np.sin(2 * np.pi * pitch * t) * 0.35 + fft_filter(noise(n), 800, 10000) * 0.7) * np.exp(-t * 110) * amp, 0.001, 0.01)

def pop_sfx(amp=0.12) -> np.ndarray:
    n = sec(0.14); t = np.arange(n) / SR
    f = 380 + 950 * np.exp(-t * 22)
    return fade_edges(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * amp, 0.001, 0.02)

def whoosh_sfx(dur=0.5, amp=0.09, rise=False) -> np.ndarray:
    n = sec(dur); t = np.arange(n) / SR
    nz = noise(n)
    lo = 400 + (3000 if rise else 0) * (t / dur)
    # create a broad band with a moving centre, approximate by crossfading filtered versions
    a = fft_filter(nz, 300, 2500)
    b = fft_filter(nz, 1400, 7000)
    x = t / dur
    sig = a * (1 - x) + b * x
    envl = np.sin(np.pi * np.minimum(1, t / dur)) ** 1.8
    return fade_edges(sig * envl * amp, 0.01, 0.06)

def stamp_sfx(amp=0.16) -> np.ndarray:
    n = sec(0.3); t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * 88 * t) * np.exp(-t * 28)
    splat = fft_filter(noise(n), 600, 5000) * np.exp(-t * 50) * 0.25
    return fade_edges((thud + splat) * amp, 0.001, 0.04)

def zipper_sfx(amp=0.12) -> np.ndarray:
    dur = 0.95; n = sec(dur)
    out = np.zeros(n)
    for i in range(28):
        pos = int((i / 28) ** 0.9 * (n - sec(0.04)))
        c = click_sfx(0.3, 1300 + i * 60)
        out[pos:pos + len(c)] += c[:len(out) - pos] * (0.45 + 0.35 * math.sin(i))
    return fade_edges(out * amp, 0.002, 0.04)

def page_rip(amp=0.1):
    n = sec(0.55); t = np.arange(n) / SR
    nz = fft_filter(noise(n), 1000, 8000)
    envl = np.exp(-t * 8) * (0.4 + 0.6 * np.maximum(0, np.sin(2 * np.pi * 2.5 * t)))
    return fade_edges(nz * envl * amp, 0.01, 0.1)

def riser(dur=1.2, amp=0.07):
    n = sec(dur); t = np.arange(n) / SR
    nz = noise(n)
    low = fft_filter(nz, 350, 2400)
    high = fft_filter(nz, 2000, 9000)
    x = t / dur
    sig = low * (1 - x) + high * x
    envl = np.sin(np.pi * np.minimum(1, t / dur)) ** 1.3
    return fade_edges(sig * envl * amp, 0.02, 0.03)

def sfx_at(name: str, t: float, sig: np.ndarray, amp: float = 1.0, pan: float = 0.0):
    sfx.add(t, sig, amp, pan)

# Intro foley
sfx_at("paper-open", CUES["intro_page"], paper_flip(0.7, 0.085), 1.0, -0.2)
sfx_at("soft-riser", CUES["intro_escape"], riser(1.0, 0.055), 1.0, 0.2)
sfx_at("cage-snap", CUES["intro_breakout"], pop_sfx(0.12), 1.0, -0.1)
for i in range(5):
    sfx_at("glass", CUES["intro_breakout"] + 0.04 + i * 0.045, click_sfx(0.04, 2400 + i * 330), 0.7, (i - 2) * 0.3)

# Typing / parsing
url_start = CUES["url_start"]; url_end = CUES["url_end"]
for i in range(34):
    t = url_start + (url_end - url_start) * (i / 34) + rng.uniform(-0.004, 0.004)
    sfx_at("type", t, click_sfx(0.035, 1700 + rng.uniform(-200, 250)), 0.45, rng.uniform(-0.25, 0.25))
sfx_at("parse-click", CUES["parse_click"], click_sfx(0.16, 900), 0.9, 0.2)
sfx_at("whoosh", CUES["loading"], whoosh_sfx(0.55, 0.07, True), 1.0, -0.1)
sfx_at("paper-turn", CUES["loading"] + 0.08, paper_flip(0.4, 0.05), 1.0, 0.15)
sfx_at("results-bell", CUES["results"], glock("F6", 1.8, 0.075), 1.0, 0.25)
sfx_at("results-bell2", CUES["results"] + 0.08, glock("C6", 1.8, 0.055), 1.0, -0.2)
for i in range(7):
    sfx_at("row", CUES["rows_start"] + i * 0.33, click_sfx(0.045, 2200 + i * 80), 0.5, 0.3 - i * 0.07)
    sfx_at("row-paper", CUES["rows_start"] + i * 0.33 + 0.01, paper_flip(0.12, 0.02), 0.4, -0.2 + i * 0.05)
sfx_at("stamp", CUES["done"], stamp_sfx(0.11), 0.8, 0.1)
sfx_at("formats", CUES["export_select"], glock("A5", 1.4, 0.045), 0.75, 0.2)
for i in range(5):
    sfx_at("format-pop", CUES["export_select"] + 0.06 + i * 0.055, pop_sfx(0.055), 0.7, (i - 2) * 0.25)
sfx_at("export-click", CUES["export_click"], click_sfx(0.16, 1050), 0.9, 0.2)
sfx_at("table-peel", CUES["table_peel"], paper_flip(0.55, 0.08), 0.9, -0.2)
sfx_at("files-fan", CUES["files_fan"], whoosh_sfx(0.55, 0.075, True), 1.0, 0.0)
sfx_at("excel-pop", CUES["excel"], pop_sfx(0.1), 1.0, -0.2)
sfx_at("json-pop", CUES["json"], pop_sfx(0.09), 1.0, 0.2)
sfx_at("format-sparkle", CUES["more_formats"], glock("D6", 1.2, 0.05), 0.8, 0.2)
for i in range(4):
    sfx_at("format-pop", CUES["more_formats"] + 0.08 + i * 0.12, pop_sfx(0.045), 0.6, (i - 1.5) * 0.28)
sfx_at("ready-stamp", CUES["export_stamp"], stamp_sfx(0.13), 0.7, 0.0)

# Batch
for i in range(3):
    sfx_at("card-pop", CUES["batch_cards"] + i * 0.52, pop_sfx(0.08), 0.8, (i - 1) * 0.25)
    sfx_at("check", CUES["batch_select"] + i * 0.15, glock("C6" if i % 2 == 0 else "F6", 0.8, 0.032), 0.7, (i - 1) * 0.2)
sfx_at("batch-click", CUES["batch_click"], click_sfx(0.15, 900), 0.9, 0.2)
sfx_at("batch-rise", CUES["batch_click"] + 0.04, riser(0.9, 0.045), 0.8, 0.0)
sfx_at("workbook", CUES["workbook"], paper_flip(0.5, 0.07), 0.8, -0.2)
sfx_at("workbook-tab", CUES["workbook"] + 0.16, click_sfx(0.055, 2000), 0.6, 0.2)
sfx_at("zip", CUES["zip"], zipper_sfx(0.1), 0.7, 0.1)
sfx_at("zip-end", CUES["zip"] + 0.88, stamp_sfx(0.08), 0.6, 0.1)

# CLI boot keyboard and output
sfx_at("terminal", CUES["cli_boot"], whoosh_sfx(0.35, 0.045, True), 0.7, 0.2)
for i in range(12):
    sfx_at("cli-type", CUES["cli_boot"] + i * 0.045, click_sfx(0.024, 900 + i * 35), 0.45, -0.1)
sfx_at("cli-hit", CUES["cli_prompt"], click_sfx(0.045, 600), 0.7, 0.2)
url2 = CUES["cli_url"]
for i in range(38):
    t = url2 + (2.0 * i / 38) + rng.uniform(-0.003, 0.003)
    sfx_at("cli-paste", t, click_sfx(0.018, 1200 + rng.uniform(-180, 250)), 0.28, 0.2)
sfx_at("detected", CUES["cli_fetch"] - 0.15, glock("F6", 1.1, 0.05), 0.8, 0.25)
sfx_at("fetching", CUES["cli_fetch"], whoosh_sfx(0.4, 0.035, True), 0.7, 0.1)
for i in range(5):
    sfx_at("detail", CUES["cli_details"] + i * 0.1, click_sfx(0.02, 1600 + i * 90), 0.4, -0.2 + i * 0.1)
sfx_at("menu", CUES["cli_menu"], paper_flip(0.22, 0.03), 0.7, 0.2)
for i in range(3):
    sfx_at("choose", CUES["cli_choose"] + i * 0.05, click_sfx(0.022, 1500 + i * 120), 0.5, 0.1)
sfx_at("cli-export", CUES["cli_export"], glock("A5", 1.2, 0.045), 0.8, 0.2)
for i, n in enumerate(["F5", "A5", "C6"]):
    sfx_at("success", CUES["cli_export"] + 0.1 + i * 0.12, glock(n, 1.0, 0.03), 0.65, (i - 1) * 0.25)
sfx_at("os", CUES["os"], glock("D6", 1.5, 0.04), 0.75, -0.1)
for i in range(3):
    sfx_at("os-chip", CUES["os"] + 0.12 + i * 0.08, pop_sfx(0.04), 0.6, (i - 1) * 0.3)

# Eco
for i in range(3):
    sfx_at("eco-card", CUES["eco_cards"] + i * 1.0, paper_flip(0.35, 0.055), 0.75, (i - 1) * 0.25)
    sfx_at("eco-check", CUES["eco_cards"] + i * 1.0 + 0.22, glock("C6" if i != 1 else "F6", 1.1, 0.028), 0.6, (i - 1) * 0.2)
sfx_at("api", CUES["api"], glock("A5", 1.3, 0.035), 0.7, 0.2)
sfx_at("migration", CUES["migration"], paper_flip(0.18, 0.028), 0.5, -0.2)
sfx_at("eco-rise", CUES["finale_logo"] - 0.6, riser(0.8, 0.04), 0.8, 0.1)

# Finale
sfx_at("logo-land", CUES["finale_logo"], stamp_sfx(0.1), 0.65, 0.0)
sfx_at("title-chime", CUES["finale_title"], glock("F6", 2.2, 0.045), 0.6, 0.2)
sfx_at("url-tick", CUES["finale_url"], click_sfx(0.035, 1800), 0.5, 0.1)
sfx_at("sparkle", CUES["finale_sparkle"], glock("C7", 2.4, 0.035), 0.5, 0.3)
for i in range(4):
    sfx_at("thanks-pop", 55.7 + i * 0.05, pop_sfx(0.03), 0.35, (i - 1.5) * 0.3)
sfx_at("paper-close", 55.8, paper_flip(0.3, 0.035), 0.4, 0.0)

# ----------------------------------------------------------------------------- mixing
# Gentle bus filtering and a shared room.
def apply_master_eq(x: np.ndarray) -> np.ndarray:
    return fft_filter(x, 32, 15500)

def reverb_pair(L: np.ndarray, R: np.ndarray, amount: float = 0.18) -> tuple[np.ndarray, np.ndarray]:
    dur = 1.5
    n = sec(dur)
    t = np.arange(n) / SR
    irL = rng.standard_normal(n) * np.exp(-t * 2.8) * 0.5
    irR = rng.standard_normal(n) * np.exp(-t * 2.8) * 0.5
    irL = fft_filter(irL, 160, 7000)
    irR = fft_filter(irR, 160, 7000)
    irL /= np.sqrt(np.sum(irL ** 2)) + 1e-9
    irR /= np.sqrt(np.sum(irR ** 2)) + 1e-9
    def conv(x, ir):
        size = len(x) + len(ir) - 1
        nfft = 1 << (size - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)]
        return y
    wetL = conv(L, irL) * amount
    wetR = conv(R, irR) * amount
    return wetL, wetR

wetL, wetR = reverb_pair(music.L, music.R, 0.19)
# room for foley, very short and quiet
fL, fR = reverb_pair(sfx.L, sfx.R, 0.08)

mixL = music.L * 0.8 + sfx.L * 3.0 + wetL * 0.85 + fL * 2.0
mixR = music.R * 0.8 + sfx.R * 3.0 + wetR * 0.85 + fR * 2.0
mixL = apply_master_eq(mixL)
mixR = apply_master_eq(mixR)

# Remove DC and apply a warm master stage.
mixL -= np.mean(mixL); mixR -= np.mean(mixR)
# Soft saturation tastefully catches peaks.
drive = 1.06
mixL = np.tanh(mixL * drive) / np.tanh(drive)
mixR = np.tanh(mixR * drive) / np.tanh(drive)
# Musical fades.
fi = sec(0.20); fo = sec(1.15)
for ch in (mixL, mixR):
    ch[:fi] *= np.linspace(0, 1, fi) ** 0.8
    ch[-fo:] *= np.linspace(1, 0, fo) ** 1.5
# Peak normalise to -1.1 dBFS.
peak = max(np.max(np.abs(mixL)), np.max(np.abs(mixR)), 1e-9)
gain = 0.878 / peak
mixL *= gain; mixR *= gain

audio_dir = ROOT / "public" / "audio"
audio_dir.mkdir(parents=True, exist_ok=True)

def write_wav(name: str, l: np.ndarray, r: np.ndarray, gain_value: float = 1.0):
    b = np.stack([np.clip(l * gain_value, -1, 1), np.clip(r * gain_value, -1, 1)], axis=1)
    with wave.open(str(audio_dir / name), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((b * 32767).astype(np.int16).tobytes())

write_wav("soundtrack.wav", mixL, mixR)
write_wav("music-only.wav", apply_master_eq(music.L + wetL), apply_master_eq(music.R + wetR), 0.8)
write_wav("sfx-only.wav", apply_master_eq(sfx.L + fL), apply_master_eq(sfx.R + fR), 2.2)

# Report stems / RMS for the QA notes.
for name, l, r in [("mix", mixL, mixR), ("music", music.L, music.R), ("sfx", sfx.L, sfx.R)]:
    rms = math.sqrt(float(np.mean(l ** 2 + r ** 2) / 2))
    print(f"{name:5s} rms={20*math.log10(max(rms, 1e-12)):6.1f} dBFS peak={20*math.log10(max(np.max(np.abs(l)), np.max(np.abs(r)), 1e-12)):6.1f} dBFS")
print("wrote", audio_dir / "soundtrack.wav")
