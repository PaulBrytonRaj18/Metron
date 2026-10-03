import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Header } from "../../components/ui/Header";
import { useAppStore, Exam } from "../../store/useAppStore";
import { syncGoogleCalendar, getGoogleCalendarStatus } from "../../services/googleCalendarService";

export const ExamCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { exams, subjects, activeSemester, createExam, updateExam, deleteExam } = useAppStore();

  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [modalVisible, setModalVisible] = useState(false);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  // Form states for creating exam
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const [examType, setExamType] = useState<Exam["exam_type"]>("CAT1");
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
  const [session, setSession] = useState<"FN" | "AN">("FN");
  const [portions, setPortions] = useState("");
  const [maxMarks, setMaxMarks] = useState("50");
  const [targetMarks, setTargetMarks] = useState("45");

  // Form state for recording score
  const [obtainedMarksInput, setObtainedMarksInput] = useState("");
  const [isSyncingGcal, setIsSyncingGcal] = useState(false);

  const handleSyncExamsGcal = async () => {
    setIsSyncingGcal(true);
    try {
      const status = await getGoogleCalendarStatus();
      if (!status.is_connected) {
        Alert.alert(
          "Google Calendar Not Linked",
          "Please link your Google Calendar in the Academic Calendar screen first.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Go to Calendar", onPress: () => navigation.navigate("AcademicCalendar" as never) },
          ]
        );
        return;
      }
      const res = await syncGoogleCalendar({ syncOfficialEvents: true, syncPersonalTasks: false });
      Alert.alert(
        "Sync Complete",
        `Successfully synced ${res.pushed_events_count + res.updated_events_count} exam dates to Google Calendar! 📅`
      );
    } catch (err: any) {
      Alert.alert("Sync Error", err?.message || "Failed to sync exams to Google Calendar.");
    } finally {
      setIsSyncingGcal(false);
    }
  };

  // Filter exams
  const filteredExams = exams.filter((ex) => {
    if (selectedFilter === "ALL") return true;
    return ex.exam_type === selectedFilter;
  });

  // Calculate days remaining helper
  const getDaysRemaining = (dateStr: string) => {
    const examDt = new Date(dateStr);
    const now = new Date();
    const diffTime = examDt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Find nearest upcoming exam
  const upcomingExams = [...exams]
    .filter((e) => getDaysRemaining(e.exam_date) >= 0)
    .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
  const nearestExam = upcomingExams[0];

  const handleCreateExam = async () => {
    if (!selectedSubjectId) {
      Alert.alert("Error", "Please select a subject.");
      return;
    }
    const subj = subjects.find((s) => s.id === selectedSubjectId);
    const title = examTitle.trim() || `${subj?.code || subj?.name} ${examType}`;

    await createExam({
      subject_id: selectedSubjectId,
      title,
      exam_type: examType,
      exam_date: examDate.trim(),
      session,
      portions: portions.trim() || undefined,
      max_marks: parseFloat(maxMarks) || 50.0,
      target_marks: parseFloat(targetMarks) || undefined,
    });

    setModalVisible(false);
    setExamTitle("");
    setPortions("");
  };

  const handleSaveScore = async () => {
    if (!activeExam) return;
    const score = parseFloat(obtainedMarksInput);
    if (isNaN(score)) {
      Alert.alert("Invalid Score", "Please enter a valid numeric score.");
      return;
    }

    await updateExam(activeExam.id, {
      obtained_marks: score,
    });
    setScoreModalVisible(false);
    setActiveExam(null);
    setObtainedMarksInput("");
  };

  const openScoreModal = (exam: Exam) => {
    setActiveExam(exam);
    setObtainedMarksInput(exam.obtained_marks !== undefined ? String(exam.obtained_marks) : "");
    setScoreModalVisible(true);
  };

  const renderExamCard = ({ item }: { item: Exam }) => {
    const days = getDaysRemaining(item.exam_date);
    const isCompleted = item.obtained_marks !== undefined;
    const subj = subjects.find((s) => s.id === item.subject_id);
    const accentColor = item.subject_color || subj?.color_accent || Colors.primary;

    return (
      <Card
        variant="default"
        style={[
          styles.examCard,
          { borderLeftWidth: 4, borderLeftColor: accentColor },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeGroup}>
            <Badge
              label={item.exam_type}
              variant={
                item.exam_type === "SemesterFinal"
                  ? "error"
                  : item.exam_type === "Lab"
                  ? "success"
                  : "warning"
              }
              size="sm"
            />
            <Text style={[styles.sessionText, { color: Colors.textSecondary }]}>
              {item.session === "FN" ? "FORENOON (FN)" : "AFTERNOON (AN)"}
            </Text>
          </View>

          {isCompleted ? (
            <Badge label="GRADED" variant="success" size="sm" />
          ) : days >= 0 ? (
            <Badge
              label={days === 0 ? "TODAY" : `IN ${days} DAYS`}
              variant={days <= 3 ? "error" : "primary"}
              size="sm"
            />
          ) : (
            <Badge label="PAST EXAM" variant="neutral" size="sm" />
          )}
        </View>

        <Text style={[Typography.bodyBold, styles.examTitle]}>{item.title}</Text>
        <Text style={[Typography.caption, { color: accentColor, fontWeight: "700" }]}>
          {item.subject_code ? `${item.subject_code} • ` : ""}
          {item.subject_name || subj?.name}
        </Text>

        <View style={styles.detailsRow}>
          <Text style={Typography.caption}>
            📅 Date: <Text style={{ color: Colors.textPrimary }}>{item.exam_date}</Text>
          </Text>
          {item.target_marks !== undefined && !isCompleted && (
            <Text style={Typography.caption}>
              🎯 Target:{" "}
              <Text style={{ color: Colors.primaryLight, fontWeight: "700" }}>
                {item.target_marks}/{item.max_marks}
              </Text>
            </Text>
          )}
        </View>

        {item.portions ? (
          <View style={styles.portionsBox}>
            <Text style={styles.portionsLabel}>EXAM PORTIONS & SYLLABUS:</Text>
            <Text style={styles.portionsText}>{item.portions}</Text>
          </View>
        ) : null}

        {/* SCORE SECTION */}
        <View style={styles.cardFooter}>
          {isCompleted ? (
            <View style={styles.scoreRow}>
              <Text style={Typography.bodyBold}>
                Score:{" "}
                <Text style={{ color: Colors.success, fontSize: 16 }}>
                  {item.obtained_marks}/{item.max_marks}
                </Text>{" "}
                <Text style={Typography.caption}>
                  ({Math.round(((item.obtained_marks || 0) / item.max_marks) * 100)}%)
                </Text>
              </Text>
              <TouchableOpacity onPress={() => openScoreModal(item)}>
                <Text style={styles.editScoreLink}>Edit Score</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title="Record Obtained Marks"
              variant="outline"
              size="sm"
              onPress={() => openScoreModal(item)}
            />
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="EXAM CENTER"
        showSemesterBadge={false}
      />

      {/* TOP COUNTDOWN BANNER */}
      {nearestExam && (
        <Card variant="accent" style={styles.countdownBanner}>
          <View style={styles.countdownRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.countdownLabel}>NEAREST ASSESSMENT COUNTDOWN</Text>
              <Text style={[Typography.h2, { marginTop: 2 }]}>{nearestExam.title}</Text>
              <Text style={[Typography.caption, { color: Colors.primaryLight, marginTop: 2 }]}>
                {nearestExam.exam_date} • {nearestExam.session || "FN"} Session
              </Text>
            </View>
            <View style={styles.daysBubble}>
              <Text style={styles.daysNumber}>{Math.max(0, getDaysRemaining(nearestExam.exam_date))}</Text>
              <Text style={styles.daysUnit}>DAYS LEFT</Text>
            </View>
          </View>
        </Card>
      )}

      {/* FILTER CHIPS */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {["ALL", "CAT1", "CAT2", "CAT3", "SemesterFinal", "Lab"].map((f) => {
            const isSelected = selectedFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setSelectedFilter(f)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {f === "ALL" ? "All Exams" : f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.actionRow}>
        <Text style={Typography.caption}>
          SHOWING {filteredExams.length} EXAM SCHEDULES
        </Text>
        <View style={{ flexDirection: "row", gap: Spacing.xs }}>
          <Button
            title={isSyncingGcal ? "Syncing..." : "📅 Sync GCal"}
            size="sm"
            variant="secondary"
            onPress={handleSyncExamsGcal}
            disabled={isSyncingGcal}
          />
          <Button title="+ Schedule Exam" size="sm" onPress={() => setModalVisible(true)} />
        </View>
      </View>

      <FlatList
        data={filteredExams}
        keyExtractor={(item) => item.id}
        renderItem={renderExamCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={Typography.body}>No exams found for this filter.</Text>
            <Text style={[Typography.caption, { marginTop: 4, textAlign: "center" }]}>
              Schedule internal assessment tests (CAT), practicals, or upload your college timetable to auto-populate.
            </Text>
          </View>
        }
      />

      {/* CREATE EXAM MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Schedule Assessment</Text>
            <Text style={[Typography.caption, { marginTop: 2, marginBottom: Spacing.md }]}>
              Log upcoming CAT internal or university final exams.
            </Text>

            {/* Subject Selector */}
            <Text style={[Typography.caption, { marginBottom: 4 }]}>COURSE / SUBJECT:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 38, marginBottom: Spacing.sm }}>
              {subjects.map((s) => {
                const isSelected = selectedSubjectId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSelectedSubjectId(s.id)}
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
                      {s.code || s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Exam Type Selector */}
            <Text style={[Typography.caption, { marginBottom: 4 }]}>EXAM CATEGORY:</Text>
            <View style={styles.typeRow}>
              {(["CAT1", "CAT2", "CAT3", "SemesterFinal", "Lab"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setExamType(t)}
                  style={[styles.typeChip, examType === t && styles.typeChipActive]}
                >
                  <Text style={[styles.typeText, examType === t && styles.typeTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Custom Exam Title (optional)"
              placeholderTextColor={Colors.textTertiary}
              value={examTitle}
              onChangeText={setExamTitle}
            />

            <View style={{ flexDirection: "row", gap: Spacing.sm }}>
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Date (YYYY-MM-DD)"
                placeholderTextColor={Colors.textTertiary}
                value={examDate}
                onChangeText={setExamDate}
              />

              <View style={styles.sessionToggle}>
                <TouchableOpacity
                  onPress={() => setSession("FN")}
                  style={[styles.sessionBtn, session === "FN" && styles.sessionBtnActive]}
                >
                  <Text style={[styles.sessionBtnText, session === "FN" && styles.sessionBtnTextActive]}>FN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSession("AN")}
                  style={[styles.sessionBtn, session === "AN" && styles.sessionBtnActive]}
                >
                  <Text style={[styles.sessionBtnText, session === "AN" && styles.sessionBtnTextActive]}>AN</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Portions (e.g. Unit 1: Process Sync & Unit 2)"
              placeholderTextColor={Colors.textTertiary}
              value={portions}
              onChangeText={setPortions}
            />

            <View style={{ flexDirection: "row", gap: Spacing.sm }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Max Marks (50)"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={maxMarks}
                onChangeText={setMaxMarks}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Target Marks (45)"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={targetMarks}
                onChangeText={setTargetMarks}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Exam"
                variant="primary"
                onPress={handleCreateExam}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* RECORD SCORE MODAL */}
      <Modal visible={scoreModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Record Evaluation Score</Text>
            <Text style={[Typography.caption, { marginTop: 2, marginBottom: Spacing.md }]}>
              {activeExam?.title} (Max Marks: {activeExam?.max_marks})
            </Text>

            <TextInput
              style={styles.input}
              placeholder={`Enter marks obtained (0 - ${activeExam?.max_marks || 50})`}
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={obtainedMarksInput}
              onChangeText={setObtainedMarksInput}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setScoreModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Score"
                variant="primary"
                onPress={handleSaveScore}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  countdownBanner: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primaryLight,
    letterSpacing: 0.5,
  },
  daysBubble: {
    backgroundColor: Colors.surfaceInput,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  daysNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.primary,
  },
  daysUnit: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  filterBar: {
    paddingVertical: Spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs - 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  examCard: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  sessionText: {
    fontSize: 10,
    fontWeight: "600",
  },
  examTitle: {
    fontSize: 15,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  portionsBox: {
    marginTop: Spacing.sm,
    padding: Spacing.xs + 2,
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  portionsLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  portionsText: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editScoreLink: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  subChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
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
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  typeTextActive: {
    color: "#FFFFFF",
  },
  sessionToggle: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    padding: 2,
  },
  sessionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
  },
  sessionBtnActive: {
    backgroundColor: Colors.primary,
  },
  sessionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  sessionBtnTextActive: {
    color: "#FFFFFF",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
