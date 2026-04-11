<div align="center">

# FSD-WebHarbour

**A full-stack app marketplace platform built with Node.js, Express, Prisma & vanilla JavaScript**

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-3448C5?logo=cloudinary&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## Overview

WebHarbour is a production-grade app marketplace where **users** discover and download apps, **developers** publish and manage their listings, and **admins** govern the platform through moderation, trust & safety, and catalog management.

The project follows a decoupled client–server architecture:
- **Backend** — RESTful API built with Express 5, Prisma ORM, and PostgreSQL.
- **Frontend** — Vanilla HTML / CSS / JavaScript using an IIFE module pattern (no frameworks).
- **Integrations** — Stripe (payments & Connect payouts), Cloudinary (media & ZIP storage), Swagger (API docs).

---

## Project Structure

```
FSD-WebHarbour/
├── client/                          # Frontend (static HTML/CSS/JS)
│   ├── css/                         # Stylesheets
│   ├── js/
│   │   ├── config.js                # API base URL
│   │   ├── auth.js                  # Token management (localStorage)
│   │   ├── api.js                   # HTTP client (fetch wrapper)
│   │   ├── ui.js                    # Toast, modal & skeleton helpers
│   │   ├── nav.js                   # Role-based navigation
│   │   ├── app.js                   # Bootstrap / auth hydration
│   │   └── pages/
│   │       ├── auth/                # Login, Register, Password Reset
│   │       ├── apps/                # Marketplace listing & detail
│   │       ├── admin/               # Moderation, Reports, Catalog
│   │       ├── developer/           # Dashboard, Edit, Versions, Analytics
│   │       └── user/                # Favorites, Settings
│   └── pages/                       # HTML page files
│
├── server/                          # Backend (Node.js + Express)
│   ├── config/                      # env, db (Prisma), cloudinary, constants
│   ├── middleware/                   # auth, role, error, upload (multer)
│   ├── controllers/                 # Request handlers
│   ├── services/                    # Business logic
│   ├── routes/                      # Express route definitions
│   ├── utlis/                       # JWT & password helpers
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema (18+ models)
│   │   └── seed.js                  # Admin user + categories + tags
│   ├── tests/                       # Automated test suite
│   └── src/
│       ├── app.js                   # Express app setup & route mounting
│       └── server.js                # HTTP server entry point
│
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| PostgreSQL | 15+ |
| npm | 9+ |

### Setup & Run

```bash
# 1. Clone the repository
git clone https://github.com/arnav7897/FSD-WebHarbour.git
cd FSD-WebHarbour

# 2. Install backend dependencies
cd server
npm install

# 3. Configure environment variables
#    Create a .env file in /server with:
#    DATABASE_URL, JWT_SECRET, CLOUDINARY_CLOUD_NAME,
#    CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
#    STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

# 4. Initialize the database
npx prisma migrate dev
npx prisma generate
npm run seed

# 5. Run tests to verify everything works
npm test

# 6. Start the backend server
npm run dev
#    → API available at http://localhost:4000
#    → Swagger docs at http://localhost:4000/docs

# 7. Open the frontend
#    Open client/index.html in a browser
#    (or serve the client/ directory with any static server)
```

---

## Backend — Build Phases

### Phase 1 · Foundation
- Express server bootstrapped with modular structure (`controllers/`, `services/`, `routes/`, `middleware/`, `config/`)
- Environment configuration loaded from `.env` with startup validation
- API documentation auto-generated via Swagger UI at `/docs` and OpenAPI JSON at `/openapi.json`
- Health check endpoint at `GET /health`

### Phase 2 · Authentication & Roles
- JWT-based authentication with short-lived access tokens (15 min) and long-lived refresh tokens (7 days)
- Refresh token rotation — old tokens are revoked on every refresh to prevent replay attacks
- Role hierarchy with permission inheritance:
  - `USER` — base permissions
  - `DEVELOPER` — inherits all `USER` permissions
  - `ADMIN` — inherits all `USER`, `DEVELOPER`, and `MODERATOR` permissions
- Password hashing with `bcryptjs` (10 salt rounds)

### Phase 3 · Marketplace Core
- **Apps API** — full CRUD, slug generation, versioning, media upload (icon, banner, screenshots via Cloudinary)
- **Categories & Tags API** — admin-managed catalog with automatic slug generation
- **Reviews API** — one review per user per app, owner-only edits, admin override delete, edit tracking

### Phase 4 · Platform Completion
- **App Lifecycle Moderation** — state machine enforcement (`DRAFT` → `UNDER_REVIEW` → `PUBLISHED` ↔ `SUSPENDED`, with `REJECTED` branch); invalid transitions return `409 Conflict`
- **Tracking & Engagement** — download tracking with version resolution, favorites (add / remove / list) with atomic counter sync
- **Trust & Safety** — user reporting API (APP / REVIEW / USER types), self-report prevention, duplicate detection, admin report queue with filtering and resolution workflow
- **Developer Analytics** — portfolio overview (totals for apps, downloads, favorites, average rating) and per-app deep dive (version adoption trends, daily download/favorite time series)
- **Auth Hardening** — logout (single session), logout-all (revoke every refresh token), and full password reset flow (request → token → confirm)
- **Audit Trail** — every moderation action (submit, approve, reject, suspend, unsuspend, report create, report resolve) creates an immutable `ModerationLog` entry with a JSON diff
- **Quality** — standardized error response shape, database seed script, and automated test suite covering auth flows, app lifecycle, report resolution, reviews, and engagement

---

## Frontend — Feature Overview

### User-Facing Pages
| Page | Features |
|------|----------|
| **Register / Login / Reset Password** | Form submission, JWT storage, auto-redirect |
| **Home** | Personalized recommendations, trending charts, newest apps |
| **App Listing** | Search, filter by category & tag, pagination |
| **App Detail** | Screenshots carousel, version history, reviews with star breakdown, download, favorite toggle, report form |
| **My Favorites** | Saved apps grid with one-click remove |
| **Settings** | Logout from all devices |

### Developer Pages
| Page | Features |
|------|----------|
| **Dashboard** | Request developer access, create apps, submit for review, filter own apps by status |
| **Edit App** | 3-step wizard (metadata → media uploads → review & submit), tag selector, asset management |
| **Versions** | Upload ZIP or external URL, changelog, supported OS, file size; download & share link buttons |
| **Analytics** | Portfolio overview (cards) + per-app version adoption table |

### Admin Pages
| Page | Features |
|------|----------|
| **Moderation** | Approve/reject apps under review, suspend/unsuspend live apps, approve/reject developer requests |
| **Reports** | Filter by status & type, resolve reports with decision (Approved / Rejected / Flagged) |
| **Catalog** | Create categories and tags |

---

## Payment Integration

- **Stripe Checkout** — users purchase premium apps through a hosted Stripe Checkout session
- **Platform Fee** — 20% commission automatically split via `payment_intent_data.application_fee_amount`
- **Stripe Connect** — developers onboard their bank accounts through Express Connect; payouts flow directly to their Stripe accounts
- **Webhook Verification** — `POST /webhooks/stripe` processes `checkout.session.completed` events using raw body signature verification to securely update transaction status

---

## Security

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT access tokens (15 min) + refresh token rotation (7 days), SHA-256 hashed in DB |
| **Authorization** | Role-based middleware with permission inheritance (`ADMIN > DEVELOPER > USER`) |
| **Password Storage** | bcryptjs with 10 salt rounds |
| **Input Validation** | Server-side validation on every endpoint; positive integer parsing, enum normalization, string trimming |
| **Webhook Security** | Stripe signature verification using `express.raw()` middleware before JSON parsing |
| **Error Handling** | Centralized error middleware; production errors never leak stack traces |

---

## API Reference

Full interactive API documentation is available at **`/docs`** when the server is running (Swagger UI).

Key endpoint groups:

| Prefix | Description | Auth Required |
|--------|------------|--------------|
| `/auth/*` | Register, login, refresh, logout, password reset, developer access | Mixed |
| `/apps/*` | CRUD, versioning, media, assets, download, submit | Mixed |
| `/apps/:id/reviews/*` | Create, update, delete reviews | USER+ |
| `/apps/:id/favorite` | Add / remove favorites | USER+ |
| `/reports` | Submit trust & safety reports | USER+ |
| `/admin/*` | App moderation, developer requests, report resolution | ADMIN |
| `/developer/analytics/*` | Portfolio overview, per-app analytics | DEVELOPER+ |
| `/recommendations/home` | Personalized home feed | Optional |
| `/categories`, `/tags` | Catalog CRUD | GET: Public, POST: ADMIN |

---

## Testing

```bash
cd server
npm test
```

The automated test suite covers:

| Test File | What It Validates |
|-----------|-------------------|
| `auth.flows.test.js` | Register → login → refresh → logout lifecycle |
| `app-lifecycle.test.js` | DRAFT → submit → approve → suspend → unsuspend transitions; invalid transition rejection (409) |
| `report-resolution.test.js` | User report creation → admin list with filters → admin resolve; double-resolution prevention (409) |
| `review-rules.test.js` | One review per user enforcement, edit tracking, admin override delete |
| `tracking-favorites.test.js` | Download tracking, favorite add/remove, duplicate detection |

---

## Team Allocation (4 Members)

| Member | Responsibility |
|--------|---------------|
| **Member 1** | Authentication + session flows + route guards |
| **Member 2** | Marketplace (listing / detail / reviews / favorites / download) |
| **Member 3** | Developer dashboard + analytics views |
| **Member 4** | Admin moderation / reporting + catalog management |

---

## License

This project is licensed under the [MIT License](LICENSE).
