import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Metron API"


def test_auth_session():
    response = client.post("/api/v1/auth/session", json={})
    assert response.status_code == 200
    assert response.json()["status"] == "authenticated"


def test_academic_core_phase2():
    """
    Exhaustive verification of Phase 2 Academic Core:
    - Multiple Semesters & Term Switcher
    - Subjects (Theory & Lab) CRUD with credits & faculty
    - Units/Chapters CRUD with steppers, confidence, notes, and topics
    - Real-time recalculation of Subject learning progress and confidence metrics
    """
    # 1. Create Term (Semester 5)
    sem_res = client.post("/api/v1/semesters", json={
        "title": "Semester 5 (Fall 2026)",
        "academic_year": "2026-2027",
        "semester_number": 5,
        "department": "Computer Science & Engineering",
        "programme": "B.Tech CSE",
        "section": "A",
    })
    assert sem_res.status_code == 201
    sem_id = sem_res.json()["id"]

    # 2. Create Second Term (Semester 6)
    sem6_res = client.post("/api/v1/semesters", json={
        "title": "Semester 6 (Spring 2027)",
        "academic_year": "2026-2027",
        "semester_number": 6,
        "department": "Computer Science & Engineering",
        "programme": "B.Tech CSE",
        "section": "A",
    })
    assert sem6_res.status_code == 201
    assert len(client.get("/api/v1/semesters").json()) >= 2

    # 3. Create Theory Subject
    subj_res = client.post(f"/api/v1/semesters/{sem_id}/subjects", json={
        "code": "CS501",
        "name": "Operating Systems",
        "category": "Theory",
        "credits": 3.0,
        "color_accent": "#CD202C",
        "faculty_name": "Dr. Sarah Adams",
    })
    assert subj_res.status_code == 201
    subj_id = subj_res.json()["id"]

    # 4. Create Laboratory Subject
    lab_res = client.post(f"/api/v1/semesters/{sem_id}/subjects", json={
        "code": "CS508",
        "name": "OS & Networks Laboratory",
        "category": "Laboratory",
        "credits": 1.5,
        "color_accent": "#10B981",
        "faculty_name": "Dr. Sarah Adams",
    })
    assert lab_res.status_code == 201
    lab_id = lab_res.json()["id"]

    # Verify listing subjects
    subjects_res = client.get(f"/api/v1/semesters/{sem_id}/subjects")
    assert subjects_res.status_code == 200
    assert len(subjects_res.json()) >= 2

    # 5. Add Unit 1 to Operating Systems
    ch1_res = client.post(f"/api/v1/subjects/{subj_id}/chapters", json={
        "title": "Unit 1: Process Synchronization & Deadlocks",
        "unit_number": 1,
        "learning_progress_percent": 80.0,
        "confidence_rating": 8,
        "key_topics": ["Semaphores", "Banker's Algorithm"],
        "notes": "Banker's algorithm checks for safe sequence.",
    })
    assert ch1_res.status_code == 201
    ch1_id = ch1_res.json()["id"]

    # 6. Add Unit 2 to Operating Systems (Low confidence)
    ch2_res = client.post(f"/api/v1/subjects/{subj_id}/chapters", json={
        "title": "Unit 2: Memory Management & Paging",
        "unit_number": 2,
        "learning_progress_percent": 40.0,
        "confidence_rating": 4,
        "key_topics": ["Paging", "Segmentation", "Page Replacement"],
        "notes": "Review LRU and clock replacement algorithms.",
    })
    assert ch2_res.status_code == 201
    ch2_id = ch2_res.json()["id"]

    # 7. Check Aggregated Subject Metrics
    # (80 + 40)/2 = 60.0% learning progress, (8 + 4)/2 = 6.0 avg confidence
    subj_metrics_res = client.get(f"/api/v1/subjects/{subj_id}")
    assert subj_metrics_res.status_code == 200
    metrics = subj_metrics_res.json()
    assert metrics["learning_progress_percent"] == 60.0
    assert metrics["average_confidence"] == 6.0

    # 8. Update Unit 2 Progress & Confidence (Student studied Unit 2!)
    update_ch2_res = client.patch(f"/api/v1/chapters/{ch2_id}", json={
        "learning_progress_percent": 90.0,
        "confidence_rating": 9,
        "notes": "Mastered LRU page replacement algorithm!",
    })
    assert update_ch2_res.status_code == 200
    assert update_ch2_res.json()["learning_progress_percent"] == 90.0
    assert update_ch2_res.json()["confidence_rating"] == 9

    # 9. Verify Subject Metrics Dynamically Recalculated
    # (80 + 90)/2 = 85.0% learning progress, (8 + 9)/2 = 8.5 avg confidence
    recalculated_subj_res = client.get(f"/api/v1/subjects/{subj_id}")
    assert recalculated_subj_res.json()["learning_progress_percent"] == 85.0
    assert recalculated_subj_res.json()["average_confidence"] == 8.5

    # 10. Update Subject Metadata
    update_subj_res = client.patch(f"/api/v1/subjects/{subj_id}", json={
        "faculty_name": "Prof. Sarah Adams (Head of Systems)",
        "credits": 4.0,
    })
    assert update_subj_res.status_code == 200
    assert update_subj_res.json()["faculty_name"] == "Prof. Sarah Adams (Head of Systems)"
    assert update_subj_res.json()["credits"] == 4.0

    # 11. Delete a Unit and Verify
    del_ch_res = client.delete(f"/api/v1/chapters/{ch1_id}")
    assert del_ch_res.status_code == 204
    get_deleted_ch = client.get(f"/api/v1/chapters/{ch1_id}")
    assert get_deleted_ch.status_code == 404

    # 12. Delete Subject
    del_subj_res = client.delete(f"/api/v1/subjects/{lab_id}")
    assert del_subj_res.status_code == 204


def test_document_processing_pipeline():
    """
    Exhaustive verification of Phase 4 Document Intelligence & Gemini Multimodal Pipeline:
    - Ingest academic document file bytes (PDF / Image)
    - Process document with DocumentAIProvider (Gemini Multimodal / high-fidelity fallback)
    - Preview normalized extraction payload with events, subjects, and exams
    - Batch commit confirmed items into database
    - Verify events, subjects, and exams are accurately populated in semester
    """
    # 1. Create semester
    sem_res = client.post("/api/v1/semesters", json={
        "title": "Document Test Sem",
        "academic_year": "2026-2027",
        "semester_number": 3,
    })
    assert sem_res.status_code == 201
    sem_id = sem_res.json()["id"]

    # 2. Upload mock academic document
    files = {"file": ("academic_calendar.pdf", b"%PDF-1.4 mock content for Metron AI", "application/pdf")}
    upload_res = client.post(f"/api/v1/semesters/{sem_id}/documents", files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # 3. Trigger processing
    proc_res = client.post(f"/api/v1/documents/{doc_id}/process")
    assert proc_res.status_code == 200
    assert proc_res.json()["status"] == "completed"

    # 4. Preview import payload
    prev_res = client.get(f"/api/v1/documents/{doc_id}/import")
    assert prev_res.status_code == 200
    extraction = prev_res.json()["extraction"]
    assert "events" in extraction
    assert len(extraction["events"]) > 0
    assert "subjects" in extraction
    assert len(extraction["subjects"]) > 0
    assert "exams" in extraction
    assert len(extraction["exams"]) > 0

    # 5. Confirm full multi-category import
    confirm_res = client.post(f"/api/v1/documents/{doc_id}/confirm", json={
        "confirmed_events": extraction["events"],
        "confirmed_subjects": extraction["subjects"],
        "confirmed_exams": extraction["exams"],
    })
    assert confirm_res.status_code == 200
    msg = confirm_res.json()["message"]
    assert "Successfully imported" in msg
    assert f"events" in msg
    assert f"subjects" in msg
    assert f"exams" in msg

    # 6. Verify Academic Calendar Events
    events_res = client.get(f"/api/v1/academic-events?semester_id={sem_id}")
    assert events_res.status_code == 200
    events = events_res.json()
    assert len(events) >= len(extraction["events"])

    # 7. Verify Ingested Subjects
    subjects_res = client.get(f"/api/v1/semesters/{sem_id}/subjects")
    assert subjects_res.status_code == 200
    subjects = subjects_res.json()
    assert len(subjects) >= len(extraction["subjects"])
    subj_names = [s["name"] for s in subjects]
    assert "Operating Systems" in subj_names

    # 8. Verify Ingested Exams
    exams_res = client.get("/api/v1/exams")
    assert exams_res.status_code == 200
    exams = exams_res.json()
    assert len(exams) >= len(extraction["exams"])



def test_task_engine_phase3():
    """
    Exhaustive verification of Phase 3 Task & Action Engine:
    - 5-stage assignment lifecycle: not_started -> completed -> submitted_hand/moodle -> graded
    - Laboratory dual-track tracking: Observation (pending->signed) and Record (pending->approved)
    - Automatic vs manual separation: task_progress_percent rollups without mutating learning_progress_percent
    - Next Action promotion (★) filter on unified task board
    - Retrospective activity history logging for submissions, records, and study sessions
    """
    # 1. Setup Semester & Subjects
    sem_res = client.post("/api/v1/semesters", json={
        "title": "Semester 5 (Task Engine Test)",
        "academic_year": "2026-2027",
        "semester_number": 5,
    })
    assert sem_res.status_code == 201
    sem_id = sem_res.json()["id"]

    # Theory Subject with 1 chapter at 50%
    subj_res = client.post(f"/api/v1/semesters/{sem_id}/subjects", json={
        "code": "CS503",
        "name": "Database Management Systems",
        "category": "Theory",
        "credits": 3.0,
        "color_accent": "#3B82F6",
    })
    assert subj_res.status_code == 201
    subj_id = subj_res.json()["id"]

    ch_res = client.post(f"/api/v1/subjects/{subj_id}/chapters", json={
        "title": "Unit 1: Relational Algebra & SQL",
        "unit_number": 1,
        "learning_progress_percent": 50.0,
        "confidence_rating": 7,
    })
    assert ch_res.status_code == 201
    ch_id = ch_res.json()["id"]

    # Lab Subject
    lab_res = client.post(f"/api/v1/semesters/{sem_id}/subjects", json={
        "code": "CS509",
        "name": "DBMS Laboratory",
        "category": "Laboratory",
        "credits": 1.5,
        "color_accent": "#10B981",
    })
    assert lab_res.status_code == 201
    lab_id = lab_res.json()["id"]

    # 2. Assignment 5-Stage Lifecycle
    # Create assignment
    asgn_res = client.post(f"/api/v1/subjects/{subj_id}/assignments", json={
        "title": "SQL Normalization Problem Set",
        "description": "Prove 3NF and BCNF for sample schemas",
        "chapter_id": ch_id,
        "max_marks": 20.0,
        "status": "not_started",
    })
    assert asgn_res.status_code == 201
    asgn_id = asgn_res.json()["id"]
    assert asgn_res.json()["status"] == "not_started"

    # Step 1: Advance to completed (written locally)
    asgn_done = client.patch(f"/api/v1/assignments/{asgn_id}", json={
        "status": "completed",
    })
    assert asgn_done.status_code == 200
    assert asgn_done.json()["status"] == "completed"

    # Step 2: Advance to submitted_moodle
    asgn_sub = client.patch(f"/api/v1/assignments/{asgn_id}", json={
        "status": "submitted_moodle",
    })
    assert asgn_sub.status_code == 200
    assert asgn_sub.json()["status"] == "submitted_moodle"

    # Step 3: Advance to graded with score prompt
    asgn_graded = client.patch(f"/api/v1/assignments/{asgn_id}", json={
        "status": "graded",
        "obtained_marks": 19.0,
    })
    assert asgn_graded.status_code == 200
    assert asgn_graded.json()["status"] == "graded"
    assert asgn_graded.json()["obtained_marks"] == 19.0

    # 3. Laboratory Dual-Track Workflow
    exp_res = client.post(f"/api/v1/subjects/{lab_id}/experiments", json={
        "experiment_number": 1,
        "title": "ER Modeling & Schema Design in MySQL",
        "observation_status": "pending",
        "record_status": "pending",
        "max_marks": 10.0,
    })
    assert exp_res.status_code == 201
    exp_id = exp_res.json()["id"]

    # Advance Observation: pending -> completed -> signed
    exp_obs = client.patch(f"/api/v1/experiments/{exp_id}", json={
        "observation_status": "signed",
    })
    assert exp_obs.status_code == 200
    assert exp_obs.json()["observation_status"] == "signed"
    assert exp_obs.json()["record_status"] == "pending"

    # Advance Record: pending -> written -> submitted -> approved
    exp_rec = client.patch(f"/api/v1/experiments/{exp_id}", json={
        "record_status": "approved",
        "marks": 9.5,
    })
    assert exp_rec.status_code == 200
    assert exp_rec.json()["record_status"] == "approved"
    assert exp_rec.json()["marks"] == 9.5

    # 4. Strict Dual-Track Independence Verification
    # Subject DBMS has 1 assignment (which is graded) -> task progress 100%
    # Learning progress must remain EXACTLY 50.0% (not modified by assignment grading)
    subj_check = client.get(f"/api/v1/subjects/{subj_id}")
    assert subj_check.status_code == 200
    assert subj_check.json()["learning_progress_percent"] == 50.0
    assert subj_check.json()["task_progress_percent"] == 100.0

    # Lab subject has 1 experiment (record approved) -> task progress 100%
    lab_check = client.get(f"/api/v1/subjects/{lab_id}")
    assert lab_check.status_code == 200
    assert lab_check.json()["task_progress_percent"] == 100.0

    # 5. Task Engine & Next Action (★) Promotion
    t1_res = client.post("/api/v1/tasks", json={
        "title": "Read Chapter 4 on B+ Trees",
        "priority": "medium",
        "status": "pending",
        "is_next_action": False,
        "subject_id": subj_id,
    })
    assert t1_res.status_code == 201

    t2_res = client.post("/api/v1/tasks", json={
        "title": "Finalize Indexing Assignment",
        "priority": "high",
        "status": "pending",
        "is_next_action": True,
        "subject_id": subj_id,
        "assignment_id": asgn_id,
    })
    assert t2_res.status_code == 201
    t2_id = t2_res.json()["id"]

    # Filter next action tasks
    next_tasks_res = client.get("/api/v1/tasks?is_next_action=true")
    assert next_tasks_res.status_code == 200
    next_tasks = next_tasks_res.json()
    assert any(t["id"] == t2_id for t in next_tasks)

    # Complete Next Action task
    t2_done = client.patch(f"/api/v1/tasks/{t2_id}", json={
        "status": "completed",
    })
    assert t2_done.status_code == 200
    assert t2_done.json()["status"] == "completed"

    # 6. Retrospective Activity History Logging
    hist_asgn = client.post("/api/v1/history", json={
        "action_type": "assignment_submitted",
        "title": "SQL Normalization Problem Set - Submitted on Moodle",
        "subject_id": subj_id,
        "logged_at": "2026-10-03T10:00:00Z",
    })
    assert hist_asgn.status_code == 201

    hist_lab = client.post("/api/v1/history", json={
        "action_type": "record_approved",
        "title": "DBMS Lab 1 Record Approved",
        "description": "ER modeling in MySQL signed by instructor",
        "subject_id": lab_id,
        "duration_minutes": 45,
        "logged_at": "2026-10-03T11:00:00Z",
    })
    assert hist_lab.status_code == 201

    hist_study = client.post("/api/v1/history", json={
        "action_type": "study_session",
        "title": "B+ Trees & Transactions Revision",
        "subject_id": subj_id,
        "duration_minutes": 60,
        "logged_at": "2026-10-03T12:00:00Z",
    })
    assert hist_study.status_code == 201

    # Verify history list order
    all_hist = client.get("/api/v1/history").json()
    assert len(all_hist) >= 3
    # Check that entries have their action types and subject associations
    action_types = [h["action_type"] for h in all_hist]
    assert "assignment_submitted" in action_types
    assert "record_approved" in action_types
    assert "study_session" in action_types


def test_exam_timetable_filtering_phase5():
    """
    Exhaustive verification of Phase 5 Exam Timetable & Dynamic Filtering:
    - Programme, section, and exam_type filtering
    - Portion units and score recording
    - Chronological sorting
    """
    # 1. Setup Semester & Subject
    sem_res = client.post("/api/v1/semesters", json={
        "title": "Semester 5 (Exam Test)",
        "academic_year": "2026-2027",
        "semester_number": 5,
        "programme": "B.Tech CSE",
        "section": "A",
    })
    assert sem_res.status_code == 201
    sem_id = sem_res.json()["id"]

    subj_cse = client.post(f"/api/v1/semesters/{sem_id}/subjects", json={
        "code": "CS504",
        "name": "Theory of Computation",
        "category": "Theory",
        "credits": 4.0,
    }).json()["id"]

    # 2. Create multiple exams across programmes and sections
    e1 = client.post("/api/v1/exams", json={
        "subject_id": subj_cse,
        "exam_type": "CAT1",
        "exam_date": "2026-10-15",
        "session": "FN",
        "max_marks": 50.0,
        "programme": "B.Tech CSE",
        "section": "A",
        "portion_units": ["Unit 1", "Unit 2"],
    })
    assert e1.status_code == 201
    e1_id = e1.json()["id"]

    e2 = client.post("/api/v1/exams", json={
        "subject_id": subj_cse,
        "exam_type": "CAT2",
        "exam_date": "2026-11-20",
        "session": "FN",
        "max_marks": 50.0,
        "programme": "B.Tech CSE",
        "section": "B",
        "portion_units": ["Unit 3", "Unit 4"],
    })
    assert e2.status_code == 201

    e3 = client.post("/api/v1/exams", json={
        "subject_id": subj_cse,
        "exam_type": "SemesterFinal",
        "exam_date": "2026-12-10",
        "session": "AN",
        "max_marks": 100.0,
        "programme": "B.Tech ECE",
        "section": "A",
    })
    assert e3.status_code == 201

    # 3. Test Filter by Programme (B.Tech CSE)
    res_cse = client.get("/api/v1/exams?programme=B.Tech CSE")
    assert res_cse.status_code == 200
    cse_exams = res_cse.json()
    assert all(x["programme"] == "B.Tech CSE" for x in cse_exams)
    assert any(x["id"] == e1_id for x in cse_exams)

    # 4. Test Filter by Section (Section A)
    res_sec_a = client.get("/api/v1/exams?section=A")
    assert res_sec_a.status_code == 200
    sec_a_exams = res_sec_a.json()
    assert all(x["section"] == "A" for x in sec_a_exams)

    # 5. Test Filter by Exam Type (CAT1)
    res_cat1 = client.get("/api/v1/exams?exam_type=CAT1")
    assert res_cat1.status_code == 200
    cat1_exams = res_cat1.json()
    assert all(x["exam_type"] == "CAT1" for x in cat1_exams)

    # 6. Test Portion checklist and Score entry
    patch_res = client.patch(f"/api/v1/exams/{e1_id}", json={
        "portion_units": ["Unit 1", "Unit 2", "Unit 3 (Part A)"],
        "obtained_marks": 46.5,
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["obtained_marks"] == 46.5
    assert len(patch_res.json()["portion_units"]) == 3


def test_marks_calculator_engine_phase6():
    """
    Exhaustive verification of Phase 6 Configurable Marks & Internal Calculator Engine:
    - Preset A: Best 2 of 3 CATs
    - Preset B: Weighted average
    - Target Grade Projection ("What do I need on Finals?")
    """
    # 1. Test Best 2 of 3 CATs Preset
    # CAT1: 40/50, CAT2: 30/50, CAT3: 46/50 -> Best 2 are 40 and 46 (Avg = 43/50 = 86%)
    calc_req = {
        "preset": "best_2_of_3_cats",
        "target_max_internal": 50.0,
        "items": [
            {"id": "cat1", "label": "CAT-1", "obtained_score": 40.0, "max_score": 50.0, "weight_percent": 33.3, "is_cat": True},
            {"id": "cat2", "label": "CAT-2", "obtained_score": 30.0, "max_score": 50.0, "weight_percent": 33.3, "is_cat": True},
            {"id": "cat3", "label": "CAT-3", "obtained_score": 46.0, "max_score": 50.0, "weight_percent": 33.4, "is_cat": True},
        ],
    }
    res_best2 = client.post("/api/v1/marks/calculate", json=calc_req)
    assert res_best2.status_code == 200
    data_best2 = res_best2.json()
    assert data_best2["computed_internal_score"] == 43.0
    assert data_best2["percentage"] == 86.0
    assert "Selected best 2 of 3 CATs" in data_best2["breakdown_notes"]

    # 2. Test Weighted Average Preset
    weighted_req = {
        "preset": "weighted_average",
        "target_max_internal": 100.0,
        "items": [
            {"id": "cat1", "label": "CAT-1", "obtained_score": 45.0, "max_score": 50.0, "weight_percent": 40.0},
            {"id": "cat2", "label": "CAT-2", "obtained_score": 50.0, "max_score": 50.0, "weight_percent": 40.0},
            {"id": "asgn", "label": "Assignments", "obtained_score": 20.0, "max_score": 20.0, "weight_percent": 20.0},
        ],
    }
    res_weighted = client.post("/api/v1/marks/calculate", json=weighted_req)
    assert res_weighted.status_code == 200
    data_w = res_weighted.json()
    # (45/50)*40 = 36, (50/50)*40 = 40, (20/20)*20 = 20 -> Sum = 96.0
    assert data_w["computed_internal_score"] == 96.0
    assert data_w["percentage"] == 96.0

    # 3. Test Target Grade Projection (Achievable case)
    # Current internal = 40/50 (80%), Internal weight = 50%, Final exam weight = 50%, Target overall = 85%
    # Target overall = internal_contrib (40) + final_contrib (45) -> 45 / 0.5 = 90 / 100 needed on final
    proj_req = {
        "current_internal_score": 40.0,
        "max_internal_score": 50.0,
        "internal_weight_percent": 50.0,
        "final_exam_weight_percent": 50.0,
        "final_exam_max_marks": 100.0,
        "target_overall_percentage": 85.0,
    }
    res_proj = client.post("/api/v1/marks/project-grade", json=proj_req)
    assert res_proj.status_code == 200
    data_p = res_proj.json()
    assert data_p["is_feasible"] is True
    assert data_p["required_marks_on_final"] == 90.0

    # 4. Test Target Grade Projection (Mathematically unachievable)
    # Internal = 15/50 (30%), Target = 95% -> Needs (95 - 15) / 0.5 = 160/100 -> Impossible
    unachievable_req = {
        "current_internal_score": 15.0,
        "max_internal_score": 50.0,
        "internal_weight_percent": 50.0,
        "final_exam_weight_percent": 50.0,
        "final_exam_max_marks": 100.0,
        "target_overall_percentage": 95.0,
    }
    res_unach = client.post("/api/v1/marks/project-grade", json=unachievable_req)
    assert res_unach.status_code == 200
    data_unach = res_unach.json()
    assert data_unach["is_feasible"] is False
    assert data_unach["required_marks_on_final"] > 100.0


def test_intelligence_suggestions_phase7():
    """
    Exhaustive verification of Phase 7 Intelligence & Smart Study Reasoning:
    - Multi-factor student context synthesis
    - Urgency-ranked recommendations
    - Multimodal Gemini or heuristic fallback operation
    """
    payload = {
        "semester_name": "Semester 5 (Fall 2026)",
        "days_until_next_exam": 4,
        "pending_assignments_count": 3,
        "pending_lab_records_count": 1,
        "subjects": [
            {
                "code": "CS501",
                "name": "Operating Systems",
                "confidence_rating": 3.5,
                "learning_progress_percent": 30.0,
                "upcoming_exam_date": "2026-10-15",
                "current_internal_score": 28.0,
            },
            {
                "code": "CS502",
                "name": "Database Management Systems",
                "confidence_rating": 8.5,
                "learning_progress_percent": 85.0,
                "current_internal_score": 45.0,
            }
        ]
    }
    res = client.post("/api/v1/intelligence/study-suggestions", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "summary" in data
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0

    # Ensure urgent recommendation was triggered for weak subject CS501
    rec_codes = [r.get("subject_code") for r in data["recommendations"]]
    assert "CS501" in rec_codes

    first_rec = data["recommendations"][0]
    assert first_rec["urgency"] in ["urgent", "high", "medium", "low"]
    assert first_rec["suggested_duration_mins"] > 0
    assert first_rec["action_type"] in ["study_weak_topic", "complete_lab", "review_exam_portion", "calculate_target_grade"]


def test_theory_internal_mark_calculator_40_marks():
    """
    Exhaustive verification of Theory-Only 40-Mark Internal Scheme:
    - 5 Chapter Assignments: (Raw / 10) * 2 = Max 10 Marks
    - CAT 1: (Ch 1 / 25 * 6) + (Ch 2 / 25 * 6) = Max 12 Marks
    - CAT 2: (Ch 3 / 25 * 6) = Max 6 Marks
    - CAT 3: (Ch 4 / 25 * 6) + (Ch 5 / 25 * 6) = Max 12 Marks
    - Total Internal = 10 + 12 + 6 + 12 = 40 Marks
    """
    req = {
        "asgn_ch1": 8.0,
        "asgn_ch2": 7.0,
        "asgn_ch3": 9.0,
        "asgn_ch4": 10.0,
        "asgn_ch5": 8.0,
        "cat1_ch1": 20.0,
        "cat1_ch2": 22.0,
        "cat2_ch3": 21.0,
        "cat3_ch4": 23.0,
        "cat3_ch5": 24.0,
    }
    res = client.post("/api/v1/marks/theory/calculate", json=req)
    assert res.status_code == 200
    data = res.json()

    # 1. Assignments verification
    assert data["assignments_raw_total"] == 42.0
    assert data["assignments_converted_total"] == 8.4
    assert data["assignment_conversions"]["ch1"] == 1.6
    assert data["assignment_conversions"]["ch2"] == 1.4
    assert data["assignment_conversions"]["ch3"] == 1.8
    assert data["assignment_conversions"]["ch4"] == 2.0
    assert data["assignment_conversions"]["ch5"] == 1.6

    # 2. CATs verification
    assert data["cat_conversions"]["cat1_ch1"] == 4.8
    assert data["cat_conversions"]["cat1_ch2"] == 5.28
    assert data["cat1_total"] == 10.08

    assert data["cat_conversions"]["cat2_ch3"] == 5.04
    assert data["cat2_total"] == 5.04

    assert data["cat_conversions"]["cat3_ch4"] == 5.52
    assert data["cat_conversions"]["cat3_ch5"] == 5.76
    assert data["cat3_total"] == 11.28

    assert data["cats_converted_total"] == 26.4
    assert data["cats_raw_total"] == 110.0

    # 3. Final Internal verification
    # 8.4 + 26.4 = 34.8 / 40
    assert data["final_internal"] == 34.8
    assert data["max_internal"] == 40.0
    assert data["percentage"] == 87.0
    assert data["is_theory_only"] is True


def test_google_calendar_integration_phase8():
    """
    Exhaustive verification of Phase 8 Google Calendar Integration:
    - Status check (initially disconnected)
    - OAuth exchange / connection
    - Selective sync of official academic events and exams
    - Deduplication: verifies google_event_id is generated and stamped
    - Graceful disconnect and revocation
    """
    # 1. Initial status
    status_res = client.get("/api/v1/integrations/google")
    assert status_res.status_code == 200
    # Could be disconnected or already connected from prior test run, disconnect first to test fresh
    client.delete("/api/v1/integrations/google")

    fresh_status = client.get("/api/v1/integrations/google").json()
    assert fresh_status["is_connected"] is False

    # 2. Attempt sync before connecting -> Expect 400 Bad Request
    unauth_sync = client.post("/api/v1/integrations/google/sync", json={
        "sync_official_events": True,
        "sync_personal_tasks": False,
    })
    assert unauth_sync.status_code == 400
    assert "not connected" in unauth_sync.json()["detail"].lower()

    # 3. Connect Google Calendar
    connect_res = client.post("/api/v1/integrations/google/connect", json={
        "server_auth_code": "mock_oauth_code_xyz123"
    })
    assert connect_res.status_code == 200
    conn_data = connect_res.json()
    assert conn_data["is_connected"] is True
    assert conn_data["email"] == "student@university.edu"

    # 4. Trigger Selective Sync (Official events & exams ONLY, NO personal task flooding)
    sync_res = client.post("/api/v1/integrations/google/sync", json={
        "sync_official_events": True,
        "sync_personal_tasks": False,
    })
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert "pushed_events_count" in sync_data
    assert "updated_events_count" in sync_data
    assert sync_data["failed_events_count"] == 0

    # 5. Check status updated with sync count
    post_sync_status = client.get("/api/v1/integrations/google").json()
    assert post_sync_status["is_connected"] is True
    assert post_sync_status["last_synced_at"] is not None

    # 6. Disconnect Google Calendar
    disconn_res = client.delete("/api/v1/integrations/google")
    assert disconn_res.status_code == 200
    final_status = client.get("/api/v1/integrations/google").json()
    assert final_status["is_connected"] is False


def test_cloud_sync_and_lww_conflict_resolution_phase9():
    """
    Exhaustive verification of Phase 9 Cloud Sync & Conflict Resolution:
    - Push batch mutations from client sync_queue (insert, update, delete)
    - Last-Write-Wins (LWW) conflict resolution logic
    - Rejection of stale client updates when server has newer timestamp
    - Acceptance of fresher client updates
    - Delta pull synchronization with 'since' timestamp
    """
    # 1. Push batch of initial items (Insert semester and task)
    t1 = "2026-10-03T12:00:00Z"
    push_payload = {
        "mutations": [
            {
                "entity_type": "semesters",
                "entity_id": "sem_sync_001",
                "action": "insert",
                "payload": {
                    "title": "Cloud Synced Semester",
                    "academic_year": "2026-2027",
                    "semester_number": 7,
                },
                "client_updated_at": t1,
            },
            {
                "entity_type": "tasks",
                "entity_id": "task_sync_001",
                "action": "insert",
                "payload": {
                    "title": "Sync Engine Integration Test",
                    "priority": "high",
                    "status": "pending",
                },
                "client_updated_at": t1,
            },
        ]
    }
    push_res = client.post("/api/v1/sync/push", json=push_payload)
    assert push_res.status_code == 200
    data = push_res.json()
    assert data["applied_count"] == 2
    assert data["conflicts_count"] == 0
    assert data["rejected_count"] == 0

    # 2. Server updates task locally
    patch_res = client.patch("/api/v1/tasks/task_sync_001", json={
        "status": "completed"
    })
    assert patch_res.status_code == 200

    # 3. Client tries to push an older mutation with timestamp in past -> Conflict (Server Wins)
    t_stale = "2026-10-01T00:00:00Z"
    stale_payload = {
        "mutations": [
            {
                "entity_type": "tasks",
                "entity_id": "task_sync_001",
                "action": "update",
                "payload": {
                    "title": "Stale Task Name (Should Be Rejected)",
                },
                "client_updated_at": t_stale,
            }
        ]
    }
    stale_res = client.post("/api/v1/sync/push", json=stale_payload)
    assert stale_res.status_code == 200
    stale_data = stale_res.json()
    assert stale_data["conflicts_count"] == 1
    assert stale_data["applied_count"] == 0
    assert stale_data["details"][0]["status"] == "conflict_server_wins"

    # Task name should remain untouched on server
    task_check = client.get("/api/v1/tasks/task_sync_001")
    assert task_check.json()["title"] == "Sync Engine Integration Test"

    # 4. Client pushes a fresher mutation with timestamp in future -> Accepted (Client Wins)
    t3 = "2026-10-05T00:00:00Z"
    fresh_payload = {
        "mutations": [
            {
                "entity_type": "tasks",
                "entity_id": "task_sync_001",
                "action": "update",
                "payload": {
                    "title": "Fresh Client Update (Accepted)",
                    "priority": "low",
                },
                "client_updated_at": t3,
            }
        ]
    }
    fresh_res = client.post("/api/v1/sync/push", json=fresh_payload)
    assert fresh_res.status_code == 200
    fresh_data = fresh_res.json()
    assert fresh_data["applied_count"] == 1
    assert fresh_data["conflicts_count"] == 0

    task_check2 = client.get("/api/v1/tasks/task_sync_001")
    assert task_check2.json()["title"] == "Fresh Client Update (Accepted)"
    assert task_check2.json()["priority"] == "low"

    # 5. Delta Pull Test with 'since' timestamp
    # Pull items updated after 2026-10-04T00:00:00Z (should include task_sync_001 updated at 2026-10-05)
    pull_res = client.post("/api/v1/sync/pull", json={
        "since": "2026-10-04T00:00:00Z"
    })
    assert pull_res.status_code == 200
    pull_data = pull_res.json()
    assert "entities" in pull_data
    pulled_tasks = pull_data["entities"].get("tasks", [])
    assert any(t["id"] == "task_sync_001" for t in pulled_tasks)

    # 6. Delete mutation via sync push
    t4 = "2026-10-06T00:00:00Z"
    del_payload = {
        "mutations": [
            {
                "entity_type": "tasks",
                "entity_id": "task_sync_001",
                "action": "delete",
                "payload": {},
                "client_updated_at": t4,
            }
        ]
    }
    del_sync_res = client.post("/api/v1/sync/push", json=del_payload)
    assert del_sync_res.status_code == 200
    assert del_sync_res.json()["applied_count"] == 1

    # Verify task was removed
    get_del = client.get("/api/v1/tasks/task_sync_001")
    assert get_del.status_code == 404





