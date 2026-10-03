import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors, Typography, BorderRadius, Spacing } from "./theme";

interface BadgeProps {
  label: string;
  variant?: "primary" | "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "neutral",
  size = "md",
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case "primary":
        return { bg: "rgba(205, 32, 44, 0.15)", text: Colors.primary };
      case "success":
        return { bg: "rgba(16, 185, 129, 0.15)", text: Colors.success };
      case "warning":
        return { bg: "rgba(245, 158, 11, 0.15)", text: Colors.warning };
      case "error":
        return { bg: "rgba(239, 68, 68, 0.15)", text: Colors.error };
      case "info":
        return { bg: "rgba(59, 130, 246, 0.15)", text: Colors.info };
      case "neutral":
      default:
        return { bg: Colors.surfaceInput, text: Colors.textSecondary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg },
        size === "sm" ? styles.sm : styles.md,
        style,
      ]}
    >
      <Text style={[Typography.badge, { color: text }]}>{label.toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  sm: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
});
