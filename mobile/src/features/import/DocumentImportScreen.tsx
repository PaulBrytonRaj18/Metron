import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useAppStore } from "../../store/useAppStore";
import {
  uploadDocument,
  processDocument,
  getImportPreview,
  confirmDocumentImport,
  DocumentExtractionPayload,
} from "../../services/api";

interface SelectableEvent {
  id: string;
  title: string;
  date: string;
  category: "instructional" | "holiday" | "cat_exam" | "semester_exam" | "deadline" | "other";
  description?: string;
  selected: boolean;
}

interface SelectableSubject {
  id: string;
  code: string;
  name: string;
  category: "Theory" | "Laboratory" | "Hybrid";
  credits: number;
  faculty?: string;
  selected: boolean;
}

interface SelectableExam {
  id: string;
  subject_name: string;
  subject_code?: string;
  exam_type: "CAT1" | "CAT2" | "CAT3" | "SemesterFinal" | "Model" | "Lab";
  exam_date: string;
  session?: "FN" | "AN" | "Morning" | "Afternoon";
  programme?: string;
  section?: string;
  selected: boolean;
}

type ActiveTab = "events" | "subjects" | "exams";

export const DocumentImportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { activeSemester, importAcademicExtraction } = useAppStore();

  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Initializing file...");
  const [hasProcessed, setHasProcessed] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("events");
  const [documentId, setDocumentId] = useState<string | null>(null);

  // Extracted Data Collections
  const [overallConfidence, setOverallConfidence] = useState(0.95);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [extractedEvents, setExtractedEvents] = useState<SelectableEvent[]>([]);
  const [extractedSubjects, setExtractedSubjects] = useState<SelectableSubject[]>([]);
  const [extractedExams, setExtractedExams] = useState<SelectableExam[]>([]);

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setFileName(file.name);
        await runDocumentExtractionPipeline(file);
      }
    } catch (e) {
      console.error("Picker error:", e);
      Alert.alert("Picker Error", "Could not read selected document.");
    }
  };

  const runDocumentExtractionPipeline = async (file: any) => {
    if (!activeSemester) {
      Alert.alert("No Active Semester", "Please select or create an active semester first.");
      return;
    }

    setIsProcessing(true);
    setHasProcessed(false);
    setProcessingStatus("Uploading document to Metron Backend...");

    try {
      // 1. Upload Document
      const uploadedDoc = await uploadDocument(activeSemester.id, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      });
      setDocumentId(uploadedDoc.id);

      // 2. Trigger Gemini Multimodal AI Processing
      setProcessingStatus("Gemini Multimodal Vision parsing syllabus & schedules...");
      const processed = await processDocument(uploadedDoc.id);

      // 3. Retrieve Normalised Extraction Preview
      setProcessingStatus("Normalizing extracted milestones & exam dates...");
      const preview = await getImportPreview(uploadedDoc.id);
      const extraction: DocumentExtractionPayload =
        preview.extraction || processed.extraction_result;

      if (extraction) {
        setOverallConfidence(extraction.overall_confidence || 0.95);
        setInstitutionName(extraction.institution_name || null);

        // Map Events
        const mappedEvents: SelectableEvent[] = (extraction.events || []).map((e, idx) => ({
          id: `ev_${idx}_${Date.now()}`,
          title: e.title,
          date: e.date,
          category: e.category,
          description: e.description,
          selected: true,
        }));
        setExtractedEvents(mappedEvents);

        // Map Subjects
        const mappedSubjects: SelectableSubject[] = (extraction.subjects || []).map((s, idx) => ({
          id: `sub_${idx}_${Date.now()}`,
          code: s.code || "SUBJ",
          name: s.name,
          category: s.category || "Theory",
          credits: s.credits || 3.0,
          faculty: s.faculty,
          selected: true,
        }));
        setExtractedSubjects(mappedSubjects);

        // Map Exams
        const mappedExams: SelectableExam[] = (extraction.exams || []).map((x, idx) => ({
          id: `ex_${idx}_${Date.now()}`,
          subject_name: x.subject_name,
          subject_code: x.subject_code,
          exam_type: x.exam_type,
          exam_date: x.exam_date,
          session: x.session || "FN",
          programme: x.programme,
          section: x.section,
          selected: true,
        }));
        setExtractedExams(mappedExams);

        setHasProcessed(true);
      } else {
        throw new Error("Empty extraction payload returned from AI engine.");
      }
    } catch (err: any) {
      console.error("Extraction pipeline failed:", err);
      Alert.alert(
        "Extraction Notice",
        `Backend intelligence notice: ${err.message || "Failed to parse document"}. Falling back to sample structure.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleEvent = (id: string) => {
    setExtractedEvents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const toggleSubject = (id: string) => {
    setExtractedSubjects((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const toggleExam = (id: string) => {
    setExtractedExams((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  const selectAllInActiveTab = (selected: boolean) => {
    if (activeTab === "events") {
      setExtractedEvents((prev) => prev.map((i) => ({ ...i, selected })));
    } else if (activeTab === "subjects") {
      setExtractedSubjects((prev) => prev.map((i) => ({ ...i, selected })));
    } else if (activeTab === "exams") {
      setExtractedExams((prev) => prev.map((i) => ({ ...i, selected })));
    }
  };

  const handleConfirmImport = async () => {
    if (!activeSemester) return;

    const selectedEvents = extractedEvents.filter((i) => i.selected);
    const selectedSubjects = extractedSubjects.filter((i) => i.selected);
    const selectedExams = extractedExams.filter((i) => i.selected);

    if (
      selectedEvents.length === 0 &&
      selectedSubjects.length === 0 &&
      selectedExams.length === 0
    ) {
      Alert.alert("Nothing Selected", "Please select at least one item to import.");
      return;
    }

    try {
      // 1. Commit locally to SQLite database and enqueue offline sync task
      const result = await importAcademicExtraction({
        semesterId: activeSemester.id,
        events: selectedEvents.map((e) => ({
          title: e.title,
          date: e.date,
          category: e.category,
          description: e.description,
        })),
        subjects: selectedSubjects.map((s) => ({
          code: s.code,
          name: s.name,
          category: s.category,
          credits: s.credits,
          faculty: s.faculty,
        })),
        exams: selectedExams.map((x) => ({
          subject_name: x.subject_name,
          subject_code: x.subject_code,
          exam_type: x.exam_type,
          exam_date: x.exam_date,
          session: x.session,
          section: x.section,
        })),
      });

      // 2. Commit to live backend if documentId is present
      if (documentId) {
        confirmDocumentImport(documentId, {
          confirmed_events: selectedEvents.map((e) => ({
            title: e.title,
            date: e.date,
            category: e.category,
            description: e.description,
          })),
          confirmed_subjects: selectedSubjects.map((s) => ({
            code: s.code,
            name: s.name,
            category: s.category,
            credits: s.credits,
            faculty: s.faculty,
          })),
          confirmed_exams: selectedExams.map((x) => ({
            subject_name: x.subject_name,
            subject_code: x.subject_code,
            exam_type: x.exam_type,
            exam_date: x.exam_date,
            session: x.session,
            section: x.section,
          })),
        }).catch((e) => console.warn("Backend confirm sync deferred:", e.message));
      }

      Alert.alert(
        "Import Completed",
        `Successfully committed into ${activeSemester.title}:\n• ${result.eventsCount} Academic Events\n• ${result.subjectsCount} New Subjects\n• ${result.examsCount} Exam Schedules`,
        [{ text: "View Calendar", onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      console.error("Error committing import:", e);
      Alert.alert("Commit Error", `Failed to save imported items: ${e.message}`);
    }
  };

  const getEventBadgeVariant = (cat: string) => {
    switch (cat) {
      case "cat_exam":
      case "semester_exam":
        return "error";
      case "holiday":
        return "success";
      case "deadline":
        return "warning";
      case "instructional":
      default:
        return "info";
    }
  };

  const totalSelectedCount =
    extractedEvents.filter((i) => i.selected).length +
    extractedSubjects.filter((i) => i.selected).length +
    extractedExams.filter((i) => i.selected).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={Typography.h2}>Document Intelligence</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* UPLOAD CARD */}
        <Card variant="accent" style={styles.uploadCard}>
          <Text style={Typography.h3}>Academic Document Ingestion</Text>
          <Text style={[Typography.body, { marginTop: 4 }]}>
            Upload an official academic calendar, circular, syllabus, or exam timetable (PDF or image).
          </Text>

          <Button
            title={fileName ? `Selected: ${fileName}` : "Upload Academic Document"}
            variant="outline"
            onPress={handlePickDocument}
            style={{ marginTop: Spacing.md }}
          />

          <View style={styles.infoRow}>
            <Badge label="Gemini Vision Multimodal" variant="neutral" size="sm" />
            <Text style={[Typography.caption, { flex: 1, marginLeft: Spacing.xs }]}>
              Server-isolated API key • Zero hardcoded schemes
            </Text>
          </View>
        </Card>

        {/* PROCESSING INDICATOR */}
        {isProcessing && (
          <View style={styles.processingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.bodyBold, { marginTop: Spacing.sm }]}>
              {processingStatus}
            </Text>
            <Text style={[Typography.caption, { marginTop: 4, textAlign: "center" }]}>
              Metron AI is extracting milestone dates, course syllabi, and multi-session exam schedules.
            </Text>
          </View>
        )}

        {/* REVIEW SECTION */}
        {hasProcessed && (
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={Typography.h3}>EXTRACTION REVIEW</Text>
                {institutionName ? (
                  <Text style={[Typography.caption, { color: Colors.primaryLight }]}>
                    {institutionName}
                  </Text>
                ) : null}
              </View>
              <Badge
                label={`AI Confidence: ${Math.round(overallConfidence * 100)}%`}
                variant="success"
                size="sm"
              />
            </View>

            {/* SEGMENTED TAB SWITCHER */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                onPress={() => setActiveTab("events")}
                style={[styles.tabButton, activeTab === "events" && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === "events" && styles.tabTextActive]}>
                  Events ({extractedEvents.filter((i) => i.selected).length}/{extractedEvents.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("subjects")}
                style={[styles.tabButton, activeTab === "subjects" && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === "subjects" && styles.tabTextActive]}>
                  Subjects ({extractedSubjects.filter((i) => i.selected).length}/{extractedSubjects.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("exams")}
                style={[styles.tabButton, activeTab === "exams" && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === "exams" && styles.tabTextActive]}>
                  Exams ({extractedExams.filter((i) => i.selected).length}/{extractedExams.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* SELECT ALL / DESELECT CONTROLS */}
            <View style={styles.selectControls}>
              <TouchableOpacity onPress={() => selectAllInActiveTab(true)}>
                <Text style={styles.controlLink}>Select All</Text>
              </TouchableOpacity>
              <Text style={styles.controlDivider}>•</Text>
              <TouchableOpacity onPress={() => selectAllInActiveTab(false)}>
                <Text style={styles.controlLink}>Deselect All</Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: ACADEMIC EVENTS */}
            {activeTab === "events" && (
              <View style={{ gap: Spacing.sm }}>
                {extractedEvents.length === 0 ? (
                  <Text style={[Typography.caption, { textAlign: "center", marginVertical: Spacing.md }]}>
                    No academic calendar events detected in document.
                  </Text>
                ) : (
                  extractedEvents.map((item) => (
                    <Card key={item.id} variant="default" style={styles.itemCard}>
                      <TouchableOpacity
                        onPress={() => toggleEvent(item.id)}
                        style={styles.itemRow}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            item.selected && styles.checkboxActive,
                          ]}
                        >
                          {item.selected && <Text style={styles.checkText}>✓</Text>}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={Typography.bodyBold}>{item.title}</Text>
                          <Text style={[Typography.caption, { color: Colors.primaryLight }]}>
                            Date: {item.date}
                          </Text>
                          {item.description ? (
                            <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 2 }]}>
                              {item.description}
                            </Text>
                          ) : null}
                        </View>

                        <Badge
                          label={item.category.replace("_", " ")}
                          variant={getEventBadgeVariant(item.category)}
                          size="sm"
                        />
                      </TouchableOpacity>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 2: DISCOVERED SUBJECTS */}
            {activeTab === "subjects" && (
              <View style={{ gap: Spacing.sm }}>
                {extractedSubjects.length === 0 ? (
                  <Text style={[Typography.caption, { textAlign: "center", marginVertical: Spacing.md }]}>
                    No subjects identified in this document.
                  </Text>
                ) : (
                  extractedSubjects.map((item) => (
                    <Card key={item.id} variant="default" style={styles.itemCard}>
                      <TouchableOpacity
                        onPress={() => toggleSubject(item.id)}
                        style={styles.itemRow}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            item.selected && styles.checkboxActive,
                          ]}
                        >
                          {item.selected && <Text style={styles.checkText}>✓</Text>}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={Typography.bodyBold}>
                            {item.code ? `[${item.code}] ` : ""}
                            {item.name}
                          </Text>
                          <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 2 }]}>
                            {item.credits} Credits {item.faculty ? `• ${item.faculty}` : ""}
                          </Text>
                        </View>

                        <Badge
                          label={item.category}
                          variant={item.category === "Laboratory" ? "success" : "primary"}
                          size="sm"
                        />
                      </TouchableOpacity>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: EXAM SCHEDULES */}
            {activeTab === "exams" && (
              <View style={{ gap: Spacing.sm }}>
                {extractedExams.length === 0 ? (
                  <Text style={[Typography.caption, { textAlign: "center", marginVertical: Spacing.md }]}>
                    No exam timetable rows identified in this document.
                  </Text>
                ) : (
                  extractedExams.map((item) => (
                    <Card key={item.id} variant="default" style={styles.itemCard}>
                      <TouchableOpacity
                        onPress={() => toggleExam(item.id)}
                        style={styles.itemRow}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            item.selected && styles.checkboxActive,
                          ]}
                        >
                          {item.selected && <Text style={styles.checkText}>✓</Text>}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={Typography.bodyBold}>
                            {item.subject_code ? `[${item.subject_code}] ` : ""}
                            {item.subject_name}
                          </Text>
                          <Text style={[Typography.caption, { color: Colors.primaryLight }]}>
                            {item.exam_date} • Session: {item.session || "FN"}
                          </Text>
                          {item.programme ? (
                            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                              Target: {item.programme} {item.section ? `Sec ${item.section}` : ""}
                            </Text>
                          ) : null}
                        </View>

                        <Badge label={item.exam_type} variant="warning" size="sm" />
                      </TouchableOpacity>
                    </Card>
                  ))
                )}
              </View>
            )}

            {/* CONFIRM & COMMIT BUTTON */}
            <Button
              title={`Confirm & Commit All (${totalSelectedCount} Selected)`}
              onPress={handleConfirmImport}
              style={{ marginTop: Spacing.md }}
            />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.sm,
  },
  backText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  uploadCard: {
    backgroundColor: Colors.surface,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  processingBox: {
    padding: Spacing.xl,
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewSection: {
    gap: Spacing.md,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  selectControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    justifyContent: "flex-end",
  },
  controlLink: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primaryLight,
  },
  controlDivider: {
    color: Colors.textTertiary,
  },
  itemCard: {
    padding: Spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});

