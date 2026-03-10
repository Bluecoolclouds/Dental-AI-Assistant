import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "toothy.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await initializeSchema(db);
  return db;
}

async function initializeSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      age INTEGER,
      brushing_frequency TEXT,
      uses_floss INTEGER DEFAULT 0,
      uses_irrigator INTEGER DEFAULT 0,
      has_braces INTEGER DEFAULT 0,
      has_sensitivity INTEGER DEFAULT 0,
      has_gum_bleeding INTEGER DEFAULT 0,
      has_crowns_veneers INTEGER DEFAULT 0,
      has_removable_dentures INTEGER DEFAULT 0,
      has_implants INTEGER DEFAULT 0,
      onboarding_completed INTEGER DEFAULT 0,
      disclaimer_accepted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS tooth_data (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tooth_number INTEGER NOT NULL,
      problems TEXT DEFAULT '[]',
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, tooth_number)
    );
    
    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      teeth_risk_score INTEGER NOT NULL,
      gums_risk_score INTEGER NOT NULL,
      overall_risk_level TEXT NOT NULL,
      recommendations TEXT DEFAULT '[]',
      ai_recommendations TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'routine',
      related_teeth TEXT DEFAULT '[]',
      is_read INTEGER DEFAULT 0,
      is_dismissed INTEGER DEFAULT 0,
      due_time TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS tooth_history (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tooth_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      priority TEXT DEFAULT 'routine',
      mark_for_check INTEGER DEFAULT 0,
      source TEXT DEFAULT 'user',
      doctor_name TEXT,
      clinic_name TEXT,
      treatment_details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS tooth_files (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER,
      description TEXT,
      ai_description TEXT,
      related_teeth TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      type TEXT NOT NULL DEFAULT 'appointment',
      source TEXT NOT NULL DEFAULT 'user',
      description TEXT,
      related_teeth TEXT DEFAULT '[]',
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const migrations = [
    `ALTER TABLE user_profiles ADD COLUMN display_name TEXT`,
    `ALTER TABLE user_profiles ADD COLUMN birth_date TEXT`,
    `ALTER TABLE user_profiles ADD COLUMN gender TEXT`,
    `ALTER TABLE user_profiles ADD COLUMN goals TEXT`,
  ];
  for (const sql of migrations) {
    try {
      await database.runAsync(sql);
    } catch {
    }
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export async function clearAllData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM tooth_files;
    DELETE FROM tooth_history;
    DELETE FROM alerts;
    DELETE FROM feedback;
    DELETE FROM test_results;
    DELETE FROM tooth_data;
    DELETE FROM user_profiles;
    DELETE FROM users;
  `);
}
