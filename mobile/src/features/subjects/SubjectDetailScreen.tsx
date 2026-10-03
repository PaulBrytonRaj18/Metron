import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../app/navigation/types";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Button } from "../../components/ui/Button";
import {
  CourseClassification,
  normalizeCourseCategory,
  isTheoryCourse,
} from "../marks/marksEngine";
import {
  useAppStore,
  Chapter,
  Assignment,
  Experiment,
  AssignmentStatus,
  ObservationStatus,
  RecordStatus,
} from "../../store/useAppStore";

type SubjectDetailRouteProp = RouteProp<RootStackParamList, "SubjectDetail">;

export const SubjectDetailScreen: React.FC = () => {
  const route = useRoute<SubjectDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { subjectId } = route.params;

  const {
    subjects,
    chapters,
    assignments,
    experiments,
    updateChapterProgress,
    createChapter,
    deleteChapter,
    updateChapterNotes,
    addChapterKeyTopic,
    toggleChapterKeyTopic,
    deleteChapterKeyTopic,
    updateSubject,
    deleteSubject,
    createAssignment,
    updateAssignmentStatus,
    deleteAssignment,
    createExperiment,
    updateExperimentObservation,
    updateExperimentRecord,
    deleteExperiment,
  } = useAppStore();

  const subject = subjects.find((s) => s.id === subjectId);
  const subjectChapters = chapters[subjectId] || [];
  const subjectAssignments = assignments[subjectId] || [];
  const subjectExperiments = experiments[subjectId] || [];

  const normCategory = normalizeCourseCategory(subject?.category);
  const isLab = normCategory === "LABORATORY COURSES";
  const isLabOriented = normCategory === "LABORATORY ORIENTED THEORY COURSE";
  const isTheory = isTheoryCourse(subject?.category);

  // Tab State: Units vs Assignments (Theory) or Experiments vs Units (Lab)
  const [activeTab, setActiveTab] = useState<"units" | "work">("units");

  // Add Unit Modal state
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [unitTitle, setUnitTitle] = useState("");
  const [unitNumber, setUnitNumber] = useState(String(subjectChapters.length + 1));

  // Edit Notes Modal state
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [selectedChapterForNotes, setSelectedChapterForNotes] = useState<Chapter | null>(null);
  const [notesText, setNotesText] = useState("");

  // Add Key Topic state per chapter
  const [newTopicText, setNewTopicText] = useState<Record<string, string>>({});

  // Add Assignment Modal state
  const getTodayDateStr = () => new Date().toISOString().split("T")[0];
  const getDefaultDueDateStr = () => new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [asgnModalVisible, setAsgnModalVisible] = useState(false);
  const [asgnTitle, setAsgnTitle] = useState("");
  const [asgnDesc, setAsgnDesc] = useState("");
  const [asgnDueDate, setAsgnDueDate] = useState(getDefaultDueDateStr);
  const [asgnMaxMarks, setAsgnMaxMarks] = useState("10");
  const [asgnChapterId, setAsgnChapterId] = useState<string | undefined>(undefined);

  // Grade Assignment Modal state
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [selectedAsgnForGrading, setSelectedAsgnForGrading] = useState<Assignment | null>(null);
  const [obtainedMarksInput, setObtainedMarksInput] = useState("");

  // Add Experiment Modal state
  const [expModalVisible, setExpModalVisible] = useState(false);
  const [expNum, setExpNum] = useState(String(subjectExperiments.length + 1));
  const [expTitle, setExpTitle] = useState("");
  const [expDate, setExpDate] = useState(getTodayDateStr);

  // Edit Subject Modal state
  const [editSubjectVisible, setEditSubjectVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCategory, setEditCategory] = useState<CourseClassification>("THEORY COURSES");
  const [editCredits, setEditCredits] = useState("");
  const [editFaculty, setEditFaculty] = useState("");

  if (!subject) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={Typography.body}>Subject not found.</Text>
      </SafeAreaView>
    );
  }

  // Unit handlers
  const handleAddUnit = async () => {
    if (!unitTitle.trim()) return;
    await createChapter({
      subject_id: subjectId,
      title: unitTitle.trim(),
      unit_number: parseInt(unitNumber) || subjectChapters.length + 1,
      learning_progress_percent: 0,
      confidence_rating: 5,
    });
    setUnitTitle("");
    setUnitModalVisible(false);
  };

  const handleDeleteUnit = (ch: Chapter) => {
    Alert.alert("Delete Unit", `Remove "${ch.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteChapter(ch.id) },
    ]);
  };

  const handleAdjustProgress = async (chapter: Chapter, delta: number) => {
    const nextProg = Math.max(0, Math.min(100, chapter.learning_progress_percent + delta));
    await updateChapterProgress(chapter.id, nextProg, chapter.confidence_rating);
  };

  const handleSetPresetProgress = async (chapter: Chapter, value: number) => {
    await updateChapterProgress(chapter.id, value, chapter.confidence_rating);
  };

  const handleSetConfidence = async (chapter: Chapter, conf: number) => {
    await updateChapterProgress(chapter.id, chapter.learning_progress_percent, conf);
  };

  const handleOpenNotes = (ch: Chapter) => {
    setSelectedChapterForNotes(ch);
    setNotesText(ch.notes || "");
    setNotesModalVisible(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedChapterForNotes) return;
    await updateChapterNotes(selectedChapterForNotes.id, notesText);
    setNotesModalVisible(false);
  };

  const handleAddTopic = async (chapterId: string) => {
    const text = newTopicText[chapterId]?.trim();
    if (!text) return;
    await addChapterKeyTopic(chapterId, text);
    setNewTopicText((prev) => ({ ...prev, [chapterId]: "" }));
  };

  // Phase 3: Assignment Handlers
  const handleAddAssignment = async () => {
    if (!asgnTitle.trim()) return;
    await createAssignment({
      subject_id: subjectId,
      title: asgnTitle.trim(),
      description: asgnDesc.trim() || undefined,
      due_date: asgnDueDate.trim() || undefined,
      chapter_id: asgnChapterId,
      max_marks: parseFloat(asgnMaxMarks) || 10.0,
    });
    setAsgnTitle("");
    setAsgnDesc("");
    setAsgnModalVisible(false);
  };

  const handleCycleAssignmentStatus = async (asgn: Assignment) => {
    const transitions: Record<AssignmentStatus, AssignmentStatus> = {
      NOT_FINISHED: "COMPLETED",
      COMPLETED: "SUBMITTED_HAND",
      SUBMITTED_HAND: "SUBMITTED_MOODLE",
      SUBMITTED_MOODLE: "GRADED",
      GRADED: "NOT_FINISHED",
    };

    const nextStatus = transitions[asgn.status];

    if (nextStatus === "GRADED") {
      setSelectedAsgnForGrading(asgn);
      setObtainedMarksInput(String(asgn.obtained_marks || asgn.max_marks || 10));
      setGradeModalVisible(true);
      return;
    }

    await updateAssignmentStatus(asgn.id, nextStatus);
  };

  const handleConfirmGrading = async () => {
    if (!selectedAsgnForGrading) return;
    const marks = parseFloat(obtainedMarksInput) || 0;
    await updateAssignmentStatus(selectedAsgnForGrading.id, "GRADED", marks);
    setGradeModalVisible(false);
  };

  // Phase 3: Experiment Handlers
  const handleAddExperiment = async () => {
    if (!expTitle.trim()) return;
    await createExperiment({
      subject_id: subjectId,
      experiment_number: parseInt(expNum) || subjectExperiments.length + 1,
      title: expTitle.trim(),
      date_conducted: expDate.trim() || undefined,
    });
    setExpTitle("");
    setExpModalVisible(false);
  };

  const handleCycleObservation = async (exp: Experiment) => {
    const nextObs: Record<ObservationStatus, ObservationStatus> = {
      PENDING: "COMPLETED",
      COMPLETED: "SIGNED",
      SIGNED: "PENDING",
    };
    await updateExperimentObservation(exp.id, nextObs[exp.observation_status]);
  };

  const handleCycleRecord = async (exp: Experiment) => {
    const nextRec: Record<RecordStatus, RecordStatus> = {
      PENDING: "WRITTEN",
      WRITTEN: "SUBMITTED",
      SUBMITTED: "APPROVED",
      APPROVED: "PENDING",
    };
    await updateExperimentRecord(exp.id, nextRec[exp.record_status]);
  };

  // Subject Handlers
  const handleSaveEditSubject = async () => {
    if (!editName.trim()) return;
    await updateSubject(subject.id, {
      name: editName.trim(),
      code: editCode.trim() || undefined,
      category: editCategory,
      credits: parseFloat(editCredits) || 3.0,
      faculty_name: editFaculty.trim() || undefined,
    });
    setEditSubjectVisible(false);
  };

  const handleDeleteSubjectAction = () => {
    Alert.alert("Delete Course", `Remove "${subject.name}" and all records?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteSubject(subject.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const completedUnits = subjectChapters.filter((c) => c.learning_progress_percent >= 100).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={Typography.h2} numberOfLines={1}>
            {subject.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
            {subject.code && <Text style={styles.subjectCodeBadge}>{subject.code}</Text>}
            <Badge
              label={normCategory}
              variant={isTheory ? "primary" : isLabOriented ? "info" : isLab ? "neutral" : "warning"}
              size="sm"
            />
            <Text style={Typography.caption}>{subject.credits} Credits</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setEditName(subject.name);
            setEditCode(subject.code || "");
            setEditCredits(String(subject.credits));
            setEditFaculty(subject.faculty_name || "");
            setEditCategory(normCategory);
            setEditSubjectVisible(true);
          }}
          style={styles.editSubjectBtn}
        >
          <Text style={styles.editSubjectText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* DUAL-TRACK STATUS CARD */}
        <Card
          variant="default"
          style={[styles.statusCard, { borderLeftColor: subject.color_accent, borderLeftWidth: 4 }]}
        >
          <View style={styles.rowBetween}>
            <Text style={Typography.caption}>ACADEMIC MASTERY DASHBOARD</Text>
            {completedUnits > 0 && (
              <Badge
                label={`${completedUnits}/${subjectChapters.length} Units Mastered`}
                variant="success"
                size="sm"
              />
            )}
          </View>

          <ProgressBar
            progress={subject.learning_progress_percent || 0}
            label="Manual Learning Progress"
            color={subject.color_accent || Colors.primary}
            style={{ marginTop: Spacing.sm }}
          />

          <ProgressBar
            progress={subject.task_progress_percent || 0}
            label="Automatic Task Execution (Assignments / Labs)"
            color={Colors.success}
            style={{ marginTop: Spacing.sm }}
          />

          <View style={styles.confidenceRow}>
            <View>
              <Text style={Typography.caption}>Average Self-Assessed Confidence:</Text>
              <Text
                style={[
                  Typography.h3,
                  {
                    color:
                      (subject.average_confidence || 0) < 5
                        ? Colors.primaryLight
                        : Colors.success,
                    marginTop: 2,
                  },
                ]}
              >
                {subject.average_confidence || 0} / 10
              </Text>
            </View>

            {subject.faculty_name && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={Typography.caption}>Instructor</Text>
                <Text style={[Typography.bodyBold, { marginTop: 2 }]}>
                  {subject.faculty_name}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* INTERNAL MARKS CALCULATOR STATUS / ACTION BANNER */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("MarksCalculator", { subjectId: subject.id })}
          style={[
            styles.calcDetailBanner,
            isTheory ? styles.calcDetailBannerTheory : styles.calcDetailBannerPending,
          ]}
        >
          <View style={styles.calcDetailBannerLeft}>
            <Text style={styles.calcDetailBannerEmoji}>{isTheory ? "🧮" : "⏳"}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.calcDetailBannerTitle,
                  { color: isTheory ? Colors.primaryLight : Colors.warning },
                ]}
              >
                {isTheory
                  ? "Theory Internal Marks Calculator (Max 40)"
                  : `Evaluation Method Pending Update: ${normCategory}`}
              </Text>
              <Text style={styles.calcDetailBannerSub}>
                {isTheory
                  ? "5 Chapter Assignments (10m) + CAT 1/2/3 (30m) = 40 • Tap to calculate →"
                  : "The internal mark calculation is configured ONLY for THEORY COURSES. Tap to view notice →"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* PHASE 3 SEGMENTED TAB SWITCHER */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            onPress={() => setActiveTab("units")}
            style={[styles.tabButton, activeTab === "units" && styles.tabButtonActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === "units" && styles.tabBtnTextActive]}>
              Syllabus Units ({subjectChapters.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("work")}
            style={[styles.tabButton, activeTab === "work" && styles.tabButtonActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === "work" && styles.tabBtnTextActive]}>
              {isLab
                ? `Experiments (${subjectExperiments.length})`
                : `Assignments (${subjectAssignments.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: SYLLABUS UNITS */}
        {activeTab === "units" && (
          <View style={{ gap: Spacing.md }}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={Typography.h3}>SYLLABUS UNITS & TOPICS</Text>
                <Text style={Typography.caption}>
                  Manual progress tracking with confidence ratings
                </Text>
              </View>
              <Button
                title="+ Unit"
                size="sm"
                onPress={() => {
                  setUnitNumber(String(subjectChapters.length + 1));
                  setUnitModalVisible(true);
                }}
              />
            </View>

            {subjectChapters.map((ch) => {
              const isMastered = ch.learning_progress_percent >= 100;
              const isLowConfidence = ch.confidence_rating < 5;

              return (
                <Card
                  key={ch.id}
                  variant="default"
                  style={[styles.chapterCard, isLowConfidence && styles.chapterCardLowConf]}
                >
                  <View style={styles.chapterTop}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.unitBadgeRow}>
                        <Text style={styles.unitNumLabel}>UNIT {ch.unit_number}</Text>
                        {isMastered && <Badge label="✓ Mastered" variant="success" size="sm" />}
                        {isLowConfidence && <Badge label="Low Confidence" variant="error" size="sm" />}
                      </View>
                      <Text style={[Typography.bodyBold, { marginTop: 4 }]}>{ch.title}</Text>
                    </View>

                    <TouchableOpacity onPress={() => handleDeleteUnit(ch)} style={styles.unitDeleteBtn}>
                      <Text style={styles.unitDeleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Stepper Controls */}
                  <View style={styles.stepperContainer}>
                    <ProgressBar
                      progress={ch.learning_progress_percent}
                      label="Learning Progress"
                      color={isMastered ? Colors.success : Colors.primary}
                    />

                    <View style={styles.stepperControls}>
                      <View style={styles.presetGroup}>
                        {[0, 50, 100].map((preset) => (
                          <TouchableOpacity
                            key={preset}
                            onPress={() => handleSetPresetProgress(ch, preset)}
                            style={[
                              styles.presetBtn,
                              ch.learning_progress_percent === preset && styles.presetBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.presetBtnText,
                                ch.learning_progress_percent === preset && styles.presetBtnTextActive,
                              ]}
                            >
                              {preset}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.stepGroup}>
                        <TouchableOpacity onPress={() => handleAdjustProgress(ch, -10)} style={styles.stepBtn}>
                          <Text style={styles.stepBtnText}>-10%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleAdjustProgress(ch, +10)} style={styles.stepBtn}>
                          <Text style={styles.stepBtnText}>+10%</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Confidence Rating */}
                  <View style={styles.confidenceSection}>
                    <View style={styles.rowBetween}>
                      <Text style={Typography.caption}>Confidence Self-Rating:</Text>
                      <Text
                        style={[
                          Typography.caption,
                          {
                            fontWeight: "700",
                            color: isLowConfidence ? Colors.primaryLight : Colors.success,
                          },
                        ]}
                      >
                        {ch.confidence_rating} / 10
                      </Text>
                    </View>
                    <View style={styles.ratingsRow}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
                        const isSelected = ch.confidence_rating === rating;
                        const isWarn = rating < 5;
                        return (
                          <TouchableOpacity
                            key={rating}
                            onPress={() => handleSetConfidence(ch, rating)}
                            style={[
                              styles.ratingChip,
                              isSelected && (isWarn ? styles.ratingChipWarn : styles.ratingChipActive),
                            ]}
                          >
                            <Text style={[styles.ratingText, isSelected && styles.ratingTextActive]}>
                              {rating}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Key Topics */}
                  <View style={styles.topicsSection}>
                    <Text style={[Typography.caption, { marginBottom: Spacing.xs }]}>
                      Key Topics Checklist ({ch.key_topics.filter((t) => t.completed).length}/
                      {ch.key_topics.length}):
                    </Text>

                    {ch.key_topics.map((t) => (
                      <View key={t.id} style={styles.topicRow}>
                        <TouchableOpacity
                          onPress={() => toggleChapterKeyTopic(ch.id, t.id)}
                          style={[styles.topicCheckbox, t.completed && styles.topicCheckboxActive]}
                        >
                          {t.completed && <Text style={styles.topicCheckmark}>✓</Text>}
                        </TouchableOpacity>

                        <Text style={[styles.topicText, t.completed && styles.topicTextCompleted]}>
                          {t.text}
                        </Text>

                        <TouchableOpacity
                          onPress={() => deleteChapterKeyTopic(ch.id, t.id)}
                          style={styles.topicDeleteBtn}
                        >
                          <Text style={styles.topicDeleteText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.addTopicRow}>
                      <TextInput
                        style={styles.addTopicInput}
                        placeholder="+ Add key topic / theorem..."
                        placeholderTextColor={Colors.textTertiary}
                        value={newTopicText[ch.id] || ""}
                        onChangeText={(text) => setNewTopicText((prev) => ({ ...prev, [ch.id]: text }))}
                        onSubmitEditing={() => handleAddTopic(ch.id)}
                      />
                      <TouchableOpacity onPress={() => handleAddTopic(ch.id)} style={styles.addTopicBtn}>
                        <Text style={styles.addTopicBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Notes */}
                  <View style={styles.notesSection}>
                    <View style={styles.rowBetween}>
                      <Text style={Typography.caption}>Revision Notes & Formulas:</Text>
                      <TouchableOpacity onPress={() => handleOpenNotes(ch)}>
                        <Text style={styles.editNotesLink}>
                          {ch.notes ? "Edit Notes" : "+ Add Notes"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {ch.notes ? (
                      <Text style={styles.notesPreview} numberOfLines={3}>
                        {ch.notes}
                      </Text>
                    ) : (
                      <Text style={[Typography.caption, { fontStyle: "italic", marginTop: 2 }]}>
                        No revision notes yet. Click '+ Add Notes' to jot formulas.
                      </Text>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* TAB 2: THEORY ASSIGNMENTS */}
        {activeTab === "work" && !isLab && (
          <View style={{ gap: Spacing.md }}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={Typography.h3}>ASSIGNMENT LIFECYCLE</Text>
                <Text style={Typography.caption}>
                  5-stage progression with automated subject rollup
                </Text>
              </View>
              <Button title="+ Assignment" size="sm" onPress={() => setAsgnModalVisible(true)} />
            </View>

            {subjectAssignments.map((a) => {
              const getStatusBadge = () => {
                switch (a.status) {
                  case "GRADED":
                    return <Badge label={`Graded (${a.obtained_marks || 0}/${a.max_marks || 10})`} variant="success" size="sm" />;
                  case "SUBMITTED_MOODLE":
                    return <Badge label="Moodle Upload" variant="info" size="sm" />;
                  case "SUBMITTED_HAND":
                    return <Badge label="Submitted Hand" variant="info" size="sm" />;
                  case "COMPLETED":
                    return <Badge label="Completed" variant="warning" size="sm" />;
                  case "NOT_FINISHED":
                  default:
                    return <Badge label="Not Finished" variant="neutral" size="sm" />;
                }
              };

              return (
                <Card key={a.id} variant="default" style={styles.assignmentCard}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={Typography.bodyBold}>{a.title}</Text>
                      {a.description && (
                        <Text style={[Typography.caption, { marginTop: 2 }]}>{a.description}</Text>
                      )}
                      <View style={styles.asgnMetaRow}>
                        {a.due_date && (
                          <Text style={[Typography.caption, { color: Colors.primaryLight }]}>
                            Due: {a.due_date}
                          </Text>
                        )}
                        <Text style={Typography.caption}>• Max: {a.max_marks || 10} pts</Text>
                      </View>
                    </View>

                    <TouchableOpacity onPress={() => deleteAssignment(a.id)} style={styles.unitDeleteBtn}>
                      <Text style={styles.unitDeleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.asgnBottomRow}>
                    {getStatusBadge()}
                    <TouchableOpacity
                      onPress={() => handleCycleAssignmentStatus(a)}
                      style={styles.advanceStatusBtn}
                    >
                      <Text style={styles.advanceStatusText}>Advance Status →</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}

            {subjectAssignments.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={Typography.body}>No assignments added yet.</Text>
                <Text style={[Typography.caption, { marginTop: 4 }]}>
                  Tap '+ Assignment' to track problem sets and LMS deadlines.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: LABORATORY EXPERIMENTS */}
        {activeTab === "work" && isLab && (
          <View style={{ gap: Spacing.md }}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={Typography.h3}>LABORATORY EXPERIMENTS</Text>
                <Text style={Typography.caption}>Dual-track: Observation & Record workflows</Text>
              </View>
              <Button title="+ Experiment" size="sm" onPress={() => setExpModalVisible(true)} />
            </View>

            {subjectExperiments.map((e) => (
              <Card key={e.id} variant="default" style={styles.experimentCard}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expNumberBadge}>EXPERIMENT {e.experiment_number}</Text>
                    <Text style={[Typography.bodyBold, { marginTop: 2 }]}>{e.title}</Text>
                    {e.date_conducted && (
                      <Text style={[Typography.caption, { marginTop: 2 }]}>
                        Conducted: {e.date_conducted}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity onPress={() => deleteExperiment(e.id)} style={styles.unitDeleteBtn}>
                    <Text style={styles.unitDeleteText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* DUAL WORKFLOW CHIPS */}
                <View style={styles.dualWorkflowContainer}>
                  {/* Observation Toggle */}
                  <View style={styles.workflowRow}>
                    <Text style={Typography.caption}>Observation:</Text>
                    <TouchableOpacity
                      onPress={() => handleCycleObservation(e)}
                      style={[
                        styles.workflowChip,
                        e.observation_status === "SIGNED"
                          ? styles.chipSuccess
                          : e.observation_status === "COMPLETED"
                          ? styles.chipWarning
                          : styles.chipNeutral,
                      ]}
                    >
                      <Text style={styles.workflowChipText}>
                        {e.observation_status === "SIGNED"
                          ? "✓ SIGNED"
                          : e.observation_status === "COMPLETED"
                          ? "DONE (Awaiting Sign)"
                          : "PENDING"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Record Toggle */}
                  <View style={styles.workflowRow}>
                    <Text style={Typography.caption}>Record Book:</Text>
                    <TouchableOpacity
                      onPress={() => handleCycleRecord(e)}
                      style={[
                        styles.workflowChip,
                        e.record_status === "APPROVED"
                          ? styles.chipSuccess
                          : e.record_status === "SUBMITTED"
                          ? styles.chipInfo
                          : e.record_status === "WRITTEN"
                          ? styles.chipWarning
                          : styles.chipNeutral,
                      ]}
                    >
                      <Text style={styles.workflowChipText}>
                        {e.record_status === "APPROVED"
                          ? `✓ APPROVED ${e.marks ? `(${e.marks}/10)` : ""}`
                          : e.record_status === "SUBMITTED"
                          ? "SUBMITTED (In Review)"
                          : e.record_status === "WRITTEN"
                          ? "WRITTEN"
                          : "PENDING"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}

            {subjectExperiments.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={Typography.body}>No laboratory experiments configured.</Text>
                <Text style={[Typography.caption, { marginTop: 4 }]}>
                  Tap '+ Experiment' to record syllabus experiments.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* BOTTOM DANGER ZONE */}
        <View style={styles.dangerZone}>
          <Button
            title="Delete Subject Course"
            variant="danger"
            size="sm"
            onPress={handleDeleteSubjectAction}
          />
        </View>
      </ScrollView>

      {/* ADD UNIT MODAL */}
      <Modal visible={unitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Add Syllabus Unit</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              Enter unit title to track learning progress and confidence.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Unit Number (e.g. 1)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={unitNumber}
              onChangeText={setUnitNumber}
            />

            <TextInput
              style={styles.input}
              placeholder="Unit Title (e.g. Memory Management & Paging)"
              placeholderTextColor={Colors.textTertiary}
              value={unitTitle}
              onChangeText={setUnitTitle}
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" onPress={() => setUnitModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Add Unit" variant="primary" onPress={handleAddUnit} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT NOTES MODAL */}
      <Modal visible={notesModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Unit Revision Notes</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.sm }]}>
              {selectedChapterForNotes?.title}
            </Text>

            <TextInput
              style={[styles.input, { height: 140, textAlignVertical: "top" }]}
              placeholder="Jot key definitions, theorems, formulas, or exam tips..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              value={notesText}
              onChangeText={setNotesText}
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" onPress={() => setNotesModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Save Notes" variant="primary" onPress={handleSaveNotes} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD ASSIGNMENT MODAL (PHASE 3) */}
      <Modal visible={asgnModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Add Course Assignment</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              Track homework sets, problem solving, and LMS submissions.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Assignment Title (e.g. Deadlock Detection Proofs)"
              placeholderTextColor={Colors.textTertiary}
              value={asgnTitle}
              onChangeText={setAsgnTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Description or notes (optional)"
              placeholderTextColor={Colors.textTertiary}
              value={asgnDesc}
              onChangeText={setAsgnDesc}
            />

            <View style={styles.rowGap}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Due Date (YYYY-MM-DD)"
                placeholderTextColor={Colors.textTertiary}
                value={asgnDueDate}
                onChangeText={setAsgnDueDate}
              />
              <TextInput
                style={[styles.input, { width: 90 }]}
                placeholder="Max Pts"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={asgnMaxMarks}
                onChangeText={setAsgnMaxMarks}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" onPress={() => setAsgnModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Create Assignment" variant="primary" onPress={handleAddAssignment} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* GRADE ASSIGNMENT MODAL (PHASE 3) */}
      <Modal visible={gradeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Enter Graded Marks</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              {selectedAsgnForGrading?.title}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Marks Obtained (e.g. 8.5)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={obtainedMarksInput}
              onChangeText={setObtainedMarksInput}
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" onPress={() => setGradeModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Save Score" variant="primary" onPress={handleConfirmGrading} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD EXPERIMENT MODAL (PHASE 3) */}
      <Modal visible={expModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Add Laboratory Experiment</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              Track individual experiments, observation sign-offs, and record books.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Experiment # (e.g. 5)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={expNum}
              onChangeText={setExpNum}
            />

            <TextInput
              style={styles.input}
              placeholder="Experiment Title (e.g. Page Replacement FIFO/LRU)"
              placeholderTextColor={Colors.textTertiary}
              value={expTitle}
              onChangeText={setExpTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Conduct Date (YYYY-MM-DD)"
              placeholderTextColor={Colors.textTertiary}
              value={expDate}
              onChangeText={setExpDate}
            />

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" onPress={() => setExpModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Save Experiment" variant="primary" onPress={handleAddExperiment} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT SUBJECT MODAL */}
      <Modal visible={editSubjectVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Edit Subject</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              Update course details and instructor information.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Course Code (e.g. CS501)"
              placeholderTextColor={Colors.textTertiary}
              value={editCode}
              onChangeText={setEditCode}
            />

            <TextInput
              style={styles.input}
              placeholder="Subject Name"
              placeholderTextColor={Colors.textTertiary}
              value={editName}
              onChangeText={setEditName}
            />

            {/* CURRICULUM CLASSIFICATION SELECTOR */}
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
                const isSelected = editCategory === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setEditCategory(c.id)}
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
                      <Badge label={c.badge} variant={c.badgeVariant} size="sm" />
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
                value={editCredits}
                onChangeText={setEditCredits}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Instructor Name"
                placeholderTextColor={Colors.textTertiary}
                value={editFaculty}
                onChangeText={setEditFaculty}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" onPress={() => setEditSubjectVisible(false)} style={{ flex: 1 }} />
              <Button title="Save Changes" variant="primary" onPress={handleSaveEditSubject} style={{ flex: 1 }} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.sm,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  editSubjectBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editSubjectText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  statusCard: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chapterCard: {
    gap: Spacing.md,
    padding: Spacing.md,
  },
  chapterCardLowConf: {
    borderColor: "rgba(205, 32, 44, 0.4)",
  },
  chapterTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  unitBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  unitNumLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  unitDeleteBtn: {
    padding: Spacing.xs,
  },
  unitDeleteText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
  stepperContainer: {
    gap: Spacing.xs,
  },
  stepperControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  presetGroup: {
    flexDirection: "row",
    gap: 4,
  },
  presetBtn: {
    backgroundColor: Colors.surfaceInput,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetBtnText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  presetBtnTextActive: {
    color: Colors.textAccent,
  },
  stepGroup: {
    flexDirection: "row",
    gap: 4,
  },
  stepBtn: {
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  stepBtnText: {
    color: Colors.primaryLight,
    fontSize: 11,
    fontWeight: "700",
  },
  confidenceSection: {
    gap: 4,
  },
  ratingsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  ratingChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ratingChipWarn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  ratingTextActive: {
    color: Colors.textAccent,
    fontWeight: "700",
  },
  topicsSection: {
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  topicCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  topicCheckboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  topicCheckmark: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  topicText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  topicTextCompleted: {
    textDecorationLine: "line-through",
    color: Colors.textTertiary,
  },
  topicDeleteBtn: {
    padding: 4,
  },
  topicDeleteText: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
  addTopicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 4,
  },
  addTopicInput: {
    flex: 1,
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    color: Colors.textPrimary,
    fontSize: 12,
  },
  addTopicBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  addTopicBtnText: {
    color: Colors.primaryLight,
    fontWeight: "700",
    fontSize: 11,
  },
  notesSection: {
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 4,
  },
  editNotesLink: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: "600",
  },
  notesPreview: {
    backgroundColor: Colors.surfaceInput,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  assignmentCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  asgnMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 4,
  },
  asgnBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  advanceStatusBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  advanceStatusText: {
    color: Colors.primaryLight,
    fontSize: 11,
    fontWeight: "700",
  },
  experimentCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  expNumberBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  dualWorkflowContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  workflowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workflowChip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 140,
    alignItems: "center",
  },
  workflowChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  chipSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: Colors.success,
  },
  chipWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: Colors.warning,
  },
  chipInfo: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: Colors.info,
  },
  chipNeutral: {
    backgroundColor: Colors.surfaceInput,
    borderColor: Colors.border,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  dangerZone: {
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
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
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  subjectCodeBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceInput,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  calcDetailBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  calcDetailBannerTheory: {
    backgroundColor: "rgba(205, 32, 44, 0.08)",
    borderColor: "rgba(205, 32, 44, 0.35)",
  },
  calcDetailBannerPending: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  calcDetailBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  calcDetailBannerEmoji: {
    fontSize: 22,
  },
  calcDetailBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  calcDetailBannerSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
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
});
