# Triple H — Website

Static site for [triple-h.ca](https://triple-h.ca). Hosted on GitHub Pages, 360° assets on Cloudflare R2.

## Stack

- Plain HTML/CSS/vanilla JS — no build step
- **GSAP + ScrollTrigger** for scroll-driven animation
- **Lenis** for smooth scrolling
- **Pannellum** for WebGL 360° panoramas
- Assets served from Cloudflare R2 (`pub-1008667921dc46088c845c1f999cb016.r2.dev`)
- Deployed to GitHub Pages with custom domain `triple-h.ca` (see `CNAME`)

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Homepage — hero pano sweep, time-lapse dissolves, 360 walkthrough, services, contact |
| `about.html` | Company story with pano backdrop + parallax |
| `inaction.html` | Stacked 360° walkthroughs of finished spaces |
| `before-after.html` | Iframe wrapper for the H3-Interface project tool |

## Run locally

```bash
npx serve -l 5500 --cors .
```

Then visit `http://localhost:5500/`.

Port **must** be `5500` (or `127.0.0.1:5500`) because that's what the R2 bucket's CORS allowlist accepts. Any other origin will show a "could not be accessed" error on the 360 viewers.

The `.claude/launch.json` in this repo starts this server for you if you're using Claude Code.

## Deploy

Pushing to the `main` branch of a GitHub repo with Pages enabled will publish automatically.

```bash
git add .
git commit -m "your message"
git push
```

**First-time repo setup:**

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Then in the GitHub repo settings → Pages → Source: `main` branch, `/` root.

## What still needs to happen before the site is fully operational

- [ ] **Formspree signup + wiring.** The contact form in `index.html` posts to a placeholder endpoint (`https://formspree.io/f/YOUR_FORMSPREE_ID`). Sign up at [formspree.io](https://formspree.io/register), create a form pointing at `contact@triple-h.ca`, and replace `YOUR_FORMSPREE_ID` with your actual ID. Instructions are in the HTML comment above the form.
- [ ] **CORS update.** Add the GitHub Pages URL (e.g. `https://YOUR_USERNAME.github.io`) and the production domain (`https://triple-h.ca`, `https://www.triple-h.ca`) to the R2 bucket CORS policy in Cloudflare. Without this, 360 viewers fail on the live site.
- [ ] **DNS switch.** Point `triple-h.ca` and `www.triple-h.ca` from Wix to GitHub Pages (A/AAAA records for `@`, CNAME for `www`). GitHub Pages docs walk through it: [Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).
- [ ] **Cancel Wix.**

## Roadmap (post-launch)

- Homepage rebuild as a scroll-driven cinematic video (Ottawa aerial → house exterior → interior tour → time-lapse). Stock clips from Pexels + flat views extracted from the existing 360s.
- Add Pathfinder Way and Amiens projects as additional scenes
- Real copy replacing placeholder headlines
- Image-resize Worker on `h3-upload` so mobile visitors don't download 6 MB panos
- Custom subdomain (e.g. `assets.triple-h.ca`) on the R2 bucket so we don't rely on the rate-limited pub URL
