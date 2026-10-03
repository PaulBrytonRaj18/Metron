import * as SQLite from "expo-sqlite";
import { SCHEMA_SQL } from "./schema";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabaseAsync("metron.db");
  await initDatabase(dbInstance);
  return dbInstance;
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await db.execAsync(SCHEMA_SQL);
  } catch (error) {
    console.error("Failed to initialize SQLite database:", error);
    throw error;
  }
}
