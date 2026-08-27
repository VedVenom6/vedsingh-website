# Ved Singh Platform — v2.0.0

Production architecture:

GitHub → Cloudflare Worker (`vedsingh-home`) → five hostnames

One Worker serves five platform worlds from a single `./public` asset
directory. It picks which world to serve by the request's `Host`
header (see `src/index.js`). The NAS copy under `compose.yaml` is
optional/local; production does not depend on the NAS website
container being online.

## Platform worlds

Every world has its own permanent Earth identity — not a rotating
theme, one fixed identity per domain. Only the Earth number is ever
shown in the UI; retired nicknames like "Noir," "2099," or "Ultimate"
do not appear anywhere.

| Domain | World | Earth | Character | Stylesheet |
| --- | --- | --- | --- | --- |
| `vedsingh.com` | Central hub | Earth-616 | Balanced, editorial, foundational | `editorial.css` + `tokens-cool.css` |
| `work.vedsingh.com` | Work — HLIF and other projects | Earth-90214 | Restrained, monochrome, professional | `work.css` (own stylesheet) |
| `media.vedsingh.com` | Media — the designed media portal | Earth-1610 | Kinetic, graphic, expressive (evolved Spider-Verse) | `editorial.css` chrome + `media.css` content |
| `personal.vedsingh.com` | Personal — settled systems, self-hosted notes, interests | Earth-65 | Warmer, creative, personal | `personal.css` (own stylesheet) |
| `lab.vedsingh.com` | Lab — local AI, server/Linux experiments, prototypes | Earth-928 | Deep navy/graphite, cyan accent, technical/schematic | `lab.css` (own stylesheet) |

Every world shares `public/assets/base.css` (reset, skip-link, focus-visible,
44px touch targets, `prefers-reduced-motion`) unconditionally. Home is
the one world still built on the shared `editorial.css` rail-nav system
(the "Editorial Index" base identity the others diverge from), and
Media reuses that same chrome for its rail/masthead/footer while its
content area is fully its own. Work, Personal, and Lab each fork into
a fully self-contained, bespoke stylesheet — their own nav markup,
palette, and layout — rather than a token-file swap on the shared
system. Shared platform DNA comes from navigation structure,
typography discipline, spacing rhythm, motion philosophy, and
interaction quality, never from literally sharing one stylesheet.

Each world is also fully self-contained for PWA/browser metadata: its
own `manifest.webmanifest` at its own path (`/manifest.webmanifest` for
Home, `/work/manifest.webmanifest`, `/media/manifest.webmanifest`,
`/personal/manifest.webmanifest`, `/lab/manifest.webmanifest`), and its
own icon at `/icons/<world>.svg` used for both the favicon and the
Apple touch icon. There is no shared `/app-icon.svg` or
`/apple-touch-icon.svg` resolved dynamically by Host header — that
approach was replaced with these static, self-contained paths, which
are simpler and were already proven out by Work and Personal.

## Existing service subdomains (unchanged)

These are separate, already-existing destinations. This Worker does
not route them; `media.vedsingh.com` links to and, where appropriate,
proxies data from them.

- `movies.vedsingh.com` — Jellyfin
- `music.vedsingh.com` — Navidrome
- `books.vedsingh.com` — Kavita
- `audiobooks.vedsingh.com` — Audiobookshelf
- `games.vedsingh.com` — RetroAssembly
- `seerr.vedsingh.com` — Seerr (media requests)
- `status.vedsingh.com` — Uptime Kuma

Bookmarks to the old `vedsingh.com/movies`-style routes 302-redirect
to the matching service subdomain (see `LEGACY_PORTAL_REDIRECTS` in
`src/index.js`).

## Media portal behavior

- System Pulse and per-service status dots, from Uptime Kuma via
  `/api/status`.
- Unified Current Activity across Jellyfin, Navidrome, Kavita, and
  Audiobookshelf, via `/api/activity`.
- Recently Added, tabbed across Movies & TV, Music, Books,
  Audiobooks, and Games, via `/api/recent`.
- Authenticated cover-art proxying for Navidrome, Kavita, and
  Audiobookshelf, via `/api/media-image`.
- A command palette (`Ctrl/Cmd+K`) that jumps to any world or
  service.
- Seerr request and Aurral add-music quick actions on the relevant
  category panels.
- Each category also links directly to its real service subdomain, so
  the embedded panel above always has a same-content escape hatch.

All of the above degrade to a clean empty or "unavailable" state
automatically when a backend integration isn't configured or is
unreachable, and never depend on the NAS being online for the site
itself to load. The multiverse theme rotator from v1.x (four
Spider-Verse "universes" auto-switching every few minutes) was
retired in v2.0.0: Earth-1610 is now the fixed, evolved Media
identity, not one of several rotating skins.

## Deploy through GitHub

On the NAS (or any machine with the repo checked out):

```bash
git add public src wrangler.toml README.md CHANGELOG.md VERSION
git commit -m "Describe the change"
git pull --rebase origin main
git push
```

Your Cloudflare Git connection deploys the pushed commit.

After deployment, hard refresh with `Ctrl+Shift+R`.

## Deploying the v2.0.0 subdomain architecture

This repo change alone does not make the five subdomains live. Before
`work.vedsingh.com`, `media.vedsingh.com`, `personal.vedsingh.com`,
and `lab.vedsingh.com` will resolve, add each as a Custom Domain on
the `vedsingh-home` Worker in the Cloudflare dashboard (Workers &
Pages → vedsingh-home → Settings → Domains & Routes). Cloudflare
creates the DNS record for you when you add a Custom Domain this way.
See the comments in `wrangler.toml` for the alternative manual-DNS
path. The seven existing service subdomains need no DNS changes.

## Local secrets

See `SETUP-SECRETS.md`. The site deploys and works without them;
missing integrations show clean fallback states.
