
## Happy Food Backend (Auth + MySQL)

### Prerequisites
- Node.js 18+
- MySQL 8+

### Setup
1. Create a `.env` in the project root:

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=happy_recipe
JWT_SECRET=supersecret_change_me
JWT_EXPIRES_IN=7d
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

### Notes
- Schema is defined in `database/happy_recipe.sql`.
- DB init script: `scripts/init-db.js` (runs the SQL file).

### API Documentation
- OpenAPI spec: `docs/openapi.yaml`
  - View via Swagger Editor: open `https://editor.swagger.io/` and paste the YAML
- Postman collection: `docs/postman_collection.json`
  - Import into Postman to test endpoints


