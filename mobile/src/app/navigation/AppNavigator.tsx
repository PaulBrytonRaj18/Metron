import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import { BottomTabs } from "./BottomTabs";
import { SubjectDetailScreen } from "../../features/subjects/SubjectDetailScreen";
import { DocumentImportScreen } from "../../features/import/DocumentImportScreen";
import { ExamCenterScreen } from "../../features/exams/ExamCenterScreen";
import { MarksCalculatorScreen } from "../../features/marks/MarksCalculatorScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen
        name="DocumentImport"
        component={DocumentImportScreen}
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="ExamCenter" component={ExamCenterScreen} />
      <Stack.Screen name="MarksCalculator" component={MarksCalculatorScreen} />
    </Stack.Navigator>
  );
};
