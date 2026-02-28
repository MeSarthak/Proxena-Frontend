# Proxena — Frontend

React SPA for Proxena, an AI-powered English pronunciation coaching platform. Users pick a speaking exercise, read it aloud into their microphone, and receive real-time word-level feedback (correct / partial / incorrect) powered by Azure Speech AI over a WebSocket connection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| HTTP client | Axios |
| Auth | Firebase (email/password + Google OAuth) |
| Charts | Recharts |
| Icons | Lucide React |
| Audio | Web Audio API — `AudioWorklet` (PCM processor) |

---

## Prerequisites

- Node.js 20+
- A Firebase project (Web app credentials)
- Proxena backend running on `localhost:3000` (see `../Backend/README.md`)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your Firebase web app credentials:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Start the development server

```bash
npm run dev
```

Opens at `http://localhost:5173`. API calls to `/v1/*` and WebSocket connections to `/ws/*` are automatically proxied to `http://localhost:3000` — no CORS configuration needed in development.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across all source files |

---

## Project Structure

```
src/
├── main.tsx                    # React app entry point
├── App.tsx                     # Router — route definitions and auth guards
├── index.css                   # Global styles and Tailwind base
│
├── pages/
│   ├── LandingPage.tsx         # Public marketing page
│   ├── LoginPage.tsx           # Sign in / sign up (email + Google)
│   ├── ProfileSetupPage.tsx    # Post-signup: native language + target accent
│   ├── DashboardPage.tsx       # Home — recent sessions, usage, quick actions
│   ├── ExercisesPage.tsx       # Browse and filter exercises by category/difficulty
│   ├── SessionPage.tsx         # Live pronunciation session (mic + real-time feedback)
│   ├── SessionSummaryPage.tsx  # Post-session results — word breakdown, scores
│   ├── AnalyticsPage.tsx       # Progress charts and trends over time
│   └── SubscriptionPage.tsx    # Plan comparison and upgrade
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx       # Sidebar + main content shell
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── Guards.tsx          # AuthGuard / OnboardingGuard route wrappers
│   └── ui/
│       ├── Alert.tsx           # Dismissable alert banner
│       ├── Badge.tsx           # Status badge chip
│       ├── Button.tsx          # Button with loading state
│       ├── Card.tsx            # Surface container
│       ├── Input.tsx           # Text input and Select components
│       ├── ProgressBar.tsx     # Animated progress bar
│       └── Waveform.tsx        # Live audio waveform visualiser
│
├── contexts/
│   └── AuthContext.tsx         # Firebase auth state, signUp/signIn/logOut helpers
│
├── hooks/
│   └── useSession.ts           # WebSocket session hook — audio capture, WS lifecycle
│
├── lib/
│   ├── api.ts                  # Axios instance + typed API helpers (authApi, exercisesApi, sessionsApi, subscriptionApi)
│   ├── firebase.ts             # Firebase app + auth initialisation
│   └── utils.ts                # formatDate, cn (Tailwind class merge) and other helpers
│
└── types/
    └── index.ts                # Shared TypeScript interfaces (UserProfile, Exercise, Session, etc.)

public/
└── pcm-processor.js            # AudioWorklet processor — converts Float32 mic audio to Int16 PCM for WebSocket streaming
```

---

## Pages

### Landing (`/`)
Public marketing page — product overview, feature highlights, and sign-up CTA. Not accessible to logged-in users (redirects to `/dashboard`).

### Login (`/login`)
Email/password sign-in and sign-up, plus Google OAuth via Firebase popup. New users are redirected to `/profile-setup` after their first sign-in.

### Profile Setup (`/profile-setup`)
One-time onboarding step. Selects native language and target accent (`en-US`, `en-GB`, `en-AU`, `en-IN`). Calls `PATCH /v1/auth/profile` to persist the selection.

### Dashboard (`/dashboard`)
Overview of today's usage (minutes used, sessions completed), recent session history, and a quick-start button to begin a new exercise.

### Exercises (`/exercises`)
Browse all available exercises. Filter by category (e.g. Business, IELTS, Daily Conversation) and difficulty (Beginner / Intermediate / Advanced).

### Session (`/session/:exerciseId`)
The core feature. Displays the exercise text, starts the microphone, and opens a WebSocket connection to the backend. Words are highlighted in real time as the user speaks:
- **Green** — correct (accuracy ≥ 80%)
- **Yellow** — partial (accuracy ≥ 50%)
- **Red** — incorrect (accuracy < 50%)

### Session Summary (`/sessions/:sessionId`)
Detailed breakdown of the completed session — per-word accuracy, overall score, fluency score, and duration.

### Analytics (`/analytics`)
Charts showing accuracy and fluency trends across sessions over time, powered by Recharts.

### Subscription (`/subscription`)
Plan comparison between Free and Pro ($2/month). Displays current plan status, expiry date, and daily usage limits.

---

## Audio Pipeline

```
Microphone (getUserMedia)
  └── AudioContext (16 kHz sample rate)
        └── AudioWorklet (pcm-processor.js)
              └── Float32 → Int16 PCM conversion (zero-copy)
                    └── Binary WebSocket frame → Backend → Azure Speech SDK
```

The `AudioWorklet` runs in a dedicated audio thread to prevent main-thread jank. PCM data is transferred to the main thread via `postMessage` and forwarded as binary WebSocket frames.

---

## Authentication Flow

1. User signs in via Firebase (email/password or Google)
2. Firebase issues a JWT ID token stored in memory
3. Axios request interceptor attaches `Authorization: Bearer <token>` to every API call automatically
4. For WebSocket connections the token is appended as `?token=<jwt>` query param (browser WebSocket API does not support custom headers)
5. On sign-out, the Firebase session is cleared and the user is redirected to `/login`

---

## Route Guards

| Guard | Behaviour |
|---|---|
| `AuthGuard` | Redirects unauthenticated users to `/login` |
| `OnboardingGuard` | Redirects users who haven't completed profile setup to `/profile-setup` |
| Public route | Redirects authenticated users away from `/` and `/login` to `/dashboard` |

---

## Dev Proxy

Vite proxies the following paths to the backend in development — no environment-specific API URLs needed:

```
/v1/*  →  http://localhost:3000
/ws/*  →  ws://localhost:3000  (WebSocket upgrade)
```

Configured in `vite.config.ts`.
