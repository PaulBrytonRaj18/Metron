from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field, ConfigDict


class MarksCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    cat1: Optional[float] = None
    cat2: Optional[float] = None
    cat3: Optional[float] = None
    cat_max: float = 50.0
    assignments_score: Optional[float] = 85.0
    lab_score: Optional[float] = 90.0
    attendance_percent: Optional[float] = 95.0
    preset: str = Field(default="best_2_of_3", description="best_2_of_3 | best_2_of_3_cats | weighted_average | direct_sum | custom")
    custom_weights: Optional[Dict[str, float]] = None
    internal_max_scale: float = 50.0
    target_max_internal: Optional[float] = None
    items: Optional[List[Dict[str, Any]]] = None


class MarksCalculationResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    internal_score: float
    computed_internal_score: float
    internal_max: float
    internal_percentage: float
    percentage: float
    cat_contribution: float = 0.0
    assignment_contribution: float = 0.0
    lab_contribution: float = 0.0
    attendance_contribution: float = 0.0
    preset_used: str
    breakdown_notes: Optional[str] = None


class GradeProjectionRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    internal_score: Optional[float] = None
    current_internal_score: Optional[float] = None
    target_total_marks: Optional[float] = None
    target_overall_percentage: Optional[float] = None
    target_grade: str = "Target Grade"
    internal_max: Optional[float] = None
    max_internal_score: Optional[float] = None
    internal_weight_percent: Optional[float] = None
    final_exam_max: Optional[float] = None
    final_exam_max_marks: Optional[float] = None
    final_exam_weightage: Optional[float] = None
    final_exam_weight_percent: Optional[float] = None


class GradeProjectionResponse(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    target_grade: str
    target_total_marks: float
    current_internal_score: float
    required_final_exam_marks: float
    required_marks_on_final: float
    is_achievable: bool = True
    is_feasible: bool = True
    status_message: str


class TheoryMarksCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    # 5 chapter assignments (each out of 10)
    asgn_ch1: float = 0.0
    asgn_ch2: float = 0.0
    asgn_ch3: float = 0.0
    asgn_ch4: float = 0.0
    asgn_ch5: float = 0.0

    # CAT 1 (Chapters 1 & 2, each out of 25)
    cat1_ch1: float = 0.0
    cat1_ch2: float = 0.0

    # CAT 2 (Chapter 3, out of 25)
    cat2_ch3: float = 0.0

    # CAT 3 (Chapters 4 & 5, each out of 25)
    cat3_ch4: float = 0.0
    cat3_ch5: float = 0.0


class TheoryMarksCalculationResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    # Assignments
    assignments_raw_total: float  # /50
    assignments_converted_total: float  # /10
    assignment_conversions: Dict[str, float]

    # CATs
    cat1_total: float  # /12
    cat2_total: float  # /6
    cat3_total: float  # /12
    cats_raw_total: float  # /125
    cats_converted_total: float  # /30
    cat_conversions: Dict[str, float]

    # Final
    final_internal: float  # /40
    max_internal: float = 40.0
    percentage: float  # /100%
    is_theory_only: bool = True


