# 🔥 StreakForge

> Track your coding consistency across GitHub and LeetCode — never break the chain.

StreakForge is a full-stack habit tracker that pulls your contribution data from GitHub and LeetCode, maintains a daily streak counter, and gives you **freeze credits** so you don't lose your streak on rest days.

## Features

- 🔥 **Live Streak Counter** — tracks consecutive days you've coded
- 🧊 **Freeze Credits** — protects your streak on off-days (earns more at milestones)
- 📅 **Activity Calendar** — 70-day heatmap of GitHub & LeetCode contributions  
- 🎯 **Daily Goals** — visual checkmark when you've hit both platforms today
- ⚙️ **Settings** — connect your GitHub (with token) and LeetCode usernames

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (via sql.js) |
| Deploy | Vercel (frontend + serverless API) |

## Local Development

```bash
# Install all dependencies
npm install

# Start both server (port 3001) and client (port 5173)
npm run dev
```

Visit `http://localhost:5173`

## Environment Variables

For local development, no `.env` is needed. The server defaults to port `3001`.

For Vercel deployment, no environment variables are required by default — the app works out of the box.

## Deployment

This project is configured for **Vercel** deployment:

- The React frontend is built with `vite build` and served as a static site
- The `/api/streak` and `/api/settings` routes run as Vercel serverless functions
- SQLite uses `/tmp` for ephemeral storage on Vercel (data persists per serverless instance)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JamesKevinJones/streakforge)

## Getting a GitHub Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Generate a new token (classic) with `read:user` scope
3. Paste it in StreakForge Settings

## License

MIT
