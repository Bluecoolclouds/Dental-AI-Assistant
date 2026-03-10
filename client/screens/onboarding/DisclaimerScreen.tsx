import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "@/components/Icons";

import { useTranslation } from "react-i18next";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useLocalData";

export default function DisclaimerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { refresh } = useAuthContext();
  const { updateProfile } = useProfile();

  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (!accepted) return;

    setIsLoading(true);
    try {
      await updateProfile({
        disclaimerAccepted: true,
        onboardingCompleted: true,
      });
      await refresh();
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: "100%" }]} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>7/7</ThemedText>
        </View>

        <View style={[styles.warningIcon, { backgroundColor: theme.warning + "20" }]}>
          <AppIcon name="alert-triangle" size={48} color={theme.warning} />
        </View>

        <ThemedText type="h3" style={styles.title}>
          {t("onboarding.disclaimer.title")}
        </ThemedText>
        
        <View style={[styles.disclaimerBox, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <ThemedText type="body" style={[styles.disclaimerText, { color: theme.textSecondary }]}>
            {t("onboarding.disclaimer.text1")}
          </ThemedText>
          
          <ThemedText type="body" style={[styles.disclaimerText, { color: theme.textSecondary }]}>
            {t("onboarding.disclaimer.text2")}
          </ThemedText>
          
          <ThemedText type="body" style={[styles.disclaimerText, { color: theme.textSecondary }]}>
            {t("onboarding.disclaimer.text3")}
          </ThemedText>
        </View>

        <Pressable 
          onPress={() => setAccepted(!accepted)} 
          style={styles.checkboxContainer}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: accepted ? theme.primary : theme.backgroundDefault,
                borderColor: accepted ? theme.primary : theme.border,
              }
            ]}
          >
            {accepted ? <AppIcon name="check" size={18} color="#FFFFFF" /> : null}
          </View>
          <ThemedText type="body" style={styles.checkboxLabel}>
            {t("onboarding.disclaimer.accept")}
          </ThemedText>
        </Pressable>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <Button onPress={handleComplete} disabled={!accepted || isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : t("onboarding.disclaimer.begin")}
          </Button>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  warningIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing["2xl"],
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  disclaimerBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  disclaimerText: {
    lineHeight: 22,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    flex: 1,
  },
  footer: {
    paddingTop: Spacing["2xl"],
  },
});
