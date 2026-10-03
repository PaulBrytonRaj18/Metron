export type RootStackParamList = {
  MainTabs: undefined;
  SubjectDetail: { subjectId: string };
  DocumentImport: undefined;
  SemesterSetup: undefined;
  ExamCenter: undefined;
  MarksCalculator: { subjectId?: string } | undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Subjects: undefined;
  Calendar: undefined;
  Tasks: undefined;
  History: undefined;
};
