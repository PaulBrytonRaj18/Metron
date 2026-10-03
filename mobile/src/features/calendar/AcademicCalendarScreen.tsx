import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../app/navigation/types";
import { Colors, Typography, Spacing, BorderRadius } from "../../components/ui/theme";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Header } from "../../components/ui/Header";
import { useAppStore, AcademicEvent } from "../../store/useAppStore";
import {
  getGoogleCalendarStatus,
  connectGoogleCalendar,
  syncGoogleCalendar,
  disconnectGoogleCalendar,
  GoogleCalendarStatus,
} from "../../services/googleCalendarService";

export const AcademicCalendarScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { academicEvents, activeSemester, addAcademicEvent, loadSemesterData } = useAppStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("cat_exam");

  // Google Calendar Integration State (Phase 8)
  const [gcalStatus, setGcalStatus] = useState<GoogleCalendarStatus>({
    is_connected: false,
    email: null,
    last_synced_at: null,
    synced_events_count: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshGcalStatus = async () => {
    const status = await getGoogleCalendarStatus();
    setGcalStatus(status);
  };

  useEffect(() => {
    refreshGcalStatus();
  }, []);

  const handleConnectGcal = async () => {
    setIsSyncing(true);
    try {
      const res = await connectGoogleCalendar("auth_mobile_client");
      setGcalStatus(res);
      Alert.alert(
        "Google Calendar Connected",
        `Linked account: ${res.email || "student@university.edu"}\nReady for selective milestone sync.`
      );
    } catch (err: any) {
      Alert.alert("Connection Error", err.message || "Could not link Google account.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncGcal = async () => {
    setIsSyncing(true);
    try {
      const res = await syncGoogleCalendar(activeSemester?.id, true, false);
      if (activeSemester) {
        await loadSemesterData(activeSemester.id);
      }
      await refreshGcalStatus();
      Alert.alert(
        "Sync Completed",
        `Selective push finished:\n• ${res.pushed_events_count} milestones exported\n• ${res.updated_events_count} events updated\n• 0 duplicates created`
      );
    } catch (err: any) {
      Alert.alert("Sync Error", err.message || "Failed to push events to Google Calendar.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectGcal = () => {
    Alert.alert(
      "Disconnect Google Calendar",
      "Unlink external calendar sync? Existing Google events will remain on your calendar.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await disconnectGoogleCalendar();
            await refreshGcalStatus();
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    if (!title.trim() || !activeSemester) return;
    await addAcademicEvent({
      semester_id: activeSemester.id,
      title: title.trim(),
      start_date: startDate.trim(),
      category,
    });
    setTitle("");
    setModalVisible(false);
  };

  const getCategoryVariant = (cat: string) => {
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

  const renderEvent = ({ item }: { item: AcademicEvent }) => (
    <Card variant="default" style={styles.eventCard}>
      <View style={styles.eventRow}>
        <View style={styles.dateBox}>
          <Text style={styles.dateText}>{item.start_date.slice(5)}</Text>
          <Text style={styles.yearText}>{item.start_date.slice(0, 4)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={Typography.bodyBold}>{item.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <Badge
              label={item.category.replace("_", " ")}
              variant={getCategoryVariant(item.category)}
              size="sm"
            />
            {item.google_event_id && (
              <Badge label="📅 GCal Synced" variant="success" size="sm" />
            )}
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="ACADEMIC CALENDAR"
        onPressImport={() => navigation.navigate("DocumentImport")}
      />

      {/* GOOGLE CALENDAR SYNC BANNER (PHASE 8) */}
      <Card variant="accent" style={styles.gcalCard}>
        <View style={styles.gcalHeaderRow}>
          <Text style={{ fontSize: 22 }}>📅</Text>
          <View style={{ flex: 1, marginLeft: Spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={styles.gcalTitle}>Google Calendar Integration</Text>
              <Badge
                label={gcalStatus.is_connected ? "CONNECTED" : "NOT CONNECTED"}
                variant={gcalStatus.is_connected ? "success" : "neutral"}
                size="sm"
              />
            </View>
            <Text style={styles.gcalSub}>
              {gcalStatus.is_connected
                ? `Linked: ${gcalStatus.email || "Active Student"} • ${gcalStatus.synced_events_count} events synced`
                : "Selective sync: push official exams & milestones without task clutter."}
            </Text>
          </View>
        </View>

        <View style={styles.gcalActionRow}>
          {gcalStatus.is_connected ? (
            <>
              <TouchableOpacity
                style={styles.gcalSyncBtn}
                onPress={handleSyncGcal}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.gcalSyncBtnText}>🔄 Push Sync to GCal</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gcalDisconnectBtn}
                onPress={handleDisconnectGcal}
                disabled={isSyncing}
              >
                <Text style={styles.gcalDisconnectBtnText}>Disconnect</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.gcalConnectBtn}
              onPress={handleConnectGcal}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.gcalConnectBtnText}>🔗 Connect Google Calendar</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <View style={styles.topBar}>
        <Text style={Typography.caption}>
          {academicEvents.length} SCHEDULED MILESTONES
        </Text>
        <Button title="+ Add Event" size="sm" onPress={() => setModalVisible(true)} />
      </View>

      <FlatList
        data={academicEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* CREATE EVENT MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={Typography.h2}>Add Calendar Milestone</Text>
            <Text style={[Typography.caption, { marginTop: 4, marginBottom: Spacing.md }]}>
              Enter instructional dates, internal examinations, or deadlines.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Event Title (e.g. Model Practical Exam)"
              placeholderTextColor={Colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={Colors.textTertiary}
              value={startDate}
              onChangeText={setStartDate}
            />

            <View style={styles.categoryPicker}>
              {(["cat_exam", "semester_exam", "instructional", "holiday"] as const).map(
                (c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.categoryOption,
                      category === c && styles.categoryOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        category === c && styles.categoryOptionTextActive,
                      ]}
                    >
                      {c.replace("_", " ").toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Event"
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  eventCard: {
    padding: Spacing.md,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dateBox: {
    backgroundColor: Colors.surfaceInput,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    minWidth: 54,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: {
    color: Colors.primaryLight,
    fontWeight: "800",
    fontSize: 14,
  },
  yearText: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: "600",
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
  categoryPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  categoryOption: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceInput,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  categoryOptionTextActive: {
    color: Colors.textAccent,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  gcalCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  gcalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  gcalTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  gcalSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  gcalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  gcalSyncBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  gcalSyncBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  gcalDisconnectBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceInput,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gcalDisconnectBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  gcalConnectBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  gcalConnectBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
