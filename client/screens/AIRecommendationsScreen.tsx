import React from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";

const RECOMMENDATION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  brushing: "edit-3",
  flossing: "scissors",
  diet: "coffee",
  visit: "calendar",
  products: "shopping-bag",
  habits: "heart",
  default: "info",
};

export default function AIRecommendationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const { data: testResult, isLoading: isLoadingTest, isFetched: testFetched } = useQuery<any>({
    queryKey: [`/api/test-results/${user?.id}/latest`],
    enabled: !!user?.id,
  });

  const { data: profile, isFetched: profileFetched } = useQuery<any>({
    queryKey: [`/api/profile/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: toothData, isFetched: toothFetched } = useQuery<any[]>({
    queryKey: [`/api/tooth-data/${user?.id}`],
    enabled: !!user?.id,
  });

  const recommendationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/recommendations", {
        userId: user?.id,
      });
      return response.json();
    },
  });

  const hasRequiredData = !!user?.id && testFetched && !!testResult;

  React.useEffect(() => {
    if (hasRequiredData && !recommendationsMutation.data && !recommendationsMutation.isPending) {
      recommendationsMutation.mutate();
    }
  }, [hasRequiredData, recommendationsMutation.data, recommendationsMutation.isPending]);

  const isLoadingAI = recommendationsMutation.isPending;
  const aiRecommendations = recommendationsMutation.data;
  const isLoadingData = isLoadingTest || !testFetched;

  if (isLoadingData || isLoadingAI) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
          ИИ анализирует ваши данные...
        </ThemedText>
      </ThemedView>
    );
  }

  const recommendations = aiRecommendations?.recommendations || testResult?.recommendations || [];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: theme.primary + "15" }]}>
          <View style={[styles.aiIcon, { backgroundColor: theme.primary }]}>
            <Feather name="cpu" size={28} color="#FFFFFF" />
          </View>
          <ThemedText type="h4">Персональные рекомендации</ThemedText>
          <ThemedText type="body" style={[styles.headerDescription, { color: theme.textSecondary }]}>
            На основе вашей анкеты, карты зубов и результатов теста
          </ThemedText>
        </View>

        {recommendations.length > 0 ? (
          <View style={styles.recommendations}>
            {recommendations.map((rec: any, index: number) => (
              <RecommendationCard
                key={index}
                title={rec.title || `Рекомендация ${index + 1}`}
                description={rec.description || rec}
                category={rec.category || "default"}
                priority={rec.priority || "normal"}
              />
            ))}
          </View>
        ) : (
          <View style={styles.defaultRecommendations}>
            <RecommendationCard
              title="Регулярная чистка"
              description="Чистите зубы минимум 2 раза в день по 2 минуты. Используйте зубную щётку с мягкой щетиной и меняйте её каждые 3 месяца."
              category="brushing"
              priority="high"
            />
            <RecommendationCard
              title="Зубная нить"
              description="Используйте зубную нить или ирригатор ежедневно для очистки межзубных промежутков, куда не достаёт щётка."
              category="flossing"
              priority="normal"
            />
            <RecommendationCard
              title="Питание"
              description="Ограничьте употребление сладких и кислых продуктов. Пейте воду после еды, чтобы смыть остатки пищи."
              category="diet"
              priority="normal"
            />
            <RecommendationCard
              title="Визиты к стоматологу"
              description="Посещайте стоматолога каждые 6 месяцев для профессиональной чистки и осмотра, даже если ничего не беспокоит."
              category="visit"
              priority="high"
            />
          </View>
        )}

        <View style={[styles.disclaimer, { backgroundColor: theme.warning + "15", borderColor: theme.warning }]}>
          <Feather name="alert-triangle" size={20} color={theme.warning} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            Рекомендации носят информационный характер и не заменяют консультацию стоматолога. При острой боли или проблемах обратитесь к врачу.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function RecommendationCard({
  title,
  description,
  category,
  priority,
}: {
  title: string;
  description: string;
  category: string;
  priority: string;
}) {
  const { theme } = useTheme();
  const icon = RECOMMENDATION_ICONS[category] || RECOMMENDATION_ICONS.default;
  const priorityColor = priority === "high" ? theme.danger : theme.primary;

  return (
    <Card elevation={1} style={styles.recommendationCard}>
      <View style={styles.recommendationHeader}>
        <View style={[styles.recommendationIcon, { backgroundColor: priorityColor + "15" }]}>
          <Feather name={icon} size={20} color={priorityColor} />
        </View>
        <View style={styles.recommendationTitleContainer}>
          <ThemedText type="h4">{title}</ThemedText>
          {priority === "high" ? (
            <View style={[styles.priorityBadge, { backgroundColor: theme.danger + "15" }]}>
              <ThemedText type="small" style={{ color: theme.danger, fontWeight: "500" }}>
                Важно
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        {description}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
  },
  loadingText: {
    textAlign: "center",
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  headerCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  aiIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerDescription: {
    textAlign: "center",
  },
  recommendations: {
    gap: Spacing.md,
  },
  defaultRecommendations: {
    gap: Spacing.md,
  },
  recommendationCard: {
    gap: Spacing.md,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  recommendationIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  recommendationTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
});
