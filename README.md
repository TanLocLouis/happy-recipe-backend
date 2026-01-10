
# Happy Food Backend

> Express + Prisma + MySQL REST API for the Happy Food recipe sharing platform.

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | 18+     |
| MySQL       | 8+      |

---

## Quick Start

### 1. Configure Environment

Create/edit `.env` file with **required** keys:

```env
SERVER_URL=your_server_ip
DATABASE_URL=your_db_uri_string
```

**Optional** configuration:

```env
DB_NAME=happy_recipe
JWT_SECRET=supersecret_change_me
JWT_EXPIRES_IN=7d
VITE_MAIL=your.email@gmail.com
VITE_MAILTOKEN=your_gmail_app_password
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Initialize Database

Push schema to MySQL server:

```bash
npx prisma db push
```

Generate Prisma client:

```bash
npx prisma generate
```

### 4. Seed Sample Data

Populate with users, posts, comments, reactions, and bookmarks:

```bash
npx prisma db seed
```

> 💡 **Tip:** To reset/drop all data, run:
> ```bash
> node ./prisma/reset.js
> ```

### 5. Start the Server

```bash
npm run dev
```

---

## Data & Prisma

| Item | Description |
|------|-------------|
| Schema | `prisma/schema.prisma` |
| User ID | UUID string (`CHAR(36)`) |
| BigInt | Patched in `server.js` to serialize as strings |

---

## Database Files

| File | Purpose |
|------|---------|
| `database/happy_recipe.sql` | SQL schema (used by `npm run db:init`) |
| `prisma/seed.js` | Seed script (via `npx prisma db seed`) |
| `prisma/reset.js` | Reset/clear all data |

---

## API Documentation

| Format | Location |
|--------|----------|
| OpenAPI | [`docs/openapi.yaml`](docs/openapi.yaml) → [Swagger Editor](https://editor.swagger.io/) |
| Postman | [`docs/postman_collection.json`](docs/postman_collection.json) |

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── seed.js          # Seed data script
│   └── reset.js         # Reset database script
├── src/
│   ├── config/          # DB & Prisma config
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, validation, uploads
│   ├── routes/          # API route definitions
│   ├── services/        # Email & external services
│   ├── utils/           # JWT, password, AI helpers
│   └── server.js        # Express app entry
├── docs/                # API documentation
├── database/            # SQL scripts
└── uploads/             # User uploaded files
```

