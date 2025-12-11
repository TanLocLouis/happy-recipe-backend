
## Happy Food Backend (Express + Prisma + MySQL)

Minimal setup guide plus the current HTTP surface (auth, posts, bookmarks, comments).

### Prerequisites
- Node.js 18+
- MySQL 8+

### Quick start
1) Copy `.env.example` (or create `.env`):
```
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=happy_recipe
JWT_SECRET=supersecret_change_me
JWT_EXPIRES_IN=7d
VITE_MAIL=your.email@gmail.com
VITE_MAILTOKEN=your_gmail_app_password
```
2) Install deps
```
npm install
```
3) Initialize DB schema (runs `database/happy_recipe.sql`)
```
npx prisma db push
npx prisma generate
```
4) Seed sample data (users, posts, comments, reactions, bookmarks)
```
npx prisma db seed
```
5) Run the API server
```
npm run dev
```

### API overview (paths are under `/api`)
- Auth
  - `POST /auth/signup` — create account.
  - `POST /auth/signin` — start email 2FA; returns `tempToken`.
  - `POST /auth/validate/2fa` — exchange code + `tempToken` for `accessToken` + `refreshToken`.
  - `POST /auth/validate/refresh-token` — refresh access token (accepts header or body token).
  - `GET /auth/validate/access-token` — simple access-token check.
  - `GET /auth/user-info` — returns user profile for the authenticated user (uses `req.userId`, no password check).
- Posts
  - `POST /posts` — create post (auth required).
  - `GET /posts/all` — list posts (paginated `limit/offset`).
  - `GET /posts/discover` — feed with reactions/bookmarks (optional auth to shape `userActions`).
  - `GET /posts/latest` — latest posts; `details=true` includes ingredients/steps.
  - `GET /posts/:id` — single post detail; optional auth populates `userActions`.
  - `GET /posts/:id/comments` — paginated comments with reply counts (`page`, `limit`).
- Reactions & bookmarks
  - `POST /user-action/user-action` — unified mutations for reactions or bookmarks. Body: `{ action: "reaction" | "bookmark", postId, newReaction?, newBookmark? }` (auth required).
  - `GET /user-action/bookmarks` — list current user's bookmarks.

### Data / Prisma notes
- Schema lives in `prisma/schema.prisma`; generated client is used across controllers.
- `users.user_id` is a UUID string (CHAR(36)).
- `BigInt.prototype.toJSON` is patched in `server.js` so IDs serialize as strings.

### Database
- SQL schema: `database/happy_recipe.sql` (used by `npm run db:init`).
- Prisma seed: `prisma/seed.js` (triggered via `npx prisma db seed`).

### API documentation
- OpenAPI: `docs/openapi.yaml` (paste into https://editor.swagger.io/).
- Postman: `docs/postman_collection.json`.


