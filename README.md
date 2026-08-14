# Triple H — Website

Single-page scroll cinematic for [triple-h.ca](https://triple-h.ca). Hosted on GitHub Pages, video and image assets in-repo and on Cloudflare R2.

## Stack

- Plain HTML/CSS/vanilla JS — no build step
- **GSAP + ScrollTrigger** — scroll-driven animation + video scrubbing
- **Lenis** — smooth scroll
- Video assets bundled in `/videos` (from Pexels, free-to-use)
- 360°/interior stills served from Cloudflare R2 (`pub-1008667921dc46088c845c1f999cb016.r2.dev`)
- Deployed to GitHub Pages. Currently serves at `triplehinc.github.io/triple-h-website/`. Custom domain `triple-h.ca` will be attached (via a `CNAME` file + Pages settings) once DNS is switched off Wix.

## Structure

Everything is one page — `index.html` — divided into six acts:

| Act | ID | Content |
|-----|----|---------|
| 1 | `#top` | Hero — Ottawa aerial video, auto-loop, tagline |
| 2 | `#approach` | House exterior — scroll-scrubbed video (pinned) |
| 3 | `#interior` | Finished-space hero image (from R2), "step inside" text |
| 4 | `#transform` | Before → After crossfade of a Bakervale kitchen (scroll-scrubbed) |
| 5 | `#services` | Renovation / Extensions / Design Build cards |
| 6 | `#contact` | Contact form + phone + email |

## Run locally

```bash
npx serve -l 5500 --cors .
```

Then visit `http://localhost:5500/`.

Port **must** be `5500` (or `127.0.0.1:5500`) — that's what R2's CORS allowlist accepts. Any other origin will fail on cross-origin image loads.

The `.claude/launch.json` starts this server automatically in Claude Code.

## Deploy

Push to `main`:

```bash
git add .
git commit -m "your message"
git push
```

GitHub Pages redeploys automatically (~30–60 sec).

## What still needs to happen before the site is fully operational

- [ ] **Formspree signup + wiring.** The contact form's `action` in `index.html` is `https://formspree.io/f/YOUR_FORMSPREE_ID`. Sign up at [formspree.io](https://formspree.io/register), create a form pointing at `contact@triple-h.ca`, and replace `YOUR_FORMSPREE_ID` with your actual ID. Instructions are in the HTML comment above the form. Until wired, submissions show a fallback message pointing to the email address.
- [ ] **R2 CORS update.** In Cloudflare → R2 → `h3-images` → Settings → CORS Policy, ensure `AllowedOrigins` includes `https://triplehinc.github.io` (for the current URL), plus `https://triple-h.ca` and `https://www.triple-h.ca` (for after the DNS switch). Keep `http://localhost:5500` / `http://127.0.0.1:5500` for local dev.
- [ ] **DNS switch.** Point `triple-h.ca` and `www.triple-h.ca` from Wix to GitHub Pages. Docs: [GitHub Pages custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site). At the same time, recreate the `CNAME` file at the repo root containing just `triple-h.ca`, and re-enter the custom domain in the Pages settings UI.
- [ ] **Cancel Wix.**

## Roadmap

- Replace R2-hosted equirectangular panoramas in Acts 3 & 4 with flat re-projections (better visual quality — the pano's edges warp slightly at wide crops).
- Add more before/after transformations from the other two projects (Pathfinder Way, Amiens).
- Write real project copy replacing the placeholder headlines.
- Re-enable the `Before & After` page once the H3-Interface iframe target is live again (the old page was removed in this rebuild — restore from git history).
- Image-resize Worker on `h3-upload` so mobile visitors don't download 6 MB panos.
- Custom subdomain (e.g. `assets.triple-h.ca`) on the R2 bucket to move off the rate-limited public dev URL.
