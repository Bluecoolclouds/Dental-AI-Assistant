import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ProblemType } from "@shared/schema";

type RouteProps = RouteProp<RootStackParamList, "ToothDetail">;

const PROBLEM_CONFIG: Record<ProblemType, { label: string; icon: keyof typeof Feather.glyphMap; color: string; description: string }> = {
  pain: { label: "Боль", icon: "zap", color: "#E74C3C", description: "Зубная боль может указывать на кариес, воспаление или повреждение нерва" },
  chip: { label: "Скол", icon: "slash", color: "#9B59B6", description: "Сколы требуют внимания стоматолога для предотвращения дальнейшего разрушения" },
  filling: { label: "Пломба", icon: "square", color: "#3498DB", description: "Имеющаяся пломба требует регулярного контроля состояния" },
  bleeding: { label: "Кровоточивость", icon: "droplet", color: "#E91E63", description: "Кровоточивость дёсен может быть признаком гингивита" },
  sensitivity: { label: "Чувствительность", icon: "wind", color: "#F5A623", description: "Повышенная чувствительность может указывать на обнажение дентина" },
  cavity: { label: "Кариес", icon: "circle", color: "#795548", description: "Кариес требует лечения у стоматолога" },
};

export default function ToothDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const { toothNumber } = route.params;

  const { data: toothData } = useQuery<any[]>({
    queryKey: [`/api/tooth-data/${user?.id}`],
    enabled: !!user?.id,
  });

  const tooth = toothData?.find((t) => t.toothNumber === toothNumber);
  const problems = (tooth?.problems as string[]) || [];

  const getToothPosition = (num: number) => {
    if (num >= 11 && num <= 18) return "Верхняя челюсть, правая сторона";
    if (num >= 21 && num <= 28) return "Верхняя челюсть, левая сторона";
    if (num >= 31 && num <= 38) return "Нижняя челюсть, левая сторона";
    if (num >= 41 && num <= 48) return "Нижняя челюсть, правая сторона";
    return "Неизвестно";
  };

  const getToothType = (num: number) => {
    const lastDigit = num % 10;
    if (lastDigit === 1 || lastDigit === 2) return "Резец";
    if (lastDigit === 3) return "Клык";
    if (lastDigit === 4 || lastDigit === 5) return "Премоляр";
    if (lastDigit >= 6 && lastDigit <= 8) return "Моляр";
    return "Неизвестно";
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
        <Card elevation={1} style={styles.headerCard}>
          <View style={[styles.toothIcon, { backgroundColor: theme.primary + "15" }]}>
            <ThemedText type="h1" style={{ color: theme.primary }}>
              {toothNumber}
            </ThemedText>
          </View>
          <View style={styles.toothInfo}>
            <ThemedText type="h3">Зуб {toothNumber}</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {getToothType(toothNumber)}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {getToothPosition(toothNumber)}
            </ThemedText>
          </View>
        </Card>

        {problems.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Отмеченные проблемы
            </ThemedText>
            <View style={styles.problemsList}>
              {problems.map((problem) => {
                const config = PROBLEM_CONFIG[problem as ProblemType];
                if (!config) return null;
                return (
                  <Card key={problem} elevation={1} style={styles.problemCard}>
                    <View style={styles.problemHeader}>
                      <View style={[styles.problemIcon, { backgroundColor: config.color + "20" }]}>
                        <Feather name={config.icon} size={24} color={config.color} />
                      </View>
                      <ThemedText type="h4" style={{ color: config.color }}>
                        {config.label}
                      </ThemedText>
                    </View>
                    <ThemedText type="body" style={{ color: theme.textSecondary }}>
                      {config.description}
                    </ThemedText>
                  </Card>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.success + "10" }]}>
            <Feather name="check-circle" size={40} color={theme.success} />
            <ThemedText type="h4" style={{ color: theme.success }}>
              Проблем не обнаружено
            </ThemedText>
            <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
              Для этого зуба не отмечено никаких проблем. Продолжайте следить за гигиеной!
            </ThemedText>
          </View>
        )}

        <View style={[styles.disclaimer, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="info" size={20} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
            Вы можете обновить отметки для этого зуба на странице "Карта зубов"
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
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
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  toothIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  toothInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginLeft: Spacing.xs,
  },
  problemsList: {
    gap: Spacing.md,
  },
  problemCard: {
    gap: Spacing.md,
  },
  problemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  problemIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
});
