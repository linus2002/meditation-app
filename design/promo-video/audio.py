"""Music, sound effects and voice-over mix for the Serenity promo.

Run from the project root (after vo.mjs):  python design/promo-video/audio.py
Everything is synthesized here from scratch (nothing sampled or licensed).
The music grid is 100 BPM with bar lines placed so the drop lands on the first
cut (3.6 s); every scene cut in timeline.json falls on a beat. SFX are read
from the same timeline's cue list. Output: build/audio/mix.wav (+ stems).
"""
import json
import os
import subprocess

import numpy as np
import soundfile as sf
from scipy import signal

ROOT = os.getcwd()
DIR = os.path.join(ROOT, "design", "promo-video")
OUT = os.path.join(DIR, "build", "audio")
os.makedirs(OUT, exist_ok=True)
TL = json.load(open(os.path.join(DIR, "timeline.json"), encoding="utf8"))

SR = 44100
DUR = TL["duration"]
N = int(DUR * SR)
BEAT = 60 / TL["bpm"]  # 0.6 s
STEP = BEAT / 4  # 16th = 0.15 s
BAR = BEAT * 4  # 2.4 s
GRID0 = 3.6 - 2 * BAR  # bar lines at -1.2, 1.2, 3.6, 6.0, ...
rng = np.random.default_rng(42)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def stereo(x, pan=0.0):
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def place(buf, x, at, gain=1.0, pan=0.0):
    if x.ndim == 1:
        x = stereo(x, pan)
    i = int(round(at * SR))
    if i < 0:
        x = x[-i:]
        i = 0
    j = min(len(buf), i + len(x))
    if j > i:
        buf[i:j] += x[: j - i] * gain


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9
    return x * (peak / m)


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def reverb_ir(seconds=2.4, rt=2.0, bright=6000, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = tt(n)
    ir = r.standard_normal((n, 2)) * np.exp(-6.9 * t / rt)[:, None]
    ir = lp(ir, bright)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt(np.sum(ir**2) / 2)


IR_HALL = reverb_ir(3.0, 2.4, 5500, 1)
IR_ROOM = reverb_ir(0.8, 0.5, 7000, 2)


def verb(x, ir, wet):
    if x.ndim == 1:
        x = stereo(x)
    w = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x + w * wet


def band_noise(length, f0, f1, bw=0.6, shape=(1.6, 1.0), seed=0):
    """Noise swept through a moving band — the basis of whooshes and risers."""
    r = np.random.default_rng(seed)
    n = int(length * SR)
    x = r.standard_normal(n + 2048)
    f, ts, Z = signal.stft(x, SR, nperseg=1024)
    u = np.clip(ts / length, 0, 1)
    fc = f0 * (f1 / f0) ** u
    G = np.exp(-0.5 * (np.log2(np.maximum(f[:, None], 20) / fc[None, :]) / bw) ** 2)
    _, y = signal.istft(Z * G, SR, nperseg=1024)
    y = y[:n]
    u = np.linspace(0, 1, n)
    a, b = shape
    env = u**a * (1 - u) ** b
    return norm(y * env / (env.max() + 1e-9))


def pan_sweep(x, p0, p1):
    n = len(x)
    p = np.linspace(p0, p1, n)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


# =============================================================== MUSIC
CHORDS = {
    "D": (38, [54, 57, 61, 64, 66]),
    "Bm": (35, [54, 57, 61, 62, 66]),
    "G": (31, [54, 57, 59, 62, 66]),
    "A": (33, [52, 57, 59, 62, 64]),
}
# bar start -> chord
PROG = ["Bm", "G", "D", "A", "Bm", "G", "D", "A", "Bm", "G"]
BARS = [(GRID0 + i * BAR, PROG[i]) for i in range(len(PROG))]
END_T = 21.95


def chord_at(t):
    c = PROG[0]
    for s, name in BARS:
        if t >= s:
            c = name
    return c


def saw_voice(freq, n, harmonics=7, detune_cents=(-7, 0, 7), seed=0):
    t = tt(n)
    r = np.random.default_rng(seed)
    out = np.zeros(n)
    for dc in detune_cents:
        f = freq * 2 ** (dc / 1200)
        ph = r.random() * 2 * np.pi
        for k in range(1, harmonics + 1):
            if f * k > 9000:
                break
            out += np.sin(2 * np.pi * f * k * t + ph * k) / k
    return out / len(detune_cents)


def pad_layer():
    buf = np.zeros((N + SR * 4, 2))
    segs = BARS + [(END_T, "D")]
    for i, (start, name) in enumerate(segs):
        end = segs[i + 1][0] if i + 1 < len(segs) else DUR + 1.5
        if start >= END_T - 0.01 and name != "D":
            continue
        s0 = max(start, 0)
        if i + 1 < len(segs) and segs[i + 1][0] > END_T and start < END_T:
            end = END_T
        length = end - s0 + 1.0
        n = int(length * SR)
        root, notes = CHORDS[name]
        x = np.zeros(n)
        for j, m in enumerate(notes):
            x += saw_voice(mtof(m), n, seed=j + i * 10) * (0.8 if j else 1.0)
        bright = 1400 if start < 3.6 else 2200
        if 9.0 <= start + BAR and start < 12.0:
            bright = 1300
        if start >= END_T - 0.01:
            bright = 2600
            for m in [62 + 12, 66 + 12]:
                x += saw_voice(mtof(m), n, harmonics=3, seed=99) * 0.35
        x = lp(x, bright, 2)
        t = tt(n)
        att = 0.5 if start < 3.6 else 0.08
        env = np.minimum(1, t / att) * np.clip((length - t) / 1.0, 0, 1)
        lfo = 1 + 0.12 * np.sin(2 * np.pi * 0.25 * t)
        y = x * env * lfo
        w = 0.35 * np.sin(2 * np.pi * 0.11 * t + i)
        place(buf, np.stack([y * (1 - w * 0.5), y * (1 + w * 0.5)], axis=1), s0, 1.0)
    buf = buf[:N]
    # Intro swells in from silence; the end card blooms louder.
    t = tt(N)
    lvl = np.interp(t, [0, 2.0, 3.6, 8.9, 9.6, 11.8, 12.2, 21.4, 21.95, 22.4, 24.4, 25.0],
                    [0.0, 0.85, 0.7, 0.55, 0.8, 0.8, 0.55, 0.55, 0.3, 1.0, 0.85, 0.0])
    return norm(buf) * lvl[:, None]


def pluck(freq, length=0.4, bright=1.0):
    n = int(length * SR)
    t = tt(n)
    env = np.exp(-t / 0.11) * np.minimum(1, t / 0.002)
    x = np.sin(2 * np.pi * freq * t) + 0.35 * bright * np.sin(2 * np.pi * 2 * freq * t) * np.exp(-t / 0.05) + 0.12 * bright * np.sin(2 * np.pi * 3 * freq * t) * np.exp(-t / 0.03)
    return x * env


def arp_layer():
    buf = np.zeros((N + SR * 2, 2))
    pattern = [0, 2, 3, 4, 2, 3, 1, 4, 0, 3, 2, 4, 1, 3, 2, 4]
    k = 0
    t = 3.6
    while t < 21.55:
        sleep = 9.0 <= t < 12.0
        step = int(round((t - GRID0) / STEP)) % 16
        if not (sleep and step % 2):
            root, notes = CHORDS[chord_at(t)]
            m = notes[pattern[step]] + 12
            if step in (6, 14) and not sleep:
                m += 12
            vel = 0.9 if step % 4 == 0 else 0.6
            p = pluck(mtof(m), 0.45, 0.5 if sleep else 1.0) * vel
            place(buf, p, t, 1.0, pan=0.45 * np.sin(k * 1.7))
        k += 1
        t += STEP
    # dotted-eighth ping-pong delay
    d = int(0.45 * SR)
    out = buf.copy()
    fb = 0.38
    tap = buf.copy()
    for i in range(1, 5):
        tap = np.roll(tap, d, axis=0)
        tap[:d] = 0
        tap = tap[:, ::-1] * fb
        out += lp(tap, 3500)
    out = out[:N]
    t = tt(N)
    sleepdip = np.interp(t, [8.8, 9.1, 11.8, 12.0], [1, 0.55, 0.55, 1])
    return norm(out) * sleepdip[:, None]


def kick():
    n = int(0.55 * SR)
    t = tt(n)
    f = 44 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 6.5)
    x[: int(0.003 * SR)] += rng.standard_normal(int(0.003 * SR)) * 0.4
    return np.tanh(x * 1.6)


def clap():
    n = int(0.4 * SR)
    t = tt(n)
    x = np.zeros(n)
    for o in (0, 0.011, 0.022):
        i = int(o * SR)
        seg = rng.standard_normal(n - i) * np.exp(-tt(n - i) / (0.012 if o < 0.02 else 0.11))
        x[i:] += seg
    x = bp(x, 900, 3200)
    x += 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)
    return norm(x)


def hat(open_=False):
    n = int((0.3 if open_ else 0.08) * SR)
    t = tt(n)
    x = hp(rng.standard_normal(n), 7500, 4) * np.exp(-t / (0.09 if open_ else 0.018))
    return norm(x)


def shaker():
    n = int(0.09 * SR)
    t = tt(n)
    x = bp(rng.standard_normal(n), 4500, 11000) * np.minimum(1, t / 0.012) * np.exp(-t / 0.03)
    return norm(x)


def drums_layer():
    buf = np.zeros((N + SR, 2))
    kk, cl, hc, ho, sh = kick(), clap(), hat(), hat(True), shaker()
    t = 3.6
    while t < 21.3:
        step = int(round((t - GRID0) / STEP)) % 16
        sleep = 9.0 <= t < 12.0
        hype = t >= 18.6
        if step in (0, 7, 10) and not (sleep and step != 0):
            place(buf, kk, t, 1.0)
        if step in (4, 12) and t >= 6.0 and not sleep:
            place(buf, verb(cl, IR_HALL, 0.25), t, 0.42)
        if step % 2 == 0:
            g = 0.16 if step % 4 else 0.1
            place(buf, hc, t, g * (0.6 if sleep else 1.0), pan=0.25)
        if step == 14 and not sleep:
            place(buf, ho, t, 0.13, pan=-0.2)
        if hype or 15.6 <= t < 18.6:
            place(buf, sh, t, 0.09 if step % 2 else 0.05, pan=-0.35)
        t += STEP
    # snare-roll build into the glitch
    t = 20.4
    while t < 21.3:
        u = (t - 20.4) / 0.9
        place(buf, cl, t, 0.12 + 0.25 * u)
        t += STEP if u < 0.5 else STEP / 2
    return buf[:N]


def bass_layer():
    buf = np.zeros(N + SR)
    t = 3.6
    while t < 21.3:
        step = int(round((t - GRID0) / STEP)) % 16
        if step in (0, 10) or (step == 7 and t >= 12.0):
            root, _ = CHORDS[chord_at(t)]
            f = mtof(root + 12 if root < 36 else root)
            n = int(0.55 * SR)
            u = tt(n)
            x = (np.sin(2 * np.pi * f * u) + 0.25 * np.sin(2 * np.pi * 2 * f * u)) * np.minimum(1, u / 0.01) * np.exp(-u / 0.35)
            place_mono(buf, x, t, 0.0 if 9.0 <= t < 12.0 and step != 0 else 1.0)
        t += STEP
    # final low note under the end card
    n = int(3.0 * SR)
    u = tt(n)
    place_mono(buf, np.sin(2 * np.pi * mtof(38) * u) * np.exp(-u / 1.2) * np.minimum(1, u / 0.01), END_T, 1.2)
    return stereo(buf[:N])


def place_mono(buf, x, at, gain):
    i = int(round(at * SR))
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i] * gain


def bell(freq, length=3.0, bright=1.0):
    n = int(length * SR)
    t = tt(n)
    parts = [(1, 1.0, 1.6), (2.0, 0.45, 1.0), (2.76, 0.35 * bright, 0.7), (5.4, 0.18 * bright, 0.35), (8.93, 0.08 * bright, 0.2)]
    x = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / d) for r, a, d in parts)
    return x * np.minimum(1, t / 0.003)


def bells_layer():
    buf = np.zeros((N + SR * 3, 2))
    # a short motif over the Kapwa scene and the wall, answered on the end card
    motif = [(15.6, 81), (16.2, 78), (16.5, 76), (17.4, 78), (18.6, 81), (19.2, 83), (19.8, 78), (20.4, 76)]
    for at, m in motif:
        place(buf, bell(mtof(m), 2.5) * 0.5, at, 1.0, pan=0.3 * np.sin(at))
    for at, m in [(END_T, 74), (END_T + 0.3, 78), (END_T + 0.6, 81), (END_T + 1.2, 85)]:
        place(buf, bell(mtof(m), 3.5) * 0.45, at, 1.0, pan=0.2 * np.cos(at * 3))
    return buf[:N]


def sidechain():
    """Kick-driven pump applied to pads, plucks and bass."""
    g = np.ones(N)
    t = 3.6
    while t < 21.3:
        step = int(round((t - GRID0) / STEP)) % 16
        sleep = 9.0 <= t < 12.0
        if step in (0, 7, 10) and not (sleep and step != 0):
            i = int(t * SR)
            n = int(0.28 * SR)
            j = min(N, i + n)
            curve = 1 - 0.45 * np.exp(-tt(j - i) / 0.07)
            g[i:j] = np.minimum(g[i:j], curve)
        t += STEP
    return g


print("music...")
pad = pad_layer()
arp = arp_layer()
drums = drums_layer()
bass = bass_layer()
bells = bells_layer()
sc = sidechain()[:, None]
music = pad * 0.30 * sc + verb(arp, IR_HALL, 0.35) * 0.2 * sc + bass * 0.34 * sc + drums * 0.55 + verb(bells, IR_HALL, 0.6) * 0.16
t = tt(N)
music *= np.clip((DUR - t) / 0.5, 0, 1)[:, None]  # fade the last half-second

# =============================================================== SFX


def sfx(kind, length, cue):
    p = cue.get("pitch", 1.0)
    L = length or 0.6
    if kind == "whoosh":
        x = band_noise(L, 300, 3200, 0.9, (1.8, 0.8), seed=int(cue["at"] * 100))
        return verb(pan_sweep(x, -0.7, 0.7), IR_ROOM, 0.3)
    if kind == "zoom":
        x = band_noise(L, 200, 6000, 0.5, (3.0, 0.25), seed=7)
        n = len(x)
        u = tt(n)
        f = 120 * (1 + 8 * (u / L) ** 2)
        x = x + 0.25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (u / L) ** 2
        return stereo(norm(x))
    if kind == "spin":
        x = band_noise(L, 500, 1800, 0.8, (1.0, 1.0), seed=3)
        u = tt(len(x))
        am = 0.55 + 0.45 * np.sin(2 * np.pi * (6 + 6 * u / L) * u)
        return verb(pan_sweep(x * am, 0.8, -0.8), IR_ROOM, 0.3)
    if kind == "swell":
        return stereo(band_noise(L, 150, 1200, 1.0, (2.5, 0.6), seed=9))
    if kind == "reverse":
        x = band_noise(L, 800, 7000, 1.2, (4.0, 0.05), seed=11)
        return verb(stereo(x), IR_HALL, 0.5)
    if kind == "riser":
        x = band_noise(L, 300, 9000, 0.6, (2.2, 0.08), seed=13)
        n = len(x)
        u = tt(n)
        f = 110 * 2 ** (3 * u / L)
        tone = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (u / L) ** 2
        return verb(stereo(norm(x + 0.3 * lp(tone, 3000))), IR_HALL, 0.3)
    if kind == "impact":
        n = int(2.2 * SR)
        u = tt(n)
        f = 32 + 60 * np.exp(-u * 18)
        boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / 0.55)
        crack = lp(rng.standard_normal(n), 3000) * np.exp(-u / 0.06)
        x = np.tanh(1.5 * boom) + 0.35 * crack
        return verb(stereo(norm(x)), IR_HALL, 0.35)
    if kind == "petal":
        x = band_noise(0.35, 2500, 900, 0.7, (1.0, 1.5), seed=int(cue["at"] * 1000))
        return stereo(x, -0.4 if cue["at"] < 0.4 else 0.4)
    if kind == "chime":
        x = bell(mtof(86), 3.0) + 0.6 * bell(mtof(81), 3.0) + 0.4 * bell(mtof(90), 3.0)
        return verb(stereo(norm(x)), IR_HALL, 0.8)
    if kind in ("pop", "bubble"):
        n = int(0.16 * SR)
        u = tt(n)
        if kind == "pop":
            f = (300 + 700 * np.exp(-u * 45)) * p
        else:
            f = (380 + 600 * (1 - np.exp(-u * 30))) * p
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / 0.04) * np.minimum(1, u / 0.002)
        return verb(stereo(norm(x), 0.2 * np.sin(cue["at"] * 7)), IR_ROOM, 0.25)
    if kind == "bloom":
        n = int(1.4 * SR)
        u = tt(n)
        x = sum(np.sin(2 * np.pi * mtof(m) * u) for m in (74, 78, 81, 85)) * np.minimum(1, u / 0.25) * np.exp(-u / 0.5)
        x *= 1 + 0.3 * np.sin(2 * np.pi * 6 * u)
        return verb(stereo(norm(x)), IR_HALL, 0.6)
    if kind == "tap":
        n = int(0.06 * SR)
        u = tt(n)
        x = hp(rng.standard_normal(n), 2000) * np.exp(-u / 0.004) + 0.6 * np.sin(2 * np.pi * 1800 * u) * np.exp(-u / 0.012)
        return verb(stereo(norm(x)), IR_ROOM, 0.2)
    if kind == "thud":
        n = int(0.35 * SR)
        u = tt(n)
        f = 70 + 80 * np.exp(-u * 30)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u / 0.09) + 0.2 * lp(rng.standard_normal(n), 1500) * np.exp(-u / 0.02)
        return stereo(norm(x), 0.3 * (1 if cue["at"] > 12.35 else -1))
    if kind == "tick":
        out = np.zeros(int(0.8 * SR))
        for i in range(cue.get("count", 5)):
            n = int(0.03 * SR)
            u = tt(n)
            c = hp(rng.standard_normal(n), 3000) * np.exp(-u / 0.003) + 0.5 * np.sin(2 * np.pi * (2400 + 150 * i) * u) * np.exp(-u / 0.006)
            i0 = int(i * 0.07 * SR)
            out[i0:i0 + n] += c * (0.6 + 0.08 * i)
        return stereo(norm(out), 0.35)
    if kind == "sparkle":
        out = np.zeros((int((L + 1.5) * SR), 2))
        r = np.random.default_rng(21)
        for i in range(14):
            at = r.random() * L
            m = r.choice([86, 88, 90, 93, 95, 98])
            place(out, bell(mtof(m), 1.0, 0.5) * (0.3 + 0.4 * r.random()), at, 1.0, pan=r.uniform(-0.8, 0.8))
        return verb(out, IR_HALL, 0.7)
    if kind == "shimmer":
        out = np.zeros((int((L + 2) * SR), 2))
        for i, m in enumerate([81, 85, 88, 90, 93, 97]):
            place(out, bell(mtof(m), 2.2, 0.6) * 0.5, i * 0.07, 1.0, pan=(i - 2.5) / 3)
        air = band_noise(L, 2000, 9000, 1.0, (0.5, 2.0), seed=31)
        place(out, air * 0.5, 0, 1.0)
        return verb(out, IR_HALL, 0.6)
    if kind == "glitch":
        n = int(L * SR)
        out = np.zeros(n)
        r = np.random.default_rng(5)
        i = 0
        while i < n:
            seg = int(r.uniform(0.012, 0.045) * SR)
            u = tt(seg)
            kind_ = r.integers(0, 3)
            if kind_ == 0:
                s = np.sign(np.sin(2 * np.pi * r.uniform(200, 1800) * u))
            elif kind_ == 1:
                s = r.standard_normal(seg)
            else:
                s = np.zeros(seg)
            out[i:i + seg] = s[: n - i] * r.uniform(0.3, 1.0)
            i += seg
        out = np.round(out * 6) / 6  # bit-crush
        return stereo(norm(lp(out, 7000)) * 0.9)
    if kind == "shine":
        n = int(0.9 * SR)
        u = tt(n)
        f = 2200 * 2 ** (1.2 * u / 0.9)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * u / 0.9) ** 2 * 0.4
        return verb(stereo(norm(x)), IR_HALL, 0.6)
    if kind == "swipe":
        x = band_noise(0.22, 5000, 1800, 0.6, (0.6, 1.4), seed=int(cue["at"] * 100))
        return pan_sweep(x, 0.6, -0.6)
    raise ValueError(kind)


print("sfx...")
fx = np.zeros((N + SR * 4, 2))
for cue in TL["sfx"]:
    place(fx, sfx(cue["type"], cue.get("len"), cue), cue["at"], cue.get("gain", 0.5))
fx = fx[:N]

# =============================================================== VOICE-OVER
print("vo...")
vo = np.zeros((N + SR * 2, 2))
meta = json.load(open(os.path.join(DIR, "build", "vo", "lines.json"), encoding="utf8"))
presence = signal.butter(2, [2200, 5200], "band", fs=SR, output="sos")
for cue in TL["vo"]:
    x, sr = sf.read(os.path.join(DIR, "build", "vo", f"{cue['id']}.wav"))
    x = signal.resample_poly(x, SR, sr)
    x = hp(x, 85, 2)
    x = x + 0.35 * signal.sosfilt(presence, x)  # a little air and clarity
    # gentle compression
    env = np.sqrt(lp(x**2, 25, 1).clip(0)) + 1e-6
    thr = 0.08
    gain = np.where(env > thr, (env / thr) ** (1 / 2.5 - 1), 1.0)
    x = norm(x * gain, 0.9)
    place(vo, x, cue["at"], 1.0)
vo = verb(vo[:N], IR_ROOM, 0.08)

# duck music under the voice
venv = np.abs(vo[:, 0])
venv = lp(venv, 8, 1)
k =int(0.25 * SR)
smooth = np.convolve(venv, np.ones(k) / k, mode="same")
vd = np.clip(smooth / (smooth.max() * 0.25), 0, 1)
duck = 1 - 0.5 * vd
fx_duck = 1 - 0.4 * vd  # effects step back a little under the voice too

mix = music * duck[:, None] * 0.9 + fx * fx_duck[:, None] * 0.55 + vo * 0.95
mix = np.tanh(mix * 1.1) / 1.1  # soft limit
for name, s in [("music", music), ("sfx", fx), ("vo", vo), ("mix_raw", mix)]:
    sf.write(os.path.join(OUT, f"{name}.wav"), norm(s, 0.95) if name != "mix_raw" else s, SR, subtype="PCM_24")

# two-pass loudness normalisation to -14 LUFS / -1.5 dBTP (social platforms)
raw = os.path.join(OUT, "mix_raw.wav")
r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
js = r.stderr[r.stderr.rfind("{"): r.stderr.rfind("}") + 1]
m = json.loads(js)
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", raw, "-af", af, "-c:a", "pcm_s24le", os.path.join(OUT, "mix.wav")], check=True)
print("input loudness", m["input_i"], "LUFS ->", os.path.join(OUT, "mix.wav"))
