
## Happy Food Backend (Auth + MySQL)

### Prerequisites
- Node.js 18+
- MySQL 8+

### Setup
1. Create a `.env` in the project root:

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

2. Install dependencies:
```
npm install
```

3. Initialize the database (creates `happy_recipe` and tables):
```
npm run db:init
```

4. Start the server:
```
npm run dev
```

### API
- POST `/api/auth/signup`
  - body: `{ "username": "name", "email": "you@example.com", "password": "password", "displayName": "optional" }`
  - returns: `{ user, token }`

- POST `/api/auth/login`
  - body: `{ "emailOrUsername": "you@example.com", "password": "password" }`
  - returns: `{ user, token }`

- POST `/api/auth/token`
  - description: Exchange a valid refresh token for a new short-lived access token.
  - body (JSON): `{ "refreshToken": "<refresh-token>" }` (optional if you provide the token in the Authorization header)
  - header option: `Authorization: Bearer <refresh-token>`
  - returns: `{ "accessToken": "<new-access-token>" }`
  - notes: Refresh tokens should be JWTs signed with the server secret. If your refresh tokens include a `type` claim, ensure it's set to `"refresh"` when issuing refresh tokens.

### Notes
- Schema is defined in `database/happy_recipe.sql`.
- DB init script: `scripts/init-db.js` (runs the SQL file).

Additional notes
- The backend uses UUID strings for `users.user_id` (CHAR(36)) instead of numeric auto-increment ids. The SQL in `database/happy_recipe.sql` has been updated accordingly.
- A `2fa` table is included in the SQL to support server-side two-factor authentication flows. The table stores `user_id` (CHAR(36)), `temp_token`, `code`, and `expires_at`.
- Environment variables `VITE_MAIL` and `VITE_MAILTOKEN` are required for sending verification emails. For Gmail, generate an App Password and set it as `VITE_MAILTOKEN`.

### API Documentation
- OpenAPI spec: `docs/openapi.yaml`
  - View via Swagger Editor: open `https://editor.swagger.io/` and paste the YAML
- Postman collection: `docs/postman_collection.json`
  - Import into Postman to test endpoints


