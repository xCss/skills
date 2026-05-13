---
name: bilibili-publishing-workflows
description: "Use when the user provides a Bilibili URL, BV/AV ID, b23.tv link, or share text and needs metadata/comments packaged into a legacy-style Bilibili poster image or HTML export."
version: 2.0.0
license: MIT
metadata:
  hermes:
    tags: [bilibili, poster, publishing, feishu, video, social-content]
    related_skills: [web-research-and-extraction, feishu-workflows]
---

# Bilibili Publishing Workflows

## Overview

Skill + CLI workflow for Bilibili content packaging. The Skill layer decides when to use the workflow and which options matter; the CLI layer performs video-id resolution, metadata/comment fetching, poster rendering, PNG/HTML export, diagnostics, cleanup, and JSON output.

## When to Use

- The user provides a Bilibili URL, BV/AV ID, `b23.tv` shortlink, or share text and wants a poster/long image.
- The user wants video metadata and popular comments extracted for a shareable graphic.
- The user wants an HTML fixture render for inspection or a PNG generated through Playwright.

Do not use this skill for unrelated video platforms or for simple explanation-only questions that do not require Bilibili data extraction or poster generation.

## CLI

Canonical command surface:

```bash
UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run --project bilibili-publishing-workflows \
  python scripts/bilibili_publish_cli.py --help

UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run --project bilibili-publishing-workflows \
  python scripts/bilibili_publish_cli.py doctor

UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run --project bilibili-publishing-workflows \
  python scripts/bilibili_publish_cli.py probe --url 'https://www.bilibili.com/video/BV.../'

UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run --project bilibili-publishing-workflows \
  python scripts/bilibili_publish_cli.py self-test

UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run --project bilibili-publishing-workflows \
  python scripts/bilibili_publish_cli.py self-test --png

UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run --project bilibili-publishing-workflows \
  python scripts/bilibili_publish_cli.py generate \
    --url 'https://www.bilibili.com/video/BV.../' \
    --format png \
    --out /tmp/bilibili-poster.png

UV_PROJECT_ENVIRONMENT=/tmp/bilibili-publishing-workflows-venv \
  uv run --project bilibili-publishing-workflows \
  python scripts/bilibili_publish_cli.py cleanup /tmp/bilibili-poster.png /tmp/bilibili-poster-BVxxxx_assets
```

All operational subcommands write JSON only to stdout. Parse `ok`, `command`, `output`/`file`/`media`/`data`, and `warnings`; failures return `ok: false` with stable `error.code` and `error.message`.

## Workflow

1. Parse the Bilibili input.
2. Use `doctor`, `probe`, and `self-test` when environment or templates may be unstable.
3. Use `generate` for HTML review or PNG output.
4. Keep the legacy long-image layout, comment truncation, and footer visibility.
5. Use Feishu-specific tooling only when delivery is requested.
6. Run `cleanup` only for temp-directory outputs.

## References

- [references/cli-usage.md](references/cli-usage.md) — command examples and JSON contract.
- [references/provider-resolution.md](references/provider-resolution.md) — provider/API/dependency resolution.
- [references/legacy-poster-regression-notes.md](references/legacy-poster-regression-notes.md) — layout and footer guardrails.
- [references/b23-shortlinks.md](references/b23-shortlinks.md) — real `b23.tv/<token>` handling.

## Implementation Files

- [scripts/bilibili_publish_cli.py](scripts/bilibili_publish_cli.py) — stable CLI entry point.
- [scripts/bilibili_publish/](scripts/bilibili_publish/) — runtime, API, assets, and rendering.
- [templates/bilibili-poster.html](templates/bilibili-poster.html) — poster HTML template.
- [templates/bilibili-poster.css](templates/bilibili-poster.css) — poster CSS template.
- [templates/bilibili-gradient-icon.png](templates/bilibili-gradient-icon.png) — default icon template.
- [templates/bilibili-header-wordmark-transparent.png](templates/bilibili-header-wordmark-transparent.png) — reusable transparent wordmark asset.

## Common Pitfalls

1. **Sending a local image path as text.** Upload/send as an image message.
2. **Wrong Feishu target.** Resolve the current DM/chat before sending.
3. **Skipping PNG verification.** Check the exported PNG exists before delivery.
4. **Noisy cleanup notifications.** Keep temp-file cleanup silent.
5. **Editing generated `/tmp` HTML instead of templates.** Persistent layout changes belong in `templates/`.
6. **Regressing to a generic poster design.** Keep the legacy long-image layout unless redesign is explicitly requested.
7. **Treating compact BV redirects as official short tokens.** Preserve real `b23.tv/<token>` links; only use compact redirects when verification allows it.

## Verification Checklist

- [ ] BV/AV ID or URL parsed correctly.
- [ ] Real user-supplied `b23.tv/<token>` links are preserved in the QR target and visible link text; when only BV/canonical URL is available, verified `b23.tv/BVxxxx` redirect form is acceptable for compact poster display.
- [ ] Poster HTML/PNG generated.
- [ ] CLI stdout parsed as JSON; no plain path/log text treated as success.
- [ ] Legacy layout preserved when no redesign is requested.
- [ ] QR code has enough quiet-zone/outer margin and uses the provided Bilibili icon when applicable; QR caption shows only “扫码查看原视频” plus the visible link, with no separate AV line below it.
- [ ] Header wordmark matches the supplied/reference Bilibili brand typography; prefer raster wordmark assets over generic CJK font approximations when available. If no raster wordmark is supplied, the fallback generator must still render the combined header mark: supplied/pink Bilibili icon + polished black “哔哩哔哩” Chinese wordmark; never fall back to icon-only. Prefer a more refined CJK serif/brand-like wordmark over plain system sans when generating text fallback. The combined logo/wordmark asset must use transparent PNG/no white rectangle so it sits directly on the poster background.
- [ ] Comments are truncated or fully captured; no mid-comment bottom crop.
- [ ] Footer is visible and uses `id BVxxxx`, not AV ID.
- [ ] Delivery target verified by the Feishu workflow/CLI when sending.
- [ ] Final image/message ID or output path reported.
