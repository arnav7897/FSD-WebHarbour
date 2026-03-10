# WebHarbour Server API Guide

## Overview
This backend provides REST APIs for authentication, app publishing workflow, moderation, trust/safety, tracking, and analytics.

Base URL (local): `http://localhost:4000`  
Swagger UI: `http://localhost:4000/docs`  
OpenAPI JSON: `http://localhost:4000/openapi.json`

## Run Locally
1. Install dependencies
```bash
cd server
npm install
```
2. Run DB migrations + Prisma client
```bash
npx prisma migrate dev
npx prisma generate
```
3. Seed baseline admin/categories/tags
```bash
npm run seed
```
4. Start API
```bash
npm run dev
```
5. Run tests
```bash
npm test
```

## Environment Variables
- `PORT` (default: `4000`)
- `NODE_ENV` (default: `development`)
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (required)
- `JWT_EXPIRES_IN` (default: `1d`)
- `REFRESH_TOKEN_EXPIRES_IN` (default: `7d`)
- `PASSWORD_RESET_TOKEN_EXPIRES_IN` (default: `15m`)
- `AUTH_EXPOSE_DEBUG_TOKENS` (default: `true` in non-production)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (required for APK upload)
- `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (optional seed config)

## Auth and Role Model
- New users register as `USER`.
- `POST /auth/become-developer` creates a developer access request for admin approval.
- `ADMIN` can be seeded/managed at DB level.
- Role inheritance:
  - `DEVELOPER` can access `USER` endpoints
  - `ADMIN` can access `USER`, `DEVELOPER`, `MODERATOR`, and admin endpoints

## Standard Error Response
All errors are standardized:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation error",
    "status": 400
  }
}
```

Common status codes:
- `400` bad request / validation
- `401` unauthorized / invalid token
- `403` forbidden (role/ownership)
- `404` resource not found
- `409` conflict (invalid transition, duplicate action)

## API Summary

### Health
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `GET` | `/health` | No | Service heartbeat | Monitoring, deployment checks |

### Authentication
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | Create account | Signup flow |
| `POST` | `/auth/login` | No | Login and issue access + refresh tokens | Login flow |
| `POST` | `/auth/password-reset/request` | No | Request password reset token | Forgot password |
| `POST` | `/auth/password-reset/confirm` | No | Reset password using token | Reset password form |
| `POST` | `/auth/refresh` | No (refresh token in body) | Rotate tokens | Silent session renewal |
| `POST` | `/auth/logout` | No (refresh token in body) | Revoke current refresh token | Logout current device |
| `POST` | `/auth/logout-all` | Bearer | Revoke all refresh tokens for current user | Security/settings screen |
| `POST` | `/auth/become-developer` | Bearer | Request developer access (admin approval) | Developer onboarding |
| `GET` | `/auth/developer-status` | Bearer | Get developer request status | Developer onboarding |
| `GET` | `/auth/me` | Bearer | Current user profile/session | App bootstrap, profile |

### Catalog (Categories and Tags)
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `GET` | `/categories` | No | List primary app categories | App forms, filter sidebar |
| `POST` | `/categories` | Bearer (`ADMIN`) | Create category | Admin catalog panel |
| `GET` | `/tags` | No | List secondary labels | App forms, search filters |
| `POST` | `/tags` | Bearer (`ADMIN`) | Create tag | Admin catalog panel |

### Apps and Versions
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `POST` | `/apps` | Bearer (`DEVELOPER`) | Create app in `DRAFT` | Developer dashboard |
| `GET` | `/apps` | No | List apps with filters/pagination | Marketplace listing |
| `GET` | `/apps/:id` | No | App detail by id | App detail page |
| `PATCH` | `/apps/:id` | Bearer (`DEVELOPER`, owner) | Update app metadata | Developer edit screen |
| `POST` | `/apps/:id/submit` | Bearer (`DEVELOPER`, owner) | Submit `DRAFT` app for moderation (`UNDER_REVIEW`) | Developer publishing workflow |
| `POST` | `/apps/:id/publish` | Bearer (`DEVELOPER`, owner) | Deprecated direct publish endpoint (returns conflict) | Legacy only; do not use |
| `POST` | `/apps/:id/versions` | Bearer (`DEVELOPER`, owner) | Create app version | Release management |
| `POST` | `/apps/:id/versions/upload` | Bearer (`DEVELOPER`, owner) | Upload APK + create version | Release management |
| `GET` | `/apps/:id/versions` | No | List app versions | Version history UI |

### Tracking and Favorites
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `POST` | `/apps/:id/download` | Bearer (`USER+`) | Create download/install record and increment counters | Download/install action |
| `POST` | `/apps/:id/favorite` | Bearer (`USER+`) | Add app to favorites (`409` on duplicate) | Favorite button |
| `DELETE` | `/apps/:id/favorite` | Bearer (`USER+`) | Remove favorite (idempotent) | Unfavorite button |
| `GET` | `/users/me/favorites` | Bearer (`USER+`) | List current user favorites | Saved/Favorites page |

### Reviews
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `POST` | `/apps/:appId/reviews` | Bearer (`USER+`) | Create review (one per user per app) | App feedback form |
| `GET` | `/apps/:appId/reviews` | No | List app reviews | App detail review section |
| `PATCH` | `/apps/:appId/reviews/:reviewId` | Bearer (`USER+`, owner) | Update own review | Review management |
| `DELETE` | `/apps/:appId/reviews/:reviewId` | Bearer (`USER+` owner / `ADMIN`) | Delete review | User self-delete / admin moderation |

### Reporting and Trust/Safety
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `POST` | `/reports` | Bearer (`USER+`) | Report `APP`/`REVIEW`/`USER` with reason + description | Report abuse flow |
| `GET` | `/admin/reports` | Bearer (`ADMIN`) | List reports with filters (`status`, `type`, date range, pagination) | Admin trust/safety queue |
| `PATCH` | `/admin/reports/:id/resolve` | Bearer (`ADMIN`) | Resolve pending report with decision + notes | Admin report actions |

### Moderation and Lifecycle (Admin)
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `PATCH` | `/admin/apps/:id/approve` | Bearer (`ADMIN`) | `UNDER_REVIEW` -> `PUBLISHED` | Admin moderation panel |
| `PATCH` | `/admin/apps/:id/reject` | Bearer (`ADMIN`) | `UNDER_REVIEW` -> `REJECTED` (note required) | Admin moderation panel |
| `PATCH` | `/admin/apps/:id/suspend` | Bearer (`ADMIN`) | `PUBLISHED` -> `SUSPENDED` (reason required) | Admin moderation panel |
| `PATCH` | `/admin/apps/:id/unsuspend` | Bearer (`ADMIN`) | `SUSPENDED` -> `PUBLISHED` | Admin moderation panel |
| `GET` | `/admin/developers/requests` | Bearer (`ADMIN`) | List developer access requests | Admin developer review |
| `PATCH` | `/admin/developers/:userId/approve` | Bearer (`ADMIN`) | Approve developer access | Admin developer review |
| `PATCH` | `/admin/developers/:userId/reject` | Bearer (`ADMIN`) | Reject developer access request | Admin developer review |

### Developer Analytics
| Method | Endpoint | Auth | Purpose | Where to Use |
|---|---|---|---|---|
| `GET` | `/developer/analytics/overview` | Bearer (`DEVELOPER`) | Aggregate metrics across developer apps | Developer dashboard summary cards |
| `GET` | `/developer/analytics/apps/:id` | Bearer (`DEVELOPER`, owner) | Per-app metrics + version trends | Developer app analytics screen |

## Key Payload Examples

### Report Creation
```json
{
  "type": "APP",
  "targetId": 42,
  "reason": "Suspicious behavior",
  "description": "Unexpected network calls during startup"
}
```

### Resolve Report (Admin)
```json
{
  "decision": "APPROVED",
  "notes": "Confirmed violation and action logged"
}
```

### Submit App for Review
```json
{}
```

### Suspend App (Admin)
```json
{
  "reason": "Malware signature detected"
}
```

### Add Version
```json
{
  "version": "1.0.1",
  "changelog": "Performance improvements",
  "downloadUrl": "https://cdn.example.com/apps/app-v1.0.1.zip",
  "fileSize": "52 MB",
  "supportedOs": ["WEB", "WINDOWS", "MACOS"]
}
```

## Typical End-to-End Flows

### User Flow
1. Register -> login.
2. Browse app list and app detail.
3. Download app, add/remove favorites.
4. Add/update/delete review.
5. Report suspicious app/review/user if needed.

### Developer Flow
1. Register -> login -> request developer access -> admin approves.
2. Create app (`DRAFT`) and add versions.
3. Submit app for review.
4. Track performance in analytics overview and per-app trends.

### Admin Flow
1. Login as admin.
2. Moderate apps (approve/reject/suspend/unsuspend).
3. Review developer access requests.
4. Manage categories/tags.
5. Review reports and resolve trust/safety cases.
