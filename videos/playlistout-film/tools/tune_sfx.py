import sys
from pathlib import Path
import math
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
SR = 48000

def sec(s: float) -> int:
    return max(1, int(round(s * SR)))

def fade_edges(x: np.ndarray, in_s: float = 0.005, out_s: float = 0.015) -> np.ndarray:
    n_in = min(len(x) // 2, sec(in_s))
    n_out = min(len(x) // 2, sec(out_s))
    y = x.copy()
    if n_in > 0:
        y[:n_in] *= np.linspace(0.0, 1.0, n_in)
    if n_out > 0:
        y[-n_out:] *= np.linspace(1.0, 0.0, n_out)
    return y

def env(n: int, a_s: float, d_s: float, curve: float = 2.0) -> np.ndarray:
    na = sec(a_s)
    nd = max(1, n - na)
    atk = np.linspace(0.0, 1.0, na) ** (1.0 / curve) if na > 0 else np.array([])
    dec = np.linspace(1.0, 0.0, nd) ** curve
    return np.concatenate([atk, dec])[:n]

def noise(n: int) -> np.ndarray:
    rng = np.random.default_rng(42)
    return rng.standard_normal(n)

def fft_filter(x: np.ndarray, low: float = 20.0, high: float = 20000.0) -> np.ndarray:
    n = len(x)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    fft = np.fft.rfft(x)
    mask = (freqs >= low) & (freqs <= high)
    return np.fft.irfft(fft * mask, n)

# ----------------- REFINED SOUND GENERATORS -----------------

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

def pop_sfx(amp: float = 0.14) -> np.ndarray:
    """Perky upward bubble pop."""
    n = sec(0.09)
    t = np.arange(n, dtype=np.float64) / SR
    f = 450.0 + 1400.0 * (1.0 - np.exp(-t * 45.0))
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) * np.exp(-t * 38.0) * amp
    return fade_edges(sig, 0.001, 0.015)

def paper_flip(dur: float = 0.28, amp: float = 0.12) -> np.ndarray:
    """Crisp stationery paper rustle."""
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    nz = noise(n)
    sweep = fft_filter(nz, 1000, 5500)
    envl = (np.sin(np.pi * np.minimum(1.0, t / dur)) ** 1.6) * (0.75 + 0.25 * np.sin(2 * np.pi * 4.0 * t))
    sig = sweep * envl * amp
    return fade_edges(sig, 0.008, 0.04)

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

def sfx_retro_button(freq: float = 1200.0, amp: float = 0.22, dur: float = 0.065) -> np.ndarray:
    n = sec(dur)
    t = np.arange(n, dtype=np.float64) / SR
    tone = 0.68 * np.sin(2 * np.pi * freq * t) + 0.30 * np.sin(2 * np.pi * (freq * 1.5) * t)
    snap = fft_filter(noise(n), 1400, 7500) * np.exp(-t * 220.0) * 0.12
    e = env(n, 0.002, 0.038, 1.4)
    sig = (tone + snap) * e
    return fade_edges(sig * amp, 0.001, 0.01)

def k_weight(sig: np.ndarray) -> np.ndarray:
    freqs = np.fft.rfftfreq(len(sig), 1.0 / SR)
    fft = np.fft.rfft(sig)
    shelf_gain = 10 ** (4.0 / 20.0)
    shelf = 1.0 + (shelf_gain - 1.0) / (1.0 + (1500.0 / np.maximum(freqs, 1.0)) ** 2)
    hp = 1.0 / (1.0 + (80.0 / np.maximum(freqs, 1.0)) ** 4)
    return np.fft.irfft(fft * shelf * hp, len(sig))

def analyze(name: str, sig: np.ndarray):
    dur = len(sig) / SR
    peak = float(np.max(np.abs(sig)))
    rms = math.sqrt(float(np.mean(sig ** 2)))
    k_sig = k_weight(sig)
    k_rms = math.sqrt(float(np.mean(k_sig ** 2)))
    
    peak_db = 20 * math.log10(max(peak, 1e-9))
    rms_db = 20 * math.log10(max(rms, 1e-9))
    k_rms_db = 20 * math.log10(max(k_rms, 1e-9))
    
    fft = np.abs(np.fft.rfft(sig))
    freqs = np.fft.rfftfreq(len(sig), 1.0 / SR)
    centroid = float(np.sum(freqs * fft) / (np.sum(fft) + 1e-9))
    
    return {
        "name": name,
        "dur_ms": dur * 1000,
        "peak_db": peak_db,
        "rms_db": rms_db,
        "k_rms_db": k_rms_db,
        "centroid": centroid,
    }

tests = [
    ("click_sfx (typing key)", click_sfx(0.040, 1800.0, 0.10)),
    ("click_sfx (heavy bottom snap)", click_sfx(0.065, 1400.0, 0.16)),
    ("pop_sfx (bubble pop)", pop_sfx(0.14)),
    ("paper_flip (stationery)", paper_flip(0.28, 0.12)),
    ("whoosh_sfx (scene transition)", whoosh_sfx(0.32, 0.14, True)),
    ("stamp_sfx (rubber slap)", stamp_sfx(0.20)),
    ("zipper_sfx (interlock pull)", zipper_sfx(0.65, 0.16)),
    ("sfx_boing_jump (mascot leap)", sfx_boing_jump(280.0, 620.0, 0.20, 0.14)),
    ("sfx_mascot_swoosh (cartoon 咻)", sfx_mascot_swoosh(0.22, 0.14, True)),
    ("sfx_scroll_glide (songlist flurry)", sfx_scroll_glide(1.90, 0.16)),
    ("sfx_retro_button (arcade 哔)", sfx_retro_button(1100.0, 0.22)),
]

print(f"{'SFX Generator':<35} | {'Dur(ms)':<7} | {'Peak(dB)':<8} | {'RMS(dB)':<8} | {'K-RMS(dB)':<9} | {'Centroid(Hz)'}")
print("-" * 88)
for name, sig in tests:
    r = analyze(name, sig)
    print(f"{r['name']:<35} | {r['dur_ms']:7.1f} | {r['peak_db']:8.1f} | {r['rms_db']:8.1f} | {r['k_rms_db']:9.1f} | {r['centroid']:12.0f}")
