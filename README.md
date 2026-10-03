# Metron — Personal Academic Command Center
> **"Measure. Organize. Progress."**  
> An offline-first, generic academic execution engine built with zero college-specific hardcoding.

---

## 🌟 Key Highlights & Philosophy

- **Zero Hardcoding Rule:** No college names, term dates, grading formulas, or exam timetables are baked into the binary. Metron provides the execution system; the student provides their institution's syllabus and documents.
- **Dual-Track Progress:** Strictly separates **Task Progress** (automatic 0-100% rollup from assignments and lab records) from **Learning Understanding** (student-evaluated confidence rating 1-10 and progress sliders per chapter).
- **Gemini Multimodal Document Ingestion:** Upload academic calendars, syllabus PDFs, or exam timetables directly to the backend (`google-genai` SDK) to auto-extract schedules, with human-in-the-loop review and approval before committing to SQLite.
- **Theory Internal Mark Calculator (40-Marks Scheme):** Dedicated internal calculator for theory courses (Assignments 10 + CAT1 12 + CAT2 6 + CAT3 12) with target final exam grade projections.
- **Selective Google Calendar Sync:** Push official academic milestones and exams to Google Calendar without flooding personal micro-tasks, backed by bidirectional deduplication (`google_event_id`).
- **Cloud Sync & LWW Conflict Resolution:** Background SQLite `sync_queue` draining and bidirectional delta reconciliation with Supabase PostgreSQL and Row-Level Security (`auth.uid() = user_id`).

---

## 🏗️ Architecture & Technology Stack

```
Metron/
├── docs/                        # Complete PRD, TAD, UI/UX, Color, Brand & Master Plan
├── backend/                     # Python 3.13 + FastAPI REST API
│   ├── app/
│   │   ├── api/v1/endpoints/    # 13 REST domain routers (TAD S14)
│   │   ├── core/                # Config, Python 3.13 timezone-aware datetime
│   │   ├── document_processing/ # Gemini Multimodal Provider + fallback
│   │   ├── repositories/        # Repository pattern with in-memory test store
│   │   └── schemas/             # Pydantic v2 data models & validation
│   ├── migrations/              # Supabase PostgreSQL 15+ RLS schema
│   ├── tests/                   # 11 automated pytest suites
│   ├── Dockerfile               # Multi-stage Python 3.13 + uv runtime
│   └── docker-compose.yml       # Production container orchestration
└── mobile/                      # React Native (Expo SDK 51+) Mobile Client
    ├── src/
    │   ├── app/navigation/      # Stack & 5-tab bottom navigation
    │   ├── components/ui/       # Design system tokens (#0D0D0D, #CD202C accent)
    │   ├── data/sqlite/         # Local-First durable SQLite database (10 tables)
    │   ├── features/            # Screens for Semesters, Subjects, Tasks, Exams,
    │   │                        # Calendar, Calculator, Intelligence, History
    │   ├── services/            # API client, Google Calendar, Notifications, Sync
    │   └── store/               # Centralized Zustand reactive store
    └── eas.json                 # EAS build profiles (Dev, Standalone APK, Play Store AAB)
```

---

## 🚀 Quickstart Guide

### Prerequisites
- [Python 3.13+](https://www.python.org/) & [uv package manager](https://github.com/astral-sh/uv)
- [Node.js 18+](https://nodejs.org/) & npm
- [Docker](https://www.docker.com/) (optional, for containerized backend)

### 1. Backend Setup

```bash
cd backend

# Install dependencies and run tests
uv run python -m pytest

# Start local FastAPI development server (http://localhost:8000)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive API Documentation:** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

#### Or run with Docker Compose:
```bash
cd backend
docker compose up --build
```

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Verify TypeScript compilation (0 errors)
npx tsc --noEmit

# Start the Expo development server
npx expo start
```

- Press `a` to open Android Emulator.
- Press `w` to open web preview.
- Scan QR code with **Expo Go** on your physical Android/iOS device.

### 3. Production Mobile Builds (EAS)

```bash
cd mobile

# Standalone Android APK for internal testing:
npx eas-cli build --profile preview --platform android

# Android App Bundle for Google Play Store release:
npx eas-cli build --profile production --platform android
```

---

## 🧪 Testing & Verification Matrix

- **Backend Pytest:** 11/11 automated tests covering academic core, document extraction, task lifecycle, dual-track separation, exam timetables, marks calculation, study intelligence, Google Calendar sync, and cloud LWW conflict resolution.
- **Mobile TypeScript:** Strict zero-error TypeScript compilation across all screens, navigation, SQLite migrations, and stores.

---

## 📄 License
MIT License. Built for students, researchers, and self-directed learners.
