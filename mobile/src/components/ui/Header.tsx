import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "./theme";
import { useAppStore } from "../../store/useAppStore";
import { SemesterSwitcherModal } from "../../features/semesters/SemesterSwitcherModal";
import { performCloudSync } from "../../services/syncManager";

interface HeaderProps {
  title?: string;
  showSemesterBadge?: boolean;
  onPressImport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showSemesterBadge = true,
  onPressImport,
}) => {
  const activeSemester = useAppStore((state) => state.activeSemester);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    try {
      const res = await performCloudSync();
      if (res.success) {
        Alert.alert(
          "Cloud Sync Complete",
          `• Pushed: ${res.pushedCount} mutations\n• Pulled: ${res.pulledCount} updates\n• Conflicts: ${res.conflictsCount} (LWW resolved)`
        );
      } else {
        Alert.alert(
          "Offline / Sync Notice",
          `Changes are preserved locally in SQLite sync_queue.\nDetail: ${res.error || "Server unreachable"}`
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.leftRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>M</Text>
          </View>
          <View>
            <Text style={Typography.h2}>{title || "METRON"}</Text>
            {showSemesterBadge && activeSemester && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSwitcherVisible(true)}
                style={styles.termSelector}
              >
                <Text style={styles.termText}>
                  {activeSemester.title} ▾
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCloudSync}
            disabled={isSyncing}
            style={styles.syncButton}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.syncIcon}>☁️</Text>
            )}
          </TouchableOpacity>

          {onPressImport && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPressImport}
              style={styles.importButton}
            >
              <Text style={styles.importText}>+ Document</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SemesterSwitcherModal
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 4,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: {
    color: Colors.textAccent,
    fontWeight: "900",
    fontSize: 18,
  },
  termSelector: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  termText: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: "600",
  },
  importButton: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
  },
  importText: {
    color: Colors.primaryLight,
    fontWeight: "600",
    fontSize: 12,
  },
  syncButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
  },
  syncIcon: {
    fontSize: 14,
  },
});
