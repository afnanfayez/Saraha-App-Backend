# Saraha App Backend

A REST API for an anonymous messaging platform built with **Node.js, Express, MongoDB, and Mongoose**. Users can register, share a public profile, receive anonymous messages, and manage their inbox.

## Features

- Signup, email verification, login, logout, and password reset.
- JWT access tokens and rotating refresh tokens.
- Bearer authentication with `USER` and `ADMIN` roles.
- Public profiles and anonymous message submission.
- Private inbox, read status, deletion, reports, pagination, and sorting.
- Argon2id password hashing.
- AES-256-GCM encryption for stored message content.
- Avatar uploads with file validation.
- Mongoose validation, indexes, virtuals, lean queries, populate, and optimistic concurrency.
- Centralized error handling, input validation, and rate limiting.

## Tech Stack

Node.js 20.19+, Express 5, MongoDB, Mongoose, JavaScript ES Modules, `jsonwebtoken`, `argon2`, Node.js `crypto`, Formidable, Zod, Helmet, CORS, and `express-rate-limit`.

## Project Structure

```text
Saraha-App/
├── src/
│   ├── common/
│   ├── config/
│   ├── database/
│   ├── modules/
│   ├── routes/
│   ├── app.js
│   └── server.js
├── tests/
├── .env.example
├── .gitignore
├── .npmrc
├── .prettierrc.json
├── eslint.config.js
├── package.json
├── package-lock.json
└── README.md
```

`node_modules/` and `.env` are local-only files and must not be committed.

## Setup

**Requirements:** Node.js 20.19+, npm, MongoDB Server, and Apidog.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Open `.env`. Keep the provided defaults and set your own secrets. Generate them with:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   Use the first value for `JWT_ACCESS_SECRET` and the second for `ENCRYPTION_KEY`. Keep `.env` private. Do not replace an encryption key while messages encrypted with it still need to be read.

4. Make sure MongoDB is running, then start the API:

   ```bash
   npm run dev
   ```

The API base URL is `http://localhost:3000/api/v1`. Check that the server is running:

```http
GET /api/v1/health
```

For local email testing, keep `EMAIL_PROVIDER=console`. Verification and password-reset messages will appear in the server terminal. Use the token from the message to complete the relevant request.

## API Overview

| Area | Endpoints |
|---|---|
| Authentication | `/auth/signup`, `/auth/verify-email`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` |
| Users | `/users/me`, `/users/me/avatar`, `/users/me/settings` |
| Public | `/public/users/:username`, `/public/users/:username/messages` |
| Messages | `/messages/inbox`, `/messages/:id`, `/messages/:id/read`, `/messages/:id/report` |
| Admin | `/admin/users`, `/admin/users/:id/status`, `/admin/reports`, `/admin/reports/:id` |

Protected requests use:

```http
Authorization: Bearer <accessToken>
```

In Apidog, set the base URL to `http://localhost:3000/api/v1` and configure Bearer authentication with the access token.

## Creating an Admin

Public signup always creates a regular `USER`. Admin accounts must be created through a restricted local bootstrap process—not through a public API.

The helper `scripts/create-admin.js` is kept separately and is not included in this repository. If you retained that private helper, run these commands from the project root in PowerShell:

```powershell
$env:ADMIN_NAME = "Saraha Admin"
$env:ADMIN_USERNAME = "saraha_admin"
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "Use-A-Strong-Password-12!"
node .\scripts\create-admin.js
```

The helper only works with the local development `saraha_app` database, requires a password of at least 12 characters, and will not promote an existing account.

## Security

- Passwords are stored as Argon2id hashes, never as plain text.
- JWTs are verified by the server; decoding alone does not authenticate a user.
- Refresh tokens are random opaque values. Only their hashes are stored, and refresh requests rotate them.
- Messages use AES-256-GCM with a unique IV and authentication tag.
- Anonymous message records do not store a sender ID; only the recipient can access the message.
- Encryption keys and credentials must never be committed.
- Message encryption is server-side encryption at rest, not end-to-end encryption.

## Tests

MongoDB must be running before the integration tests. Tests use the separate `saraha_app_test` database.

```bash
npm test
npm run lint
npm run format:check
```

Run all checks with `npm run check`. Never point the test database at personal or production data.

This repository contains the backend API only; it does not include a frontend.
