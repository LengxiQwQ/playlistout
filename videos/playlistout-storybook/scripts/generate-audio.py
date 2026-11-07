# -*- coding: utf-8 -*-
"""
Playlist Out — Original 120 BPM Music & Sound Design Synthesizer
================================================================
Style: Playful Electronic × Funky Bass × Light Chiptune × Cozy Music Journal
Tempo: 120 BPM (1 beat = 0.5s = 15 frames @ 30fps; 1 bar = 2.0s = 60 frames)
Duration: 56.0 seconds (28 bars = 1680 frames @ 30fps)
License: 100% Original Procedural Composition (CC0 / MIT, safe for Bilibili & YouTube)
"""

import os
import math
import wave
import subprocess
import numpy as np

SAMPLE_RATE = 48000
DURATION = 56.0
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION)
BPM = 120.0
BEAT_SEC = 60.0 / BPM          # 0.5s (15 frames)
SIXTEENTH_SEC = BEAT_SEC / 4.0 # 0.125s
FPS = 30.0


def midi_to_freq(midi_note: float) -> float:
    return 440.0 * (2.0 ** ((midi_note - 69.0) / 12.0))


def add_stereo_clip(buf_l: np.ndarray, buf_r: np.ndarray, start_sec: float, sig_l: np.ndarray, sig_r: np.ndarray = None):
    if sig_r is None:
        sig_r = sig_l
    idx = int(round(start_sec * SAMPLE_RATE))
    if idx >= TOTAL_SAMPLES or idx + len(sig_l) <= 0:
        return
    if idx < 0:
        cut = -idx
        sig_l = sig_l[cut:]
        sig_r = sig_r[cut:]
        idx = 0
    end = min(TOTAL_SAMPLES, idx + len(sig_l))
    length = end - idx
    if length > 0:
        buf_l[idx:end] += sig_l[:length]
        buf_r[idx:end] += sig_r[:length]


def synth_rhodes_chord(midi_notes, duration_sec: float, amp: float = 0.12):
    n = int(SAMPLE_RATE * duration_sec)
    t = np.linspace(0, duration_sec, n, endpoint=False)
    env = np.minimum(1.0, t / 0.018) * np.exp(-t * 2.2)
    env[-int(min(n * 0.2, 0.06 * SAMPLE_RATE)):] *= np.linspace(1.0, 0.0, int(min(n * 0.2, 0.06 * SAMPLE_RATE)))

    sig_l = np.zeros(n, dtype=np.float64)
    sig_r = np.zeros(n, dtype=np.float64)
    trem_l = 1.0 + 0.12 * np.sin(2 * np.pi * 4.2 * t)
    trem_r = 1.0 + 0.12 * np.cos(2 * np.pi * 4.2 * t)

    for i, note in enumerate(midi_notes):
        freq = midi_to_freq(note)
        # Warm FM tine + fundamental
        mod_env = np.exp(-t * 14.0)
        mod = 1.4 * mod_env * np.sin(2 * np.pi * (freq * 2.0) * t)
        voice = (
            0.78 * np.sin(2 * np.pi * freq * t + mod)
            + 0.18 * np.sin(2 * np.pi * (freq * 2.0) * t)
            + 0.04 * np.sin(2 * np.pi * (freq * 3.0) * t) * np.exp(-t * 8.0)
        )
        pan = 0.35 + 0.3 * (i / max(1, len(midi_notes) - 1))
        sig_l += voice * (1.0 - pan * 0.5)
        sig_r += voice * (0.5 + pan * 0.5)

    scale = amp / max(1, len(midi_notes))
    return sig_l * env * trem_l * scale, sig_r * env * trem_r * scale


def synth_funky_bass(midi_note: float, duration_sec: float, amp: float = 0.20, slap: bool = False):
    n = int(SAMPLE_RATE * duration_sec)
    t = np.linspace(0, duration_sec, n, endpoint=False)
    freq = midi_to_freq(midi_note)

    env = np.minimum(1.0, t / 0.006) * np.exp(-t * (4.5 if slap else 3.2))
    rel = min(int(0.025 * SAMPLE_RATE), n // 3)
    if rel > 0:
        env[-rel:] *= np.linspace(1.0, 0.0, rel)

    # Sub + warm filtered saw/FM punch
    fm_index = (3.2 if slap else 1.8) * np.exp(-t * 18.0)
    sig = (
        0.65 * np.sin(2 * np.pi * freq * t + fm_index * np.sin(2 * np.pi * freq * t))
        + 0.35 * np.sin(2 * np.pi * (freq * 0.5 if freq > 95 else freq) * t)
    )
    sig = np.tanh(sig * 1.35) * env * amp
    return sig, sig


def synth_marimba_chip_lead(midi_note: float, duration_sec: float, amp: float = 0.11, chip_mix: float = 0.35, pan: float = 0.0):
    n = int(SAMPLE_RATE * duration_sec)
    t = np.linspace(0, duration_sec, n, endpoint=False)
    freq = midi_to_freq(midi_note)

    # Cozy wooden marimba/kalimba body
    env_wood = np.minimum(1.0, t / 0.004) * np.exp(-t * 7.5)
    wood = (
        0.80 * np.sin(2 * np.pi * freq * t)
        + 0.20 * np.sin(2 * np.pi * (freq * 4.0) * t) * np.exp(-t * 28.0)
    ) * env_wood

    # Light cozy chiptune (band-limited soft pulse with vibrato)
    env_chip = np.minimum(1.0, t / 0.008) * np.exp(-t * 4.2)
    rel = min(int(0.02 * SAMPLE_RATE), n // 3)
    if rel > 0:
        env_chip[-rel:] *= np.linspace(1.0, 0.0, rel)
    vib = 1.0 + 0.003 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.08) * 6.0, 0.0, 1.0)
    phase = 2 * np.pi * freq * vib * t
    # Soft band-limited square (1st, 3rd, 5th harmonics)
    chip = (
        np.sin(phase)
        + 0.30 * np.sin(3 * phase)
        + 0.14 * np.sin(5 * phase)
    ) * env_chip * 0.72

    sig = ((1.0 - chip_mix) * wood + chip_mix * chip) * amp
    gain_l = math.sqrt(0.5 * (1.0 - pan))
    gain_r = math.sqrt(0.5 * (1.0 + pan))
    return sig * gain_l, sig * gain_r


def synth_music_box_bell(midi_note: float, duration_sec: float, amp: float = 0.08, pan: float = 0.0):
    n = int(SAMPLE_RATE * duration_sec)
    t = np.linspace(0, duration_sec, n, endpoint=False)
    freq = midi_to_freq(midi_note)
    env = np.minimum(1.0, t / 0.003) * np.exp(-t * 3.8)
    rel = min(int(0.05 * SAMPLE_RATE), n // 4)
    if rel > 0:
        env[-rel:] *= np.linspace(1.0, 0.0, rel)
    sig = (
        0.75 * np.sin(2 * np.pi * freq * t)
        + 0.20 * np.sin(2 * np.pi * (freq * 2.0) * t) * np.exp(-t * 6.0)
        + 0.08 * np.sin(2 * np.pi * (freq * 3.0) * t) * np.exp(-t * 12.0)
    ) * env * amp
    return sig * (0.8 - 0.2 * pan), sig * (0.8 + 0.2 * pan)


def synth_kick(amp: float = 0.26):
    dur = 0.22
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    freq_env = 52.0 + 110.0 * np.exp(-t * 38.0)
    phase = 2 * np.pi * np.cumsum(freq_env) / SAMPLE_RATE
    env = np.minimum(1.0, t / 0.002) * np.exp(-t * 14.5)
    click = 0.18 * np.sin(2 * np.pi * 950.0 * t) * np.exp(-t * 120.0)
    sig = np.tanh((np.sin(phase) * env + click) * 1.3) * amp
    return sig, sig


def synth_snare_clap(amp: float = 0.14, rng: np.random.Generator = None):
    dur = 0.16
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    body = np.sin(2 * np.pi * (185.0 + 70.0 * np.exp(-t * 45.0)) * t) * np.exp(-t * 28.0) * 0.55
    noise_raw = rng.standard_normal(n) if rng else np.random.randn(n)
    # Simple bandpass-like smoothing via moving difference & average
    noise = np.convolve(noise_raw, [0.25, 0.5, 0.25], mode="same") - np.convolve(noise_raw, np.ones(12) / 12.0, mode="same")
    noise_env = (0.4 * np.exp(-t * 65.0) + 0.6 * np.exp(-np.maximum(0.0, t - 0.011) * 26.0))
    sig_l = (body + noise * noise_env * 0.48) * amp
    sig_r = (body + np.roll(noise, 18) * noise_env * 0.48) * amp
    return sig_l, sig_r


def synth_hihat(amp: float = 0.045, open_hat: bool = False, rng: np.random.Generator = None):
    dur = 0.18 if open_hat else 0.055
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    noise_raw = rng.standard_normal(n) if rng else np.random.randn(n)
    hp = noise_raw - np.convolve(noise_raw, np.ones(6) / 6.0, mode="same")
    env = np.minimum(1.0, t / 0.002) * np.exp(-t * (16.0 if open_hat else 58.0))
    sig = hp * env * amp
    return sig * 0.9, sig * 1.1


# ==================== FOLEY & UI SFX SYNTHESIZERS ====================

def sfx_pop(pitch_hz: float = 520.0, amp: float = 0.11):
    dur = 0.085
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    freq = pitch_hz * (0.65 + 0.75 * (1.0 - np.exp(-t * 42.0)))
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    env = np.minimum(1.0, t / 0.003) * np.exp(-t * 36.0)
    sig = np.sin(phase) * env * amp
    return sig, sig


def sfx_boing(amp: float = 0.11):
    dur = 0.22
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    freq = 320.0 + 140.0 * np.sin(2 * np.pi * 16.0 * t) * np.exp(-t * 10.0)
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    env = np.minimum(1.0, t / 0.004) * np.exp(-t * 14.0)
    sig = (0.75 * np.sin(phase) + 0.25 * np.sin(2 * phase)) * env * amp
    return sig, sig


def sfx_paper_whoosh(dur: float = 0.26, amp: float = 0.075, pan_dir: float = 1.0, rng: np.random.Generator = None):
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    raw = rng.standard_normal(n) if rng else np.random.randn(n)
    # Crisp paper rustle filter
    filt = np.convolve(raw, [0.2, 0.6, 0.2], mode="same") - np.convolve(raw, np.ones(16) / 16.0, mode="same")
    env = np.sin(np.pi * (t / dur)) ** 1.6
    pan = np.linspace(-0.4 * pan_dir, 0.4 * pan_dir, n)
    sig = filt * env * amp
    return sig * (0.75 - 0.25 * pan), sig * (0.75 + 0.25 * pan)


def sfx_tape_slap(amp: float = 0.095, rng: np.random.Generator = None):
    dur = 0.09
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    raw = rng.standard_normal(n) if rng else np.random.randn(n)
    snap = (raw - np.convolve(raw, np.ones(8) / 8.0, mode="same")) * np.exp(-t * 55.0)
    thump = np.sin(2 * np.pi * 240.0 * t) * np.exp(-t * 45.0) * 0.6
    sig = (snap * 0.65 + thump) * amp
    return sig, sig


def sfx_click(amp: float = 0.12):
    dur = 0.045
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    c1 = np.sin(2 * np.pi * 1450.0 * t) * np.exp(-t * 140.0)
    c2 = np.sin(2 * np.pi * 920.0 * np.maximum(0.0, t - 0.014)) * np.exp(-np.maximum(0.0, t - 0.014) * 160.0) * (t >= 0.014)
    sig = (c1 + 0.65 * c2) * amp
    return sig, sig


def sfx_key_tick(pitch: float = 1100.0, amp: float = 0.045):
    dur = 0.025
    n = int(SAMPLE_RATE * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    sig = np.sin(2 * np.pi * pitch * t) * np.exp(-t * 180.0) * amp
    return sig, sig


def sfx_chime(notes=(77, 81, 84, 89), step_sec: float = 0.055, amp: float = 0.085):
    dur = step_sec * len(notes) + 0.45
    n = int(SAMPLE_RATE * dur)
    out_l = np.zeros(n, dtype=np.float64)
    out_r = np.zeros(n, dtype=np.float64)
    for i, note in enumerate(notes):
        sl, sr = synth_music_box_bell(note, 0.42, amp=amp, pan=-0.25 + 0.5 * (i / max(1, len(notes) - 1)))
        idx = int(i * step_sec * SAMPLE_RATE)
        end = min(n, idx + len(sl))
        out_l[idx:end] += sl[:end - idx]
        out_r[idx:end] += sr[:end - idx]
    return out_l, out_r


def build_soundtrack():
    rng = np.random.default_rng(20261107)
    mix_l = np.zeros(TOTAL_SAMPLES, dtype=np.float64)
    mix_r = np.zeros(TOTAL_SAMPLES, dtype=np.float64)

    # Chord progression per bar (28 bars total, 2.0s per bar):
    # Warm F Major / D minor / C Major progression:
    # Bar A: Fmaj9 [F3, A3, C4, E4, G4] (53, 57, 60, 64, 67)
    # Bar B: G13   [G3, B3, D4, F4, E4] (55, 59, 62, 65, 69)
    # Bar C: Em7   [E3, G3, B3, D4, G4] (52, 55, 59, 62, 67)
    # Bar D: Am7   [A3, C4, E4, G4, C5] (57, 60, 64, 67, 72)
    chords_cycle = [
        ([53, 57, 60, 64, 67], 41),  # Fmaj9, bass F2
        ([55, 59, 62, 65, 69], 43),  # G13,   bass G2
        ([52, 55, 59, 62, 67], 40),  # Em7,   bass E2
        ([57, 60, 64, 67, 72], 45),  # Am7,   bass A2
        ([50, 53, 57, 60, 64], 38),  # Dm9,   bass D2
        ([55, 59, 62, 65, 67], 43),  # G7,    bass G2
        ([48, 52, 55, 59, 64], 36),  # Cmaj9, bass C2
        ([52, 55, 58, 60, 64], 36),  # C7,    bass C2
    ]

    # Catchy 8-bar melody motif (in 16th-note grid steps 0..15 per bar)
    # Each tuple: (step_16th, midi_note, dur_16ths)
    melody_bars = [
        # Bar 0 (Fmaj9): Playful rising motif "把你的歌单带走"
        [(0, 77, 3), (3, 79, 3), (6, 81, 2), (8, 84, 4), (12, 81, 4)],
        # Bar 1 (G13): Bouncy answer
        [(0, 79, 3), (3, 77, 3), (6, 74, 2), (8, 76, 4), (12, 79, 4)],
        # Bar 2 (Em7): Syncopated hop
        [(0, 76, 2), (2, 79, 2), (4, 83, 4), (8, 81, 3), (11, 79, 3), (14, 76, 2)],
        # Bar 3 (Am7): Warm turn-around
        [(0, 81, 4), (4, 84, 4), (8, 88, 4), (12, 84, 4)],
        # Bar 4 (Dm9): Cozy descending cascade
        [(0, 86, 3), (3, 84, 3), (6, 81, 2), (8, 77, 4), (12, 74, 4)],
        # Bar 5 (G7): Funky climb
        [(0, 74, 2), (2, 76, 2), (4, 77, 2), (6, 79, 2), (8, 81, 4), (12, 83, 4)],
        # Bar 6 (Cmaj9): Bright resolution hook
        [(0, 84, 4), (4, 79, 2), (6, 81, 2), (8, 84, 6), (14, 86, 2)],
        # Bar 7 (C7): Pickup into next phrase
        [(0, 88, 4), (4, 86, 4), (8, 84, 4), (12, 79, 2), (14, 81, 2)],
    ]

    for bar in range(28):
        bar_start = bar * 2.0
        chord_notes, bass_root = chords_cycle[bar % 8]

        # Determine section energy & instrumentation:
        # Bar 0..1: Intro (Act 1 trapped islands -> break free at bar 2 = 4.0s)
        # Bar 2..8: Act 1 reveal + Act 2 Web Parse (Groovy Rhodes + Bass + Marimba)
        # Bar 9..13: Act 3 Multi-Format Origami (Add shimmering bell arpeggio)
        # Bar 14..18: Act 4 Batch Export (Full energetic funk chorus)
        # Bar 19..23: Act 5 Desktop CLI (Chiptune lead prominent + tight pocket groove)
        # Bar 24..25: Act 6 Ecosystem (Uplifting full ensemble)
        # Bar 26..27: Act 7 Brand Finale (Warm II-V-I cadence & music-box resolve)

        if bar < 2:
            # Playful music-box / pizzicato intro
            for step in range(8):
                t0 = bar_start + step * (BEAT_SEC * 0.5)
                note = chord_notes[step % len(chord_notes)] + (12 if step % 2 == 1 else 0)
                sl, sr = synth_marimba_chip_lead(note, 0.22, amp=0.10, chip_mix=0.15, pan=-0.3 + 0.1 * step)
                add_stereo_clip(mix_l, mix_r, t0, sl, sr)
            # Soft Rhodes pad on beat 1
            rl, rr = synth_rhodes_chord(chord_notes[:4], 1.85, amp=0.09)
            add_stereo_clip(mix_l, mix_r, bar_start, rl, rr)
            if bar == 1:
                # Rising glissando into Bar 2 drop (3.5s -> 4.0s)
                gliss = [65, 67, 69, 72, 74, 77, 79, 81]
                for gi, gn in enumerate(gliss):
                    bl, br = synth_music_box_bell(gn, 0.25, amp=0.075, pan=-0.4 + 0.1 * gi)
                    add_stereo_clip(mix_l, mix_r, bar_start + 1.45 + gi * 0.065, bl, br)
            continue

        if bar == 26:
            # Cadence Bar 26 (52.0s - 54.0s): Dm9 -> G13
            rl1, rr1 = synth_rhodes_chord([50, 53, 57, 60, 64], 1.0, amp=0.13)
            rl2, rr2 = synth_rhodes_chord([55, 59, 62, 65, 69], 1.0, amp=0.13)
            add_stereo_clip(mix_l, mix_r, bar_start, rl1, rr1)
            add_stereo_clip(mix_l, mix_r, bar_start + 1.0, rl2, rr2)
            bl1, br1 = synth_funky_bass(38, 0.9, amp=0.20)
            bl2, br2 = synth_funky_bass(43, 0.9, amp=0.20)
            add_stereo_clip(mix_l, mix_r, bar_start, bl1, br1)
            add_stereo_clip(mix_l, mix_r, bar_start + 1.0, bl2, br2)
            # Cadence melody
            cad_notes = [(0, 86, 4), (4, 84, 4), (8, 83, 4), (12, 86, 4)]
            for st, mn, d16 in cad_notes:
                ml, mr = synth_marimba_chip_lead(mn, d16 * SIXTEENTH_SEC, amp=0.12, chip_mix=0.25)
                add_stereo_clip(mix_l, mix_r, bar_start + st * SIXTEENTH_SEC, ml, mr)
            # Gentle drums on beats 1, 2, 3, 4
            for b in range(4):
                kl, kr = synth_kick(amp=0.22)
                add_stereo_clip(mix_l, mix_r, bar_start + b * BEAT_SEC, kl, kr)
            continue

        if bar == 27:
            # Final Bar 27 (54.0s - 56.0s): Warm resolving Fmaj9 chord + sparkling music box coda!
            final_chord = [53, 57, 60, 64, 67, 72]
            rl, rr = synth_rhodes_chord(final_chord, 1.85, amp=0.15)
            add_stereo_clip(mix_l, mix_r, bar_start, rl, rr)
            bl, br = synth_funky_bass(41, 1.65, amp=0.21)
            add_stereo_clip(mix_l, mix_r, bar_start, bl, br)
            kl, kr = synth_kick(amp=0.22)
            add_stereo_clip(mix_l, mix_r, bar_start, kl, kr)

            # Sparkling music-box arpeggio F5 - A5 - C6 - E6 - G6 - F6
            coda_arp = [77, 81, 84, 88, 91, 89]
            for i, note in enumerate(coda_arp):
                t_arp = bar_start + i * 0.11
                mbl, mbr = synth_music_box_bell(note, 1.35 - i * 0.12, amp=0.095, pan=-0.35 + 0.14 * i)
                add_stereo_clip(mix_l, mix_r, t_arp, mbl, mbr)
            continue

        # Standard Groovy Bars (Bars 2..25):
        # 1. Rhodes Chords (syncopated comping on beat 1 and beat 2.5)
        rl1, rr1 = synth_rhodes_chord(chord_notes, 0.72, amp=0.125)
        rl2, rr2 = synth_rhodes_chord(chord_notes, 1.15, amp=0.115)
        add_stereo_clip(mix_l, mix_r, bar_start, rl1, rr1)
        add_stereo_clip(mix_l, mix_r, bar_start + 1.5 * BEAT_SEC, rl2, rr2)

        # 2. Funky Syncopated Bassline (16th-note groove)
        bass_pattern = [
            (0, bass_root, 3, False),
            (3, bass_root + 12, 2, True),
            (6, bass_root, 2, False),
            (8, bass_root + 7, 3, False),
            (11, bass_root + 10, 2, True),
            (14, bass_root + 12, 2, True),
        ]
        for st, bnote, d16, is_slap in bass_pattern:
            bl, br = synth_funky_bass(bnote, d16 * SIXTEENTH_SEC * 0.92, amp=0.20, slap=is_slap)
            add_stereo_clip(mix_l, mix_r, bar_start + st * SIXTEENTH_SEC, bl, br)

        # 3. Pocket Drums (Kick, Snare/Clap, 16th Shaker/Hi-Hat)
        for k_step in (0, 6, 8, 11):
            kl, kr = synth_kick(amp=0.24 if k_step in (0, 8) else 0.18)
            add_stereo_clip(mix_l, mix_r, bar_start + k_step * SIXTEENTH_SEC, kl, kr)

        for s_step in (4, 12):
            sl, sr = synth_snare_clap(amp=0.135, rng=rng)
            add_stereo_clip(mix_l, mix_r, bar_start + s_step * SIXTEENTH_SEC, sl, sr)

        for h_step in range(16):
            swing = 0.015 if (h_step % 2 == 1) else 0.0
            is_open = (h_step == 14 and bar % 2 == 1)
            hl, hr = synth_hihat(amp=0.042 if h_step % 2 == 0 else 0.028, open_hat=is_open, rng=rng)
            add_stereo_clip(mix_l, mix_r, bar_start + h_step * SIXTEENTH_SEC + swing, hl, hr)

        # 4. Lead Melody (Marimba + Light Chiptune blend)
        is_cli_section = (19 <= bar <= 23)
        chip_blend = 0.62 if is_cli_section else (0.42 if bar >= 14 else 0.28)
        notes_in_bar = melody_bars[bar % 8]
        for st, mnote, d16 in notes_in_bar:
            ml, mr = synth_marimba_chip_lead(
                mnote,
                d16 * SIXTEENTH_SEC * 0.95,
                amp=0.115,
                chip_mix=chip_blend,
                pan=0.15 * math.sin(st),
            )
            add_stereo_clip(mix_l, mix_r, bar_start + st * SIXTEENTH_SEC, ml, mr)

        # 5. Shimmering Bell Counter-Arpeggio during Multi-Format (9..13), Batch (14..18), and Ecosystem (24..25)
        if (9 <= bar <= 18) or (24 <= bar <= 25):
            for a_step in range(0, 16, 2):
                anote = chord_notes[(a_step // 2) % len(chord_notes)] + 12
                al, ar = synth_music_box_bell(
                    anote,
                    0.24,
                    amp=0.052,
                    pan=-0.35 if (a_step % 4 == 0) else 0.35,
                )
                add_stereo_clip(mix_l, mix_r, bar_start + a_step * SIXTEENTH_SEC, al, ar)

    # ==================== FRAME-LOCKED FOLEY & UI SOUND EFFECTS ====================
    # Helper to convert 30fps frame number to seconds
    def f2s(frame: float) -> float:
        return frame / FPS

    # Act 1 (Frames 0-225):
    for i, f in enumerate([10, 20, 30, 40, 50, 60]):
        pl, pr = sfx_pop(420.0 + i * 45.0, amp=0.085)
        add_stereo_clip(mix_l, mix_r, f2s(f), pl, pr)
    # Hero Note bonks against platform fence
    add_stereo_clip(mix_l, mix_r, f2s(76), *sfx_boing(amp=0.095))
    add_stereo_clip(mix_l, mix_r, f2s(94), *sfx_boing(amp=0.095))
    # Hero Note slices cages & unfolds SearchNote
    add_stereo_clip(mix_l, mix_r, f2s(112), *sfx_paper_whoosh(0.30, amp=0.085, pan_dir=1.0, rng=rng))
    add_stereo_clip(mix_l, mix_r, f2s(135), *sfx_tape_slap(amp=0.09, rng=rng))
    add_stereo_clip(mix_l, mix_r, f2s(148), *sfx_tape_slap(amp=0.09, rng=rng))
    for i, f in enumerate([156, 164, 172, 180, 188, 196]):
        add_stereo_clip(mix_l, mix_r, f2s(f), *sfx_pop(540.0 + i * 35.0, amp=0.075))

    # Act 2 (Frames 225-570): Web Parse Flow
    add_stereo_clip(mix_l, mix_r, f2s(242), *sfx_paper_whoosh(0.24, amp=0.075, pan_dir=-1.0, rng=rng))
    add_stereo_clip(mix_l, mix_r, f2s(272), *sfx_pop(620.0, amp=0.09))
    add_stereo_clip(mix_l, mix_r, f2s(330), *sfx_click(amp=0.12))  # Click '解析'
    add_stereo_clip(mix_l, mix_r, f2s(376), *sfx_paper_whoosh(0.32, amp=0.085, pan_dir=1.0, rng=rng))  # ResultPaper unfolds
    add_stereo_clip(mix_l, mix_r, f2s(384), *sfx_chime((77, 81, 84), step_sec=0.045, amp=0.07))
    for i, f in enumerate([408, 422, 436, 450, 464]):
        add_stereo_clip(mix_l, mix_r, f2s(f), *sfx_pop(480.0 + i * 40.0, amp=0.065))
    add_stereo_clip(mix_l, mix_r, f2s(488), *sfx_pop(720.0, amp=0.08))
    add_stereo_clip(mix_l, mix_r, f2s(510), *sfx_pop(660.0, amp=0.08))
    add_stereo_clip(mix_l, mix_r, f2s(535), *sfx_click(amp=0.09))
    add_stereo_clip(mix_l, mix_r, f2s(550), *sfx_click(amp=0.09))

    # Act 3 (Frames 570-855): Multi-Format Origami Export
    add_stereo_clip(mix_l, mix_r, f2s(570), *sfx_click(amp=0.12))  # Click '导出 ↓'
    add_stereo_clip(mix_l, mix_r, f2s(580), *sfx_paper_whoosh(0.32, amp=0.09, pan_dir=1.0, rng=rng))
    add_stereo_clip(mix_l, mix_r, f2s(605), *sfx_tape_slap(amp=0.085, rng=rng))
    add_stereo_clip(mix_l, mix_r, f2s(650), *sfx_paper_whoosh(0.24, amp=0.075, pan_dir=-1.0, rng=rng))
    for i, f in enumerate([735, 750, 765, 780]):
        add_stereo_clip(mix_l, mix_r, f2s(f), *sfx_pop(520.0 + i * 55.0, amp=0.085))
    add_stereo_clip(mix_l, mix_r, f2s(810), *sfx_chime((77, 81, 84, 89), step_sec=0.05, amp=0.075))

    # Act 4 (Frames 855-1140): Batch Export (Collection -> Multi-Sheet Excel & ZIP)
    add_stereo_clip(mix_l, mix_r, f2s(858), *sfx_paper_whoosh(0.30, amp=0.085, pan_dir=-1.0, rng=rng))
    for i, f in enumerate([915, 924, 933, 942, 951, 960]):
        add_stereo_clip(mix_l, mix_r, f2s(f), *sfx_pop(580.0 + i * 30.0, amp=0.065))
    add_stereo_clip(mix_l, mix_r, f2s(988), *sfx_click(amp=0.12))  # Click '一键打包导出'
    add_stereo_clip(mix_l, mix_r, f2s(1032), *sfx_paper_whoosh(0.28, amp=0.085, pan_dir=1.0, rng=rng))
    add_stereo_clip(mix_l, mix_r, f2s(1050), *sfx_chime((74, 79, 83, 86), step_sec=0.05, amp=0.08))
    add_stereo_clip(mix_l, mix_r, f2s(1070), *sfx_tape_slap(amp=0.085, rng=rng))

    # Act 5 (Frames 1140-1455): Desktop CLI
    add_stereo_clip(mix_l, mix_r, f2s(1142), *sfx_paper_whoosh(0.28, amp=0.085, pan_dir=1.0, rng=rng))
    for i, f in enumerate([1168, 1178, 1188]):
        add_stereo_clip(mix_l, mix_r, f2s(f), *sfx_pop(560.0 + i * 60.0, amp=0.08))
    # CLI typing keystrokes
    for k_idx in range(14):
        add_stereo_clip(mix_l, mix_r, f2s(1218 + k_idx * 2.5), *sfx_key_tick(1050.0 + (k_idx % 4) * 90.0, amp=0.042))
    add_stereo_clip(mix_l, mix_r, f2s(1265), *sfx_chime((76, 81, 84), step_sec=0.04, amp=0.075))
    for k_idx in range(5):
        add_stereo_clip(mix_l, mix_r, f2s(1322 + k_idx * 3.0), *sfx_key_tick(1150.0 + k_idx * 60.0, amp=0.045))
    add_stereo_clip(mix_l, mix_r, f2s(1355), *sfx_chime((77, 81, 84, 89), step_sec=0.045, amp=0.085))
    add_stereo_clip(mix_l, mix_r, f2s(1395), *sfx_tape_slap(amp=0.08, rng=rng))

    # Act 6 (Frames 1455-1605): Third-Party Ecosystem & Extensions
    add_stereo_clip(mix_l, mix_r, f2s(1456), *sfx_paper_whoosh(0.28, amp=0.085, pan_dir=-1.0, rng=rng))
    for i, f in enumerate([1476, 1496, 1516, 1540, 1560]):
        add_stereo_clip(mix_l, mix_r, f2s(f), *sfx_pop(540.0 + i * 45.0, amp=0.08))

    # Act 7 (Frames 1605-1680): Brand Finale
    add_stereo_clip(mix_l, mix_r, f2s(1606), *sfx_paper_whoosh(0.30, amp=0.08, pan_dir=1.0, rng=rng))
    add_stereo_clip(mix_l, mix_r, f2s(1618), *sfx_tape_slap(amp=0.085, rng=rng))

    # Master bus gentle warm saturation + fade-in (0.15s) & natural tail fade-out (last 0.45s)
    fade_in = int(0.15 * SAMPLE_RATE)
    fade_out = int(0.45 * SAMPLE_RATE)
    mix_l[:fade_in] *= np.linspace(0.0, 1.0, fade_in)
    mix_r[:fade_in] *= np.linspace(0.0, 1.0, fade_in)
    mix_l[-fade_out:] *= np.linspace(1.0, 0.0, fade_out) ** 1.5
    mix_r[-fade_out:] *= np.linspace(1.0, 0.0, fade_out) ** 1.5

    # Normalize to -1.5 dBFS peak cleanly
    peak = max(float(np.max(np.abs(mix_l))), float(np.max(np.abs(mix_r))), 1e-6)
    target_peak = 0.84
    mix_l = np.tanh(mix_l / peak * 1.15) * target_peak
    mix_r = np.tanh(mix_r / peak * 1.15) * target_peak

    return mix_l, mix_r


def main():
    assets_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets")
    os.makedirs(assets_dir, exist_ok=True)
    wav_path = os.path.join(assets_dir, "soundtrack.wav")
    mp3_path = os.path.join(assets_dir, "soundtrack.mp3")

    print("Synthesizing 56.0s 120 BPM original soundtrack + Foley SFX...")
    mix_l, mix_r = build_soundtrack()

    stereo = np.empty((TOTAL_SAMPLES, 2), dtype=np.int16)
    stereo[:, 0] = np.clip(mix_l * 32767.0, -32768, 32767).astype(np.int16)
    stereo[:, 1] = np.clip(mix_r * 32767.0, -32768, 32767).astype(np.int16)

    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(stereo.tobytes())

    print(f"[OK] Wrote {wav_path} ({os.path.getsize(wav_path)} bytes)")

    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", wav_path,
            "-c:a", "libmp3lame",
            "-b:a", "320k",
            mp3_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"[OK] Wrote {mp3_path} ({os.path.getsize(mp3_path)} bytes)")


if __name__ == "__main__":
    main()
