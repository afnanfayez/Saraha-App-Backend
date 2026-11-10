# saraha_app

Backend REST API for Saraha, built with Node.js, Express, MongoDB, and Mongoose.

Supports user signup and login, bcrypt password hashing, AES-256-CBC phone encryption, JWT access/refresh tokens, and role-based profile access (user/admin).

## Run locally

1. Install Node.js and start MongoDB on `127.0.0.1:27017`.
2. Install dependencies: `npm install`
3. Start the development server: `npm run start:dev`

Production command: `npm run start:prod`

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Health check |
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Sign in and receive tokens |
| POST | `/auth/rotate-token` | Rotate tokens using a refresh token |
| GET | `/user/profile` | Authenticated user profile |
| GET | `/user/admin-profile` | Admin-only profile |

Protected routes expect the token directly in the `authorization` header, without `Bearer`.
