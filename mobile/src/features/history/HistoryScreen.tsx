import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Header } from "../../components/ui/Header";
import { getDatabase } from "../../data/sqlite/database";
import { useAppStore } from "../../store/useAppStore";

interface HistoryItem {
  id: string;
  action_type: string;
  title: string;
  description?: string;
  subject_id?: string;
  duration_minutes?: number;
  logged_at: string;
  subject_name?: string;
  subject_code?: string;
  subject_color?: string;
}

type FilterCategory = "all" | "assignments" | "labs" | "tasks" | "study";

export const HistoryScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const subjects = useAppStore((state) => state.subjects);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("45");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const db = await getDatabase();
      const logs = await db.getAllAsync<HistoryItem>(
        `SELECT h.*, s.name as subject_name, s.code as subject_code, s.color_code as subject_color
         FROM history h
         LEFT JOIN subjects s ON h.subject_id = s.id
         ORDER BY h.logged_at DESC;`
      );
      setHistoryItems(logs);
    } catch (e) {
      console.error("Error loading history:", e);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      loadHistory();
    }
  }, [isFocused, loadHistory]);

  const handleLogStudy = async () => {
    if (!title.trim()) return;
    try {
      const db = await getDatabase();
      const id = `hist_${Date.now()}`;
      const now = new Date().toISOString();
      const dur = parseInt(duration, 10) || 30;
      await db.runAsync(
        `INSERT INTO history (id, user_id, action_type, title, description, subject_id, duration_minutes, logged_at, created_at, updated_at)
         VALUES (?, ?, 'study_session', ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          "local_user",
          title.trim(),
          selectedSubjectId ? "Focused study session" : null,
          selectedSubjectId,
          dur,
          now,
          now,
          now,
        ]
      );
      setTitle("");
      setDuration("45");
      setSelectedSubjectId(null);
      setModalVisible(false);
      await loadHistory();
    } catch (e) {
      console.error("Error saving study log:", e);
    }
  };

  const getActionBadge = (item: HistoryItem) => {
    switch (item.action_type) {
      case "assignment_submitted":
        return <Badge label="SUBMISSION" variant="info" size="sm" />;
      case "assignment_graded":
        return <Badge label="GRADED" variant="primary" size="sm" />;
      case "record_approved":
        return <Badge label="RECORD APPROVED" variant="success" size="sm" />;
      case "observation_signed":
        return <Badge label="OBSERVATION SIGNED" variant="warning" size="sm" />;
      case "task_completed":
        return <Badge label="TASK COMPLETED" variant="success" size="sm" />;
      case "study_session":
        return <Badge label="STUDY SESSION" variant="primary" size="sm" />;
      default:
        return <Badge label={item.action_type.replace(/_/g, " ")} variant="neutral" size="sm" />;
    }
  };

  const filteredItems = historyItems.filter((item) => {
    if (selectedFilter === "assignments") {
      return item.action_type.startsWith("assignment_");
    }
    if (selectedFilter === "labs") {
      return item.action_type === "record_approved" || item.action_type === "observation_signed";
    }
    if (selectedFilter === "tasks") {
      return item.action_type === "task_completed";
    }
    if (selectedFilter === "study") {
      return item.action_type === "study_session";
    }
    return true;
  });

  const totalStudyMinutes = historyItems.reduce(
    (acc, curr) => acc + (curr.duration_minutes || 0),
    0
  );

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const dateObj = new Date(item.logged_at);
    const dateStr = !isNaN(dateObj.getTime())
      ? `${dateObj.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} • ${dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : item.logged_at;

    return (
      <Card variant="default" style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            {getActionBadge(item)}
            {item.subject_code ? (
              <View
                style={[
                  styles.subjectPill,
                  { borderColor: item.subject_color || Colors.primary },
                ]}
              >
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: item.subject_color || Colors.primary },
                  ]}
                />
                <Text style={styles.subjectPillText}>{item.subject_code}</Text>
              </View>
            ) : null}
          </View>

          {item.duration_minutes ? (
            <Badge label={`${item.duration_minutes}m`} variant="neutral" size="sm" />
          ) : null}
        </View>

        <Text style={[Typography.bodyBold, styles.cardTitle]}>{item.title}</Text>

        {item.description ? (
          <Text style={[Typography.caption, styles.cardDesc]}>{item.description}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={Typography.caption}>{dateStr}</Text>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="ACADEMIC HISTORY" showSemesterBadge={false} />

      {/* STATS OVERVIEW */}
      <View style={styles.statsBanner}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{historyItems.length}</Text>
          <Text style={styles.statLabel}>TOTAL LOGS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
          </Text>
          <Text style={styles.statLabel}>DEDICATED STUDY</Text>
        </View>
      </View>

      {/* FILTER CHIPS */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {[
            { key: "all", label: "All Logs" },
            { key: "assignments", label: "Assignments" },
            { key: "labs", label: "Lab Work" },
            { key: "tasks", label: "Tasks" },
            { key: "study", label: "Study Sessions" },
          ].map((f) => {
            const isSelected = selectedFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setSelectedFilter(f.key as FilterCategory)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.actionRow}>
        <Text style={Typography.caption}>
          SHOWING {filteredItems.length} OF {historyItems.length} ENTRIES
        </Text>
        <Button title="+ Log Study" size="sm" onPress={() => setModalVisible(true)} />
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={Typography.body}>No records found in this category.</Text>
            <Text style={[Typography.caption, { marginTop: 4, textAlign: "center" }]}>
              Completed assignments, signed lab observations, approved records, and logged study sessions are automatically archived here.
            </Text>
          </View>
        }
      />

      {/* LOG STUDY MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Log Study Session</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              Record focused study or revision effort into your permanent history.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Session Topic (e.g. Memory Paging deep dive)"
              placeholderTextColor={Colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Duration in minutes (e.g. 45)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={duration}
              onChangeText={setDuration}
            />

            {/* Optional Subject Selection */}
            {subjects.length > 0 && (
              <View style={{ marginBottom: Spacing.md }}>
                <Text style={[Typography.caption, { marginBottom: Spacing.xs }]}>
                  SELECT SUBJECT (OPTIONAL):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40 }}>
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjectId === sub.id;
                    const accent = sub.color_accent || Colors.primary;
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        onPress={() =>
                          setSelectedSubjectId(isSelected ? null : sub.id)
                        }
                        style={[
                          styles.subjectChip,
                          isSelected && {
                            borderColor: accent,
                            backgroundColor: `${accent}22`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subjectChipText,
                            isSelected && {
                              color: accent,
                              fontWeight: "600",
                            },
                          ]}
                        >
                          {sub.code || sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Log"
                variant="primary"
                onPress={handleLogStudy}
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
  statsBanner: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  filterSection: {
    paddingVertical: Spacing.xs,
  },
  filterRow: {
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
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  filterChipTextActive: {
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
    gap: Spacing.sm,
  },
  historyCard: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  subjectPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subjectPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cardTitle: {
    fontSize: 14,
    marginTop: 2,
  },
  cardDesc: {
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  cardFooter: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    marginBottom: Spacing.md,
  },
  subjectChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs - 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  subjectChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});

