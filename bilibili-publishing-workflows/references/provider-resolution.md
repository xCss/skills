# Bilibili Publishing Provider Resolution

The CLI owns provider and runtime checks. Agents should not assemble temporary scripts for these responsibilities.

## Providers and dependencies

- Bilibili metadata: `GET https://api.bilibili.com/x/web-interface/view` using BV or AV identifiers.
- Bilibili comments: `GET https://api.bilibili.com/x/v2/reply` using video `aid`.
- Shortlink resolution: follow user-supplied `https://b23.tv/<token>` redirects when needed.
- Rendering: checked-in HTML/CSS templates plus Pillow/qrcode assets.
- PNG export: Playwright Chromium screenshot of the `.poster` DOM box.
- Optional delivery: Feishu image upload/send flow from the archived reference.

## Safety rules

- Never print cookies, tokens, passwords, Authorization headers, `.env` contents, or full connection strings.
- If credentials must be described, print `[REDACTED]`.
- Preserve real user-supplied `b23.tv/<token>` links exactly.
- Treat `https://b23.tv/BVxxxx` as a compact redirect form, not an official `unique_k` short token.
- Do not download arbitrary fixture/API URLs. Remote poster assets are disabled in fixture mode and otherwise limited to expected Bilibili/CDN host suffixes.
- `cleanup` only removes paths under the system temp directory; refuse arbitrary paths with JSON warnings.

## Fallbacks

- Use `--view-json` and `--comments-json` for deterministic/offline rendering; remote assets remain disabled even if `--allow-remote-assets` is supplied.
- If avatars or cover images fail to download, use local icon assets where possible.
- If PNG export fails, inspect `doctor`, Playwright installation, and the generated HTML fixture.
