# Legacy Bilibili Poster Regression Notes

Session-derived notes for preserving the expected `bilibili-video-poster` long-image style after skill consolidation.

## User expectation

When the user sends a Bilibili URL/BV ID in this chat, default behavior is to generate and return the poster image directly. Do not ask whether to continue and do not replace the poster with a generic infographic/card design.

## Canonical visual layout

The expected/default output is the legacy long-image layout:

- light gray/off-white background;
- top-left Bilibili app/logo icon plus large `哔哩哔哩` wordmark;
- top-right QR code panel with generous quiet zone, `扫码查看原视频`, AV ID, and `b23.tv/<BV>` short link;
- left metadata rows: `作品类型`, `评论数量`, `弹幕数量`, `视频时长`, `UP主`;
- large title below metadata;
- rounded video cover image;
- 1–2 comment cards with avatar, nickname, optional badge, like count, truncated comment text, publish date/location/reply count;
- bottom footer: `bilibili-video-poster`, version pill, `& Id`, AV ID pill.

## Regressions observed

1. A hand-written PIL/card poster used a pastel tech-card layout, which was visually wrong for this workflow.
2. Reconstructing the old layout with a fixed screenshot height caused the second long comment to be cut off and hid the footer.
3. Long comments must not be allowed to push the footer outside the captured image unless the screenshot height is computed from DOM height.
4. QR code was too tight; the user requested larger outer margin/quiet zone.
5. The icon should use the provided Bilibili app icon when the user supplies one, and the same icon should be embedded in the QR center.
6. The `哔哩哔哩` header should match Bilibili's brand wordmark style. If the user supplies a reference wordmark/logo image, crop and use that raster asset directly instead of approximating it with a generic system font. Avoid loose default CJK letter spacing.
7. Preserve BV letter casing exactly in the short link and generated QR URL.

## Implementation guidance

- Prefer the original `bilibili-video-poster` implementation when present. If only the archived reference remains, reconstruct the HTML/CSS layout rather than using pure-PIL layout.
- Generate QR with high error correction and a larger quiet zone, e.g. `qrcode.QRCode(error_correction=ERROR_CORRECT_H, border=5)`; fit the QR into a white canvas so it has visible outer margin inside the pink QR panel.
- For the top brand header, prefer a supplied Bilibili wordmark/logo reference image when available. Crop non-white bounds, resize to the header height, and render it as an image. This is more faithful than trying to simulate Bilibili typography with local CJK fonts.
- If embedding a center logo in the QR, keep the logo small and backed by a white rounded square so scanability remains high.
- Limit comment text length (roughly 120–150 Chinese characters) with an ellipsis, or dynamically screenshot the full DOM height. Prefer truncation for shareable posters so the footer is always visible.
- Use Playwright/Chromium screenshot with `.poster` bounding box height, not a hard-coded 2400px viewport clip. If the DOM is still very tall, intentionally truncate comment text before screenshot.
- Always verify the PNG exists and that the footer is visible before returning `MEDIA:` when doing manual reconstruction.
- Use `/tmp` outputs plus delayed cleanup after delivery.

## Minimal QA checklist for future runs

- [ ] Top-left Bilibili icon and wordmark are present.
- [ ] QR panel has enough white margin/quiet zone and contains the intended icon.
- [ ] AV ID and `b23.tv/<BV>` preserve the exact BV casing.
- [ ] Title and cover are visible and not distorted.
- [ ] Comment cards are not cut off mid-line.
- [ ] Footer is visible at the bottom.
- [ ] Final response is only `MEDIA:/tmp/...png` when the user asked for the image.
