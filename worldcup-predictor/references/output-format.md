# Output Formats

**Output encoding rule (applies to every agent):** Return plain Markdown body text only. Do NOT wrap the response in JSON, tool calls, structured objects, or any other container format. The raw Markdown string itself is the return value. If the harness shows a "parse error" or empty result, the most likely cause is the agent wrapping output in a non-Markdown format — the retry in Phase 2 should send the same prompt with this constraint explicitly restated.

## Per-agent report (Phase 2)

Each sub-agent returns Markdown with this structure. Save each as `workspace/<date>/<agent-name>.md`.

```markdown
# <Agent name> — <date>

## <Home> vs <Away> (<kickoff in user tz>, <venue>)
- **Verdict:** <one line: who's favored / draw, in this agent's voice>
- **Confidence:** <high | medium | low>
- **Predicted margin:** <e.g. "1-goal win", "2-0 or 3-0", "score draw", "demolition 4+"> — required for every match. For data-analyst: anchor to xG/odds-implied totals. For tactics: anchor to stylistic dominance assessment. Others: best estimate in your lane.
- **Basis:** <the specific evidence this persona cares about>
- **Qualification context check:** state each team's condition (must win / draw suffices / already qualified / eliminated) and how it shapes your verdict.
- **Sources:**
  - <claim> — <link>
  - <claim> — <link>

## <next match> ...
```

Rules for every agent:
- One block per match in the verified slate. Predict only matches present in `facts.md`.
- Every factual claim carries a source link. Drop unsourced claims.
- Stay in persona — don't borrow another agent's lens.
- **Predicted margin is mandatory.** Never output only a 1X2 verdict without a score/margin estimate.

## Synthesis report (Phase 3)

### Layer 1 — Summary table (one row per match)

```markdown
| Match | data | tactics | injury | buzz | risk | Synthesized pick | Confidence |
|---|---|---|---|---|---|---|---|
| ESP vs GER | ESP | ESP | even | GER hype | DRAW likely | ESP narrow | medium |
```

Each cell = that agent's one-line verdict. Last two columns = your reconciled pick + honest confidence band.

### Layer 2 — Deep archive

Keep all 5 per-agent `.md` files under `workspace/<date>/`. Link them from the summary so the reasoning + sources are auditable.

### Confidence logic

- 4 forecasters agree + risk-officer's upset case is weak → **high**.
- Split forecasters, OR risk-officer makes a strong upset case → **low / volatile** (flag it; don't hide it).
- Otherwise → **medium**.

## Ledger (Phase 4) — `workspace/ledger.md`

```markdown
| Date | Match | Predicted | Actual | Hit? |
|---|---|---|---|---|
| 2026-06-15 | ESP vs X | ESP win | 1-1 draw | ✗ |

Running hit-rate: 7/12 (58%) — vs coin flip 33%, vs Opta 6/9 (67%)
```

## Mistake log (Phase 4) — `workspace/mistakes.md`

```markdown
- 2026-06-15: Powerhouses pushed all-in for favorites; got 4 draws. Lesson: traditional powerhouses start tight; debut/underdog teams defend deep and hold draws. → raise draw weight for favorites in openers.
```

Load this file at the start of the next run and instruct the swarm to weight the lessons.
