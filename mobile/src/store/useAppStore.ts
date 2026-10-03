import { create } from "zustand";
import { getDatabase } from "../data/sqlite/database";
import { notifications } from "../services/notifications";
import { normalizeCourseCategory } from "../features/marks/marksEngine";

export interface Semester {
  id: string;
  title: string;
  academic_year: string;
  semester_number: number;
  department?: string;
  programme?: string;
  section?: string;
  start_date?: string;
  end_date?: string;
  is_active: number;
}

export interface Subject {
  id: string;
  semester_id: string;
  code?: string;
  name: string;
  category:
    | "Theory"
    | "THEORY COURSES"
    | "Laboratory"
    | "LABORATORY COURSES"
    | "Laboratory Oriented Theory"
    | "LABORATORY ORIENTED THEORY COURSE"
    | "Industry Oriented"
    | "INDUSTRY ORIENTED COURSE"
    | "Hybrid"
    | string;
  credits: number;
  color_accent: string;
  faculty_name?: string;
  learning_progress_percent?: number;
  task_progress_percent?: number;
  average_confidence?: number;
  completed_units_count?: number;
  total_units_count?: number;
  pending_assignments_count?: number;
  pending_records_count?: number;
}

export interface KeyTopic {
  id: string;
  text: string;
  completed: boolean;
}

export interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  unit_number: number;
  learning_progress_percent: number;
  confidence_rating: number; // 1 to 10
  key_topics: KeyTopic[];
  notes?: string;
}

export type AssignmentStatus =
  | "NOT_FINISHED"
  | "COMPLETED"
  | "SUBMITTED_HAND"
  | "SUBMITTED_MOODLE"
  | "GRADED";

export interface Assignment {
  id: string;
  subject_id: string;
  chapter_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  status: AssignmentStatus;
  max_marks?: number;
  obtained_marks?: number;
}

export type ObservationStatus = "PENDING" | "COMPLETED" | "SIGNED";
export type RecordStatus = "PENDING" | "WRITTEN" | "SUBMITTED" | "APPROVED";

export interface Experiment {
  id: string;
  subject_id: string;
  experiment_number: number;
  title: string;
  date_conducted?: string;
  observation_status: ObservationStatus;
  record_status: RecordStatus;
  marks?: number;
  max_marks?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "completed";
  due_date?: string;
  subject_id?: string;
  chapter_id?: string;
  assignment_id?: string;
  experiment_id?: string;
  is_next_action: boolean;
  task_type?: "standalone" | "assignment" | "observation" | "record";
}

export interface HistoryItem {
  id: string;
  action_type:
    | "assignment_submitted"
    | "assignment_graded"
    | "observation_signed"
    | "record_approved"
    | "study_session"
    | "task_completed";
  title: string;
  description?: string;
  subject_id?: string;
  duration_minutes?: number;
  logged_at: string;
}

export interface AcademicEvent {
  id: string;
  semester_id: string;
  title: string;
  start_date: string;
  end_date?: string;
  category: string;
  google_event_id?: string;
}

export interface Exam {
  id: string;
  subject_id: string;
  title: string;
  exam_type: "CAT1" | "CAT2" | "CAT3" | "SemesterFinal" | "Model" | "Lab";
  exam_date: string;
  session?: "FN" | "AN" | "Morning" | "Afternoon";
  portions?: string;
  max_marks: number;
  obtained_marks?: number;
  target_marks?: number;
  programme?: string;
  section?: string;
  subject_name?: string;
  subject_code?: string;
  subject_color?: string;
  google_event_id?: string;
}

interface AppState {
  isInitialized: boolean;
  activeSemester: Semester | null;
  semesters: Semester[];
  subjects: Subject[];
  chapters: Record<string, Chapter[]>; // subject_id -> chapters
  assignments: Record<string, Assignment[]>; // subject_id -> assignments
  allAssignments: Assignment[];
  experiments: Record<string, Experiment[]>; // subject_id -> experiments
  allExperiments: Experiment[];
  tasks: Task[];
  historyLogs: HistoryItem[];
  academicEvents: AcademicEvent[];
  exams: Exam[];
  
  // Semester Actions
  initialize: () => Promise<void>;
  createSemester: (sem: Omit<Semester, "id" | "is_active">) => Promise<string>;
  setActiveSemester: (semesterId: string) => Promise<void>;
  deleteSemester: (semesterId: string) => Promise<void>;
  loadSemesterData: (semesterId: string) => Promise<void>;

  // Subject Actions
  createSubject: (subject: Omit<Subject, "id">) => Promise<string>;
  updateSubject: (subjectId: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;

  // Chapter Actions
  createChapter: (chapter: {
    subject_id: string;
    title: string;
    unit_number: number;
    learning_progress_percent?: number;
    confidence_rating?: number;
    notes?: string;
  }) => Promise<string>;
  updateChapterProgress: (chapterId: string, progress: number, confidence: number) => Promise<void>;
  updateChapterNotes: (chapterId: string, notes: string) => Promise<void>;
  addChapterKeyTopic: (chapterId: string, topicText: string) => Promise<void>;
  toggleChapterKeyTopic: (chapterId: string, topicId: string) => Promise<void>;
  deleteChapterKeyTopic: (chapterId: string, topicId: string) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;

  // Phase 3: Assignment Actions
  createAssignment: (asgn: {
    subject_id: string;
    title: string;
    due_date?: string;
    chapter_id?: string;
    description?: string;
    max_marks?: number;
  }) => Promise<string>;
  updateAssignmentStatus: (
    assignmentId: string,
    status: AssignmentStatus,
    obtainedMarks?: number
  ) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;

  // Phase 3: Laboratory Experiment Actions
  createExperiment: (exp: {
    subject_id: string;
    experiment_number: number;
    title: string;
    date_conducted?: string;
    max_marks?: number;
  }) => Promise<string>;
  updateExperimentObservation: (
    experimentId: string,
    status: ObservationStatus
  ) => Promise<void>;
  updateExperimentRecord: (
    experimentId: string,
    status: RecordStatus,
    marks?: number
  ) => Promise<void>;
  deleteExperiment: (experimentId: string) => Promise<void>;

  // Phase 3: Unified Task Actions
  createTask: (task: Omit<Task, "id">) => Promise<string>;
  toggleTaskStatus: (taskId: string) => Promise<void>;
  setTaskNextAction: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Phase 3: History Actions
  logStudySession: (title: string, durationMinutes: number, description?: string) => Promise<void>;
  loadHistoryLogs: () => Promise<void>;

  // Calendar
  addAcademicEvent: (event: Omit<AcademicEvent, "id">) => Promise<string>;

  // Phase 4: Document Intelligence Batch Import & Sync Queue
  importAcademicExtraction: (params: {
    semesterId: string;
    events: Array<{ title: string; date: string; category: string; description?: string }>;
    subjects: Array<{ code?: string; name: string; category?: string; credits?: number; faculty?: string }>;
    exams: Array<{ subject_name: string; subject_code?: string; exam_type: string; exam_date: string; session?: string; section?: string }>;
  }) => Promise<{ eventsCount: number; subjectsCount: number; examsCount: number }>;

  // Phase 5: Exam Actions
  createExam: (exam: Omit<Exam, "id">) => Promise<string>;
  updateExam: (examId: string, updates: Partial<Exam>) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
}

function parseTopics(raw: any): KeyTopic[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => {
        if (typeof item === "string") {
          return { id: `top_${idx}_${Date.now()}`, text: item, completed: false };
        }
        return {
          id: item.id || `top_${idx}`,
          text: item.text || "",
          completed: Boolean(item.completed),
        };
      });
    }
  } catch {
    return [];
  }
  return [];
}

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  activeSemester: null,
  semesters: [],
  subjects: [],
  chapters: {},
  assignments: {},
  allAssignments: [],
  experiments: {},
  allExperiments: [],
  tasks: [],
  historyLogs: [],
  academicEvents: [],
  exams: [],

  initialize: async () => {
    try {
      const db = await getDatabase();
      const sems = await db.getAllAsync<Semester>(
        "SELECT * FROM semesters ORDER BY is_active DESC, semester_number DESC;"
      );

      let active = sems.find((s) => s.is_active === 1) || sems[0] || null;

      // Seed demonstration semester if empty
      if (!active) {
        const id = `sem_${Date.now()}`;
        const now = new Date().toISOString();
        await db.runAsync(
          `INSERT INTO semesters (id, user_id, title, academic_year, semester_number, department, programme, section, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
          [
            id,
            "local_user",
            "Semester 5 (Fall 2026)",
            "2026-2027",
            5,
            "Computer Science & Engineering",
            "B.Tech CSE",
            "A",
            now,
            now,
          ]
        );

        active = {
          id,
          title: "Semester 5 (Fall 2026)",
          academic_year: "2026-2027",
          semester_number: 5,
          department: "Computer Science & Engineering",
          programme: "B.Tech CSE",
          section: "A",
          is_active: 1,
        };

        const dsId = `subj_ds_${Date.now()}`;
        const mathId = `subj_math_${Date.now()}`;
        const ecId = `subj_ec_${Date.now()}`;
        const dslabId = `subj_dslab_${Date.now()}`;
        const dtId = `subj_dt_${Date.now()}`;

        await db.runAsync(
          `INSERT INTO subjects (id, semester_id, user_id, code, name, category, credits, color_accent, faculty_name, created_at, updated_at)
           VALUES 
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            dsId, id, "local_user", "CS23311", "Data Structures", "THEORY COURSES", 3.0, "#CD202C", "Dr. Sarah Adams", now, now,
            mathId, id, "local_user", "MA23311", "Discrete Mathematics", "THEORY COURSES", 4.0, "#3B82F6", "Prof. K. Ramesh", now, now,
            ecId, id, "local_user", "EC23331", "Digital Principles and Computer Organization", "LABORATORY ORIENTED THEORY COURSE", 4.0, "#F59E0B", "Dr. A. Venkatesh", now, now,
            dslabId, id, "local_user", "CS23321", "Data Structures Laboratory", "LABORATORY COURSES", 1.0, "#10B981", "Dr. Sarah Adams", now, now,
            dtId, id, "local_user", "CS23IC1", "Design Thinking for Software Engineers", "INDUSTRY ORIENTED COURSE", 1.0, "#8B5CF6", "Industry Mentor", now, now,
          ]
        );

        const ch1Id = `ch_1_${Date.now()}`;
        const ch2Id = `ch_2_${Date.now()}`;

        const sampleTopics1 = JSON.stringify([
          { id: "top_1", text: "Process Control Block & Context Switching", completed: true },
          { id: "top_2", text: "Producer-Consumer with Semaphores", completed: true },
          { id: "top_3", text: "Banker's Deadlock Avoidance Algorithm", completed: false },
        ]);

        const sampleTopics2 = JSON.stringify([
          { id: "top_4", text: "Paging & Segmentation Architecture", completed: false },
          { id: "top_5", text: "Page Replacement (FIFO, LRU, Optimal)", completed: false },
        ]);

        await db.runAsync(
          `INSERT INTO chapters (id, subject_id, user_id, title, unit_number, learning_progress_percent, confidence_rating, key_topics_json, notes, created_at, updated_at)
           VALUES 
           (?, ?, ?, ?, 1, 75.0, 8, ?, ?, ?, ?),
           (?, ?, ?, ?, 2, 40.0, 4, ?, ?, ?, ?);`,
          [
            ch1Id, dsId, "local_user", "Unit 1: Process Synchronization & Deadlocks", sampleTopics1, "Key formula: Banker's Need = Max - Allocation.", now, now,
            ch2Id, dsId, "local_user", "Unit 2: Memory Management & Virtual Memory", sampleTopics2, "Review page replacement frame count and FIFO anomaly.", now, now,
          ]
        );

        // Phase 3 Seed: Sample Assignments
        const asgn1Id = `asgn_1_${Date.now()}`;
        const asgn2Id = `asgn_2_${Date.now()}`;
        await db.runAsync(
          `INSERT INTO assignments (id, subject_id, chapter_id, user_id, title, description, due_date, status, max_marks, obtained_marks, created_at, updated_at)
           VALUES 
           (?, ?, ?, ?, 'Deadlock Avoidance Simulation Problem Set', 'Solve 5-process allocation matrices using Banker Algorithm', '2026-10-10', 'COMPLETED', 10.0, NULL, ?, ?),
           (?, ?, ?, ?, 'Page Replacement Comparison Report', 'Compare FIFO vs LRU across 12-page reference strings', '2026-10-18', 'NOT_FINISHED', 10.0, NULL, ?, ?);`,
          [
            asgn1Id, dsId, ch1Id, "local_user", now, now,
            asgn2Id, dsId, ch2Id, "local_user", now, now,
          ]
        );

        // Phase 3 Seed: Sample Laboratory Experiments
        await db.runAsync(
          `INSERT INTO experiments (id, subject_id, user_id, experiment_number, title, date_conducted, observation_status, record_status, marks, created_at, updated_at)
           VALUES 
           (?, ?, ?, 1, 'Process Creation using fork() and exec() System Calls', '2026-08-20', 'SIGNED', 'APPROVED', 9.5, ?, ?),
           (?, ?, ?, 2, 'CPU Scheduling - FCFS and SJF Implementations', '2026-09-02', 'SIGNED', 'WRITTEN', NULL, ?, ?),
           (?, ?, ?, 3, 'Inter-Process Communication using Shared Memory', '2026-09-18', 'COMPLETED', 'PENDING', NULL, ?, ?),
           (?, ?, ?, 4, 'Dining Philosophers Problem with Semaphores', '2026-10-02', 'PENDING', 'PENDING', NULL, ?, ?);`,
          [
            `exp_1_${Date.now()}`, dslabId, "local_user", now, now,
            `exp_2_${Date.now()}`, dslabId, "local_user", now, now,
            `exp_3_${Date.now()}`, dslabId, "local_user", now, now,
            `exp_4_${Date.now()}`, dslabId, "local_user", now, now,
          ]
        );

        // Phase 3 Seed: Sample Primary Next Action Task
        await db.runAsync(
          `INSERT INTO tasks (id, user_id, title, description, priority, status, subject_id, assignment_id, is_next_action, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'urgent', 'pending', ?, ?, 1, ?, ?);`,
          [
            `task_${Date.now()}`,
            "local_user",
            "Submit Deadlock Simulation Assignment on Moodle",
            "Assignment 1 solved; turn in PDF before deadline",
            dsId,
            asgn1Id,
            now,
            now,
          ]
        );

        // Phase 3 Seed: Sample History Log
        await db.runAsync(
          `INSERT INTO history (id, user_id, action_type, title, description, subject_id, duration_minutes, logged_at, created_at, updated_at)
           VALUES (?, ?, 'record_approved', 'Lab Record 1 Approved', 'fork() and exec() syscall record signed by instructor', ?, 45, ?, ?, ?);`,
          [`hist_1_${Date.now()}`, "local_user", dslabId, now, now, now]
        );

        await db.runAsync(
          `INSERT INTO academic_events (id, semester_id, user_id, title, start_date, category, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            `ev_${Date.now()}`,
            id,
            "local_user",
            "Continuous Assessment Test 1 (CAT-1)",
            "2026-10-15",
            "cat_exam",
            now,
            now,
          ]
        );
      }

      set({ isInitialized: true, activeSemester: active, semesters: sems.length ? sems : [active] });
      if (active) {
        await get().loadSemesterData(active.id);
      }
    } catch (e) {
      console.error("Initialization error:", e);
      set({ isInitialized: true });
    }
  },

  loadSemesterData: async (semesterId: string) => {
    try {
      const db = await getDatabase();
      const sems = await db.getAllAsync<Semester>(
        "SELECT * FROM semesters ORDER BY is_active DESC, semester_number DESC;"
      );

      const subjects = await db.getAllAsync<Subject>(
        "SELECT * FROM subjects WHERE semester_id = ? ORDER BY name ASC;",
        [semesterId]
      );

      const chaptersMap: Record<string, Chapter[]> = {};
      const assignmentsMap: Record<string, Assignment[]> = {};
      const experimentsMap: Record<string, Experiment[]> = {};
      const allAsgns: Assignment[] = [];
      const allExps: Experiment[] = [];
      const updatedSubjects: Subject[] = [];

      for (const subj of subjects) {
        // Chapters
        const rawChaps = await db.getAllAsync<any>(
          "SELECT * FROM chapters WHERE subject_id = ? ORDER BY unit_number ASC;",
          [subj.id]
        );
        const mappedChaps: Chapter[] = rawChaps.map((rc) => ({
          id: rc.id,
          subject_id: rc.subject_id,
          title: rc.title,
          unit_number: rc.unit_number,
          learning_progress_percent: rc.learning_progress_percent || 0,
          confidence_rating: rc.confidence_rating || 5,
          key_topics: parseTopics(rc.key_topics_json),
          notes: rc.notes || undefined,
        }));
        chaptersMap[subj.id] = mappedChaps;

        // Assignments
        const rawAsgns = await db.getAllAsync<Assignment>(
          "SELECT * FROM assignments WHERE subject_id = ? ORDER BY due_date ASC, created_at DESC;",
          [subj.id]
        );
        assignmentsMap[subj.id] = rawAsgns;
        allAsgns.push(...rawAsgns);

        // Experiments
        const rawExps = await db.getAllAsync<Experiment>(
          "SELECT * FROM experiments WHERE subject_id = ? ORDER BY experiment_number ASC;",
          [subj.id]
        );
        experimentsMap[subj.id] = rawExps;
        allExps.push(...rawExps);

        // MANUAL Learning Progress calculation
        const avgLearn = mappedChaps.length
          ? mappedChaps.reduce((acc, c) => acc + c.learning_progress_percent, 0) / mappedChaps.length
          : 0;
        const avgConf = mappedChaps.length
          ? mappedChaps.reduce((acc, c) => acc + c.confidence_rating, 0) / mappedChaps.length
          : 0;
        const completedUnits = mappedChaps.filter((c) => c.learning_progress_percent >= 100).length;

        // AUTOMATIC Task Progress calculation (TAD 8.1)
        let taskProgress = 0;
        let pendingAsgns = 0;
        let pendingRecs = 0;

        const normCat = normalizeCourseCategory(subj.category);
        if (normCat === "THEORY COURSES" || normCat === "INDUSTRY ORIENTED COURSE") {
          const totalAsgns = rawAsgns.length;
          const completedAsgns = rawAsgns.filter((a) =>
            ["SUBMITTED_HAND", "SUBMITTED_MOODLE", "GRADED"].includes(a.status)
          ).length;
          pendingAsgns = rawAsgns.filter(
            (a) => !["SUBMITTED_HAND", "SUBMITTED_MOODLE", "GRADED"].includes(a.status)
          ).length;
          taskProgress = totalAsgns > 0 ? Math.round((completedAsgns / totalAsgns) * 100) : 0;
        } else if (normCat === "LABORATORY COURSES") {
          const totalExpUnits = rawExps.length * 2; // Obs + Record
          const completedObs = rawExps.filter((e) => e.observation_status === "SIGNED").length;
          const completedRec = rawExps.filter((e) => e.record_status === "APPROVED").length;
          pendingRecs = rawExps.filter((e) => e.record_status !== "APPROVED").length;
          taskProgress =
            totalExpUnits > 0
              ? Math.round(((completedObs + completedRec) / totalExpUnits) * 100)
              : 0;
        } else if (normCat === "LABORATORY ORIENTED THEORY COURSE") {
          const totalUnits = rawAsgns.length + rawExps.length * 2;
          const completedAsgns = rawAsgns.filter((a) =>
            ["SUBMITTED_HAND", "SUBMITTED_MOODLE", "GRADED"].includes(a.status)
          ).length;
          pendingAsgns = rawAsgns.filter(
            (a) => !["SUBMITTED_HAND", "SUBMITTED_MOODLE", "GRADED"].includes(a.status)
          ).length;
          const completedObs = rawExps.filter((e) => e.observation_status === "SIGNED").length;
          const completedRec = rawExps.filter((e) => e.record_status === "APPROVED").length;
          pendingRecs = rawExps.filter((e) => e.record_status !== "APPROVED").length;
          taskProgress =
            totalUnits > 0
              ? Math.round(((completedAsgns + completedObs + completedRec) / totalUnits) * 100)
              : 0;
        }

        updatedSubjects.push({
          ...subj,
          learning_progress_percent: Math.round(avgLearn),
          average_confidence: Math.round(avgConf * 10) / 10,
          completed_units_count: completedUnits,
          total_units_count: mappedChaps.length,
          task_progress_percent: taskProgress,
          pending_assignments_count: pendingAsgns,
          pending_records_count: pendingRecs,
        });
      }

      // Standalone & Unified Tasks
      const tasks = await db.getAllAsync<any>(
        "SELECT * FROM tasks ORDER BY is_next_action DESC, created_at DESC;"
      );
      const mappedTasks: Task[] = tasks.map((t) => ({
        ...t,
        is_next_action: Boolean(t.is_next_action),
      }));

      // History Logs
      const rawHistory = await db.getAllAsync<HistoryItem>(
        "SELECT * FROM history ORDER BY logged_at DESC LIMIT 50;"
      );

      const events = await db.getAllAsync<AcademicEvent>(
        "SELECT * FROM academic_events WHERE semester_id = ? ORDER BY start_date ASC;",
        [semesterId]
      );

      const rawExams = await db.getAllAsync<Exam>(
        `SELECT e.*, s.name as subject_name, s.code as subject_code, s.color_accent as subject_color
         FROM exams e
         LEFT JOIN subjects s ON e.subject_id = s.id
         WHERE s.semester_id = ?
         ORDER BY e.exam_date ASC;`,
        [semesterId]
      );

      set({
        semesters: sems,
        subjects: updatedSubjects,
        chapters: chaptersMap,
        assignments: assignmentsMap,
        allAssignments: allAsgns,
        experiments: experimentsMap,
        allExperiments: allExps,
        tasks: mappedTasks,
        historyLogs: rawHistory,
        academicEvents: events,
        exams: rawExams,
      });
    } catch (e) {
      console.error("Error loading semester data:", e);
    }
  },

  createSemester: async (sem) => {
    const db = await getDatabase();
    const id = `sem_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync("UPDATE semesters SET is_active = 0;");
    await db.runAsync(
      `INSERT INTO semesters (id, user_id, title, academic_year, semester_number, department, programme, section, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [
        id,
        "local_user",
        sem.title,
        sem.academic_year,
        sem.semester_number,
        sem.department || null,
        sem.programme || null,
        sem.section || null,
        now,
        now,
      ]
    );
    const newSem: Semester = { id, ...sem, is_active: 1 };
    set((state) => ({
      semesters: [newSem, ...state.semesters.map((s) => ({ ...s, is_active: 0 }))],
      activeSemester: newSem,
    }));
    await get().loadSemesterData(id);
    return id;
  },

  setActiveSemester: async (semesterId) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE semesters SET is_active = 0;");
    await db.runAsync("UPDATE semesters SET is_active = 1 WHERE id = ?;", [semesterId]);
    const sem = get().semesters.find((s) => s.id === semesterId);
    if (sem) {
      set({
        activeSemester: { ...sem, is_active: 1 },
        semesters: get().semesters.map((s) => ({ ...s, is_active: s.id === semesterId ? 1 : 0 })),
      });
      await get().loadSemesterData(semesterId);
    }
  },

  deleteSemester: async (semesterId) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM semesters WHERE id = ?;", [semesterId]);
    const remaining = get().semesters.filter((s) => s.id !== semesterId);
    const nextActive = remaining[0] || null;
    if (nextActive) {
      await db.runAsync("UPDATE semesters SET is_active = 1 WHERE id = ?;", [nextActive.id]);
    }
    set({
      semesters: remaining,
      activeSemester: nextActive,
    });
    if (nextActive) {
      await get().loadSemesterData(nextActive.id);
    }
  },

  createSubject: async (subject) => {
    const db = await getDatabase();
    const id = `subj_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO subjects (id, semester_id, user_id, code, name, category, credits, color_accent, faculty_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        subject.semester_id,
        "local_user",
        subject.code || null,
        subject.name,
        subject.category,
        subject.credits,
        subject.color_accent,
        subject.faculty_name || null,
        now,
        now,
      ]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
    return id;
  },

  updateSubject: async (subjectId, updates) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const subj = get().subjects.find((s) => s.id === subjectId);
    if (!subj) return;

    await db.runAsync(
      `UPDATE subjects 
       SET code = ?, name = ?, category = ?, credits = ?, color_accent = ?, faculty_name = ?, updated_at = ?
       WHERE id = ?;`,
      [
        updates.code !== undefined ? updates.code : subj.code || null,
        updates.name || subj.name,
        updates.category || subj.category,
        updates.credits !== undefined ? updates.credits : subj.credits,
        updates.color_accent || subj.color_accent,
        updates.faculty_name !== undefined ? updates.faculty_name : subj.faculty_name || null,
        now,
        subjectId,
      ]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  deleteSubject: async (subjectId) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM subjects WHERE id = ?;", [subjectId]);
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  createChapter: async (chapter) => {
    const db = await getDatabase();
    const id = `ch_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO chapters (id, subject_id, user_id, title, unit_number, learning_progress_percent, confidence_rating, key_topics_json, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?);`,
      [
        id,
        chapter.subject_id,
        "local_user",
        chapter.title,
        chapter.unit_number,
        chapter.learning_progress_percent || 0,
        chapter.confidence_rating || 5,
        chapter.notes || null,
        now,
        now,
      ]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
    return id;
  },

  updateChapterProgress: async (chapterId, progress, confidence) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE chapters SET learning_progress_percent = ?, confidence_rating = ?, updated_at = ? WHERE id = ?;`,
      [progress, confidence, now, chapterId]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  updateChapterNotes: async (chapterId, notes) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE chapters SET notes = ?, updated_at = ? WHERE id = ?;`,
      [notes, now, chapterId]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  addChapterKeyTopic: async (chapterId, topicText) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const currentChapters = Object.values(get().chapters).flat();
    const chapter = currentChapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const newTopic: KeyTopic = {
      id: `top_${Date.now()}`,
      text: topicText.trim(),
      completed: false,
    };
    const updated = [...chapter.key_topics, newTopic];

    await db.runAsync(
      `UPDATE chapters SET key_topics_json = ?, updated_at = ? WHERE id = ?;`,
      [JSON.stringify(updated), now, chapterId]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  toggleChapterKeyTopic: async (chapterId, topicId) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const currentChapters = Object.values(get().chapters).flat();
    const chapter = currentChapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const updated = chapter.key_topics.map((t) =>
      t.id === topicId ? { ...t, completed: !t.completed } : t
    );

    await db.runAsync(
      `UPDATE chapters SET key_topics_json = ?, updated_at = ? WHERE id = ?;`,
      [JSON.stringify(updated), now, chapterId]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  deleteChapterKeyTopic: async (chapterId, topicId) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const currentChapters = Object.values(get().chapters).flat();
    const chapter = currentChapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const updated = chapter.key_topics.filter((t) => t.id !== topicId);

    await db.runAsync(
      `UPDATE chapters SET key_topics_json = ?, updated_at = ? WHERE id = ?;`,
      [JSON.stringify(updated), now, chapterId]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  deleteChapter: async (chapterId) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM chapters WHERE id = ?;", [chapterId]);
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  // ==========================================
  // PHASE 3: ASSIGNMENT METHODS
  // ==========================================
  createAssignment: async (asgn) => {
    const db = await getDatabase();
    const id = `asgn_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO assignments (id, subject_id, chapter_id, user_id, title, description, due_date, status, max_marks, obtained_marks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'NOT_FINISHED', ?, NULL, ?, ?);`,
      [
        id,
        asgn.subject_id,
        asgn.chapter_id || null,
        "local_user",
        asgn.title,
        asgn.description || null,
        asgn.due_date || null,
        asgn.max_marks || 10.0,
        now,
        now,
      ]
    );

    // Automatically create a matching Task entry
    const taskId = `task_${Date.now()}`;
    await db.runAsync(
      `INSERT INTO tasks (id, user_id, title, description, priority, status, subject_id, assignment_id, is_next_action, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'medium', 'pending', ?, ?, 0, ?, ?);`,
      [taskId, "local_user", asgn.title, asgn.description || null, asgn.subject_id, id, now, now]
    );

    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
    return id;
  },

  updateAssignmentStatus: async (assignmentId, status, obtainedMarks) => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const asgn = get().allAssignments.find((a) => a.id === assignmentId);
    if (!asgn) return;

    await db.runAsync(
      `UPDATE assignments SET status = ?, obtained_marks = ?, updated_at = ? WHERE id = ?;`,
      [status, obtainedMarks !== undefined ? obtainedMarks : asgn.obtained_marks || null, now, assignmentId]
    );

    // Sync matching task status
    const isCompleted = ["SUBMITTED_HAND", "SUBMITTED_MOODLE", "GRADED"].includes(status);
    if (isCompleted) {
      notifications.cancelRemindersForEntity(assignmentId);
    }
    await db.runAsync(
      `UPDATE tasks SET status = ?, updated_at = ? WHERE assignment_id = ?;`,
      [isCompleted ? "completed" : "pending", now, assignmentId]
    );

    // Auto-generate History log when submitted or graded
    if (["SUBMITTED_HAND", "SUBMITTED_MOODLE", "GRADED"].includes(status)) {
      const histId = `hist_${Date.now()}`;
      const actionType = status === "GRADED" ? "assignment_graded" : "assignment_submitted";
      const statusLabel =
        status === "SUBMITTED_HAND"
          ? "Submitted on Hand"
          : status === "SUBMITTED_MOODLE"
          ? "Submitted on Moodle"
          : `Graded (${obtainedMarks || 0}/${asgn.max_marks || 10})`;

      await db.runAsync(
        `INSERT INTO history (id, user_id, action_type, title, description, subject_id, logged_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          histId,
          "local_user",
          actionType,
          `${asgn.title} - ${statusLabel}`,
          asgn.description || null,
          asgn.subject_id,
          now,
          now,
          now,
        ]
      );
    }

    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  deleteAssignment: async (assignmentId) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM assignments WHERE id = ?;", [assignmentId]);
    await db.runAsync("DELETE FROM tasks WHERE assignment_id = ?;", [assignmentId]);
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  // ==========================================
  // PHASE 3: LABORATORY EXPERIMENT METHODS
  // ==========================================
  createExperiment: async (exp) => {
    const db = await getDatabase();
    const id = `exp_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO experiments (id, subject_id, user_id, experiment_number, title, date_conducted, observation_status, record_status, marks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', NULL, ?, ?);`,
      [
        id,
        exp.subject_id,
        "local_user",
        exp.experiment_number,
        exp.title,
        exp.date_conducted || null,
        now,
        now,
      ]
    );

    // Add matching record task
    const taskId = `task_${Date.now()}`;
    await db.runAsync(
      `INSERT INTO tasks (id, user_id, title, description, priority, status, subject_id, experiment_id, is_next_action, created_at, updated_at)
       VALUES (?, ?, ?, 'Write experiment record and submit for approval', 'medium', 'pending', ?, ?, 0, ?, ?);`,
      [
        taskId,
        "local_user",
        `Exp ${exp.experiment_number}: ${exp.title} Record`,
        exp.subject_id,
        id,
        now,
        now,
      ]
    );

    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
    return id;
  },

  updateExperimentObservation: async (experimentId, status) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const exp = get().allExperiments.find((e) => e.id === experimentId);
    if (!exp) return;

    await db.runAsync(
      `UPDATE experiments SET observation_status = ?, updated_at = ? WHERE id = ?;`,
      [status, now, experimentId]
    );

    // Auto-generate history log if signed
    if (status === "SIGNED") {
      const histId = `hist_${Date.now()}`;
      await db.runAsync(
        `INSERT INTO history (id, user_id, action_type, title, description, subject_id, logged_at, created_at, updated_at)
         VALUES (?, ?, 'observation_signed', ?, ?, ?, ?, ?, ?);`,
        [
          histId,
          "local_user",
          "observation_signed",
          `Exp ${exp.experiment_number} Observation Signed`,
          `Observation for ${exp.title} signed by lab instructor`,
          exp.subject_id,
          now,
          now,
          now,
        ]
      );
    }

    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  updateExperimentRecord: async (experimentId, status, marks) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const exp = get().allExperiments.find((e) => e.id === experimentId);
    if (!exp) return;

    await db.runAsync(
      `UPDATE experiments SET record_status = ?, marks = ?, updated_at = ? WHERE id = ?;`,
      [status, marks !== undefined ? marks : exp.marks || null, now, experimentId]
    );

    // Sync matching task status
    const isApproved = status === "APPROVED";
    await db.runAsync(
      `UPDATE tasks SET status = ?, updated_at = ? WHERE experiment_id = ?;`,
      [isApproved ? "completed" : "pending", now, experimentId]
    );

    // Auto-generate history log if approved
    if (status === "APPROVED") {
      const histId = `hist_${Date.now()}`;
      const marksText = marks !== undefined ? ` (Score: ${marks}/10)` : "";
      await db.runAsync(
        `INSERT INTO history (id, user_id, action_type, title, description, subject_id, logged_at, created_at, updated_at)
         VALUES (?, ?, 'record_approved', ?, ?, ?, ?, ?, ?);`,
        [
          histId,
          "local_user",
          "record_approved",
          `Exp ${exp.experiment_number} Record Approved${marksText}`,
          `Record for ${exp.title} approved and signed`,
          exp.subject_id,
          now,
          now,
          now,
        ]
      );
    }

    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  deleteExperiment: async (experimentId) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM experiments WHERE id = ?;", [experimentId]);
    await db.runAsync("DELETE FROM tasks WHERE experiment_id = ?;", [experimentId]);
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  // ==========================================
  // PHASE 3: UNIFIED TASKS & NEXT ACTION
  // ==========================================
  createTask: async (task) => {
    const db = await getDatabase();
    const id = `task_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO tasks (id, user_id, title, description, priority, status, subject_id, chapter_id, assignment_id, experiment_id, is_next_action, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        "local_user",
        task.title,
        task.description || null,
        task.priority,
        task.status,
        task.subject_id || null,
        task.chapter_id || null,
        task.assignment_id || null,
        task.experiment_id || null,
        task.is_next_action ? 1 : 0,
        now,
        now,
      ]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
    return id;
  },

  toggleTaskStatus: async (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "pending" ? "completed" : "pending";
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?;", [
      newStatus,
      now,
      taskId,
    ]);

    // If completed and was a Next Action, log to history
    if (newStatus === "completed") {
      notifications.cancelRemindersForEntity(taskId);
      const histId = `hist_${Date.now()}`;
      await db.runAsync(
        `INSERT INTO history (id, user_id, action_type, title, description, subject_id, logged_at, created_at, updated_at)
         VALUES (?, ?, 'task_completed', ?, ?, ?, ?, ?, ?);`,
        [
          histId,
          "local_user",
          "task_completed",
          `Completed Task: ${task.title}`,
          task.description || null,
          task.subject_id || null,
          now,
          now,
          now,
        ]
      );
    }

    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  setTaskNextAction: async (taskId) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    // Demote current next action and promote this one
    await db.runAsync("UPDATE tasks SET is_next_action = 0, updated_at = ?;", [now]);
    await db.runAsync("UPDATE tasks SET is_next_action = 1, updated_at = ? WHERE id = ?;", [
      now,
      taskId,
    ]);
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  deleteTask: async (taskId) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM tasks WHERE id = ?;", [taskId]);
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  // ==========================================
  // PHASE 3: HISTORY & RETROSPECTIVE
  // ==========================================
  logStudySession: async (title, durationMinutes, description) => {
    const db = await getDatabase();
    const id = `hist_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO history (id, user_id, action_type, title, description, duration_minutes, logged_at, created_at, updated_at)
       VALUES (?, ?, 'study_session', ?, ?, ?, ?, ?, ?);`,
      [id, "local_user", title.trim(), description || null, durationMinutes, now, now, now]
    );
    await get().loadHistoryLogs();
  },

  loadHistoryLogs: async () => {
    const db = await getDatabase();
    const logs = await db.getAllAsync<HistoryItem>(
      "SELECT * FROM history ORDER BY logged_at DESC LIMIT 50;"
    );
    set({ historyLogs: logs });
  },

  addAcademicEvent: async (event) => {
    const db = await getDatabase();
    const id = `ev_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO academic_events (id, semester_id, user_id, title, start_date, category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, event.semester_id, "local_user", event.title, event.start_date, event.category, now, now]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
    return id;
  },

  importAcademicExtraction: async ({ semesterId, events, subjects, exams }) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    let eventsCount = 0;
    let subjectsCount = 0;
    let examsCount = 0;

    // 1. Commit Events
    for (const ev of events) {
      const evId = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await db.runAsync(
        `INSERT INTO academic_events (id, semester_id, user_id, title, description, start_date, category, is_official, created_at, updated_at)
         VALUES (?, ?, 'local_user', ?, ?, ?, ?, 1, ?, ?);`,
        [evId, semesterId, ev.title, ev.description || null, ev.date, ev.category, now, now]
      );
      eventsCount++;
    }

    // 2. Commit Subjects
    const createdSubjectMap: Record<string, string> = {};
    for (const sub of subjects) {
      const existing = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM subjects WHERE semester_id = ? AND (code = ? OR name = ?);`,
        [semesterId, sub.code || "", sub.name]
      );
      if (!existing) {
        const subId = `subj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const color = sub.category === "Laboratory" ? "#10B981" : "#CD202C";
        await db.runAsync(
          `INSERT INTO subjects (id, semester_id, user_id, code, name, category, credits, color_accent, faculty_name, created_at, updated_at)
           VALUES (?, ?, 'local_user', ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            subId,
            semesterId,
            sub.code || "SUBJ",
            sub.name,
            sub.category || "Theory",
            sub.credits || 3.0,
            color,
            sub.faculty || null,
            now,
            now,
          ]
        );
        createdSubjectMap[sub.name] = subId;
        if (sub.code) createdSubjectMap[sub.code] = subId;
        subjectsCount++;
      } else {
        createdSubjectMap[sub.name] = existing.id;
        if (sub.code) createdSubjectMap[sub.code] = existing.id;
      }
    }

    // 3. Commit Exams
    for (const ex of exams) {
      let subjId = ex.subject_code ? createdSubjectMap[ex.subject_code] : undefined;
      if (!subjId && ex.subject_name) {
        subjId = createdSubjectMap[ex.subject_name];
      }
      if (!subjId) {
        const matched = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM subjects WHERE semester_id = ? AND (code = ? OR name = ?);`,
          [semesterId, ex.subject_code || "", ex.subject_name]
        );
        if (matched) subjId = matched.id;
      }

      if (!subjId) {
        subjId = `subj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await db.runAsync(
          `INSERT INTO subjects (id, semester_id, user_id, code, name, category, credits, color_accent, created_at, updated_at)
           VALUES (?, ?, 'local_user', ?, ?, 'Theory', 3.0, '#CD202C', ?, ?);`,
          [subjId, semesterId, ex.subject_code || "EXAM", ex.subject_name, now, now]
        );
        createdSubjectMap[ex.subject_name] = subjId;
        subjectsCount++;
      }

      const examId = `exam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await db.runAsync(
        `INSERT INTO exams (id, subject_id, user_id, title, exam_type, exam_date, session, portions, max_marks, created_at, updated_at)
         VALUES (?, ?, 'local_user', ?, ?, ?, ?, ?, 50.0, ?, ?);`,
        [
          examId,
          subjId,
          `${ex.subject_name} (${ex.exam_type})`,
          ex.exam_type,
          ex.exam_date,
          ex.session || "FN",
          ex.section ? `Section ${ex.section}` : null,
          now,
          now,
        ]
      );
      examsCount++;
    }

    // 4. Retrospective Activity History Log
    await db.runAsync(
      `INSERT INTO history (id, user_id, action_type, title, description, logged_at, created_at, updated_at)
       VALUES (?, 'local_user', 'study_session', ?, ?, ?, ?, ?);`,
      [
        `hist_${Date.now()}`,
        `Document Intelligence Import Completed`,
        `Ingested ${eventsCount} events, ${subjectsCount} subjects, and ${examsCount} exam schedules.`,
        now,
        now,
        now,
      ]
    );

    // 5. Offline Sync Queue Record
    await db.runAsync(
      `INSERT INTO sync_queue (entity_type, entity_id, action, payload_json, created_at)
       VALUES ('document_import', ?, 'BATCH_IMPORT', ?, ?);`,
      [
        semesterId,
        JSON.stringify({ eventsCount, subjectsCount, examsCount, timestamp: now }),
        now,
      ]
    );

    await get().loadSemesterData(semesterId);
    return { eventsCount, subjectsCount, examsCount };
  },

  createExam: async (exam) => {
    const db = await getDatabase();
    const id = `exam_${Date.now()}`;
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO exams (id, subject_id, user_id, title, exam_type, exam_date, session, portions, max_marks, target_marks, created_at, updated_at)
       VALUES (?, ?, 'local_user', ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        exam.subject_id,
        exam.title,
        exam.exam_type,
        exam.exam_date,
        exam.session || "FN",
        exam.portions || null,
        exam.max_marks || 50.0,
        exam.target_marks || null,
        now,
        now,
      ]
    );
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
    return id;
  },

  updateExam: async (examId, updates) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const sets: string[] = ["updated_at = ?"];
    const vals: any[] = [now];

    if (updates.obtained_marks !== undefined) {
      sets.push("obtained_marks = ?");
      vals.push(updates.obtained_marks);
    }
    if (updates.target_marks !== undefined) {
      sets.push("target_marks = ?");
      vals.push(updates.target_marks);
    }
    if (updates.portions !== undefined) {
      sets.push("portions = ?");
      vals.push(updates.portions);
    }
    if (updates.exam_date !== undefined) {
      sets.push("exam_date = ?");
      vals.push(updates.exam_date);
    }
    if (updates.title !== undefined) {
      sets.push("title = ?");
      vals.push(updates.title);
    }

    vals.push(examId);
    await db.runAsync(`UPDATE exams SET ${sets.join(", ")} WHERE id = ?;`, vals);
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },

  deleteExam: async (examId) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM exams WHERE id = ?;", [examId]);
    if (get().activeSemester) {
      await get().loadSemesterData(get().activeSemester!.id);
    }
  },
}));
