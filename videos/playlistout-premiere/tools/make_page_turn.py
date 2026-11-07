"""Synthesise two soft paper page-turn sounds for the six transitions.

No samples are used; filtered noise, crinkle bursts and a low paper lift are
generated from code and written as 48 kHz / 16-bit stereo WAV files.
"""
from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
SR = 48_000
DUR = 0.86
N = int(SR * DUR)
rng = np.random.default_rng(20261107)
t = np.arange(N) / SR


def bandpass(signal: np.ndarray, lo: float, hi: float) -> np.ndarray:
    spec = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / SR)
    mask = (freqs >= lo) & (freqs <= hi)
    spec[~mask] = 0
    return np.fft.irfft(spec, n=len(signal))


def page_turn(direction: int) -> np.ndarray:
    noise = rng.normal(0, 1, N)
    air = bandpass(noise, 350, 7000)
    air /= max(1e-9, np.max(np.abs(air)))

    # the soft lift and settle of a sheet being dragged over paper
    env = np.clip(t / 0.16, 0, 1) * np.clip((DUR - t) / 0.22, 0, 1)
    env = env ** 1.5
    sweep = np.sin(np.pi * np.clip(t / DUR, 0, 1)) ** 1.2
    body = air * env * (0.43 + 0.57 * sweep)

    # a few dry crinkles along the edge
    crinkles = np.zeros(N)
    for center, strength, width in [(0.17, 0.6, 0.016), (0.31, 0.4, 0.012), (0.48, 0.55, 0.02), (0.64, 0.28, 0.014), (0.77, 0.35, 0.018)]:
        idx = int(center * SR)
        ln = int(width * SR)
        burst = rng.normal(0, 1, ln * 2)
        burst = bandpass(burst, 900, 11000)[:ln]
        burst *= np.hanning(ln) * strength
        crinkles[idx : idx + ln] += burst[: max(0, min(ln, N - idx))]

    # a low, papery lift so it has weight on the desk
    low = np.sin(2 * math.pi * 92 * t) * np.exp(-((t - 0.1) ** 2) / 0.0015) * 0.055
    low += np.sin(2 * math.pi * 150 * t) * np.exp(-((t - 0.18) ** 2) / 0.003) * 0.025

    signal = body + crinkles * 0.8 + low
    # gentle pan: the page moves with its direction
    pan = np.linspace(0.5 - 0.35 * direction, 0.5 + 0.35 * direction, N)
    left = signal * np.sqrt(1 - pan)
    right = signal * np.sqrt(pan)
    stereo = np.stack([left, right], axis=1)
    stereo = np.tanh(stereo * 1.4)
    stereo *= 0.35 / max(1e-9, np.max(np.abs(stereo)))
    return stereo


for name, direction in [("page-turn-a.wav", 1), ("page-turn-b.wav", -1)]:
    data = page_turn(direction)
    pcm = np.clip(data, -1, 1)
    pcm = (pcm * 32767).astype("<i2")
    with wave.open(str(OUT / name), "wb") as fh:
        fh.setnchannels(2)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes(pcm.tobytes())
    print(f"wrote {OUT / name} ({len(pcm)} frames, peak {np.max(np.abs(data)):.3f})")
