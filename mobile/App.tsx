import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { AppNavigator } from "./src/app/navigation/AppNavigator";
import { ErrorBoundary } from "./src/components/ui/ErrorBoundary";
import { useAppStore } from "./src/store/useAppStore";
import { Colors, Typography, Spacing } from "./src/components/ui/theme";

export default function App() {
  const { isInitialized, initialize } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>M</Text>
        </View>
        <Text style={[Typography.h2, { marginTop: Spacing.md, letterSpacing: 2 }]}>
          METRON
        </Text>
        <Text style={[Typography.caption, { marginTop: 4, letterSpacing: 1 }]}>
          MEASURE. ORGANIZE. PROGRESS.
        </Text>
        <ActivityIndicator
          size="small"
          color={Colors.primary}
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: {
    color: Colors.textAccent,
    fontWeight: "900",
    fontSize: 32,
  },
});
