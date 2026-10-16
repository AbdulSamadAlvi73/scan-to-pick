import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

// Load local environment files if present
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function setupDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERROR: DATABASE_URL is not configured.");
    console.error("Please add your PostgreSQL connection string to .env.local, for example:");
    console.error('DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"');
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL...");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log(" Connected to PostgreSQL database successfully.");

    // Read and run schema.sql
    const schemaPath = path.resolve(process.cwd(), "db", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    console.log(" Executing schema.sql...");
    await client.query(schemaSql);
    console.log(" Schema applied successfully.");

    // Read and run seed.sql
    const seedPath = path.resolve(process.cwd(), "db", "seed.sql");
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    console.log(" Executing seed.sql...");
    await client.query(seedSql);
    console.log(" Seed data inserted successfully (1 batch, 8 lines, alternative stock locations).");

    client.release();
    await pool.end();
    console.log(" Database setup completed successfully.");
  } catch (err: unknown) {
    console.error("❌ Failed to setup database:", err instanceof Error ? err.message : err);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
