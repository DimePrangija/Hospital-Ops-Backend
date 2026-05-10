import fs from "fs";
import path from "path";
import { pool } from "./client";

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations/001_init.sql"),
    "utf-8"
  );
  try {
    await pool.query(sql);
    console.log("✅ Migration successful");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
