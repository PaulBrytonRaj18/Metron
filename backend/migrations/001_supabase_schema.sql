-- ==============================================================================
-- Metron Supabase Database Schema & Row-Level Security (Phase 9)
-- Production PostgreSQL 15+ Migration with Granular RLS Policies
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Base Entity Tables
-- ==============================================================================

-- Semesters / Terms
CREATE TABLE IF NOT EXISTS semesters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    semester_number INTEGER NOT NULL,
    department TEXT,
    programme TEXT,
    section TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Academic Subjects (Theory, Lab, Hybrid)
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    code TEXT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Theory',
    credits NUMERIC(4, 2) DEFAULT 3.0,
    color_accent TEXT DEFAULT '#CD202C',
    faculty_name TEXT,
    syllabus_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subject Chapters / Units with Learning Progress & Confidence
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    unit_number INTEGER DEFAULT 1,
    learning_progress_percent NUMERIC(5, 2) DEFAULT 0.0,
    confidence_rating INTEGER DEFAULT 5 CHECK (confidence_rating >= 1 AND confidence_rating <= 10),
    key_topics_json JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chapter Assignments (5-stage lifecycle)
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT DEFAULT 'not_started',
    max_marks NUMERIC(5, 2),
    obtained_marks NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Laboratory Experiments (Dual-track Observation & Record)
CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    experiment_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    date_conducted DATE,
    observation_status TEXT DEFAULT 'pending',
    record_status TEXT DEFAULT 'pending',
    marks NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessment Exams & Internal Tests
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    exam_type TEXT DEFAULT 'CAT1',
    exam_date DATE NOT NULL,
    session TEXT DEFAULT 'FN',
    portions TEXT,
    max_marks NUMERIC(5, 2) DEFAULT 50.0,
    obtained_marks NUMERIC(5, 2),
    target_marks NUMERIC(5, 2),
    google_event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unified Action Board Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_date TIMESTAMPTZ,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
    assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
    experiment_id TEXT REFERENCES experiments(id) ON DELETE SET NULL,
    is_next_action BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retrospective Activity History Logs
CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
    duration_minutes INTEGER,
    logged_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Academic Calendar Milestones & Instructional Events
CREATE TABLE IF NOT EXISTS academic_events (
    id TEXT PRIMARY KEY,
    semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    category TEXT DEFAULT 'instructional',
    is_official BOOLEAN DEFAULT TRUE,
    google_event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cloud Sync Mutation & Audit Log
CREATE TABLE IF NOT EXISTS sync_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload JSONB NOT NULL,
    client_updated_at TIMESTAMPTZ NOT NULL,
    server_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. Indexes for Optimized Query Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_semesters_user ON semesters(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_sem ON subjects(user_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user_subj ON chapters(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_subj ON assignments(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_experiments_user_subj ON experiments(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_user_subj ON exams(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_history_user_logged ON history(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_academic_events_user_sem ON academic_events(user_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_sync_audit_user ON sync_audit_log(user_id, server_synced_at DESC);

-- ==============================================================================
-- 4. Supabase Row-Level Security (RLS) Policies
-- Enforces absolute tenant isolation (auth.uid() = user_id)
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_audit_log ENABLE ROW LEVEL SECURITY;

-- Semesters Policies
CREATE POLICY "Users can only select their own semesters"
    ON semesters FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only insert their own semesters"
    ON semesters FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can only update their own semesters"
    ON semesters FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can only delete their own semesters"
    ON semesters FOR DELETE
    USING (auth.uid()::text = user_id);

-- Subjects Policies
CREATE POLICY "Users can manage own subjects"
    ON subjects FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Chapters Policies
CREATE POLICY "Users can manage own chapters"
    ON chapters FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Assignments Policies
CREATE POLICY "Users can manage own assignments"
    ON assignments FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Experiments Policies
CREATE POLICY "Users can manage own experiments"
    ON experiments FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Exams Policies
CREATE POLICY "Users can manage own exams"
    ON exams FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Tasks Policies
CREATE POLICY "Users can manage own tasks"
    ON tasks FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- History Policies
CREATE POLICY "Users can manage own history"
    ON history FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Academic Events Policies
CREATE POLICY "Users can manage own academic events"
    ON academic_events FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Sync Audit Log Policies
CREATE POLICY "Users can view and write own sync audit logs"
    ON sync_audit_log FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
