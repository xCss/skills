# Bilibili Publishing Workflows

Generate legacy-style Bilibili poster images or HTML previews from a Bilibili URL, BV/AV ID, `b23.tv` shortlink, or share text.

## What this skill provides

- A stable Skill + CLI workflow for Bilibili poster generation.
- JSON-only CLI output for agent automation.
- Offline fixture rendering for tests and reproducible layout work.
- PNG export through Playwright Chromium.
- Safe cleanup for generated temp-directory artifacts.

## Install

Copy this skill directory into your skills root:

```bash
git clone git@github.com:xCss/skills.git /tmp/_skills_repo
mkdir -p skills
cp -r /tmp/_skills_repo/bilibili-publishing-workflows skills/bilibili-publishing-workflows
rm -rf /tmp/_skills_repo
```

The Python CLI uses `uv` and the checked-in `pyproject.toml` / `uv.lock` for repeatable dependencies.

## Quick start

Run commands from `skills/bilibili-publishing-workflows/`:

```bash
UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run python scripts/bilibili_publish_cli.py doctor
```

Generate a PNG poster:

```bash
UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run python scripts/bilibili_publish_cli.py generate \
    --url 'https://www.bilibili.com/video/BVxxxxxxx/' \
    --format png \
    --out /tmp/bilibili-poster.png
```

Clean generated temp files after delivery:

```bash
UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run python scripts/bilibili_publish_cli.py cleanup \
    /tmp/bilibili-poster.png \
    /tmp/bilibili-poster-BVxxxx_assets
```

## CLI commands

```bash
python scripts/bilibili_publish_cli.py --help
python scripts/bilibili_publish_cli.py doctor
python scripts/bilibili_publish_cli.py probe --url 'https://www.bilibili.com/video/BV.../'
python scripts/bilibili_publish_cli.py self-test
python scripts/bilibili_publish_cli.py self-test --png
python scripts/bilibili_publish_cli.py generate --url 'BV...' --format html --out /tmp/poster.html
python scripts/bilibili_publish_cli.py generate --url 'BV...' --format png --out /tmp/poster.png
python scripts/bilibili_publish_cli.py cleanup /tmp/poster.png /tmp/poster_assets
```

All subcommands emit one JSON object to stdout. Read `ok`, `command`, `warnings`, and either `output`, `file`, `media`, or `data`. Failures return `ok: false` with `error.code` and `error.message`.

## Chromium requirement

PNG generation uses Playwright Chromium. If `doctor` reports Chromium is missing, install it in the skill environment:

```bash
UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run python -m playwright install chromium
```

Use `self-test --png` after installation to verify local PNG rendering without fetching Bilibili data.

## Offline fixtures

For deterministic tests or layout iteration, pass local JSON fixtures:

```bash
python scripts/bilibili_publish_cli.py generate \
  --url 'BV1Ai9eBKEU4' \
  --view-json /path/to/view.json \
  --comments-json /path/to/comments.json \
  --format html \
  --out /tmp/poster.html
```

Fixture mode disables remote asset downloads even when `--allow-remote-assets` is present.

## Layout guardrails

- Preserve the legacy long-image layout unless the user explicitly asks for redesign.
- Keep the Bilibili icon/wordmark in the left metadata column.
- Keep the QR panel aligned with metadata and preserve a generous QR quiet zone.
- Truncate comments or use DOM-height screenshots so the footer remains visible.
- Preserve real user-supplied `b23.tv/<token>` shortlinks.

See [SKILL.md](SKILL.md), [references/cli-usage.md](references/cli-usage.md), and [references/legacy-poster-regression-notes.md](references/legacy-poster-regression-notes.md) for workflow details.
