# Andrew vs Lincoln — NHL playoff pool

Single-page app that pulls the live Stanley Cup bracket from the NHL’s public web API, compares **Andrew** vs **Lincoln** using picks in [`src/picks.json`](src/picks.json), and scores **$1 per series** when a picked team **wins that series**.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api/nhl/*` to `https://api-web.nhle.com`, matching how the site behaves on Netlify.

## Picks format

Edit [`src/picks.json`](src/picks.json):

- `seasonId` — eight-digit NHL season (e.g. `20252026` for 2025–26). The app uses this when requesting the playoff carousel.
- `andrew` / `lincoln` — map **series id** → **team abbrev** (uppercase). Series ids match the UI labels, e.g. `R1-A`, `R1-B`, … (round abbrev + hyphen + series letter from the API).

Redeploy after changing picks (or run locally).

## Deploy on Netlify (free tier)

This repo is ready for Netlify: [`netlify.toml`](netlify.toml) sets the build, publish directory (`dist`), Node 20, **rewrite proxies** from `/api/nhl/*` → [api-web.nhle.com](https://api-web.nhle.com) (and `/api/statsapi/*` → statsapi) so the browser stays same-origin and avoids CORS, plus the SPA fallback.

1. Sign in at [Netlify](https://app.netlify.com/) (GitHub login is easiest).
2. **Add new site** → **Import an existing project** → authorize GitHub if asked.
3. Pick the repo (e.g. [DonFetti/HockeyPool](https://github.com/DonFetti/HockeyPool)).
4. Leave **Build command** and **Publish directory** empty if Netlify shows “Configured by netlify.toml”; otherwise set:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy**. After the first deploy, your site URL is on the site overview; future `git push` to the linked branch redeploys automatically.

**Local parity with production:** run `npx netlify dev` from the project root (uses the same rewrites as production, with Vite on port 5173 per `netlify.toml`), or use `npm run dev` (Vite’s dev proxy matches the same `/api/nhl` paths).

### Environment variables

None are required for the public NHL endpoints.

## Attribution

Playoff data is loaded from [api-web.nhle.com](https://api-web.nhle.com/). This project is not affiliated with the NHL.
