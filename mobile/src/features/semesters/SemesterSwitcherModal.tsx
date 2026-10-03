import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useAppStore, Semester } from "../../store/useAppStore";

interface SemesterSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SemesterSwitcherModal: React.FC<SemesterSwitcherModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    semesters,
    activeSemester,
    setActiveSemester,
    createSemester,
    deleteSemester,
  } = useAppStore();

  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [academicYear, setAcademicYear] = useState(() => {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  });
  const [semesterNumber, setSemesterNumber] = useState(() =>
    activeSemester ? String(activeSemester.semester_number + 1) : "1"
  );
  const [department, setDepartment] = useState(() => activeSemester?.department || "");
  const [programme, setProgramme] = useState(() => activeSemester?.programme || "");
  const [section, setSection] = useState(() => activeSemester?.section || "");

  const handleSelect = async (semId: string) => {
    await setActiveSemester(semId);
    onClose();
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a semester title.");
      return;
    }

    await createSemester({
      title: title.trim(),
      academic_year: academicYear.trim(),
      semester_number: parseInt(semesterNumber) || 1,
      department: department.trim() || undefined,
      programme: programme.trim() || undefined,
      section: section.trim() || undefined,
    });

    setTitle("");
    setIsCreating(false);
    onClose();
  };

  const handleDelete = (sem: Semester) => {
    if (semesters.length <= 1) {
      Alert.alert("Action Disallowed", "You must keep at least one semester.");
      return;
    }
    Alert.alert(
      "Delete Semester",
      `Are you sure you want to delete ${sem.title}? All associated subjects and chapters will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSemester(sem.id);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={Typography.h2}>Academic Term Switcher</Text>
              <Text style={Typography.caption}>
                Zero hardcoding: Track multiple semesters independently.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!isCreating ? (
            <ScrollView
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.sm }}
            >
              {semesters.map((s) => {
                const isActive = activeSemester?.id === s.id;
                return (
                  <Card
                    key={s.id}
                    variant={isActive ? "accent" : "default"}
                    onPress={() => handleSelect(s.id)}
                    style={styles.semesterCard}
                  >
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.titleRow}>
                          <Text style={Typography.bodyBold}>{s.title}</Text>
                          {isActive && (
                            <Badge label="ACTIVE" variant="primary" size="sm" />
                          )}
                        </View>
                        <Text style={Typography.caption}>
                          {s.academic_year} • Semester {s.semester_number}
                          {s.programme ? ` • ${s.programme}` : ""}
                          {s.section ? ` (Sec ${s.section})` : ""}
                        </Text>
                      </View>

                      {!isActive && (
                        <TouchableOpacity
                          onPress={() => handleDelete(s)}
                          style={styles.deleteBtn}
                        >
                          <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card>
                );
              })}

              <Button
                title="+ Add New Semester"
                variant="outline"
                onPress={() => {
                  setTitle(`Semester ${(activeSemester?.semester_number || 5) + 1}`);
                  setSemesterNumber(String((activeSemester?.semester_number || 5) + 1));
                  setIsCreating(true);
                }}
                style={{ marginTop: Spacing.sm }}
              />
            </ScrollView>
          ) : (
            <ScrollView
              style={{ maxHeight: 420 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.sm }}
            >
              <Text style={Typography.h3}>Define Academic Term</Text>

              <TextInput
                style={styles.input}
                placeholder="Title (e.g. Semester 6 (Spring 2027))"
                placeholderTextColor={Colors.textTertiary}
                value={title}
                onChangeText={setTitle}
              />

              <View style={styles.rowGap}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Academic Year (e.g. 2026-2027)"
                  placeholderTextColor={Colors.textTertiary}
                  value={academicYear}
                  onChangeText={setAcademicYear}
                />
                <TextInput
                  style={[styles.input, { width: 90 }]}
                  placeholder="Sem #"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  value={semesterNumber}
                  onChangeText={setSemesterNumber}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Programme (e.g. B.Tech Computer Science)"
                placeholderTextColor={Colors.textTertiary}
                value={programme}
                onChangeText={setProgramme}
              />

              <View style={styles.rowGap}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Department (e.g. CSE)"
                  placeholderTextColor={Colors.textTertiary}
                  value={department}
                  onChangeText={setDepartment}
                />
                <TextInput
                  style={[styles.input, { width: 90 }]}
                  placeholder="Section (e.g. A)"
                  placeholderTextColor={Colors.textTertiary}
                  value={section}
                  onChangeText={setSection}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Back"
                  variant="secondary"
                  onPress={() => setIsCreating(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Create Term"
                  variant="primary"
                  onPress={handleCreate}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: Spacing.md,
  },
  content: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  closeText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "700",
  },
  semesterCard: {
    padding: Spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 2,
  },
  deleteBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: BorderRadius.sm,
  },
  deleteText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
  },
  input: {
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  rowGap: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
