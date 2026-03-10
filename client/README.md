# WebHarbour Frontend (HTML/CSS/JS)

## Overview
Static multi-page frontend built with plain HTML, vanilla CSS, and vanilla JS. No build step required.

## Local Run
Serve the `client` folder with any static server.

Example (Node):
```
cd client
npx serve .
```

## Configuration
Update API base URL in `client/js/config.js`:
```
API_BASE_URL: "http://localhost:4000"
```

## Page Map
- `/index.html`
- `/pages/apps/index.html`
- `/pages/apps/detail.html?id=APP_ID`
- `/pages/auth/login.html`
- `/pages/auth/register.html`
- `/pages/auth/reset-request.html`
- `/pages/user/favorites.html`
- `/pages/user/settings.html`
- `/pages/developer/dashboard.html`
- `/pages/developer/versions.html?id=APP_ID`
- `/pages/developer/analytics.html?id=APP_ID`
- `/pages/admin/moderation.html`
- `/pages/admin/reports.html`
- `/pages/admin/catalog.html`
