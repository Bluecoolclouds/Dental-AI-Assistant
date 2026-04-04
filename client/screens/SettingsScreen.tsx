import React, { useState, useEffect } from "react";
import {
  StyleSheet, View, Switch, Pressable,
  ActivityIndicator, ScrollView, Alert, Modal,
  TouchableWithoutFeedback, TextInput, Platform, Text,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import AppIcon from "@/components/Icons";

import type * as NotificationsType from "expo-notifications";

const getNotifications = (): typeof NotificationsType | null => {
  if (Constants.executionEnvironment === "storeClient") return null;
  return require("expo-notifications") as typeof NotificationsType;
};

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { changeLanguage, type SupportedLanguage } from "@/i18n";

const NOTIFICATIONS_KEY = "@dental_notifications_enabled";
const MORNING_HOUR_KEY = "@dental_morning_hour";
const MORNING_MINUTE_KEY = "@dental_morning_minute";
const EVENING_HOUR_KEY = "@dental_evening_hour";
const EVENING_MINUTE_KEY = "@dental_evening_minute";
const EXTRA_REMINDERS_KEY = "@dental_extra_reminders";

type ExtraReminder = {
  id: string;
  title: string;
  hour: number;
  minute: number;
  enabled: boolean;
  days: number[];
  sound: boolean;
  vibration: boolean;
};

function generateId(): string {
  return Math.random().toString(36).slice(2);
}

async function scheduleAllReminders(
  morningTitle: string,
  morningBody: string,
  eveningTitle: string,
  eveningBody: string,
  morningHour: number,
  morningMinute: number,
  eveningHour: number,
  eveningMinute: number,
  extras: ExtraReminder[],
) {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: { title: morningTitle, body: morningBody },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: morningHour,
      minute: morningMinute,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: { title: eveningTitle, body: eveningBody },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: eveningHour,
      minute: eveningMinute,
    },
  });

  for (const extra of extras) {
    if (!extra.enabled) continue;
    const sound: boolean = extra.sound !== false;
    const vibrate: number[] | undefined = extra.vibration !== false ? [0, 250, 250, 250] : undefined;
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const days: number[] = Array.isArray(extra.days) && extra.days.length > 0 ? extra.days : allDays;
    const isAllDays = days.length === 7;
    const content = { title: extra.title, body: extra.title, sound, vibrate };
    if (isAllDays) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: extra.hour,
          minute: extra.minute,
        },
      });
    } else {
      for (const day of days) {
        const weekday = day === 6 ? 1 : day + 2;
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: extra.hour,
            minute: extra.minute,
          },
        });
      }
    }
  }
}

async function cancelDentalReminders() {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export default function SettingsScreen() {
  const { t, i18n: i18nInstance } = useTranslation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const currentLang = i18nInstance.language as SupportedLanguage;

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  const [morningHour, setMorningHour] = useState(8);
  const [morningMinute, setMorningMinute] = useState(0);
  const [eveningHour, setEveningHour] = useState(21);
  const [eveningMinute, setEveningMinute] = useState(0);
  const [extraReminders, setExtraReminders] = useState<ExtraReminder[]>([]);

  const [showTimeEditor, setShowTimeEditor] = useState(false);
  const [editingTime, setEditingTime] = useState<"morning" | "evening" | string | null>(null);
  const [timeInputH, setTimeInputH] = useState("");
  const [timeInputM, setTimeInputM] = useState("");

  const [showAddExtra, setShowAddExtra] = useState(false);
  const [newExtraTitle, setNewExtraTitle] = useState("");
  const [newExtraHour, setNewExtraHour] = useState("12");
  const [newExtraMinute, setNewExtraMinute] = useState("00");
  const [newExtraDays, setNewExtraDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [newExtraSound, setNewExtraSound] = useState(true);
  const [newExtraVibration, setNewExtraVibration] = useState(true);

  useEffect(() => {
    const Notifications = getNotifications();
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
    checkNotificationStatus();
    loadSavedTimes();
  }, []);

  const loadSavedTimes = async () => {
    try {
      const mh = await AsyncStorage.getItem(MORNING_HOUR_KEY);
      const mm = await AsyncStorage.getItem(MORNING_MINUTE_KEY);
      const eh = await AsyncStorage.getItem(EVENING_HOUR_KEY);
      const em = await AsyncStorage.getItem(EVENING_MINUTE_KEY);
      const extras = await AsyncStorage.getItem(EXTRA_REMINDERS_KEY);
      if (mh !== null) setMorningHour(parseInt(mh));
      if (mm !== null) setMorningMinute(parseInt(mm));
      if (eh !== null) setEveningHour(parseInt(eh));
      if (em !== null) setEveningMinute(parseInt(em));
      if (extras) {
        const parsed: ExtraReminder[] = JSON.parse(extras);
        const normalized = parsed.map((e) => ({
          ...e,
          enabled: e.enabled !== undefined ? e.enabled : true,
          days: Array.isArray(e.days) ? e.days : [0, 1, 2, 3, 4, 5, 6],
          sound: e.sound !== undefined ? e.sound : true,
          vibration: e.vibration !== undefined ? e.vibration : true,
        }));
        setExtraReminders(normalized);
      }
    } catch {}
  };

  const saveTimes = async (mh: number, mm: number, eh: number, em: number, extras: ExtraReminder[]) => {
    await AsyncStorage.setItem(MORNING_HOUR_KEY, String(mh));
    await AsyncStorage.setItem(MORNING_MINUTE_KEY, String(mm));
    await AsyncStorage.setItem(EVENING_HOUR_KEY, String(eh));
    await AsyncStorage.setItem(EVENING_MINUTE_KEY, String(em));
    await AsyncStorage.setItem(EXTRA_REMINDERS_KEY, JSON.stringify(extras));
  };

  const checkNotificationStatus = async () => {
    const Notifications = getNotifications();
    if (!Notifications) {
      setNotificationsLoading(false);
      return;
    }
    try {
      const savedValue = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (savedValue === "true") {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === "granted");
      }
    } catch (error) {
      console.log("Error checking notification status:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const applyReminders = async (
    mh: number, mm: number,
    eh: number, em: number,
    extras: ExtraReminder[],
  ) => {
    await scheduleAllReminders(
      t("profile.morningReminder"),
      t("profile.morningReminderText"),
      t("profile.eveningReminder"),
      t("profile.eveningReminderText"),
      mh, mm, eh, em, extras,
    );
  };

  const handleNotificationToggle = async (value: boolean) => {
    const Notifications = getNotifications();
    if (!Notifications) {
      Alert.alert(
        t("profile.notAvailableExpo"),
        t("profile.notificationsExpoNote"),
      );
      return;
    }
    setNotificationsLoading(true);
    try {
      if (value) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          if (Platform.OS !== "web") {
            Alert.alert(
              t("profile.permissionRequired"),
              t("profile.notificationsPermission"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("profile.openSettings"),
                  onPress: async () => {
                    try { await Linking.openSettings(); } catch {}
                  }
                },
              ]
            );
          }
          setNotificationsEnabled(false);
          await AsyncStorage.setItem(NOTIFICATIONS_KEY, "false");
          return;
        }

        await applyReminders(morningHour, morningMinute, eveningHour, eveningMinute, extraReminders);
        setNotificationsEnabled(true);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, "true");
        Alert.alert(t("common.done"), t("profile.reminderEnabled"));
      } else {
        await cancelDentalReminders();
        setNotificationsEnabled(false);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, "false");
      }
    } catch (error) {
      console.log("Error toggling notifications:", error);
      Alert.alert(t("common.error"), t("profile.notificationsFailed"));
    } finally {
      setNotificationsLoading(false);
    }
  };

  const openTimeEditor = (which: "morning" | "evening" | string) => {
    setEditingTime(which);
    if (which === "morning") {
      setTimeInputH(String(morningHour).padStart(2, "0"));
      setTimeInputM(String(morningMinute).padStart(2, "0"));
    } else if (which === "evening") {
      setTimeInputH(String(eveningHour).padStart(2, "0"));
      setTimeInputM(String(eveningMinute).padStart(2, "0"));
    } else {
      const extra = extraReminders.find((e) => e.id === which);
      if (extra) {
        setTimeInputH(String(extra.hour).padStart(2, "0"));
        setTimeInputM(String(extra.minute).padStart(2, "0"));
      }
    }
    setShowTimeEditor(true);
  };

  const confirmTimeEditor = async () => {
    const h = Math.min(23, Math.max(0, parseInt(timeInputH) || 0));
    const m = Math.min(59, Math.max(0, parseInt(timeInputM) || 0));
    let newMH = morningHour, newMM = morningMinute;
    let newEH = eveningHour, newEM = eveningMinute;
    let newExtras = [...extraReminders];

    if (editingTime === "morning") {
      newMH = h; newMM = m;
      setMorningHour(h); setMorningMinute(m);
    } else if (editingTime === "evening") {
      newEH = h; newEM = m;
      setEveningHour(h); setEveningMinute(m);
    } else if (editingTime) {
      newExtras = extraReminders.map((e) => e.id === editingTime ? { ...e, hour: h, minute: m } : e);
      setExtraReminders(newExtras);
    }

    await saveTimes(newMH, newMM, newEH, newEM, newExtras);
    if (notificationsEnabled) {
      await applyReminders(newMH, newMM, newEH, newEM, newExtras);
    }
    setShowTimeEditor(false);
  };

  const handleAddExtra = async () => {
    if (!newExtraTitle.trim()) return;
    const h = Math.min(23, Math.max(0, parseInt(newExtraHour) || 12));
    const m = Math.min(59, Math.max(0, parseInt(newExtraMinute) || 0));
    const newExtra: ExtraReminder = {
      id: generateId(),
      title: newExtraTitle.trim(),
      hour: h,
      minute: m,
      enabled: true,
      days: newExtraDays.length > 0 ? newExtraDays : [0, 1, 2, 3, 4, 5, 6],
      sound: newExtraSound,
      vibration: newExtraVibration,
    };
    const updated = [...extraReminders, newExtra];
    setExtraReminders(updated);
    await saveTimes(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    if (notificationsEnabled) {
      await applyReminders(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    }
    setNewExtraTitle("");
    setNewExtraHour("12");
    setNewExtraMinute("00");
    setNewExtraDays([0, 1, 2, 3, 4, 5, 6]);
    setNewExtraSound(true);
    setNewExtraVibration(true);
    setShowAddExtra(false);
  };

  const handleToggleExtraEnabled = async (id: string, value: boolean) => {
    const updated = extraReminders.map((e) => e.id === id ? { ...e, enabled: value } : e);
    setExtraReminders(updated);
    await saveTimes(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    if (notificationsEnabled) {
      await applyReminders(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    }
  };

  const handleToggleExtraDay = async (id: string, day: number) => {
    const updated = extraReminders.map((e) => {
      if (e.id !== id) return e;
      const currentDays = Array.isArray(e.days) ? e.days : [0, 1, 2, 3, 4, 5, 6];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day].sort((a, b) => a - b);
      if (newDays.length === 0) return e;
      return { ...e, days: newDays };
    });
    setExtraReminders(updated);
    await saveTimes(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    if (notificationsEnabled) {
      await applyReminders(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    }
  };

  const handleRemoveExtra = async (id: string) => {
    const updated = extraReminders.filter((e) => e.id !== id);
    setExtraReminders(updated);
    await saveTimes(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    if (notificationsEnabled) {
      await applyReminders(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    }
  };

  const handleLanguageToggle = async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
  };

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  const dayLabels = [
    t("profile.dayMon"), t("profile.dayTue"), t("profile.dayWed"),
    t("profile.dayThu"), t("profile.dayFri"), t("profile.daySat"), t("profile.daySun"),
  ];

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.notifHeader}>
            <View style={[styles.iconBox, { backgroundColor: "#4A90D9" + "15" }]}>
              <AppIcon name="bell" size={20} color="#4A90D9" />
            </View>
            <View style={styles.notifContent}>
              <ThemedText type="body">{t("profile.reminders")}</ThemedText>
            </View>
            {notificationsLoading ? (
              <ActivityIndicator size="small" color="#4A90D9" />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: theme.border, true: "#4A90D9" + "80" }}
                thumbColor={notificationsEnabled ? "#4A90D9" : theme.textSecondary}
              />
            )}
          </View>

          <View style={[styles.timesRow, { borderTopColor: theme.border }]}>
            <Pressable style={styles.timeItem} onPress={() => openTimeEditor("morning")}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t("profile.morningTime")}
              </ThemedText>
              <View style={styles.timeValueRow}>
                <ThemedText style={[styles.timeValue, { color: theme.text }]}>
                  {formatTime(morningHour, morningMinute)}
                </ThemedText>
                <AppIcon name="edit-2" size={12} color={theme.textSecondary} />
              </View>
            </Pressable>
            <View style={[styles.timeDivider, { backgroundColor: theme.border }]} />
            <Pressable style={styles.timeItem} onPress={() => openTimeEditor("evening")}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t("profile.eveningTime")}
              </ThemedText>
              <View style={styles.timeValueRow}>
                <ThemedText style={[styles.timeValue, { color: theme.text }]}>
                  {formatTime(eveningHour, eveningMinute)}
                </ThemedText>
                <AppIcon name="edit-2" size={12} color={theme.textSecondary} />
              </View>
            </Pressable>
          </View>

          {extraReminders.length > 0 && (
            <View style={[styles.extrasSection, { borderTopColor: theme.border }]}>
              {extraReminders.map((extra) => {
                const extraDays = Array.isArray(extra.days) && extra.days.length > 0 ? extra.days : [0, 1, 2, 3, 4, 5, 6];
                return (
                  <View key={extra.id} style={styles.extraItem}>
                    <View style={styles.extraRow}>
                      <View style={styles.extraLeft}>
                        <ThemedText style={[styles.extraTitle, { color: extra.enabled !== false ? theme.text : theme.textSecondary }]}>
                          {extra.title}
                        </ThemedText>
                        <Pressable onPress={() => openTimeEditor(extra.id)}>
                          <ThemedText style={[styles.extraTime, { color: extra.enabled !== false ? "#4A90D9" : theme.textSecondary }]}>
                            {formatTime(extra.hour, extra.minute)}
                          </ThemedText>
                        </Pressable>
                      </View>
                      <View style={styles.extraRight}>
                        <Switch
                          value={extra.enabled !== false}
                          onValueChange={(val) => handleToggleExtraEnabled(extra.id, val)}
                          trackColor={{ false: theme.border, true: "#4A90D9" + "80" }}
                          thumbColor={extra.enabled !== false ? "#4A90D9" : theme.textSecondary}
                          style={styles.extraSwitch}
                        />
                        <Pressable onPress={() => handleRemoveExtra(extra.id)} hitSlop={8}>
                          <AppIcon name="x" size={16} color={theme.danger} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.extraDaysRow}>
                      {dayLabels.map((label, idx) => {
                        const isActive = extraDays.includes(idx);
                        return (
                          <Pressable
                            key={idx}
                            onPress={() => handleToggleExtraDay(extra.id, idx)}
                            style={[
                              styles.dayChip,
                              isActive
                                ? { backgroundColor: "#4A90D9" }
                                : { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1 },
                            ]}
                          >
                            <ThemedText style={[styles.dayChipText, { color: isActive ? "#FFFFFF" : theme.textSecondary }]}>
                              {label}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={() => setShowAddExtra(true)}
            style={[styles.addExtraBtn, { borderTopColor: theme.border }]}
          >
            <AppIcon name="plus" size={14} color="#4A90D9" />
            <ThemedText style={[styles.addExtraText, { color: "#4A90D9" }]}>
              {t("profile.addAdditionalReminder")}
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, styles.cardTop, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.notifHeader}>
            <View style={[styles.iconBox, { backgroundColor: "#6366F1" + "15" }]}>
              <AppIcon name="globe" size={20} color="#6366F1" />
            </View>
            <View style={styles.notifContent}>
              <ThemedText type="body">{t("profile.language")}</ThemedText>
            </View>
            <View style={styles.langToggle}>
              <Pressable
                onPress={() => handleLanguageToggle("ru")}
                style={[
                  styles.langBtn,
                  currentLang === "ru" && { backgroundColor: "#6366F1" },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: currentLang === "ru" ? "#FFFFFF" : theme.textSecondary, fontWeight: "600" }}
                >
                  RU
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleLanguageToggle("en")}
                style={[
                  styles.langBtn,
                  currentLang === "en" && { backgroundColor: "#6366F1" },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: currentLang === "en" ? "#FFFFFF" : theme.textSecondary, fontWeight: "600" }}
                >
                  EN
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        <Modal visible={showTimeEditor} transparent animationType="fade" onRequestClose={() => setShowTimeEditor(false)}>
          <TouchableWithoutFeedback onPress={() => setShowTimeEditor(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
                  <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                    {t("profile.setTime")}
                  </ThemedText>
                  <View style={styles.timeInputRow}>
                    <TextInput
                      style={[styles.timeInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      value={timeInputH}
                      onChangeText={(v) => setTimeInputH(v.replace(/\D/g, "").slice(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholder="ЧЧ"
                      placeholderTextColor={theme.textSecondary}
                      textAlign="center"
                    />
                    <ThemedText style={[styles.timeSep, { color: theme.text }]}>:</ThemedText>
                    <TextInput
                      style={[styles.timeInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      value={timeInputM}
                      onChangeText={(v) => setTimeInputM(v.replace(/\D/g, "").slice(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholder="ММ"
                      placeholderTextColor={theme.textSecondary}
                      textAlign="center"
                    />
                  </View>
                  <View style={styles.modalActions}>
                    <Pressable onPress={() => setShowTimeEditor(false)} style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}>
                      <ThemedText style={{ color: theme.textSecondary, fontWeight: "600" }}>{t("common.cancel")}</ThemedText>
                    </Pressable>
                    <Pressable onPress={confirmTimeEditor} style={[styles.modalBtn, { backgroundColor: "#4A90D9" }]}>
                      <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>{t("common.save")}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={showAddExtra} transparent animationType="fade" onRequestClose={() => setShowAddExtra(false)}>
          <TouchableWithoutFeedback onPress={() => setShowAddExtra(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
                  <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                    {t("profile.addAdditionalReminder")}
                  </ThemedText>
                  <TextInput
                    style={[styles.extraTitleInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                    placeholder={t("profile.reminderTitle")}
                    placeholderTextColor={theme.textSecondary}
                    value={newExtraTitle}
                    onChangeText={setNewExtraTitle}
                  />
                  <View style={styles.timeInputRow}>
                    <TextInput
                      style={[styles.timeInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      value={newExtraHour}
                      onChangeText={(v) => setNewExtraHour(v.replace(/\D/g, "").slice(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholder="ЧЧ"
                      placeholderTextColor={theme.textSecondary}
                      textAlign="center"
                    />
                    <ThemedText style={[styles.timeSep, { color: theme.text }]}>:</ThemedText>
                    <TextInput
                      style={[styles.timeInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      value={newExtraMinute}
                      onChangeText={(v) => setNewExtraMinute(v.replace(/\D/g, "").slice(0, 2))}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholder="ММ"
                      placeholderTextColor={theme.textSecondary}
                      textAlign="center"
                    />
                  </View>
                  <View style={styles.modalDaysRow}>
                    {dayLabels.map((label, idx) => {
                      const isActive = newExtraDays.includes(idx);
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => {
                            const updated = isActive
                              ? newExtraDays.filter((d) => d !== idx)
                              : [...newExtraDays, idx].sort((a, b) => a - b);
                            if (updated.length > 0) setNewExtraDays(updated);
                          }}
                          style={[
                            styles.dayChip,
                            isActive
                              ? { backgroundColor: "#4A90D9" }
                              : { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1 },
                          ]}
                        >
                          <ThemedText style={[styles.dayChipText, { color: isActive ? "#FFFFFF" : theme.textSecondary }]}>
                            {label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={[styles.modalToggleRow, { borderTopColor: theme.border }]}>
                    <ThemedText style={[styles.modalToggleLabel, { color: theme.text }]}>
                      {t("profile.sound")}
                    </ThemedText>
                    <Switch
                      value={newExtraSound}
                      onValueChange={setNewExtraSound}
                      trackColor={{ false: theme.border, true: "#4A90D9" + "80" }}
                      thumbColor={newExtraSound ? "#4A90D9" : theme.textSecondary}
                    />
                  </View>
                  <View style={[styles.modalToggleRow, { borderTopColor: theme.border }]}>
                    <ThemedText style={[styles.modalToggleLabel, { color: theme.text }]}>
                      {t("profile.vibration")}
                    </ThemedText>
                    <Switch
                      value={newExtraVibration}
                      onValueChange={setNewExtraVibration}
                      trackColor={{ false: theme.border, true: "#4A90D9" + "80" }}
                      thumbColor={newExtraVibration ? "#4A90D9" : theme.textSecondary}
                    />
                  </View>
                  <View style={styles.modalActions}>
                    <Pressable onPress={() => setShowAddExtra(false)} style={[styles.modalBtn, { borderColor: theme.border, borderWidth: 1 }]}>
                      <ThemedText style={{ color: theme.textSecondary, fontWeight: "600" }}>{t("common.cancel")}</ThemedText>
                    </Pressable>
                    <Pressable onPress={handleAddExtra} style={[styles.modalBtn, { backgroundColor: "#4A90D9" }]}>
                      <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>{t("common.save")}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  cardTop: {
    marginTop: Spacing.md,
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  notifContent: {
    flex: 1,
  },
  timesRow: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  timeItem: {
    flex: 1,
    padding: Spacing.lg,
    gap: 4,
  },
  timeDivider: {
    width: 1,
  },
  timeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeValue: {
    fontSize: 17,
    fontWeight: "600",
  },
  extrasSection: {
    borderTopWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  extraItem: {
    gap: Spacing.sm,
  },
  extraRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  extraLeft: { flex: 1 },
  extraTitle: { fontWeight: "500", fontSize: 14 },
  extraTime: { fontSize: 13 },
  extraRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  extraSwitch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  extraDaysRow: {
    flexDirection: "row",
    gap: 4,
  },
  dayChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  addExtraBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderTopWidth: 1,
    padding: Spacing.md,
  },
  addExtraText: {
    fontSize: 14,
    fontWeight: "500",
  },
  langToggle: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "transparent",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  langBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalSheet: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  timeInput: {
    width: 64,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  timeSep: {
    fontSize: 24,
    fontWeight: "700",
  },
  extraTitleInput: {
    height: 46,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  modalDaysRow: {
    flexDirection: "row",
    gap: 4,
  },
  modalToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  modalToggleLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
});
