# Mandatory Synthesis Lessons (Phase 3)

Apply these 17 lessons when synthesizing the 6 agent reports. Each is derived from a past miss and has been validated or falsified in subsequent runs. See `workspace/mistakes.md` for full derivations.

---

## Synthesis Rules (General)

- Where the five "forecasters" (data/tactics/injury/buzz/odds) agree AND the risk-officer's upset case is weak → high confidence.
- Where they split, or the risk-officer makes a strong upset case → mark the match as volatile / low confidence. Do not paper over the disagreement; surfacing it is the point.
- Never average opinions into mush. Report the spread, then commit to a pick with an honest confidence band.
- **Contradiction check:** Before writing the summary, scan for mechanisms that are invalidated by another agent's findings (e.g. "outdoor heat risk" cancelled by "indoor/AC venue confirmed by injury-watch", "travel fatigue" cancelled by "full rest days"). Flag these contradictions explicitly in the summary rather than silently letting one agent's wrong premise slip through.
- **Lesson hierarchy when they conflict:** altitude (L7/8/32) and must-win-vs-qualified (L6) beat sentiment; Lesson 31 (S-tier star) beats structure; teeth-gate (L22) beats knockout-psychological-burden (L20); proven bunker (L27/30) compresses margin but does not reverse direction.

---

## The 17 Mandatory Lessons

### 1–5. Altitude, Must-win asymmetry, Favorite low-scoring context

1. **If any venue is 2000m+ altitude, the visiting European team's performance is capped regardless of FIFA ranking or quality gap (Lesson 7/8, mandatory).** Predict cautiously even when the favorite is 40+ FIFA places ahead. A visiting European side's "low group-stage goals" in earlier rounds does NOT mean they can't be prolific — if that low sample came at altitude (Mexico City NRG 2240m, Puebla, Monterrey>500m), it was context-suppressed. Once the European side moves to sea level, their goal ceiling lifts. Record in facts.md: `⚠️ ALTITUDE: [venue] Xm — European side Y's earlier low output was altitude-suppressed, not a real cap`. *Falsified 06-24: Portugal's "low R16 goals" was anchored as a ceiling, but that game was at altitude (Denver); once they moved to Houston (sea level), they scored 5.*

2. **Must-win-vs-already-qualified asymmetry is structural, not sentiment (Lesson 6, mandatory).** When one team has already qualified and the other must win: the must-win side shows 20–40% higher xG, more shots, more possession, and commits more players forward. Predict toward the must-win side unless the quality gap is 30+ FIFA places. Ignore sentiment like "Team X won't try." Structure > sentiment.

3. **Heat/humidity ≠ low-scoring unless BOTH sides are European AND it is outdoor + afternoon (Lesson 5, mandatory).** Do NOT default to 1-0 just because it's Houston in July. Indoor/AC or evening kickoffs void the mechanism. If only one side is European and the other is CONCACAF/African (acclimatized), heat favors the acclimatized side, not a draw. A risk-officer who writes "heat → rock fight → 1-0" when it's an indoor/AC stadium and/or evening kickoff must be overruled in synthesis.

4. **Rotation risk beats hype (Lesson 12/13, mandatory).** A team that is already qualified and has hinted or confirmed rotation (or is playing a compressed schedule) must have its upset probability raised to 35%+ if facing a motivated must-win opponent, even if the FIFA gap is large. Do not treat an A-team's group-stage form as transferable to a B-team knockout — rotation breaks sample context (Lesson 19).

5. **Sample-context non-transferability for favorites (Lesson 26/33, mandatory — favorite side):** If a favorite's low group-stage goals came ONLY when facing (a) 2000m+ altitude venues, (b) elite top-10 strong defensive opponents, or (c) it was already-qualified / played control-tempo football and deliberately slowed down → its group-stage goal average is **context-suppressed** and must NOT be used as a scoreline cap when it now faces a toothless, leaky opponent. Record in facts.md: `⚠️ FAV LOW-SCORING SAMPLE IS CONTEXT-SUPPRESSED (faced strong D / control tempo) — do not cap margin`. *Falsified 07-03: Spain (few group goals vs strong opponents) predicted 1-0/2-0 vs Austria, actual 3-0 — the low sample was suppressed by facing Uruguay-tier defenses, not a real ceiling.*

6. **Round 3 rotation flag (Lesson 13 continuation):** Already covered in Phase 1 step 6 — if manager hints rotation, flag it before agents start, not discovered only by risk-officer.

---

### 7–9. Type-A minnows, Type-B bunkers, Penalty toss-up

7. **Clean-sheet default — unless the underdog clears the teeth threshold (Lesson 25/27/29, mandatory).** When a genuine top-10 favorite faces a weaker opponent, default to predicting a **clean sheet (2-0 / 3-0)** UNLESS the underdog has demonstrated **real attacking teeth** (≥1.3 g/g group average OR a confirmed world-class forward starting healthy). A "respectable 1-2 goal loss" sounds balanced but is a cop-out when the underdog is toothless. Predict the shutout. Type classifications:
   - **Type-A (toothless minnow):** <1.0 g/g, no world-class forward, leaked goals to peers. Anchor favorite clean sheet. *Validated 07-01: Ecuador 0.67 g/g, Mexico kept 3 clean sheets → Mexico 2-0 shutout actual.*
   - **Type-B (resilient bunker, but CAN have attacking teeth):** Dragged a strong side to 0-0/pens, BUT also check if they scored vs quality opponents. If yes (Morocco: 0-0 Netherlands + 3-0 Canada with En-Nesyri), they have BOTH defensive solidity AND attacking teeth → do NOT anchor a clean sheet (see Lesson 27/30/34). If no real attacking output (Paraguay: 0-0 Germany, <1 g/g), treat as pure bunker → favorite wins narrow but still likely keeps a clean sheet unless Lesson 34 gates (b)+(c) fire.

8. **Toothless-underdog gate — the knockout psychological-burden rule (Lesson 20) requires the underdog to have teeth first (Lesson 22, mandatory).** Before applying "house-money underdog attacks freely → favorite labours," verify the underdog averaged **≥1.3 goals/game in the group stage** OR has a confirmed world-class attacking threat (En-Nesyri / Osimhen / Salah tier) starting healthy. If the underdog is attack-anaemic (**<1.0 goals/game**) AND the favorite kept clean sheets in the group stage → Lesson 20 is **downgraded** — predict by quality gap normally, do NOT artificially suppress the favorite's margin. Do not use a single must-win outburst as proof of sustained teeth (non-transferable sample context). *Validated 06-30 (Morocco had real teeth, took Netherlands to pens) vs. falsified 07-01 (Ecuador 0.67 g/g, Mexico cruised 2-0).*

9. **Penalty-shootout direction is a toss-up — never anchor it on historical conversion rates (Lesson 28, mandatory).** When a match is judged a true coin-flip likely to reach a shootout, the *process* read (low-event, drags to ET/pens) is legitimate — but do NOT convert it into a confident shootout winner. A shootout is high-variance and near-random. Historical national penalty conversion rates have almost no predictive power. Mark the shootout direction as ~50/50. The ONLY admissible leans: (a) a confirmed world-class designated taker present (Salah / Messi tier) → very slight lean; (b) the opposing keeper has an already-demonstrated this-tournament penalty save → very slight lean. Absent those, call it level. *Falsified 07-04: Australia-Egypt handed to Australia on historical rates; Egypt won 4-2 on pens.*

---

### 10–12. Knockout pressure, S-tier stars, Proven bunkers

10. **Eliminated team + star individual motivation ≠ zero intent (Lesson 12 extension):** An already-eliminated team is NOT automatically low-intent. If it has (a) a star with personal-honour incentives (transfer-window exposure, World Cup showcase) AND (b) faces an already-qualified rotated B-team, treat it as a "no-pressure full release" scenario: default toward the eliminated-but-full-strength side, or at minimum raise its win/draw probability to 40%+.

11. **Knockout-stage psychological-burden asymmetry (Lesson 20, mandatory in knockouts).** When (a) one side is a title contender / host / expected-to-cruise favorite, AND (b) the other is an over-achieving dark horse (first-ever knockout, historic best run) playing with "house money" → the favorite carries "must win AND win convincingly" pressure while the underdog attacks without burden. **Downgrade the favorite's big-win probability, predict a low-scoring narrow win (1-0) or extra time, and raise the underdog's not-lose probability to 40%+.** This does not override a large quality gap, but it explains why knockout favorites so often labour. *Validated 06-29: Canada (co-host) won only 1-0 vs South Africa.* **⚠️ Toothless-underdog gate (Lesson 22) applies first** — see #8 above.

12. **S-tier superstar tiering (Lesson 31, mandatory in knockouts):** A world-top-3 finisher on a **5+ goal / 5+ consecutive-scoring-game run** can single-handedly reverse a 20–30 place quality gap in a one-off knockout. Split the teeth threshold: **A-tier teeth** (1.3–2.5 g/g) = underdog scores, but quality gap still points direction. **S-tier** (Haaland/Mbappé/Messi/Kane tier: **this tournament already 5+ goals AND scored in 3+ consecutive games AND club season 50+ goals / Ballon d'Or top-3**) = the player can win the tie alone. When the underdog has an S-tier star AND the favorite is weakened, do NOT default to "quality gap decides" — mark it a true coin-flip (45–55%) or cap the favorite at 55–60%. *Falsified 07-06: Brazil vs Norway (Haaland S-tier); Haaland scored 80'+89', knocked out Brazil 2-1.*

---

### 13. Altitude two-tier gate

13. **Altitude rule has a two-tier quality gate (Lesson 32, mandatory).** Lesson 7/8's "2000m+ caps European teams" holds for **ordinary European sides (FIFA 15–50)** — validated by Czech 0-3 Mexico at Azteca. But for **top-8 sides (Eng/Fra/Ger/Esp/Por/Ita/Ned/Bel)**, individual technique + tournament experience **partially offset** altitude; do NOT auto-apply the "Czech template." If a top-8 side is at full strength with a ≥10-place gap and the home team's clean sheets came only vs mid-tier opponents → altitude does NOT flip direction; predict the top-8 side to edge it, confidence capped at low-medium (~52–55%). *Falsified 07-06: Mexico predicted ~58% on Azteca altitude vs England; England won 3-2 away.*

---

### 14. Proven Type-B bunker minimum margin

14. **Proven Type-B bunker → back the favorite's direction but anchor the MINIMUM winning margin; kill the big handicap (Lesson 30, validated).** When the underdog qualifies as a Lesson 27/29 Type-B resilient low-block on **hard evidence** (it has 0-0'd / dragged a genuine top side the full distance this tournament), the favorite still advances on quality, but the bunker compresses the game to "one goal decides it + ET/pen tail." **Predict the favorite to win by the smallest margin (1-0 / 2-1) and explicitly avoid any favorite big-handicap line (-1.5 / -2.5).** *Validated 07-05: Paraguay (dragged Germany to 120'+pens) → we anchored France 2-0 "not a rout, avoid -2.5"; France managed 0 open-play shots on target, squeaked through 1-0 on a 69' penalty.*

---

### 15–17. S-tier × teeth综合, Hard/soft teeth gate, True coin-flip 50/50

15. **S-tier star × toothed underdog is NOT mutually exclusive — the star sets the DIRECTION, the underdog's teeth set the SCORELINE SHAPE (Lesson 34, validated).** Do not over-correct from Lesson 31 into "a favorite with an S-tier star must clean-sheet-cruise." When **(a)** the favorite has an S-tier star (L31) **but (b)** its own defense is fragile / has conceded in recent knockout rounds **and (c)** the underdog has a real attacking outlet (clears L22, or a world-class forward like Salah starting healthy) → predict **"favorite wins via the star + concedes 1-2, explicitly do NOT anchor a clean sheet."** Mnemonic: **star decides who wins; the underdog's teeth decide the scoreline.** *Validated 07-08: Argentina (Messi S-tier, but leaked 2 vs Cape Verde) vs Egypt (Salah) → we predicted "Argentina advances, 2-1 or AET 3-2, NO clean sheet"; actual Argentina 3-2, Egypt scored twice.*

16. **Both gates (b) AND (c) must hold on HARD evidence, or fall back to Lesson 25 clean-sheet default (Lesson 35, mandatory).** The "don't anchor a clean sheet" clause fires ONLY when **both** are true simultaneously:
   - **Gate (b) — the favorite has ACTUALLY conceded in this tournament's knockout stage** (a real fragile record like Argentina leaking to Cape Verde/Egypt — NOT a theoretical "could concede"; if the favorite has kept clean sheets / has an elite back line like France's Saliba-Upamecano shutting out Paraguay/Sweden/Morocco, gate (b) FAILS → anchor the clean sheet).
   - **AND gate (c) — the underdog's teeth are HARD**, i.e. either (i) a world-class lone striker starting healthy (Salah/Mbappé tier, teeth transfer to any defense) OR (ii) attacking output proven against a *strong/peer* defense (not stats padded vs a Type-A minnow). If the underdog's teeth were only shown vs a weak Type-A side (Morocco's 3-0 was vs Canada, our own Type-A read) OR its main scorer is absent (Saibari injured + En-Nesyri uncalled) → the teeth are non-transferable = treat as toothless → anchor the favorite clean sheet.
   
   *Falsified 07-10: France 2-0 Morocco — we invoked L34 to predict France 2-1 "no clean sheet," but BOTH gates failed (France's elite D had conceded 0 all knockout; Morocco's "teeth" were only vs Type-A Canada + Saibari out) → France cruised to a clean sheet, Morocco managed 5 shots / 0 goals. Should have fallen back to Lesson 25 and anchored France 1-0/2-0 shutout.*
   
   Discriminator triangle: 07-06 Brazil (structure-beats-star, WRONG) / 07-08 Argentina (L34 correct — real fragile D + hard teeth) / 07-10 France (L34 over-applied — elite D + soft teeth). **The star always sets direction; the SHAPE turns on two hard-evidence checks — "has the favorite's D actually conceded this knockout stage?" and "are the underdog's teeth hard (peer-proven / healthy world-class) or soft (minnow-padded / key scorer out)?" — never on L34's name alone.**

17. **True coin-flips get 50/50, not false precision — especially double-clean-sheet interlocks (Lesson 34, mandatory).** When a match is judged a true coin-flip — most sharply when **both sides kept a clean sheet in the previous round** and both are defense-first — write the direction as **50/50**, not 52/48. Anchor the scoreline at **0-0 (preferred over 1-1 for double-clean-sheet interlocks; Lesson 17 extended to knockouts) → ET/pens**, and per Lesson 28 mark the shootout direction toss-up. A nominal 52% lean on a coin-flip only manufactures a "direction wrong" record when the 48% side wins the shootout. *Validated 07-08: Switzerland vs Colombia (both 1-0/2-0 clean sheets in R32) → we called 0-0→pens, low confidence; actual 0-0 → Switzerland won 4-3 on pens.*

---

**Full derivations, validations, and falsifications:** See `workspace/mistakes.md`.
