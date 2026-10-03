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
} from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Header } from "../../components/ui/Header";
import { useAppStore, Task } from "../../store/useAppStore";

type FilterType = "all" | "next_action" | "pending" | "assignments" | "labs" | "completed";

export const TasksScreen: React.FC = () => {
  const {
    tasks,
    subjects,
    toggleTaskStatus,
    setTaskNextAction,
    createTask,
    deleteTask,
  } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(
    subjects[0]?.id
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
  const [isNextAction, setIsNextAction] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "next_action") return t.is_next_action;
    if (activeFilter === "pending") return t.status === "pending";
    if (activeFilter === "completed") return t.status === "completed";
    if (activeFilter === "assignments") return Boolean(t.assignment_id);
    if (activeFilter === "labs") return Boolean(t.experiment_id);
    return true;
  });

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a task title.");
      return;
    }
    await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status: "pending",
      subject_id: selectedSubjectId,
      due_date: dueDate.trim() || undefined,
      is_next_action: isNextAction,
    });
    setTitle("");
    setDescription("");
    setIsNextAction(false);
    setModalVisible(false);
  };

  const handleDelete = (t: Task) => {
    Alert.alert("Delete Task", `Remove "${t.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTask(t.id) },
    ]);
  };

  const renderTask = ({ item }: { item: Task }) => {
    const subj = subjects.find((s) => s.id === item.subject_id);
    const isCompleted = item.status === "completed";

    return (
      <Card
        variant={item.is_next_action ? "accent" : "default"}
        style={[
          styles.taskCard,
          subj?.color_accent ? { borderLeftColor: subj.color_accent, borderLeftWidth: 3.5 } : {},
        ]}
      >
        <View style={styles.taskRow}>
          {/* CHECKBOX */}
          <TouchableOpacity
            onPress={() => toggleTaskStatus(item.id)}
            style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
          >
            {isCompleted && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          {/* TASK DETAILS */}
          <View style={{ flex: 1 }}>
            <View style={styles.sourceRow}>
              {subj && (
                <Text style={[styles.subjectTag, { color: subj.color_accent || Colors.primaryLight }]}>
                  {subj.code || subj.name}
                </Text>
              )}
              {item.assignment_id && <Badge label="Assignment" variant="info" size="sm" />}
              {item.experiment_id && <Badge label="Lab Record" variant="warning" size="sm" />}
              {!item.assignment_id && !item.experiment_id && (
                <Badge label="Action Item" variant="neutral" size="sm" />
              )}
              <Badge
                label={item.priority}
                variant={
                  item.priority === "urgent"
                    ? "error"
                    : item.priority === "high"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              />
            </View>

            <Text style={[Typography.bodyBold, isCompleted && styles.taskCompletedText, { marginTop: 4 }]}>
              {item.title}
            </Text>

            {item.description && (
              <Text style={[Typography.caption, { marginTop: 2 }]}>{item.description}</Text>
            )}

            {item.due_date && (
              <Text style={[Typography.caption, { color: Colors.primaryLight, marginTop: 4 }]}>
                Due: {item.due_date}
              </Text>
            )}
          </View>

          {/* NEXT ACTION STAR & DELETE */}
          <View style={styles.actionsColumn}>
            <TouchableOpacity
              onPress={() => setTaskNextAction(item.id)}
              style={[styles.starBtn, item.is_next_action && styles.starBtnActive]}
            >
              <Text style={[styles.starText, item.is_next_action && styles.starTextActive]}>
                {item.is_next_action ? "★" : "☆"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.delBtn}>
              <Text style={styles.delText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="ACADEMIC TASKS" showSemesterBadge={false} />

      {/* FILTER CHIPS (PHASE 3) */}
      <View style={styles.filterScroll}>
        {(
          [
            ["all", "ALL"],
            ["next_action", "NEXT ACTION ★"],
            ["pending", "PENDING"],
            ["assignments", "ASSIGNMENTS"],
            ["labs", "LAB RECORDS"],
            ["completed", "COMPLETED"],
          ] as const
        ).map(([filterKey, filterLabel]) => (
          <TouchableOpacity
            key={filterKey}
            onPress={() => setActiveFilter(filterKey)}
            style={[
              styles.filterChip,
              activeFilter === filterKey && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filterKey && styles.filterTextActive,
              ]}
            >
              {filterLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.topBar}>
        <Text style={Typography.caption}>{filteredTasks.length} ITEMS ON BOARD</Text>
        <Button title="+ Add Task" size="sm" onPress={() => setModalVisible(true)} />
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={Typography.body}>No tasks in this view.</Text>
            <Text style={[Typography.caption, { marginTop: 4 }]}>
              All assignments, lab records, and action items stay synchronized here.
            </Text>
          </View>
        }
      />

      {/* CREATE TASK MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Add Academic Action Item</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              Action items directly feed into your Next Action command center.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Task Title (e.g. Solve Deadlock Avoidance Set)"
              placeholderTextColor={Colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, { height: 75, textAlignVertical: "top" }]}
              placeholder="Description or notes (optional)"
              placeholderTextColor={Colors.textTertiary}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            {/* SUBJECT SELECTION */}
            {subjects.length > 0 && (
              <View style={{ marginBottom: Spacing.sm }}>
                <Text style={[Typography.caption, { marginBottom: 4 }]}>Associate Subject:</Text>
                <View style={styles.subjectChipsRow}>
                  {subjects.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedSubjectId(s.id)}
                      style={[
                        styles.subjChip,
                        selectedSubjectId === s.id && styles.subjChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjChipText,
                          selectedSubjectId === s.id && styles.subjChipTextActive,
                        ]}
                      >
                        {s.code || s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.rowGap}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Due Date (YYYY-MM-DD)"
                placeholderTextColor={Colors.textTertiary}
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>

            {/* PRIORITY CHIPS */}
            <Text style={[Typography.caption, { marginBottom: Spacing.xs }]}>Priority Level:</Text>
            <View style={styles.priorityRow}>
              {(["low", "medium", "high", "urgent"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.priorityChip, priority === p && styles.priorityChipActive]}
                >
                  <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* NEXT ACTION TOGGLE */}
            <TouchableOpacity
              onPress={() => setIsNextAction(!isNextAction)}
              style={styles.nextActionToggleRow}
            >
              <View style={[styles.toggleCheckbox, isNextAction && styles.toggleCheckboxActive]}>
                {isNextAction && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={Typography.bodyBold}>Designate as Primary Next Action (★)</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Save Action" variant="primary" onPress={handleCreateTask} style={{ flex: 1 }} />
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
  filterScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  filterTextActive: {
    color: Colors.textAccent,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  taskCard: {
    padding: Spacing.sm + 4,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm + 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  taskCompletedText: {
    textDecorationLine: "line-through",
    color: Colors.textTertiary,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  subjectTag: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  actionsColumn: {
    alignItems: "center",
    gap: 8,
  },
  starBtn: {
    padding: 2,
  },
  starBtnActive: {},
  starText: {
    fontSize: 20,
    color: Colors.textTertiary,
  },
  starTextActive: {
    color: Colors.primaryLight,
  },
  delBtn: {
    padding: 2,
  },
  delText: {
    color: Colors.textTertiary,
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
  subjectChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  subjChip: {
    backgroundColor: Colors.surfaceInput,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subjChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subjChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  subjChipTextActive: {
    color: Colors.textAccent,
  },
  rowGap: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  priorityRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priorityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  priorityTextActive: {
    color: Colors.textAccent,
  },
  nextActionToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  toggleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleCheckboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});
