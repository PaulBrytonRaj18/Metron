import React from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from "react-native";
import { Colors, BorderRadius, Spacing } from "./theme";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "accent";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  onPress,
  style,
}) => {
  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: Colors.surfaceElevated,
          borderColor: Colors.border,
        };
      case "accent":
        return {
          backgroundColor: Colors.surface,
          borderColor: Colors.primary,
          borderLeftWidth: 3,
        };
      case "default":
      default:
        return {
          backgroundColor: Colors.surface,
          borderColor: Colors.border,
        };
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.base, getCardStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, getCardStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
});
