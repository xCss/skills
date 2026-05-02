# Legacy Bilibili Poster Layout Iteration Notes

Session-derived notes for reproducing the user's expected legacy `bilibili-video-poster` long-image layout.

## Layout decisions that mattered

- Treat the top area as a two-column block: **left information column** and **right QR column**.
- Put the Bilibili icon/wordmark inside the **left information column**, above the metadata rows. Do not make it a separate full-width header row when the user asks for a compact legacy layout.
- Keep the QR panel in the same top block as the metadata: `grid-template-columns: minmax(0, 1fr) 320px` worked well at 1080px poster width.
- Put the title below that top block as a separate title row.
- When the user says the title may hide overflow, use single-line truncation:
  ```css
  .title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ```
- Metadata rows can also use `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` to avoid breaking the left column.
- Preserve the larger QR quiet zone: `qrcode.QRCode(error_correction=H, box_size=8, border=5)` pasted into a 320px white canvas and displayed in a pink/white `qr-box`.
- Keep comments truncated and use Playwright DOM-height screenshots so the footer remains visible.

## Implementation pattern

The migrated implementation lives in `scripts/bilibili_publish_cli.py`; update that CLI and the checked-in templates rather than recreating the removed legacy generator or inventing a new PIL/card design. Use supplied raster assets when available:

- `--icon` for the Bilibili icon image.
- `--wordmark` for the Bilibili wordmark/brand lettering.

Recommended HTML shape for this variant:

```html
<section class="header">
  <div class="info-qr-row">
    <div class="left-info">
      <div class="brand"><img class="brand-image" ...></div>
      <div class="summary">metadata rows...</div>
    </div>
    <div class="qr-panel">QR + caption + AV/BV link</div>
  </div>
  <div class="title-row"><div class="title">video title</div></div>
</section>
```

## Python f-string pitfall

Avoid backslash-escaped HTML attributes inside f-string expressions. This caused:

```text
SyntaxError: f-string expression part cannot include a backslash
```

Fix by computing small conditional HTML fragments first, e.g.:

```python
badge_html = f'<span class="badge">{esc(badge)}</span>' if badge else ''
cards.append(f'''<section class="comment-card">...{badge_html}...</section>''')
```

## Verification checklist for this variant

- Logo/wordmark is visually part of the left information column.
- QR is aligned to the right of that same top information block.
- Title is a separate single line and truncates with ellipsis if too long.
- Cover, two comment cards, and footer are all visible with no bottom crop.
