# Mistake Log & Lessons — Allsvenskan Edition

This is where we learn from failed predictions and extract **league-specific lessons** (L1-L7 baseline rules are in references/league-rules.md; this file adds new lessons from experience).

---

## Lesson Learning Protocol

When a prediction misses:
1. **What happened**: Predicted X, actual Y
2. **Root cause**: What mechanism did we miss? (home advantage underweighted? fatigue ignored? relegation desperation?)
3. **Fix**: How should the rule be adjusted?
4. **Validation**: Track if the new lesson holds in future matches

---

## Pre-Season Lessons (from worldcup-predictor adaptation)

### Lesson L0: League ≠ Knockout — mean reversion beats individual moments

**Background**: worldcup-predictor Lesson 31 (S-tier superstars like Haaland can single-handedly flip a knockout match) doesn't translate to leagues. In 38 rounds, a superstar has 15-20 great performances but also 10 quiet games. Leagues are about **consistency**, not one 80'+89' moment.

**Rule**: DO NOT over-weight a single player's "big-game" reputation in league predictions. A team with a superstar still regresses to mean over 38 games. Focus on **home/away splits, fatigue, team form** (not "X player can single-handedly win this").

**Exception**: Final matchday title-decider or relegation battle (pressure = pseudo-knockout).

---

### Lesson L-1: Home/away splits > season averages (MANDATORY)

**Background**: worldcup-predictor used tournament-wide averages (e.g., "Brazil 1.8 g/g"). In leagues, that's meaningless. A team can score 2.5 g/g at home but 1.0 away.

**Rule (built into data-analyst persona)**: NEVER use season g/g. Always compute:
- Home team: goals/game **at home this season**
- Away team: goals/game **away this season**

If data-analyst uses season averages, synthesis must override.

---

### Lesson L-2: Mid-table apathy is real (Rule L4 validation pending)

**Background**: Teams with 40-50 points, no Euro hopes, no relegation fear → low intensity. This doesn't exist in World Cup (every match is high-stakes).

**Rule**: If BOTH teams are positions 7-12 AND mid-season (matchdays 15-30) AND no derby → expect low-scoring draw 30%+. Do NOT anchor on form (a team can be "in form" but apathetic).

**Validation needed**: Track matches where both teams fit L4 criteria. If draw rate <25%, rule needs adjustment.

---

## 2026 Season Lessons

[Will be populated after first predictions and results]

---

## Validation Tracking

| Lesson | Trigger count | Hit rate | Status |
|---|---|---|---|
| L1 (home advantage +0.8) | - | - | Baseline (from historical data) |
| L2 (fixture congestion -0.5) | - | - | Pending validation |
| L3 (relegation desperation +0.5) | - | - | Pending validation |
| L4 (mid-table apathy) | - | - | Pending validation |
| L5 (title race quality) | - | - | Baseline (historical) |
| L6 (away underdog smash-and-grab) | - | - | Pending validation |
| L7 (derby intensity) | - | - | Baseline (historical) |

---

## Common Failure Modes (to watch for)

Based on worldcup-predictor's 07-06 disaster (0/2 全败), here are failure modes to avoid in leagues:

1. **Over-reliance on structure/rules, ignoring individual quality**: worldcup-predictor押海拔规则+零封墙，被Bellingham个人质量撕开。League equivalent: don't anchor on "home advantage" if away team has 3 players worth 50M+ each.

2. **Ignoring fatigue**: If a team played Thursday Europa away (Greece) → Sunday league, they're cooked. Don't predict based on form if they're on 3 days rest.

3. **Treating all home advantages equally**: Hammarby Tele2 Arena (hostile 25k crowd) ≠ Värnamo's 4k-seat stadium. Adjust Rule L1 baseline.

4. **Ignoring relegation desperation**: A bottom-3 team at home in final 10 matches is NOT the same team from matchday 10. Survival mode is real.

5. **Fake precision in coin-flips**: If it's genuinely 50-50 (mid-table vs mid-table, both apathetic), don't invent a 58% prediction. Mark it coin-flip and move on.

---

*This file will grow as we accumulate match data and learn from mistakes.*
