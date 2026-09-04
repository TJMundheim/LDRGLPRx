#!/usr/bin/env python3
"""Regenerate Logbook §9.1 (assessment reference) from the live website question file.
Run after any edit to website/src/data/audit-questions.ts, then render.py + Chrome PDF."""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
TS = (ROOT / 'website/src/data/audit-questions.ts').read_text()
MD = ROOT / 'docs/cohort-workbook/draft/_MASTER.md'

def field(block, name):
    m = re.search(r"\b%s:\s*(['\"])((?:\\.|(?!\1).)*)\1" % name, block)
    return m.group(2).replace("\\'", "'").replace('\\"', '"') if m else ''

pillars = dict(re.findall(r"\{ id: '(\w+)', name: '(\w+)'", TS))
qs = []
for blk in re.findall(r"\{\s*id: '[\w-]+',\s*n: '\d\d'.*?solutionSlug: '[\w-]+',\s*\}", TS, re.S):
    qs.append({k: field(blk, k) for k in ('id','n','pillar','label','prompt','scoreGuide','categoryNote')})
assert len(qs) == 20, len(qs)
dq = re.search(r"DIAGNOSED_QUESTION = \{(.*?)\} as const", TS, re.S).group(1)
bands = re.findall(r"\{ min: (\d+), max: (\d+), label: '([^']+)', line: '([^']*)' \}", TS)
bonus = re.findall(r"^\s*'([\w-]+)':\s*(\d+),", TS[TS.index('AUDIT_BONUS_BY_ID'):], re.M)
labels = {q['id']: q['label'] for q in qs}

out = ["## 9.1 — The MindSpan Assessment Reference", "",
"You took this assessment 30 days ago — on the website, on the app, or on paper. Take it again now. Same 20 prompts, same scoring. The delta is the point.", "",
"For each question: circle the number that matches you *today*. Not last month. Not your average. Today. Score guides are anchors — a 1, 2, or 4 is fine when you sit between them.", "", "---", ""]
cur = None
for q in qs:
    if q['pillar'] != cur:
        cur = q['pillar']; out += [f"### {pillars[cur]}", ""]
    out += [f"**Q{int(q['n'])} — {q['label']}**", f"*{q['prompt']}*", "", "Score guide:"]
    out += [g.strip() for g in q['scoreGuide'].split('·')]
    out += ["", f"This category notes: {q['categoryNote']}", "", "Your score: 0 — 1 — 2 — 3 — 4 — 5", "", "---", ""]
out += ["**Already diagnosed? (Yes / No — not scored)**", f"*{field(dq,'prompt')}*", "",
f"This category notes: {field(dq,'categoryNote')} A **Yes** routes you to the regenerative-medicine consult path regardless of your other scores.", "",
"☐ Yes ☐ No", "", "---", "", "### Scoring rules", "",
"1. **Total.** Add all 20 scores. That is your MindSpan Score out of 100 (lower is better).", "",
"2. **Band.**", ""]
for mn, mx, lab, line in bands:
    out.append(f"   - **{mn}–{mx} — {lab}.** {line}".rstrip())
b = ' and '.join(f"**+{v}** to Q{next(q['n'] for q in qs if q['id']==k).lstrip('0')} ({labels[k]})" for k, v in bonus)
out += ["", f"3. **Bonus.** For ranking only, add {b}. These carry leverage across every other pillar. A raw 0 stays a 0 — the bonus never lifts an unmarked category.", "",
"4. **Top 3.** Rank the twenty scores with bonuses applied. The top three are your priorities for the next 30 days.", "", "---", ""]
new = '\n'.join(out)

s = MD.read_text()
a = s.index('## 9.1 —'); b_ = s.index('### Your top-3 priorities')
s = s[:a] + new + s[b_:]

# ── Part 1, Exercise 4: baseline self-assessment mirrors the same 20 categories ──
HINT = {
 'cognitive': 'word-finding, focus, foggy days per week',
 'sleep': 'trouble falling asleep, 3 AM waking, unrefreshed mornings',
 'hearing-vision-dental': 'straining in conversation, reading strain, bleeding gums, overdue dental',
 'mood': 'low mood, anxiety, short fuse — how often, how long',
 'social-connection': 'real conversations per week, who you actually see',
 'mental-challenge': 'what you learn or practice that is genuinely hard',
 'movement-strength': 'lifting sessions per week, daily steps, what you can no longer do',
 'weight-body-fat': 'how clothes fit, pounds from target, belly fat',
 'nutrition': 'takeout or processed meals per week, what breakfast actually is',
 'pain-injury': 'where it hurts, what it stops you doing',
 'blood-pressure': 'last reading and date',
 'blood-sugar': 'last A1c or fasting glucose and date',
 'ldl-cholesterol': 'last LDL and date',
 'smoking-nicotine': 'product and daily amount',
 'alcohol': 'drinks per week, drinks per sitting — honest',
 'gut-microbiome': 'bloating, food reactions, brain fog after meals, irregular stools',
 'hormone-balance': 'fatigue, drive, mood swings, recovery, muscle loss — and for women, cycle changes, hot flashes, night sweats',
 'erectile-dysfunction': 'desire, arousal, and for men morning erection frequency and hardness',
 'environment': 'morning sun minutes, water source, screen hours, air filtration',
 'purpose-accountability': 'who checks on you, what your written goal actually says',
}
ex = ["This mirrors the 20-category structure of the MindSpan Assessment, question for question, so your day-one baseline lines up with the retake in Part 9. Rate each category 0 to 5 — where 0 means *no issue at all in this area* and 5 means *daily problem affecting my life*. Then in one line, name the most current, most specific symptom in that category. Not the textbook description. Yours.", "",
"Be honest. Nobody is grading this. The single biggest predictor of cohort outcome is the accuracy of the day-one baseline. Overscoring \"0\" because you don't want to face it just delays the work. Score it the way it actually is today.", "",
"> **Rating scale**: `0 — 1 — 2 — 3 — 4 — 5`", "> 0 = no issue · 1 = rare · 2 = occasional · 3 = a few times a month · 4 = several times a week · 5 = daily and affecting my life", "", "---", ""]
cur = None
for q in qs:
    if q['pillar'] != cur:
        cur = q['pillar']; ex += [f"**{pillars[cur]}**", ""]
    ex += [f"### {q['n']}. {q['label']}", "", f"*{q['categoryNote']}*", "",
           "Rate today: `0 — 1 — 2 — 3 — 4 — 5`   →   My score: ____", "",
           f"Current symptom ({HINT[q['id']]} — be specific):", "", "_______________________________________________", ""]
ex += [f"### Already diagnosed? (Yes / No)", "", f"*{field(dq,'prompt')}*", "", "☐ Yes ☐ No   — a Yes makes the regenerative-medicine consult time-sensitive; book it in Week 1.", ""]
a = s.index('This is the same 10-category structure') if 'This is the same 10-category structure' in s else s.index('This mirrors the 20-category structure')
b_ = s.index('### Personal physiology baselines')
# keep the '---' line right before the physiology block
s = s[:a] + '\n'.join(ex) + '\n---\n\n' + s[b_:]
MD.write_text(s)
print("Exercise 4 regenerated")
print(f"§9.1 regenerated: {len(qs)} questions, {len(bands)} bands, bonus {bonus}")
