import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/Icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTestResults, useProfile, useToothData } from "@/hooks/useLocalData";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";

const RECOMMENDATION_ICONS: Record<string, keyof typeof AppIcon.glyphMap> = {
  brushing: "edit-3",
  flossing: "scissors",
  diet: "coffee",
  visit: "calendar",
  products: "shopping-bag",
  habits: "heart",
  default: "info",
};

export default function AIRecommendationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const { latestResult: testResult, isLoading: isLoadingTest, updateAIRecommendations } = useTestResults();
  const { profile } = useProfile();
  const { toothData } = useToothData();

  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    if (testResult && !testResult.aiRecommendations && !isLoadingAI) {
      fetchAIRecommendations();
    } else if (testResult?.aiRecommendations) {
      setAiRecommendations(testResult.aiRecommendations);
    }
  }, [testResult]);

  const fetchAIRecommendations = async () => {
    if (!testResult) return;
    
    setIsLoadingAI(true);
    try {
      const sanitizedTestResult = {
        teethRiskScore: testResult.teethRiskScore,
        gumsRiskScore: testResult.gumsRiskScore,
        overallRiskLevel: testResult.overallRiskLevel,
        recommendations: testResult.recommendations,
      };

      const sanitizedProfile = profile ? {
        age: profile.age,
        brushingFrequency: profile.brushingFrequency,
        usesFloss: profile.usesFloss,
        usesIrrigator: profile.usesIrrigator,
        hasBraces: profile.hasBraces,
        hasSensitivity: profile.hasSensitivity,
        hasGumBleeding: profile.hasGumBleeding,
        hasCrownsVeneers: profile.hasCrownsVeneers,
        hasRemovableDentures: profile.hasRemovableDentures,
        hasImplants: profile.hasImplants,
      } : null;

      const sanitizedToothData = toothData?.map((tooth) => ({
        toothNumber: tooth.toothNumber,
        problems: tooth.problems,
        notes: tooth.notes,
      })) || [];

      const response = await apiRequest("POST", "/api/recommendations", {
        userId: user?.id,
        testResultId: testResult.id,
        testResult: sanitizedTestResult,
        profile: sanitizedProfile,
        toothData: sanitizedToothData,
      });
      const data = await response.json();
      setAiRecommendations(data);
      
      if (testResult.id) {
        await updateAIRecommendations(testResult.id, data);
      }
    } catch (error) {
      console.error("Error fetching AI recommendations:", error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const isLoadingData = isLoadingTest;

  if (isLoadingData || isLoadingAI) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={[styles.loadingText, { color: theme.textSecondary }]}>
          {t("common.loading")}
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
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing["2xl"] }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { backgroundColor: theme.primary + "15" }]}>
          <View style={[styles.aiIcon, { backgroundColor: theme.primary }]}>
            <AppIcon name="cpu" size={28} color="#FFFFFF" />
          </View>
          <ThemedText type="h4">{t("aiRecommendations.title")}</ThemedText>
          <ThemedText type="body" style={[styles.headerDescription, { color: theme.textSecondary }]}>
            {t("aiRecommendations.headerDescription", "На основе вашей анкеты, карты зубов и результатов теста")}
          </ThemedText>
        </View>

        {recommendations.length > 0 ? (
          <View style={styles.recommendations}>
            {recommendations.map((rec: any, index: number) => (
              <RecommendationCard
                key={index}
                title={rec.title || `${t("aiRecommendations.recommendation", "Рекомендация")} ${index + 1}`}
                description={rec.description || rec}
                category={rec.category || "default"}
                priority={rec.priority || "normal"}
              />
            ))}
          </View>
        ) : (
          <View style={styles.defaultRecommendations}>
            <RecommendationCard
              title={t("aiRecommendations.regularBrushing")}
              description={t("aiRecommendations.regularBrushingDesc")}
              category="brushing"
              priority="high"
            />
            <RecommendationCard
              title={t("aiRecommendations.floss")}
              description={t("aiRecommendations.flossDesc")}
              category="flossing"
              priority="normal"
            />
            <RecommendationCard
              title={t("aiRecommendations.diet")}
              description={t("aiRecommendations.dietDesc")}
              category="diet"
              priority="normal"
            />
            <RecommendationCard
              title={t("aiRecommendations.dentistVisits")}
              description={t("aiRecommendations.dentistVisitsDesc")}
              category="visit"
              priority="high"
            />
          </View>
        )}

        <View style={[styles.disclaimer, { backgroundColor: theme.warning + "15", borderColor: theme.warning }]}>
          <AppIcon name="alert-triangle" size={20} color={theme.warning} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            {t("onboarding.disclaimer.text1")} {t("onboarding.disclaimer.text2")}
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const icon = RECOMMENDATION_ICONS[category] || RECOMMENDATION_ICONS.default;
  const priorityColor = priority === "high" ? theme.danger : theme.primary;

  return (
    <Card elevation={1} style={styles.recommendationCard}>
      <View style={styles.recommendationHeader}>
        <View style={[styles.recommendationIcon, { backgroundColor: priorityColor + "15" }]}>
          <AppIcon name={icon} size={20} color={priorityColor} />
        </View>
        <View style={styles.recommendationTitleContainer}>
          <ThemedText type="h4">{title}</ThemedText>
          {priority === "high" ? (
            <View style={[styles.priorityBadge, { backgroundColor: theme.danger + "15" }]}>
              <ThemedText type="small" style={{ color: theme.danger, fontWeight: "500" }}>
                {t("aiChat.urgentTag")}
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
