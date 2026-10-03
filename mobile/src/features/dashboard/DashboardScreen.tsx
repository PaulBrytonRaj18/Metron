import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../app/navigation/types";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Badge } from "../../components/ui/Badge";
import { Header } from "../../components/ui/Header";
import { useAppStore } from "../../store/useAppStore";

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    activeSemester,
    subjects,
    tasks,
    allAssignments,
    allExperiments,
    academicEvents,
    exams,
    toggleTaskStatus,
  } = useAppStore();

  // Dynamic Next Action selection
  const nextActionTask =
    tasks.find((t) => t.is_next_action && t.status === "pending") ||
    tasks.find((t) => t.priority === "urgent" && t.status === "pending") ||
    tasks.find((t) => t.status === "pending") ||
    tasks[0];

  const nextActionSubject = nextActionTask
    ? subjects.find((s) => s.id === nextActionTask.subject_id)
    : undefined;

  const upcomingEvent = academicEvents[0];

  // Nearest upcoming exam calculation (Phase 5)
  const todayZero = new Date();
  todayZero.setHours(0, 0, 0, 0);

  const upcomingExams = [...exams]
    .filter((e) => new Date(e.exam_date) >= todayZero)
    .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
  
  const nearestExam = upcomingExams[0];
  const nearestExamSubject = nearestExam
    ? subjects.find((s) => s.id === nearestExam.subject_id)
    : undefined;

  const examDaysLeft = nearestExam
    ? Math.max(0, Math.ceil((new Date(nearestExam.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Dual-Track Progress Computations
  const overallLearningProgress = subjects.length
    ? Math.round(
        subjects.reduce((sum, s) => sum + (s.learning_progress_percent || 0), 0) /
          subjects.length
      )
    : 0;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const overallTaskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Workload Pulse Metrics
  const pendingAssignmentsCount = allAssignments.filter(
    (a) => !["SUBMITTED_HAND", "SUBMITTED_MOODLE", "GRADED"].includes(a.status)
  ).length;

  const pendingRecordsCount = allExperiments.filter(
    (e) => e.record_status !== "APPROVED"
  ).length;

  const lowConfidenceSubject =
    subjects.find((s) => s.average_confidence && s.average_confidence < 5) || subjects[0];

  return (
    <SafeAreaView style={styles.container}>
      <Header title="COMMAND CENTER" onPressImport={() => navigation.navigate("DocumentImport")} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* NEAREST EXAM COUNTDOWN HERO CARD (PHASE 5) */}
        {nearestExam ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={Typography.caption}>EXAMINATION WATCHTOWER</Text>
              <Badge
                label={examDaysLeft === 0 ? "TODAY" : examDaysLeft === 1 ? "TOMORROW" : `T-${examDaysLeft} DAYS`}
                variant={examDaysLeft! <= 2 ? "error" : "warning"}
                size="sm"
              />
            </View>

            <Card variant="accent" style={styles.examHeroCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.examHeroSubject}>
                    {nearestExamSubject ? `${nearestExamSubject.code} • ${nearestExamSubject.name}` : nearestExam.subject_name}
                  </Text>
                  <Text style={[Typography.h3, { marginTop: 2 }]}>
                    {nearestExam.exam_type} Assessment
                  </Text>
                  <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 4 }]}>
                    📅 {nearestExam.exam_date} {nearestExam.session ? `• ${nearestExam.session}` : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.openExamBtn}
                  onPress={() => navigation.navigate("ExamCenter")}
                >
                  <Text style={styles.openExamBtnText}>Exam Center →</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        ) : null}

        {/* PRIMARY NEXT ACTION HERO CARD (TAD 7 / PRD 19) */}
        {nextActionTask && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={Typography.caption}>PRIMARY FOCUS</Text>
              <Badge label="★ NEXT ACTION" variant="primary" size="sm" />
            </View>

            <Card
              variant="accent"
              style={[
                styles.nextActionCard,
                nextActionSubject?.color_accent
                  ? { borderLeftColor: nextActionSubject.color_accent, borderLeftWidth: 4 }
                  : {},
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  {nextActionSubject && (
                    <Text style={[styles.nextActionSubj, { color: nextActionSubject.color_accent }]}>
                      {nextActionSubject.code || nextActionSubject.name}
                    </Text>
                  )}
                  <Text style={[Typography.h3, { marginTop: 2 }]}>{nextActionTask.title}</Text>
                </View>

                <Badge
                  label={nextActionTask.priority}
                  variant={nextActionTask.priority === "urgent" ? "error" : "warning"}
                  size="sm"
                />
              </View>

              {nextActionTask.description && (
                <Text style={[Typography.body, { marginTop: Spacing.xs }]}>
                  {nextActionTask.description}
                </Text>
              )}

              {nextActionTask.due_date && (
                <Text style={[Typography.caption, { color: Colors.primaryLight, marginTop: 4 }]}>
                  Due: {nextActionTask.due_date}
                </Text>
              )}

              <View style={styles.actionRow}>
                <Button
                  title={nextActionTask.status === "completed" ? "Mark Pending" : "Complete Next Action ✓"}
                  size="sm"
                  onPress={() => toggleTaskStatus(nextActionTask.id)}
                />
              </View>
            </Card>
          </View>
        )}

        {/* QUICK ACADEMIC TOOLS ROW (PHASE 5 & 6) */}
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("ExamCenter")}
          >
            <Text style={styles.toolEmoji}>📑</Text>
            <View>
              <Text style={styles.toolTitle}>Exam Center</Text>
              <Text style={styles.toolSubtitle}>Portions & Timetable</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("MarksCalculator")}
          >
            <Text style={styles.toolEmoji}>🎯</Text>
            <View>
              <Text style={styles.toolTitle}>Marks Calculator</Text>
              <Text style={styles.toolSubtitle}>Internal & Target Finals</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* WORKLOAD PULSE BANNER (PHASE 3) */}
        <View style={styles.workloadBanner}>
          <View style={styles.workloadItem}>
            <Text style={styles.workloadNumber}>{pendingAssignmentsCount}</Text>
            <Text style={Typography.caption}>Pending Assignments</Text>
          </View>
          <View style={styles.workloadDivider} />
          <View style={styles.workloadItem}>
            <Text style={styles.workloadNumber}>{pendingRecordsCount}</Text>
            <Text style={Typography.caption}>Lab Records Due</Text>
          </View>
          <View style={styles.workloadDivider} />
          <View style={styles.workloadItem}>
            <Text style={styles.workloadNumber}>{completedTasks}/{totalTasks}</Text>
            <Text style={Typography.caption}>Tasks Cleared</Text>
          </View>
        </View>

        {/* DUAL-TRACK PROGRESS DISPLAY (TAD 8 / PRD 9.2) */}
        <View style={styles.section}>
          <Text style={[Typography.caption, styles.sectionTitle]}>SEMESTER EXECUTION METRICS</Text>
          <Card variant="default">
            <ProgressBar
              progress={overallLearningProgress}
              label="Syllabus Learning Coverage (Manual)"
              color={Colors.primary}
            />

            <ProgressBar
              progress={overallTaskProgress}
              label="Task & Coursework Completion (Automatic)"
              color={Colors.success}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        </View>

        {/* SMART STUDY SUGGESTION (Gemini / Heuristic Engine - Phase 7) */}
        {lowConfidenceSubject && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={Typography.caption}>INTELLIGENT RECOMMENDATION</Text>
              <Badge label="AI Synthesis" variant="info" size="sm" />
            </View>

            <Card variant="elevated" style={styles.suggestionCard}>
              <Text style={[Typography.h3, { color: Colors.primaryLight }]}>
                Reinforce {lowConfidenceSubject.name}
              </Text>
              <Text style={[Typography.body, { marginTop: Spacing.xs }]}>
                Confidence rating is{" "}
                <Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>
                  {lowConfidenceSubject.average_confidence || 4.0}/10
                </Text>
                . Allocate 45 minutes to review weak units before upcoming assessments.
              </Text>

              <View style={styles.suggestionBtnRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("SubjectDetail", { subjectId: lowConfidenceSubject.id })}
                  style={styles.suggestionButton}
                >
                  <Text style={styles.suggestionBtnText}>Open Syllabus Portions →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("MarksCalculator")}
                  style={[styles.suggestionButton, { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }]}
                >
                  <Text style={[styles.suggestionBtnText, { color: Colors.textPrimary }]}>Calculate Target Score</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* UPCOMING ACADEMIC MILESTONE */}
        {upcomingEvent && (
          <View style={styles.section}>
            <Text style={[Typography.caption, styles.sectionTitle]}>NEAREST ACADEMIC MILESTONE</Text>
            <Card variant="default">
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={Typography.h3}>{upcomingEvent.title}</Text>
                  <Text style={[Typography.caption, { marginTop: 2 }]}>
                    Date: {upcomingEvent.start_date}
                  </Text>
                </View>
                <Badge label={upcomingEvent.category} variant="warning" size="sm" />
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
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  section: {
    gap: Spacing.xs + 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextActionCard: {
    backgroundColor: Colors.surface,
  },
  nextActionSubj: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  workloadBanner: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  workloadItem: {
    alignItems: "center",
  },
  workloadNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  workloadDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  suggestionCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
  },
  suggestionBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
    flexWrap: "wrap",
  },
  suggestionButton: {
    alignSelf: "flex-start",
  },
  suggestionBtnText: {
    color: Colors.primaryLight,
    fontWeight: "600",
    fontSize: 13,
  },
  examHeroCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.warning,
    borderWidth: 1,
  },
  examHeroSubject: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.warning,
  },
  openExamBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  openExamBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  toolsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  toolCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toolEmoji: {
    fontSize: 22,
  },
  toolTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  toolSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
