import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AppIcon from "@/components/Icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTestResults } from "@/hooks/useLocalData";

interface QuestionOption {
  value: string;
  label: string;
  score: number;
}

interface Question {
  id: number;
  question: string;
  options: QuestionOption[];
  multiSelect?: boolean;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Как часто вы чистите зубы?",
    options: [
      { value: "rarely", label: "Реже 1 раза в день", score: 30 },
      { value: "once", label: "1 раз в день", score: 15 },
      { value: "twice", label: "2 раза в день", score: 0 },
      { value: "more", label: "Более 2 раз в день", score: 0 },
    ],
  },
  {
    id: 2,
    question: "Используете ли вы зубную нить или ирригатор?",
    options: [
      { value: "never", label: "Никогда", score: 20 },
      { value: "sometimes", label: "Иногда", score: 10 },
      { value: "regularly", label: "Регулярно", score: 0 },
    ],
  },
  {
    id: 3,
    question: "Есть ли у вас кровоточивость дёсен при чистке?",
    options: [
      { value: "never", label: "Никогда", score: 0 },
      { value: "sometimes", label: "Иногда", score: 15 },
      { value: "often", label: "Часто", score: 30 },
      { value: "always", label: "Всегда", score: 40 },
    ],
  },
  {
    id: 4,
    question: "Испытываете ли вы чувствительность зубов?",
    options: [
      { value: "no", label: "Нет", score: 0 },
      { value: "cold_hot", label: "К холодному/горячему", score: 10 },
      { value: "sweet", label: "К сладкому/кислому", score: 15 },
      { value: "constant", label: "Постоянная боль", score: 30 },
    ],
  },
  {
    id: 5,
    question: "Когда вы последний раз были у стоматолога?",
    options: [
      { value: "less_6", label: "Менее 6 месяцев назад", score: 0 },
      { value: "6_12", label: "6-12 месяцев назад", score: 5 },
      { value: "1_2_years", label: "1-2 года назад", score: 15 },
      { value: "more_2", label: "Более 2 лет назад", score: 25 },
    ],
  },
  {
    id: 6,
    question: "Есть ли у вас проблемы с запахом изо рта?",
    options: [
      { value: "no", label: "Нет", score: 0 },
      { value: "morning", label: "Только утром", score: 5 },
      { value: "sometimes", label: "Иногда в течение дня", score: 15 },
      { value: "constant", label: "Постоянно", score: 25 },
    ],
  },
  {
    id: 7,
    question: "Есть ли у тебя что-то из этого во рту?",
    multiSelect: true,
    options: [
      { value: "crowns_veneers", label: "Коронки / виниры / мосты", score: 5 },
      { value: "removable_dentures", label: "Съёмные протезы", score: 10 },
      { value: "braces_aligners", label: "Брекеты или элайнеры", score: 5 },
      { value: "implants", label: "Импланты", score: 5 },
      { value: "nothing", label: "Ничего из перечисленного / не знаю", score: 0 },
    ],
  },
];

export default function TestFlowScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { createTestResult } = useTestResults();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { value: string; score: number } | { values: string[]; score: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  const handleAnswer = (option: QuestionOption) => {
    if (question.multiSelect) {
      setAnswers((prev) => {
        const current = prev[question.id] as { values: string[]; score: number } | undefined;
        const currentValues = current?.values || [];
        
        if (option.value === "nothing") {
          return {
            ...prev,
            [question.id]: { values: ["nothing"], score: 0 },
          };
        }
        
        const withoutNothing = currentValues.filter((v) => v !== "nothing");
        const isAlreadySelected = withoutNothing.includes(option.value);
        
        let newValues: string[];
        if (isAlreadySelected) {
          newValues = withoutNothing.filter((v) => v !== option.value);
        } else {
          newValues = [...withoutNothing, option.value];
        }
        
        const newScore = question.options
          .filter((o) => newValues.includes(o.value))
          .reduce((sum, o) => sum + o.score, 0);
        
        return {
          ...prev,
          [question.id]: { values: newValues, score: newScore },
        };
      });
    } else {
      setAnswers((prev) => ({
        ...prev,
        [question.id]: { value: option.value, score: option.score },
      }));
    }
  };

  const handleNext = async () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setIsSubmitting(true);
      try {
        const totalScore = Object.values(answers).reduce((sum, a) => sum + a.score, 0);
        const teethRiskScore = Math.min(100, totalScore);
        const gumsRiskScore = Math.min(100, Math.round(totalScore * 0.8));
        
        const overallRiskLevel = teethRiskScore >= 60 ? "high" : teethRiskScore >= 30 ? "moderate" : "low";
        await createTestResult({ teethRiskScore, gumsRiskScore, overallRiskLevel, recommendations: [] });
        navigation.goBack();
      } catch (error) {
        console.error("Error submitting test:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;
  const currentAnswer = answers[question.id];
  const hasAnswer = question.multiSelect
    ? ((currentAnswer as { values: string[] } | undefined)?.values?.length ?? 0) > 0
    : !!currentAnswer;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${progress}%` }]} />
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {currentQuestion + 1}/{QUESTIONS.length}
        </ThemedText>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] }
        ]}
      >
        <ThemedText type="h3" style={styles.question}>
          {question.question}
        </ThemedText>

        <View style={styles.options}>
          {question.options.map((option) => {
            const isSelected = question.multiSelect
              ? (currentAnswer as { values: string[] } | undefined)?.values?.includes(option.value)
              : (currentAnswer as { value: string } | undefined)?.value === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleAnswer(option)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                    borderColor: isSelected ? theme.primary : theme.border,
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
              >
                <View
                  style={[
                    question.multiSelect ? styles.checkbox : styles.radio,
                    {
                      backgroundColor: isSelected ? "#FFFFFF" : "transparent",
                      borderColor: isSelected ? "#FFFFFF" : theme.border,
                    }
                  ]}
                >
                  {isSelected ? (
                    question.multiSelect ? (
                      <AppIcon name="check" size={14} color={theme.primary} />
                    ) : (
                      <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
                    )
                  ) : null}
                </View>
                <ThemedText
                  type="body"
                  style={{ color: isSelected ? "#FFFFFF" : theme.text, flex: 1 }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        <View style={styles.buttons}>
          {currentQuestion > 0 ? (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <AppIcon name="arrow-left" size={20} color={theme.primary} />
              <ThemedText type="link">Назад</ThemedText>
            </Pressable>
          ) : (
            <View />
          )}
          
          <Button
            onPress={handleNext}
            disabled={!hasAnswer || isSubmitting}
            style={styles.nextButton}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : isLastQuestion ? (
              "Завершить"
            ) : (
              "Далее"
            )}
          </Button>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing["2xl"],
  },
  question: {
    textAlign: "center",
  },
  options: {
    gap: Spacing.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  nextButton: {
    minWidth: 120,
  },
});
