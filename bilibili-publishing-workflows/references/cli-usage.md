# Bilibili Publishing CLI Usage

Canonical CLI:

```bash
UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run --project bilibili-publishing-workflows \
  python scripts/bilibili_publish_cli.py <subcommand> [options]
```

## Commands

```bash
python scripts/bilibili_publish_cli.py --help
python scripts/bilibili_publish_cli.py doctor
python scripts/bilibili_publish_cli.py probe --url 'https://www.bilibili.com/video/BV1Ai9eBKEU4/'
python scripts/bilibili_publish_cli.py self-test
python scripts/bilibili_publish_cli.py generate --url 'BV1Ai9eBKEU4' --format png --out /tmp/bilibili-poster.png
python scripts/bilibili_publish_cli.py generate --url 'BV1Ai9eBKEU4' --format html --view-json /tmp/view.json --comments-json /tmp/comments.json --out /tmp/poster.html
python scripts/bilibili_publish_cli.py cleanup /tmp/bilibili-poster.png /tmp/bilibili-poster-BV1Ai9eBKEU4_assets
```

## JSON stdout

Success contains `ok: true`, `command`, `warnings`, and at least one result field such as `output`, `file`, `media`, or `data`.

Failure contains `ok: false`, `command`, `error.code`, and `error.message`. Debug text must not be printed to stdout.

## Migration note

`scripts/bilibili_publish_cli.py` is the only canonical execution entry. The previous scaffold and legacy generator were removed; no compatibility wrapper is retained.

`cleanup` is intentionally limited to temp-directory outputs. Fixture mode (`--view-json` / `--comments-json`) is offline by default and does not download remote image assets.
