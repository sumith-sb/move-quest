# Fonts

The UI headings use **Acid Grotesk** (Goodspeed's display typeface). It is a
licensed commercial font from [Lineto](https://lineto.com) and is **not**
committed to this repo — the `.otf` files are git-ignored on purpose because
this is a public repository.

The app still runs without them: `styles.css` declares `font-display: swap`
with a **Geist** fallback, so headings render in Geist until Acid Grotesk is
present.

## Installing the fonts (Goodspeed team only)

Copy these 7 weights from the `goodspeed-design` skill bundle
(`~/.claude/skills/goodspeed-design/fonts/`) into this folder:

```
acid-grotesk-light.otf      → 300
acid-grotesk-regular.otf    → 400
acid-grotesk-medium.otf     → 500
acid-grotesk-bold.otf       → 700
acid-grotesk-thin.otf       → 100  (bundled, not yet mapped)
acid-grotesk-extralight.otf → 200  (bundled, not yet mapped)
acid-grotesk-normal.otf     → 450  (bundled, not yet mapped)
```

The `@font-face` declarations live in `web/src/styles.css`.

**Do not** publish these files to public sites, CDNs, or unauthenticated repos.
