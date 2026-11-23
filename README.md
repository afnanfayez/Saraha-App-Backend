# saraha_app

Node.js / Express / MongoDB backend for the Saraha App project.

## Setup and startup

1. Run `npm install`.
2. Copy `.env.example` to `.env.development` and `.env.production`, then set the MongoDB URI and application secrets.
3. Run MongoDB locally or provide a reachable MongoDB URI in `DB_URI`.
4. Replace the Google Client ID placeholder with your real OAuth Web Client ID.
5. Run `npm run start:dev` for development or `npm run start:prod` for production.

## Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Health check |
| POST | `/auth/signup` | Register an account |
| POST | `/auth/confirm-email` | Confirm an email with an OTP |
| POST | `/auth/resend-otp` | Resend a subject-specific OTP |
| POST | `/auth/forgot-password` | Send a password-reset OTP |
| POST | `/auth/verify-forget-password-otp` | Verify a password-reset OTP |
| POST | `/auth/reset-password` | Reset a password |
| POST | `/auth/login` | Login with email and password |
| POST | `/auth/login-with-gmail` | Google signup/login with `idToken` |
| POST | `/auth/rotate-token` | Rotate access and refresh tokens |
| POST | `/auth/logout` | Log out this device or all sessions |
| GET | `/user/user-profile/:userId` | Public profile for a user ID |
| POST | `/user/:id` | Upload a user image (authenticated) |
| GET | `/user/profile` | Authenticated user profile |
| GET | `/user/admin-profile` | Admin role only |

`/auth/signup` requires `email`, `password`, `confirmPassword`, `username`, an E.164 `phone`, and numeric `gender`. Send a Google ID token as `{ "idToken": "..." }` to `/auth/login-with-gmail`.

Protected routes accept `Authorization: Bearer <accessToken>` or `Authorization: Basic <base64(email:password)>`. Use the refresh token with the Bearer scheme for `/auth/rotate-token` after the access token expires.

Send `Accept-Language: 0` for Arabic validation messages or `Accept-Language: 1` for English. English is the default. The public user profile excludes passwords and internal account metadata.
