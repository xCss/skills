---
name: bilibili-publishing-workflows
description: "Use when the user provides a Bilibili URL, BV/AV ID, b23.tv link, or share text and needs metadata/comments packaged into a legacy-style Bilibili poster image or HTML export."
version: 2.0.0
author: Hermes Agent
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

1. Interpret the user request and extract the Bilibili input text.
2. Run `doctor` if dependencies, templates, Playwright, fonts, or environment are uncertain.
3. Run `probe --url ...` when validating a `b23.tv` redirect or checking identifier extraction.
4. Run `self-test` for a local fixture smoke test when changing the CLI or templates.
5. Run `generate` for the requested output:
   - `--format png` for the final long image.
   - `--format html` for fast fixture/testing review.
   - `--view-json` and `--comments-json` for offline tests or deterministic reproductions.
6. Preserve the legacy long-image layout: Bilibili icon/wordmark, QR panel, metadata rows, title, cover, comments, and visible footer. Use comment truncation plus DOM-height screenshots so the footer is never cut off.
7. If Feishu delivery is requested, use the Feishu image-upload flow documented in the archived reference or a dedicated Feishu skill/CLI; this Bilibili CLI intentionally owns poster generation, not Feishu credentials or message delivery.
8. Run `cleanup` silently for generated runtime files when appropriate; cleanup is limited to temp-directory outputs.

## Absorbed Reference Recipes

- `references/bilibili-video-poster.md` — core poster extraction and generation.
- `references/bilibili-video-poster-feishu-send.md` — archived Feishu image-send workflow and pitfalls.
- `references/legacy-poster-regression-notes.md` — session-derived guardrails for preserving the legacy long-image layout, QR quiet-zone/icon handling, comment truncation, footer visibility, and avoiding generic card-style regressions.
- `references/legacy-layout-iteration-notes.md` — concrete layout iteration notes: logo/wordmark inside the left info column, QR aligned in the same top row, separate single-line truncated title, and the f-string HTML escaping pitfall.
- `references/b23-shortlinks.md` — Bilibili `b23.tv/<token>` shortlinks are server-generated mappings; preserve real user-supplied shortlinks. If only a BV/canonical URL is available, `https://b23.tv/BVxxxx` can be used as a compact redirect URL after verification (it is not a unique_k official share token).
- `references/cli-usage.md` — canonical CLI command examples and JSON contract.
- `references/provider-resolution.md` — provider/API/dependency resolution, credential redaction, and fallback rules.

## Implementation Files

- `scripts/bilibili_publish_cli.py` — canonical stable CLI. It replaces the old scaffold and legacy generator; no compatibility wrapper is retained by request. It supports `doctor`, `probe`, `self-test`, `generate`, and safe temp-root `cleanup`.
- `templates/bilibili-poster.html` — reusable HTML structure template; runtime generation fills video data and writes a per-run HTML file under `/tmp` for Playwright screenshotting.
- `templates/bilibili-poster.css` — reusable poster CSS template; runtime generation injects font paths and embeds it into the per-run HTML.
- `templates/bilibili-gradient-icon.png` — reusable default Bilibili icon template; not a `/tmp` runtime artifact.
- `templates/bilibili-header-wordmark-transparent.png` — reusable transparent header logo/wordmark template (icon + polished “哔哩哔哩”); runtime generation may copy it into per-video cache, but the source template belongs under this skill's `templates/` directory.

## Common Pitfalls

1. **Sending a local image path as text.** Upload/send as an image message.
2. **Wrong Feishu target.** Resolve the current DM/chat before sending.
3. **Skipping PNG verification.** Check the exported PNG exists before delivery.
4. **Noisy cleanup notifications.** Delayed cleanup of `/tmp` runtime artifacts must be silent: do not send “收到/已清理/完成” messages for background housekeeping.
5. **Editing generated `/tmp` HTML instead of templates.** Persistent layout changes belong in `templates/bilibili-poster.html` and `templates/bilibili-poster.css`; `/tmp/*.html` is per-run rendered output and may be deleted.
6. **Regressing to an ad-hoc poster design.** The expected/default poster style is the legacy `bilibili-video-poster` long-image layout: Bilibili logo/wordmark integrated with the left metadata column, top-right QR panel with AV/BV short link, separate video title row, cover image, comment cards, and footer. Do not replace it with a generic pastel/card infographic unless the user explicitly asks for redesign.
7. **Calling removed legacy scripts.** Do not call old Hermes paths, `skill-content-cli.py`, or `generate_legacy_bilibili_poster.py`; the stable CLI is the only canonical execution path.
8. **Confusing official short tokens with compact BV redirects.** Official `b23.tv/<token>` shortlinks are generated by Bilibili's server-side share flow and cannot be deterministically calculated from BV alone. If the user supplies a real `b23.tv/<token>` link, preserve it. If only BV/canonical URL is available, `https://b23.tv/BVxxxx` is acceptable as a compact redirect form after verification; do not present it as an official unique_k short token.

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
