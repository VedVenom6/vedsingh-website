# Ved Singh Portal — v1.5.2

Production architecture:

GitHub → Cloudflare Worker (`vedsingh-home`) → `vedsingh.com`

The NAS copy is optional/local. Production does not depend on the NAS website container.

## Current portal behavior

- Random Spider-Verse universe on each fresh load.
- Earth-928 / 2099, Earth-1610, Earth-616, Earth-90214 / Noir.
- Automatic universe change every 4 minutes.
- Browser tab title stays `Ved Singh`.
- Movies uses Jellyfin with a compact Seerr Request action.
- Music uses Navidrome with a compact Aurral Add Music action.
- Unified Current Activity can show Jellyfin, Navidrome, Kavita and Audiobookshelf.
- Recently Added has tabs for Movies & TV, Music, Books & Comics, Audiobooks and Games.
- Games points to RetroAssembly; its recent-items tab gracefully falls back because no stable public recent-games API is configured.
- System Pulse filters retired Mylar3, Shelfarr, Syncthing and AdGuard Home monitors from the homepage summary.
- Portal navigation stays on `vedsingh.com` and jumps between the unified views.

## Deploy through GitHub

On the NAS:

```bash
cd /volume1/docker/website
git add public src wrangler.toml README.md SETUP-SECRETS.md
git commit -m "Build unified media portal"
git pull --rebase origin main
git push
```

Your Cloudflare Git connection should deploy the pushed commit.

After deployment, hard refresh with `Ctrl+Shift+R`.


## Routed service pages

The top navigation now uses real portal URLs while keeping the Ved Singh shell visible:

- `/movies` → Jellyfin
- `/music` → Navidrome
- `/books` → Kavita
- `/audiobooks` → Audiobookshelf
- `/games` → RetroAssembly
- `/status` → Uptime Kuma

The service itself is loaded underneath the persistent header/navigation using an iframe. Every page includes an **Open directly** fallback because a service can refuse iframe embedding through its own `X-Frame-Options` or `Content-Security-Policy`.
