# WebHarbour Server API Guide

## Overview
This backend exposes REST APIs for authentication, app publishing, category/tag management, and reviews.

Base URL (local): `http://localhost:4000`  
Swagger UI: `http://localhost:4000/docs`  
OpenAPI JSON: `http://localhost:4000/openapi.json`

## Run Locally
1. Install dependencies:
```bash
cd server
npm install
```
2. Generate Prisma client:
```bash
npx prisma generate
```
3. Run API:
```bash
npm run dev
```

## Environment Variables
- `PORT` default `4000`
- `NODE_ENV` default `development`
- `JWT_SECRET` required for auth
- `JWT_EXPIRES_IN` default `1d`
- `REFRESH_TOKEN_EXPIRES_IN` default `7d`
- `DATABASE_URL` (or `DB_URI`) PostgreSQL connection URL

## Auth and Role Model
- New users register with role `USER`.
- `POST /auth/become-developer` upgrades logged-in user to `DEVELOPER`.
- `ADMIN` role should be assigned via DB/admin process.
- Role inheritance in middleware:
- `DEVELOPER` can access `USER` endpoints.
- `ADMIN` can access `USER`, `DEVELOPER`, and admin-protected endpoints.

## Error Format
Most errors return:
```json
{
  "message": "Error description"
}
```
Common status codes:
- `400` invalid input
- `401` unauthenticated or invalid token
- `403` forbidden (insufficient role or not owner)
- `404` resource not found
- `409` unique conflict / duplicate action

## API Summary

### Health
| Method | Endpoint | Auth | Purpose | Where Used |
|---|---|---|---|---|
| `GET` | `/health` | No | Service heartbeat | Monitoring, uptime checks |

### Authentication
| Method | Endpoint | Auth | Purpose | Where Used |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | Create user account | Signup page |
| `POST` | `/auth/login` | No | Issue access + refresh tokens | Login page |
| `POST` | `/auth/refresh` | No (refresh token in body) | Rotate tokens | Silent session renewal |
| `POST` | `/auth/become-developer` | Bearer token | Upgrade current user to `DEVELOPER` and re-issue tokens | Developer onboarding |
| `GET` | `/auth/me` | Bearer token | Return current user profile | Session/profile checks |

### Categories and Tags
| Method | Endpoint | Auth | Purpose | Where Used |
|---|---|---|---|---|
| `GET` | `/categories` | No | List active primary classifications | App create/edit forms, filters |
| `POST` | `/categories` | Bearer token (`ADMIN`) | Create category | Admin catalog management |
| `GET` | `/tags` | No | List secondary discovery labels | App create/edit forms, filters |
| `POST` | `/tags` | Bearer token (`ADMIN`) | Create tag | Admin catalog management |

### Apps and Versions
| Method | Endpoint | Auth | Purpose | Where Used |
|---|---|---|---|---|
| `POST` | `/apps` | Bearer token (`DEVELOPER`) | Create app as `DRAFT` | Developer publishing flow |
| `GET` | `/apps` | No | Paginated listing with filters | Marketplace browse/search |
| `GET` | `/apps/:id` | No | Get app details | App detail page |
| `PATCH` | `/apps/:id` | Bearer token (`DEVELOPER`, owner) | Update app metadata | Developer app management |
| `POST` | `/apps/:id/publish` | Bearer token (`DEVELOPER`, owner) | Publish app | Developer release flow |
| `POST` | `/apps/:id/versions` | Bearer token (`DEVELOPER`, owner) | Add version entry | Version release management |
| `GET` | `/apps/:id/versions` | No | List all app versions | App detail and update history |

### Reviews
| Method | Endpoint | Auth | Purpose | Where Used |
|---|---|---|---|---|
| `POST` | `/apps/:appId/reviews` | Bearer token (`USER+`) | Create one review per user per app | User feedback flow |
| `GET` | `/apps/:appId/reviews` | No | List reviews for app | App detail page |
| `PATCH` | `/apps/:appId/reviews/:reviewId` | Bearer token (`USER+`, owner) | Update own review | User feedback management |
| `DELETE` | `/apps/:appId/reviews/:reviewId` | Bearer token (`USER+` owner or `ADMIN`) | Delete review | User/admin moderation |

## Key Request Payloads

### Register
```json
{
  "name": "Arnav",
  "email": "arnav@example.com",
  "password": "StrongPass123"
}
```

### Create Category (Admin)
```json
{
  "name": "Productivity",
  "description": "Task and workflow apps",
  "order": 1,
  "isActive": true
}
```

### Create App (Developer)
```json
{
  "name": "Notion Theme Pack",
  "description": "Theme presets for productivity dashboards",
  "categoryId": 2,
  "tags": [3, 5]
}
```

### Add App Version (Developer Owner)
```json
{
  "version": "1.0.1",
  "changelog": "Improved performance and fixed dark mode issues",
  "downloadUrl": "https://cdn.example.com/apps/notion-theme-pack-1.0.1.zip",
  "fileSize": "52 MB",
  "supportedOs": ["WEB", "WINDOWS", "MACOS"]
}
```

### Create Review (User)
```json
{
  "rating": 5,
  "title": "Great app",
  "comment": "Very useful and stable."
}
```

## Typical Flow (End User + Developer)
1. User registers and logs in.
2. User upgrades to developer using `/auth/become-developer`.
3. Admin creates categories/tags.
4. Developer creates app (`DRAFT`), updates details, publishes app, and adds versions.
5. Users browse apps and submit reviews.
