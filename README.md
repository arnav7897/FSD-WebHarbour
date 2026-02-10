# FSD-WebHarbour

## Overview
WebHarbour is a web-based app marketplace backend. The project is being built in phases with a focus on authentication, developer publishing workflows, discovery, and moderation.

## Implemented Features (So Far)
- Express server bootstrap with structured folders for controllers, services, middleware, routes, and config
- Environment configuration via `.env`
- Swagger UI at `/docs` with OpenAPI spec at `/openapi.json`
- Health check endpoint: `GET /health`
- JWT authentication with access and refresh tokens
- Auth endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- Role support (`USER`, `DEVELOPER`, `ADMIN`) in the data model
- Password hashing with bcrypt
- Prisma schema for PostgreSQL (User + RefreshToken tables)
- Refresh token rotation and storage (hashed in DB)

## Tech Stack (Current)
- Node.js + Express
- PostgreSQL (via Supabase)
- Prisma ORM
- Swagger UI + swagger-jsdoc

## Status Notes
- Email verification is planned but not implemented yet.
- Additional domain modules (apps, reviews, moderation, analytics) are planned for later phases.

## Phase 3 Plan (Core Marketplace)
Focus: Core marketplace APIs with persisted data and role-based access. This phase does not include moderation or analytics.

## Phase 3 API Scope
- `POST /apps` (role: `DEVELOPER`)
- `GET /apps` (public)
- `GET /apps/:id` (public)
- `PATCH /apps/:id` (role: `DEVELOPER`, owner only)
- `POST /apps/:id/publish` (role: `DEVELOPER`, owner only)
- `POST /apps/:id/versions` (role: `DEVELOPER`, owner only)
- `GET /apps/:id/versions` (public)
- `GET /categories` (public)
- `POST /categories` (role: `ADMIN`)
- `GET /tags` (public)
- `POST /tags` (role: `ADMIN`)
- `POST /apps/:id/reviews` (role: `USER`)
- `GET /apps/:id/reviews` (public)
- `PATCH /apps/:id/reviews/:reviewId` (role: `USER`, owner only)
- `DELETE /apps/:id/reviews/:reviewId` (role: `USER` owner or `ADMIN`)

## Phase 3 Prisma Schema Additions
- `enum AppStatus { DRAFT PUBLISHED DEPRECATED }`
- `Category` with `id`, `name` (unique)
- `Tag` with `id`, `name` (unique)
- `App` with `name`, `description`, `status`, `developerId`, `categoryId`, `tags`, timestamps
- `AppVersion` with `appId`, `version`, `changelog?`, `downloadUrl`, timestamps
- `Review` with `appId`, `userId`, `rating`, `comment?`, timestamps
- Unique constraints: `@@unique([appId, version])`, `@@unique([appId, userId])`

## Team Tasks (4 Members, Parallel)
Each member owns their API surface end-to-end: route, controller, service, Prisma queries, validation, Swagger docs, and error handling.

### Member 1 — Prisma Schema + Migration
Expectations:
- Update `prisma/schema.prisma` with Phase 3 models and enums
- Run migration `npx prisma migrate dev --name phase3_core`
- Regenerate Prisma client

### Member 2 — Apps + Versions APIs
Expectations:
- Implement routes/controllers/services for apps + versions
- Enforce `DEVELOPER` role and ownership checks
- Return draft status on create, publish via `/apps/:id/publish`
- Add Swagger docs and standard errors (400/401/403/404/409)

### Member 3 — Categories + Tags APIs
Expectations:
- Implement category and tag list/create endpoints
- Enforce `ADMIN` role on create
- Add Swagger docs and standard errors (400/401/403)

### Member 4 — Reviews APIs
Expectations:
- Implement review create/list/update/delete endpoints
- Enforce one review per user per app
- Validate rating is 1–5
- Enforce owner checks and allow `ADMIN` delete
- Add Swagger docs and standard errors (400/401/403/404/409)
