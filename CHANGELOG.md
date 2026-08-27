# Ved Singh Portal Version History

## 2.1.0 (unreleased, on `redesign/v2`)
- Built `lab.vedsingh.com` as a fresh Earth-928 world: deep navy/graphite
  background, restrained cyan accent, technical annotation language, and
  a subtle schematic grid, on a new self-contained `lab.css` (own rail
  nav, no dependency on the shared `editorial.css`/`tokens-futures.css`
  system). Content focuses on local AI, server experiments, Linux
  experiments, prototypes, and experimental tooling — explicitly not
  settled personal systems, which stay on Personal.
- Refined Home (`vedsingh.com`) with an explicit first-person
  introduction in the hero, alongside its existing section index.
- Finished per-world PWA identity cleanup: every world (Home, Work,
  Media, Personal, Lab) now has its own self-contained
  `manifest.webmanifest` and `/icons/<world>.svg` icon, used for both
  the favicon and the Apple touch icon. Removed the Host-header-based
  dynamic `/manifest.webmanifest` and `/app-icon.svg`/`/apple-touch-icon.svg`
  resolution from the Worker in favor of these static, per-path files —
  the same self-contained pattern already proven by Work and Personal.
  Updated Media's service worker precache list and image-fallback paths
  to match, and bumped its cache version.
- Removed `tokens-mono.css`, `tokens-warm.css`, and `tokens-futures.css`
  — dead files once Work, Personal, and now Lab forked into their own
  bespoke stylesheets.
- Removed the two remaining user-facing bracketed placeholders before
  they could ship: Lab's "Currently Testing" module (`[Current build]`,
  `[Current experiment]`, `[Current prototype]`) and Personal's
  "Currently" card row (`[Book Title]`, `[Game Title]`, `[Note Title]`).
  Both were cut entirely rather than backfilled with invented content —
  each was a self-contained section whose own heading/intro had no
  meaning without real data, so partial edits would have left dangling
  copy. Confirmed no awkward gap results: the footer's own top margin
  provides the spacing in both cases.
- No visual or content changes to Work, Media, or Personal.

## 2.0.0
- Platform split across five hostnames: vedsingh.com (hub), work.vedsingh.com, media.vedsingh.com, personal.vedsingh.com, and lab.vedsingh.com, served by one Worker via hostname-aware routing.
- New Editorial Index design system: a left index rail, numbered sections, and a shared typography and spacing system, in place of the Spider-Verse shell, shared across all five worlds via `public/assets/editorial.css`.
- Each world now carries its own fixed Earth identity, never a rotating theme: vedsingh.com is Earth-616, work.vedsingh.com is Earth-90214 (monochrome), media.vedsingh.com is Earth-1610 (evolved Spider-Verse), personal.vedsingh.com is Earth-65 (warm), lab.vedsingh.com is Earth-928 (dark, futuristic). The old four-universe rotator (616/1610/2099/Noir auto-switching every few minutes) is retired; only the Earth number is ever shown, no nicknames.
- Old `vedsingh.com/movies`-style routes now 302-redirect to the real service subdomains instead of serving an embedded shell.
- All existing Media backend integrations (System Pulse, Current Activity, Recently Added, cover-art proxying, command palette, Seerr/Aurral quick actions) preserved and re-skinned, not rewritten.
- Existing service subdomains (movies, music, books, audiobooks, games, seerr, status) unchanged.
- Clarified the content boundary: Personal owns settled personal systems and self-hosted Obsidian/sync notes; Lab owns prototypes, local AI tests, and server/Linux exploration.
- Final QA hardening: canonical subdomain redirects for direct world paths, accessible Media tabs and command dialog focus containment, safer Media service-worker caching, API input normalization, and removal of the unused v1 root-site files.

## 1.5.2
- Changed the Music routed page back to the canonical public URL: `https://music.vedsingh.com`
- Kept Navidrome API calls on `/music` because the server uses `ND_BASEURL=/music`
- No feature redesign; this is a patch release

## 1.5.1
- Fixed top navigation routes returning to Home on Cloudflare
- `/movies`, `/music`, `/books`, `/audiobooks`, `/games`, and `/status` now keep their routed URL while serving the portal shell
- No feature redesign; this is a patch release

## 1.5.0
- Real routed service pages under the persistent Ved Singh shell
- Navigation links hardened so `/movies`, `/music`, `/books`, `/audiobooks`, `/games`, and `/status` work as real pages
- RetroAssembly status fallback when a Kuma monitor is absent or named differently
- Browser tab fixed to `Ved Singh`

## 1.4.0
- Unified Current Activity
- Multi-library Recently Added
- Games / RetroAssembly added as a main service
- Media integrations and System Pulse cleanup

## 1.3.0
- Seerr and Aurral converted to compact secondary actions
- Kuma monitor-name/status improvements
- Updated service-card layout

## 1.2.0
- Aurral hostname correction
- Retired-monitor filtering
- Browser-title cleanup

## 1.1.0
- Original Spider-Verse portal baseline
- Four universe themes
- Service cards, command palette, Uptime Kuma and Jellyfin dashboard
