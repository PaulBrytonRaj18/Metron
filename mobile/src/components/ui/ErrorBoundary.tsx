import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "./theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Metron Uncaught ErrorBoundary Exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>⚠️</Text>
            </View>
            <Text style={[Typography.h2, styles.title]}>Something went wrong</Text>
            <Text style={[Typography.body, styles.message]}>
              An unexpected error occurred in Metron. Your local data in SQLite is safe.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.debugBox}>
                <Text style={styles.debugText}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={this.handleReset}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Reload Interface</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  errorCard: {
    width: "100%",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceInput,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  message: {
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  debugBox: {
    width: "100%",
    backgroundColor: Colors.surfaceInput,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  debugText: {
    color: Colors.error,
    fontSize: 11,
    fontFamily: "monospace",
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
