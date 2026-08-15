# Live Media Integration Secrets

The site deploys and works without these secrets; missing integrations show clean fallback states.

Set these in the existing Cloudflare Worker `vedsingh-home`:

- `JELLYFIN_API_KEY`
- `NAVIDROME_USERNAME`
- `NAVIDROME_PASSWORD`
- `KAVITA_API_KEY`
- `AUDIOBOOKSHELF_API_KEY`

Do not commit these values to GitHub.

If using Wrangler from Windows:

```powershell
npx.cmd wrangler secret put JELLYFIN_API_KEY
npx.cmd wrangler secret put NAVIDROME_USERNAME
npx.cmd wrangler secret put NAVIDROME_PASSWORD
npx.cmd wrangler secret put KAVITA_API_KEY
npx.cmd wrangler secret put AUDIOBOOKSHELF_API_KEY
```

The NAS does not need Node/Wrangler for production deployment when GitHub → Cloudflare automatic deployment is enabled.
