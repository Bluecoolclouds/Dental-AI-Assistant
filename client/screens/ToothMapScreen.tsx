import React, { useState, useCallback } from "react";
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { PROBLEM_TYPES, ProblemType } from "@shared/schema";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const PROBLEM_CONFIG: Record<ProblemType, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  pain: { label: "Боль", icon: "zap", color: "#E74C3C" },
  chip: { label: "Скол", icon: "slash", color: "#9B59B6" },
  filling: { label: "Пломба", icon: "square", color: "#3498DB" },
  bleeding: { label: "Кровоточ.", icon: "droplet", color: "#E91E63" },
  sensitivity: { label: "Чувствит.", icon: "wind", color: "#F5A623" },
  cavity: { label: "Кариес", icon: "circle", color: "#795548" },
};

export default function ToothMapScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemType | null>(null);

  const { data: toothData = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/tooth-data/${user?.id}`],
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ toothNumber, problems }: { toothNumber: number; problems: string[] }) => {
      return apiRequest("POST", "/api/tooth-data", { userId: user?.id, toothNumber, problems });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tooth-data/${user?.id}`] });
    },
  });

  const getToothProblems = useCallback((toothNumber: number): string[] => {
    const tooth = toothData.find((t: any) => t.toothNumber === toothNumber);
    return (tooth?.problems as string[]) || [];
  }, [toothData]);

  const getToothColor = useCallback((toothNumber: number) => {
    const problems = getToothProblems(toothNumber);
    if (problems.length === 0) return theme.backgroundDefault;
    const firstProblem = problems[0] as ProblemType;
    return PROBLEM_CONFIG[firstProblem]?.color + "30" || theme.backgroundDefault;
  }, [getToothProblems, theme]);

  const handleToothPress = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
  };

  const handleProblemToggle = async (problem: ProblemType) => {
    if (!selectedTooth) return;

    const currentProblems = getToothProblems(selectedTooth);
    const newProblems = currentProblems.includes(problem)
      ? currentProblems.filter((p) => p !== problem)
      : [...currentProblems, problem];

    await saveMutation.mutateAsync({ toothNumber: selectedTooth, problems: newProblems });
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["4xl"],
          }
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.mapContainer}>
          <ThemedText type="small" style={[styles.jawLabel, { color: theme.textSecondary }]}>
            Верхняя челюсть
          </ThemedText>
          <View style={styles.teethRow}>
            {UPPER_TEETH.map((num) => (
              <ToothButton
                key={num}
                number={num}
                isSelected={selectedTooth === num}
                problems={getToothProblems(num)}
                backgroundColor={getToothColor(num)}
                onPress={() => handleToothPress(num)}
              />
            ))}
          </View>

          <View style={[styles.gumLine, { backgroundColor: theme.primary + "20" }]} />

          <View style={styles.teethRow}>
            {LOWER_TEETH.map((num) => (
              <ToothButton
                key={num}
                number={num}
                isSelected={selectedTooth === num}
                problems={getToothProblems(num)}
                backgroundColor={getToothColor(num)}
                onPress={() => handleToothPress(num)}
              />
            ))}
          </View>
          <ThemedText type="small" style={[styles.jawLabel, { color: theme.textSecondary }]}>
            Нижняя челюсть
          </ThemedText>
        </View>

        {selectedTooth ? (
          <View style={[styles.detailsCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.detailsHeader}>
              <ThemedText type="h4">Зуб {selectedTooth}</ThemedText>
              <Pressable onPress={() => setSelectedTooth(null)}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ThemedText type="small" style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
              Отметьте проблемы:
            </ThemedText>

            <View style={styles.problemsGrid}>
              {PROBLEM_TYPES.map((problem) => {
                const config = PROBLEM_CONFIG[problem];
                const isActive = getToothProblems(selectedTooth).includes(problem);
                return (
                  <Pressable
                    key={problem}
                    onPress={() => handleProblemToggle(problem)}
                    style={({ pressed }) => [
                      styles.problemButton,
                      {
                        backgroundColor: isActive ? config.color + "20" : theme.backgroundSecondary,
                        borderColor: isActive ? config.color : "transparent",
                        opacity: pressed ? 0.7 : 1,
                      }
                    ]}
                  >
                    <Feather name={config.icon} size={20} color={isActive ? config.color : theme.textSecondary} />
                    <ThemedText
                      type="small"
                      style={{ color: isActive ? config.color : theme.text }}
                    >
                      {config.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.primary} style={styles.saving} />
            ) : null}
          </View>
        ) : (
          <View style={[styles.hintCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="info" size={20} color={theme.primary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, flex: 1 }}>
              Нажмите на зуб, чтобы отметить проблему
            </ThemedText>
          </View>
        )}

        <View style={styles.legendSection}>
          <ThemedText type="h4" style={styles.legendTitle}>Обозначения</ThemedText>
          <View style={styles.legendGrid}>
            {PROBLEM_TYPES.map((problem) => {
              const config = PROBLEM_CONFIG[problem];
              return (
                <View key={problem} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: config.color + "30" }]}>
                    <Feather name={config.icon} size={14} color={config.color} />
                  </View>
                  <ThemedText type="small">{config.label}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function ToothButton({
  number,
  isSelected,
  problems,
  backgroundColor,
  onPress,
}: {
  number: number;
  isSelected: boolean;
  problems: string[];
  backgroundColor: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tooth,
        {
          backgroundColor,
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
          opacity: pressed ? 0.7 : 1,
        }
      ]}
    >
      <ThemedText type="small" style={styles.toothNumber}>
        {number}
      </ThemedText>
      {problems.length > 0 ? (
        <View style={[styles.problemIndicator, { backgroundColor: theme.danger }]}>
          <ThemedText type="small" style={styles.problemCount}>
            {problems.length}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  mapContainer: {
    alignItems: "center",
    gap: Spacing.md,
  },
  jawLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  teethRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  gumLine: {
    width: "90%",
    height: 8,
    borderRadius: 4,
    marginVertical: Spacing.sm,
  },
  tooth: {
    width: 38,
    height: 44,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  toothNumber: {
    fontSize: 11,
  },
  problemIndicator: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  problemCount: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  detailsCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.lg,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailsSubtitle: {
    marginTop: -Spacing.sm,
  },
  problemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  problemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  saving: {
    alignSelf: "center",
  },
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  legendSection: {
    gap: Spacing.md,
  },
  legendTitle: {
    marginLeft: Spacing.xs,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    width: "45%",
  },
  legendColor: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
});
