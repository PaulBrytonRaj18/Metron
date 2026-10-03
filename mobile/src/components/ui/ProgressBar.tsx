import React from "react";
import { View, StyleSheet, Text, ViewStyle } from "react-native";
import { Colors, Typography, BorderRadius, Spacing } from "./theme";

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  label?: string;
  showPercent?: boolean;
  height?: number;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = Colors.primary,
  label,
  showPercent = true,
  height = 6,
  style,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View style={[styles.container, style]}>
      {(label || showPercent) && (
        <View style={styles.header}>
          {label ? <Text style={Typography.caption}>{label}</Text> : <View />}
          {showPercent && (
            <Text style={[Typography.caption, { color: Colors.textPrimary, fontWeight: "600" }]}>
              {clamped}%
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  track: {
    width: "100%",
    backgroundColor: Colors.surfaceInput,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: BorderRadius.full,
  },
});
