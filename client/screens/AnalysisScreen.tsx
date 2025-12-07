import React from "react";
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AnalysisScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const { data: testResult, isLoading } = useQuery<any>({
    queryKey: [`/api/test-results/${user?.id}/latest`],
    enabled: !!user?.id,
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return theme.success;
      case "moderate":
        return theme.warning;
      case "high":
        return theme.danger;
      default:
        return theme.textSecondary;
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low":
        return "Низкий риск";
      case "moderate":
        return "Умеренный риск";
      case "high":
        return "Высокий риск";
      default:
        return "Не определён";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          }
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {testResult ? (
          <>
            <Card elevation={1} style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Последняя оценка
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {formatDate(testResult.createdAt)}
                </ThemedText>
              </View>

              <View style={styles.gaugeContainer}>
                <View style={[styles.gauge, { borderColor: getRiskColor(testResult.overallRiskLevel) }]}>
                  <ThemedText type="h1" style={{ color: getRiskColor(testResult.overallRiskLevel) }}>
                    {Math.round((testResult.teethRiskScore + testResult.gumsRiskScore) / 2)}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>/100</ThemedText>
                </View>
                <ThemedText type="h4" style={{ color: getRiskColor(testResult.overallRiskLevel) }}>
                  {getRiskLabel(testResult.overallRiskLevel)}
                </ThemedText>
              </View>

              <View style={styles.detailedScores}>
                <View style={styles.detailedScoreItem}>
                  <View style={[styles.scoreBar, { backgroundColor: theme.backgroundSecondary }]}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        {
                          backgroundColor: testResult.teethRiskScore > 70 ? theme.danger : testResult.teethRiskScore > 40 ? theme.warning : theme.success,
                          width: `${testResult.teethRiskScore}%`,
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.scoreLabels}>
                    <ThemedText type="body">Зубы</ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {testResult.teethRiskScore}/100
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.detailedScoreItem}>
                  <View style={[styles.scoreBar, { backgroundColor: theme.backgroundSecondary }]}>
                    <View
                      style={[
                        styles.scoreBarFill,
                        {
                          backgroundColor: testResult.gumsRiskScore > 70 ? theme.danger : testResult.gumsRiskScore > 40 ? theme.warning : theme.success,
                          width: `${testResult.gumsRiskScore}%`,
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.scoreLabels}>
                    <ThemedText type="body">Дёсны</ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {testResult.gumsRiskScore}/100
                    </ThemedText>
                  </View>
                </View>
              </View>
            </Card>

            <Pressable
              onPress={() => navigation.navigate("AIRecommendations")}
              style={({ pressed }) => [
                styles.recommendationsCard,
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <View style={styles.recommendationsHeader}>
                <View style={[styles.aiIcon, { backgroundColor: theme.primary + "20" }]}>
                  <Feather name="cpu" size={24} color={theme.primary} />
                </View>
                <View style={styles.recommendationsText}>
                  <ThemedText type="h4">Рекомендации ИИ</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Персональные советы по уходу
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={24} color={theme.textSecondary} />
              </View>
            </Pressable>

            <View style={[styles.visitCard, { backgroundColor: theme.primary + "10" }]}>
              <View style={styles.visitIcon}>
                <Feather name="calendar" size={24} color={theme.primary} />
              </View>
              <View style={styles.visitContent}>
                <ThemedText type="body">Рекомендуемый визит к стоматологу</ThemedText>
                <ThemedText type="h4" style={{ color: theme.primary }}>
                  {testResult.overallRiskLevel === "high"
                    ? "В ближайшее время"
                    : testResult.overallRiskLevel === "moderate"
                    ? "В течение месяца"
                    : "Каждые 6 месяцев"
                  }
                </ThemedText>
              </View>
            </View>

            <Button onPress={() => navigation.navigate("TestFlow")} style={styles.retakeButton}>
              Пройти новый тест
            </Button>
          </>
        ) : (
          <Card elevation={1} style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "15" }]}>
              <Feather name="activity" size={40} color={theme.primary} />
            </View>
            <ThemedText type="h3" style={styles.emptyTitle}>
              Нет результатов
            </ThemedText>
            <ThemedText type="body" style={[styles.emptyDescription, { color: theme.textSecondary }]}>
              Пройдите тест здоровья полости рта, чтобы получить оценку и рекомендации от ИИ
            </ThemedText>
            <Button onPress={() => navigation.navigate("TestFlow")}>
              Пройти тест
            </Button>
          </Card>
        )}
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
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  scoreCard: {
    gap: Spacing.xl,
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gaugeContainer: {
    alignItems: "center",
    gap: Spacing.md,
  },
  gauge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  detailedScores: {
    gap: Spacing.lg,
  },
  detailedScoreItem: {
    gap: Spacing.sm,
  },
  scoreBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  scoreLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recommendationsCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  recommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  recommendationsText: {
    flex: 1,
    gap: Spacing.xs,
  },
  visitCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.lg,
  },
  visitIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  visitContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  retakeButton: {
    marginTop: Spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    gap: Spacing.xl,
    paddingVertical: Spacing["4xl"],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyDescription: {
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
