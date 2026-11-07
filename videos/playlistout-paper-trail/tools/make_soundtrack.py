#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Playlist Out — Paper Trail
Original score + sound design, 56 s at 120 BPM.

Everything in this file is synthesized from sine/triangle/saw/noise primitives.
No samples, no third-party recordings. The result is original music written for
this edit, with cue points locked to the picture at 30 fps.

Run:
    python tools/make_soundtrack.py
Outputs:
    public/audio/film-mix.wav
    qa/audio/music-only.wav
    qa/audio/sfx-only.wav
    qa/audio/score-raw.wav
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48_000
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
DUR = 56.0
N = int(round(SR * DUR))
FPS = 30

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio"
QA = ROOT / "qa" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)

rng = np.random.default_rng(20261107)

# ---------------------------------------------------------------------------
# utilities
# ---------------------------------------------------------------------------

def hz(midi: float) -> float:
    return 440.0 * (2.0 ** ((midi - 69.0) / 12.0))


def tt(duration: float) -> np.ndarray:
    return np.arange(max(1, int(round(duration * SR))), dtype=np.float64) / SR


def fade_edges(x: np.ndarray, attack: float = 0.004, release: float = 0.02) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64).copy()
    a = min(len(x), max(1, int(attack * SR)))
    r = min(len(x), max(1, int(release * SR)))
    x[:a] *= np.linspace(0, 1, a)
    if r:
        x[-r:] *= np.linspace(1, 0, r)
    return x


def lowpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    if cutoff >= SR * 0.49 or len(x) == 0:
        return x
    sos = butter(order, max(20.0, cutoff), btype="lowpass", fs=SR, output="sos")
    return sosfilt(sos, x)


def highpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    if cutoff <= 20 or len(x) == 0:
        return x
    sos = butter(order, min(SR * 0.48, cutoff), btype="highpass", fs=SR, output="sos")
    return sosfilt(sos, x)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    hi = min(hi, SR * 0.48)
    if hi <= lo:
        return x
    sos = butter(order, [lo, hi], btype="bandpass", fs=SR, output="sos")
    return sosfilt(sos, x)


def stereo(sig: np.ndarray, pan: float = 0.0, width: float = 0.0) -> np.ndarray:
    """Equal-power pan; width creates a tiny decorrelation for air."""
    sig = np.asarray(sig, dtype=np.float64)
    if sig.ndim == 2:
        return sig
    pan = float(np.clip(pan, -1.0, 1.0))
    theta = (pan + 1.0) * np.pi / 4.0
    left = sig * np.cos(theta)
    right = sig * np.sin(theta)
    if width:
        d = int(0.004 * SR)
        if d < len(sig):
            right[d:] += sig[:-d] * width
            left[: d] = 0
    return np.stack([left, right], axis=1)


class Bus:
    def __init__(self):
        self.data = np.zeros((N, 2), dtype=np.float64)

    def add(self, start: float, sig: np.ndarray, gain: float = 1.0, pan: float = 0.0, width: float = 0.0):
        if len(sig) == 0:
            return
        i = int(round(start * SR))
        if i >= N:
            return
        if i < 0:
            sig = sig[-i:]
            i = 0
        j = min(N, i + len(sig))
        s = stereo(sig[: j - i], pan, width)
        self.data[i:j] += s * gain


music = Bus()
drums = Bus()
bass_bus = Bus()
keys = Bus()
pad = Bus()
lead = Bus()
bells = Bus()
sfx = Bus()

# ---------------------------------------------------------------------------
# harmony / arrangement map
# ---------------------------------------------------------------------------

# Voicings are written around C3-C5 and transposed by the bass.
CHORDS = {
    "Fmaj9": [53, 57, 60, 64, 67],
    "Fmaj7": [53, 57, 60, 64],
    "Dm9": [50, 53, 57, 60, 64],
    "Dm7": [50, 53, 57, 60],
    "Bbmaj9": [46, 50, 53, 57, 60],
    "Bbmaj7": [46, 50, 53, 57],
    "C7sus": [48, 53, 55, 58],
    "C7": [48, 52, 55, 58],
    "C": [48, 52, 55, 60],
    "Am7": [45, 48, 52, 55],
    "Gm7": [43, 46, 50, 53],
    "F/A": [45, 53, 57, 60],
}

# 28 bars, 2 s each
PROG = [
    "Fmaj9", "Dm9", "Bbmaj9", "Fmaj7",
    "Dm7", "Bbmaj7", "C7sus", "Fmaj7",
    "Dm7", "Bbmaj7", "C7", "Am7",
    "Dm7", "Gm7", "Bbmaj7", "Am7",
    "Gm7", "C7", "Dm7", "Bbmaj7",
    "F/A", "C7", "Dm7", "Bbmaj7",
    "C", "Am7", "Bbmaj7", "Fmaj9",
]

ROOTS = {
    "Fmaj9": 41, "Fmaj7": 41, "Dm9": 38, "Dm7": 38,
    "Bbmaj9": 34, "Bbmaj7": 34, "C7sus": 36, "C7": 36,
    "C": 36, "Am7": 33, "Gm7": 31, "F/A": 41,
}

# ---------------------------------------------------------------------------
# instruments
# ---------------------------------------------------------------------------

def rhodes(midi: float, duration: float, vel: float = 0.7) -> np.ndarray:
    t = tt(duration)
    f = hz(midi)
    env = (1.0 - np.exp(-t * 220.0)) * np.exp(-t * 2.6)
    phase = 2 * np.pi * f * t
    fm = np.sin(phase * 2.0 + 0.25) * 0.55 * np.exp(-t * 5.0)
    body = np.sin(phase + fm) * 0.80
    body += np.sin(phase * 2.013) * 0.17 * np.exp(-t * 4.2)
    body += np.sin(phase * 3.98) * 0.065 * np.exp(-t * 6.5)
    body += np.sin(phase * 0.5) * 0.04
    return fade_edges(body * env * vel, 0.006, 0.04)


def toy_pluck(midi: float, duration: float, vel: float = 0.7) -> np.ndarray:
    t = tt(duration)
    f = hz(midi)
    env = (1.0 - np.exp(-t * 420.0)) * np.exp(-t * 7.5)
    s = np.sin(2 * np.pi * f * t) * 0.62
    s += np.sin(2 * np.pi * f * 2.01 * t) * 0.24 * np.exp(-t * 8)
    s += np.sin(2 * np.pi * f * 3.02 * t) * 0.09 * np.exp(-t * 11)
    s += np.sin(2 * np.pi * f * 4.07 * t) * 0.035 * np.exp(-t * 15)
    return fade_edges(s * env * vel, 0.003, 0.025)


def warm_lead(midi: float, duration: float, vel: float = 0.8) -> np.ndarray:
    t = tt(duration)
    f = hz(midi)
    env = (1.0 - np.exp(-t * 80.0)) * (0.7 + 0.3 * np.exp(-t * 1.2))
    vib = np.sin(2 * np.pi * 5.2 * t) * 0.0032
    phase = 2 * np.pi * f * (t + vib)
    s = np.sin(phase) * 0.55
    s += np.sin(phase * 2.0) * 0.20
    s += np.sin(phase * 3.0) * 0.08
    s += np.sin(phase * 4.01) * 0.035
    s = np.tanh(s * 1.25) * 0.75
    tail = np.exp(-t * 1.4)
    env2 = env * (0.55 + 0.45 * tail)
    return fade_edges(s * env2 * vel, 0.012, 0.08)


def chip_lead(midi: float, duration: float, vel: float = 0.55) -> np.ndarray:
    t = tt(duration)
    f = hz(midi)
    vib = np.sin(2 * np.pi * 5.8 * t) * 0.0022
    phase = 2 * np.pi * f * (t + vib)
    square = np.tanh(np.sin(phase) * 4.8) * 0.36
    tri = 2 / np.pi * np.arcsin(np.sin(phase)) * 0.36
    env = (1.0 - np.exp(-t * 260.0)) * np.exp(-t * 4.2)
    return fade_edges((square + tri) * env * vel, 0.004, 0.035)


def bell(midi: float, duration: float = 1.9, vel: float = 0.5) -> np.ndarray:
    t = tt(duration)
    f = hz(midi)
    mod = np.sin(2 * np.pi * f * 3.01 * t) * 2.1 * np.exp(-t * 3.0)
    s = np.sin(2 * np.pi * f * t + mod)
    s += np.sin(2 * np.pi * f * 2.005 * t) * 0.22 * np.exp(-t * 3.6)
    s += np.sin(2 * np.pi * f * 4.99 * t) * 0.08 * np.exp(-t * 6)
    env = (1.0 - np.exp(-t * 300.0)) * np.exp(-t * 1.9)
    return fade_edges(s * env * vel, 0.003, 0.08)


def pluck_bass(midi: float, duration: float, vel: float = 0.8) -> np.ndarray:
    t = tt(duration)
    f = hz(midi)
    env = (1.0 - np.exp(-t * 300.0)) * np.exp(-t * 4.0)
    s = np.sin(2 * np.pi * f * t) * 0.70
    s += np.sin(2 * np.pi * f * 2.0 * t) * 0.19
    s += np.sin(2 * np.pi * f * 3.0 * t) * 0.07
    s += (2 * ((f * t) % 1.0) - 1) * 0.12
    return fade_edges(s * env * vel, 0.005, 0.05)


def sub_bass(midi: float, duration: float, vel: float = 0.7) -> np.ndarray:
    t = tt(duration)
    f = hz(midi)
    env = (1.0 - np.exp(-t * 100.0)) * np.exp(-t * 2.0)
    s = np.sin(2 * np.pi * f * t) * 0.90 + np.sin(2 * np.pi * f * 2 * t) * 0.10
    return fade_edges(s * env * vel, 0.008, 0.08)


def pad_note(midi: float, duration: float, vel: float = 0.38) -> np.ndarray:
    t = tt(duration)
    f = hz(midi)
    phase = 2 * np.pi * f * t
    s = np.zeros_like(t)
    for detune, amp in [(-0.004, 0.4), (0.0, 0.5), (0.004, 0.4)]:
        s += (2 * (((f * (1 + detune)) * t) % 1) - 1) * amp / 3
    s = lowpass(s, 1150, 2)
    env = np.minimum(1.0, t / 0.55) * np.minimum(1.0, (duration - t) / 0.8)
    env = np.clip(env, 0, 1)
    return fade_edges(s * env * vel, 0.02, 0.1)


def kick(vel: float = 1.0) -> np.ndarray:
    t = tt(0.42)
    phase = 2 * np.pi * (46 * t + 135 * (1 - np.exp(-t * 28)) / 28)
    body = np.sin(phase) * np.exp(-t * 7.2)
    click = rng.normal(0, 1, len(t)) * np.exp(-t * 180) * 0.12
    top = np.sin(2 * np.pi * 1500 * t) * np.exp(-t * 60) * 0.035
    return fade_edges((body + click + top) * vel, 0.001, 0.04)


def snare(vel: float = 0.7) -> np.ndarray:
    t = tt(0.22)
    noise = bandpass(rng.normal(0, 1, len(t)), 1100, 7600)
    tone = np.sin(2 * np.pi * 176 * t) * np.exp(-t * 27) * 0.35
    env = np.exp(-t * 20)
    return fade_edges((noise * 0.42 + tone) * env * vel, 0.001, 0.03)


def clap(vel: float = 0.5) -> np.ndarray:
    t = tt(0.26)
    noise = bandpass(rng.normal(0, 1, len(t)), 900, 7000)
    flashes = np.zeros_like(t)
    for d in (0.006, 0.023, 0.043):
        flashes += np.exp(-((t - d) ** 2) / (2 * 0.008**2))
    return fade_edges(noise * (flashes * 0.22 + np.exp(-t * 14) * 0.1) * vel, 0.001, 0.03)


def hat(open_hat: bool = False, vel: float = 0.25) -> np.ndarray:
    d = 0.23 if open_hat else 0.07
    t = tt(d)
    n = highpass(rng.normal(0, 1, len(t)), 7200, 2)
    return fade_edges(n * np.exp(-t * (18 if open_hat else 68)) * vel, 0.001, 0.015)


def shaker(vel: float = 0.12) -> np.ndarray:
    t = tt(0.09)
    n = bandpass(rng.normal(0, 1, len(t)), 4500, 11000)
    env = np.minimum(1, t / 0.007) * np.exp(-t * 33)
    return fade_edges(n * env * vel, 0.001, 0.01)


def rim(vel: float = 0.16) -> np.ndarray:
    t = tt(0.07)
    n = bandpass(rng.normal(0, 1, len(t)), 1700, 5200)
    return fade_edges((n * 0.6 + np.sin(2 * np.pi * 1180 * t) * 0.3) * np.exp(-t * 70) * vel, 0.001, 0.01)


def woodblock(vel: float = 0.18, pitch: float = 880) -> np.ndarray:
    t = tt(0.09)
    s = np.sin(2 * np.pi * pitch * t) * np.exp(-t * 42)
    s += np.sin(2 * np.pi * pitch * 2.71 * t) * np.exp(-t * 60) * 0.18
    return fade_edges(s * vel, 0.001, 0.01)


def tambourine(vel: float = 0.15) -> np.ndarray:
    t = tt(0.15)
    n = highpass(rng.normal(0, 1, len(t)), 6000, 2)
    s = n * np.exp(-t * 34)
    for p, a in ((2840, 0.15), (4270, 0.11), (7460, 0.07)):
        s += np.sin(2 * np.pi * p * t) * np.exp(-t * 28) * a
    return fade_edges(s * vel, 0.001, 0.02)


def cymbal(duration: float = 2.0, vel: float = 0.16) -> np.ndarray:
    t = tt(duration)
    n = highpass(rng.normal(0, 1, len(t)), 4800, 2)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 1.7)
    return fade_edges(n * env * vel, 0.002, 0.1)


def reverse_cymbal(duration: float = 0.75, vel: float = 0.18) -> np.ndarray:
    t = tt(duration)
    n = highpass(rng.normal(0, 1, len(t)), 3800, 2)
    env = (t / duration) ** 2.6
    return fade_edges(n * env * vel, 0.001, 0.01)


# ---------------------------------------------------------------------------
# musical events
# ---------------------------------------------------------------------------

def section_gain(t: float) -> float:
    # a few deliberate silences / drops
    if 16.2 <= t < 18.5:
        return 0.55
    if 30.0 <= t < 30.4:
        return 0.4
    if 51.35 <= t < 51.9:
        return 0.22
    return 1.0

# Intro pads/chords
for bar in range(2):
    start = bar * BAR
    for note in CHORDS[PROG[bar]]:
        pad.add(start, pad_note(note, 2.35, 0.24), 0.55, pan=(note - 58) / 90, width=0.08)
    for k, note in enumerate(CHORDS[PROG[bar]]):
        keys.add(start + 0.06 + k * 0.05, rhodes(note, 1.6, 0.23), 0.6, pan=-0.22 + k * 0.06, width=0.03)

# A little welcome motif
for st, note, dur, vel in [
    (0.72, 72, 0.7, 0.18), (1.18, 69, 0.55, 0.16), (1.65, 65, 0.9, 0.18),
    (2.25, 67, 0.6, 0.16), (2.75, 69, 0.6, 0.17), (3.20, 72, 0.8, 0.19),
    (3.72, 69, 0.5, 0.15),
]:
    keys.add(st, toy_pluck(note, dur, vel), 0.7, pan=-0.12, width=0.04)

# escape / snap hit at 4.0
for note in CHORDS["Bbmaj9"]:
    pad.add(4.0, pad_note(note, 2.2, 0.2), 0.55, pan=(note - 58) / 90, width=0.08)
for k, note in enumerate([58, 62, 65, 69, 72]):
    bells.add(4.0 + k * 0.018, bell(note + 12, 1.5, 0.12), 0.55, pan=-0.4 + k * 0.2)

# Groove chords, bars 3-13
for bar in range(3, 14):
    start = bar * BAR
    chord = PROG[bar]
    gain = section_gain(start)
    for k, note in enumerate(CHORDS[chord]):
        pad.add(start, pad_note(note, 1.75, 0.15 * gain), 0.6, pan=(note - 58) / 90, width=0.08)
    if bar != 9:  # file scene has air
        for k, note in enumerate(CHORDS[chord]):
            keys.add(start + 0.02 + k * 0.015, rhodes(note, 1.25, 0.18 * gain), 0.52, pan=-0.22 + k * 0.06, width=0.03)
            keys.add(start + 1.02 + k * 0.012, rhodes(note, 0.9, 0.12 * gain), 0.38, pan=0.2 - k * 0.05, width=0.03)
    for b in (0.0, 1.5):
        for k, note in enumerate(CHORDS[chord][1:4]):
            keys.add(start + b + 0.05 + k * 0.012, toy_pluck(note + 12, 0.22, 0.075 * gain), 0.45, pan=0.32, width=0.02)

# Intro/atmosphere pad and room
pad.add(0.0, pad_note(41, 4.2, 0.16), 0.45, pan=-0.1, width=0.12)


def add_lead_event(start: float, midi: int, dur: float, vel: float, timbre: str = "warm"):
    if timbre == "warm":
        sig = warm_lead(midi, dur, vel)
        lead.add(start, sig, 0.8, pan=-0.1, width=0.04)
    elif timbre == "toy":
        sig = toy_pluck(midi, dur, vel)
        lead.add(start, sig, 0.7, pan=0.18, width=0.03)
    elif timbre == "chip":
        sig = chip_lead(midi, dur, vel)
        lead.add(start, sig, 0.62, pan=0.12, width=0.03)
    elif timbre == "bell":
        bells.add(start, bell(midi, 1.8, vel), 0.6, pan=0.26, width=0.06)

# Main earworm motif (all original)
MOTIF = [
    (6.00, 69, 0.40, 0.42, "warm"), (6.50, 72, 0.38, 0.38, "warm"),
    (7.00, 77, 0.38, 0.42, "warm"), (7.25, 76, 0.18, 0.3, "warm"),
    (7.50, 74, 0.36, 0.36, "warm"), (7.75, 72, 0.18, 0.3, "warm"),
    (8.00, 69, 0.38, 0.4, "warm"), (8.50, 72, 0.36, 0.36, "warm"),
    (9.00, 74, 0.38, 0.4, "warm"), (9.25, 72, 0.18, 0.29, "warm"),
    (9.50, 69, 0.36, 0.34, "warm"), (9.75, 67, 0.2, 0.28, "warm"),
    (10.00, 65, 0.4, 0.38, "warm"), (10.50, 69, 0.38, 0.35, "warm"),
    (11.00, 72, 0.38, 0.39, "warm"), (11.25, 77, 0.18, 0.28, "warm"),
    (11.50, 76, 0.36, 0.35, "warm"), (11.75, 74, 0.2, 0.29, "warm"),
    (12.00, 72, 0.38, 0.37, "warm"), (12.50, 74, 0.34, 0.33, "warm"),
    (13.00, 77, 0.38, 0.41, "warm"), (13.25, 76, 0.18, 0.3, "warm"),
    (13.50, 72, 0.34, 0.34, "warm"), (13.75, 69, 0.22, 0.3, "warm"),
    (14.00, 67, 0.4, 0.36, "warm"), (14.50, 69, 0.36, 0.34, "warm"),
    (15.00, 72, 0.38, 0.38, "warm"), (15.50, 74, 0.34, 0.37, "warm"),
]
for ev in MOTIF:
    add_lead_event(*ev[:5])

# File scene: glassy arpeggio / bells instead of full melody
for i, note in enumerate([77, 76, 74, 72, 69, 72, 77, 76, 74, 72, 69, 67, 65, 69, 72, 74, 77, 76, 72, 69, 67, 65, 64, 65]):
    t0 = 16.0 + i * 0.25
    if 18.4 <= t0 < 19.25:
        t0 += 0.0
    add_lead_event(t0, note + 12, 0.26, 0.17, "bell" if i % 2 == 0 else "toy")

# bar 12-13 lift and batch entry
for i, (t0, note) in enumerate([
    (18.5, 72), (18.75, 74), (19.0, 77), (19.25, 76),
    (20.0, 74), (20.5, 72), (21.0, 69), (21.5, 67),
    (22.0, 69), (22.5, 72), (23.0, 74), (23.5, 77),
    (24.0, 76), (24.5, 74), (25.0, 72), (25.5, 69),
]):
    add_lead_event(t0, note, 0.4, 0.24, "toy")

# Batch: bright bell hook, doubled
for i, (t0, note) in enumerate([
    (26.0, 77), (26.5, 81), (27.0, 84), (27.5, 81), (28.0, 77), (28.5, 74),
    (29.0, 72), (29.5, 74), (30.0, 77), (30.5, 81), (31.0, 84), (31.5, 81),
    (32.0, 79), (32.5, 77), (33.0, 74), (33.5, 72), (34.0, 74), (34.5, 77),
    (35.0, 81), (35.5, 77),
]):
    add_lead_event(t0, note, 0.42, 0.26, "bell")
    if i % 4 in (1, 3):
        add_lead_event(t0, note - 12, 0.46, 0.15, "chip")

# CLI: sparse chip / bell conversation
for t0, note in [
    (36.0, 74), (37.0, 77), (38.0, 69), (39.0, 72), (40.0, 74),
    (41.0, 77), (42.0, 76), (43.0, 74), (44.0, 72), (45.0, 69),
]:
    add_lead_event(t0, note, 0.25, 0.18, "chip")
    if t0 in (37.0, 41.0, 44.0):
        add_lead_event(t0 + 0.12, note + 12, 0.35, 0.1, "bell")

# Final ecosystem reprise
for t0, note, dur, vel in [
    (46.0, 77, 0.5, 0.33), (46.5, 81, 0.45, 0.3), (47.0, 84, 0.5, 0.34),
    (47.5, 81, 0.35, 0.27), (48.0, 79, 0.45, 0.3), (48.5, 77, 0.42, 0.29),
    (49.0, 76, 0.42, 0.26), (49.5, 74, 0.4, 0.25), (50.0, 72, 0.5, 0.24),
    (50.5, 74, 0.4, 0.25), (51.0, 77, 0.5, 0.28),
]:
    add_lead_event(t0, note, dur, vel, "warm")
    if t0 in (46.5, 47.5, 48.5, 49.5, 50.5):
        add_lead_event(t0, note + 12, 0.3, 0.12, "bell")

# Final cadence
for t0, note, vel in [
    (52.0, 77, 0.2), (52.0, 81, 0.18), (52.5, 79, 0.15),
    (53.0, 84, 0.16), (53.0, 81, 0.13), (53.5, 79, 0.13),
    (54.0, 84, 0.3), (54.0, 89, 0.16), (54.0, 77, 0.13),
    (55.0, 81, 0.12),
]:
    add_lead_event(t0, note, 1.0, vel, "bell")


# Harmony beds for the second half: batch, CLI, ecosystem, final cover.
for bar in range(14, 27):
    start = bar * BAR
    chord = PROG[bar]
    if 14 <= bar <= 17:
        pad_gain, rhodes_gain, pluck_gain = 0.18, 0.19, 0.095
        stab_times = (0.0, 1.5, 2.75)
    elif 18 <= bar <= 22:
        pad_gain, rhodes_gain, pluck_gain = 0.10, 0.115, 0.07
        stab_times = (0.0, 2.0)
    else:
        pad_gain, rhodes_gain, pluck_gain = 0.18, 0.2, 0.09
        stab_times = (0.0, 1.5, 2.75)
    for note in CHORDS[chord]:
        pad.add(start, pad_note(note, 2.1, pad_gain), 0.62, pan=(note - 58) / 90, width=0.08)
        pad.add(start + 2.0, pad_note(note, 0.45, pad_gain * 0.5), 0.4, pan=(note - 58) / 90, width=0.05)
    for stab in stab_times:
        for k, note in enumerate(CHORDS[chord]):
            keys.add(start + stab + k * 0.012, rhodes(note, 0.85 if bar < 23 else 1.2, rhodes_gain), 0.5, pan=-0.22 + k * 0.06, width=0.03)
    for off in (0.5, 2.25):
        for k, note in enumerate(CHORDS[chord][2:5]):
            keys.add(start + off + k * 0.012, toy_pluck(note + 12, 0.24, pluck_gain), 0.5, pan=0.31, width=0.02)

# Final cadence: a real warm landing on Fmaj9.
for note in [41, 53, 57, 60, 64, 67, 72, 77]:
    pad.add(54.0, pad_note(note, 2.15, 0.28), 0.65, pan=(note - 58) / 90, width=0.10)
for k, note in enumerate([53, 60, 64, 67, 72, 77]):
    keys.add(54.0 + k * 0.032, rhodes(note, 1.65, 0.24), 0.55, pan=-0.3 + k * 0.1, width=0.04)
bells.add(54.0, bell(89, 2.0, 0.18), 0.55, pan=0.2)
bells.add(54.0, bell(96, 1.8, 0.08), 0.45, pan=-0.2)
drums.add(54.0, kick(0.58), 0.5)
drums.add(54.0, cymbal(2.0, 0.09), 0.6, pan=0.1)

# ---------------------------------------------------------------------------
# bass
# ---------------------------------------------------------------------------

def add_bass(t0: float, midi: int, dur: float, gain: float = 0.8):
    bass_bus.add(t0, pluck_bass(midi, dur, 0.8), gain, pan=0.0)
    bass_bus.add(t0, sub_bass(midi - 12, min(dur + 0.05, 0.5), 0.5), gain * 0.75, pan=0.0)

# Intro bass enters at 4.0
for t0, note, dur in [(4.0, 34, 0.5), (4.75, 41, 0.22), (5.5, 46, 0.35), (5.9, 41, 0.3)]:
    add_bass(t0, note, dur, 0.55)

BASS_PATTERN = [
    (0.00, 0, 0.42, 1.0),
    (0.75, 0, 0.22, 0.55),
    (1.50, 7, 0.32, 0.8),
    (2.00, 0, 0.42, 0.9),
    (2.75, 12, 0.22, 0.5),
    (3.25, 7, 0.3, 0.65),
]
for bar in range(3, 13):
    root = ROOTS[PROG[bar]]
    start = bar * BAR
    for off, interval, dur, vel in BASS_PATTERN:
        add_bass(start + off, root + interval, dur, 0.68 * vel * section_gain(start + off))

# File scene: sparse, round bass
for bar in [9, 10]:
    root = ROOTS[PROG[bar]]
    for off, interval in [(0.0, 0), (1.5, 7), (2.5, 0), (3.5, 12)]:
        add_bass(bar * BAR + off, root + interval, 0.6, 0.5)

# Batch groove
for bar in range(14, 18):
    root = ROOTS[PROG[bar]]
    start = bar * BAR
    for off, interval, dur, vel in BASS_PATTERN:
        add_bass(start + off, root + interval, dur, 0.78 * vel)
    add_bass(start + 1.0, root + 12, 0.15, 0.2)

# CLI tech bass, pushing 16ths
for bar in range(18, 23):
    root = ROOTS[PROG[bar]]
    start = bar * BAR
    for k in range(8):
        off = k * 0.25
        interval = [0, 0, 12, 7, 0, 12, 7, 0][k]
        add_bass(start + off, root + interval, 0.2, 0.5 if k % 2 else 0.68)
    add_bass(start + 1.5, root + 7, 0.35, 0.55)

# Eco + final bass
for bar in range(23, 26):
    root = ROOTS[PROG[bar]]
    start = bar * BAR
    for off, interval, dur, vel in BASS_PATTERN:
        add_bass(start + off, root + interval, dur, 0.72 * vel)

# final low F
bass_bus.add(54.0, sub_bass(29, 2.0, 0.8), 0.8)
bass_bus.add(54.0, pluck_bass(41, 1.8, 0.7), 0.5)

# ---------------------------------------------------------------------------
# drums
# ---------------------------------------------------------------------------

def add_kick(t0, vel=1.0):
    drums.add(t0, kick(vel), 0.92, pan=0.0)

def add_snare(t0, vel=0.7):
    drums.add(t0, snare(vel), 0.7, pan=-0.03)
    if vel > 0.5:
        drums.add(t0 + 0.003, clap(vel * 0.6), 0.6, pan=0.08)

def add_hats(bar_start, energy=1.0, sixteenth=False):
    for k in range(8):
        t0 = bar_start + k * 0.25
        swing = 0.010 if k % 2 else 0.0
        drums.add(t0 + swing, hat(open_hat=(k == 7), vel=0.15 * energy * (1.0 if k % 2 == 0 else 0.65)), 0.5, pan=0.2)
        if sixteenth:
            drums.add(t0 + 0.125 + swing * 0.5, shaker(0.075 * energy), 0.45, pan=-0.2)
    for k in range(4):
        drums.add(bar_start + k * 0.5 + 0.25, tambourine(0.045 * energy), 0.4, pan=0.33)

def add_fill(start: float, end: float, energy=0.5):
    length = end - start
    steps = max(2, int(length / 0.0625))
    for i in range(steps):
        t0 = start + i * length / steps
        v = energy * (0.12 + 0.3 * i / steps)
        drums.add(t0, snare(v), 0.55, pan=-0.15)
        if i % 2 == 0:
            drums.add(t0, hat(False, 0.08), 0.5, pan=0.2)

# Intro beat from 4.0
for bar in [3]:
    start = bar * BAR
    add_kick(start, 0.72)
    add_kick(start + 1.5, 0.7)
    add_snare(start + 1.0, 0.36)
    add_snare(start + 3.0, 0.42)
    add_hats(start, 0.65)
    drums.add(start + 1.75, rim(0.12), 0.6, pan=-0.2)

# main groove 6-16
for bar in range(4, 8):
    start = bar * BAR
    add_kick(start, 0.9)
    add_kick(start + 1.5, 0.8)
    add_kick(start + 2.75, 0.7)
    add_snare(start + 1.0, 0.63)
    add_snare(start + 3.0, 0.68)
    drums.add(start + 2.25, snare(0.15), 0.55, pan=-0.1)
    add_hats(start, 1.0, sixteenth=True)
    drums.add(start + 3.75, open_hat if False else hat(True, 0.18), 0.5, pan=0.28)
    drums.add(start + 0.5, woodblock(0.08, 900), 0.5, pan=0.2)

# file scene lighter drums 16-19
for bar in [8]:
    start = bar * BAR
    add_kick(start, 0.8)
    add_kick(start + 1.5, 0.6)
    add_snare(start + 1.0, 0.24)
    add_snare(start + 3.0, 0.28)
    for k in range(4):
        drums.add(start + k * 0.5, shaker(0.1), 0.5, pan=0.2)

# 18-24 build and groove
for bar in range(9, 12):
    start = bar * BAR
    add_kick(start, 0.9)
    add_kick(start + 1.5, 0.8)
    add_kick(start + 2.75, 0.72)
    add_snare(start + 1.0, 0.62)
    add_snare(start + 3.0, 0.66)
    add_hats(start, 0.95, sixteenth=True)
    drums.add(start + 0.5, woodblock(0.08, 920), 0.45, pan=0.2)

for bar in [12, 13]:
    start = bar * BAR
    add_kick(start, 0.9)
    add_kick(start + 1.5, 0.8)
    add_snare(start + 1.0, 0.65)
    add_snare(start + 3.0, 0.7)
    add_hats(start, 1.0, sixteenth=True)
    add_fill(start + 3.0, start + 4.0, 0.7) if bar == 13 else None

# batch 26-36
for bar in range(14, 18):
    start = bar * BAR
    add_kick(start, 0.95)
    add_kick(start + 1.5, 0.82)
    add_kick(start + 2.75, 0.76)
    add_snare(start + 1.0, 0.7)
    add_snare(start + 3.0, 0.72)
    add_hats(start, 1.05, sixteenth=True)
    drums.add(start + 3.75, hat(True, 0.2), 0.5, pan=0.3)
    if bar in (14, 16):
        add_fill(start + 1.5, start + 2.5, 0.35)

# CLI 36-46
for bar in range(18, 23):
    start = bar * BAR
    add_kick(start, 0.82)
    add_kick(start + 1.0, 0.5)
    add_kick(start + 2.5, 0.6)
    add_snare(start + 1.0, 0.52)
    add_snare(start + 3.0, 0.58)
    add_hats(start, 0.78, sixteenth=True)
    for k in range(4):
        drums.add(start + k * 0.5 + 0.25, rim(0.09), 0.5, pan=-0.12)

add_fill(44.0, 45.0, 0.55)
add_fill(25.0, 25.75, 0.5)
add_fill(35.0, 35.5, 0.55)

# eco 46-52
for bar in range(23, 26):
    start = bar * BAR
    add_kick(start, 0.9)
    add_kick(start + 1.5, 0.8)
    add_kick(start + 2.75, 0.7)
    add_snare(start + 1.0, 0.65)
    add_snare(start + 3.0, 0.7)
    add_hats(start, 1.0, sixteenth=True)
    drums.add(start + 3.5, tambourine(0.16), 0.55, pan=0.32)

# cymbal sfx and finale
drums.add(3.94, reverse_cymbal(0.9, 0.17), 0.7, pan=0.1)
drums.add(4.0, cymbal(1.2, 0.1), 0.65, pan=0.2)
drums.add(15.95, reverse_cymbal(0.55, 0.12), 0.65, pan=0.1)
drums.add(51.35, reverse_cymbal(1.25, 0.22), 0.75, pan=0.1)
drums.add(52.0, cymbal(2.4, 0.12), 0.7, pan=0.25)
drums.add(54.0, cymbal(1.9, 0.1), 0.65, pan=-0.2)


# Deliberate breaths in the arrangement.
def duck_span(bus: Bus, start: float, end: float, floor: float = 0.0, fade: float = 0.12):
    i = int(start * SR)
    j = min(N, int(end * SR))
    if j <= i:
        return
    f = int(fade * SR)
    env = np.ones(j - i)
    if f > 0:
        env[:f] = np.linspace(1, floor, f)
        env[-f:] = np.linspace(floor, 1, f)
    else:
        env[:] = floor
    bus.data[i:j] *= env[:, None]

# A breath when the song list turns into paper files.
duck_span(drums, 16.25, 17.35, 0.16, 0.1)
# The terminal takes over from the batch paperwork.
duck_span(drums, 35.55, 36.0, 0.25, 0.08)
# The notebook cover closes: drums leave, final chord rings.
duck_span(drums, 51.36, 53.98, 0.0, 0.06)

# ---------------------------------------------------------------------------
# sound design
# ---------------------------------------------------------------------------

def paper_rustle(duration=0.35, vel=0.16):
    t = tt(duration)
    n = bandpass(rng.normal(0, 1, len(t)), 1400, 8000)
    env = np.minimum(1, t / 0.012) * np.exp(-t * 9)
    return fade_edges(n * env * vel, 0.001, 0.03)

def paper_slide(duration=0.38, vel=0.18):
    t = tt(duration)
    sweep = 900 + 2600 * (t / duration)
    n = bandpass(rng.normal(0, 1, len(t)), 1200, 8500)
    # crude moving presence from short overlapping bursts
    env = np.minimum(1, t / 0.01) * np.exp(-t * 6.5)
    return fade_edges(n * env * vel, 0.001, 0.05)

def paper_flip(duration=0.28, vel=0.2):
    t = tt(duration)
    n = highpass(rng.normal(0, 1, len(t)), 1800)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 17)
    thump = np.sin(2 * np.pi * 105 * t) * np.exp(-t * 28) * 0.26
    return fade_edges((n * 0.42 + thump) * vel, 0.001, 0.03)

def click(vel=0.22):
    t = tt(0.035)
    n = highpass(rng.normal(0, 1, len(t)), 1800)
    s = np.sin(2 * np.pi * 1900 * t) * 0.2 + n * 0.35
    return fade_edges(s * np.exp(-t * 90) * vel, 0.0005, 0.005)

def key_tick(vel=0.12):
    t = tt(0.028)
    n = bandpass(rng.normal(0, 1, len(t)), 1800, 6200)
    s = n * 0.6 + np.sin(2 * np.pi * 2400 * t) * 0.12
    return fade_edges(s * np.exp(-t * 120) * vel, 0.0005, 0.004)

def pop(f0=650, duration=0.16, vel=0.22):
    t = tt(duration)
    phase = 2 * np.pi * (f0 * t + 400 * (1 - np.exp(-t * 22)) / 22)
    return fade_edges(np.sin(phase) * np.exp(-t * 19) * vel, 0.001, 0.02)

def stamp(vel=0.36):
    t = tt(0.32)
    n = lowpass(rng.normal(0, 1, len(t)), 900)
    body = np.sin(2 * np.pi * 72 * t) * np.exp(-t * 17) * 0.75
    slap = n * np.exp(-t * 50) * 0.26
    return fade_edges((body + slap) * vel, 0.001, 0.03)

def chime(root=84, vel=0.2):
    sig = bell(root, 1.6, vel)
    sig[: int(0.64 * SR)] += bell(root + 7, 1.2, vel * 0.55)[: int(0.64 * SR)] * 0.35
    return sig

def success_chime(vel=0.22):
    out = np.zeros(int(2.2 * SR))
    for i, note in enumerate([84, 88, 91]):
        b = bell(note, 1.4, vel * (0.8 - i * 0.1))
        i0 = int(i * 0.09 * SR)
        out[i0 : i0 + len(b)] += b
    return fade_edges(out, 0.002, 0.2)

def whoosh(duration=0.6, vel=0.2, rising=False):
    t = tt(duration)
    progress = t / duration
    n = rng.normal(0, 1, len(t))
    # sweeping resonant noise via time-warped lowpass-ish manipulation
    mod = 0.35 + 0.5 * (progress if rising else 1 - progress)
    n = n * (0.5 + 0.5 * np.sin(2 * np.pi * (1.5 + 2.5 * progress) * t))
    env = np.sin(np.pi * np.clip(progress, 0, 1)) ** 1.4
    return fade_edges(highpass(n, 300) * mod * env * vel, 0.002, 0.08)

def tape_peel(duration=0.3, vel=0.16):
    t = tt(duration)
    n = bandpass(rng.normal(0, 1, len(t)), 1500, 9500)
    env = np.zeros_like(t)
    for k in range(8):
        c = 0.015 + k * 0.03
        env += np.exp(-((t - c) ** 2) / (2 * 0.006**2)) * (0.5 + 0.5 * np.sin(k * 2.1))
    return fade_edges(n * env * vel, 0.001, 0.02)

def zip_sound(vel=0.22):
    out = np.zeros(int(0.7 * SR))
    for k in range(18):
        c = int((0.05 + k * 0.031) * SR)
        s = click(vel * (0.6 + 0.4 * rng.random()))
        out[c : c + len(s)] += s[: len(out) - c]
    out += lowpass(rng.normal(0, 1, len(out)), 1000) * np.exp(-np.arange(len(out)) / SR * 2) * 0.02
    return fade_edges(out, 0.001, 0.03)

def riser(duration=0.7, vel=0.2):
    t = tt(duration)
    phase = 2 * np.pi * (170 * t + 500 * (t / duration) ** 2)
    tone = np.sin(phase) * 0.25
    noise = highpass(rng.normal(0, 1, len(t)), 900) * 0.45
    env = (t / duration) ** 2
    return fade_edges((tone + noise) * env * vel, 0.001, 0.03)

def paper_crumple(duration=0.4, vel=0.16):
    t = tt(duration)
    n = bandpass(rng.normal(0, 1, len(t)), 1200, 9000)
    env = np.minimum(1, t / 0.01) * np.exp(-t * 12)
    return fade_edges(n * env * vel, 0.001, 0.04)

# SFX cue map: seconds are locked to shot frames
SFX_CUES = [
    ("paper", 0.10, dict(vel=0.06)),
    ("paper", 1.1, dict(vel=0.05)),
    ("tape", 3.56, dict(vel=0.2)),
    ("pop", 4.02, dict(f0=510, vel=0.2)),
    ("whoosh", 4.95, dict(duration=0.8, vel=0.22, rising=True)),
    ("stamp", 5.42, dict(vel=0.25)),
    ("paper", 6.02, dict(vel=0.07)),
    ("whoosh", 9.02, dict(duration=0.55, vel=0.15)),
    ("paper", 9.2, dict(vel=0.08)),
    ("click", 8.50, dict(vel=0.22)),
    ("paper", 15.96, dict(vel=0.09)),
    ("click", 14.90, dict(vel=0.18)),
    ("click", 15.90, dict(vel=0.24)),
    ("success", 16.06, dict(vel=0.15)),
    ("whoosh", 16.30, dict(duration=0.85, vel=0.26, rising=True)),
    ("paper", 17.35, dict(vel=0.16)),
    ("paper", 18.40, dict(vel=0.14)),
    ("pop", 18.44, dict(f0=980, vel=0.14)),
    ("paper", 19.30, dict(vel=0.11)),
    ("paper", 20.55, dict(vel=0.1)),
    ("paper", 22.1, dict(vel=0.09)),
    ("paper", 24.30, dict(vel=0.14)),
    ("whoosh", 25.30, dict(duration=0.65, vel=0.2)),
    ("paper", 25.45, dict(vel=0.12)),
    ("paper", 26.0, dict(vel=0.1)),
    ("click", 36.55, dict(vel=0.12)),
    ("click", 39.63, dict(vel=0.12)),
    ("click", 41.56, dict(vel=0.1)),
    ("click", 28.08, dict(vel=0.2)),
    ("success", 29.98, dict(vel=0.14)),
    ("pop", 30.05, dict(f0=760, vel=0.13)),
    ("zip", 31.42, dict(vel=0.16)),
    ("pack", 33.12, dict(vel=0.22)),
    ("riser", 35.1, dict(duration=0.8, vel=0.15)),
    ("whoosh", 35.5, dict(duration=0.55, vel=0.16)),
    ("click", 36.0, dict(vel=0.14)),
    ("success", 43.9, dict(vel=0.16)),
    ("paper", 43.04, dict(vel=0.1)),
    ("pop", 43.67, dict(f0=700, vel=0.06)),
    ("pop", 43.78, dict(f0=860, vel=0.055)),
    ("pop", 43.89, dict(f0=1020, vel=0.05)),
    ("whoosh", 45.5, dict(duration=0.8, vel=0.18)),
    ("pop", 46.2, dict(f0=620, vel=0.12)),
    ("pop", 46.35, dict(f0=790, vel=0.1)),
    ("pop", 46.5, dict(f0=960, vel=0.08)),
    ("stamp", 48.08, dict(vel=0.1)),
    ("stamp", 48.25, dict(vel=0.09)),
    ("stamp", 48.42, dict(vel=0.08)),
    ("riser", 51.2, dict(duration=1.0, vel=0.2)),
    ("whoosh", 51.35, dict(duration=1.0, vel=0.2)),
    ("stamp", 52.02, dict(vel=0.13)),
    ("success", 53.98, dict(vel=0.17)),
]

for kind, t0, kwargs in SFX_CUES:
    if kind == "paper":
        sig = paper_rustle(0.35, kwargs.get("vel", 0.16))
        sfx.add(t0, sig, 0.8, pan=0.15)
    elif kind == "whoosh":
        sig = whoosh(kwargs.get("duration", 0.6), kwargs.get("vel", 0.2), kwargs.get("rising", False))
        sfx.add(t0, sig, 0.9, pan=-0.05, width=0.05)
    elif kind == "tape":
        sfx.add(t0, tape_peel(0.34, kwargs.get("vel", 0.16)), 0.9, pan=-0.1)
    elif kind == "stamp":
        sfx.add(t0, stamp(kwargs.get("vel", 0.3)), 0.9, pan=0.0)
    elif kind == "click":
        sfx.add(t0, click(kwargs.get("vel", 0.2)), 0.9, pan=0.1)
    elif kind == "pop":
        sfx.add(t0, pop(kwargs.get("f0", 650), 0.18, kwargs.get("vel", 0.2)), 0.9, pan=-0.1)
    elif kind == "success":
        sfx.add(t0, success_chime(kwargs.get("vel", 0.2)), 0.85, pan=0.1)
    elif kind == "zip":
        sfx.add(t0, zip_sound(kwargs.get("vel", 0.2)), 0.9, pan=0.2)
    elif kind == "pack":
        sfx.add(t0, paper_crumple(0.4, kwargs.get("vel", 0.16)), 0.9, pan=0.0)
        sfx.add(t0 + 0.02, stamp(kwargs.get("vel", 0.2) * 0.7), 0.7, pan=0.0)
    elif kind == "riser":
        sfx.add(t0, riser(kwargs.get("duration", 0.7), kwargs.get("vel", 0.2)), 0.9, pan=0.0)

# typed UI / keyboard cadence
for t0 in np.arange(7.30, 8.22, 0.058):
    sfx.add(float(t0), key_tick(0.08 + 0.025 * rng.random()), 0.7, pan=-0.05)
for t0 in np.arange(35.96, 36.42, 0.062):
    sfx.add(float(t0), key_tick(0.12), 0.8, pan=-0.05)
for t0 in np.arange(39.0, 39.52, 0.062):
    sfx.add(float(t0), key_tick(0.1), 0.8, pan=-0.05)
for t0 in np.arange(41.2, 41.6, 0.1):
    sfx.add(float(t0), key_tick(0.09), 0.75, pan=-0.05)
for t0 in np.arange(28.55, 29.95, 0.13):
    sfx.add(float(t0), key_tick(0.055), 0.6, pan=0.16)

# Tiny row ticks as the table fills
for i, t0 in enumerate([10.05, 10.18, 10.31, 10.44, 10.57, 10.70]):
    sfx.add(t0, key_tick(0.07), 0.55, pan=-0.18 + 0.07 * i)

# ---------------------------------------------------------------------------
# vinyl texture (low-level, only intro and finale)
# ---------------------------------------------------------------------------
def vinyl_bed():
    out = np.zeros(N)
    count = int(DUR * 22)
    idx = rng.integers(0, N, count)
    amp = rng.normal(0, 1, count) * 0.03
    for i, a in zip(idx, amp):
        out[i] += a
    out = bandpass(out, 1800, 9000)
    env = np.zeros(N)
    env[: int(10 * SR)] = 1
    env[int(51.4 * SR) : int(55.5 * SR)] = 0.7
    return highpass(out * env, 900) * 0.22

vinyl = vinyl_bed()
music.add(0, vinyl, 0.8, pan=0.0, width=0.05)

# apply section strips/gain and a couple of automation curves
# SFX fade out with the picture
sfx.data[int(55.55 * SR) :] *= np.linspace(1, 0, N - int(55.55 * SR))[:, None]

# ---------------------------------------------------------------------------
# sidechain / mix
# ---------------------------------------------------------------------------

def sidechain_gain(times, depth=0.32, release=0.18):
    gain = np.ones(N)
    for t0 in times:
        i = int(t0 * SR)
        if i >= N:
            continue
        n = int(release * SR * 4)
        if i + n > N:
            n = N - i
        local = np.arange(n) / SR
        g = 1 - depth * np.exp(-local / release)
        gain[i : i + n] = np.minimum(gain[i : i + n], g)
    return gain

kick_times = []
for bar in list(range(3, 8)) + list(range(9, 12)) + list(range(12, 14)) + list(range(14, 18)) + list(range(18, 23)) + list(range(23, 26)):
    start = bar * BAR
    for off in (0.0, 1.5, 2.75):
        kick_times.append(start + off)
sc = sidechain_gain(kick_times, 0.28, 0.16)

# reverb impulse
def make_impulse(duration=2.1, decay=3.1):
    t = tt(duration)
    env = np.exp(-t * decay)
    a = rng.normal(0, 1, len(t)) * env
    b = rng.normal(0, 1, len(t)) * env
    # early reflections
    for d, g in [(0.011, 0.35), (0.019, 0.22), (0.033, 0.18), (0.051, 0.12)]:
        i = int(d * SR)
        a[i] += g
        b[i + 37] += g * 0.8
    a = lowpass(a, 5200)
    b = lowpass(b, 5200)
    a /= np.max(np.abs(a)) + 1e-9
    b /= np.max(np.abs(b)) + 1e-9
    return np.stack([a, b], axis=1) * 0.4

impulse = make_impulse()


def reverb_send(bus_data: np.ndarray, amount=0.2):
    wet = np.zeros_like(bus_data)
    for ch in range(2):
        wet[:, ch] = fftconvolve(bus_data[:, ch], impulse[:, ch], mode="same")[:N]
    return wet * amount

# Delay for the lead, ping-pong, dotted eighth.
def delay_send(bus_data: np.ndarray, time_s=0.375, feedback=0.28, amount=0.2):
    d = int(time_s * SR)
    out = np.zeros_like(bus_data)
    tap = bus_data.copy()
    for k in range(1, 5):
        shift = d * k
        if shift >= N:
            break
        gain = feedback ** (k - 1) * amount
        if k % 2 == 1:
            out[shift:, 0] += tap[:-shift, 1] * gain
            out[shift:, 1] += tap[:-shift, 0] * gain
        else:
            out[shift:, 0] += tap[:-shift, 0] * gain
            out[shift:, 1] += tap[:-shift, 1] * gain
    return out

# Apply sidechain to sustained parts only
pad.data *= sc[:, None]
keys.data *= (0.75 + 0.25 * sc[:, None])
bass_bus.data *= (0.82 + 0.18 * sc[:, None])

music_mix = (
    drums.data * 0.48
    + bass_bus.data * 0.68
    + keys.data * 0.55
    + pad.data * 0.74
    + lead.data * 0.52
    + bells.data * 0.42
)
# Sends
music_mix += reverb_send(keys.data * 0.4 + pad.data * 0.55 + lead.data * 0.2 + bells.data * 0.55, 0.28)
music_mix += delay_send(lead.data * 0.55 + bells.data * 0.25, 0.375, 0.28, 0.17)

# gentle high/low shaping
music_mix = highpass(music_mix, 25, 2)
music_mix = lowpass(music_mix, 17500, 2)

# glue compression (very light)
def soft_compress(x, threshold=0.55, ratio=2.2):
    a = np.abs(x)
    over = np.maximum(a - threshold, 0)
    return x * (1 - (1 - 1 / ratio) * over / (a + 1e-9))

music_mix = soft_compress(music_mix, 0.6, 2.0)
music_mix = np.tanh(music_mix * 1.08) / 1.08

sfx_mix = sfx.data.copy()
sfx_mix = highpass(sfx_mix, 35, 2)
sfx_mix = soft_compress(sfx_mix, 0.4, 2.5)

# music drops a little under loud typewriting
duck = np.ones(N)
for t0, dur, depth in [(7.2, 1.2, 0.18), (36.9, 2.8, 0.16), (51.3, 1.2, 0.22)]:
    i = int(t0 * SR)
    j = min(N, int((t0 + dur) * SR))
    duck[i:j] *= (1 - depth)


# Overall arrangement automation. The mix should breathe with the edit:
# intimate opening, full groove, a paper-quiet file scene, a focused CLI dip,
# then a wide final page.
def automation(points):
    x = np.array([p[0] for p in points], dtype=np.float64)
    y = np.array([p[1] for p in points], dtype=np.float64)
    t = np.arange(N) / SR
    return np.interp(t, x, y)

arrangement = automation([
    (0.0, 0.52), (1.2, 0.62), (2.2, 0.70), (3.8, 0.86), (5.6, 0.94),
    (6.2, 1.0), (15.8, 1.0), (16.2, 0.70), (17.4, 0.82), (19.2, 0.96),
    (25.8, 1.0), (30.0, 1.06), (35.4, 1.04), (35.55, 0.58), (36.0, 0.70),
    (37.2, 0.82), (45.3, 0.88), (45.55, 0.95), (46.1, 1.0), (51.3, 1.0),
    (51.35, 0.66), (52.0, 0.78), (53.9, 0.94), (54.1, 1.0), (55.1, 0.82),
    (56.0, 0.0),
])
music_final = music_mix * duck[:, None] * arrangement[:, None]
mix = music_final + sfx_mix * 0.72


# global fade in/out and final safety
fade_in = int(0.12 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(1.1 * SR)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.2
music_final[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.2
sfx_mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.5

peak = np.max(np.abs(mix))
if peak > 0.82:
    mix *= 0.82 / peak
peak = np.max(np.abs(music_final))
if peak > 0.82:
    music_final *= 0.82 / peak
peak = np.max(np.abs(sfx_mix))
if peak > 0.82:
    sfx_mix *= 0.82 / peak

# write 24-bit-ish via float-to-int32 then wav; use int16 for Remotion compatibility
def write_wav(path: Path, data: np.ndarray):
    data = np.clip(data, -1, 1)
    pcm = (data * 32767.0).astype(np.int16)
    wavfile.write(str(path), SR, pcm)
    print(f"wrote {path} ({data.shape[1]}ch, {DUR:.1f}s)")

write_wav(QA / "score-raw.wav", mix)
write_wav(QA / "music-only-raw.wav", music_final)
write_wav(QA / "sfx-only-raw.wav", sfx_mix)

print("score rendered. Next: loudness pass to public/audio/film-mix.wav")
