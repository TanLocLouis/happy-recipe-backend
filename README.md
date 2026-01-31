
# Happy Food Backend

- This is backend for happy-recipe project.
- Use `Express` + `Prisma` + `MySQL` REST API.

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


