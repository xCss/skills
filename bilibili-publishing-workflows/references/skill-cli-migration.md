# Skill + CLI Migration Notes for `bilibili-publishing-workflows`

Assessment score: 13/14
Classification: workflow/orchestration
Recommendation: complete-skill-cli-target

```json
{
  "classification": "workflow/orchestration",
  "score": 13,
  "recommendation": "complete-skill-cli-target",
  "migration_strategy": "extend-existing-domain-cli",
  "scaffold_action": "extend-existing",
  "external_cli": "none"
}
```

The user explicitly requested complete migration with no compatibility wrapper. The previous scaffold and legacy direct script are removed rather than retained as wrappers.

## Keep in Skill
- triggers and routing rules
- user preferences and defaults
- fallback policy and verification checklist
- migration/removal notes for legacy entries

## Move to CLI
- config/provider resolution
- repeatable execution primitives
- doctor/probe/self-test diagnostics
- JSON success/failure output with stable error.code
- cleanup and retry behavior
- stable output schema for reusable calls

## Canonical CLI

`scripts/bilibili_publish_cli.py`

## Proposed Commands

```bash
python scripts/bilibili_publish_cli.py --help
python scripts/bilibili_publish_cli.py doctor
python scripts/bilibili_publish_cli.py probe --url <bilibili-url-or-bvid>
python scripts/bilibili_publish_cli.py self-test
python scripts/bilibili_publish_cli.py generate --url <bilibili-url-or-bvid> --format png --out <poster.png>
python scripts/bilibili_publish_cli.py cleanup <path>
```
