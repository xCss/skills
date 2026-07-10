---
name: allsvenskan-predictor
description: Predict and analyze Swedish Allsvenskan (and other domestic league) match results using a swarm of 6 independent sub-agents. Optimized for league format (38-round home/away, no knockout pressure). Use when the user wants Swedish league predictions, fixture analysis, or tracking prediction accuracy over the season.
---

# Allsvenskan Predictor (6-Agent Swarm for Domestic Leagues)

## Overview

Predict domestic league football matches using the same 6-agent swarm methodology as worldcup-predictor, but **adapted for league-specific dynamics**: home advantage, fixture congestion, relegation/title race pressure, and 38-round mean reversion instead of single-elimination chaos.

Core difference from worldcup-predictor:
- **No knockout psychology** (house-money, must-win-or-out, extra time)
- **No altitude** (Sweden is flat)
- **Home advantage is KING** (30 matches/season prove it statistically)
- **Pressure asymmetry = league position** (fighting relegation vs mid-table safety)
- **Fatigue matters** (midweek Europa League → weekend league)

## When to use

- "Predict this weekend's Allsvenskan matches"
- "Who wins Hammarby vs Djurgården?"
- "Analyze the relegation battle fixtures"
- "Track prediction accuracy over the season"

Works for any domestic league: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Championship, etc. The personas stay; only data sources and league rules change.

## Workflow

### Phase 0 — Live-verify (mandatory, Lesson 36)

**Before writing any facts.md, live-verify every fact against the open web — never author from memory or the internal ledger.**

Run web searches to confirm every fact each run — real scores, kickoff time, venue, and current squad/injury/suspension status. Do NOT assume the fixtures are unavailable online and fill facts.md from memory or `ledger.md`.

**ledger.md authority boundary:** The internal `ledger.md` is authoritative ONLY for our own past predictions vs outcomes — never for a team's current form, standings, injuries, or lineup.

If a live search genuinely returns nothing, say so and mark that fact `⚠️ UNVERIFIED` rather than guessing.

### Phase 1 — Establish ground truth (fact-check)

After live-verifying (Phase 0), build a verified fact sheet:

1. **Fixtures**: Use Flashscore, official league site, or ESPN domestic fixtures. Convert kickoff times to user timezone (default: CET for Swedish leagues).
2. **For finished matches**: Record actual scores from the same source.
3. **Standings (MANDATORY)**: For every team, record:
   - Current points & position
   - Home record (W-D-L, goals for/against)
   - Away record (W-D-L, goals for/against)
   - Recent form (last 5 matches: WWDLL format)
   - **Pressure context**: relegation battle (bottom 3-4) / title race (top 3) / Europa/Conference chase (4-7) / mid-table safe
4. **Fixture congestion**: Check if either team played midweek (Europa/Conference League, cup). Flag `⚠️ 3 DAYS REST` if <4 days between matches.
5. **Injuries/suspensions**: Use Transfermarkt injuries page, official team news, local sports media.
6. **Head-to-head**: Last 3 meetings (scores, home/away split).
7. **Home/away split check (MANDATORY)**: Swedish leagues have MASSIVE home advantage (~1.8 goals/game home vs ~1.1 away). Always compute:
   - Team A goals/game **at home** (not season average)
   - Team B goals/game **away** (not season average)
   
Write to `workspace/<date>/facts.md`. Agents predict ONLY matches in this file.

### Phase 2 — Fan out 6-agent swarm (parallel)

Same core methodology as worldcup-predictor, but **briefed for league context**. **NEW: odds-analyst added as 6th agent**:

| Agent | Persona | League-specific focus |
|---|---|---|
| `data-analyst` | Numbers-only quant | Home/away splits, xG, Poisson model, recent form |
| `tactics` | Grizzled coach | Formation matchups, fatigue, set pieces, key player absences |
| `injury-watch` | Team doctor | Injuries, suspensions, 3-days-rest flag |
| `buzz` | Forum fan | Derby vibes, relegation panic, manager pressure, fan sentiment |
| `risk-officer` | Contrarian | Home-team trap games, away-underdog value, fatigue underpriced |
| **`odds-analyst`** | **Market trader** | **Scrape odds (Tavily), implied probability, value detection, cross-market validation** |

**Key difference**: No "house-money" / "knockout pressure" reasoning. Replace with:
- **Relegation desperation** (bottom 3-4 teams fighting for survival)
- **Title race pressure** (top 3 teams, every point matters)
- **Mid-table apathy** (teams with 40-50 points, no Euro hopes, no relegation fear → low intensity)

**NEW: odds-analyst workflow**:
- Uses **Tavily search** to find odds: `"[Home] vs [Away] odds Pinnacle Bet365 Oddsportal [date]"`
- Converts to implied probability and removes vig
- Compares market consensus with other 5 core agents' predictions → detects value bets
- Flags anomalies (dual-odds conflicts, trap odds, suspicious movements)

Spawn all **6 agents in parallel** (single message, multiple Agent tool calls). Each returns structured Markdown (see `references/personas-league.md`).

**Language rule (applies to all output):** Use **consistent language throughout** — either all English or all Chinese, not mixed. Choose one:
- **English**: Full English for all headers, labels, narrative, and technical terms.
- **Chinese**: Full Chinese for headers, labels, and narrative. Technical terms (agent names, Lesson numbers, player/venue names, betting terms like BTTS/xG/Poisson) may remain in English if they're widely recognized. Example: "数据分析师预测主队胜率 65%，基于 xG 和主场优势" is acceptable; "Predicted 主队 win with 置信度 medium based on xG 1.8" is not.

### Phase 3 — Synthesize & cross-validate with odds

Reconcile the **6 reports** and apply **league-proven rules** + **odds calibration**:

#### ⚠️ Odds Calibration Check (MANDATORY with odds-analyst)

Before finalizing prediction:
1. **Compare market consensus (odds-analyst) with model consensus (other 5 core agents)**:
   - If difference <5%: High confidence, market agrees with our model
   - If difference 5-15%: Moderate confidence, investigate gap (did we miss injury? Is market overreacting?)
   - If difference >15%: **RED FLAG** 🚩 — either we missed critical info, or there's value bet opportunity
2. **Trust order** (when conflict):
   - Pinnacle odds (lowest vig) > Our model > Recreational bookmaker odds
   - **Why**: Market has hidden information (lineup leaks, injury rumors, sharp money) we don't
3. **Value bet identification**:
   - If model says "Home 60%" but market says "Home 45%" → **+15% value on Home** ✅
   - If model says "BTTS 70%" but odds imply "BTTS 55%" → **value on BTTS Yes**
4. **Red flag handling**:
   - Dual-odds conflict (e.g., 主胜2.28 vs 4.65) → Trust Pinnacle/Oddsportal consensus, flag data error
   - Odds too low (1.20-1.30 on favorite) → Check injury-watch for missed news
   - Sudden odds movement → Check buzz for breaking news

**Final prediction** = weighted synthesis:
- If odds-analyst + 4 other agents agree (within 5%) → **High confidence**
- If odds-analyst conflicts with others → **Lower confidence, investigate, trust market if no explanation found**

#### 📋 worldcup-predictor Lessons Applicability

From the 17 mandatory lessons in `worldcup-predictor/references/lessons.md`, the following **DO apply** to domestic leagues:
- **L6-9 (Type-A/B classification, teeth gates, penalty toss-up):** Clean-sheet default, toothless vs resilient opponents, shootout randomness — all transfer to leagues.
- **L11 (S-tier star tiering):** World-class players (Haaland/Salah tier) can swing league matches just as they do knockouts.
- **L15-16 (hard/soft teeth gates):** Whether an underdog's attacking threat is real (proven vs strong opponents, world-class forward healthy) vs fake (padded vs weak teams, key player out) applies universally.

The following **DO NOT apply** (knockout-specific):
- **L1-5 (altitude, must-win asymmetry, heat, rotation in group stage):** Leagues don't have altitude venues (Sweden is flat), no group-stage "already qualified" scenarios, no single-elimination pressure.
- **L10-11 (knockout psychological burden, house-money):** Leagues have relegation/title pressure instead (see Core League Rules below).
- **L12 (altitude two-tier gate):** Not applicable (no altitude).
- **L13-14 (sample context for favorites/underdogs in tournaments):** League form is 38-round cumulative, not 3-game group stage samples.

**Use the applicable worldcup lessons (L6-9, L11, L15-16) in conjunction with the Core League Rules below.**

#### ⭐ Core League Rules (mandatory checks)

**Rule L1 — Home advantage baseline (+0.8 goals, +15% win probability)**
- Default: home team gets +0.8 goals vs their away average
- Stronger at small stadiums with hostile crowds (Hammarby, Djurgården derby)
- Weaker for newly-promoted teams (unfamiliar venue, small fanbase)

**Rule L2 — Fixture congestion tax (-0.5 goals if <4 days rest)**
- Team played midweek Europa + weekend league → physical/mental drain
- Especially punishing if away-midweek → away-weekend (double travel)

**Rule L3 — Relegation desperation (+0.3 goals, +10% fight for bottom-3 teams)**
- Teams in bottom 3-4 positions with <10 matches left → survival mode
- Especially strong at home (last stand)
- Overrides poor form (a team can be winless but desperate)

**Rule L4 — Mid-table apathy (-0.3 goals for teams with 40-50 points, no Euro/relegation stakes)**
- "Nothing to play for" reduces intensity
- Both teams mid-table → low-scoring draw probability 30%+

**Rule L5 — Title race quality edge (top-3 teams vs mid-table → expect 2+ goal margin)**
- Quality gap in domestic leagues is smaller than World Cup, BUT
- Top-3 Allsvenskan teams (Malmö/Hammarby/AIK) vs bottom-half → 2-0/3-1 common

**Rule L6 — Away underdog "smash-and-grab" (if away team is <5 positions below home team)**
- Small quality gap + one moment of quality → 0-1 away win
- Especially if home team is mid-table apathetic (Rule L4)

**Rule L7 — Derby intensity override (local rivals → high-scoring, form irrelevant)**
- Hammarby vs Djurgården, Göteborg vs Häcken, etc.
- Form goes out the window, emotion drives result
- Expect 2-2, 3-2, red cards, late drama

#### ⚠️ Removed from worldcup-predictor (NOT applicable to leagues)

- ❌ Lesson 7/8 (altitude) — Sweden is flat
- ❌ Lesson 21/27/28/29/30 (house-money knockout psychology, extra time, penalties)
- ❌ Lesson 31 (S-tier superstars single-handedly flipping knockouts) — leagues are 38 rounds, mean reversion matters more
- ❌ Rule 6 (must-win vs draw-suffices) — only applies in final 2-3 matchdays when relegation/title is live

#### ✅ Kept from worldcup-predictor (still relevant)

- ✅ Rule 4 (同位置组2+缺阵 weakens attack/defense)
- ✅ Lesson 22 (toothless underdog gate — away team <0.8 g/g away → anchor home clean sheet)
- ✅ Lesson 25 (clean sheet default for strong home defense vs weak away attack)

### Phase 4 — Track & improve (feedback loop)

After matches finish:
1. Update `workspace/ledger.md` with actual results
2. If prediction missed, diagnose in `workspace/mistakes.md`:
   - Was home advantage underweighted?
   - Was fixture congestion ignored?
   - Was relegation desperation underestimated?
3. Extract new league-specific lessons (e.g., "Lesson L8: Newly-promoted teams at home vs top-3 → expect 0-2/1-3, not competitive")

## Data sources (league-specific)

**For Allsvenskan:**
- Fixtures/results: Flashscore.com, svenskfotboll.se (official), ESPN
- Standings: svenskfotboll.se, Transfermarkt
- Injuries: Transfermarkt Allsvenskan injuries, Swedish media (Fotbollskanalen, Aftonbladet Sport)
- xG/stats: Understat (if available), FBref
- Odds: Bet365, Unibet (Swedish bookmakers)

**For other leagues:**
- Premier League: premierleague.com, BBC Sport, Sky Sports
- La Liga: laliga.com, Marca, AS
- Bundesliga: bundesliga.com, kicker.de
- Serie A: legaseriea.it, Gazzetta dello Sport

## Files

- `references/personas-league.md` — modified agent briefs for league context
- `references/league-rules.md` — full L1-L7 rule documentation
- `workspace/ledger.md` — prediction tracking
- `workspace/mistakes.md` — lesson learning (league-specific)

## Guardrails

- **Verify before predict**: No fixture in facts.md = no prediction. Live-verify every fact against the open web each run (Phase 1 step 0) — never author facts.md from memory or the internal ledger.
- **Sources always**: Every claim needs a link
- **Home/away splits mandatory**: Season averages mislead in leagues
- **Honest uncertainty**: Leagues have more draws (~25-30%) than knockout football
- This is analysis/entertainment, not betting advice
