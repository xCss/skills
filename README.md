# Skills

Reusable agent skills with stable CLI entry points. Each skill keeps decision-making and workflow guidance in `SKILL.md`; repeatable execution belongs in `scripts/` and returns JSON where applicable.

## Available skills

| Skill | Use when you need | Main entry |
|---|---|---|
| `i18n-workflow` | Game localization audits, runtime i18n checks, localized text-image generation, review sheets | `node scripts/i18n-workflow-cli.cjs` |
| `imagegen-workflow` | Repeatable image generation/editing, text-image replacement, PNG postprocessing, provider readiness checks | `uv run python scripts/imagegen_workflow_cli.py` |
| `bilibili-publishing-workflows` | Bilibili metadata/comment extraction and legacy-style poster or HTML generation | `uv run python scripts/bilibili_publish_cli.py` |
| `worldcup-predictor` | Football match predictions, win probabilities, daily prediction reports, accuracy tracking (6-agent swarm) | prompt-driven (no CLI) |
| `allsvenskan-predictor` | Allsvenskan match predictions (league variant of the same 6-agent swarm) | prompt-driven (no CLI) |

## Repository conventions

- Prefer the **Skill + CLI** pattern documented in [`AGENTS.md`](AGENTS.md).
- Keep `SKILL.md` focused on routing, policy, pitfalls, and verification.
- Keep reusable execution in `scripts/`; do not rely on ad-hoc one-off scripts.
- CLI stdout should be machine-readable JSON for operational commands.
- Never print or commit API keys, tokens, cookies, passwords, full Authorization headers, `.env` contents, or connection strings.
- Use `--dry-run` for previews. When the user asks for real model/image output, execute through the stable CLI without a second API-usage confirmation.

## Quick verification

Run from each skill directory:

```bash
# i18n-workflow
node scripts/i18n-workflow-cli.cjs self-test

# imagegen-workflow
uv run python scripts/imagegen_workflow_cli.py --help

# bilibili-publishing-workflows
uv run python scripts/bilibili_publish_cli.py self-test
```

## Adding or changing a skill

Before adding a new workflow, check whether an existing skill or CLI can be extended. If a new reusable capability is needed, follow [`AGENTS.md`](AGENTS.md) for the Skill + CLI boundary, JSON output contract, provider resolution rules, and migration assessment guidance.
