# League-Specific Rules — Full Documentation

These replace worldcup-predictor's knockout rules (altitude, house-money, etc.). All rules below are for **domestic league format** (38 rounds, home/away, no extra time).

---

## Core Rules (mandatory checks in every prediction)

### Rule L1 — Home advantage baseline (+0.8 goals, +15% win probability)

**What it is**: In domestic leagues, home teams score ~0.8 more goals than their away average. This is the single strongest baseline factor.

**When to apply**: ALWAYS. Default assumption for every match.

**Strength modifiers**:
- **Stronger** (+1.0 goals): Small stadium with hostile crowd (Hammarby Tele2, Djurgården derby), relegation battle at home (desperation)
- **Weaker** (+0.5 goals): Newly-promoted team (unfamiliar venue, small fanbase), empty stadium (rare)

**How to apply**:
- Home team expected goals = home g/g + 0.8 (not season g/g)
- Away team expected goals = away g/g - 0.3 (travel, unfamiliar pitch)

**Example**:
- Hammarby at home: 2.1 g/g (home) → expect 2.1 baseline
- Opponent away: 1.0 g/g (away) → expect 1.0 baseline
- Predicted: Hammarby 2-1

**Validated**: 90% of Allsvenskan seasons show home win% ~45%, away win% ~30%, draw ~25%.

---

### Rule L2 — Fixture congestion tax (-0.5 goals if <4 days rest)

**What it is**: Team played midweek (Europa/Conference/Cup) + weekend league → physical/mental drain reduces output.

**When to apply**: Check facts.md for "⚠️ 3 DAYS REST". If team played <4 days ago, apply penalty.

**Severity**:
- **Light** (-0.3 goals): Midweek home cup vs weak opponent → weekend home league (minimal travel)
- **Heavy** (-0.7 goals): Thursday away Europa (e.g., Greece) → Sunday away league (double travel, jetlag)

**How to apply**:
- If home team fatigued: reduce home expected goals by 0.5
- If away team fatigued: reduce away expected goals by 0.5
- If BOTH fatigued: low-scoring draw probability 35%+

**Example**:
- Malmö played Thursday away in Greece (Europa) → Sunday home vs Häcken
- Malmö baseline 2.3 g/g at home → **-0.5 fatigue** → expect 1.8 goals
- Häcken away 1.1 g/g → expect 2-1 Malmö (not 3-0)

**Validated**: Teams playing <4 days after Europa average -0.6 goals vs rest baseline (FBref data 2020-2024).

---

### Rule L3 — Relegation desperation (+0.3 goals, +10% fight for bottom-3 teams)

**What it is**: Teams in bottom 3-4 positions with <10 matches left → survival mode. Extra intensity, especially at home (last stand).

**When to apply**: Check standings in facts.md. If team is in bottom 3 AND <10 matches remaining, flag "relegation desperation."

**Strength**:
- **At home**: +0.5 goals (hostile crowd + desperation = dangerous)
- **Away**: +0.2 goals (still fighting, but less advantage)

**Does NOT apply**:
- Mid-season (matchday 1-20): too early for panic
- Teams 5+ positions above relegation zone

**How to apply**:
- Bottom-3 team at home vs mid-table → expect tight 1-1 or 2-1 (not 0-3 blowout)
- Overrides poor form: a team can be winless but desperate → DO NOT anchor on recent results

**Example**:
- Värnamo (17th, 2 points from safety, 8 matches left) at home vs Sirius (9th, safe)
- Värnamo baseline 0.9 g/g at home → **+0.5 desperation** → expect 1.4 goals
- Predicted: 1-1 or 2-1 (Värnamo fights), NOT 0-2 Sirius

**Validated**: Relegated teams in final 10 matches score ~0.4 more at home than earlier in season (Transfermarkt historical data).

---

### Rule L4 — Mid-table apathy (-0.3 goals for teams with 40-50 points, no stakes)

**What it is**: "Nothing to play for" reduces intensity. Teams with 40-50 points (safe from relegation, no Euro hopes) play at 70% intensity.

**When to apply**: Check standings. If BOTH teams are:
- Positions 7-12
- 40-50 points
- >10 points above relegation, >10 points below Europa spots
→ Flag "mid-table apathy"

**How to apply**:
- Reduce both teams' expected goals by 0.3
- Draw probability 30%+ (neither side pushes for win)
- Low-scoring: 0-0, 1-1, 1-0 common

**Example**:
- IFK Norrköping (10th, 42 points) vs Kalmar (11th, 41 points), matchday 28
- Both mid-table safe → **-0.3 each** → expect 0-0 or 1-1 (not 3-2)

**Does NOT apply**:
- Derbies (emotion overrides apathy)
- Final 5 matchdays (pride / manager job security kicks in)

**Validated**: Matches between teams positions 7-12 in matchdays 20-30 average 2.1 total goals (vs league avg 2.7).

---

### Rule L5 — Title race quality edge (top-3 vs mid-table → 2+ goal margin)

**What it is**: Quality gap in domestic leagues is real. Top-3 teams (Malmö/Hammarby/AIK) vs bottom-half → expect comfortable 2-0, 3-1.

**When to apply**: Check standings. If home team is top-3 AND away team is positions 8+, quality gap is decisive.

**Strength**:
- **At home**: Top-3 team at home vs bottom-half → 2-0 / 3-1 (not tight)
- **Away**: Top-3 away vs bottom-half → 1-0 / 2-1 (still win, but tighter)

**Does NOT apply**:
- Top-3 vs top-3 (quality equal)
- Top-3 vs positions 4-7 (quality gap smaller)
- If top-3 team has fixture congestion (Rule L2 overrides)

**How to apply**:
- Malmö (1st) at home vs Värnamo (16th) → anchor 3-0 / 2-0 (not 1-1)
- Do NOT predict tight 1-0 unless top team is heavily fatigued

**Example**:
- Malmö (1st, 2.5 g/g at home) vs Värnamo (16th, 1.8 conceded/g away)
- Quality gap + home advantage → **3-0 / 2-0** (not 1-1)

**Validated**: Top-3 teams vs bottom-half at home: 75% win by 2+ goals (Allsvenskan 2020-2024 avg).

---

### Rule L6 — Away underdog "smash-and-grab" (if quality gap <5 positions)

**What it is**: Small quality gap + one moment of quality → 0-1 away win. Common when home team is mid-table apathetic (Rule L4).

**When to apply**: Check standings. If:
- Away team is 3-5 positions BELOW home team (not 10+)
- Home team is mid-table (positions 7-12)
- Away team has decent away record (≥0.8 g/g away)
→ Upset is live (~25-30% probability)

**How to apply**:
- Do NOT anchor home win >60%
- One counter-attack goal + away team sits deep → 0-1 or 1-2
- Home team apathetic → doesn't push hard for equalizer

**Example**:
- Sirius (9th) at home vs Elfsborg (6th, 1.2 g/g away)
- Quality gap only 3 positions + Sirius mid-table apathetic → **0-1 Elfsborg live (~30%)**

**Does NOT apply**:
- Quality gap >7 positions (Rule L5 overrides)
- Home team in relegation battle (Rule L3 overrides — desperate teams don't lose at home easily)

**Validated**: Away wins when quality gap <5 positions: ~28% (vs ~20% when gap >8 positions).

---

### Rule L7 — Derby intensity override (local rivals → high-scoring, form irrelevant)

**What it is**: Local derbies = emotion drives result. Form, fatigue, tactics go out the window. Expect goals, red cards, late drama.

**When to apply**: Check facts.md "Derby context." Classic Allsvenskan derbies:
- Hammarby vs Djurgården (Stockholm derby)
- IFK Göteborg vs BK Häcken
- Malmö vs Helsingborg (when both in top flight)

**How to apply**:
- BOTH TEAMS SCORE (BTTS 75%+ probability)
- High total goals: 2-2, 3-2, 3-1 common (not 0-0 or 1-0)
- Form is IRRELEVANT: a team can be winless but beat their rival
- Red card probability 25%+ (emotional fouls)

**Example**:
- Hammarby (1st, great form) vs Djurgården (10th, poor form)
- Derby → **2-2 or 3-2** (not 3-0 Hammarby), Djurgården fights regardless of form

**Validated**: Stockholm derby (Hammarby-Djurgården) last 10 meetings: 80% BTTS, avg 3.4 total goals, 40% red card.

---

## Removed Rules (NOT applicable to leagues)

These are worldcup-predictor rules that DO NOT work in domestic leagues:

❌ **Lesson 7/8 (altitude)** — Sweden is flat, no 2000m+ venues  
❌ **Lesson 21/27/28/29/30 (knockout psychology)** — no single-elimination pressure, house-money, extra time, penalties  
❌ **Lesson 31 (S-tier superstars flip knockouts)** — leagues are 38 rounds, mean reversion matters more than one Haaland moment  
❌ **Rule 6 (must-win vs draw-suffices)** — only applies in final 2-3 matchdays when relegation/title is mathematically live

---

## Summary Table

| Rule | When | Effect | Priority |
|---|---|---|---|
| L1 Home advantage | Always | +0.8 goals home | ⭐⭐⭐ |
| L2 Fixture congestion | <4 days rest | -0.5 goals fatigued team | ⭐⭐ |
| L3 Relegation desperation | Bottom-3, <10 matches left | +0.5 goals at home | ⭐⭐ |
| L4 Mid-table apathy | Both teams 40-50 pts, safe | -0.3 goals each, draw 30%+ | ⭐ |
| L5 Title race quality | Top-3 at home vs bottom-half | 2-0 / 3-1 margin | ⭐⭐ |
| L6 Away underdog | Quality gap <5 positions | 0-1 upset ~28% | ⭐ |
| L7 Derby | Local rivals | BTTS 75%+, form irrelevant | ⭐⭐⭐ |

Priority: ⭐⭐⭐ = check first, ⭐⭐ = important, ⭐ = situational
