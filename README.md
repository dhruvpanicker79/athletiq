# ATHLETIQ — Beyond the Scoreboard.

A full-stack MERN sports scores & analytics platform covering **football, cricket and basketball**: live scores, fixtures, results, league tables, match centres, team and player profiles, personal dashboards and a full admin panel.

> ⚠️ All scores, statistics and players are seeded **DEMO DATA** for demonstration only. They are not real-world or live results.

**Stack:** React 18 · Vite · Tailwind CSS · React Router · Axios · Lucide · Recharts | Node.js · Express · MongoDB · Mongoose | JWT (HTTP-only cookie) · bcrypt · Helmet · express-rate-limit

---

## Quick start

**Windows, one click:** double-click **`start.bat`**. It uses the bundled portable Node in `.tools/` if Node isn't installed, installs dependencies if needed, starts the API and the website, and opens **http://localhost:5173**.

**Manual** (Node.js 18+):

```bash
# 1. Backend
cd server
cp .env.example .env        # set JWT_SECRET; MONGO_URI optional (see below)
npm install
npm run seed                # optional: the server auto-seeds an empty DB on first start
npm run dev                 # http://localhost:5050

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173  (proxies /api to :5050)
```

Open **http://localhost:5173**.

### Database options (`server/.env` → `MONGO_URI`)
| Option | Value |
|---|---|
| Built-in local DB (no install, saved to `server/.data/athletiq.json`) | `local` |
| Local MongoDB | `mongodb://127.0.0.1:27017/athletiq` |
| Atlas | `mongodb+srv://<user>:<pass>@<cluster>/athletiq` |

The built-in local DB (`server/config/localdb.js`) is a small MongoDB wire-protocol server written in JavaScript, with queries powered by `mingo`. Mongoose connects to it exactly as it would to MongoDB, so the application code is identical either way. In development, if a real `MONGO_URI` can't be reached, the server falls back to it automatically. Use real MongoDB or Atlas in production.

> **Windows Smart App Control:** native binaries such as `mongod`, Rollup and esbuild can be blocked. That's why the built-in DB exists and why the client uses the WebAssembly builds of Rollup and esbuild (`overrides` in `client/package.json`).

### Seeded accounts
| Role | Email | Password |
|---|---|---|
| Admin | `ADMIN_EMAIL` (default `admin@athletiq.dev`) | `ADMIN_PASSWORD` (default `Admin@12345`) |
| User | `fan@athletiq.dev` | `Fan@12345` |

Change the admin credentials in `server/.env` before seeding. `npm run seed` **wipes and re-creates** all data.

### Production build
```bash
cd client && npm run build      # server/index.js serves client/dist automatically
cd ../server && NODE_ENV=production npm start
```

---

## Features

- **Landing page**: cinematic hero, live ticker, featured matches, sport categories, latest results, upcoming fixtures, popular competitions.
- **Sports dashboard** (`/live`): Live Now, Today's Fixtures, Latest Results, League Standings, My Teams, plus search, sport and competition filters.
- **Fixtures / Results**: 7-day date selector, sport, competition and team search, pagination. All filtering happens server-side.
- **Match centre** (sport-specific):
  - Football: overview, statistics bars, possession chart, timeline (goals/assists/cards/subs), lineups with formations.
  - Cricket: innings summary, run rate, batting and bowling scorecards, chart.
  - Basketball: quarter-by-quarter box score, chart, top performers, team stats.
- **Competitions**: league tables calculated from completed matches (3/1/0 for football, 2 pts per win otherwise), fixtures, results and teams.
- **Team and player profiles**: league position, recent and upcoming matches, squad, player stats.
- **Auth**: register/login/logout, bcrypt (12 rounds), JWT in an HTTP-only SameSite cookie, protected routes.
- **Personal dashboard** (`/me`): follow and unfollow teams and competitions, followed sports, upcoming matches for your teams, recently viewed matches, profile and password settings. Everything is stored in MongoDB.
- **Admin panel** (`/admin`): stats, a status chart and the activity log. Full CRUD for matches (including score and status updates), teams and competitions. User search, role management and suspension. Every destructive action asks for confirmation.

## Security
| Measure | Where |
|---|---|
| bcrypt password hashing, `passwordHash` never selected/serialised | `controllers/auth.js`, `models/index.js` |
| JWT in HTTP-only, SameSite=Lax cookie (Secure in production) | `controllers/auth.js` |
| Role-based access control on the backend | `middleware/auth.js` (`protect`, `adminOnly`) |
| Request validation and mass-assignment protection (unknown fields dropped) | `validators/index.js` |
| NoSQL injection: `$`/dotted keys stripped from body/query/params; ids type-checked; regex input escaped | `middleware/sanitize.js`, `services/query.js` |
| XSS: HTML tags stripped from input, React escaping on output, Helmet CSP | `middleware/sanitize.js`, `index.js` |
| Rate limiting: global, auth (20 per 15 min) and write endpoints | `index.js`, `routes/index.js` |
| Helmet security headers, CORS allow-list with credentials | `index.js` |
| Server-side score/match integrity (teams differ, same sport, competition matches sport, 0–999 integer scores, no score on scheduled matches) | `controllers/matches.js` |
| Ownership: user endpoints only act on `req.user`; admins cannot demote or suspend themselves | `controllers/users.js` |
| Secrets in env vars, required in production | `config/db.js` |

---

## API reference

Base URL `/api`. JSON bodies. Auth uses the `token` cookie. 🔒 = logged in, 🛡 = admin.
List endpoints return `{ items, total, page, pages }` and accept `page` and `limit` (max 100).

### Auth
| Method | Path | Body / notes |
|---|---|---|
| POST | `/auth/register` | `{ name, email, password, confirmPassword }` → 201 + cookie |
| POST | `/auth/login` | `{ email, password }` → 200 + cookie, 401 bad creds, 403 suspended |
| POST | `/auth/logout` | clears cookie |
| GET 🔒 | `/auth/me` | current user |

### Sports
| GET | `/sports` · `/sports/:idOrSlug` (with competitions) |
|---|---|
| POST/PUT/DELETE 🛡 | `/sports` · `/sports/:id` — `{ name, slug }` |

### Competitions
| Method | Path | Notes |
|---|---|---|
| GET | `/competitions` | `?q&sport=<slug or id>&sort=name\|-season&page&limit` |
| GET | `/competitions/:id` | with teams, live, upcoming, results |
| GET | `/competitions/:id/standings` | derived from COMPLETED matches |
| POST 🛡 | `/competitions` | `{ name, sportId, country, season, shortName?, format?, color?, logo? }` |
| PUT 🛡 | `/competitions/:id` | partial |
| DELETE 🛡 | `/competitions/:id` | also deletes its matches |

### Teams & players
| Method | Path | Notes |
|---|---|---|
| GET | `/teams` | `?q&sport&competition&sort&page&limit` |
| GET | `/teams/:id` | squad, results, fixtures, league position |
| POST 🛡 | `/teams` | `{ name, shortName, country, sportId, venue?, color?, logo?, competitionIds? }` |
| PUT 🛡 · DELETE 🛡 | `/teams/:id` | delete blocked (409) if the team has matches |
| GET | `/players?team&q` · `/players/:id` | |

### Matches
| Method | Path | Notes |
|---|---|---|
| GET | `/matches` | `?sport&competition&team&status=LIVE,COMPLETED&q=<team name>&date=YYYY-MM-DD&tz=<offset min>&from&to&sort=-startTime&page&limit` |
| GET | `/matches/live` · `/matches/upcoming` · `/matches/results` | same filters, status preset |
| GET | `/matches/:id` | full detail + head-to-head; records "recently viewed" when logged in |
| POST 🛡 | `/matches` | `{ sportId, competitionId, homeTeamId, awayTeamId, startTime, venue?, round?, status?, homeScore?, awayScore?, clock?, result?, matchStatistics?, timeline?, lineups? }` |
| PUT 🛡 | `/matches/:id` | partial: score updates, status changes |
| DELETE 🛡 | `/matches/:id` | 204 |

Status: `SCHEDULED · LIVE · COMPLETED · POSTPONED · CANCELLED`

### Users (self)
| Method | Path | Body |
|---|---|---|
| GET 🔒 | `/users/me` | profile with favourites, recently viewed, upcoming/live/results for favourite teams |
| PUT 🔒 | `/users/me` | `{ name?, favoriteSports?, currentPassword?, newPassword? }` |
| POST 🔒 | `/users/favorites` | `{ type: "team"\|"competition"\|"sport", id }` |
| DELETE 🔒 | `/users/favorites/:type/:id` | |

### Admin
| Method | Path | Notes |
|---|---|---|
| GET 🛡 | `/admin/dashboard` | totals, live matches, status breakdown, activity |
| GET 🛡 | `/admin/users` | `?q&role&page&limit` |
| PUT 🛡 | `/admin/users/:id` | `{ role?, isActive? }` |

**Errors:** `{ message, details? }` with `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate-limited, `500` server error.

---

## Project structure
```
client/src/
  components/   ui.jsx, MatchCard.jsx, StandingsTable.jsx, Filters.jsx, match/SportViews.jsx
  pages/        Home, Dashboard, MatchesPage, Competitions, CompetitionDetail, MatchCentre,
                Profiles (team/player), Auth, MyDashboard, Admin, SearchPage, NotFound
  layouts/      MainLayout (navbar + footer)
  services/     api.js (central Axios client + error normalisation)
  context/      AppContext.jsx (auth + toasts)
  hooks/        useFetch.js (data fetching, debounce, cached reference data)
  utils/        format.js
server/
  config/       db.js           controllers/  auth, catalog, matches, users
  middleware/   auth, error, sanitize          models/   index.js (all schemas + indexes)
  routes/       index.js        services/     query.js, standings.js
  validators/   index.js        seed/         data.js, seed.js
```

## Testing with Postman
1. `POST /api/auth/login` with the admin credentials. Postman stores the `token` cookie.
2. Call any 🛡 endpoint, e.g. `PUT /api/matches/:id` with `{ "status": "LIVE", "homeScore": 1, "awayScore": 0, "clock": "12'" }`.
3. Try `{ "email": { "$ne": null }, "password": "x" }` on login. The sanitiser strips the operator and validation returns 400.
