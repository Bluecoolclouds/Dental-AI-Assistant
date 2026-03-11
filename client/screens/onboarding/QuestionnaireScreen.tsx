import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";

import { useTranslation } from "react-i18next";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useProfile } from "@/hooks/useLocalData";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Questionnaire">;

const BRUSHING_OPTIONS = (t: any) => [
  { value: "once", label: t("testFlow.opt_less1") === "Реже 1 раза в день" ? "1 раз в день" : "Once a day" },
  { value: "twice", label: t("testFlow.opt_less1") === "Реже 1 раза в день" ? "2 раза в день" : "Twice a day" },
  { value: "more", label: t("onboarding.questionnaire.moreThanTwice") },
];

export default function QuestionnaireScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { updateProfile } = useProfile();

  const [brushingFrequency, setBrushingFrequency] = useState("");
  const [usesFloss, setUsesFloss] = useState(false);
  const [usesIrrigator, setUsesIrrigator] = useState(false);
  const [hasBraces, setHasBraces] = useState(false);
  const [hasSensitivity, setHasSensitivity] = useState(false);
  const [hasGumBleeding, setHasGumBleeding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        brushingFrequency,
        usesFloss,
        usesIrrigator,
        hasBraces,
        hasSensitivity,
        hasGumBleeding,
      });
      navigation.navigate("ToothMapIntro");
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate("ToothMapIntro");
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] }
        ]}
      >
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: "71%" }]} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>5/7</ThemedText>
        </View>

        <ThemedText type="h3" style={styles.title}>
          {t("aboutMe.title")}
        </ThemedText>
        
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t("aboutMe.aiNote")}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>{t("onboarding.questionnaire.brushingTitle")}</ThemedText>
          <View style={styles.options}>
            {BRUSHING_OPTIONS(t).map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setBrushingFrequency(option.value)}
                style={[
                  styles.option,
                  {
                    backgroundColor: brushingFrequency === option.value
                      ? theme.primary
                      : theme.backgroundDefault,
                    borderColor: brushingFrequency === option.value
                      ? theme.primary
                      : theme.border,
                  }
                ]}
              >
                <ThemedText
                  type="body"
                  style={{
                    color: brushingFrequency === option.value ? "#FFFFFF" : theme.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>{t("onboarding.questionnaire.additionalCare")}</ThemedText>
          <View style={styles.checkboxes}>
            <CheckboxItem
              checked={usesFloss}
              onPress={() => setUsesFloss(!usesFloss)}
              label={t("onboarding.questionnaire.floss")}
            />
            <CheckboxItem
              checked={usesIrrigator}
              onPress={() => setUsesIrrigator(!usesIrrigator)}
              label={t("onboarding.questionnaire.irrigator")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>{t("onboarding.questionnaire.specifics")}</ThemedText>
          <View style={styles.checkboxes}>
            <CheckboxItem
              checked={hasBraces}
              onPress={() => setHasBraces(!hasBraces)}
              label={t("onboarding.questionnaire.braces")}
            />
            <CheckboxItem
              checked={hasSensitivity}
              onPress={() => setHasSensitivity(!hasSensitivity)}
              label={t("onboarding.questionnaire.sensitive")}
            />
            <CheckboxItem
              checked={hasGumBleeding}
              onPress={() => setHasGumBleeding(!hasGumBleeding)}
              label={t("onboarding.questionnaire.gumBleeding")}
            />
          </View>
        </View>

        <View style={styles.buttons}>
          <Button onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : t("common.continue")}
          </Button>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedText type="link">{t("common.skip")}</ThemedText>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

function CheckboxItem({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.checkboxItem}>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? theme.primary : theme.backgroundDefault,
            borderColor: checked ? theme.primary : theme.border,
          }
        ]}
      >
        {checked ? <AppIcon name="check" size={16} color="#FFFFFF" /> : null}
      </View>
      <ThemedText type="body">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing["2xl"],
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  label: {
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
    borderWidth: 1,
  },
  checkboxes: {
    gap: Spacing.md,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttons: {
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  skipButton: {
    alignSelf: "center",
    padding: Spacing.md,
  },
});
