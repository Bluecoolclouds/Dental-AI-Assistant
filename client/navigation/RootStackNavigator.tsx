import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthContext } from "@/contexts/AuthContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import TestFlowScreen from "@/screens/TestFlowScreen";
import FeedbackScreen from "@/screens/FeedbackScreen";
import AIRecommendationsScreen from "@/screens/AIRecommendationsScreen";
import ToothDetailScreen from "@/screens/ToothDetailScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import MaterialsScreen from "@/screens/MaterialsScreen";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  TestFlow: undefined;
  Feedback: undefined;
  AIRecommendations: undefined;
  ToothDetail: { toothNumber: number };
  Notifications: undefined;
  Materials: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const { isLoading, isAuthenticated } = useAuthContext();
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TestFlow"
            component={TestFlowScreen}
            options={{
              presentation: "modal",
              headerTitle: "Тест здоровья",
            }}
          />
          <Stack.Screen
            name="Feedback"
            component={FeedbackScreen}
            options={{
              presentation: "modal",
              headerTitle: "Обратная связь",
            }}
          />
          <Stack.Screen
            name="AIRecommendations"
            component={AIRecommendationsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Рекомендации ИИ",
            }}
          />
          <Stack.Screen
            name="ToothDetail"
            component={ToothDetailScreen}
            options={{
              presentation: "modal",
              headerTitle: "Детали зуба",
            }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Уведомления",
            }}
          />
          <Stack.Screen
            name="Materials"
            component={MaterialsScreen}
            options={{
              headerTitle: "Материалы",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
