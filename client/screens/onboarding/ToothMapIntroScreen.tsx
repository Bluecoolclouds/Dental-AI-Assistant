import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "ToothMapIntro">;

export default function ToothMapIntroScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: "80%" }]} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>4/5</ThemedText>
        </View>

        <View style={styles.illustration}>
          <View style={[styles.illustrationInner, { backgroundColor: theme.primary + "15" }]}>
            <View style={styles.teethGrid}>
              {[...Array(8)].map((_, i) => (
                <View 
                  key={`top-${i}`} 
                  style={[
                    styles.toothPreview, 
                    { backgroundColor: i === 2 ? theme.warning : theme.backgroundDefault, borderColor: theme.border }
                  ]} 
                />
              ))}
            </View>
            <View style={[styles.gumLine, { backgroundColor: theme.primary + "30" }]} />
            <View style={styles.teethGrid}>
              {[...Array(8)].map((_, i) => (
                <View 
                  key={`bottom-${i}`} 
                  style={[
                    styles.toothPreview, 
                    { backgroundColor: i === 5 ? theme.danger : theme.backgroundDefault, borderColor: theme.border }
                  ]} 
                />
              ))}
            </View>
          </View>
        </View>

        <ThemedText type="h3" style={styles.title}>
          Интерактивная карта зубов
        </ThemedText>
        
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          Отметьте проблемные зубы на карте: боль, сколы, пломбы, кровоточивость дёсен и другие ощущения.
        </ThemedText>

        <View style={styles.features}>
          <FeatureRow icon="mouse-pointer" text="Нажмите на зуб для выбора" />
          <FeatureRow icon="list" text="Укажите тип проблемы" />
          <FeatureRow icon="save" text="Сохраните изменения" />
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        <Button onPress={() => navigation.navigate("Disclaimer")}>
          Далее
        </Button>
      </View>
    </ThemedView>
  );
}

function FeatureRow({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.featureRow}>
      <Feather name={icon} size={20} color={theme.primary} />
      <ThemedText type="body">{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing["2xl"],
  },
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
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  illustration: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  illustrationInner: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  teethGrid: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  toothPreview: {
    width: 28,
    height: 32,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  gumLine: {
    width: "100%",
    height: 8,
    borderRadius: 4,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  features: {
    gap: Spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing["2xl"],
  },
});
