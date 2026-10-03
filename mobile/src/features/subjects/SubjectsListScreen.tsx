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
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../app/navigation/types";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Button } from "../../components/ui/Button";
import { Header } from "../../components/ui/Header";
import { useAppStore, Subject } from "../../store/useAppStore";
import {
  CourseClassification,
  COURSE_CLASSIFICATIONS,
  normalizeCourseCategory,
  isTheoryCourse,
} from "../marks/marksEngine";

const COLOR_OPTIONS = [
  "#CD202C", // Flame Scarlet (Primary)
  "#3B82F6", // Royal Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
];

type FilterTab = "ALL" | CourseClassification;

export const SubjectsListScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { subjects, activeSemester, createSubject, deleteSubject } = useAppStore();

  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [modalVisible, setModalVisible] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CourseClassification>("THEORY COURSES");
  const [credits, setCredits] = useState("3.0");
  const [facultyName, setFacultyName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  const filteredSubjects = subjects.filter((s) => {
    if (activeTab === "ALL") return true;
    return normalizeCourseCategory(s.category) === activeTab;
  });

  const totalCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  const avgConfidence = subjects.length
    ? (
        subjects.reduce((sum, s) => sum + (s.average_confidence || 0), 0) /
        subjects.length
      ).toFixed(1)
    : "0.0";

  const handleCreate = async () => {
    if (!name.trim() || !activeSemester) {
      Alert.alert("Validation", "Please enter a subject name.");
      return;
    }
    await createSubject({
      semester_id: activeSemester.id,
      code: code.trim() || undefined,
      name: name.trim(),
      category,
      credits: parseFloat(credits) || 3.0,
      color_accent: selectedColor,
      faculty_name: facultyName.trim() || undefined,
    });
    setName("");
    setCode("");
    setFacultyName("");
    setModalVisible(false);
  };

  const handleDeleteSubject = (subj: Subject) => {
    Alert.alert(
      "Delete Subject",
      `Are you sure you want to remove "${subj.name}" and all associated chapters?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSubject(subj.id);
          },
        },
      ]
    );
  };

  const renderSubjectCard = ({ item }: { item: Subject }) => {
    const normCategory = normalizeCourseCategory(item.category);
    const isTheory = isTheoryCourse(item.category);
    const completedUnits = item.completed_units_count || 0;
    const totalUnits = item.total_units_count || 0;

    let badgeVariant: "primary" | "info" | "neutral" | "warning" = "primary";
    if (normCategory === "LABORATORY ORIENTED THEORY COURSE") badgeVariant = "info";
    else if (normCategory === "LABORATORY COURSES") badgeVariant = "neutral";
    else if (normCategory === "INDUSTRY ORIENTED COURSE") badgeVariant = "warning";

    return (
      <Card
        variant="default"
        onPress={() => navigation.navigate("SubjectDetail", { subjectId: item.id })}
        style={[styles.card, { borderLeftColor: item.color_accent, borderLeftWidth: 4 }]}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.codeRow}>
              {item.code && <Text style={styles.subjectCode}>{item.code}</Text>}
              <Badge
                label={normCategory}
                variant={badgeVariant}
                size="sm"
              />
              <Text style={Typography.caption}>{item.credits} Credits</Text>
              {totalUnits > 0 && (
                <Text style={[Typography.caption, { color: Colors.primaryLight }]}>
                  • {completedUnits}/{totalUnits} Units
                </Text>
              )}
            </View>
            <Text style={[Typography.h3, { marginTop: 4 }]}>{item.name}</Text>
            {item.faculty_name && (
              <Text style={[Typography.caption, { marginTop: 2 }]}>
                Faculty: {item.faculty_name}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => handleDeleteSubject(item)}
            style={styles.deleteIconBtn}
          >
            <Text style={styles.deleteIconText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar
            progress={item.learning_progress_percent || 0}
            label="Learning Progress (Manual)"
            color={item.color_accent || Colors.primary}
            height={6}
          />
          <ProgressBar
            progress={item.task_progress_percent || 0}
            label="Task Execution (Automatic)"
            color={Colors.success}
            height={6}
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        {/* MARKS CALCULATOR STATUS / ACTION STRIP */}
        <TouchableOpacity
          onPress={() => navigation.navigate("MarksCalculator", { subjectId: item.id })}
          style={[
            styles.calcStatusStrip,
            isTheory ? styles.calcStatusStripTheory : styles.calcStatusStripPending,
          ]}
          activeOpacity={0.8}
        >
          {isTheory ? (
            <View style={styles.calcStatusInner}>
              <Text style={styles.calcStatusIcon}>🧮</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcStatusTitle}>Theory Internal Calculator Active</Text>
                <Text style={styles.calcStatusSub}>Max 40 marks (5 Asgns + CAT 1/2/3) • Tap to calculate →</Text>
              </View>
            </View>
          ) : (
            <View style={styles.calcStatusInner}>
              <Text style={styles.calcStatusIcon}>⏳</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.calcStatusTitlePending}>Evaluation Method Pending Update</Text>
                <Text style={styles.calcStatusSubPending}>Calculation is only for Theory courses • Tap to view notice →</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.cardFooter}>
          <Text style={Typography.caption}>
            Confidence:{" "}
            <Text
              style={{
                color:
                  (item.average_confidence || 0) < 5
                    ? Colors.primaryLight
                    : Colors.success,
                fontWeight: "700",
              }}
            >
              {item.average_confidence || 0}/10
            </Text>
          </Text>
          <Text style={styles.openDetailsLink}>Portions & Topics →</Text>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="ACADEMIC SUBJECTS" showSemesterBadge={true} />

      {/* SUMMARY BANNER */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{subjects.length}</Text>
          <Text style={Typography.caption}>Courses</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalCredits}</Text>
          <Text style={Typography.caption}>Credits</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{avgConfidence}/10</Text>
          <Text style={Typography.caption}>Avg Confidence</Text>
        </View>
      </View>

      {/* FILTER TABS (OFFICIAL CURRICULUM CLASSIFICATIONS) */}
      <View style={styles.tabScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {([
            { id: "ALL", label: "ALL" },
            { id: "THEORY COURSES", label: "THEORY COURSES" },
            { id: "LABORATORY ORIENTED THEORY COURSE", label: "LAB-ORIENTED THEORY" },
            { id: "LABORATORY COURSES", label: "LABORATORY COURSES" },
            { id: "INDUSTRY ORIENTED COURSE", label: "INDUSTRY ORIENTED" },
          ] as const).map((tab) => {
            const isTabActive = activeTab === tab.id;
            const count =
              tab.id === "ALL"
                ? subjects.length
                : subjects.filter((s) => normalizeCourseCategory(s.category) === tab.id).length;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabChip, isTabActive && styles.tabChipActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    isTabActive && styles.tabTextActive,
                  ]}
                >
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Text style={Typography.caption}>
          {filteredSubjects.length} SUBJECTS LISTED
        </Text>
        <Button
          title="+ Add Subject"
          size="sm"
          onPress={() => setModalVisible(true)}
        />
      </View>

      {/* SUBJECTS LIST */}
      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => item.id}
        renderItem={renderSubjectCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={Typography.body}>No subjects in this category.</Text>
            <Text style={[Typography.caption, { marginTop: 4 }]}>
              Tap '+ Add Subject' to configure your coursework.
            </Text>
          </View>
        }
      />

      {/* CREATE SUBJECT MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Add Academic Subject</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              Define course codes, credit hours, and categories with zero hardcoding.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Subject Code (e.g. CS501)"
              placeholderTextColor={Colors.textTertiary}
              value={code}
              onChangeText={setCode}
            />

            <TextInput
              style={styles.input}
              placeholder="Subject Name (e.g. Operating Systems)"
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
            />

            {/* COURSE CLASSIFICATION SELECTION */}
            <Text style={[Typography.caption, { marginBottom: Spacing.xs, marginTop: Spacing.xs }]}>
              CURRICULUM COURSE CLASSIFICATION:
            </Text>
            <View style={styles.categoryGrid}>
              {[
                {
                  id: "THEORY COURSES" as CourseClassification,
                  label: "1. THEORY COURSES",
                  desc: "Lecture course • Internal Mark = 40 (Assignments + CATs)",
                  badge: "CALC ACTIVE (/40)",
                  badgeVariant: "success" as const,
                },
                {
                  id: "LABORATORY ORIENTED THEORY COURSE" as CourseClassification,
                  label: "2. LABORATORY ORIENTED THEORY COURSE",
                  desc: "Lecture + Lab periods • Evaluation method pending update",
                  badge: "UPDATE PENDING ⏳",
                  badgeVariant: "warning" as const,
                },
                {
                  id: "LABORATORY COURSES" as CourseClassification,
                  label: "3. LABORATORY COURSES",
                  desc: "Practical lab experiments • Evaluation method pending update",
                  badge: "UPDATE PENDING ⏳",
                  badgeVariant: "warning" as const,
                },
                {
                  id: "INDUSTRY ORIENTED COURSE" as CourseClassification,
                  label: "4. INDUSTRY ORIENTED COURSE",
                  desc: "Specialized skill module • Evaluation method pending update",
                  badge: "UPDATE PENDING ⏳",
                  badgeVariant: "warning" as const,
                },
              ].map((c) => {
                const isSelected = category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                    ]}
                  >
                    <View style={styles.categoryCardHeader}>
                      <Text
                        style={[
                          styles.categoryCardTitle,
                          isSelected && styles.categoryCardTitleSelected,
                        ]}
                      >
                        {c.label}
                      </Text>
                      <Badge
                        label={c.badge}
                        variant={c.badgeVariant}
                        size="sm"
                      />
                    </View>
                    <Text style={styles.categoryCardDesc}>{c.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rowGap}>
              <TextInput
                style={[styles.input, { width: 100 }]}
                placeholder="Credits"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={credits}
                onChangeText={setCredits}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Faculty Name (optional)"
                placeholderTextColor={Colors.textTertiary}
                value={facultyName}
                onChangeText={setFacultyName}
              />
            </View>

            {/* COLOR ACCENT PICKER */}
            <Text style={[Typography.caption, { marginBottom: Spacing.xs }]}>
              Color Accent:
            </Text>
            <View style={styles.colorPickerRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorCircleActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Subject"
                variant="primary"
                onPress={handleCreate}
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
  summaryBanner: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm + 2,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  tabScrollWrapper: {
    paddingTop: Spacing.sm,
  },
  tabScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  tabChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  tabTextActive: {
    color: Colors.textAccent,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  card: {
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceInput,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  deleteIconBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  deleteIconText: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontWeight: "700",
  },
  progressContainer: {
    marginTop: Spacing.xs,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  calcStatusStrip: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  calcStatusStripTheory: {
    backgroundColor: "rgba(205, 32, 44, 0.08)",
    borderColor: "rgba(205, 32, 44, 0.3)",
  },
  calcStatusStripPending: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  calcStatusInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  calcStatusIcon: {
    fontSize: 16,
  },
  calcStatusTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primaryLight,
  },
  calcStatusSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  calcStatusTitlePending: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.warning,
  },
  calcStatusSubPending: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  openDetailsLink: {
    color: Colors.primaryLight,
    fontWeight: "600",
    fontSize: 12,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
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
  rowGap: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  categoryGrid: {
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  categoryCard: {
    backgroundColor: Colors.surfaceInput,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(205, 32, 44, 0.12)",
  },
  categoryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  categoryCardTitleSelected: {
    color: Colors.textPrimary,
  },
  categoryCardDesc: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  colorPickerRow: {
    flexDirection: "row",
    gap: Spacing.sm + 4,
    marginBottom: Spacing.md,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleActive: {
    borderColor: Colors.textPrimary,
    transform: [{ scale: 1.15 }],
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
});
