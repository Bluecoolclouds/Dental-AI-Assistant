import React, { useState, useCallback } from "react";
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { PROBLEM_TYPES, ProblemType } from "@shared/schema";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const getSimpleNumber = (toothNumber: number): number => {
  return toothNumber % 10;
};

const PROBLEM_CONFIG: Record<ProblemType, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  pain: { label: "Боль", icon: "zap", color: "#E74C3C" },
  chip: { label: "Скол", icon: "slash", color: "#9B59B6" },
  filling: { label: "Пломба", icon: "square", color: "#3498DB" },
  bleeding: { label: "Кровоточ.", icon: "droplet", color: "#E91E63" },
  sensitivity: { label: "Чувствит.", icon: "wind", color: "#F5A623" },
  cavity: { label: "Кариес", icon: "circle", color: "#795548" },
};

const MOLAR_PATH = "M2,8 C2,3 5,0 10,0 C15,0 18,3 18,8 L18,18 C18,20 16,22 14,22 L6,22 C4,22 2,20 2,18 Z";
const PREMOLAR_PATH = "M3,7 C3,3 6,0 10,0 C14,0 17,3 17,7 L17,18 C17,20 15,22 13,22 L7,22 C5,22 3,20 3,18 Z";
const CANINE_PATH = "M4,6 C4,2 7,0 10,0 C13,0 16,2 16,6 L16,20 C16,22 14,24 12,24 L8,24 C6,24 4,22 4,20 Z";
const INCISOR_PATH = "M4,5 C4,2 6,0 10,0 C14,0 16,2 16,5 L16,19 C16,21 14,23 12,23 L8,23 C6,23 4,21 4,19 Z";

function getToothPath(toothNumber: number): string {
  const digit = toothNumber % 10;
  if (digit >= 6 && digit <= 8) return MOLAR_PATH;
  if (digit >= 4 && digit <= 5) return PREMOLAR_PATH;
  if (digit === 3) return CANINE_PATH;
  return INCISOR_PATH;
}

export default function ToothMapScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

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

  const getToothFill = useCallback((toothNumber: number) => {
    const problems = getToothProblems(toothNumber);
    if (problems.length === 0) return theme.backgroundSecondary;
    const firstProblem = problems[0] as ProblemType;
    return PROBLEM_CONFIG[firstProblem]?.color + "40" || theme.backgroundSecondary;
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

  const mapWidth = Math.min(screenWidth - Spacing.lg * 2, 340);
  const toothWidth = Math.floor((mapWidth - 16) / 16);
  const toothHeight = Math.floor(toothWidth * 1.3);

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
          
          <View style={styles.toothRow}>
            {UPPER_TEETH.map((toothNum) => {
              const isSelected = selectedTooth === toothNum;
              const fill = getToothFill(toothNum);
              const strokeColor = isSelected ? theme.primary : theme.border;
              const strokeWidth = isSelected ? 2 : 1;
              const hasProblems = getToothProblems(toothNum).length > 0;
              
              return (
                <Pressable
                  key={toothNum}
                  onPress={() => handleToothPress(toothNum)}
                  style={styles.toothButton}
                >
                  <Svg width={toothWidth} height={toothHeight} viewBox="0 0 20 24">
                    <Path
                      d={getToothPath(toothNum)}
                      fill={fill}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                  </Svg>
                  <ThemedText 
                    type="small" 
                    style={[
                      styles.toothNumber,
                      isSelected && { color: theme.primary, fontWeight: "700" }
                    ]}
                  >
                    {getSimpleNumber(toothNum)}
                  </ThemedText>
                  {hasProblems ? (
                    <View style={[styles.problemDot, { backgroundColor: theme.danger }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.gumLine, { backgroundColor: theme.primary + "30", width: mapWidth }]} />

          <View style={styles.toothRow}>
            {LOWER_TEETH.map((toothNum) => {
              const isSelected = selectedTooth === toothNum;
              const fill = getToothFill(toothNum);
              const strokeColor = isSelected ? theme.primary : theme.border;
              const strokeWidth = isSelected ? 2 : 1;
              const hasProblems = getToothProblems(toothNum).length > 0;
              
              return (
                <Pressable
                  key={toothNum}
                  onPress={() => handleToothPress(toothNum)}
                  style={styles.toothButton}
                >
                  <ThemedText 
                    type="small" 
                    style={[
                      styles.toothNumber,
                      isSelected && { color: theme.primary, fontWeight: "700" }
                    ]}
                  >
                    {getSimpleNumber(toothNum)}
                  </ThemedText>
                  <Svg width={toothWidth} height={toothHeight} viewBox="0 0 20 24" style={{ transform: [{ scaleY: -1 }] }}>
                    <Path
                      d={getToothPath(toothNum)}
                      fill={fill}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                  </Svg>
                  {hasProblems ? (
                    <View style={[styles.problemDot, { backgroundColor: theme.danger }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          
          <ThemedText type="small" style={[styles.jawLabel, { color: theme.textSecondary }]}>
            Нижняя челюсть
          </ThemedText>
        </View>

        {selectedTooth ? (
          <View style={[styles.detailsCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.detailsHeader}>
              <ThemedText type="h4">Зуб {getSimpleNumber(selectedTooth)}</ThemedText>
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
                    <Feather name={config.icon} size={18} color={isActive ? config.color : theme.textSecondary} />
                    <ThemedText
                      type="small"
                      style={{ color: isActive ? config.color : theme.text, fontSize: 12 }}
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
        ) : null}

        <View style={[styles.hintCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="info" size={18} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            {selectedTooth 
              ? "Выберите проблемы для отмеченного зуба" 
              : "Нажмите на зуб, чтобы отметить проблему"}
          </ThemedText>
        </View>

        <View style={styles.legendSection}>
          <ThemedText type="body" style={[styles.legendTitle, { fontWeight: "600" }]}>Обозначения</ThemedText>
          <View style={styles.legendGrid}>
            {PROBLEM_TYPES.map((problem) => {
              const config = PROBLEM_CONFIG[problem];
              return (
                <View key={problem} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: config.color + "30" }]}>
                    <Feather name={config.icon} size={12} color={config.color} />
                  </View>
                  <ThemedText type="small" style={{ fontSize: 11 }}>{config.label}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
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
    gap: Spacing.lg,
  },
  mapContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  jawLabel: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 10,
  },
  toothRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "nowrap",
  },
  toothButton: {
    alignItems: "center",
    padding: 1,
  },
  toothNumber: {
    fontSize: 8,
    fontWeight: "500",
  },
  problemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: "absolute",
    top: 0,
    right: 0,
  },
  gumLine: {
    height: 4,
    borderRadius: 2,
    marginVertical: Spacing.xs,
  },
  detailsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailsSubtitle: {
    marginTop: -Spacing.xs,
  },
  problemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  problemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  saving: {
    alignSelf: "center",
  },
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  legendSection: {
    gap: Spacing.sm,
  },
  legendTitle: {
    marginLeft: Spacing.xs,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    width: "45%",
  },
  legendColor: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
});
