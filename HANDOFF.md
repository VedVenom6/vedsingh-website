# Handoff — Ved Singh Platform v2.0.0

**Branch:** `redesign/v2`
**Latest commit:** `2c25d41` — "Docs: reflect the per-world Earth identity mapping"
**Written:** 2026-08-27
**Status:** Implementation complete, not deployed. Live browser visual QA in progress, interrupted mid-pass (see "Validation status" below). This is a checkpoint only — no new feature work happened in the session that wrote this file.

Production `main` has not been touched. Nothing has been deployed. `wrangler deploy` has never been run for real, only `--dry-run`.

---

## 1. What has been implemented

A full rebuild of vedsingh.com from the old single-page Spider-Verse portal into a five-domain platform, one Cloudflare Worker, hostname-aware routing, one shared design system with five per-world "Earth" identities.

- **Hostname-aware routing** in `src/index.js`: one Worker, one `./public` asset directory, picks which world's page to serve by the request's `Host` header.
- **Legacy compatibility**: old `vedsingh.com/movies`-style paths 302-redirect to the real service subdomain instead of 404ing or serving a shell.
- **Shared Editorial Index design system**: `public/assets/base.css` (reset, focus-visible, skip-link, reduced-motion, 44px touch targets — used by all five worlds including Media) and `public/assets/editorial.css` (rail nav, mobile strip nav, masthead, hero, index list, ledger, closing/revision-log, currently module, system list, footer — used by all worlds except Media's content area).
- **Five per-world token files** setting the Editorial Index color variables: `tokens-cool.css` (Home), `tokens-mono.css` (Work), `tokens-warm.css` (Personal), `tokens-futures.css` (Lab). Media does not use a token file — it has its own separate stylesheet.
- **Five world pages**: `public/index.html` (Home), `public/work/index.html`, `public/personal/index.html`, `public/lab/index.html`, `public/media/index.html`.
- **Media portal** (`public/assets/media.css` + `public/assets/media.js`): the old portal's functionality preserved and re-skinned into the Earth-1610 evolved identity — System Pulse, Current Activity, Recently Added (tabbed), cover-art proxying, command palette (Ctrl/Cmd+K), Seerr/Aurral quick actions. The old four-universe theme rotator was retired.
- **Docs updated**: `README.md`, `CHANGELOG.md`, `VERSION` (2.0.0), `package.json` version.

---

## 2. The five-domain architecture (locked)

| Domain | Earth | Character | Tokens |
| --- | --- | --- | --- |
| `vedsingh.com` | **Earth-616** | Balanced, editorial, foundational | `tokens-cool.css` |
| `work.vedsingh.com` | **Earth-90214** | Restrained, monochrome, professional (zero-chroma, not dark) | `tokens-mono.css` |
| `media.vedsingh.com` | **Earth-1610** | Kinetic, graphic, expressive — evolved Spider-Verse | own `media.css` |
| `personal.vedsingh.com` | **Earth-65** | Warmer, creative, personal | `tokens-warm.css` |
| `lab.vedsingh.com` | **Earth-928** | Futuristic, technical, experimental (dark, cyan-accented) | `tokens-futures.css` |

**No nicknames, anywhere, ever.** "Noir," "2099," "Ultimate," "Spider-Man 2099" must never appear in the UI — only the Earth number. This was violated once already (the shared favicon `public/icon.svg` had "2099" baked into it as literal SVG text) and was fixed. Grep the whole `public/` and `src/` tree for `noir|2099|ultimate` before ever touching branding again.

Each Earth identity is a **token-file swap on top of the shared `editorial.css`**, not a structural rewrite. Only Media has its own separate stylesheet for its content area — Media's chrome (rail, masthead, footer) still uses `editorial.css` + `tokens-cool.css`, staying neutral even though its content area is loud.

### Existing service subdomains — do not touch

`movies.vedsingh.com`, `music.vedsingh.com`, `books.vedsingh.com`, `audiobooks.vedsingh.com`, `games.vedsingh.com`, `seerr.vedsingh.com`, `status.vedsingh.com`. These are separate, already-existing destinations this Worker only ever links to or proxies data from (via `src/index.js`'s API routes). Never restructure them into paths under any of the five worlds.

---

## 3. Shared Editorial Index structural/design rules

From `public/assets/base.css` + `public/assets/editorial.css`, binding on Home, Work, Personal, Lab (and on Media's chrome only):

- **Navigation**: fixed left vertical rail (desktop, ≥680px) or full-width top strip (mobile, <680px), same five numbered items, same position, on every page of every world. `.ei-page` needs `flex-direction: column` under 680px or the strip collapses into a shrink-to-fit sidebar (this was a real bug, already fixed — see §5).
- **Masthead**: wordmark + `ISSUE 2026.08 · No. 00X · Rev. Aug 26` (or "Last revised" on Home).
- **Wayfinding line**: `Section X of 05 · Next: [world name]` — never restate the full five-item nav a second time.
- **Hero**: eyebrow (never a bare section number like "Section 02" — must be a distinct topical label) → headline → one-paragraph sub → optional marginalia column.
- **Content devices**: numbered index list (`.ei-idx-list`), ledger (`.ei-ledger`, Work only), currently module (`.ei-currently`, Personal only), system list (`.ei-sys-list`, Lab only) — never a card grid.
- **Footer**: `VED SINGH / [WORLD]` left, `EARTH-XXX / [EDITION NAME] EDITION` right. Every world's footer must show its own correct Earth code — this was wrong for three worlds at one point (see §5).
- **Typography**: Newsreader (serif display/italic) + Hanken Grotesk (body) + IBM Plex Mono (labels/mono) shared by all non-Media worlds. Media adds Anton for comic headlines only, and only inside Media.
- **Accessibility**: `a:focus-visible` outline, `prefers-reduced-motion` support, 44px minimum touch targets, a skip-link — all in `base.css`, shared unconditionally by all five worlds.
- **Paper-grain texture** (SVG feTurbulence on `body`) — shared by all five worlds as the one physical/tactile detail.

---

## 4. What distinguishes each world (content, not just palette)

As described by the user for this handoff:

- **Work** = professional output/projects. HLIF is the one real, named project (its description/role/year are intentionally bracketed placeholders — do not invent them). Ledger format, tightest measure of the non-Lab worlds.
- **Personal** = personal systems + interests, **including self-hosted notes**.
- **Lab** = experiments and things being tested.
- **Media** = the dedicated media platform (movies, music, books, audiobooks, games).

**⚠️ Open discrepancy to resolve, do not silently fix:** the current implementation puts "Self-Hosting" (and Servers/Linux/Local AI) under **Lab**'s Areas list, not Personal's. The framing above says Personal should include "self-hosted notes." Before moving anything, confirm with the user whether this is describing the current Lab-based structure loosely, or whether they actually want self-hosting content moved to Personal. **Do not move content based on a guess.**

---

## 5. Design decisions already locked (do not re-litigate)

1. **Editorial Index** chosen as the base direction over the other two explored directions (Technical Atlas, Kinetic Archive) — those remain in the design canvas artifact as reference only, not implemented.
2. Critique-pass refinements applied to the design and carried into implementation: Newsreader replacing Instrument Serif, all em-dashes removed, focus states added, wayfinding/eyebrow duplication reduced, Personal's italic-headline descender-clipping risk fixed, Lab's redundant "VSNAS" column removed.
3. **Subdomain architecture locked**: five worlds on five subdomains, not path-based routing. Seven existing service subdomains stay exactly where they are.
4. **Per-world Earth identity mapping locked** (§2 table) — this superseded an earlier, simpler model where only Media had a distinct visual identity and the other four shared one neutral system. That earlier model is obsolete; do not revert to it.
5. **No-nicknames rule locked**: Earth numbers only, everywhere.

## 6. Bugs already found and fixed this cycle

1. Cloudflare's assets layer serves a matching static file (like `/`) directly and skips the Worker entirely unless `run_worker_first = true` is set in `wrangler.toml` — every hostname was silently getting the Home page until this was added. **Do not remove this setting.**
2. The rewritten asset request in `src/index.js` still carried the original (mismatched) `Host` header, confusing the assets binding's own routing — fixed by stripping it before the internal `env.ASSETS.fetch()` call.
3. `public/404.html` was never actually served (confirmed empty-body 404s) — fixed with `not_found_handling = "404-page"` in `wrangler.toml`. **Do not remove this setting.**
4. Mobile strip nav rendered as a narrow shrink-to-fit sidebar instead of a full-width bar above content — `.ei-page` needed `flex-direction: column` under the 680px breakpoint. Fixed in `editorial.css`.
5. Work, Personal, and Lab were all shipping Home's literal `EARTH-616 / PAPER EDITION` footer text (copy-paste leftover). Fixed to each world's correct Earth code.
6. `public/icon.svg` — the one shared platform favicon — had "2099" baked in as literal SVG text. Removed; "VS" mark recentered.

---

## 7. Validation status

**Automated / non-visual (all passing):**
- `node --check` on all JS files.
- Custom HTML tag-balance checker on all 6 pages (5 worlds + 404).
- `wrangler deploy --dry-run` — passes, confirms no secrets leak into `vars` (real secrets are Worker secrets, set via `wrangler secret put`, never committed — see `SETUP-SECRETS.md`).
- `wrangler dev` + `curl` with spoofed `Host` headers: all five hostnames resolve to the correct page/title/footer; legacy redirects work; every API endpoint (`/api/status`, `/api/activity`, `/api/recent`, `/api/media-image`) responds with the correct clean-fallback shape when secrets aren't configured locally.
- WCAG contrast **computed** (oklch → sRGB → relative luminance, not eyeballed) for the two new palettes (Work-mono, Lab-futures): every ink/paper, ink-soft/paper, and accent/paper pair exceeds 5.7:1, comfortably past AA.

**Live browser visual QA — partially complete, was in progress when this session was interrupted:**
- ✅ **Work / Earth-90214** — confirmed clean at both 1440px and 390px. Reads as intentionally monochrome and professional (true zero-chroma palette, not merely desaturated; the featured-project panel fill gives it presence). No visual bugs.
- ✅ **Lab / Earth-928** — confirmed clean at both 1440px and 390px. Reads as futuristic/technical without becoming a terminal, dashboard, or generic cyberpunk UI (no scanlines, no glow overload, "Currently Running" is plain text not gauges). No visual bugs.
- ✅ **Personal / Earth-65 at 390px** — confirmed clean. Warm, distinct from Home at a glance, correct footer. (Desktop/1440px was **not** in scope for this specific QA request and has never been screenshotted in a real browser — see §8.)
- ⏸️ **Media / Earth-1610** — not re-checked in *this* session (wasn't in the requested scope, and no code touched Media in the Earth-remapping commit). Was fully verified in an earlier session (comic hero, panels, System Pulse, Current Activity, Recently Added tabs, command palette all confirmed working at both breakpoints) — low risk, but worth a quick re-look before shipping.
- ⏸️ **Home / Earth-616** — not re-checked this session either; no code changed here in recent commits. Was verified earlier in the implementation session.

**Environment note, not a product bug:** the Chrome automation tooling (`resize_window` specifically) was unreliable in this session — it frequently reported success while the actual viewport didn't change, requiring workarounds (fresh tabs, JS-verified resize, retries). One tab also unexpectedly navigated to the real production `vedsingh.com` (showing the old pre-redesign site) without any navigate call from this session — never interacted with beyond viewing, no risk, but flagging in case it recurs. If the next session hits the same flakiness, don't assume it means the *site* is broken — verify with `curl` first.

---

## 8. Known unfinished items

- Work's and Personal's bracketed placeholders (`[Role]`, `[Project Name]`, `[Book Title]`, etc.) need real content from the user — do not fabricate these.
- Lab's "Currently Running" list and the Active/Stable/Ongoing status words are static text, not live-wired to real Uptime Kuma data. Whether they should be is an undecided design question, not a bug.
- Personal at 1440px desktop has never been visually confirmed in a real browser.
- Media and Home have not been re-verified since the Earth-remapping commit (low risk, see §7).
- The Work/Personal/Lab self-hosting content placement question in §4 is unresolved.
- The final "Impeccable/Codex/Puppeteer" review phase has been explicitly deferred throughout this whole project and has not started.

---

## 9. Exact remaining steps before deployment

1. Finish live browser visual QA: Personal at 1440px (never done), and a quick re-look at Media and Home as a sanity check.
2. Get real content from the user for Work's and Personal's placeholders.
3. Resolve the Lab-vs-Personal self-hosting content question (§4) with the user.
4. Decide (with the user) whether Lab's service list should be live-wired to Uptime Kuma.
5. Run the deferred Impeccable/Codex/Puppeteer review phase.
6. Get explicit user approval, then merge `redesign/v2` → `main`.
7. Add the four new Custom Domains in Cloudflare (see §10) — this is a manual dashboard step, not something `git push` triggers.
8. Deploy — only after explicit user go-ahead. Never run `wrangler deploy` (for real, not `--dry-run`) without being asked.

---

## 10. Cloudflare / DNS changes still required

Not yet done, and not done by this repo's code alone:

1. In the Cloudflare dashboard: **Workers & Pages → vedsingh-home → Settings → Domains & Routes**, add `work.vedsingh.com`, `media.vedsingh.com`, `personal.vedsingh.com`, `lab.vedsingh.com` as Custom Domains on the `vedsingh-home` Worker. Cloudflare creates the DNS record automatically when a Custom Domain is added this way. `vedsingh.com` itself should already be attached from before.
2. Alternative manual-DNS path (if not using the dashboard's Custom Domain flow): add a proxied CNAME/A record for each new hostname, then uncomment the matching `[[routes]]` block in `wrangler.toml` and run `wrangler deploy`. The five route blocks are already written and commented out in `wrangler.toml` with full instructions inline.
3. **No DNS changes needed** for the seven existing service subdomains.

---

## 11. Things the next session must NOT accidentally undo

- The retired four-universe rotator (616/1610/2099/Noir auto-switching). Do not reintroduce theme-switching UI.
- The no-nicknames rule. Never let "Noir," "2099," "Ultimate," or similar back into any visible string, alt text, or asset.
- The subdomain-not-path architecture. Never restructure `media.vedsingh.com` into `/movies`-style internal paths.
- The seven existing service subdomains — never rename, move, or route them through this Worker.
- Media's Earth-1610 fencing — never let comic styling leak into Home/Work/Personal/Lab.
- `run_worker_first = true` and `not_found_handling = "404-page"` in `wrangler.toml` — both fix real, confirmed bugs.
- `public/style.css` and `public/script.js` were deleted on purpose (superseded by the new `assets/` system) — do not resurrect them.
- The API contracts in `src/index.js` (`/api/status`, `/api/activity`, `/api/recent`, `/api/media-image`, legacy `/api/jellyfin/*`) — `media.js` depends on these exact response shapes. Don't change one without the other.
- Never deploy without explicit user approval.
- Never fabricate real personal/project facts to fill a bracketed placeholder.

---

## START HERE NEXT SESSION

1. Read this file in full before touching anything.
2. Run `git log --oneline -5` and `git status` to confirm you're still on `redesign/v2` at (or after) commit `2c25d41` with a clean tree.
3. Ask the user which of these they want first: (a) finish the interrupted visual QA pass (Personal desktop, plus a Media/Home sanity check), (b) resolve the Lab-vs-Personal self-hosting question from §4, or (c) something else. Do not assume — the previous session was interrupted mid-QA specifically to write this handoff, so the user may want to redirect.
4. Do not deploy, do not merge to `main`, and do not start new feature work until the user says so.
