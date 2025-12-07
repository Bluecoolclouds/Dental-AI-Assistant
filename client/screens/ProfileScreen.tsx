import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, Switch, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NOTIFICATIONS_KEY = "@dental_notifications_enabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function scheduleDentalReminders() {
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
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user, logout } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  const { data: profile } = useQuery<any>({
    queryKey: [`/api/profile/${user?.id}`],
    enabled: !!user?.id,
  });

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
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

  const getBrushingLabel = (frequency: string) => {
    switch (frequency) {
      case "once":
        return "1 раз в день";
      case "twice":
        return "2 раза в день";
      case "more":
        return "Более 2 раз";
      default:
        return "Не указано";
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        }
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Card elevation={1} style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Feather name="user" size={32} color="#FFFFFF" />
        </View>
        <View style={styles.userInfo}>
          <ThemedText type="h4">{user?.email}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {profile?.age ? `${profile.age} лет` : "Возраст не указан"}
          </ThemedText>
        </View>
      </Card>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Уведомления
        </ThemedText>

        <View style={[styles.notificationItem, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.menuIcon, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="bell" size={20} color={theme.primary} />
          </View>
          <View style={styles.menuContent}>
            <ThemedText type="body">Напоминания о чистке</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              В 8:00 и 21:00 каждый день
            </ThemedText>
          </View>
          {notificationsLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: theme.border, true: theme.primary + "80" }}
              thumbColor={notificationsEnabled ? theme.primary : theme.textSecondary}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Анкета здоровья
        </ThemedText>

        <Card elevation={1} style={styles.profileCard}>
          <ProfileRow
            label="Чистка зубов"
            value={getBrushingLabel(profile?.brushingFrequency)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ProfileRow
            label="Зубная нить"
            value={profile?.usesFloss ? "Использую" : "Не использую"}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ProfileRow
            label="Ирригатор"
            value={profile?.usesIrrigator ? "Использую" : "Не использую"}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ProfileRow
            label="Брекеты/Элайнеры"
            value={profile?.hasBraces ? "Да" : "Нет"}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ProfileRow
            label="Чувствительность"
            value={profile?.hasSensitivity ? "Есть" : "Нет"}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ProfileRow
            label="Кровоточивость дёсен"
            value={profile?.hasGumBleeding ? "Есть" : "Нет"}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Приложение
        </ThemedText>

        <MenuItem
          icon="message-circle"
          label="Обратная связь"
          onPress={() => navigation.navigate("Feedback")}
        />
        <MenuItem
          icon="info"
          label="О приложении"
          sublabel="Версия 1.0.0 (бета)"
          disabled
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Аккаунт
        </ThemedText>

        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: theme.danger + "15", opacity: pressed ? 0.7 : 1 }
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color={theme.danger} />
          ) : (
            <>
              <Feather name="log-out" size={20} color={theme.danger} />
              <ThemedText type="body" style={{ color: theme.danger }}>
                Выйти из аккаунта
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.profileRow}>
      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText type="body">{value}</ThemedText>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  disabled,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: theme.backgroundDefault, opacity: pressed && !disabled ? 0.7 : 1 }
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: theme.primary + "15" }]}>
        <Feather name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.menuContent}>
        <ThemedText type="body">{label}</ThemedText>
        {sublabel ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {sublabel}
          </ThemedText>
        ) : null}
      </View>
      {!disabled ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginLeft: Spacing.xs,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  profileCard: {
    padding: 0,
    overflow: "hidden",
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
});
