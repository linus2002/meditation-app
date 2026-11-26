"""Builds timeline.json for the internal-testing explainer from the recorded VO.

Run from the project root (after vo.mjs):  python design/testing-video/build_timeline.py
The 15.6 s showreel intro is fixed on a 120 BPM grid; the explainer after it
follows the voice: each line starts after the previous one plus a pause, and
on-screen beats inside a line are placed where their words fall (estimated
from the line's text, by character position).
"""
import json
import math
import os

ROOT = os.getcwd()
DIR = os.path.join(ROOT, "design", "testing-video")
meta = json.load(open(os.path.join(DIR, "build", "vo", "lines.json"), encoding="utf8"))
LINES = {l["id"]: l for l in meta["lines"]}
ORDER = [l["id"] for l in meta["lines"]]

INTRO_END = 15.6
BODY_START = 15.95
CONTINUES = {"breathe", "sleep", "yoga"}  # one sentence split across clips
HOLD_END = 4.6

vo = []
t = BODY_START
for i, lid in enumerate(ORDER):
    d = LINES[lid]["duration"]
    vo.append({"id": lid, "at": round(t, 3), "dur": d, "text": LINES[lid]["text"]})
    nxt = ORDER[i + 1] if i + 1 < len(ORDER) else None
    gap = 0.22 if nxt in CONTINUES else 0.8
    t += d + gap
end_close = vo[-1]["at"] + vo[-1]["dur"]
duration = math.ceil((end_close + HOLD_END) * 30) / 30
V = {v["id"]: v for v in vo}


def at(lid, phrase, lead=0.08):
    v = V[lid]
    i = v["text"].find(phrase)
    if i < 0:
        raise KeyError(f"{phrase!r} not in {lid}")
    return round(v["at"] + v["dur"] * i / len(v["text"]) - lead, 3)


chapters = [
    {"id": "intro", "label": "01 — intro", "at": 0.0},
    {"id": "welcome", "label": "02 — welcome", "at": INTRO_END},
    {"id": "install", "label": "03 — getting started", "at": V["install"]["at"] - 0.4},
    {"id": "features", "label": "04 — what you can do", "at": V["meditate"]["at"] - 0.4},
    {"id": "test", "label": "05 — what to test", "at": V["test"]["at"] - 0.4},
    {"id": "feedback", "label": "06 — feedback", "at": V["feedback"]["at"] - 0.4},
    {"id": "close", "label": "07 — thank you", "at": V["close"]["at"] - 0.4},
]

# Beats inside lines, used by the picture (and mirrored by SFX below).
beats = {
    "company1": at("welcome", "Getmeds"),
    "company2": at("welcome", "2MG"),
    "free": at("benefits", "And during"),
    "benefit1": at("benefits", "manage"),
    "benefit2": at("benefits", "sleep"),
    "benefit3": at("benefits", "build"),
    "android": at("install", "On Android"),
    "iphone": at("install", "On iPhone"),
    "programs": at("meditate", "programs"),
    "timer": at("meditate", "meditation timer"),
    "sleeptimer": at("sleep", "sleep timer"),
    "langs": at("kapwa", "English"),
    "beta": at("kapwa", "Filipino and Hindi are"),
    "streak": at("track", "a gentle streak"),
    "insights": at("track", "monthly insights"),
    "extras": at("track", "Plus"),
    "t1": at("test", "features"), "t2": at("test", "design"), "t3": at("test", "speed"),
    "t4": at("test", "content"), "t5": at("test", "Kapwa"), "t6": at("test", "how it runs"),
    "f1": at("feedback", "Profile"), "f2": at("feedback", "Help and Support"), "f3": at("feedback", "Raise a Concern"),
    "f4": at("feedback", "Describe"), "f5": at("feedback", "attach"), "f6": at("feedback", "submit"),
    "dont": at("shots", "leave out"),
    "reply": at("it", "will reply"),
    "pace": at("close", "Explore"),
    "together": at("close", "Let's make"),
    "endcard": round(end_close + 0.2, 3),
}

sfx = [
    # ---- intro (120 BPM, beat = 0.5 s)
    {"type": "tick", "at": 0.1, "gain": 0.3, "count": 3},
    {"type": "swell", "at": 0.2, "len": 1.2, "gain": 0.35},
    {"type": "pop", "at": 1.05, "gain": 0.3, "pitch": 0.9},
    {"type": "zoom", "at": 1.2, "len": 0.3, "gain": 0.4},
    {"type": "impact", "at": 1.5, "gain": 0.55},
    {"type": "whoosh", "at": 2.85, "len": 0.3, "gain": 0.35},
    {"type": "swipe", "at": 3.0, "gain": 0.35},
    {"type": "tick", "at": 3.1, "gain": 0.25, "count": 6},
    {"type": "whoosh", "at": 3.25, "len": 1.2, "gain": 0.25},
    {"type": "pop", "at": 5.4, "gain": 0.35, "pitch": 0.8},
    {"type": "pop", "at": 5.9, "gain": 0.28, "pitch": 1.0},
    {"type": "pop", "at": 6.3, "gain": 0.28, "pitch": 1.12},
    {"type": "pop", "at": 6.7, "gain": 0.28, "pitch": 1.26},
    {"type": "pop", "at": 7.1, "gain": 0.28, "pitch": 1.5},
    {"type": "zoom", "at": 7.25, "len": 0.3, "gain": 0.4},
    {"type": "whoosh", "at": 7.6, "len": 1.2, "gain": 0.3},
    {"type": "zoom", "at": 8.7, "len": 0.3, "gain": 0.35},
    {"type": "softrise", "at": 9.0, "len": 1.4, "gain": 0.3},
    {"type": "thud", "at": 10.5, "gain": 0.5},
    {"type": "thud", "at": 10.75, "gain": 0.45},
    {"type": "thud", "at": 11.0, "gain": 0.5},
    {"type": "thud", "at": 11.25, "gain": 0.45},
    {"type": "swipe", "at": 11.5, "gain": 0.35},
    {"type": "thud", "at": 12.0, "gain": 0.5},
    {"type": "softhit", "at": 12.5, "gain": 0.7},
    {"type": "whoosh", "at": 12.8, "len": 0.5, "gain": 0.3},
    {"type": "whoosh", "at": 15.2, "len": 0.5, "gain": 0.4},
    # ---- explainer
    {"type": "pop", "at": beats["company1"], "gain": 0.25, "pitch": 1.0},
    {"type": "pop", "at": beats["company2"], "gain": 0.25, "pitch": 1.2},
    {"type": "whoosh", "at": V["benefits"]["at"] - 0.35, "len": 0.5, "gain": 0.25},
    {"type": "pop", "at": beats["benefit1"], "gain": 0.22, "pitch": 1.0},
    {"type": "pop", "at": beats["benefit2"], "gain": 0.22, "pitch": 1.12},
    {"type": "pop", "at": beats["benefit3"], "gain": 0.22, "pitch": 1.26},
    {"type": "softhit", "at": beats["free"] + 0.1, "gain": 0.35, "pitch": 1.6},
    {"type": "whoosh", "at": V["install"]["at"] - 0.4, "len": 0.5, "gain": 0.25},
    {"type": "tick", "at": V["install"]["at"] + 0.2, "gain": 0.18, "count": 8},
    {"type": "pop", "at": beats["android"], "gain": 0.25, "pitch": 1.0},
    {"type": "pop", "at": beats["iphone"], "gain": 0.25, "pitch": 1.2},
    {"type": "whoosh", "at": V["meditate"]["at"] - 0.4, "len": 0.5, "gain": 0.3},
    {"type": "swipe", "at": beats["programs"], "gain": 0.2},
    {"type": "swipe", "at": beats["timer"], "gain": 0.2},
    {"type": "swipe", "at": V["breathe"]["at"] - 0.1, "gain": 0.2},
    {"type": "swipe", "at": V["sleep"]["at"] - 0.1, "gain": 0.2},
    {"type": "swipe", "at": V["yoga"]["at"] - 0.1, "gain": 0.2},
    {"type": "swipe", "at": V["kapwa"]["at"] - 0.1, "gain": 0.2},
    {"type": "pop", "at": beats["langs"], "gain": 0.22, "pitch": 1.0},
    {"type": "pop", "at": beats["langs"] + 0.45, "gain": 0.22, "pitch": 1.19},
    {"type": "pop", "at": beats["langs"] + 0.9, "gain": 0.22, "pitch": 1.34},
    {"type": "swipe", "at": V["track"]["at"] - 0.1, "gain": 0.2},
    {"type": "pop", "at": beats["streak"], "gain": 0.22, "pitch": 1.1},
    {"type": "pop", "at": beats["insights"], "gain": 0.22, "pitch": 1.25},
    {"type": "whoosh", "at": V["test"]["at"] - 0.4, "len": 0.5, "gain": 0.25},
    *[{"type": "tap", "at": beats[f"t{i}"] + 0.15, "gain": 0.3} for i in range(1, 7)],
    {"type": "whoosh", "at": V["feedback"]["at"] - 0.4, "len": 0.5, "gain": 0.25},
    *[{"type": "pop", "at": beats[f"f{i}"] + 0.05, "gain": 0.22, "pitch": 0.9 + i * 0.1} for i in range(1, 7)],
    {"type": "whoosh", "at": V["shots"]["at"] - 0.35, "len": 0.5, "gain": 0.2},
    {"type": "whoosh", "at": V["it"]["at"] - 0.35, "len": 0.5, "gain": 0.2},
    {"type": "bubble", "at": V["it"]["at"] + 0.3, "gain": 0.3},
    {"type": "bubble", "at": beats["reply"] + 0.25, "gain": 0.3},
    {"type": "whoosh", "at": V["close"]["at"] - 0.4, "len": 0.5, "gain": 0.25},
    {"type": "softrise", "at": beats["endcard"] - 0.6, "len": 0.6, "gain": 0.3},
    {"type": "softhit", "at": beats["endcard"], "gain": 0.5},
]

tl = {
    "fps": 30, "width": 1920, "height": 1080, "duration": duration, "bpm": 120,
    "introEnd": INTRO_END, "bodyStart": BODY_START,
    "chapters": chapters, "vo": vo, "beats": beats, "sfx": sorted(sfx, key=lambda c: c["at"]),
}
json.dump(tl, open(os.path.join(DIR, "timeline.json"), "w", encoding="utf8"), indent=1)
print(f"duration {duration:.2f}s ({int(duration // 60)}:{duration % 60:05.2f}), close ends {end_close:.2f}s")
