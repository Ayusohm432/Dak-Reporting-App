
import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Database schema version.
 *
 * Increase this number when you introduce future schema migrations.
 */
const DATABASE_VERSION = 1;

/**
 * Creates the database tables and indexes.
 *
 * This function is called automatically when SQLiteProvider
 * initializes the database.
 */
export async function initializeDatabase(
  db: SQLiteDatabase
): Promise<void> {
  // Enable foreign key enforcement for future related tables.
  await db.execAsync("PRAGMA foreign_keys = ON;");

  // Create the reports table if it does not exist.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY NOT NULL,

      reporting_month TEXT NOT NULL,
      reporting_period TEXT NOT NULL,

      district TEXT NOT NULL,
      block TEXT NOT NULL,
      coordinator_name TEXT NOT NULL,

      status TEXT NOT NULL
        CHECK (status IN ('draft', 'completed')),

      data_json TEXT NOT NULL,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Speeds up filtering by reporting month.
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS
      idx_reports_reporting_month
    ON reports (reporting_month);
  `);

  // Speeds up filtering reports by month and block.
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS
      idx_reports_month_block
    ON reports (reporting_month, block);
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY NOT NULL,
      full_name TEXT NOT NULL,
      designation TEXT NOT NULL,
      mobile TEXT NOT NULL,
      block TEXT NOT NULL,
      district TEXT NOT NULL,
      organization TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Read the current database schema version.
  const result = await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version;");

  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < DATABASE_VERSION) {
    await db.execAsync(
      `PRAGMA user_version = ${DATABASE_VERSION};`
    );
  }
}
