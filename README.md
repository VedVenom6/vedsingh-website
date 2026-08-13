# Ved Singh 2099 v2

This is the rewritten version with the command palette bug fixed.

## Deploy
1. Open PowerShell in this folder.
2. `npm.cmd install`
3. `npx.cmd wrangler login`
4. `npx.cmd wrangler secret put JELLYFIN_API_KEY`
5. `npx.cmd wrangler deploy`

The search palette now closes by:
- clicking Esc
- pressing keyboard Esc
- clicking outside the panel
- navigating to a result

After deployment, hard refresh with Ctrl+Shift+R.


## Spider-Verse universe cycling

The homepage now cycles automatically every 22 seconds through:
- Earth-2099 — futuristic neon cyber interface
- Earth-1610 — cel-shaded comic-book/halftone interface
- Earth-616 — clean, plain, classic interface
- Spider-Noir — true monochrome black-and-white film-noir interface

You can also:
- use the arrows under the universe card
- click the 2099/Universe sigil
- type `2099`, `1610`, `616`, or `noir` in Ctrl/Cmd+K
- the selected universe is remembered in the browser
