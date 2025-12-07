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

export default function HomeScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const { data: testResult, isLoading } = useQuery<any>({
    queryKey: ["/api/test-results/latest"],
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
        return "Низкий";
      case "moderate":
        return "Умеренный";
      case "high":
        return "Высокий";
      default:
        return "Не определён";
    }
  };

  const getRiskIcon = (level: string): keyof typeof Feather.glyphMap => {
    switch (level) {
      case "low":
        return "check-circle";
      case "moderate":
        return "alert-circle";
      case "high":
        return "alert-triangle";
      default:
        return "help-circle";
    }
  };

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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : testResult ? (
          <>
            <Card elevation={1} style={styles.riskCard}>
              <View style={styles.riskHeader}>
                <View>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Уровень риска
                  </ThemedText>
                  <View style={styles.riskLabelRow}>
                    <Feather 
                      name={getRiskIcon(testResult.overallRiskLevel)} 
                      size={24} 
                      color={getRiskColor(testResult.overallRiskLevel)} 
                    />
                    <ThemedText 
                      type="h2" 
                      style={{ color: getRiskColor(testResult.overallRiskLevel) }}
                    >
                      {getRiskLabel(testResult.overallRiskLevel)}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.scoresRow}>
                <View style={styles.scoreItem}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Зубы
                  </ThemedText>
                  <View style={styles.scoreValue}>
                    <ThemedText type="h3">{testResult.teethRiskScore}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>/100</ThemedText>
                  </View>
                </View>
                <View style={[styles.scoreDivider, { backgroundColor: theme.border }]} />
                <View style={styles.scoreItem}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Дёсны
                  </ThemedText>
                  <View style={styles.scoreValue}>
                    <ThemedText type="h3">{testResult.gumsRiskScore}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>/100</ThemedText>
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
                  <Feather name="cpu" size={20} color={theme.primary} />
                </View>
                <ThemedText type="h4">Рекомендации ИИ</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.textSecondary }} numberOfLines={2}>
                Персональные советы по уходу за полостью рта
              </ThemedText>
              <View style={styles.recommendationsFooter}>
                <ThemedText type="link">Смотреть все</ThemedText>
                <Feather name="chevron-right" size={20} color={theme.link} />
              </View>
            </Pressable>
          </>
        ) : (
          <Card elevation={1} style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "15" }]}>
              <Feather name="clipboard" size={32} color={theme.primary} />
            </View>
            <ThemedText type="h4" style={styles.emptyTitle}>
              Пройдите тест
            </ThemedText>
            <ThemedText type="body" style={[styles.emptyDescription, { color: theme.textSecondary }]}>
              Ответьте на несколько вопросов, и ИИ оценит состояние ваших зубов и дёсен
            </ThemedText>
            <Button onPress={() => navigation.navigate("TestFlow")}>
              Начать тест
            </Button>
          </Card>
        )}

        <View style={styles.actionsSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Быстрые действия
          </ThemedText>
          
          <View style={styles.actionCards}>
            <ActionCard
              icon="grid"
              title="Карта зубов"
              description="Обновите отметки"
              onPress={() => navigation.getParent()?.navigate("ToothMapTab")}
            />
            <ActionCard
              icon="refresh-cw"
              title="Новый тест"
              description="Пройти заново"
              onPress={() => navigation.navigate("TestFlow")}
            />
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate("Feedback")}
          style={({ pressed }) => [
            styles.feedbackBanner,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <View style={[styles.feedbackIcon, { backgroundColor: theme.success + "20" }]}>
            <Feather name="message-circle" size={20} color={theme.success} />
          </View>
          <View style={styles.feedbackContent}>
            <ThemedText type="body">Это бета-версия</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Помогите улучшить приложение
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: theme.primary + "15" }]}>
        <Feather name={icon} size={24} color={theme.primary} />
      </View>
      <ThemedText type="body" style={styles.actionTitle}>{title}</ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>{description}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  loadingContainer: {
    padding: Spacing["5xl"],
    alignItems: "center",
  },
  riskCard: {
    gap: Spacing.xl,
  },
  riskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  riskLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  scoresRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  scoreValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
  },
  scoreDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.lg,
  },
  recommendationsCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  recommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  recommendationsFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  emptyCard: {
    alignItems: "center",
    gap: Spacing.lg,
    paddingVertical: Spacing["3xl"],
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyDescription: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  actionsSection: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    marginLeft: Spacing.xs,
  },
  actionCards: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTitle: {
    fontWeight: "500",
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  feedbackIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackContent: {
    flex: 1,
    gap: Spacing.xs,
  },
});
