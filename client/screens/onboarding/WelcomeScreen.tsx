import React from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
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
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingTop: insets.top + Spacing.xl, paddingBottom: Spacing.lg }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
          <Feather name="shield" size={48} color="#FFFFFF" />
        </View>
        
        <ThemedText type="h2" style={styles.title}>
          Добро пожаловать!
        </ThemedText>
        
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          Контролируйте здоровье зубов и дёсен. Создайте карту зубов и получите рекомендации от ИИ.
        </ThemedText>

        <View style={styles.features}>
          <FeatureItem icon="check-circle" text="Интерактивная карта зубов" />
          <FeatureItem icon="clipboard" text="Тест здоровья полости рта" />
          <FeatureItem icon="cpu" text="Рекомендации от ИИ" />
          <FeatureItem icon="calendar" text="Напоминания о визитах" />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
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
        <Feather name={icon} size={18} color={theme.primary} />
      </View>
      <ThemedText type="small" style={styles.featureText}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  features: {
    alignSelf: "stretch",
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
  },
  button: {
    marginBottom: Spacing.md,
  },
  loginLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.sm,
  },
});
