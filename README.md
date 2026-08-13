# vedsingh.com

Static personal service hub for `vedsingh.com`.

## Files

- `index.html` — page structure and service links
- `style.css` — responsive multiverse design
- `script.js` — random landing theme + occasional automatic universe changes
- `wrangler.jsonc` — Cloudflare Worker static-assets deployment
- `docker-compose.yml` — optional NAS/Nginx copy on port 8088
- `assets/` — put images/icons here if needed

## Themes

- Earth-616 — clean/classic
- Earth-1610 — cell-shaded/comic
- Earth-928 — Spider-Man 2099 inspired
- Earth-90214 — Noir

A fresh page/tab starts on a random universe. While left open, the theme changes at a random interval between 12 and 24 minutes.

## Deploy

Commit and push to `main`. Cloudflare's Git integration can deploy the site automatically.

The NAS copy can be updated with:

```bash
cd /volume1/docker/website
git pull
```
