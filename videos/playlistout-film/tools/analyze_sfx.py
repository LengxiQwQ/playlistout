import sys
from pathlib import Path
import math
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

import make_score

SR = make_score.SR

def k_weight(sig: np.ndarray) -> np.ndarray:
    freqs = np.fft.rfftfreq(len(sig), 1.0 / SR)
    fft = np.fft.rfft(sig)
    shelf_gain = 10 ** (4.0 / 20.0)
    shelf = 1.0 + (shelf_gain - 1.0) / (1.0 + (1500.0 / np.maximum(freqs, 1.0)) ** 2)
    hp = 1.0 / (1.0 + (80.0 / np.maximum(freqs, 1.0)) ** 4)
    return np.fft.irfft(fft * shelf * hp, len(sig))

def analyze_signal(name: str, sig: np.ndarray):
    dur = len(sig) / SR
    peak = float(np.max(np.abs(sig)))
    rms = math.sqrt(float(np.mean(sig ** 2)))
    k_sig = k_weight(sig)
    k_rms = math.sqrt(float(np.mean(k_sig ** 2)))
    
    peak_db = 20 * math.log10(max(peak, 1e-9))
    rms_db = 20 * math.log10(max(rms, 1e-9))
    k_rms_db = 20 * math.log10(max(k_rms, 1e-9))
    crest = peak_db - rms_db
    
    fft = np.abs(np.fft.rfft(sig))
    freqs = np.fft.rfftfreq(len(sig), 1.0 / SR)
    centroid = float(np.sum(freqs * fft) / (np.sum(fft) + 1e-9))
    
    energy_total = np.sum(fft ** 2) + 1e-9
    e_low = np.sum(fft[freqs < 500] ** 2) / energy_total * 100
    e_mid = np.sum(fft[(freqs >= 500) & (freqs < 2000)] ** 2) / energy_total * 100
    e_highmid = np.sum(fft[(freqs >= 2000) & (freqs < 6000)] ** 2) / energy_total * 100
    e_air = np.sum(fft[freqs >= 6000] ** 2) / energy_total * 100
    
    return {
        "name": name,
        "dur_ms": dur * 1000,
        "peak_db": peak_db,
        "rms_db": rms_db,
        "k_rms_db": k_rms_db,
        "crest": crest,
        "centroid": centroid,
        "e_low": e_low,
        "e_mid": e_mid,
        "e_highmid": e_highmid,
        "e_air": e_air,
    }

tests = [
    ("click_sfx (typing 1600Hz)", make_score.click_sfx(0.038, 1600.0, 0.10)),
    ("click_sfx (snap bottom 1850Hz)", make_score.click_sfx(0.065, 1850.0, 0.14)),
    ("pop_sfx (bubble pop 0.14)", make_score.pop_sfx(0.14)),
    ("paper_flip (stationery 0.12)", make_score.paper_flip(0.28, 0.12)),
    ("whoosh_sfx (scene transition 0.14)", make_score.whoosh_sfx(0.32, 0.14, True)),
    ("stamp_sfx (rubber slap 0.18)", make_score.stamp_sfx(0.18)),
    ("zipper_sfx (interlock pull 0.16)", make_score.zipper_sfx(0.65, 0.16)),
    ("sfx_boing_jump (280->620, 0.14)", make_score.sfx_boing_jump(280.0, 620.0, 0.20, 0.14)),
    ("sfx_mascot_swoosh (0.24, 0.14)", make_score.sfx_mascot_swoosh(0.24, 0.14)),
    ("sfx_scroll_glide (2.0s, 0.16)", make_score.sfx_scroll_glide(2.00, 0.16)),
    ("sfx_retro_button (1100Hz, 0.22)", make_score.sfx_retro_button(1100.0, 0.22)),
    ("sfx_retro_button (1320Hz, 0.22)", make_score.sfx_retro_button(1320.0, 0.22)),
    ("sfx_retro_button (880Hz, 0.22)", make_score.sfx_retro_button(880.0, 0.22)),
    ("sfx_success_fanfare (4 notes, 0.12)", make_score.sfx_success_fanfare(["C5", "E5", "G5", "C6"], spacing=0.075, amp=0.12)),
    ("sfx_celebration_firework (0.24)", make_score.sfx_celebration_firework(0.24)),
    ("marimba (C6, 0.16s, 0.10)", make_score.marimba("C6", 0.16, 0.10)),
    ("glock (C6, 0.4s, 0.040)", make_score.glock("C6", 0.4, 0.040)),
    ("glock (C7, 0.8s, 0.085)", make_score.glock("C7", 0.8, 0.085)),
]

print(f"{'SFX Generator':<36} | {'Dur(ms)':<7} | {'Peak(dB)':<8} | {'RMS(dB)':<8} | {'K-RMS(dB)':<9} | {'Crest':<5} | {'Centroid':<8} | {'Low%':<5} | {'Mid%':<5} | {'HMid%':<5} | {'Air%':<5}")
print("-" * 125)
for name, sig in tests:
    r = analyze_signal(name, sig)
    print(f"{r['name']:<36} | {r['dur_ms']:7.1f} | {r['peak_db']:8.1f} | {r['rms_db']:8.1f} | {r['k_rms_db']:9.1f} | {r['crest']:5.1f} | {r['centroid']:8.0f} | {r['e_low']:5.1f} | {r['e_mid']:5.1f} | {r['e_highmid']:5.1f} | {r['e_air']:5.1f}")
