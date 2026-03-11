import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, Switch, Platform, Image } from "react-native";
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NOTIFICATIONS_KEY = "@dental_notifications_enabled";

const isExpoGo = Constants.executionEnvironment === "storeClient";

async function scheduleDentalReminders(
  morningTitle: string,
  morningBody: string,
  eveningTitle: string,
  eveningBody: string,
) {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: { title: morningTitle, body: morningBody },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: { title: eveningTitle, body: eveningBody },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

async function cancelDentalReminders() {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
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

  const { profile, updateProfile } = useProfile();
  const defaultAvatar = getDefaultAvatar(profile?.gender ?? null, user?.id ?? "default");

  const currentLang = i18nInstance.language as SupportedLanguage;

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
  }, []);

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

        await scheduleDentalReminders(
          t("profile.morningReminder"),
          t("profile.morningReminderText"),
          t("profile.eveningReminder"),
          t("profile.eveningReminderText"),
        );
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
            onPress={() => navigation.navigate("Notifications")}
          >
            <AppIcon name="bell" size={20} color="#FFFFFF" />
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
        <View style={[styles.notificationToggle, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.menuIcon, { backgroundColor: "#4A90D9" + "15" }]}>
            <AppIcon name="bell" size={20} color="#4A90D9" />
          </View>
          <View style={styles.notifContent}>
            <ThemedText type="body">{t("profile.reminders")}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              8:00 / 21:00
            </ThemedText>
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
      </View>

      <View style={styles.notificationToggleSection}>
        <View style={[styles.notificationToggle, { backgroundColor: theme.backgroundDefault }]}>
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
  notificationToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
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
  notifContent: {
    flex: 1,
    gap: Spacing.xs,
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
});
