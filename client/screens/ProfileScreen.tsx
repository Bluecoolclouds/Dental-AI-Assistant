import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, Switch, Platform, Image, TextInput, Modal, TouchableWithoutFeedback, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";
import type * as NotificationsType from "expo-notifications";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

const getNotifications = (): typeof NotificationsType | null => {
  if (Constants.executionEnvironment === "storeClient") return null;
  return require("expo-notifications") as typeof NotificationsType;
};

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProfile } from "@/hooks/useLocalData";
import { pickAvatarFromGallery, pickAvatarFromCamera, deleteAvatarFile } from "@/utils/avatar";
import { getDefaultAvatar } from "@/utils/defaultAvatar";
import { useTranslation } from "react-i18next";
import { changeLanguage, type SupportedLanguage } from "@/i18n";
import { getUnreadAlertsCount } from "@/storage/repositories/alertsRepository";
import { useFocusEffect } from "@react-navigation/native";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NOTIFICATIONS_KEY = "@dental_notifications_enabled";
const MORNING_HOUR_KEY = "@dental_morning_hour";
const MORNING_MINUTE_KEY = "@dental_morning_minute";
const EVENING_HOUR_KEY = "@dental_evening_hour";
const EVENING_MINUTE_KEY = "@dental_evening_minute";
const EXTRA_REMINDERS_KEY = "@dental_extra_reminders";

const isExpoGo = Constants.executionEnvironment === "storeClient";

type ExtraReminder = {
  id: string;
  title: string;
  hour: number;
  minute: number;
};

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
    await Notifications.scheduleNotificationAsync({
      content: { title: extra.title, body: extra.title },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: extra.hour,
        minute: extra.minute,
      },
    });
  }
}

async function cancelDentalReminders() {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function generateId(): string {
  return Math.random().toString(36).slice(2);
}

const MENU_ITEM_DEFS = [
  { icon: "user" as const, key: "about", color: "#4A90D9", route: "AboutMe" },
  { icon: "clipboard" as const, key: "healthSurvey", color: "#0D9488", route: null },
  { icon: "folder" as const, key: "materials", color: "#F59E0B", route: "Materials" },
  { icon: "heart" as const, key: "favoriteDoctors", color: "#EF4444", route: null },
  { icon: "bell" as const, key: "notifications", color: "#4A90D9", route: "Notifications" },
  { icon: "message-circle" as const, key: "feedback", color: "#10B981", route: "Feedback" },
  { icon: "settings" as const, key: "settings", color: "#6B7280", route: null },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user, logout } = useAuthContext();
  const { t, i18n: i18nInstance } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const [unreadCount, setUnreadCount] = useState(0);

  const { profile, updateProfile } = useProfile();
  const defaultAvatar = getDefaultAvatar(profile?.gender ?? null, user?.id ?? "default");
  const currentLang = i18nInstance.language as SupportedLanguage;

  const loadUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await getUnreadAlertsCount(user.id);
      setUnreadCount(count);
    } catch {}
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadUnread();
    }, [loadUnread])
  );

  const handleLanguageToggle = async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
  };

  const handlePickAvatar = () => {
    Alert.alert(t("profile.changePhoto"), undefined, [
      {
        text: t("profile.chooseFromGallery"),
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
        text: t("profile.takePhoto"),
        onPress: async () => {
          if (!user?.id) return;
          const path = await pickAvatarFromCamera(user.id);
          if (path) {
            if (profile?.avatarUrl) await deleteAvatarFile(profile.avatarUrl);
            await updateProfile({ avatarUrl: path });
          }
        },
      },
      profile?.avatarUrl
        ? {
            text: t("profile.deletePhoto"),
            style: "destructive",
            onPress: async () => {
              await deleteAvatarFile(profile.avatarUrl);
              await updateProfile({ avatarUrl: "" });
            },
          }
        : { text: t("common.cancel"), style: "cancel" },
      ...(profile?.avatarUrl ? [{ text: t("common.cancel"), style: "cancel" as const }] : []),
    ]);
  };

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
      if (extras) setExtraReminders(JSON.parse(extras));
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
                    try {
                      await Linking.openSettings();
                    } catch {}
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
    setShowAddExtra(false);
  };

  const handleRemoveExtra = async (id: string) => {
    const updated = extraReminders.filter((e) => e.id !== id);
    setExtraReminders(updated);
    await saveTimes(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    if (notificationsEnabled) {
      await applyReminders(morningHour, morningMinute, eveningHour, eveningMinute, updated);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t("profile.logoutTitle"),
      t("profile.logoutConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.logout"),
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            await logout();
          },
        },
      ]
    );
  };

  const userName = profile?.displayName || user?.email?.split("@")[0] || t("common.user");

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={styles.scrollContent}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <LinearGradient
        colors={["#5B9FE3", "#4A8FD3"]}
        style={[styles.headerGradient, { paddingTop: insets.top + Spacing.lg }]}
      >
        <View style={styles.headerTop}>
          <ThemedText style={styles.headerTitle}>{t("profile.title")}</ThemedText>
          <Pressable 
            style={styles.headerNotifButton}
            onPress={() => { setUnreadCount(0); navigation.navigate("Notifications"); }}
          >
            <AppIcon name="bell" size={20} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <Pressable onPress={handlePickAvatar} style={styles.profileAvatarContainer}>
              {profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.profileAvatar}
                />
              ) : (
                <LinearGradient
                  colors={defaultAvatar.colors}
                  style={styles.profileAvatar}
                >
                  <AppIcon name={defaultAvatar.icon as any} size={32} color="#FFFFFF" />
                </LinearGradient>
              )}
              <View style={styles.cameraButton}>
                <AppIcon name="camera" size={12} color="#FFFFFF" />
              </View>
            </Pressable>
            
            <View style={styles.profileDetails}>
              <ThemedText style={styles.profileName}>{userName}</ThemedText>
              <ThemedText style={styles.profileEmail}>{user?.email}</ThemedText>
              <View style={styles.premiumBadge}>
                <ThemedText style={styles.premiumText}>{t("common.user")}</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>12</ThemedText>
              <ThemedText style={styles.statLabel}>{t("profile.records")}</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: "#F1F5F9" }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>8</ThemedText>
              <ThemedText style={styles.statLabel}>{t("profile.completed")}</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: "#F1F5F9" }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>4</ThemedText>
              <ThemedText style={styles.statLabel}>{t("profile.upcoming")}</ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.menuSection}>
        <View style={[styles.menuCard, { backgroundColor: theme.backgroundDefault }]}>
          {MENU_ITEM_DEFS.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route as any);
                }
              }}
              style={({ pressed }) => [
                styles.menuItem,
                { opacity: pressed ? 0.7 : 1 },
                index !== MENU_ITEM_DEFS.length - 1 && styles.menuItemBorder,
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + "15" }]}>
                <AppIcon name={item.icon} size={20} color={item.color} />
              </View>
              <ThemedText style={styles.menuLabel}>{t(`profile.${item.key}`)}</ThemedText>
              <AppIcon name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.notificationToggleSection}>
        <View style={[styles.notificationCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.notifHeader}>
            <View style={[styles.menuIcon, { backgroundColor: "#4A90D9" + "15" }]}>
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
              {extraReminders.map((extra) => (
                <View key={extra.id} style={styles.extraRow}>
                  <View style={styles.extraLeft}>
                    <ThemedText style={[styles.extraTitle, { color: theme.text }]}>
                      {extra.title}
                    </ThemedText>
                    <Pressable onPress={() => openTimeEditor(extra.id)}>
                      <ThemedText style={[styles.extraTime, { color: theme.primary }]}>
                        {formatTime(extra.hour, extra.minute)}
                      </ThemedText>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => handleRemoveExtra(extra.id)} hitSlop={8}>
                    <AppIcon name="x" size={16} color={theme.danger} />
                  </Pressable>
                </View>
              ))}
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
      </View>

      <View style={styles.notificationToggleSection}>
        <View style={[styles.notificationCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.notifHeader}>
            <View style={[styles.menuIcon, { backgroundColor: "#6366F1" + "15" }]}>
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
      </View>

      <View style={styles.logoutSection}>
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <>
              <AppIcon name="log-out" size={20} color="#EF4444" />
              <ThemedText style={styles.logoutText}>{t("profile.logout")}</ThemedText>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.versionSection}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>{t("profile.version")}</ThemedText>
      </View>

      <View style={{ height: insets.bottom + 100 }} />

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
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 70,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerNotifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#5B9FE3",
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: -50,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  profileAvatarContainer: {
    position: "relative",
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#4A90D9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: Spacing.sm,
  },
  premiumBadge: {
    backgroundColor: "#EBF5FF",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  premiumText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4A90D9",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4A90D9",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  menuSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: 60,
  },
  menuCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  notificationToggleSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  notificationCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  notifContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  timesRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: Spacing.md,
  },
  timeItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  timeDivider: {
    width: 1,
  },
  timeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  extrasSection: {
    borderTopWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  extraRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  extraLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  extraTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  extraTime: {
    fontSize: 14,
    fontWeight: "600",
  },
  addExtraBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  addExtraText: {
    fontSize: 14,
    fontWeight: "500",
  },
  logoutSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    backgroundColor: "#FEF2F2",
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
  versionSection: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  langToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#6366F1",
    overflow: "hidden",
  },
  langBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 40,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalSheet: {
    width: "100%",
    borderRadius: 20,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  timeInput: {
    width: 64,
    height: 52,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    fontSize: 24,
    fontWeight: "700",
  },
  timeSep: {
    fontSize: 28,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  extraTitleInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
  },
});
