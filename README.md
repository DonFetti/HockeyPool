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

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In Netlify: **Add new site** → **Import an existing project** → connect the repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Deploy. Netlify will run the build and serve the static app.

The included [`netlify.toml`](netlify.toml) sets the same build/publish paths, adds a **serverless proxy** at `/api/nhl/*` (so the browser is not blocked by NHL CORS), and sends unknown paths to `index.html` for SPA hosting.

### Environment variables

None are required for the public NHL endpoints.

## Attribution

Playoff data is loaded from [api-web.nhle.com](https://api-web.nhle.com/). This project is not affiliated with the NHL.
