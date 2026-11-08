"""Create a two-second paper/pencil cold-open prelude and prepend the score."""
from pathlib import Path
import wave
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "public" / "audio"
SR = 48_000
PRE = 2.0
rng = np.random.default_rng(2608)
n = int(SR * PRE)
t = np.arange(n) / SR


def bp(sig, lo, hi):
    spec = np.fft.rfft(sig)
    f = np.fft.rfftfreq(len(sig), 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, n=len(sig))


# quiet room / paper air
base = bp(rng.normal(0, 1, n), 180, 4200)
base /= max(1e-9, np.max(np.abs(base)))
base *= np.clip(t / 0.35, 0, 1) * np.clip((PRE - t) / 0.3, 0, 1) * 0.05

# pencil / paper drags
scratches = np.zeros(n)
for center, strength in [(0.42, 0.010), (0.86, 0.014), (1.28, 0.008), (1.62, 0.012)]:
    idx = int(center * SR)
    ln = int(0.12 * SR)
    b = bp(rng.normal(0, 1, ln * 2), 1200, 12000)[:ln]
    b *= np.hanning(ln) * strength
    scratches[idx:idx + ln] += b[: max(0, min(ln, n - idx))]

# gentle page settle at the end, fading exactly into the main score
page = np.zeros(n)
idx = int(1.82 * SR)
ln = int(0.16 * SR)
b = bp(rng.normal(0, 1, ln * 2), 300, 5500)[:ln]
b *= np.hanning(ln) * 0.035
page[idx:idx + ln] += b[: max(0, min(ln, n - idx))]

mono = base + scratches + page
pan = np.linspace(0.42, 0.58, n)
stereo = np.stack([mono * np.sqrt(1 - pan), mono * np.sqrt(pan)], axis=1)
stereo /= max(1e-9, np.max(np.abs(stereo)))
stereo *= 0.22

# read old score
with wave.open(str(AUDIO / "soundtrack.wav"), "rb") as fh:
    old = np.frombuffer(fh.readframes(fh.getnframes()), dtype="<i2").reshape(-1, 2).astype(np.float32) / 32768
    old_sr = fh.getframerate()
assert old_sr == SR

lead = np.zeros((int(SR * 2), 2), dtype=np.float32)
lead[:n] = stereo
full = np.concatenate([lead, old], axis=0)
full *= 0.98 / max(1.0, np.max(np.abs(full)))
with wave.open(str(AUDIO / "soundtrack-v3.wav"), "wb") as fh:
    fh.setnchannels(2)
    fh.setsampwidth(2)
    fh.setframerate(SR)
    fh.writeframes((np.clip(full, -1, 1) * 32767).astype("<i2").tobytes())
print("wrote soundtrack-v3.wav", full.shape, f"{len(full)/SR:.3f}s")
