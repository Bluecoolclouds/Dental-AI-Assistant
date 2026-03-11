// server/migrate.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool);
console.log("Running database migrations...");
await migrate(db, { migrationsFolder: "./migrations" });
console.log("Migrations applied successfully");
await pool.end();
process.exit(0);
