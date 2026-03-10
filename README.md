# FSD-WebHarbour

## Overview
WebHarbour is an app marketplace platform. The backend (API + database + documentation) is now built through Phase 4 and is ready for frontend integration.

## Backend Completion Summary

### Phase 1: Foundation
- Express server bootstrapped with modular structure (`controllers`, `services`, `routes`, `middleware`, `config`)
- Environment configuration with `.env`
- Swagger UI at `/docs` and OpenAPI JSON at `/openapi.json`
- Health endpoint: `GET /health`

### Phase 2: Auth + Roles
- JWT access + refresh token authentication
- Role system with inheritance:
  - `DEVELOPER` includes `USER` access
  - `ADMIN` includes all role permissions
- Password hashing with `bcryptjs`

### Phase 3: Marketplace Core
- Apps APIs (create/list/detail/update/versioning)
- Categories and tags APIs (admin-managed)
- Review APIs (one review per user per app, owner checks, admin override delete)

### Phase 4: Full Backend Completion
- App lifecycle moderation:
  - developer submit for review
  - admin approve/reject/suspend/unsuspend
  - valid transition enforcement with `409`
- Tracking and engagement:
  - app download tracking
  - favorites add/remove/list
- Trust and safety:
  - reporting API
  - admin report listing + resolution
  - moderation logs maintained
- Developer analytics:
  - overview totals
  - per-app analytics with version-wise trends
- Auth hardening:
  - logout + logout-all (refresh token revocation)
  - password reset flow
- Backend quality:
  - standardized error response shape
  - seed script for baseline admin/categories/tags
  - automated test suite for critical flows

## Current Backend Status
Backend is feature-complete for planned marketplace scope and ready for frontend development.

Before frontend work, run this once locally:

```bash
cd server
npx prisma migrate dev
npx prisma generate
npm run seed
npm test
```

## Phase 5 Plan: Frontend Development
Goal: Build full production-style frontend on top of stabilized backend APIs.

### 1. Core Frontend Setup
- Choose stack (recommended: React + Vite)
- Add routing, API client layer, auth token handling, protected routes
- Add global error handling for standardized backend error shape

### 2. User-Facing Features
- Authentication screens:
  - register, login, reset password
- Marketplace screens:
  - app listing with filters/search
  - app detail page
  - reviews create/update/delete
  - favorite/unfavorite + "My Favorites"
  - download actions

### 3. Developer Features
- Developer onboarding (request access, admin approval)
- App management dashboard:
  - create/edit apps
  - submit for review
  - versions management
- Analytics dashboard:
  - overview metrics
  - per-app trend charts

### 4. Admin Features
- Moderation panel:
  - approve/reject/suspend/unsuspend apps
- Trust & safety panel:
  - report queue with filters
  - report resolution workflow
- Catalog panel:
  - category and tag management

### 5. Frontend Done Criteria
- All major API flows integrated from Swagger docs
- Role-based navigation and access enforced in UI
- Error handling consistent with backend `ErrorResponse` schema
- Responsive UI for mobile + desktop
- Demo-ready full flow for user, developer, and admin personas

## Team Suggestion for Frontend Phase (4 Members)
- Member 1: Auth + session flows + route guards
- Member 2: Marketplace (listing/detail/review/favorites/download)
- Member 3: Developer dashboard + analytics views
- Member 4: Admin moderation/reporting + catalog management
