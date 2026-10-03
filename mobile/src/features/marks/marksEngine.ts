/**
 * Metron Configurable Marks & Internal Calculator Engine
 * Conforms strictly to PRD Section 14 and TAD Section 8.
 * Zero college-specific hardcoding: fully configurable weights, presets, and target projections.
 */

export type MarksPreset = "best_2_of_3" | "weighted_average" | "direct_sum" | "custom";

export interface InternalMarksInput {
  cat1?: number; // e.g. out of 50
  cat2?: number; // e.g. out of 50
  cat3?: number; // e.g. out of 50
  catMax?: number; // default 50
  assignmentsScore?: number; // e.g. average assignment percentage or score
  labScore?: number; // e.g. average lab record percentage or score
  attendancePercent?: number; // 0 - 100%
  preset: MarksPreset;
  customWeights?: {
    catWeight: number; // e.g. 0.40
    asgnWeight: number; // e.g. 0.30
    labWeight: number; // e.g. 0.20
    attendWeight: number; // e.g. 0.10
  };
  internalMaxScale?: number; // target internal total (default 50.0)
}

export interface InternalMarksResult {
  internalScore: number;
  internalMax: number;
  internalPercentage: number;
  catContribution: number;
  assignmentContribution: number;
  labContribution: number;
  attendanceContribution: number;
  presetUsed: MarksPreset;
}

export interface TargetGradeProjection {
  targetGrade: string;
  targetTotalMarks: number; // e.g. 90 for O, 80 for A+
  currentInternalScore: number;
  finalExamMax: number; // usually 100
  finalExamWeightage: number; // e.g. 0.50 (50% final exam)
  requiredFinalExamMarks: number;
  isAchievable: boolean;
  statusMessage: string;
}

/**
 * Calculates internal marks based on selected preset and components.
 */
export function calculateInternalMarks(input: InternalMarksInput): InternalMarksResult {
  const catMax = input.catMax || 50.0;
  const internalMax = input.internalMaxScale || 50.0;

  // Gather available CAT scores normalized to percentage (0 - 100)
  const catScores: number[] = [];
  if (input.cat1 !== undefined && !isNaN(input.cat1)) catScores.push(Math.min(100, Math.max(0, (input.cat1 / catMax) * 100)));
  if (input.cat2 !== undefined && !isNaN(input.cat2)) catScores.push(Math.min(100, Math.max(0, (input.cat2 / catMax) * 100)));
  if (input.cat3 !== undefined && !isNaN(input.cat3)) catScores.push(Math.min(100, Math.max(0, (input.cat3 / catMax) * 100)));

  const asgnPct = input.assignmentsScore !== undefined ? Math.min(100, Math.max(0, input.assignmentsScore)) : 85.0;
  const labPct = input.labScore !== undefined ? Math.min(100, Math.max(0, input.labScore)) : 90.0;
  const attendPct = input.attendancePercent !== undefined ? Math.min(100, Math.max(0, input.attendancePercent)) : 95.0;

  let finalPct = 0;
  let catPct = 0;
  let asgnContribution = 0;
  let labContribution = 0;
  let attendContribution = 0;

  if (input.preset === "best_2_of_3") {
    // Sort descending and take best 2 (or all if < 2)
    catScores.sort((a, b) => b - a);
    const top2 = catScores.slice(0, 2);
    catPct = top2.length > 0 ? top2.reduce((a, b) => a + b, 0) / top2.length : 0;

    // Blend: 70% Best 2 CATs + 20% Assignments + 10% Lab
    finalPct = catPct * 0.70 + asgnPct * 0.20 + labPct * 0.10;
    asgnContribution = (asgnPct * 0.20 * internalMax) / 100;
    labContribution = (labPct * 0.10 * internalMax) / 100;
  } else if (input.preset === "weighted_average") {
    // 40% CATs + 30% Assignments + 20% Lab + 10% Attendance
    catPct = catScores.length > 0 ? catScores.reduce((a, b) => a + b, 0) / catScores.length : 0;
    finalPct = catPct * 0.40 + asgnPct * 0.30 + labPct * 0.20 + attendPct * 0.10;

    asgnContribution = (asgnPct * 0.30 * internalMax) / 100;
    labContribution = (labPct * 0.20 * internalMax) / 100;
    attendContribution = (attendPct * 0.10 * internalMax) / 100;
  } else if (input.preset === "direct_sum") {
    // Raw sum scaled
    const rawTotal = (input.cat1 || 0) + (input.cat2 || 0) + (input.cat3 || 0);
    const rawMax = catMax * (catScores.length || 1);
    catPct = rawMax > 0 ? (rawTotal / rawMax) * 100 : 0;
    finalPct = catPct;
  } else if (input.preset === "custom" && input.customWeights) {
    const { catWeight, asgnWeight, labWeight, attendWeight } = input.customWeights;
    catPct = catScores.length > 0 ? catScores.reduce((a, b) => a + b, 0) / catScores.length : 0;
    finalPct = catPct * catWeight + asgnPct * asgnWeight + labPct * labWeight + attendPct * attendWeight;

    asgnContribution = (asgnPct * asgnWeight * internalMax) / 100;
    labContribution = (labPct * labWeight * internalMax) / 100;
    attendContribution = (attendPct * attendWeight * internalMax) / 100;
  }

  const internalScore = Math.round(((finalPct * internalMax) / 100) * 10) / 10;
  const catContribution = Math.round((internalScore - asgnContribution - labContribution - attendContribution) * 10) / 10;

  return {
    internalScore: Math.min(internalMax, Math.max(0, internalScore)),
    internalMax,
    internalPercentage: Math.round(finalPct * 10) / 10,
    catContribution: Math.max(0, catContribution),
    assignmentContribution: Math.round(asgnContribution * 10) / 10,
    labContribution: Math.round(labContribution * 10) / 10,
    attendanceContribution: Math.round(attendContribution * 10) / 10,
    presetUsed: input.preset,
  };
}

/**
 * Projects required end-semester marks to achieve target grade.
 */
export function projectTargetFinalScore(
  internalScore: number,
  targetTotalMarks: number,
  targetGradeTitle: string = "O Grade",
  internalMax: number = 50.0,
  finalExamMax: number = 100.0,
  finalExamWeightage: number = 0.50
): TargetGradeProjection {
  // Required contribution from Final Exam = Target Total - Internal Score
  const requiredFinalContribution = targetTotalMarks - internalScore;

  // Convert contribution to raw final exam score:
  // Raw Final = Required Contribution / Final Weightage
  const rawFinalNeeded = requiredFinalContribution / finalExamWeightage;
  const clampedRaw = Math.round(rawFinalNeeded * 10) / 10;

  if (clampedRaw > finalExamMax) {
    return {
      targetGrade: targetGradeTitle,
      targetTotalMarks,
      currentInternalScore: internalScore,
      finalExamMax,
      finalExamWeightage,
      requiredFinalExamMarks: clampedRaw,
      isAchievable: false,
      statusMessage: `Mathematically unattainable (Requires ${clampedRaw}/${finalExamMax}). Maximum possible score is ${Math.round((internalScore + finalExamMax * finalExamWeightage) * 10) / 10}.`,
    };
  }

  if (clampedRaw <= 0) {
    return {
      targetGrade: targetGradeTitle,
      targetTotalMarks,
      currentInternalScore: internalScore,
      finalExamMax,
      finalExamWeightage,
      requiredFinalExamMarks: 0,
      isAchievable: true,
      statusMessage: `Grade already secured! Your internal score (${internalScore}/${internalMax}) guarantees this target even with 0 on finals.`,
    };
  }

  return {
    targetGrade: targetGradeTitle,
    targetTotalMarks,
    currentInternalScore: internalScore,
    finalExamMax,
    finalExamWeightage,
    requiredFinalExamMarks: clampedRaw,
    isAchievable: true,
    statusMessage: `Achievable: Need ${clampedRaw} / ${finalExamMax} on Final Exam to lock in ${targetGradeTitle} (${targetTotalMarks}%).`,
  };
}

/**
 * ============================================================================
 * THEORY SUBJECT ONLY — INTERNAL MARK CALCULATOR (40 MARKS SCHEME)
 * ============================================================================
 * STRICT RULE: This calculation MUST ONLY be used for subjects classified as "Theory".
 * Do NOT use for Lab subjects or Theory + Lab (Hybrid) subjects.
 *
 * Scheme:
 * - Assignments: 5 Chapters x (Raw / 10) * 2 = Max 10 Marks
 * - CAT 1: Ch1 (/25 -> /6) + Ch2 (/25 -> /6) = Max 12 Marks
 * - CAT 2: Ch3 (/25 -> /6)                   = Max 6 Marks
 * Total Internal = 10 + 12 + 6 + 12 = 40 Marks
 */

export type CourseClassification =
  | "THEORY COURSES"
  | "LABORATORY ORIENTED THEORY COURSE"
  | "LABORATORY COURSES"
  | "INDUSTRY ORIENTED COURSE";

export const COURSE_CLASSIFICATIONS: CourseClassification[] = [
  "THEORY COURSES",
  "LABORATORY ORIENTED THEORY COURSE",
  "LABORATORY COURSES",
  "INDUSTRY ORIENTED COURSE",
];

export function normalizeCourseCategory(category?: string): CourseClassification {
  if (!category) return "THEORY COURSES";
  const clean = category.trim().toUpperCase();
  if (
    clean.includes("LABORATORY ORIENTED") ||
    clean.includes("LAB ORIENTED") ||
    clean.includes("THEORY + LAB") ||
    clean === "HYBRID"
  ) {
    return "LABORATORY ORIENTED THEORY COURSE";
  }
  if (clean.includes("INDUSTRY")) {
    return "INDUSTRY ORIENTED COURSE";
  }
  if (clean.includes("LABORATORY") || clean === "LAB") {
    return "LABORATORY COURSES";
  }
  return "THEORY COURSES";
}

export function isTheoryCourse(category?: string): boolean {
  if (!category) return false;
  const clean = category.trim().toUpperCase();
  if (
    clean.includes("LABORATORY ORIENTED") ||
    clean.includes("LAB ORIENTED") ||
    clean.includes("THEORY + LAB") ||
    clean === "HYBRID" ||
    clean.includes("INDUSTRY") ||
    clean.includes("LABORATORY") ||
    clean === "LAB"
  ) {
    return false;
  }
  return clean === "THEORY COURSES" || clean === "THEORY" || clean.startsWith("THEORY");
}

export interface TheoryAssignmentScores {
  ch1: number; // raw / 10
  ch2: number; // raw / 10
  ch3: number; // raw / 10
  ch4: number; // raw / 10
  ch5: number; // raw / 10
}

export interface TheoryCatScores {
  cat1Ch1: number; // raw / 25
  cat1Ch2: number; // raw / 25
  cat2Ch3: number; // raw / 25
  cat3Ch4: number; // raw / 25
  cat3Ch5: number; // raw / 25
}

export interface TheoryInternalMarksResult {
  // Assignments (/10)
  assignments: {
    ch1Raw: number;
    ch1Converted: number; // /2
    ch2Raw: number;
    ch2Converted: number; // /2
    ch3Raw: number;
    ch3Converted: number; // /2
    ch4Raw: number;
    ch4Converted: number; // /2
    ch5Raw: number;
    ch5Converted: number; // /2
    rawTotal: number; // /50
    convertedTotal: number; // /10
  };
  // CATs (/30)
  cats: {
    cat1Ch1Raw: number;
    cat1Ch1Converted: number; // /6
    cat1Ch2Raw: number;
    cat1Ch2Converted: number; // /6
    cat1Total: number; // /12

    cat2Ch3Raw: number;
    cat2Ch3Converted: number; // /6
    cat2Total: number; // /6

    cat3Ch4Raw: number;
    cat3Ch4Converted: number; // /6
    cat3Ch5Raw: number;
    cat3Ch5Converted: number; // /6
    cat3Total: number; // /12

    rawTotal: number; // /125
    convertedTotal: number; // /30
  };
  // Final Internal (/40)
  finalInternal: number;
  maxInternal: 40;
  internalPercentage: number; // 0 - 100%
}

export interface TheoryTargetProjection {
  targetGrade: string;
  targetTotalMarks: number; // e.g. 80, 90
  currentInternalMarks: number; // /40
  finalExamWeightMarks: number; // 60 marks
  requiredMarksOutOf60: number; // required out of 60
  requiredMarksOutOf100: number; // equivalent on a 100-mark paper (out of 100)
  isAchievable: boolean;
  statusMessage: string;
}

const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Calculates internal marks for THEORY SUBJECTS ONLY according to the 40-mark scheme.
 */
export function calculateTheoryInternalMarks(
  assignments: TheoryAssignmentScores,
  cats: TheoryCatScores
): TheoryInternalMarksResult {
  // 1. Assignment Conversions: (Raw / 10) * 2
  const clampAsgn = (val: number) => (isNaN(val) ? 0 : Math.min(10, Math.max(0, val)));
  const ch1Raw = clampAsgn(assignments.ch1);
  const ch2Raw = clampAsgn(assignments.ch2);
  const ch3Raw = clampAsgn(assignments.ch3);
  const ch4Raw = clampAsgn(assignments.ch4);
  const ch5Raw = clampAsgn(assignments.ch5);

  const ch1Converted = round2((ch1Raw / 10) * 2);
  const ch2Converted = round2((ch2Raw / 10) * 2);
  const ch3Converted = round2((ch3Raw / 10) * 2);
  const ch4Converted = round2((ch4Raw / 10) * 2);
  const ch5Converted = round2((ch5Raw / 10) * 2);

  const asgnRawTotal = round2(ch1Raw + ch2Raw + ch3Raw + ch4Raw + ch5Raw);
  const asgnConvertedTotal = round2(
    ch1Converted + ch2Converted + ch3Converted + ch4Converted + ch5Converted
  );

  // 2. CAT Conversions: (Raw / 25) * 6
  const clampCat = (val: number) => (isNaN(val) ? 0 : Math.min(25, Math.max(0, val)));
  const cat1Ch1Raw = clampCat(cats.cat1Ch1);
  const cat1Ch2Raw = clampCat(cats.cat1Ch2);
  const cat2Ch3Raw = clampCat(cats.cat2Ch3);
  const cat3Ch4Raw = clampCat(cats.cat3Ch4);
  const cat3Ch5Raw = clampCat(cats.cat3Ch5);

  const cat1Ch1Converted = round2((cat1Ch1Raw / 25) * 6);
  const cat1Ch2Converted = round2((cat1Ch2Raw / 25) * 6);
  const cat1Total = round2(cat1Ch1Converted + cat1Ch2Converted);

  const cat2Ch3Converted = round2((cat2Ch3Raw / 25) * 6);
  const cat2Total = round2(cat2Ch3Converted);

  const cat3Ch4Converted = round2((cat3Ch4Raw / 25) * 6);
  const cat3Ch5Converted = round2((cat3Ch5Raw / 25) * 6);
  const cat3Total = round2(cat3Ch4Converted + cat3Ch5Converted);

  const catsRawTotal = round2(
    cat1Ch1Raw + cat1Ch2Raw + cat2Ch3Raw + cat3Ch4Raw + cat3Ch5Raw
  );
  const catsConvertedTotal = round2(cat1Total + cat2Total + cat3Total);

  // 3. Final Internal Mark (/40)
  const finalInternal = round2(asgnConvertedTotal + catsConvertedTotal);
  const internalPercentage = round2((finalInternal / 40) * 100);

  return {
    assignments: {
      ch1Raw,
      ch1Converted,
      ch2Raw,
      ch2Converted,
      ch3Raw,
      ch3Converted,
      ch4Raw,
      ch4Converted,
      ch5Raw,
      ch5Converted,
      rawTotal: asgnRawTotal,
      convertedTotal: asgnConvertedTotal,
    },
    cats: {
      cat1Ch1Raw,
      cat1Ch1Converted,
      cat1Ch2Raw,
      cat1Ch2Converted,
      cat1Total,

      cat2Ch3Raw,
      cat2Ch3Converted,
      cat2Total,

      cat3Ch4Raw,
      cat3Ch4Converted,
      cat3Ch5Raw,
      cat3Ch5Converted,
      cat3Total,

      rawTotal: catsRawTotal,
      convertedTotal: catsConvertedTotal,
    },
    finalInternal,
    maxInternal: 40,
    internalPercentage,
  };
}

/**
 * Projects final exam score needed for Theory Subjects:
 * Internal is /40, Semester Final Exam is /60 (Total = 100).
 */
export function projectTheoryFinalScore(
  internalMarks: number, // /40
  targetTotalMarks: number, // e.g. 80, 90
  targetGradeTitle: string = "A+ Grade"
): TheoryTargetProjection {
  // Required contribution on the 60-mark final exam = Target (out of 100) - Internal (out of 40)
  const neededOutOf60 = round2(targetTotalMarks - internalMarks);
  const neededOutOf100 = round2((neededOutOf60 / 60) * 100);

  if (neededOutOf60 > 60) {
    return {
      targetGrade: targetGradeTitle,
      targetTotalMarks,
      currentInternalMarks: internalMarks,
      finalExamWeightMarks: 60,
      requiredMarksOutOf60: neededOutOf60,
      requiredMarksOutOf100: neededOutOf100,
      isAchievable: false,
      statusMessage: `Mathematically unattainable (Requires ${neededOutOf60}/60 on finals, or ${neededOutOf100}/100 on written paper). Maximum possible course score is ${round2(internalMarks + 60)}%.`,
    };
  }

  if (neededOutOf60 <= 0) {
    return {
      targetGrade: targetGradeTitle,
      targetTotalMarks,
      currentInternalMarks: internalMarks,
      finalExamWeightMarks: 60,
      requiredMarksOutOf60: 0,
      requiredMarksOutOf100: 0,
      isAchievable: true,
      statusMessage: `Target grade already secured! Your internal score (${internalMarks}/40) guarantees ${targetGradeTitle} (${targetTotalMarks}%) even with 0 on finals.`,
    };
  }

  return {
    targetGrade: targetGradeTitle,
    targetTotalMarks,
    currentInternalMarks: internalMarks,
    finalExamWeightMarks: 60,
    requiredMarksOutOf60: neededOutOf60,
    requiredMarksOutOf100: neededOutOf100,
    isAchievable: true,
    statusMessage: `Achievable: Need ${neededOutOf60} / 60 on finals (${neededOutOf100} / 100 on exam paper) to lock in ${targetGradeTitle} (${targetTotalMarks}%).`,
  };
}

