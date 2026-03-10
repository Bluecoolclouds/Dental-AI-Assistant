import React, { useState, useEffect } from "react";
import {
  StyleSheet, View, TextInput, Pressable,
  ActivityIndicator, ScrollView, Alert, Image,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AppIcon from "@/components/Icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useProfile } from "@/hooks/useLocalData";
import { useAuthContext } from "@/contexts/AuthContext";
import { pickAvatarFromGallery, pickAvatarFromCamera, deleteAvatarFile } from "@/utils/avatar";

const GENDER_OPTIONS = [
  { value: "male",   label: "Мужской" },
  { value: "female", label: "Женский" },
  { value: "other",  label: "Не указывать" },
];

const GOALS = [
  { value: "general",    icon: "activity",       label: "Общий мониторинг" },
  { value: "braces",     icon: "git-merge",      label: "Брекеты/элайнеры" },
  { value: "extraction", icon: "shield",         label: "Удаление зуба" },
  { value: "caries",     icon: "alert-triangle", label: "Профилактика кариеса" },
  { value: "reminders",  icon: "bell",           label: "Только напоминания" },
];

const ALLERGY_OPTIONS = [
  { value: "yes",        label: "Да" },
  { value: "no",         label: "Нет" },
  { value: "dont_know",  label: "Не знаю" },
];

const ILLNESS_OPTIONS = [
  { value: "yes",  label: "Да" },
  { value: "no",   label: "Нет" },
];

function formatDateDisplay(isoDate: string | null): string {
  if (!isoDate) return "";
  try {
    const [y, m, d] = isoDate.split("-");
    return `${d}.${m}.${y}`;
  } catch {
    return "";
  }
}

function parseDisplayDate(display: string): string | undefined {
  if (!display || display.length !== 10) return undefined;
  const parts = display.split(".");
  if (parts.length !== 3 || parts[2].length !== 4) return undefined;
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
}

function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
}

export default function AboutMeScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const { profile, updateProfile, isLoading: profileLoading } = useProfile();

  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [goal, setGoal] = useState("");
  const [location, setLocation] = useState("");
  const [allergy, setAllergy] = useState("");
  const [illnesses, setIllnesses] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setBirthDate(formatDateDisplay(profile.birthDate));
      setGender(profile.gender ?? "");
      setGoal(profile.goals ?? "");
      setLocation(profile.location ?? "");
      setAllergy(profile.allergyToAnesthetics ?? "");
      setIllnesses(profile.seriousIllnesses ?? "");
    }
  }, [profile]);

  const handleDateChange = (text: string) => {
    setDateError("");
    setBirthDate(formatDateInput(text));
  };

  const handlePickAvatar = () => {
    Alert.alert("Изменить фото профиля", undefined, [
      {
        text: "Выбрать из галереи",
        onPress: async () => {
          if (!user?.id) return;
          const path = await pickAvatarFromGallery(user.id);
          if (path) {
            if (profile?.avatarUrl) await deleteAvatarFile(profile.avatarUrl);
            await updateProfile({ avatarUrl: path });
          }
        },
      },
      {
        text: "Сделать фото",
        onPress: async () => {
          if (!user?.id) return;
          const path = await pickAvatarFromCamera(user.id);
          if (path) {
            if (profile?.avatarUrl) await deleteAvatarFile(profile.avatarUrl);
            await updateProfile({ avatarUrl: path });
          }
        },
      },
      ...(profile?.avatarUrl
        ? [{
            text: "Удалить фото",
            style: "destructive" as const,
            onPress: async () => {
              await deleteAvatarFile(profile.avatarUrl);
              await updateProfile({ avatarUrl: "" });
            },
          }]
        : []),
      { text: "Отмена", style: "cancel" as const },
    ]);
  };

  const handleSave = async () => {
    if (birthDate && birthDate.length > 0 && birthDate.length < 10) {
      setDateError("Введите полную дату: дд.мм.гггг");
      return;
    }
    setIsSaving(true);
    try {
      const isoDate = parseDisplayDate(birthDate);
      await updateProfile({
        displayName: displayName.trim() || undefined,
        birthDate: isoDate,
        gender: gender || undefined,
        goals: goal || undefined,
        location: location.trim() || undefined,
        allergyToAnesthetics: allergy || undefined,
        seriousIllnesses: illnesses || undefined,
      });
      Alert.alert("Сохранено", "Данные обновлены. ИИ будет их учитывать в рекомендациях.");
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить данные");
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
            ИИ использует эти данные для точных и безопасных рекомендаций
          </ThemedText>
        </View>

        <Pressable onPress={handlePickAvatar} style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={["#5B9FE3", "#4A90D9"]} style={styles.avatar}>
                <AppIcon name="user" size={40} color="#FFFFFF" />
              </LinearGradient>
            )}
            <View style={styles.avatarEditBadge}>
              <AppIcon name="camera" size={14} color="#FFFFFF" />
            </View>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Нажмите, чтобы изменить фото
          </ThemedText>
        </Pressable>

        <SectionTitle>Личные данные</SectionTitle>

        <Field label="Имя или псевдоним">
          <InputRow icon="user">
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Как вас называть?"
              placeholderTextColor={theme.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </InputRow>
        </Field>

        <Field label="Дата рождения">
          <InputRow icon="calendar" error={!!dateError}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="дд.мм.гггг"
              placeholderTextColor={theme.textSecondary}
              value={birthDate}
              onChangeText={handleDateChange}
              keyboardType="number-pad"
              maxLength={10}
            />
          </InputRow>
          {dateError ? (
            <ThemedText type="small" style={{ color: theme.danger, marginTop: 4 }}>
              {dateError}
            </ThemedText>
          ) : null}
        </Field>

        <Field label="Пол">
          <View style={styles.row}>
            {GENDER_OPTIONS.map((opt) => (
              <ChipButton
                key={opt.value}
                label={opt.label}
                selected={gender === opt.value}
                onPress={() => setGender(gender === opt.value ? "" : opt.value)}
              />
            ))}
          </View>
        </Field>

        <Field label="Страна / Город">
          <InputRow icon="map-pin">
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Например: Россия, Москва"
              placeholderTextColor={theme.textSecondary}
              value={location}
              onChangeText={setLocation}
            />
          </InputRow>
        </Field>

        <SectionTitle>Цель использования</SectionTitle>

        <View style={styles.goalsList}>
          {GOALS.map((g) => {
            const selected = goal === g.value;
            return (
              <Pressable
                key={g.value}
                onPress={() => setGoal(selected ? "" : g.value)}
                style={({ pressed }) => [
                  styles.goalCard,
                  {
                    backgroundColor: selected ? theme.primary + "12" : theme.backgroundSecondary,
                    borderColor: selected ? theme.primary : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
              >
                <View style={[styles.goalIcon, { backgroundColor: selected ? theme.primary + "20" : theme.backgroundDefault }]}>
                  <AppIcon name={g.icon as any} size={18} color={selected ? theme.primary : theme.textSecondary} />
                </View>
                <ThemedText type="body" style={{ flex: 1, color: selected ? theme.primary : theme.text, fontWeight: selected ? "600" : "400" }}>
                  {g.label}
                </ThemedText>
                {selected && (
                  <View style={[styles.checkDot, { backgroundColor: theme.primary }]}>
                    <AppIcon name="check" size={12} color="#FFF" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <SectionTitle>Медицинская информация</SectionTitle>

        <Field
          label="Аллергия на анестетики или лекарства у стоматолога?"
          hint="ИИ не назначает лечение, но учитывает при рекомендациях"
        >
          <View style={styles.row}>
            {ALLERGY_OPTIONS.map((opt) => (
              <ChipButton
                key={opt.value}
                label={opt.label}
                selected={allergy === opt.value}
                onPress={() => setAllergy(allergy === opt.value ? "" : opt.value)}
              />
            ))}
          </View>
        </Field>

        <Field
          label="Есть серьёзные заболевания?"
          hint="Сердечно-сосудистые, сахарный диабет, нарушения свёртываемости и др."
        >
          <View style={styles.row}>
            {ILLNESS_OPTIONS.map((opt) => (
              <ChipButton
                key={opt.value}
                label={opt.label}
                selected={illnesses === opt.value}
                onPress={() => setIllnesses(illnesses === opt.value ? "" : opt.value)}
              />
            ))}
          </View>
          {illnesses === "yes" && (
            <View style={[styles.illnessNote, { backgroundColor: theme.warning + "12", borderColor: theme.warning + "30" }]}>
              <AppIcon name="info" size={14} color={theme.warning} />
              <ThemedText type="small" style={{ color: theme.warning, flex: 1 }}>
                Подробности можно рассказать в ИИ-чате — он учтёт их в рекомендациях
              </ThemedText>
            </View>
          )}
        </Field>

        <View style={styles.saveButton}>
          <Button onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#FFF" /> : "Сохранить"}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" style={[styles.fieldLabel, { color: theme.text }]}>{label}</ThemedText>
      {hint && (
        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 8 }}>{hint}</ThemedText>
      )}
      {children}
    </View>
  );
}

function InputRow({ icon, error, children }: { icon: string; error?: boolean; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[
      styles.inputRow,
      {
        backgroundColor: theme.backgroundSecondary,
        borderColor: error ? theme.danger : theme.border,
      }
    ]}>
      <AppIcon name={icon as any} size={18} color={error ? theme.danger : theme.textSecondary} />
      {children}
    </View>
  );
}

function ChipButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.8 : 1,
        }
      ]}
    >
      <ThemedText type="small" style={{ color: selected ? "#FFF" : theme.text, fontWeight: "500" }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: Spacing.lg },
  avatarSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4A90D9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
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
  field: { marginBottom: Spacing.lg },
  fieldLabel: { fontWeight: "500", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  textInput: { flex: 1, fontSize: 15 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  goalsList: { gap: Spacing.sm, marginBottom: Spacing.sm },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  illnessNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  saveButton: { marginTop: Spacing.xl },
});
