/**
 * Metron SQLite Local Database Schema
 * Local-First durable persistence for all academic entities
 */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS semesters (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  semester_number INTEGER NOT NULL,
  department TEXT,
  programme TEXT,
  section TEXT,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY NOT NULL,
  semester_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Theory',
  credits REAL DEFAULT 3.0,
  color_accent TEXT DEFAULT '#CD202C',
  faculty_name TEXT,
  syllabus_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  FOREIGN KEY(semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  unit_number INTEGER DEFAULT 1,
  learning_progress_percent REAL DEFAULT 0.0,
  confidence_rating INTEGER DEFAULT 5,
  key_topics_json TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL,
  chapter_id TEXT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'not_started',
  max_marks REAL,
  obtained_marks REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  experiment_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  date_conducted TEXT,
  observation_status TEXT DEFAULT 'pending',
  record_status TEXT DEFAULT 'pending',
  marks REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  exam_type TEXT DEFAULT 'CAT1',
  exam_date TEXT NOT NULL,
  session TEXT DEFAULT 'FN',
  portions TEXT,
  max_marks REAL DEFAULT 50.0,
  obtained_marks REAL,
  target_marks REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date TEXT,
  subject_id TEXT,
  chapter_id TEXT,
  assignment_id TEXT,
  experiment_id TEXT,
  is_next_action INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject_id TEXT,
  chapter_id TEXT,
  duration_minutes INTEGER,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS academic_events (
  id TEXT PRIMARY KEY NOT NULL,
  semester_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  category TEXT DEFAULT 'instructional',
  is_official INTEGER DEFAULT 1,
  google_event_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  FOREIGN KEY(semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
