import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet } from "react-native";
import { BottomTabParamList } from "./types";
import { DashboardScreen } from "../../features/dashboard/DashboardScreen";
import { SubjectsListScreen } from "../../features/subjects/SubjectsListScreen";
import { AcademicCalendarScreen } from "../../features/calendar/AcademicCalendarScreen";
import { TasksScreen } from "../../features/tasks/TasksScreen";
import { HistoryScreen } from "../../features/history/HistoryScreen";
import { Colors, Typography, Spacing } from "../../components/ui/theme";

const Tab = createBottomTabNavigator<BottomTabParamList>();

const getTabIcon = (routeName: string, focused: boolean) => {
  let symbol = "●";
  switch (routeName) {
    case "Home":
      symbol = "◈";
      break;
    case "Subjects":
      symbol = "☵";
      break;
    case "Calendar":
      symbol = "▦";
      break;
    case "Tasks":
      symbol = "☑";
      break;
    case "History":
      symbol = "◷";
      break;
  }

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, { color: focused ? Colors.primary : Colors.textTertiary }]}>
        {symbol}
      </Text>
    </View>
  );
};

export const BottomTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused }) => getTabIcon(route.name, focused),
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Subjects" component={SubjectsListScreen} />
      <Tab.Screen name="Calendar" component={AcademicCalendarScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
