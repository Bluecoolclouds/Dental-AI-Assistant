import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";

import WelcomeScreen from "@/screens/onboarding/WelcomeScreen";
import AuthScreen from "@/screens/onboarding/AuthScreen";
import ProfileSetupScreen from "@/screens/onboarding/ProfileSetupScreen";
import GoalsScreen from "@/screens/onboarding/GoalsScreen";
import QuestionnaireScreen from "@/screens/onboarding/QuestionnaireScreen";
import ToothMapIntroScreen from "@/screens/onboarding/ToothMapIntroScreen";
import DisclaimerScreen from "@/screens/onboarding/DisclaimerScreen";

export type OnboardingStackParamList = {
  Welcome: undefined;
  Auth: { mode: "login" | "register" };
  ProfileSetup: undefined;
  Goals: undefined;
  Questionnaire: undefined;
  ToothMapIntro: undefined;
  Disclaimer: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={({ route }) => ({
          headerTitle: route.params?.mode === "login" ? "Вход" : "Регистрация",
        })}
      />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{ headerTitle: "О вас" }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ headerTitle: "Ваша цель" }}
      />
      <Stack.Screen
        name="Questionnaire"
        component={QuestionnaireScreen}
        options={{
          headerTitle: "Анкета",
        }}
      />
      <Stack.Screen
        name="ToothMapIntro"
        component={ToothMapIntroScreen}
        options={{
          headerTitle: "Карта зубов",
        }}
      />
      <Stack.Screen
        name="Disclaimer"
        component={DisclaimerScreen}
        options={{
          headerTitle: "Важно",
        }}
      />
    </Stack.Navigator>
  );
}
