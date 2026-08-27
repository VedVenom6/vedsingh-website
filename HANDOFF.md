# Handoff — Ved Singh Platform v2.1.0

**Branch:** `redesign/v2`
**Written:** 2026-08-27
**Status:** Implementation complete, including Lab's rebuild, per-world PWA cleanup, and removal of all user-facing bracketed placeholders. Committed to `redesign/v2` in focused commits. Not deployed, not merged to `main`. `wrangler deploy` has never been run for real, only `--dry-run`.

Production `main` has not been touched. Nothing has been deployed.

---

## 1. What this session did

Starting from the checkpoint in the previous handoff (five-domain platform implemented, visual QA partially done), this pass:

1. **Built `lab.vedsingh.com` as a fresh Earth-928 world** — deep navy/graphite, restrained cyan accent, technical annotation language (mono status labels, corner-bracket frame marks, a faint schematic grid), sharp geometric structure, no fake hacker UI/terminal/Matrix effects/gratuitous glow. New self-contained `public/assets/lab.css` (own rail nav, no dependency on the old shared `editorial.css` + `tokens-futures.css`), new `public/lab/manifest.webmanifest`. Content: Local AI, Server Experiments, Linux Experiments, Prototypes, Experimental Tooling — all real/generic descriptions, no fabricated specifics. A "Currently Testing" module uses bracketed placeholders (`[Current build]` etc.), matching the existing Work/Personal convention for facts not yet supplied by the user.
2. **Resolved the Lab-vs-Personal boundary** that the previous handoff flagged as an open question: Lab is now explicitly framed as "still moving" work, with a boundary note in the page itself linking to Personal and saying settled work moves there. Personal's existing self-hosted-notes content was not touched or duplicated.
3. **Refined Home** (`vedsingh.com`) with an explicit first-person introduction line in the hero ("I'm Ved Singh. This index is the hub for everything below."), on top of its existing section index and revision log. No structural change, no fabricated bio facts.
4. **Finished per-world PWA identity cleanup.** Every world now has a fully self-contained manifest and icon:
   - Home: `/manifest.webmanifest`, `/icons/home.svg`
   - Work: `/work/manifest.webmanifest`, `/icons/work.svg` (already done pre-session)
   - Media: `/media/manifest.webmanifest` (new), `/icons/media.svg`
   - Personal: `/personal/manifest.webmanifest`, `/icons/personal.svg` (already done pre-session)
   - Lab: `/lab/manifest.webmanifest` (new), `/icons/lab.svg`

   Removed the Host-header-based dynamic `/manifest.webmanifest` + `/app-icon.svg`/`/apple-touch-icon.svg` resolution from `src/index.js` (`WORLD_META`, `worldManifest()`, `worldIcon()`, and their two route branches) — those shared root paths no longer exist or are referenced anywhere. This was the "risky shared routing" the task asked to avoid in favor of the pattern Work and Personal had already proven out.
5. **Fixed the Media fallout from that change**: updated `media/index.html`'s manifest/icon links, `media.js`'s two image-fallback references, and `sw.js`'s `PRECACHE` list (was still listing `/app-icon.svg` and `/manifest.webmanifest`, which would have made the service worker's `cache.addAll` fail on the next real install) — bumped the SW cache version to `2.2.0` so existing installs pick up the fix. Verified via CDP that the service worker still registers and activates cleanly.
6. **Removed dead CSS**: `tokens-mono.css`, `tokens-warm.css`, `tokens-futures.css` — all three had zero references left after Work, Personal, and now Lab forked into bespoke stylesheets.
7. **No visual, structural, or content changes to Work, Media, or Personal** beyond the plumbing fixes in #5 above (which are metadata/fallback-path fixes, not visual).

---

## 2. Current architecture (see README.md for the full table)

- **Home** (`vedsingh.com`) and **Media**'s chrome (rail/masthead/footer) still run on the shared `public/assets/editorial.css` + `tokens-cool.css` — Home is genuinely the "Editorial Index" base identity the other worlds diverge from, so this is intentional, not legacy debris.
- **Work** (`work.css`), **Personal** (`personal.css`), and now **Lab** (`lab.css`) are each a fully self-contained, bespoke stylesheet: own nav markup, own palette, own layout. Not a token-file swap on the shared system.
- **Media**'s content area (`media.css` + `media.js`) is its own system, unchanged.
- `public/assets/base.css` (reset, skip-link, focus-visible, 44px touch targets, `prefers-reduced-motion`) is shared unconditionally by all five worlds — this did not change.

---

## 3. Validation status

**Automated (all passing):**
- `node --check` on all JS files (`src/index.js`, `public/sw.js`, `public/assets/media.js`).
- Custom HTML tag-balance checker on all 6 pages (5 worlds + 404).
- JSON validation on all 5 `.webmanifest` files.
- XML well-formedness on `public/icon.svg` and all 5 `public/icons/*.svg`.
- `git diff --check` — clean.
- Nickname grep (`noir|2099|ultimate|spider-gwen`) across `public/` and `src/` — clean.
- Broken-local-reference scan (every `href`/`src` in the 6 HTML pages resolves to a real file) — clean.
- Secret/internal-address scan — clean (no literal secrets, no LAN/`.local` hostnames; `passwordHex()` is a pre-existing function that hashes an env-provided value at runtime, not a literal secret).
- `wrangler deploy --dry-run` — passes; only public `vars` (service URLs), no secrets.
- Computed WCAG contrast (sRGB relative luminance, not eyeballed) for the new Lab palette: every ink/paper, muted/paper, and accent/paper pair is ≥5.67:1, well past AA.

**Live browser QA (headless Chrome via CDP, since the interactive `claude-in-chrome` extension was not connected in this session — see §5):**
- All five worlds captured at 1440×1000 and 390×844, with `window.innerWidth`/`scrollWidth` asserted equal (zero horizontal overflow) at both breakpoints for all five.
- Keyboard focus-visible confirmed on Lab: tabbing produces a solid 2px cyan outline (`base.css`'s `a:focus-visible` picking up Lab's `--accent`).
- Console/network check (via CDP) on all five worlds: zero JS console errors/warnings anywhere; the only non-2xx local request is `/api/status` returning 502 on Media, which is the pre-existing, documented clean-fallback behavior for Uptime Kuma being unreachable without local secrets — not a regression.
- Media's iframe-first Movies & TV panel renders its documented fallback ("Blank panel? Jellyfin may block framing... Open Jellyfin directly") when the iframe can't load in this sandboxed environment — confirms the fallback architecture still works, though the iframe's *successful* load path could not be exercised here (no route to the real `movies.vedsingh.com` from this environment).
- Service worker (Media only) confirmed registering and reaching `active` state after the precache-path fix.
- Work's two HLIF links confirmed still pointing at `https://hlif.vedsingh.com`.

**A note on QA method:** the interactive `claude-in-chrome` browser extension reported "not connected" this session, so visual QA used headless Chrome driven directly via the DevTools Protocol instead (real Chromium rendering, just not the interactive extension). Two things worth knowing if you pick this back up:
1. Requesting `/work/`, `/media/`, `/personal/`, or `/lab/` against local `wrangler dev` triggers the intentional legacy `WORLD_PATH_REDIRECTS` 302-to-production behavior in `src/index.js` (same as a bookmark to the bare path). Screenshotting the *local* build at those paths requires either spoofing the `Host` header (curl-only) or temporarily neutralizing that one redirect branch for the session — this was done and fully reverted; `git diff --check` and a fresh `wrangler deploy --dry-run` after reverting confirm `src/index.js` is back to its intended state.
2. Passing `--window-size` to `headless=new` Chrome silently did not apply to the first tab (viewport came back as 500×757 regardless of the flag) — this produced false-positive-looking overflow in an early screenshot pass. Switched to `Emulation.setDeviceMetricsOverride` over the DevTools Protocol, which reliably set the requested viewport (verified via `window.innerWidth`) for every shot in the final QA pass.

---

## 4. Known unfinished items

- **Resolved this pass:** the bracketed placeholders that used to live in Lab's "Currently Testing" module and Personal's "Currently" card row were removed entirely (not backfilled) — see the 2.1.0 CHANGELOG entry. Both were self-contained sections; deleting each one whole (heading, intro copy, and cards together) avoided leaving dangling copy or an awkward gap, since the footer's own top margin supplies the spacing either way.
- Lab's status words (Active/Ongoing) are static text, not live-wired to Uptime Kuma — unchanged from before, still an undecided design question, not a bug.
- The `claude-in-chrome` extension connectivity issue (§3) should be revisited before the next round of visual QA if interactive browser control is wanted again.
- The final external multi-agent review phase (if the user wants one) has not run.
- If real content ever exists for a "currently reading/playing," "latest note," or "currently testing" module, re-add it as new sections rather than resurrecting placeholder text — the CSS for both (`.personal-currently`/`.currently-card` in `personal.css`, `.lab-testing`/`.lab-test-card` in `lab.css`) was intentionally left in place, unused, for exactly that.

---

## 5. Exact remaining steps before deployment

1. Get real content from the user for Work's, Personal's, and now Lab's bracketed placeholders.
2. Get explicit user approval, then merge `redesign/v2` → `main`.
3. Add the four new Custom Domains in Cloudflare (Workers & Pages → vedsingh-home → Settings → Domains & Routes) — manual dashboard step, not triggered by `git push`. See `wrangler.toml`'s commented `[[routes]]` blocks for the alternative manual-DNS path.
4. Deploy — only after explicit user go-ahead. Never run `wrangler deploy` for real without being asked.

---

## 6. Things the next session must NOT accidentally undo

- Everything from the previous handoff's §11 still applies: no nickname UI text, no theme-rotator UI, subdomain-not-path architecture, the seven existing service subdomains untouched, Media's Earth-1610 fencing, `run_worker_first = true` and `not_found_handling = "404-page"` in `wrangler.toml`, the `/api/*` response contracts `media.js` depends on.
- **New this session:** don't reintroduce the Host-header-based dynamic `/manifest.webmanifest` / `/app-icon.svg` / `/apple-touch-icon.svg` resolution in `src/index.js` — every world now has its own self-contained manifest and icon path, and that's the intended end state, not a temporary measure.
- Don't move Personal's self-hosted-notes content into Lab, or vice versa — that boundary is now explicit in both pages' copy.
