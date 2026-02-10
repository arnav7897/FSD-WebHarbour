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

## Next Phase (Planned)
Focus: Core marketplace APIs with persisted data and role-based access.
- Apps: create/update app listings, publish versions, list/search apps
- Reviews: submit/edit/delete reviews, rating aggregation
- Categories/Tags: manage and assign for discovery
- Admin moderation: approve/reject apps, remove reviews

## Team Tasks (1-Day APIs)
Below are three single-API tasks to split among 3 members. Each task should include route, controller, service, Prisma query, validation, and Swagger docs.

### Member 1 — Create App Listing API
**Endpoint:** `POST /apps`  
**Role:** `DEVELOPER`  
**Request Body:** `{ name, description, categoryId, tags[] }`  
**Expectation:**
- Validate required fields
- Create app record and attach tags
- Return created app (id, name, description, category, tags, developerId, status=draft)
- Add Swagger docs + error responses (400/401/403)

### Member 2 — Submit Review API
**Endpoint:** `POST /apps/:appId/reviews`  
**Role:** `USER`  
**Request Body:** `{ rating, comment }`  
**Expectation:**
- One review per user per app
- Validate rating 1–5
- Store review and return summary
- Add Swagger docs + error responses (400/401/404/409)

### Member 3 — Admin Approve App API
**Endpoint:** `PATCH /admin/apps/:appId/approve`  
**Role:** `ADMIN`  
**Expectation:**
- Only approve apps in `pending` status
- Update status to `approved` and return updated app
- Add Swagger docs + error responses (401/403/404/409)

If you want me to assign real names and exact schema fields, tell me the member names and final app schema.
