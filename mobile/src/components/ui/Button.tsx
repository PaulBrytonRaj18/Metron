import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Colors, Typography, BorderRadius, Spacing } from "./theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: disabled ? Colors.border : Colors.primary,
        };
      case "secondary":
        return {
          backgroundColor: Colors.surfaceElevated,
          borderWidth: 1,
          borderColor: Colors.border,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: disabled ? Colors.border : Colors.primary,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
        };
      case "danger":
        return {
          backgroundColor: Colors.error,
        };
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case "sm":
        return {
          container: { paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.sm + 4 },
          text: { fontSize: 12 },
        };
      case "lg":
        return {
          container: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
          text: { fontSize: 16 },
        };
      case "md":
      default:
        return {
          container: { paddingVertical: Spacing.sm + 4, paddingHorizontal: Spacing.md },
          text: { fontSize: 14 },
        };
    }
  };

  const sizeStyle = getSizeStyle();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getVariantStyle(),
        sizeStyle.container,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              Typography.bodyBold,
              { color: variant === "outline" ? Colors.primary : Colors.textPrimary },
              sizeStyle.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
