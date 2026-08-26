# Ved Singh Portal Version History

## 2.0.0
- Platform split across five hostnames: vedsingh.com (hub), work.vedsingh.com, media.vedsingh.com, personal.vedsingh.com, and lab.vedsingh.com, served by one Worker via hostname-aware routing.
- New Editorial Index design system: a left index rail, numbered sections, and a shared typography and spacing system, in place of the Spider-Verse shell, shared across all five worlds via `public/assets/editorial.css`.
- Each world now carries its own fixed Earth identity, never a rotating theme: vedsingh.com is Earth-616, work.vedsingh.com is Earth-90214 (monochrome), media.vedsingh.com is Earth-1610 (evolved Spider-Verse), personal.vedsingh.com is Earth-65 (warm), lab.vedsingh.com is Earth-928 (dark, futuristic). The old four-universe rotator (616/1610/2099/Noir auto-switching every few minutes) is retired; only the Earth number is ever shown, no nicknames.
- Old `vedsingh.com/movies`-style routes now 302-redirect to the real service subdomains instead of serving an embedded shell.
- All existing Media backend integrations (System Pulse, Current Activity, Recently Added, cover-art proxying, command palette, Seerr/Aurral quick actions) preserved and re-skinned, not rewritten.
- Existing service subdomains (movies, music, books, audiobooks, games, seerr, status) unchanged.

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
