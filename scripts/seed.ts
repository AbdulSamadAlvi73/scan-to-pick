import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERROR: DATABASE_URL is not configured.");
    console.error("Please add your PostgreSQL connection string to .env.local.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    const seedPath = path.resolve(process.cwd(), "db", "seed.sql");
    const seedSql = fs.readFileSync(seedPath, "utf-8");

    console.log(" Resetting and seeding batch data from seed.sql...");
    await client.query(seedSql);
    console.log(" Batch reset successfully (Batch: BATCH-2026-001, 8 lines ready).");

    client.release();
    await pool.end();
  } catch (err: unknown) {
    console.error("❌ Failed to seed database:", err instanceof Error ? err.message : err);
    await pool.end();
    process.exit(1);
  }
}

seedDatabase();
