import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../app/navigation/types";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Header } from "../../components/ui/Header";
import { useAppStore, Subject } from "../../store/useAppStore";
import {
  calculateTheoryInternalMarks,
  projectTheoryFinalScore,
  normalizeCourseCategory,
  isTheoryCourse,
  CourseClassification,
} from "./marksEngine";

type MarksRouteProp = RouteProp<RootStackParamList, "MarksCalculator">;

type FilterTab = "ALL" | CourseClassification;

export const MarksCalculatorScreen: React.FC = () => {
  const route = useRoute<MarksRouteProp>();
  const initialSubjectId = route.params?.subjectId;

  const { subjects, assignments, exams } = useAppStore();

  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("ALL");

  // Select initial subject (preferring theory if available)
  const theorySubjects = subjects.filter((s) => isTheoryCourse(s.category));
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId) return initialSubjectId;
    return theorySubjects[0]?.id || subjects[0]?.id || "";
  });

  // Assignments raw marks (out of 10) - starts blank, dynamically loaded from subject data or example
  const [asgn1, setAsgn1] = useState("");
  const [asgn2, setAsgn2] = useState("");
  const [asgn3, setAsgn3] = useState("");
  const [asgn4, setAsgn4] = useState("");
  const [asgn5, setAsgn5] = useState("");

  // CATs raw marks per chapter (out of 25) - starts blank, dynamically loaded
  const [cat1Ch1, setCat1Ch1] = useState("");
  const [cat1Ch2, setCat1Ch2] = useState("");
  const [cat2Ch3, setCat2Ch3] = useState("");
  const [cat3Ch4, setCat3Ch4] = useState("");
  const [cat3Ch5, setCat3Ch5] = useState("");

  // Demo mode toggle when a non-theory course is selected
  const [demoMode, setDemoMode] = useState(false);

  // Target Grade Projection State
  const [targetGrade, setTargetGrade] = useState<{ grade: string; targetPct: number }>({
    grade: "A+ Grade",
    targetPct: 80,
  });

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedCourseCategory = normalizeCourseCategory(selectedSubject?.category);
  const isTheory = isTheoryCourse(selectedSubject?.category) || demoMode;

  // Filter subjects for horizontal chips
  const visibleSubjects = subjects.filter((s) => {
    if (activeFilterTab === "ALL") return true;
    return normalizeCourseCategory(s.category) === activeFilterTab;
  });

  // Auto-fill from actual subject data
  const handleAutoFill = () => {
    if (!selectedSubjectId) return;

    // Load available assignments for this subject
    const subjAsgns = assignments[selectedSubjectId] || [];
    if (subjAsgns.length > 0) {
      if (subjAsgns[0]?.obtained_marks !== undefined) setAsgn1(String(subjAsgns[0].obtained_marks));
      if (subjAsgns[1]?.obtained_marks !== undefined) setAsgn2(String(subjAsgns[1].obtained_marks));
      if (subjAsgns[2]?.obtained_marks !== undefined) setAsgn3(String(subjAsgns[2].obtained_marks));
      if (subjAsgns[3]?.obtained_marks !== undefined) setAsgn4(String(subjAsgns[3].obtained_marks));
      if (subjAsgns[4]?.obtained_marks !== undefined) setAsgn5(String(subjAsgns[4].obtained_marks));
    }

    // Load available CAT exams for this subject
    const subjExams = exams.filter((e) => e.subject_id === selectedSubjectId);
    const cat1 = subjExams.find((e) => e.exam_type === "CAT1" && e.obtained_marks !== undefined);
    const cat2 = subjExams.find((e) => e.exam_type === "CAT2" && e.obtained_marks !== undefined);
    const cat3 = subjExams.find((e) => e.exam_type === "CAT3" && e.obtained_marks !== undefined);

    if (cat1?.obtained_marks !== undefined) {
      const half = Math.min(25, Math.round(cat1.obtained_marks / 2));
      setCat1Ch1(String(half));
      setCat1Ch2(String(Math.min(25, cat1.obtained_marks - half)));
    }
    if (cat2?.obtained_marks !== undefined) {
      setCat2Ch3(String(Math.min(25, cat2.obtained_marks)));
    }
    if (cat3?.obtained_marks !== undefined) {
      const half = Math.min(25, Math.round(cat3.obtained_marks / 2));
      setCat3Ch4(String(half));
      setCat3Ch5(String(Math.min(25, cat3.obtained_marks - half)));
    }
  };

  const handleLoadExample = () => {
    setAsgn1("8");
    setAsgn2("7");
    setAsgn3("9");
    setAsgn4("10");
    setAsgn5("8");

    setCat1Ch1("20");
    setCat1Ch2("22");
    setCat2Ch3("21");
    setCat3Ch4("23");
    setCat3Ch5("24");
  };

  const handleReset = () => {
    setAsgn1("");
    setAsgn2("");
    setAsgn3("");
    setAsgn4("");
    setAsgn5("");
    setCat1Ch1("");
    setCat1Ch2("");
    setCat2Ch3("");
    setCat3Ch4("");
    setCat3Ch5("");
  };

  const handleSwitchToTheory = () => {
    if (theorySubjects.length > 0) {
      setSelectedSubjectId(theorySubjects[0].id);
      setActiveFilterTab("THEORY COURSES");
      setDemoMode(false);
    } else {
      setDemoMode(true);
    }
  };

  useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    }
  }, [initialSubjectId]);

  useEffect(() => {
    if (selectedSubjectId) {
      handleAutoFill();
    }
  }, [selectedSubjectId]);

  // Calculations for Theory Subject (/40)
  const theoryResult = calculateTheoryInternalMarks(
    {
      ch1: parseFloat(asgn1) || 0,
      ch2: parseFloat(asgn2) || 0,
      ch3: parseFloat(asgn3) || 0,
      ch4: parseFloat(asgn4) || 0,
      ch5: parseFloat(asgn5) || 0,
    },
    {
      cat1Ch1: parseFloat(cat1Ch1) || 0,
      cat1Ch2: parseFloat(cat1Ch2) || 0,
      cat2Ch3: parseFloat(cat2Ch3) || 0,
      cat3Ch4: parseFloat(cat3Ch4) || 0,
      cat3Ch5: parseFloat(cat3Ch5) || 0,
    }
  );

  const projection = projectTheoryFinalScore(
    theoryResult.finalInternal,
    targetGrade.targetPct,
    targetGrade.grade
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="INTERNAL CALCULATOR" showSemesterBadge={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* COURSE CLASSIFICATION TABS */}
        <View style={styles.section}>
          <Text style={Typography.caption}>CURRICULUM COURSE CLASSIFICATION:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36 }}>
            {[
              { id: "ALL", label: "All Courses" },
              { id: "THEORY COURSES", label: "Theory Courses" },
              { id: "LABORATORY ORIENTED THEORY COURSE", label: "Lab Oriented Theory" },
              { id: "LABORATORY COURSES", label: "Laboratory Courses" },
              { id: "INDUSTRY ORIENTED COURSE", label: "Industry Oriented" },
            ].map((tab) => {
              const isSelected = activeFilterTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveFilterTab(tab.id as FilterTab)}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* SUBJECT SELECTOR */}
        {visibleSubjects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={Typography.caption}>ACTIVE EVALUATION SUBJECT:</Text>
              {selectedSubject && (
                <Badge
                  label={normalizeCourseCategory(selectedSubject.category)}
                  variant={isTheoryCourse(selectedSubject.category) ? "primary" : "warning"}
                  size="sm"
                />
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 38 }}>
              {visibleSubjects.map((s) => {
                const isSelected = selectedSubjectId === s.id;
                const isSubjTheory = isTheoryCourse(s.category);
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      setSelectedSubjectId(s.id);
                      setDemoMode(false);
                    }}
                    style={[
                      styles.subChip,
                      isSelected && {
                        borderColor: s.color_accent,
                        backgroundColor: `${s.color_accent}22`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subChipText,
                        isSelected && { color: s.color_accent, fontWeight: "700" },
                      ]}
                    >
                      {s.code ? `${s.code} • ` : ""}
                      {s.name}
                      {!isSubjTheory ? " ⏳" : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ==================================================================== */}
        {/* CASE A: NON-THEORY COURSE SELECTED -> SHOW UPDATE CALCULATOR MESSAGE */}
        {/* ==================================================================== */}
        {!isTheory && (
          <View style={styles.pendingContainer}>
            {/* NOTICE BANNER */}
            <Card variant="accent" style={styles.pendingCard}>
              <View style={styles.pendingHeaderRow}>
                <Text style={styles.pendingIcon}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Badge
                    label="CALCULATION METHOD PENDING UPDATE"
                    variant="warning"
                    size="sm"
                  />
                  <Text style={[Typography.h3, { marginTop: 4 }]}>
                    {selectedSubject?.name || "Selected Course"}
                  </Text>
                  <Text style={styles.pendingSubjCategory}>
                    {selectedCourseCategory}
                  </Text>
                </View>
              </View>

              <View style={styles.pendingDivider} />

              <View style={styles.pendingMessageBox}>
                <Text style={styles.pendingMessageTitle}>
                  ⚠️ Calculation method for this course will be updated later
                </Text>
                <Text style={styles.pendingMessageBody}>
                  The current internal mark calculation (5 Chapter Assignments + CAT 1/2/3) is configured{" "}
                  <Text style={{ fontWeight: "800", color: Colors.textPrimary }}>
                    ONLY for THEORY COURSES
                  </Text>
                  .
                </Text>
                <Text style={[styles.pendingMessageBody, { marginTop: 6 }]}>
                  The assessment formula for{" "}
                  <Text style={{ fontWeight: "700", color: Colors.warning }}>
                    {selectedCourseCategory}
                  </Text>{" "}
                  will be updated soon. Until then, please update the calculator when the evaluation regulations are provided.
                </Text>
              </View>

              {/* ACTION BUTTONS */}
              <View style={styles.pendingActionsRow}>
                {theorySubjects.length > 0 && (
                  <TouchableOpacity
                    style={styles.switchTheoryPrimaryBtn}
                    onPress={handleSwitchToTheory}
                  >
                    <Text style={styles.switchTheoryPrimaryBtnText}>
                      Switch to Theory Course Calculator →
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.previewDemoBtn}
                  onPress={() => setDemoMode(true)}
                >
                  <Text style={styles.previewDemoBtnText}>
                    Show Theory Calculator Demo
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* CURRICULUM CLASSIFICATION REFERENCE CARD */}
            <Card variant="default" style={styles.curriculumReferenceCard}>
              <Text style={Typography.h3}>SEMESTER COURSE STRUCTURE</Text>
              <Text style={[Typography.caption, { marginBottom: Spacing.sm }]}>
                Overview of how courses are classified in the syllabus:
              </Text>

              <View style={styles.curriculumItem}>
                <View style={styles.curriculumItemHeader}>
                  <Text style={styles.curriculumItemTitle}>1. THEORY COURSES</Text>
                  <Badge label="ACTIVE (/40)" variant="success" size="sm" />
                </View>
                <Text style={styles.curriculumItemDesc}>
                  Evaluated via 5 Chapter Assignments (10m) + CAT 1 (12m) + CAT 2 (6m) + CAT 3 (12m) = 40 Internal Marks.
                </Text>
              </View>

              <View style={styles.curriculumItem}>
                <View style={styles.curriculumItemHeader}>
                  <Text style={styles.curriculumItemTitle}>2. LABORATORY ORIENTED THEORY COURSE</Text>
                  <Badge label="UPDATE PENDING" variant="warning" size="sm" />
                </View>
                <Text style={styles.curriculumItemDesc}>
                  Combined Lecture (L) + Practical (P) periods. Assessment scheme to be configured.
                </Text>
              </View>

              <View style={styles.curriculumItem}>
                <View style={styles.curriculumItemHeader}>
                  <Text style={styles.curriculumItemTitle}>3. LABORATORY COURSES</Text>
                  <Badge label="UPDATE PENDING" variant="warning" size="sm" />
                </View>
                <Text style={styles.curriculumItemDesc}>
                  Practical laboratory coursework with observation & record marks.
                </Text>
              </View>

              <View style={[styles.curriculumItem, { borderBottomWidth: 0 }]}>
                <View style={styles.curriculumItemHeader}>
                  <Text style={styles.curriculumItemTitle}>4. INDUSTRY ORIENTED COURSE</Text>
                  <Badge label="UPDATE PENDING" variant="warning" size="sm" />
                </View>
                <Text style={styles.curriculumItemDesc}>
                  Specialized skill/industry curriculum module.
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* ==================================================================== */}
        {/* CASE B: THEORY COURSE SELECTED -> ACTIVE 40 MARKS CALCULATOR */}
        {/* ==================================================================== */}
        {isTheory && (
          <View style={{ gap: Spacing.md }}>
            {/* NOTICE BANNER */}
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeIcon}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>THEORY COURSES ONLY (40 MARKS SCHEME)</Text>
                <Text style={styles.noticeDesc}>
                  {selectedSubject?.name ? `Active for ${selectedSubject.name}. ` : ""}
                  This calculation applies exclusively to Theory Courses (5 Assignments = 10m, CATs = 30m).
                </Text>
              </View>
            </View>

            {/* QUICK ACTIONS ROW */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleAutoFill}>
                <Text style={styles.actionBtnText}>⚡ Auto-fill from Course</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleLoadExample}>
                <Text style={styles.actionBtnText}>📋 Load Example</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnReset]} onPress={handleReset}>
                <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>↺ Reset</Text>
              </TouchableOpacity>
            </View>

            {/* FINAL INTERNAL MARKS HERO CARD */}
            <Card variant="accent" style={styles.resultBanner}>
              <View style={styles.rowBetween}>
                <Text style={styles.resultTitle}>TOTAL THEORY INTERNAL SCORE</Text>
                <Badge
                  label={`${theoryResult.internalPercentage}% INTERNAL`}
                  variant={theoryResult.internalPercentage >= 75 ? "success" : "warning"}
                  size="md"
                />
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.scoreHighlight}>
                  {theoryResult.finalInternal}
                  <Text style={styles.scoreScale}> / {theoryResult.maxInternal}</Text>
                </Text>
                <Text style={styles.formulaTag}>10 (Asgn) + 12 (CAT1) + 6 (CAT2) + 12 (CAT3)</Text>
              </View>

              {/* Breakdown summary pills */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownVal}>{theoryResult.assignments.convertedTotal}m</Text>
                  <Text style={styles.breakdownLbl}>Assignments (/10)</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownVal}>{theoryResult.cats.cat1Total}m</Text>
                  <Text style={styles.breakdownLbl}>CAT 1 (/12)</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownVal}>{theoryResult.cats.cat2Total}m</Text>
                  <Text style={styles.breakdownLbl}>CAT 2 (/6)</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownVal}>{theoryResult.cats.cat3Total}m</Text>
                  <Text style={styles.breakdownLbl}>CAT 3 (/12)</Text>
                </View>
              </View>
            </Card>

            {/* 1. ASSIGNMENTS SECTION (10 MARKS) */}
            <Card variant="default" style={styles.cardSection}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={Typography.h3}>1. ASSIGNMENTS — 10 MARKS</Text>
                  <Text style={[Typography.caption, { marginTop: 2 }]}>
                    5 Chapter-wise Assignments • Each: (Raw / 10) × 2
                  </Text>
                </View>
                <Badge
                  label={`${theoryResult.assignments.convertedTotal} / 10`}
                  variant="primary"
                  size="sm"
                />
              </View>

              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableCol, { flex: 1.2 }]}>CHAPTER</Text>
                <Text style={[styles.tableCol, { flex: 1, textAlign: "center" }]}>RAW (/10)</Text>
                <Text style={[styles.tableCol, { flex: 1, textAlign: "right" }]}>CONVERTED (/2)</Text>
              </View>

              {/* Table Rows for Chapters 1 to 5 */}
              {[
                { label: "Chapter 1", raw: asgn1, setRaw: setAsgn1, conv: theoryResult.assignments.ch1Converted },
                { label: "Chapter 2", raw: asgn2, setRaw: setAsgn2, conv: theoryResult.assignments.ch2Converted },
                { label: "Chapter 3", raw: asgn3, setRaw: setAsgn3, conv: theoryResult.assignments.ch3Converted },
                { label: "Chapter 4", raw: asgn4, setRaw: setAsgn4, conv: theoryResult.assignments.ch4Converted },
                { label: "Chapter 5", raw: asgn5, setRaw: setAsgn5, conv: theoryResult.assignments.ch5Converted },
              ].map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>{item.label}</Text>
                  <View style={[styles.tableInputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.cellInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      value={item.raw}
                      onChangeText={item.setRaw}
                    />
                    <Text style={styles.inputMaxLabel}>/ 10</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.convertedBadgeText}>
                      {item.conv} <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>/ 2</Text>
                    </Text>
                  </View>
                </View>
              ))}

              {/* Assignment Total Row */}
              <View style={styles.tableFooterRow}>
                <Text style={styles.footerLabel}>Assignments Total</Text>
                <Text style={styles.footerRawText}>
                  {theoryResult.assignments.rawTotal} / 50
                </Text>
                <Text style={styles.footerConvText}>
                  {theoryResult.assignments.convertedTotal} / 10
                </Text>
              </View>
            </Card>

            {/* 2. CAT MARKS SECTION (30 MARKS) */}
            <Card variant="default" style={styles.cardSection}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={Typography.h3}>2. CAT EXAMINATIONS — 30 MARKS</Text>
                  <Text style={[Typography.caption, { marginTop: 2 }]}>
                    Each chapter: (Raw / 25) × 6 • 5 Chapters Distributed Across 3 CATs
                  </Text>
                </View>
                <Badge
                  label={`${theoryResult.cats.convertedTotal} / 30`}
                  variant="primary"
                  size="sm"
                />
              </View>

              {/* CAT 1 BLOCK (12 MARKS) */}
              <View style={styles.catGroupBlock}>
                <View style={styles.catGroupHeader}>
                  <Text style={styles.catGroupTitle}>CAT 1 — 12 MARKS (Chapters 1 & 2)</Text>
                  <Text style={styles.catGroupScore}>
                    {theoryResult.cats.cat1Total} / 12
                  </Text>
                </View>

                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableCol, { flex: 1.2 }]}>CHAPTER</Text>
                  <Text style={[styles.tableCol, { flex: 1, textAlign: "center" }]}>RAW (/25)</Text>
                  <Text style={[styles.tableCol, { flex: 1, textAlign: "right" }]}>CONVERTED (/6)</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>Chapter 1</Text>
                  <View style={[styles.tableInputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.cellInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      value={cat1Ch1}
                      onChangeText={setCat1Ch1}
                    />
                    <Text style={styles.inputMaxLabel}>/ 25</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.convertedBadgeText}>
                      {theoryResult.cats.cat1Ch1Converted} <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>/ 6</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>Chapter 2</Text>
                  <View style={[styles.tableInputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.cellInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      value={cat1Ch2}
                      onChangeText={setCat1Ch2}
                    />
                    <Text style={styles.inputMaxLabel}>/ 25</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.convertedBadgeText}>
                      {theoryResult.cats.cat1Ch2Converted} <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>/ 6</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* CAT 2 BLOCK (6 MARKS) */}
              <View style={styles.catGroupBlock}>
                <View style={styles.catGroupHeader}>
                  <Text style={styles.catGroupTitle}>CAT 2 — 6 MARKS (Chapter 3)</Text>
                  <Text style={styles.catGroupScore}>
                    {theoryResult.cats.cat2Total} / 6
                  </Text>
                </View>

                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableCol, { flex: 1.2 }]}>CHAPTER</Text>
                  <Text style={[styles.tableCol, { flex: 1, textAlign: "center" }]}>RAW (/25)</Text>
                  <Text style={[styles.tableCol, { flex: 1, textAlign: "right" }]}>CONVERTED (/6)</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>Chapter 3</Text>
                  <View style={[styles.tableInputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.cellInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      value={cat2Ch3}
                      onChangeText={setCat2Ch3}
                    />
                    <Text style={styles.inputMaxLabel}>/ 25</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.convertedBadgeText}>
                      {theoryResult.cats.cat2Ch3Converted} <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>/ 6</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* CAT 3 BLOCK (12 MARKS) */}
              <View style={styles.catGroupBlock}>
                <View style={styles.catGroupHeader}>
                  <Text style={styles.catGroupTitle}>CAT 3 — 12 MARKS (Chapters 4 & 5)</Text>
                  <Text style={styles.catGroupScore}>
                    {theoryResult.cats.cat3Total} / 12
                  </Text>
                </View>

                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableCol, { flex: 1.2 }]}>CHAPTER</Text>
                  <Text style={[styles.tableCol, { flex: 1, textAlign: "center" }]}>RAW (/25)</Text>
                  <Text style={[styles.tableCol, { flex: 1, textAlign: "right" }]}>CONVERTED (/6)</Text>
                </View>

                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>Chapter 4</Text>
                  <View style={[styles.tableInputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.cellInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      value={cat3Ch4}
                      onChangeText={setCat3Ch4}
                    />
                    <Text style={styles.inputMaxLabel}>/ 25</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.convertedBadgeText}>
                      {theoryResult.cats.cat3Ch4Converted} <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>/ 6</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>Chapter 5</Text>
                  <View style={[styles.tableInputContainer, { flex: 1 }]}>
                    <TextInput
                      style={styles.cellInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="numeric"
                      value={cat3Ch5}
                      onChangeText={setCat3Ch5}
                    />
                    <Text style={styles.inputMaxLabel}>/ 25</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.convertedBadgeText}>
                      {theoryResult.cats.cat3Ch5Converted} <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>/ 6</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* CATs Total Row */}
              <View style={styles.tableFooterRow}>
                <Text style={styles.footerLabel}>CATs Total</Text>
                <Text style={styles.footerRawText}>
                  {theoryResult.cats.rawTotal} / 125
                </Text>
                <Text style={styles.footerConvText}>
                  {theoryResult.cats.convertedTotal} / 30
                </Text>
              </View>
            </Card>

            {/* 3. TARGET GRADE PROJECTION (SEMESTER FINAL EXAM) */}
            <Card variant="default" style={styles.cardSection}>
              <View style={styles.rowBetween}>
                <Text style={Typography.h3}>SEMESTER FINALS PROJECTION</Text>
                <Badge
                  label={projection.isAchievable ? "ACHIEVABLE" : "UNATTAINABLE"}
                  variant={projection.isAchievable ? "success" : "error"}
                  size="sm"
                />
              </View>

              <Text style={[Typography.caption, { marginTop: 2, marginBottom: Spacing.sm }]}>
                Course Total is 100 Marks (Internal = 40 + Final Exam = 60).
              </Text>

              {/* Grade Selector Chips */}
              <View style={styles.gradeChipsRow}>
                {[
                  { grade: "O Grade", targetPct: 90 },
                  { grade: "A+ Grade", targetPct: 80 },
                  { grade: "A Grade", targetPct: 70 },
                  { grade: "B+ Grade", targetPct: 60 },
                ].map((g) => {
                  const isSelected = targetGrade.targetPct === g.targetPct;
                  return (
                    <TouchableOpacity
                      key={g.targetPct}
                      onPress={() => setTargetGrade(g)}
                      style={[styles.gradeChip, isSelected && styles.gradeChipActive]}
                    >
                      <Text style={[styles.gradeChipText, isSelected && styles.gradeChipTextActive]}>
                        {g.grade} ({g.targetPct}%)
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.projectionBox}>
                <View style={styles.projectionScoresRow}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.projectionScoreVal}>
                      {projection.requiredMarksOutOf60}
                      <Text style={styles.projectionScoreScale}> / 60</Text>
                    </Text>
                    <Text style={styles.projectionScoreLbl}>Marks on 60-Weight Finals</Text>
                  </View>

                  <View style={styles.projectionDivider} />

                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.projectionScoreVal}>
                      {projection.requiredMarksOutOf100}
                      <Text style={styles.projectionScoreScale}> / 100</Text>
                    </Text>
                    <Text style={styles.projectionScoreLbl}>Equivalent on 100-Mark Paper</Text>
                  </View>
                </View>

                <Text style={styles.projectionDesc}>{projection.statusMessage}</Text>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  section: {
    gap: Spacing.xs,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  subChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  subChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  pendingContainer: {
    gap: Spacing.md,
  },
  pendingCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.warning,
    borderWidth: 1,
    padding: Spacing.md,
  },
  pendingHeaderRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  pendingIcon: {
    fontSize: 28,
  },
  pendingSubjCategory: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
  },
  pendingDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  pendingMessageBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.warning}66`,
  },
  pendingMessageTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.warning,
    marginBottom: 6,
  },
  pendingMessageBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  pendingActionsRow: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  switchTheoryPrimaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  switchTheoryPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  previewDemoBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewDemoBtnText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  curriculumReferenceCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  curriculumItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.border}88`,
  },
  curriculumItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  curriculumItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  curriculumItemDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  noticeBanner: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  noticeIcon: {
    fontSize: 20,
  },
  noticeTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.primaryLight,
    letterSpacing: 0.5,
  },
  noticeDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnReset: {
    flex: 0.7,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  resultBanner: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primaryLight,
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginVertical: Spacing.xs,
  },
  scoreHighlight: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  scoreScale: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  formulaTag: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: "monospace",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  breakdownItem: {
    alignItems: "center",
  },
  breakdownVal: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  breakdownLbl: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  cardSection: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: Spacing.xs,
  },
  tableCol: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: `${Colors.border}88`,
  },
  tableCellText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  tableInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cellInput: {
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 3,
    paddingHorizontal: 8,
    width: 44,
    textAlign: "center",
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  inputMaxLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginLeft: 4,
  },
  convertedBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primaryLight,
  },
  tableFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
  },
  footerLabel: {
    flex: 1.2,
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textPrimary,
    textTransform: "uppercase",
  },
  footerRawText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  footerConvText: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "800",
    color: Colors.success,
  },
  catGroupBlock: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  catGroupTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  catGroupScore: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primaryLight,
  },
  gradeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  gradeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gradeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  gradeChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  gradeChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  projectionBox: {
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  projectionScoresRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  projectionDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  projectionScoreVal: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primaryLight,
  },
  projectionScoreScale: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  projectionScoreLbl: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  projectionDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: `${Colors.border}88`,
    paddingTop: Spacing.sm,
  },
});
