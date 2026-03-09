import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, Switch, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProfile } from "@/hooks/useLocalData";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NOTIFICATIONS_KEY = "@dental_notifications_enabled";

const isExpoGo = Constants.executionEnvironment === "storeClient";

async function scheduleDentalReminders() {
  if (isExpoGo) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Утренняя чистка",
      body: "Не забудьте почистить зубы утром!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Вечерняя чистка",
      body: "Время почистить зубы перед сном!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

async function cancelDentalReminders() {
  if (isExpoGo) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

const MENU_ITEMS = [
  { icon: "clipboard" as const, label: "Анкета здоровья", color: "#0D9488" },
  { icon: "heart" as const, label: "Избранные врачи", color: "#EF4444" },
  { icon: "bell" as const, label: "Уведомления", color: "#4A90D9" },
  { icon: "credit-card" as const, label: "Способ оплаты", color: "#10B981" },
  { icon: "settings" as const, label: "Настройки", color: "#6B7280" },
  { icon: "help-circle" as const, label: "Центр помощи", color: "#8B5CF6" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user, logout } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  const { profile } = useProfile();

  useEffect(() => {
    if (!isExpoGo) {
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
    if (isExpoGo) {
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
    if (isExpoGo) {
      Alert.alert(
        "Недоступно в Expo Go",
        "Уведомления работают только в полноценной сборке приложения.",
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
              "Разрешение требуется",
              "Для уведомлений нужно разрешение. Откройте настройки?",
              [
                { text: "Отмена", style: "cancel" },
                { 
                  text: "Открыть настройки", 
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

        await scheduleDentalReminders();
        setNotificationsEnabled(true);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, "true");
        Alert.alert("Готово", "Напоминания о чистке зубов включены!");
      } else {
        await cancelDentalReminders();
        setNotificationsEnabled(false);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, "false");
      }
    } catch (error) {
      console.log("Error toggling notifications:", error);
      Alert.alert("Ошибка", "Не удалось изменить настройки уведомлений");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Выход",
      "Вы уверены, что хотите выйти?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            await logout();
          },
        },
      ]
    );
  };

  const userName = user?.email?.split("@")[0] || "Пользователь";

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
          <ThemedText style={styles.headerTitle}>Профиль</ThemedText>
          <Pressable 
            style={styles.headerNotifButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <AppIcon name="bell" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <View style={styles.profileAvatarContainer}>
              <LinearGradient
                colors={["#5B9FE3", "#4A90D9"]}
                style={styles.profileAvatar}
              >
                <AppIcon name="user" size={32} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.cameraButton}>
                <AppIcon name="camera" size={12} color="#FFFFFF" />
              </View>
            </View>
            
            <View style={styles.profileDetails}>
              <ThemedText style={styles.profileName}>{userName}</ThemedText>
              <ThemedText style={styles.profileEmail}>{user?.email}</ThemedText>
              <View style={styles.premiumBadge}>
                <ThemedText style={styles.premiumText}>Пользователь</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>12</ThemedText>
              <ThemedText style={styles.statLabel}>Записей</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: "#F1F5F9" }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>8</ThemedText>
              <ThemedText style={styles.statLabel}>Завершено</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: "#F1F5F9" }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>4</ThemedText>
              <ThemedText style={styles.statLabel}>Впереди</ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.menuSection}>
        <View style={[styles.menuCard, { backgroundColor: theme.backgroundDefault }]}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => {
                if (item.label === "Уведомления") {
                  navigation.navigate("Notifications");
                }
              }}
              style={({ pressed }) => [
                styles.menuItem,
                { opacity: pressed ? 0.7 : 1 },
                index !== MENU_ITEMS.length - 1 && styles.menuItemBorder,
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + "15" }]}>
                <AppIcon name={item.icon} size={20} color={item.color} />
              </View>
              <ThemedText style={styles.menuLabel}>{item.label}</ThemedText>
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
            <ThemedText type="body">Напоминания о чистке</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              В 8:00 и 21:00 каждый день
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
              <ThemedText style={styles.logoutText}>Выйти</ThemedText>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.versionSection}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>Версия 1.0.0</ThemedText>
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
});
