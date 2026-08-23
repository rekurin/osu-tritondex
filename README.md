# TritonDex

A UC San Diego-themed osu! player viewer with a static, GitHub Pages-compatible frontend. Player names and majors live in `data/roster.json`; an automated GitHub Actions workflow refreshes public profile statistics from osu! API v2 and deploys the generated site.

## Publish on GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Register an OAuth application from your osu! account settings. Client Credentials usage does not require a callback URL.
4. In **Settings → Secrets and variables → Actions**, add:
   - `OSU_CLIENT_ID`
   - `OSU_CLIENT_SECRET`
5. Run **Deploy TritonDex to GitHub Pages** from the Actions tab, or push a commit to `main`.

The workflow also runs daily to refresh rankings and top plays. The client secret stays in GitHub Actions and is never shipped to the browser. If the secrets are not configured, the site still deploys with the full roster and majors, but statistics show as pending.

## Edit the roster

Update `data/roster.json`. Each entry needs a public osu! username and a major:

```json
{ "username": "example", "major": "Computer Science" }
```

An optional `mode` may be set to `osu`, `mania`, `taiko`, or `fruits`; it defaults to `osu`.

## Run locally

```bash
npm ci
npm run sync:osu
npm run dev
```

To generate live data locally, set `OSU_CLIENT_ID` and `OSU_CLIENT_SECRET` in your shell before running `npm run sync:osu`.

Only publish players who have consented to being included in the community roster.
