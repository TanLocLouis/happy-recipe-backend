import "dotenv/config";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

async function run() {
  const sqlFilePath = path.resolve("database", "happy_recipe.sql");
  const sql = fs.readFileSync(sqlFilePath, "utf8");

  const {
    DB_HOST = "127.0.0.1",
    DB_USER,
    DB_PASSWORD,
    DB_PORT = "3306",
    DB_NAME = "happy_recipe",
  } = process.env;

  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: Number(DB_PORT),
    database: DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.query(sql);
    // eslint-disable-next-line no-console
    console.log("Database initialized successfully from happy_recipe.sql");
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to initialize database:", err.message);
  process.exit(1);
});
