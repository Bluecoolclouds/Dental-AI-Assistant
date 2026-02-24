import React from "react";
import { StyleSheet, View, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function ToothLogo() {
  return (
    <View style={styles.logoContainer}>
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="20" fill="white" />
        <Path
          d="M13,18 C13,12 16,9 20,9 C24,9 27,12 27,18 L26,28 C26,31 25,34 23,34 C22,34 21,32 20.5,30 L20,30 L19.5,30 C19,32 18,34 17,34 C15,34 14,31 14,28 Z"
          fill="#4A90D9"
        />
      </Svg>
    </View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  return (
    <LinearGradient
      colors={["#4A90D9", "#7AADE6"]}
      style={styles.container}
    >
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.brandRow}>
          <ToothLogo />
          <View>
            <ThemedText style={styles.brandName}>Dentcor</ThemedText>
            <ThemedText style={styles.brandSub}>DENTAL CARE</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ThemedText style={styles.heroTitle}>
          Следите за{"\n"}здоровьем{"\n"}ваших зубов
        </ThemedText>
        <ThemedText style={styles.heroSubtitle}>
          Контролируйте здоровье зубов и дёсен с помощью ИИ-рекомендаций
        </ThemedText>
      </View>

      <View style={styles.toothIllustration}>
        <View style={styles.toothShape1} />
        <View style={styles.toothShape2} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.buttonsRow}>
          <Pressable
            onPress={() => navigation.navigate("Auth", { mode: "login" })}
            style={styles.secondaryButton}
          >
            <AppIcon name="chevron-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Auth", { mode: "register" })}
            style={styles.primaryButton}
          >
            <ThemedText style={styles.primaryButtonText}>Начать</ThemedText>
            <AppIcon name="chevron-right" size={20} color="#4A90D9" />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  decorativeCircle1: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  header: {
    paddingHorizontal: Spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  logoContainer: {
    width: 40,
    height: 40,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: Spacing.lg,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  toothIllustration: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginBottom: Spacing["3xl"],
  },
  toothShape1: {
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.38,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  toothShape2: {
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.38,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing["3xl"],
    height: 52,
    borderRadius: 26,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A90D9",
  },
});
