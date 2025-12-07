import React from "react";
import { StyleSheet, View, Image, Pressable } from "react-native";
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

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing["4xl"] }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
          <Feather name="shield" size={64} color="#FFFFFF" />
        </View>
        
        <ThemedText type="h1" style={styles.title}>
          Добро пожаловать!
        </ThemedText>
        
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          Это приложение поможет вам контролировать здоровье зубов и дёсен. 
          Создайте карту своих зубов, пройдите тест и получите рекомендации от ИИ по уходу за полостью рта.
        </ThemedText>

        <View style={styles.features}>
          <FeatureItem icon="check-circle" text="Интерактивная карта зубов" />
          <FeatureItem icon="clipboard" text="Тест здоровья полости рта" />
          <FeatureItem icon="cpu" text="Персональные рекомендации от ИИ" />
          <FeatureItem icon="calendar" text="Напоминания о визитах к стоматологу" />
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
        <Button
          onPress={() => navigation.navigate("Auth", { mode: "register" })}
          style={styles.button}
        >
          Начать
        </Button>
        
        <Pressable
          onPress={() => navigation.navigate("Auth", { mode: "login" })}
          style={styles.loginLink}
        >
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            Уже есть аккаунт?{" "}
          </ThemedText>
          <ThemedText type="link">Войти</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function FeatureItem({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: theme.primary + "20" }]}>
        <Feather name={icon} size={20} color={theme.primary} />
      </View>
      <ThemedText type="body" style={styles.featureText}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing["2xl"],
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius["3xl"],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  features: {
    alignSelf: "stretch",
    gap: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing["2xl"],
  },
  button: {
    marginBottom: Spacing.lg,
  },
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
});
