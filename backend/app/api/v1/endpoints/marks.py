from fastapi import APIRouter
from app.schemas.marks import (
    MarksCalculationRequest,
    MarksCalculationResponse,
    GradeProjectionRequest,
    GradeProjectionResponse,
    TheoryMarksCalculationRequest,
    TheoryMarksCalculationResponse,
)

router = APIRouter(prefix="/marks", tags=["Marks Engine"])


@router.post("/calculate", response_model=MarksCalculationResponse)
async def calculate_internal_marks(payload: MarksCalculationRequest):
    """Calculates internal marks based on selected presets, best 2 of 3 CATs, or weighted sums."""
    internal_max = payload.target_max_internal or payload.internal_max_scale or 50.0

    if payload.items:
        # Items-based calculation (Preset A: best 2 of 3 CATs, Preset B: weighted average, Preset C: direct sum)
        breakdown_notes = ""
        if payload.preset in ["best_2_of_3", "best_2_of_3_cats"]:
            cat_items = [it for it in payload.items if it.get("is_cat")]
            non_cat_items = [it for it in payload.items if not it.get("is_cat")]

            scored_cats = []
            for c in cat_items:
                mx = float(c.get("max_score", 50.0) or 50.0)
                ob = float(c.get("obtained_score", 0.0) or 0.0)
                pct = (ob / mx) * 100.0 if mx > 0 else 0.0
                scored_cats.append((pct, ob, mx, c))
            scored_cats.sort(key=lambda x: x[0], reverse=True)

            best2 = scored_cats[:2]
            avg_cat_pct = sum(x[0] for x in best2) / len(best2) if best2 else 0.0

            non_cat_pct = 0.0
            for nc in non_cat_items:
                mx = float(nc.get("max_score", 100.0) or 100.0)
                ob = float(nc.get("obtained_score", 0.0) or 0.0)
                wt = float(nc.get("weight_percent", 0.0) or 0.0)
                non_cat_pct += (ob / mx) * wt if mx > 0 else 0.0

            if non_cat_items:
                total_cat_weight = 100.0 - sum(float(nc.get("weight_percent", 0.0) or 0.0) for nc in non_cat_items)
                final_pct = (avg_cat_pct * total_cat_weight / 100.0) + non_cat_pct
            else:
                final_pct = avg_cat_pct

            internal_score = round((final_pct / 100.0) * internal_max, 1)
            breakdown_notes = f"Selected best 2 of 3 CATs ({', '.join([str(x[1]) for x in best2])})"
        elif payload.preset == "weighted_average":
            total_weighted_pct = 0.0
            for it in payload.items:
                mx = float(it.get("max_score", 100.0) or 100.0)
                ob = float(it.get("obtained_score", 0.0) or 0.0)
                wt = float(it.get("weight_percent", 0.0) or 0.0)
                total_weighted_pct += (ob / mx) * wt if mx > 0 else 0.0
            final_pct = total_weighted_pct
            internal_score = round((final_pct / 100.0) * internal_max, 1)
            breakdown_notes = f"Weighted normalized sum across {len(payload.items)} components"
        else:  # direct sum or custom
            total_ob = sum(float(it.get("obtained_score", 0.0) or 0.0) for it in payload.items)
            total_mx = sum(float(it.get("max_score", 50.0) or 50.0) for it in payload.items)
            final_pct = (total_ob / total_mx) * 100.0 if total_mx > 0 else 0.0
            internal_score = round(total_ob, 1)
            breakdown_notes = "Direct arithmetic summation of obtained points"

        return MarksCalculationResponse(
            internal_score=internal_score,
            computed_internal_score=internal_score,
            internal_max=internal_max,
            internal_percentage=round(final_pct, 1),
            percentage=round(final_pct, 1),
            preset_used=payload.preset,
            breakdown_notes=breakdown_notes,
        )

    # Flat fields fallback
    cat_max = payload.cat_max or 50.0
    cat_scores = []
    if payload.cat1 is not None:
        cat_scores.append(min(100.0, max(0.0, (payload.cat1 / cat_max) * 100.0)))
    if payload.cat2 is not None:
        cat_scores.append(min(100.0, max(0.0, (payload.cat2 / cat_max) * 100.0)))
    if payload.cat3 is not None:
        cat_scores.append(min(100.0, max(0.0, (payload.cat3 / cat_max) * 100.0)))

    asgn_pct = min(100.0, max(0.0, payload.assignments_score if payload.assignments_score is not None else 85.0))
    lab_pct = min(100.0, max(0.0, payload.lab_score if payload.lab_score is not None else 90.0))
    attend_pct = min(100.0, max(0.0, payload.attendance_percent if payload.attendance_percent is not None else 95.0))

    asgn_contrib = 0.0
    lab_contrib = 0.0
    attend_contrib = 0.0

    if payload.preset in ["best_2_of_3", "best_2_of_3_cats"]:
        cat_scores.sort(reverse=True)
        top2 = cat_scores[:2]
        cat_pct = sum(top2) / len(top2) if top2 else 0.0
        final_pct = cat_pct * 0.70 + asgn_pct * 0.20 + lab_pct * 0.10
        asgn_contrib = (asgn_pct * 0.20 * internal_max) / 100.0
        lab_contrib = (lab_pct * 0.10 * internal_max) / 100.0
    elif payload.preset == "weighted_average":
        cat_pct = sum(cat_scores) / len(cat_scores) if cat_scores else 0.0
        final_pct = cat_pct * 0.40 + asgn_pct * 0.30 + lab_pct * 0.20 + attend_pct * 0.10
        asgn_contrib = (asgn_pct * 0.30 * internal_max) / 100.0
        lab_contrib = (lab_pct * 0.20 * internal_max) / 100.0
        attend_contrib = (attend_pct * 0.10 * internal_max) / 100.0
    elif payload.preset == "direct_sum":
        raw_total = (payload.cat1 or 0.0) + (payload.cat2 or 0.0) + (payload.cat3 or 0.0)
        raw_max = cat_max * (len(cat_scores) or 1)
        cat_pct = (raw_total / raw_max) * 100.0 if raw_max > 0 else 0.0
        final_pct = cat_pct
    else:  # Custom
        weights = payload.custom_weights or {"cat": 0.40, "asgn": 0.30, "lab": 0.20, "attend": 0.10}
        cat_w = weights.get("cat", 0.40)
        asgn_w = weights.get("asgn", 0.30)
        lab_w = weights.get("lab", 0.20)
        attend_w = weights.get("attend", 0.10)
        cat_pct = sum(cat_scores) / len(cat_scores) if cat_scores else 0.0
        final_pct = cat_pct * cat_w + asgn_pct * asgn_w + lab_pct * lab_w + attend_pct * attend_w
        asgn_contrib = (asgn_pct * asgn_w * internal_max) / 100.0
        lab_contrib = (lab_pct * lab_w * internal_max) / 100.0
        attend_contrib = (attend_pct * attend_w * internal_max) / 100.0

    internal_score = round(min(internal_max, max(0.0, (final_pct * internal_max) / 100.0)), 1)
    cat_contrib = round(max(0.0, internal_score - asgn_contrib - lab_contrib - attend_contrib), 1)

    return MarksCalculationResponse(
        internal_score=internal_score,
        computed_internal_score=internal_score,
        internal_max=internal_max,
        internal_percentage=round(final_pct, 1),
        percentage=round(final_pct, 1),
        cat_contribution=cat_contrib,
        assignment_contribution=round(asgn_contrib, 1),
        lab_contribution=round(lab_contrib, 1),
        attendance_contribution=round(attend_contrib, 1),
        preset_used=payload.preset,
        breakdown_notes=f"Calculated with preset {payload.preset}",
    )


@router.post("/project-grade", response_model=GradeProjectionResponse)
async def project_target_grade(payload: GradeProjectionRequest):
    """Calculates required final examination marks to secure the student's target grade."""
    cur_internal = payload.current_internal_score if payload.current_internal_score is not None else (payload.internal_score or 0.0)
    target_marks = payload.target_overall_percentage if payload.target_overall_percentage is not None else (payload.target_total_marks or 80.0)
    final_max = payload.final_exam_max_marks if payload.final_exam_max_marks is not None else (payload.final_exam_max or 100.0)
    final_weight_frac = (payload.final_exam_weight_percent / 100.0) if payload.final_exam_weight_percent is not None else (payload.final_exam_weightage or 0.50)

    required_final_contrib = target_marks - cur_internal
    raw_final_needed = round(required_final_contrib / final_weight_frac, 1)
    is_feasible = (raw_final_needed <= final_max) and (raw_final_needed >= 0)

    if raw_final_needed > final_max:
        return GradeProjectionResponse(
            target_grade=payload.target_grade,
            target_total_marks=target_marks,
            current_internal_score=cur_internal,
            required_final_exam_marks=raw_final_needed,
            required_marks_on_final=raw_final_needed,
            is_achievable=False,
            is_feasible=False,
            status_message=f"Mathematically unattainable (Requires {raw_final_needed}/{final_max}). Maximum possible total is {round(cur_internal + final_max * final_weight_frac, 1)}%.",
        )

    if raw_final_needed <= 0:
        return GradeProjectionResponse(
            target_grade=payload.target_grade,
            target_total_marks=target_marks,
            current_internal_score=cur_internal,
            required_final_exam_marks=0.0,
            required_marks_on_final=0.0,
            is_achievable=True,
            is_feasible=True,
            status_message=f"Target grade already secured! Your internal score ({cur_internal}) guarantees this grade.",
        )

    return GradeProjectionResponse(
        target_grade=payload.target_grade,
        target_total_marks=target_marks,
        current_internal_score=cur_internal,
        required_final_exam_marks=raw_final_needed,
        required_marks_on_final=raw_final_needed,
        is_achievable=True,
        is_feasible=True,
        status_message=f"Achievable: Need {raw_final_needed} / {final_max} on final exam to secure {payload.target_grade} ({target_marks}%).",
    )


@router.post("/theory/calculate", response_model=TheoryMarksCalculationResponse)
async def calculate_theory_marks(payload: TheoryMarksCalculationRequest):
    """
    STRICT RULE: This calculation MUST ONLY be used for subjects classified as 'Theory'.
    Do NOT use for Lab subjects or Theory + Lab subjects.

    Theory 40-mark internal scheme:
    - 5 Chapter Assignments: (Raw / 10) * 2 = 10 Marks
    - CAT 1 (Ch 1 & 2): (Raw / 25) * 6 each = 12 Marks
    - CAT 2 (Ch 3): (Raw / 25) * 6          = 6 Marks
    - CAT 3 (Ch 4 & 5): (Raw / 25) * 6 each = 12 Marks
    Total Internal = 10 + 12 + 6 + 12 = 40 Marks
    """
    def clamp_asgn(val: float) -> float:
        return min(10.0, max(0.0, float(val or 0.0)))

    def clamp_cat(val: float) -> float:
        return min(25.0, max(0.0, float(val or 0.0)))

    def r2(val: float) -> float:
        return round(val, 2)

    # 1. Assignments (/10)
    ch1_raw = clamp_asgn(payload.asgn_ch1)
    ch2_raw = clamp_asgn(payload.asgn_ch2)
    ch3_raw = clamp_asgn(payload.asgn_ch3)
    ch4_raw = clamp_asgn(payload.asgn_ch4)
    ch5_raw = clamp_asgn(payload.asgn_ch5)

    ch1_conv = r2((ch1_raw / 10.0) * 2.0)
    ch2_conv = r2((ch2_raw / 10.0) * 2.0)
    ch3_conv = r2((ch3_raw / 10.0) * 2.0)
    ch4_conv = r2((ch4_raw / 10.0) * 2.0)
    ch5_conv = r2((ch5_raw / 10.0) * 2.0)

    asgn_raw_total = r2(ch1_raw + ch2_raw + ch3_raw + ch4_raw + ch5_raw)
    asgn_conv_total = r2(ch1_conv + ch2_conv + ch3_conv + ch4_conv + ch5_conv)

    # 2. CATs (/30)
    c1_ch1_raw = clamp_cat(payload.cat1_ch1)
    c1_ch2_raw = clamp_cat(payload.cat1_ch2)
    c2_ch3_raw = clamp_cat(payload.cat2_ch3)
    c3_ch4_raw = clamp_cat(payload.cat3_ch4)
    c3_ch5_raw = clamp_cat(payload.cat3_ch5)

    c1_ch1_conv = r2((c1_ch1_raw / 25.0) * 6.0)
    c1_ch2_conv = r2((c1_ch2_raw / 25.0) * 6.0)
    cat1_total = r2(c1_ch1_conv + c1_ch2_conv)

    c2_ch3_conv = r2((c2_ch3_raw / 25.0) * 6.0)
    cat2_total = r2(c2_ch3_conv)

    c3_ch4_conv = r2((c3_ch4_raw / 25.0) * 6.0)
    c3_ch5_conv = r2((c3_ch5_raw / 25.0) * 6.0)
    cat3_total = r2(c3_ch4_conv + c3_ch5_conv)

    cats_raw_total = r2(c1_ch1_raw + c1_ch2_raw + c2_ch3_raw + c3_ch4_raw + c3_ch5_raw)
    cats_conv_total = r2(cat1_total + cat2_total + cat3_total)

    # 3. Final Internal (/40)
    final_internal = r2(asgn_conv_total + cats_conv_total)
    percentage = r2((final_internal / 40.0) * 100.0)

    return TheoryMarksCalculationResponse(
        assignments_raw_total=asgn_raw_total,
        assignments_converted_total=asgn_conv_total,
        assignment_conversions={
            "ch1": ch1_conv,
            "ch2": ch2_conv,
            "ch3": ch3_conv,
            "ch4": ch4_conv,
            "ch5": ch5_conv,
        },
        cat1_total=cat1_total,
        cat2_total=cat2_total,
        cat3_total=cat3_total,
        cats_raw_total=cats_raw_total,
        cats_converted_total=cats_conv_total,
        cat_conversions={
            "cat1_ch1": c1_ch1_conv,
            "cat1_ch2": c1_ch2_conv,
            "cat2_ch3": c2_ch3_conv,
            "cat3_ch4": c3_ch4_conv,
            "cat3_ch5": c3_ch5_conv,
        },
        final_internal=final_internal,
        max_internal=40.0,
        percentage=percentage,
        is_theory_only=True,
    )

