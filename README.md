# FSD-WebHarbour

## Overview
WebHarbour is a web-based app marketplace backend. The project is being built in phases with a focus on authentication, developer publishing workflows, discovery, and moderation.

## Implemented Features (So Far)
- Express server bootstrap with structured folders for controllers, services, middleware, routes, and config
- Environment configuration via `.env`
- Swagger UI at `/docs` with OpenAPI spec at `/openapi.json`
- Health check endpoint: `GET /health`
- JWT authentication with access and refresh tokens
- Role model implemented with inheritance (`DEVELOPER` includes `USER` permissions)
- Password hashing with bcrypt and JWT signing/verification
- Prisma + PostgreSQL integration with persistent DB-backed auth
- Auth APIs implemented:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/become-developer`
- `GET /auth/me`
- App APIs implemented:
- `POST /apps`
- `GET /apps`
- `GET /apps/:id`
- `PATCH /apps/:id`
- `POST /apps/:id/publish`
- `POST /apps/:id/versions`
- `GET /apps/:id/versions`
- Catalog APIs implemented:
- `GET /categories`
- `POST /categories` (admin)
- `GET /tags`
- `POST /tags` (admin)
- Review APIs implemented:
- `POST /apps/:appId/reviews`
- `GET /apps/:appId/reviews`
- `PATCH /apps/:appId/reviews/:reviewId`
- `DELETE /apps/:appId/reviews/:reviewId`

## Tech Stack (Current)
- Node.js + Express
- PostgreSQL (via Supabase)
- Prisma ORM
- Swagger UI + swagger-jsdoc

## Status Notes
- Email verification is planned but not implemented yet.
- Core marketplace APIs from previous phase are completed.
- Remaining backend completion items are captured in Phase 4 below.

## Phase 4 Plan (Backend Completion)
Goal: finish the full backend in this phase so Phase 5 is frontend-only.

## Phase 4 Detailed Work

### 1. Moderation and app lifecycle
- Implement developer submit flow:
- `POST /apps/:id/submit` moves app from `DRAFT` to `UNDER_REVIEW`.
- Implement admin moderation flows:
- `PATCH /admin/apps/:id/approve` sets status `PUBLISHED`.
- `PATCH /admin/apps/:id/reject` sets status `REJECTED` with required moderation note.
- `PATCH /admin/apps/:id/suspend` sets status `SUSPENDED` with reason.
- `PATCH /admin/apps/:id/unsuspend` restores to `PUBLISHED`.
- Enforce valid state transitions and reject invalid transitions with `409`.

### 2. Download and favorite tracking
- Implement download tracking:
- `POST /apps/:id/download` creates download/install record and increments cached counters.
- Implement favorites:
- `POST /apps/:id/favorite` adds to favorites.
- `DELETE /apps/:id/favorite` removes favorite.
- `GET /users/me/favorites` lists saved apps.
- Ensure duplicate favorites are conflict-safe (`409`) and remove is idempotent.

### 3. Reporting and trust/safety
- Implement reporting API:
- `POST /reports` to report app/review/user with reason and description.
- Implement admin report operations:
- `GET /admin/reports` with filters (`status`, `type`, date range).
- `PATCH /admin/reports/:id/resolve` with moderator decision and notes.
- Maintain moderation logs for report actions.

### 4. Developer analytics
- Implement summary analytics:
- `GET /developer/analytics/overview` for totals and averages.
- Implement app-specific analytics:
- `GET /developer/analytics/apps/:id` for per-app trends.
- Include metrics:
- total downloads
- total favorites
- review count and average rating
- version-wise adoption/download trends

### 5. Auth hardening
- Add email verification flow:
- verification token generation, send, verify endpoint, and login restriction for unverified users.
- Add secure session controls:
- logout endpoint with refresh token revocation.
- Add password reset flow:
- request reset token and confirm reset.

### 6. Backend quality completion
- Add Swagger docs for all new endpoints with request examples and standard errors (`400/401/403/404/409`).
- Standardize error response shape across modules.
- Add seed scripts for baseline data (admin user, categories, tags).
- Add automated tests for critical paths:
- auth flows
- app lifecycle moderation
- review rules
- tracking/favorites
- report resolution

## Phase 4 Done Criteria
- All major backend modules are implemented and documented.
- Every endpoint is available in Swagger with examples and errors.
- Role checks and ownership checks are enforced across protected routes.
- DB writes are fully persistent and migration-safe.
- Team can start frontend without backend blockers.

## Phase 4 Team Plan (4 Members, Parallel)
### Member 1 — Moderation + Reports
Expectations:
- implement app moderation state transitions
- implement report list/resolve APIs for admins
- enforce strict admin authorization and transition validation

### Member 2 — Tracking + Favorites
Expectations:
- implement download tracking APIs
- implement favorite add/remove/list APIs
- ensure idempotent behavior and duplicate-safe writes

### Member 3 — Analytics + Insights
Expectations:
- implement developer analytics overview and per-app analytics APIs
- aggregate download/review/favorite/version metrics
- return frontend-ready response shape with stable keys

### Member 4 — Auth Hardening + Reliability
Expectations:
- implement email verification and password reset flows
- implement logout and refresh-token revocation
- add shared error schema, API tests, and seed utilities

## Phase 5 Plan (Frontend)
- Build complete frontend on top of stabilized APIs.
- Integrate auth, app discovery, developer dashboard, moderation panel, and analytics views.
