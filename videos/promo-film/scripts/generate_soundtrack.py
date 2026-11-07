#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Playlist Out — Original 56.0s (28 Bars @ 120 BPM) Bespoke Soundtrack & Foley Generator
Style: Playful Electronic × Funky × Light Chiptune × Cozy Music Journal
Sample Rate: 48,000 Hz, 16-bit Stereo WAV
License: CC0 1.0 / MIT (100% Original Procedural Synthesis, safe for Bilibili & YouTube)
"""

import math
import wave
from pathlib import Path
import numpy as np

SR = 48000
DURATION = 56.0  # Exactly 28 bars at 120 BPM (1 bar = 2.0s, 1 beat = 0.5s = 15 frames @ 30fps)
N_SAMPLES = int(SR * DURATION)
BPM = 120.0
BEAT_SEC = 60.0 / BPM  # 0.5s
BAR_SEC = BEAT_SEC * 4  # 2.0s


def midi_to_freq(midi_note: float) -> float:
    return 440.0 * (2.0 ** ((midi_note - 69.0) / 12.0))


def add_stereo(mix_l: np.ndarray, mix_r: np.ndarray, sig: np.ndarray, start_sec: float, pan: float = 0.0, gain: float = 1.0):
    """Add mono signal into stereo buffer at start_sec with constant-power panning (-1.0 left to +1.0 right)."""
    idx = int(round(start_sec * SR))
    if idx >= N_SAMPLES or len(sig) == 0:
        return
    if idx < 0:
        sig = sig[-idx:]
        idx = 0
    end = min(N_SAMPLES, idx + len(sig))
    seg = sig[: end - idx]
    angle = (pan + 1.0) * (math.pi / 4.0)
    gl = math.cos(angle) * gain
    gr = math.sin(angle) * gain
    mix_l[idx:end] += seg * gl
    mix_r[idx:end] += seg * gr


def env_adsr(length: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    t = np.linspace(0, length / SR, length, endpoint=False)
    total_dur = length / SR
    env = np.ones(length, dtype=np.float32) * s
    a_s = max(1, int(a * SR))
    d_s = max(1, int(d * SR))
    r_s = max(1, int(r * SR))
    # Attack
    end_a = min(length, a_s)
    env[:end_a] = np.linspace(0.0, 1.0, end_a)
    # Decay
    end_d = min(length, end_a + d_s)
    if end_d > end_a:
        env[end_a:end_d] = np.linspace(1.0, s, end_d - end_a)
    # Release
    if r_s < length:
        env[-r_s:] *= np.linspace(1.0, 0.0, r_s) ** 1.5
    else:
        env *= np.linspace(1.0, 0.0, length) ** 1.5
    return env


def synth_rhodes_chord(midi_notes: list[int], dur_sec: float, vel: float = 1.0) -> np.ndarray:
    """Warm cozy Rhodes / Wurlitzer electric piano chord with gentle tine bell & tremolo."""
    n = int(dur_sec * SR)
    t = np.arange(n, dtype=np.float32) / SR
    out = np.zeros(n, dtype=np.float32)
    env_body = env_adsr(n, 0.012, 0.35, 0.48, min(0.35, dur_sec * 0.35))
    env_tine = np.exp(-t * 9.5)
    for i, m in enumerate(midi_notes):
        f = midi_to_freq(m)
        detune = 1.0 + (i - 1.5) * 0.0006
        mod = 0.65 * np.sin(2.0 * math.pi * f * 2.0 * t) * np.exp(-t * 4.5)
        body = np.sin(2.0 * math.pi * f * detune * t + mod)
        tine = 0.16 * np.sin(2.0 * math.pi * f * 6.0 * t) * env_tine
        out += (body * env_body + tine) / max(1.0, len(midi_notes) ** 0.7)
    # Cozy slow tremolo
    trem = 1.0 + 0.08 * np.sin(2.0 * math.pi * 4.2 * t)
    return (out * trem * vel).astype(np.float32)


def synth_funky_bass(midi_note: int, dur_sec: float, accent: float = 1.0) -> np.ndarray:
    """Bouncy, round funky synth/electric bass with filter-envelope punch."""
    n = int(dur_sec * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_to_freq(midi_note)
    env = env_adsr(n, 0.006, 0.14, 0.55, min(0.08, dur_sec * 0.25))
    punch_env = np.exp(-t * 18.0)
    # FM + warm sub + harmonics
    fm = (1.2 * punch_env + 0.3) * np.sin(2.0 * math.pi * f * 2.0 * t)
    sig = (
        0.65 * np.sin(2.0 * math.pi * f * t + fm * accent)
        + 0.35 * np.sin(2.0 * math.pi * (f * 0.5) * t)
        + 0.15 * np.tanh(2.2 * np.sin(2.0 * math.pi * f * 3.0 * t)) * punch_env
    )
    return (sig * env * accent).astype(np.float32)


def synth_chiptune_marimba(midi_note: int, dur_sec: float, mode: str = "hybrid") -> np.ndarray:
    """Playful cozy lead: warm wooden marimba attack blended with soft filtered chiptune pulse wave."""
    n = int(dur_sec * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_to_freq(midi_note)
    # Subtle vibrato after 0.12s
    vib_depth = np.clip((t - 0.10) * 4.0, 0.0, 1.0) * 0.0035
    phase = 2.0 * math.pi * f * (t + vib_depth * np.sin(2.0 * math.pi * 6.0 * t) / (2.0 * math.pi * 6.0))

    # Marimba wooden fundamental + 4th harmonic pop
    marimba_env = np.exp(-t * 6.5)
    wood_pop = np.exp(-t * 38.0)
    marimba = (np.sin(phase) * marimba_env + 0.28 * np.sin(phase * 4.0) * wood_pop)

    # Soft band-limited 25% duty pulse wave (rich chiptune color without harsh aliasing)
    pulse = np.zeros_like(t)
    for k in range(1, 8):
        amp = (2.0 / (k * math.pi)) * math.sin(k * math.pi * 0.28)
        pulse += amp * np.cos(k * phase)
    chip_env = env_adsr(n, 0.008, 0.18, 0.42, min(0.12, dur_sec * 0.3))

    if mode == "marimba":
        sig = marimba * 0.85 + pulse * chip_env * 0.22
    elif mode == "chip":
        sig = marimba * 0.40 + pulse * chip_env * 0.65
    else:
        sig = marimba * 0.65 + pulse * chip_env * 0.45
    return (sig * env_adsr(n, 0.005, 0.15, 0.65, min(0.10, dur_sec * 0.25))).astype(np.float32)


def synth_plucked_bell(midi_note: int, dur_sec: float) -> np.ndarray:
    """Sparkling music-box / celesta bell for arpeggios and magical moments."""
    n = int(dur_sec * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f = midi_to_freq(midi_note)
    env = np.exp(-t * 4.2) * env_adsr(n, 0.003, 0.1, 0.7, min(0.25, dur_sec * 0.4))
    chime = (
        np.sin(2.0 * math.pi * f * t)
        + 0.25 * np.sin(2.0 * math.pi * f * 2.0 * t) * np.exp(-t * 8.0)
        + 0.12 * np.sin(2.0 * math.pi * f * 5.04 * t) * np.exp(-t * 18.0)
    )
    return (chime * env).astype(np.float32)


def synth_kick(accent: float = 1.0) -> np.ndarray:
    n = int(0.18 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    freq_sweep = 52.0 + 115.0 * np.exp(-t * 36.0)
    phase = 2.0 * math.pi * np.cumsum(freq_sweep) / SR
    env = np.exp(-t * 14.0)
    click = 0.22 * np.exp(-t * 140.0) * np.sin(2.0 * math.pi * 900.0 * t)
    return ((np.sin(phase) * env + click) * accent).astype(np.float32)


def synth_snare_clap(rng: np.random.Generator, accent: float = 1.0) -> np.ndarray:
    """Cozy pocket snare + soft wood rim click."""
    n = int(0.14 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    body = np.sin(2.0 * math.pi * (185.0 + 90.0 * np.exp(-t * 45.0)) * t) * np.exp(-t * 26.0)
    noise = rng.standard_normal(n).astype(np.float32)
    # Simple one-pole bandpass smoothing so it's warm, never harsh
    noise = np.convolve(noise, np.array([0.2, 0.35, 0.25, -0.1, -0.2], dtype=np.float32), mode="same")
    snap = noise * np.exp(-t * 28.0) * 0.55
    return ((body * 0.65 + snap) * accent).astype(np.float32)


def synth_hat(rng: np.random.Generator, open_hat: bool = False, accent: float = 1.0) -> np.ndarray:
    dur = 0.16 if open_hat else 0.045
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    noise = rng.standard_normal(n).astype(np.float32)
    # High-pass difference for soft shaker/hat texture
    hp = np.diff(noise, prepend=0.0)
    decay = 16.0 if open_hat else 58.0
    env = np.exp(-t * decay)
    return (hp * env * 0.22 * accent).astype(np.float32)


# ── FOLEY / UI SFX SYNTHESIZERS ──────────────────────────────────────────

def sfx_paper_flip(rng: np.random.Generator, dur: float = 0.22, pitch: float = 1.0) -> np.ndarray:
    """Tactile notebook paper rustle / flip sound."""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    noise = rng.standard_normal(n).astype(np.float32)
    # Smooth resonant filter sweep
    k = int(max(3, round(12 / pitch)))
    kernel = np.hanning(k).astype(np.float32)
    kernel /= max(1e-6, np.sum(kernel))
    rustle = np.convolve(noise, kernel, mode="same")
    rustle = np.diff(rustle, prepend=0.0) * 3.5
    env = np.sin(math.pi * (t / dur)) ** 1.4 * (0.6 + 0.4 * np.sin(2.0 * math.pi * 14.0 * t))
    return (rustle * env * 0.45).astype(np.float32)


def sfx_tape_peel(rng: np.random.Generator, dur: float = 0.16) -> np.ndarray:
    """Crisp Washi tape stick / peel sound."""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    noise = np.diff(rng.standard_normal(n).astype(np.float32), prepend=0.0)
    sweep = np.sin(2.0 * math.pi * (600.0 + 1400.0 * (t / dur)) * t) * 0.25
    env = np.exp(-((t - dur * 0.35) ** 2) / (2.0 * (dur * 0.22) ** 2))
    return ((noise * 0.35 + sweep) * env * 0.35).astype(np.float32)


def sfx_pop_click(freq: float = 680.0) -> np.ndarray:
    """Playful UI sticker pop / button click."""
    n = int(0.065 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    f_curve = freq * (0.65 + 0.85 * (1.0 - np.exp(-t * 55.0)))
    phase = 2.0 * math.pi * np.cumsum(f_curve) / SR
    env = np.exp(-t * 48.0)
    return (np.sin(phase) * env * 0.42).astype(np.float32)


def sfx_whoosh(rng: np.random.Generator, dur: float = 0.32) -> np.ndarray:
    """Warm air/paper transition whoosh."""
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    noise = rng.standard_normal(n).astype(np.float32)
    kernel = np.hanning(24).astype(np.float32)
    kernel /= np.sum(kernel)
    warm_noise = np.convolve(noise, kernel, mode="same")
    tone = 0.25 * np.sin(2.0 * math.pi * (220.0 + 260.0 * np.sin(math.pi * t / dur)) * t)
    env = np.sin(math.pi * t / dur) ** 1.8
    return ((warm_noise * 0.8 + tone) * env * 0.35).astype(np.float32)


def sfx_success_chime(root_midi: int = 72) -> np.ndarray:
    """Two-note or three-note warm celebratory chime."""
    n = int(0.55 * SR)
    out = np.zeros(n, dtype=np.float32)
    notes = [root_midi, root_midi + 4, root_midi + 7, root_midi + 12]
    for i, m in enumerate(notes):
        start = int(i * 0.055 * SR)
        bell = synth_plucked_bell(m, 0.38)
        end = min(n, start + len(bell))
        out[start:end] += bell[: end - start] * 0.32
    return out


def apply_stereo_reverb(sig_l: np.ndarray, sig_r: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Warm studio room ambience using multi-tap feedback/comb reflections."""
    out_l = sig_l.copy()
    out_r = sig_r.copy()
    taps = [
        (0.029, 0.14, 0.11),
        (0.047, 0.10, 0.13),
        (0.073, 0.08, 0.06),
        (0.113, 0.05, 0.05),
    ]
    for delay_sec, gl, gr in taps:
        d = int(delay_sec * SR)
        if d < len(sig_l):
            out_l[d:] += sig_r[:-d] * gl
            out_r[d:] += sig_l[:-d] * gr
    return out_l, out_r


def write_wav(path: Path, left: np.ndarray, right: np.ndarray):
    stereo = np.empty((len(left) * 2,), dtype=np.int16)
    l_clamped = np.clip(left, -0.98, 0.98)
    r_clamped = np.clip(right, -0.98, 0.98)
    stereo[0::2] = (l_clamped * 32767.0).astype(np.int16)
    stereo[1::2] = (r_clamped * 32767.0).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(stereo.tobytes())


def generate():
    rng = np.random.default_rng(20261107)
    music_l = np.zeros(N_SAMPLES, dtype=np.float32)
    music_r = np.zeros(N_SAMPLES, dtype=np.float32)
    sfx_l = np.zeros(N_SAMPLES, dtype=np.float32)
    sfx_r = np.zeros(N_SAMPLES, dtype=np.float32)

    # ── CHORD PROGRESSION ACROSS 28 BARS (0..27) ─────────────────────────
    # Key of C Major / A Minor with warm jazz-funk voicings (Fmaj9 -> G13 -> Em9 -> Am9 / Dm9 -> G13 -> Cmaj9)
    CHORDS_4BAR = [
        ([53, 57, 60, 64, 67], 41),  # Fmaj9 (Bass F2=41)
        ([55, 59, 62, 65, 69], 43),  # G13   (Bass G2=43)
        ([52, 55, 59, 62, 66], 40),  # Em9   (Bass E2=40)
        ([57, 60, 64, 67, 71], 45),  # Am9   (Bass A2=45)
    ]
    CHORDS_ALT = [
        ([50, 53, 57, 60, 64], 38),  # Dm9   (Bass D2=38)
        ([55, 59, 62, 65, 69], 43),  # G13   (Bass G2=43)
        ([48, 52, 55, 59, 62], 36),  # Cmaj9 (Bass C2=36)
        ([57, 61, 64, 67, 70], 45),  # A7alt (Bass A2=45)
    ]

    # Catchy, memorable pentatonic + chromatic funk melodies (in 16th-note steps, 16 per bar)
    # Each tuple: (step_0_to_15, midi_note, dur_beats, mode)
    MELODY_HOOK_A = [
        # Bar A: bouncy memorable motif (A5 - G5 - E5 - D5 - E5 - G5 - A5)
        [(0, 76, 0.75, "hybrid"), (3, 79, 0.75, "hybrid"), (6, 81, 1.0, "hybrid"), (10, 79, 0.5, "hybrid"), (12, 76, 0.75, "hybrid")],
        # Bar B: playful answer (D5 - E5 - G5 - E5 - C5 - D5)
        [(0, 74, 0.75, "hybrid"), (3, 76, 0.75, "hybrid"), (6, 79, 1.0, "hybrid"), (10, 76, 0.5, "hybrid"), (12, 72, 0.5, "hybrid"), (14, 74, 0.5, "hybrid")],
        # Bar C: rising excitement
        [(0, 76, 0.75, "hybrid"), (3, 79, 0.75, "hybrid"), (6, 81, 0.75, "hybrid"), (9, 84, 1.25, "hybrid"), (14, 81, 0.5, "hybrid")],
        # Bar D: groovy turnaround resolution
        [(0, 79, 1.0, "hybrid"), (4, 76, 0.5, "hybrid"), (6, 74, 0.5, "hybrid"), (8, 72, 1.25, "hybrid"), (14, 74, 0.5, "hybrid")],
    ]

    MELODY_ORIGAMI_B = [
        # Sparkling 8th/16th arpeggio dance for Act 3 (Multi-format export)
        [(0, 84, 0.5, "chip"), (2, 81, 0.5, "chip"), (4, 79, 0.5, "chip"), (6, 76, 0.5, "chip"), (8, 79, 0.75, "chip"), (11, 81, 0.75, "chip"), (14, 84, 0.5, "chip")],
        [(0, 86, 0.75, "chip"), (3, 84, 0.75, "chip"), (6, 79, 1.0, "chip"), (10, 76, 0.5, "chip"), (12, 79, 1.0, "chip")],
        [(0, 84, 0.5, "chip"), (2, 83, 0.5, "chip"), (4, 79, 0.5, "chip"), (6, 76, 0.5, "chip"), (8, 81, 1.0, "chip"), (12, 79, 1.0, "chip")],
        [(0, 76, 0.75, "chip"), (3, 74, 0.75, "chip"), (6, 72, 1.0, "chip"), (10, 74, 0.5, "chip"), (12, 76, 1.0, "chip")],
    ]

    MELODY_CLI_C = [
        # Cool Chiptune-Funk lead for Act 5 (Desktop CLI)
        [(0, 72, 0.5, "chip"), (2, 76, 0.5, "chip"), (4, 79, 0.75, "chip"), (7, 81, 0.75, "chip"), (10, 79, 0.5, "chip"), (12, 76, 1.0, "chip")],
        [(0, 74, 0.5, "chip"), (2, 79, 0.5, "chip"), (4, 83, 0.75, "chip"), (7, 84, 0.75, "chip"), (10, 83, 0.5, "chip"), (12, 79, 1.0, "chip")],
        [(0, 76, 0.5, "chip"), (2, 79, 0.5, "chip"), (4, 84, 0.75, "chip"), (7, 86, 0.75, "chip"), (10, 84, 0.5, "chip"), (12, 81, 1.0, "chip")],
        [(0, 79, 0.75, "chip"), (3, 76, 0.75, "chip"), (6, 74, 0.5, "chip"), (8, 72, 1.5, "chip")],
    ]

    for bar in range(28):
        bar_t = bar * BAR_SEC
        is_intro = bar < 2
        is_finale_bar26 = bar == 26
        is_final_hold = bar == 27  # Bar 28 (54.0s - 56.0s): warm resolved Cmaj9 chord hold & decay!

        if is_final_hold:
            # Final Bar 28 (54.0s - 56.0s): Warm resonant Cmaj9 chord + bell arpeggio + sub bass, decaying smoothly to 0
            final_chord = synth_rhodes_chord([48, 55, 59, 62, 64, 67, 71], 2.0, vel=0.38)
            add_stereo(music_l, music_r, final_chord, bar_t, pan=0.0, gain=1.0)
            bass_hold = synth_funky_bass(36, 1.85, accent=0.85)
            add_stereo(music_l, music_r, bass_hold, bar_t, pan=0.0, gain=0.45)
            add_stereo(music_l, music_r, synth_kick(0.85), bar_t, pan=0.0, gain=0.45)
            # Delicate music-box arpeggio cascade across beat 1-2, ringing out
            for idx, m_note in enumerate([72, 76, 79, 83, 86, 84]):
                bell = synth_plucked_bell(m_note, 1.65 - idx * 0.12)
                add_stereo(music_l, music_r, bell, bar_t + idx * 0.08, pan=(idx - 2.5) * 0.18, gain=0.26)
            continue

        # Choose harmonic progression
        if bar in (10, 11, 12, 13, 18, 19, 20, 21):
            voicing, bass_root = CHORDS_ALT[bar % 4]
        elif is_finale_bar26:
            # Bar 27 (52.0s - 54.0s): Dm9 (beats 1-2) -> G13sus4 (beats 3-4) cadence into Bar 28 Cmaj9!
            voicing, bass_root = ([50, 53, 57, 60, 64], 38)
        else:
            voicing, bass_root = CHORDS_4BAR[bar % 4]

        # 1. Rhodes / Electric Piano Chords
        if is_intro:
            # Gentle half-bar warm chords
            c1 = synth_rhodes_chord(voicing, 0.95, vel=0.26)
            c2 = synth_rhodes_chord(voicing, 0.95, vel=0.24)
            add_stereo(music_l, music_r, c1, bar_t, pan=-0.15, gain=1.0)
            add_stereo(music_l, music_r, c2, bar_t + 2.0 * BEAT_SEC, pan=0.15, gain=1.0)
        elif is_finale_bar26:
            c_dm9 = synth_rhodes_chord([50, 53, 57, 60, 64], 0.98, vel=0.32)
            c_g13 = synth_rhodes_chord([55, 60, 62, 65, 69], 0.98, vel=0.34)
            add_stereo(music_l, music_r, c_dm9, bar_t, pan=-0.12, gain=1.0)
            add_stereo(music_l, music_r, c_g13, bar_t + 2.0 * BEAT_SEC, pan=0.12, gain=1.0)
        else:
            # Funky syncopated chord comping (Beat 1, Beat 2.5, Beat 4)
            comp_pattern = [(0.0, 0.65, 0.30), (1.5 * BEAT_SEC, 0.55, 0.28), (3.0 * BEAT_SEC, 0.45, 0.25)]
            for offset, dur, vel in comp_pattern:
                ch = synth_rhodes_chord(voicing, dur, vel=vel)
                add_stereo(music_l, music_r, ch, bar_t + offset, pan=-0.18 if offset == 0 else 0.18, gain=1.0)

        # 2. Funky Syncopated Bassline
        if is_intro:
            b1 = synth_funky_bass(bass_root, 0.85, accent=0.65)
            add_stereo(music_l, music_r, b1, bar_t, pan=0.0, gain=0.40)
            b2 = synth_funky_bass(bass_root + 7, 0.65, accent=0.55)
            add_stereo(music_l, music_r, b2, bar_t + 2.5 * BEAT_SEC, pan=0.0, gain=0.36)
        elif is_finale_bar26:
            add_stereo(music_l, music_r, synth_funky_bass(38, 0.9, 0.85), bar_t, pan=0.0, gain=0.46)
            add_stereo(music_l, music_r, synth_funky_bass(43, 0.9, 0.90), bar_t + 2.0 * BEAT_SEC, pan=0.0, gain=0.48)
        else:
            # 16th-note funky pocket bass pattern
            bass_steps = [
                (0, bass_root, 0.38, 0.95),
                (3, bass_root, 0.22, 0.72),
                (6, bass_root + 12, 0.24, 0.82),
                (8, bass_root, 0.35, 0.88),
                (11, bass_root + 7, 0.22, 0.75),
                (14, bass_root + 10, 0.22, 0.80),
            ]
            for step, b_note, b_dur, b_acc in bass_steps:
                b_sig = synth_funky_bass(b_note, b_dur, accent=b_acc)
                add_stereo(music_l, music_r, b_sig, bar_t + step * (BEAT_SEC / 4.0), pan=0.0, gain=0.46)

        # 3. Drums & Cozy Groove
        if is_intro:
            # Light shaker & soft rim on beat 3
            for s in range(8):
                hat = synth_hat(rng, open_hat=False, accent=0.45 if s % 2 == 0 else 0.28)
                add_stereo(music_l, music_r, hat, bar_t + s * (BEAT_SEC / 2.0), pan=0.22, gain=0.45)
            if bar == 1:
                # Bar 2 Beat 4 rising fill into Bar 3 drop
                for f_step in range(12, 16):
                    sn = synth_snare_clap(rng, accent=0.45 + (f_step - 12) * 0.15)
                    add_stereo(music_l, music_r, sn, bar_t + f_step * (BEAT_SEC / 4.0), pan=(f_step - 13.5) * 0.15, gain=0.42)
        else:
            # Full bouncy 120 BPM groove
            for beat in range(4):
                bt = bar_t + beat * BEAT_SEC
                if beat in (0, 2):
                    add_stereo(music_l, music_r, synth_kick(0.95 if beat == 0 else 0.85), bt, pan=0.0, gain=0.48)
                    if beat == 2 and bar % 2 == 1:
                        # Syncopated ghost kick on 2-and-a
                        add_stereo(music_l, music_r, synth_kick(0.65), bt + 0.75 * BEAT_SEC, pan=0.0, gain=0.38)
                if beat in (1, 3):
                    add_stereo(music_l, music_r, synth_snare_clap(rng, 0.90), bt, pan=-0.06, gain=0.42)
            # 16th-note swung shaker/hats
            for s16 in range(16):
                swing = 0.014 if (s16 % 2 == 1) else 0.0
                ht_t = bar_t + s16 * (BEAT_SEC / 4.0) + swing
                is_open = (s16 == 14 and bar % 2 == 1)
                acc = 0.75 if (s16 % 4 == 2) else (0.45 if s16 % 2 == 0 else 0.26)
                hat = synth_hat(rng, open_hat=is_open, accent=acc)
                add_stereo(music_l, music_r, hat, ht_t, pan=0.25 if s16 % 2 == 0 else -0.20, gain=0.48)

        # 4. Lead Melody & Counter-Bell Arpeggios
        if is_intro:
            # Curious marimba notes tugging against the platform barriers
            intro_notes = [(0, 72, 0.5), (3, 76, 0.5), (6, 79, 0.75), (10, 76, 0.5), (12, 81 if bar == 1 else 74, 0.75)]
            for step, m_note, dur_b in intro_notes:
                sig = synth_chiptune_marimba(m_note, dur_b * BEAT_SEC, mode="marimba")
                add_stereo(music_l, music_r, sig, bar_t + step * (BEAT_SEC / 4.0), pan=0.12, gain=0.30)
            if bar == 1:
                # Upward sparkling glissando at t = 3.5s (Bar 2 Beat 4) when Playlist Out slices the barriers!
                for g_i, g_note in enumerate([72, 74, 76, 79, 81, 84, 86, 88]):
                    bell = synth_plucked_bell(g_note, 0.35)
                    add_stereo(music_l, music_r, bell, bar_t + 3.0 * BEAT_SEC + g_i * 0.06, pan=(g_i - 3.5) * 0.15, gain=0.28)
        else:
            # Select melody bank based on narrative act
            if 9 <= bar <= 13:
                pattern = MELODY_ORIGAMI_B[bar % 4]
            elif 19 <= bar <= 23:
                pattern = MELODY_CLI_C[bar % 4]
            else:
                pattern = MELODY_HOOK_A[bar % 4]

            for step, m_note, dur_b, mode in pattern:
                nt = bar_t + step * (BEAT_SEC / 4.0)
                lead = synth_chiptune_marimba(m_note, dur_b * BEAT_SEC, mode=mode)
                add_stereo(music_l, music_r, lead, nt, pan=0.10 if step % 4 == 0 else -0.10, gain=0.32)
                # Double key melody hits with a soft octave bell for extra sparkle
                if step in (0, 6):
                    bell = synth_plucked_bell(m_note + 12, 0.35)
                    add_stereo(music_l, music_r, bell, nt, pan=-0.28, gain=0.14)

            # Soft background 8th-note chord arpeggio plucks for movement
            for arp_i in range(8):
                arp_note = voicing[arp_i % len(voicing)] + 12
                pluck = synth_plucked_bell(arp_note, 0.24)
                add_stereo(
                    music_l,
                    music_r,
                    pluck,
                    bar_t + arp_i * (BEAT_SEC / 2.0),
                    pan=-0.32 if arp_i % 2 == 0 else 0.32,
                    gain=0.11,
                )

    # ── SYNCHRONIZED FOLEY & UI SOUND EFFECTS (Frame-Exact @ 30fps) ──────
    # Act 1: Platform cards & marker slash (0.0s - 7.5s)
    for i in range(6):
        add_stereo(sfx_l, sfx_r, sfx_pop_click(520.0 + i * 45.0), 0.35 + i * 0.22, pan=(i - 2.5) * 0.2, gain=0.55)
    # Frame 105 (3.5s): Marker stroke slices barriers & title appears
    add_stereo(sfx_l, sfx_r, sfx_whoosh(rng, 0.38), 3.45, pan=0.0, gain=0.85)
    add_stereo(sfx_l, sfx_r, sfx_tape_peel(rng, 0.18), 3.60, pan=-0.2, gain=0.75)
    # 6 platform cards flutter down onto Search Note stickers (5.2s - 6.8s)
    for i in range(6):
        add_stereo(sfx_l, sfx_r, sfx_pop_click(640.0 + i * 50.0), 5.20 + i * 0.22, pan=(i - 2.5) * 0.15, gain=0.60)

    # Act 2: Web Parsing (7.5s - 19.0s)
    add_stereo(sfx_l, sfx_r, sfx_paper_flip(rng, 0.25, 1.1), 7.55, pan=-0.1, gain=0.75)
    add_stereo(sfx_l, sfx_r, sfx_pop_click(760.0), 8.50, pan=0.15, gain=0.75)       # Paste URL
    add_stereo(sfx_l, sfx_r, sfx_pop_click(520.0), 9.50, pan=0.25, gain=0.85)       # Click Parse
    add_stereo(sfx_l, sfx_r, sfx_paper_flip(rng, 0.30, 0.95), 11.00, pan=0.0, gain=0.90)  # ResultPaper unfolds
    add_stereo(sfx_l, sfx_r, sfx_tape_peel(rng, 0.16), 11.25, pan=-0.3, gain=0.75)  # Green corner tape sticks
    # Track rows cascade (13.0s - 15.5s)
    for r_i in range(6):
        add_stereo(sfx_l, sfx_r, sfx_pop_click(580.0 + r_i * 55.0), 13.00 + r_i * 0.35, pan=(r_i - 2.5) * 0.12, gain=0.58)
    # Qishui / Kugou callout stickers pop (16.2s, 17.2s)
    add_stereo(sfx_l, sfx_r, sfx_tape_peel(rng, 0.15), 16.20, pan=0.35, gain=0.70)
    add_stereo(sfx_l, sfx_r, sfx_tape_peel(rng, 0.15), 17.20, pan=-0.35, gain=0.70)

    # Act 3: Multi-Format Origami Export (19.0s - 28.0s)
    add_stereo(sfx_l, sfx_r, sfx_whoosh(rng, 0.28), 19.00, pan=0.0, gain=0.75)
    for f_i in range(5):
        add_stereo(sfx_l, sfx_r, sfx_pop_click(620.0 + f_i * 65.0), 19.50 + f_i * 0.32, pan=(f_i - 2.0) * 0.18, gain=0.65)
    add_stereo(sfx_l, sfx_r, sfx_pop_click(480.0), 21.50, pan=0.30, gain=0.85)      # Click Export (5)
    add_stereo(sfx_l, sfx_r, sfx_paper_flip(rng, 0.28, 1.2), 22.20, pan=-0.25, gain=0.85)  # Origami fold XLSX
    add_stereo(sfx_l, sfx_r, sfx_paper_flip(rng, 0.28, 1.0), 23.00, pan=0.25, gain=0.85)   # Origami fold JSON
    add_stereo(sfx_l, sfx_r, sfx_success_chime(72), 25.80, pan=0.0, gain=0.80)      # Toast pop

    # Act 4: Batch Export (28.0s - 38.0s)
    add_stereo(sfx_l, sfx_r, sfx_whoosh(rng, 0.32), 28.00, pan=0.0, gain=0.80)
    for b_i in range(6):
        add_stereo(sfx_l, sfx_r, sfx_pop_click(600.0 + b_i * 45.0), 29.50 + b_i * 0.25, pan=(b_i - 2.5) * 0.15, gain=0.58)
    add_stereo(sfx_l, sfx_r, sfx_paper_flip(rng, 0.32, 0.9), 33.00, pan=-0.20, gain=0.85)  # Multi-sheet stack
    add_stereo(sfx_l, sfx_r, sfx_tape_peel(rng, 0.20), 33.80, pan=0.20, gain=0.80)         # ZIP parcel seal
    add_stereo(sfx_l, sfx_r, sfx_success_chime(76), 36.20, pan=0.0, gain=0.82)             # 12/12 batch complete

    # Act 5: Desktop CLI (38.0s - 48.5s)
    add_stereo(sfx_l, sfx_r, sfx_paper_flip(rng, 0.26, 1.05), 38.05, pan=0.15, gain=0.85)
    add_stereo(sfx_l, sfx_r, sfx_tape_peel(rng, 0.16), 38.35, pan=0.25, gain=0.75)
    # Keystroke typing bursts
    for k_i in range(10):
        add_stereo(sfx_l, sfx_r, sfx_pop_click(820.0 + (k_i % 3) * 90.0), 39.80 + k_i * 0.11, pan=0.15, gain=0.35)
    add_stereo(sfx_l, sfx_r, sfx_pop_click(540.0), 41.10, pan=0.15, gain=0.75)      # Enter key
    add_stereo(sfx_l, sfx_r, sfx_success_chime(74), 42.20, pan=0.15, gain=0.70)     # CLI parsed 104 tracks
    add_stereo(sfx_l, sfx_r, sfx_success_chime(79), 46.20, pan=0.15, gain=0.80)     # CLI exported files

    # Act 6: Ecosystem & Developer Hub (48.5s - 53.5s)
    add_stereo(sfx_l, sfx_r, sfx_whoosh(rng, 0.35), 48.50, pan=0.0, gain=0.85)
    for e_i in range(4):
        add_stereo(sfx_l, sfx_r, sfx_pop_click(680.0 + e_i * 60.0), 49.60 + e_i * 0.65, pan=(e_i - 1.5) * 0.25, gain=0.65)

    # Act 7: Brand Finale (53.5s - 56.0s)
    add_stereo(sfx_l, sfx_r, sfx_paper_flip(rng, 0.28, 1.0), 53.50, pan=0.0, gain=0.80)
    add_stereo(sfx_l, sfx_r, sfx_tape_peel(rng, 0.18), 53.85, pan=-0.15, gain=0.75)
    add_stereo(sfx_l, sfx_r, sfx_success_chime(72), 54.00, pan=0.0, gain=0.85)

    # Apply warm studio reverb to music
    music_l, music_r = apply_stereo_reverb(music_l, music_r)

    # Soft master saturation & normalization so peak is around -1.5 dBFS (warm, never clipping)
    music_l = np.tanh(music_l * 1.15) * 0.78
    music_r = np.tanh(music_r * 1.15) * 0.78
    sfx_l = np.tanh(sfx_l * 1.10) * 0.72
    sfx_r = np.tanh(sfx_r * 1.10) * 0.72

    mix_l = np.tanh((music_l + sfx_l * 0.55) * 1.08) * 0.86
    mix_r = np.tanh((music_r + sfx_r * 0.55) * 1.08) * 0.86

    # Smooth fade-in (first 0.15s) and clean studio tail at 55.3s - 56.0s
    fade_in = int(0.15 * SR)
    fade_out = int(0.75 * SR)
    for arr in (music_l, music_r, sfx_l, sfx_r, mix_l, mix_r):
        arr[:fade_in] *= np.linspace(0.0, 1.0, fade_in, dtype=np.float32)
        arr[-fade_out:] *= np.linspace(1.0, 0.0, fade_out, dtype=np.float32) ** 1.6

    audio_dir = Path(__file__).resolve().parent.parent / "public" / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    write_wav(audio_dir / "soundtrack-mix.wav", mix_l, mix_r)
    write_wav(audio_dir / "music-stem.wav", music_l, music_r)
    write_wav(audio_dir / "sfx-stem.wav", sfx_l, sfx_r)

    license_md = """# Audio & Foley Licensing Statement (Playlist Out Promo Film)

- **Main Soundtrack & Mix**: `public/audio/soundtrack-mix.wav` (56.0s, 48,000 Hz, 16-bit Stereo)
- **Music Stem**: `public/audio/music-stem.wav` (120 BPM Playful Electronic × Funky Rhodes × Cozy Chiptune-Marimba)
- **Foley / UI SFX Stem**: `public/audio/sfx-stem.wav` (Synchronized paper flips, washi tape peel, tactile clicks, origami folds, chimes)
- **Generator Source**: `scripts/generate_soundtrack.py` (100% deterministic procedural synthesis in Python + NumPy)
- **Copyright & License**: Released under **CC0 1.0 Universal (Public Domain Dedication)** and **MIT License**.
- **Platform Clearance**: Contains zero third-party copyrighted samples or recordings. Cleared for unrestricted commercial and non-commercial distribution on **Bilibili**, **YouTube**, **GitHub**, and official project websites.
"""
    (audio_dir / "AUDIO_LICENSE.md").write_text(license_md, encoding="utf-8")
    print(f"Generated 56.0s soundtrack & stems in {audio_dir}")


if __name__ == "__main__":
    generate()
