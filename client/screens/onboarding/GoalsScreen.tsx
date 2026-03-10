import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useProfile } from "@/hooks/useLocalData";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Goals">;

const GOALS = [
  {
    value: "general",
    icon: "activity",
    title: "Общий мониторинг",
    description: "Хочу отслеживать общее состояние зубов и дёсен",
  },
  {
    value: "braces",
    icon: "git-merge",
    title: "Брекеты / элайнеры",
    description: "Ношу ортодонтическую конструкцию, хочу отслеживать лечение",
  },
  {
    value: "extraction",
    icon: "shield",
    title: "Удаление зуба",
    description: "Готовлюсь к удалению или уже было — хочу следить за заживлением",
  },
  {
    value: "caries",
    icon: "alert-triangle",
    title: "Профилактика кариеса",
    description: "Частые кариесы — хочу улучшить уход и профилактику",
  },
  {
    value: "reminders",
    icon: "bell",
    title: "Только напоминания",
    description: "Хочу напоминания: чистка зубов, ирригатор, осмотр у врача",
  },
];

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { profile, updateProfile } = useProfile();

  const [selectedGoal, setSelectedGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedGoal) {
      navigation.navigate("Questionnaire");
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile({ goals: selectedGoal });
      sendAnalytics(selectedGoal);
      navigation.navigate("Questionnaire");
    } catch (error) {
      console.error("Goals error:", error);
      navigation.navigate("Questionnaire");
    } finally {
      setIsLoading(false);
    }
  };

  const sendAnalytics = (goal: string) => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return;
    const birthYear = profile?.birthDate
      ? new Date(profile.birthDate).getFullYear()
      : undefined;
    fetch(`${domain}/api/audience`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthYear,
        gender: profile?.gender ?? undefined,
        goal,
      }),
    }).catch(() => {});
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: "57%" }]} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>4/7</ThemedText>
        </View>

        <View style={styles.iconWrapper}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + "15" }]}>
            <AppIcon name="target" size={32} color={theme.primary} />
          </View>
        </View>

        <ThemedText type="h3" style={styles.title}>Какова ваша цель?</ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Выберите одно — это поможет ИИ давать точные советы
        </ThemedText>

        <View style={styles.goalsList}>
          {GOALS.map((goal) => {
            const selected = selectedGoal === goal.value;
            return (
              <Pressable
                key={goal.value}
                onPress={() => setSelectedGoal(selected ? "" : goal.value)}
                style={({ pressed }) => [
                  styles.goalCard,
                  {
                    backgroundColor: selected
                      ? theme.primary + "12"
                      : theme.backgroundSecondary,
                    borderColor: selected ? theme.primary : theme.border,
                    opacity: pressed ? 0.85 : 1,
                  }
                ]}
              >
                <View style={[
                  styles.goalIcon,
                  { backgroundColor: selected ? theme.primary + "20" : theme.backgroundDefault }
                ]}>
                  <AppIcon
                    name={goal.icon as any}
                    size={22}
                    color={selected ? theme.primary : theme.textSecondary}
                  />
                </View>
                <View style={styles.goalText}>
                  <ThemedText
                    type="body"
                    style={{ fontWeight: "600", color: selected ? theme.primary : theme.text }}
                  >
                    {goal.title}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {goal.description}
                  </ThemedText>
                </View>
                {selected ? (
                  <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                    <AppIcon name="check" size={14} color="#FFF" />
                  </View>
                ) : (
                  <View style={[styles.checkCircle, { backgroundColor: theme.backgroundDefault, borderWidth: 1, borderColor: theme.border }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.buttons}>
          <Button onPress={handleContinue} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : selectedGoal ? (
              "Продолжить"
            ) : (
              "Пропустить"
            )}
          </Button>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing["2xl"] },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  iconWrapper: { alignItems: "center", marginBottom: Spacing.xl },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { marginBottom: Spacing.sm, textAlign: "center" },
  subtitle: { marginBottom: Spacing["2xl"], textAlign: "center" },
  goalsList: { gap: Spacing.md },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  goalText: { flex: 1 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttons: { marginTop: Spacing["2xl"] },
});
