import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/Icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useProfile } from "@/hooks/useLocalData";

export default function HealthSurveyScreen() {
  const { t } = useTranslation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile, updateProfile, isLoading: profileLoading } = useProfile();

  const [brushingFrequency, setBrushingFrequency] = useState("");
  const [usesFloss, setUsesFloss] = useState(false);
  const [usesIrrigator, setUsesIrrigator] = useState(false);
  const [hasBraces, setHasBraces] = useState(false);
  const [hasSensitivity, setHasSensitivity] = useState(false);
  const [hasGumBleeding, setHasGumBleeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBrushingFrequency(profile.brushingFrequency ?? "");
      setUsesFloss(profile.usesFloss ?? false);
      setUsesIrrigator(profile.usesIrrigator ?? false);
      setHasBraces(profile.hasBraces ?? false);
      setHasSensitivity(profile.hasSensitivity ?? false);
      setHasGumBleeding(profile.hasGumBleeding ?? false);
    }
  }, [profile]);

  const BRUSHING_OPTIONS = [
    { value: "once", label: t("healthSurvey.onceADay") },
    { value: "twice", label: t("healthSurvey.twiceADay") },
    { value: "more", label: t("onboarding.questionnaire.moreThanTwice") },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        brushingFrequency,
        usesFloss,
        usesIrrigator,
        hasBraces,
        hasSensitivity,
        hasGumBleeding,
      });
      Alert.alert(t("common.done"), t("healthSurvey.saved"));
    } catch {
      Alert.alert(t("common.error"), t("healthSurvey.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <ThemedView style={[styles.loading, { paddingTop: headerHeight }]}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.infoBanner, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "25" }]}>
          <AppIcon name="info" size={16} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, flex: 1 }}>
            {t("healthSurvey.aiNote")}
          </ThemedText>
        </View>

        <SectionTitle>{t("onboarding.questionnaire.brushingTitle")}</SectionTitle>

        <View style={styles.optionsList}>
          {BRUSHING_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setBrushingFrequency(option.value)}
              style={({ pressed }) => [
                styles.optionItem,
                {
                  backgroundColor: brushingFrequency === option.value
                    ? theme.primary + "12"
                    : theme.backgroundSecondary,
                  borderColor: brushingFrequency === option.value
                    ? theme.primary
                    : theme.border,
                  opacity: pressed ? 0.8 : 1,
                }
              ]}
            >
              <ThemedText
                type="body"
                style={{
                  flex: 1,
                  color: brushingFrequency === option.value ? theme.primary : theme.text,
                  fontWeight: brushingFrequency === option.value ? "600" : "400",
                }}
              >
                {option.label}
              </ThemedText>
              {brushingFrequency === option.value && (
                <View style={[styles.checkDot, { backgroundColor: theme.primary }]}>
                  <AppIcon name="check" size={12} color="#FFF" />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <SectionTitle>{t("onboarding.questionnaire.additionalCare")}</SectionTitle>

        <View style={styles.checkboxList}>
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

        <SectionTitle>{t("onboarding.questionnaire.specifics")}</SectionTitle>

        <View style={styles.checkboxList}>
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

        <View style={styles.saveButton}>
          <Button onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#FFF" /> : t("common.save")}
          </Button>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function SectionTitle({ children }: { children: string }) {
  const { theme } = useTheme();
  return (
    <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

function CheckboxItem({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkboxItem,
        {
          backgroundColor: checked ? theme.primary + "12" : theme.backgroundSecondary,
          borderColor: checked ? theme.primary : theme.border,
          opacity: pressed ? 0.8 : 1,
        }
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? theme.primary : theme.backgroundDefault,
            borderColor: checked ? theme.primary : theme.border,
          }
        ]}
      >
        {checked ? <AppIcon name="check" size={14} color="#FFFFFF" /> : null}
      </View>
      <ThemedText
        type="body"
        style={{
          flex: 1,
          color: checked ? theme.primary : theme.text,
          fontWeight: checked ? "500" : "400",
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: Spacing.lg },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxList: {
    gap: Spacing.sm,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    marginTop: Spacing["2xl"],
  },
});
