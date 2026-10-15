"""Original soundtrack for the Cardx brag video.

120 BPM, A minor (Am-F-C-G x2, F-C), 20.0 s, 48 kHz stereo.
Music and SFX are written together: SFX are tuned to A/E and share the music's reverb.
"""
import wave
from pathlib import Path

import numpy as np

SR = 48000
DUR = 20.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(7)

L = {k: np.zeros(N) for k in ["pad", "bass", "kick", "clap", "hat", "pluck", "sfx"]}
R = {k: np.zeros(N) for k in L}


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(bus, t0, sig, gain=1.0, pan=0.0):
    """Mix a mono (or (2,n) stereo) signal into a bus at time t0, constant-power pan."""
    i0 = int(round(t0 * SR))
    if i0 >= N:
        return
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sl, sr_ = sig * np.cos(a), sig * np.sin(a)
    else:
        sl, sr_ = sig[0], sig[1]
    n = min(len(sl), N - i0)
    if i0 < 0:
        sl, sr_, n, i0 = sl[-i0:], sr_[-i0:], min(len(sl) + i0, N), 0
    L[bus][i0:i0 + n] += sl[:n] * gain
    R[bus][i0:i0 + n] += sr_[:n] * gain


def tvec(d):
    return np.arange(int(d * SR)) / SR


def bandnoise(d, lo, hi, seed=None):
    g = np.random.default_rng(seed) if seed is not None else rng
    n = int(d * SR)
    spec = np.fft.rfft(g.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    mask = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    out = np.fft.irfft(spec * mask, n)
    return out / (np.abs(out).max() + 1e-9)


def sweep(d, f0, f1, width=0.7):
    """Noise whose band centre glides from f0 to f1 (grain overlap-add)."""
    n = int(d * SR)
    out = np.zeros(n + 4096)
    hop, size = 512, 2048
    win = np.hanning(size)
    for i in range(0, n, hop):
        c = f0 * (f1 / f0) ** (i / n)
        out[i:i + size] += bandnoise(size / SR, c * (1 - width / 2), c * (1 + width / 2)) * win
    return out[:n] / (np.abs(out).max() + 1e-9)


# ---------------------------------------------------------------- harmony
CH = {
    "Am": ([57, 60, 64], 45),
    "F": ([57, 60, 65], 41),
    "C": ([55, 60, 64], 36),
    "G": ([55, 59, 62], 43),
}
PROG = ["Am", "F", "C", "G", "Am", "F", "C", "G", "F", "C"]  # one chord per 2 s bar


def saw_soft(freq, t, partials=10, bright=0.28):
    s = np.zeros_like(t)
    for k in range(1, partials + 1):
        if freq * k > 9000:
            break
        s += np.sin(2 * np.pi * freq * k * t) / k * np.exp(-k * bright)
    return s


# Pad: detuned soft saws, wide stereo, one chord per bar
for b, name in enumerate(PROG):
    notes, _ = CH[name]
    t0 = b * 2.0
    d = 2.35
    t = tvec(d)
    att = 0.9 if b == 0 else 0.12
    env = np.minimum(1, t / att) * np.clip((d - t) / 0.35, 0, 1)
    if b == 9:  # final chord rings and fades to the end
        env = np.minimum(1, t / att) * np.clip((DUR - t0 - t) / 0.9, 0, 1) ** 1.5
    left = sum(saw_soft(midi(m) * 2 ** (4 / 1200), t) + 0.5 * saw_soft(midi(m) * 2 ** (-9 / 1200), t) for m in notes)
    right = sum(saw_soft(midi(m) * 2 ** (-4 / 1200), t) + 0.5 * saw_soft(midi(m) * 2 ** (9 / 1200), t) for m in notes)
    lvl = 0.55 if b == 0 else 1.0
    add("pad", t0, np.vstack([left * env, right * env]), 0.09 * lvl)

# Bass: half notes into the drop, eighths once the groove starts
for b, name in enumerate(PROG):
    _, root = CH[name]
    f = midi(root)
    bar0 = b * 2.0
    hits = [x for x in (bar0, bar0 + 1.0) if 1.0 <= x < 3.0]
    hits += [bar0 + i * 0.25 for i in range(8) if 3.0 <= bar0 + i * 0.25 < 19.0]
    for h in hits:
        dd = 0.9 if h < 3.0 else 0.24
        t = tvec(dd)
        env = np.minimum(1, t / 0.005) * np.exp(-t / (0.5 if h < 3.0 else 0.15))
        s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
        add("bass", h, np.tanh(1.6 * s) * env, 0.22)

# ---------------------------------------------------------------- drums


def kick(amp=1.0, d=0.45):
    t = tvec(d)
    f = 46 + 95 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.17)
    click = bandnoise(d, 2000, 8000) * np.exp(-t / 0.004) * 0.25
    return (body + click) * amp


KICKS = [1.0, 2.0] + [3.0 + i * BEAT for i in range(32)] + [19.0]
for k in KICKS:
    big = k in (1.0, 16.5, 19.0)
    add("kick", k, kick(1.0 if big else 0.8, 0.6 if big else 0.4), 0.36)


def clap():
    d = 0.35
    t = tvec(d)
    nz = bandnoise(d, 900, 3200)
    env = np.zeros_like(t)
    for off in (0.0, 0.011, 0.023):
        env += (t >= off) * np.exp(-np.maximum(t - off, 0) / 0.012)
    env += (t >= 0.023) * np.exp(-np.maximum(t - 0.023, 0) / 0.11) * 0.5
    return nz * env


for bar in range(1, 10):
    for beat in (0.5, 1.5):
        tt = bar * 2.0 + beat
        if 3.0 <= tt < 19.0:
            add("clap", tt, clap(), 0.26, pan=-0.05)
for i, tt in enumerate([16.0, 16.125, 16.25, 16.375]):  # fill into the outro
    add("clap", tt, clap(), 0.06 + 0.03 * i, pan=0.1)


def hat(open_=False):
    d = 0.2 if open_ else 0.06
    t = tvec(d)
    return bandnoise(d, 7000, 16000) * np.exp(-t / (0.06 if open_ else 0.022))


for i in range(64):
    tt = 3.0 + i * BEAT + 0.25
    if tt < 19.0:
        add("hat", tt, hat(open_=(i % 4 == 3)), 0.13, pan=0.35)
for i in range(16):  # light closed hats in the hook section
    tt = 1.0 + i * 0.125
    if tt < 3.0:
        add("hat", tt, hat(), 0.025 + 0.02 * (i % 2 == 1), pan=0.35)

# ---------------------------------------------------------------- pluck arpeggio (highlights)
step = 0.125
tt = 6.5
i = 0
while tt < 16.5 - 1e-6:
    b = int(tt // 2.0)
    notes, _ = CH[PROG[b]]
    seq = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 24]
    f = midi(seq[i % 4])
    t = tvec(0.3)
    s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.08) * np.minimum(1, t / 0.003)
    add("pluck", tt, s, 0.075, pan=0.45 if i % 2 else -0.45)
    tt += step
    i += 1

# ---------------------------------------------------------------- SFX (tuned to A / E)
# Riser into the claw drop, and into the outro
for t0, d, gain in ((0.0, 1.0, 0.32), (15.85, 0.65, 0.16)):
    r = sweep(d, 300, 4500, 0.6) * np.linspace(0, 1, int(d * SR)) ** 2
    add("sfx", t0, r, gain)

# Claw clamp at 1.0 s: metallic partials on A3 + body thump
t = tvec(1.2)
metal = sum(a * np.sin(2 * np.pi * 220 * r * t) * np.exp(-t / dcy)
            for r, a, dcy in ((1.0, 1.0, 0.45), (2.0, 0.5, 0.35), (2.76, 0.35, 0.25), (5.40, 0.18, 0.15), (8.93, 0.08, 0.08)))
metal += bandnoise(1.2, 1800, 6000) * np.exp(-t / 0.02) * 0.6
add("sfx", 1.0, metal, 0.12)

# Outro impact at 16.5 s: soft crash
t = tvec(1.6)
add("sfx", 16.5, bandnoise(1.6, 3000, 11000) * np.exp(-t / 0.5), 0.07, pan=0.1)

# Whooshes ending on each scene change
for b in (3.0, 6.5, 10.0, 13.5, 16.5):
    d = 0.4
    w = sweep(d, 500, 3200, 0.5) * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 2
    add("sfx", b - 0.3, w, 0.06 if b in (3.0, 16.5) else 0.04, pan=-0.2 if b % 2 else 0.2)

# Count-up ticks (E6), kept well in the background
for a, z in ((6.75, 7.75), (10.6, 11.6)):
    tt = a
    while tt < z:
        t = tvec(0.03)
        add("sfx", tt, np.sin(2 * np.pi * midi(88) * t) * np.exp(-t / 0.006), 0.018, pan=0.15)
        tt += 0.0625

# Card flicks as the trio fans out
for j, tt in enumerate((14.0, 14.07, 14.14)):
    t = tvec(0.12)
    add("sfx", tt, bandnoise(0.12, 1500, 6000) * np.exp(-t / 0.03), 0.06, pan=(j - 1) * 0.5)

# Button click at 18.7 s (E5 + thump)
t = tvec(0.2)
click = np.sin(2 * np.pi * midi(76) * t) * np.exp(-t / 0.03) + 0.5 * np.sin(2 * np.pi * midi(88) * t) * np.exp(-t / 0.012)
click += np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.05) * 0.8
add("sfx", 18.7, click, 0.11)

# ---------------------------------------------------------------- mix
# Sidechain duck from every kick
duck = np.ones(N)
tt = np.arange(N) / SR
for k in KICKS:
    m = tt >= k
    duck[m] *= 1 - 0.5 * np.exp(-(tt[m] - k) / 0.13)

for bus in ("pad", "bass", "pluck"):
    L[bus] *= duck
    R[bus] *= duck

# Shared room reverb
ir_t = tvec(1.6)
irL = bandnoise(1.6, 200, 7000, seed=1) * np.exp(-ir_t / 0.42)
irR = bandnoise(1.6, 200, 7000, seed=2) * np.exp(-ir_t / 0.42)
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
send = {"pad": 0.25, "pluck": 0.55, "clap": 0.3, "sfx": 0.4, "hat": 0.1}
sendL = sum(L[b] * g for b, g in send.items())
sendR = sum(R[b] * g for b, g in send.items())
nfft = 1 << int(np.ceil(np.log2(N + len(irL))))
revL = np.fft.irfft(np.fft.rfft(sendL, nfft) * np.fft.rfft(irL, nfft), nfft)[:N]
revR = np.fft.irfft(np.fft.rfft(sendR, nfft) * np.fft.rfft(irR, nfft), nfft)[:N]

mixL = sum(L.values()) + revL * 0.5
mixR = sum(R.values()) + revR * 0.5

# Gentle glue: soft clip, normalise to -1 dBFS, short fades
mix = np.vstack([mixL, mixR])
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 10 ** (-1 / 20) / np.abs(mix).max()
fade_in = np.minimum(1, np.arange(N) / (0.01 * SR))
fade_out = np.clip((DUR - tt) / 0.6, 0, 1)
mix *= fade_in * fade_out

pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
out = Path(__file__).with_name("music.wav")
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out, "peak dBFS", round(20 * np.log10(np.abs(mix).max()), 2))
