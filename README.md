ToolBox LK
===========

This repository contains ToolBox LK — a small Express.js collection of web utilities (TTS, video tools, image tools, etc.).

Quick status
------------
- Server: `server.js` (Express)
- Static UI: `public/`
- Uploads: `uploads/`
- Outputs: `outputs/` (generated files)
- Tests: `tests/app.test.js` (run with `npm test`)
- CI: GitHub Actions runs tests and a Railway deploy workflow (requires secrets).

Prerequisites
-------------
- Node.js 18+
- npm
- Python3 (for `yt-dlp` via `postinstall`)
- `ffmpeg` and `espeak`/`espeak-ng` installed on the host (required for video/audio processing)

Run locally
-----------
Install and run:

```bash
npm ci
npm start
# or for development
npm run dev
```

Run tests:

```bash
npm test
```

Deploy to Railway (what I prepared)
----------------------------------
I added a GitHub Actions workflow `.github/workflows/deploy-railway.yml` that triggers on pushes to `main`. To allow it to deploy, add the following repository secrets in GitHub:

- `RAILWAY_TOKEN` — a Railway service token with deploy permissions
- `RAILWAY_PROJECT_ID` — the Railway project ID for your project

How to create a Railway token
----------------------------
1. Sign in to Railway and open your project.
2. Go to Project Settings → Service Accounts / API Tokens (or "Integrations") and create a new token with deploy rights.
3. Copy the token value (keep it secret).
4. From your project settings you can find the `projectId`.

Set GitHub secrets (two options)
--------------------------------
- GitHub web UI: Settings → Secrets → Actions → New repository secret. Add `RAILWAY_TOKEN` and `RAILWAY_PROJECT_ID`.

- Or using GitHub CLI (locally) — install `gh` and run:

```bash
gh auth login
gh secret set RAILWAY_TOKEN --body "<paste-token-here>"
gh secret set RAILWAY_PROJECT_ID --body "<project-id>"
```

Trigger deploy
--------------
Once the secrets are in place, push a commit to `main` to trigger the workflow. Monitor Actions → Deploy to Railway to see build logs.

AdSense
-------
You added the publisher ID `pub-6878103341405638`. Create responsive ad units in your AdSense account and replace the placeholder `data-ad-slot` values in these files:

- `public/index.html`
- `public/tools/text-to-speech.html`

A simple sed example to replace a placeholder (run locally):

```bash
# replace 1234567890 with your real ad slot id
sed -i 's/data-ad-slot="1234567890"/data-ad-slot="YOUR_AD_SLOT_ID"/g' public/index.html public/tools/text-to-speech.html
```

Cleaning large files from history (optional)
-------------------------------------------
If you have large files in git history (e.g., outputs/), use the BFG or `git filter-repo` to remove them. I can prepare a script — this operation rewrites history and requires force-push and coordination.

Need my help?
--------------
Tell me which of the following you want me to do next and I'll proceed:

- Create the GitHub secrets for you (requires your GitHub auth token) — I cannot do this without your credentials.
- Walk you step-by-step in your browser to create the Railway token and set GitHub secrets.
- Replace AdSense placeholder slots if you provide real slot IDs.
- Run `git filter-repo` script to scrub large files (I will prepare the script and instructions).
- Add a custom domain and HTTPS configuration (requires DNS access).

If you want me to proceed with any action that requires secrets or dashboard access, tell me which and I'll provide the exact commands or a script you can run locally.
