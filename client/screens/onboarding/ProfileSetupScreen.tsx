import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator } from "react-native";
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

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "ProfileSetup">;

const GENDER_OPTIONS = (t: any) => [
  { value: "male",   label: t("onboarding.profileSetup.genderMale") },
  { value: "female", label: t("onboarding.profileSetup.genderFemale") },
  { value: "other",  label: t("onboarding.profileSetup.genderNone") },
];

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { updateProfile } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dateError, setDateError] = useState("");

  const formatDate = (text: string) => {
    const digits = text.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
  };

  const handleDateChange = (text: string) => {
    setDateError("");
    setBirthDate(formatDate(text));
  };

  const validateDate = (date: string): boolean => {
    if (!date) return true;
    const parts = date.split(".");
    if (parts.length !== 3 || parts[2].length !== 4) return false;
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const y = year;
    if (y < 1900 || y > new Date().getFullYear()) return false;
    return true;
  };

  const handleContinue = async () => {
    if (birthDate && !validateDate(birthDate)) {
      setDateError(t("onboarding.profileSetup.dateError"));
      return;
    }
    setIsLoading(true);
    try {
      let isoDate: string | undefined;
      if (birthDate && birthDate.length === 10) {
        const [d, m, y] = birthDate.split(".");
        isoDate = `${y}-${m}-${d}`;
      }
      await updateProfile({
        displayName: displayName.trim() || undefined,
        birthDate: isoDate,
        gender: gender || undefined,
      });
      navigation.navigate("Goals");
    } catch (error) {
      console.error("ProfileSetup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate("Goals");
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
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: "43%" }]} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>3/7</ThemedText>
        </View>

        <View style={styles.iconWrapper}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + "15" }]}>
            <AppIcon name="user" size={32} color={theme.primary} />
          </View>
        </View>

        <ThemedText type="h3" style={styles.title}>{t("onboarding.profileSetup.title")}</ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t("aboutMe.savedMessage") === "Данные обновлены. ИИ будет их учитывать в рекомендациях." ? "Данные используются только для персонализации ИИ-рекомендаций" : "Data is used only for personalizing AI recommendations"}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>{t("onboarding.profileSetup.namePlaceholder")}</ThemedText>
          <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <AppIcon name="user" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder={t("onboarding.profileSetup.title")}
              placeholderTextColor={theme.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>{t("onboarding.profileSetup.dob")}</ThemedText>
          <View style={[
            styles.inputWrapper,
            { backgroundColor: theme.backgroundSecondary, borderColor: dateError ? theme.danger : theme.border }
          ]}>
            <AppIcon name="calendar" size={18} color={dateError ? theme.danger : theme.textSecondary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder={t("onboarding.profileSetup.dobPlaceholder")}
              placeholderTextColor={theme.textSecondary}
              value={birthDate}
              onChangeText={handleDateChange}
              keyboardType="number-pad"
              maxLength={10}
              returnKeyType="done"
            />
          </View>
          {dateError ? (
            <ThemedText type="small" style={{ color: theme.danger, marginTop: 4 }}>
              {dateError}
            </ThemedText>
          ) : null}
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
            {t("aboutMe.aiNote")}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>
            {t("aboutMe.gender")} <ThemedText type="small" style={{ color: theme.textSecondary }}>({t("aboutMe.goalReminders") === "Только напоминания" ? "необязательно" : "optional"})</ThemedText>
          </ThemedText>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS(t).map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setGender(gender === opt.value ? "" : opt.value)}
                style={[
                  styles.genderOption,
                  {
                    backgroundColor: gender === opt.value ? theme.primary : theme.backgroundSecondary,
                    borderColor: gender === opt.value ? theme.primary : theme.border,
                  }
                ]}
              >
                <ThemedText
                  type="small"
                  numberOfLines={2}
                  style={{ color: gender === opt.value ? "#FFF" : theme.text, fontWeight: "500", textAlign: "center" }}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.buttons}>
          <Button onPress={handleContinue} disabled={isLoading}>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing["2xl"] },
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
  progressFill: { height: "100%", borderRadius: 2 },
  iconWrapper: { alignItems: "center", marginBottom: Spacing.xl },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { marginBottom: Spacing.sm, textAlign: "center" },
  subtitle: { marginBottom: Spacing["2xl"], textAlign: "center" },
  section: { marginBottom: Spacing.xl },
  label: { fontWeight: "500", marginBottom: Spacing.sm },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  input: { flex: 1, fontSize: 16 },
  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  genderOption: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttons: { gap: Spacing.lg, marginTop: Spacing.lg },
  skipButton: { alignSelf: "center", padding: Spacing.md },
});
