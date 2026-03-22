# FocusFlow

FocusFlow is an AI-assisted productivity web app for deep work. It combines Pomodoro sessions, optional camera-based focus tracking, session history, analytics, and coaching insights in one dashboard.

## Live Deployment

- Production: https://focusflow-pi-mocha.vercel.app

## What This Project Includes

- Authenticated user accounts with email/password credentials
- Optional Google OAuth sign-in
- Focus, short-break, and long-break session flow
- Camera-based focus estimation using face landmarks
- Auto-pause on distraction and optional auto-resume
- Session timeline capture (focused vs unfocused samples)
- Session history with edit, archive/unarchive, and delete
- Analytics with trend charts, streaks, peak distraction windows
- Export of sessions/analytics data as CSV or JSON
- AI-generated post-session insights
- Fallback heuristic insights when AI keys are not configured
- Profile and achievement tracking

## Tech Stack

### Core

- Next.js 14 (App Router)
- React 18
- TypeScript
- Node.js >= 18.18.0

### UI and Frontend

- Tailwind CSS
- Radix UI
- Framer Motion
- Lucide React icons
- Recharts (analytics visualizations)
- next-themes (theme handling)

### Auth and Security

- NextAuth.js (v4)
- @auth/mongodb-adapter
- bcryptjs (password hashing)
- Middleware route protection for private pages

### Data Layer

- MongoDB Atlas
- Official MongoDB Node.js driver
- Indexed collections initialized via protected `/api/init`

### AI and Vision

- @tensorflow/tfjs
- @tensorflow-models/face-landmarks-detection
- @mediapipe/face_mesh
- OpenAI Chat Completions API (optional)
- Google Gemini API (optional)

### Tooling and Deployment

- ESLint + TypeScript type-checking
- Vercel deployment
- Vercel Analytics package integrated

## App Routes

- `/` marketing/landing page
- `/auth/signin` sign in page
- `/auth/signup` sign up page
- `/dashboard` focus timer workspace (protected)
- `/history` session history (protected)
- `/analytics` analytics dashboard (protected)
- `/settings` settings management (protected)
- `/profile` profile and achievements (protected)
- `/demo` demo page
- `/test` and `/test-camera` internal test pages

## API Routes

All protected routes require an authenticated session unless explicitly marked public.

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Public | NextAuth handlers |
| `/api/auth/register` | POST | Public | Create account with credentials |
| `/api/users` | GET, PUT, DELETE | Required | User profile CRUD |
| `/api/users/me` | GET, PUT | Required | Current user profile/preference updates |
| `/api/users/me/stats` | GET | Required | Dashboard/profile stats |
| `/api/settings` | GET, PUT, DELETE | Required | User settings CRUD/reset |
| `/api/sessions` | GET, POST | Required | List and create sessions |
| `/api/sessions/[id]` | GET, PATCH, DELETE | Required | Session detail/update/delete |
| `/api/sessions/[id]/distractions` | GET, POST | Required | Distraction events |
| `/api/sessions/[id]/timeline` | GET | Required | Timeline samples (real/synthetic) |
| `/api/sessions/[id]/insight` | POST | Required | AI insight generation |
| `/api/analytics` | GET | Optional | Auth users get real analytics, guests receive demo data |
| `/api/analytics/daily` | GET | Required | Daily analytics snapshot |
| `/api/reports/weekly` | GET | Required | Weekly report generation |
| `/api/achievements` | GET | Required | Achievement status/progress |
| `/api/export` | GET | Required | Export session data (CSV/JSON) |
| `/api/init` | POST | Token | Create MongoDB indexes |
| `/api/test-mongodb` | GET | Dev only | Local DB diagnostics (disabled in production) |

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

Required for production:

```env
MONGODB_URI=
NEXTAUTH_SECRET=
```

Recommended:

```env
MONGODB_DB_NAME=focusflow
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
```

Optional:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
GOOGLE_API_KEY=
INIT_API_TOKEN=
```

Notes:

- Keep secrets out of Git. Never commit `.env.local`.
- `NEXTAUTH_URL` must be your deployed domain in production.
- If both `OPENAI_API_KEY` and `GOOGLE_API_KEY` are empty, heuristic insights are used.

## Local Development

1. Clone and install dependencies:

```bash
git clone https://github.com/alokX01/focusflow.git
cd focusflow
npm install
```

2. Configure environment values in `.env.local`.

3. Start development server:

```bash
npm run dev
```

4. Open:

- http://localhost:3000

## Available Scripts

```bash
npm run dev        # start Next.js dev server
npm run lint       # run ESLint
npm run typecheck  # run TypeScript checks
npm run build      # production build
npm run check      # lint + typecheck + build
npm run start      # run built app
```

## Deployment (Vercel)

This project currently uses a custom Next.js dist directory:

- `distDir: ".next-build"` in `next.config.mjs`

So in Vercel Project Settings:

- Framework Preset: `Next.js`
- Build Command: `next build` (or default)
- Install Command: `npm install`
- Output Directory: `.next-build`

Then add required environment variables and deploy.

### Common Vercel Error Fix

If you see:

`The Next.js output directory "Next.js default" was not found...`

Set **Output Directory** to exactly:

```txt
.next-build
```

Do not put `Next.js default` as literal text.

## Initialize MongoDB Indexes

`/api/init` is protected by `INIT_API_TOKEN`.

Example request:

```bash
curl -X POST https://your-domain.vercel.app/api/init -H "x-init-token: YOUR_INIT_API_TOKEN"
```

## Project Structure

```text
app/
  api/                # server API routes
  auth/               # sign-in / sign-up pages
  dashboard/          # main focus workspace
  analytics/          # analytics UI
  history/            # session history UI
  settings/           # settings UI
  profile/            # profile and achievements
components/
  ui/                 # reusable UI building blocks
  timer-interface.tsx
  history-interface.tsx
  analytics-dashboard.tsx
lib/
  auth.ts             # NextAuth config
  mongodb.ts          # MongoDB client and DB helpers
  mongodb-indexes.ts  # index creation utilities
  models.ts           # shared interfaces
hooks/
scripts/
```

## Security Notes

- Rotate any credential that was accidentally exposed in screenshots/messages.
- Use long random secrets for `NEXTAUTH_SECRET` and `INIT_API_TOKEN`.
- Keep production keys only in Vercel Environment Variables.

## License

No license file is currently included in this repository.
