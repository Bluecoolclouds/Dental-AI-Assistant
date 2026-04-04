import React, { useState, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert, ActivityIndicator, Platform, Image, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";
import { LinearGradient } from "expo-linear-gradient";

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
import { getUnreadAlertsCount } from "@/storage/repositories/alertsRepository";
import { useFocusEffect } from "@react-navigation/native";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MENU_ITEM_DEFS = [
  { icon: "user" as const, key: "about", color: "#4A90D9", route: "AboutMe" },
  { icon: "clipboard" as const, key: "healthSurvey", color: "#0D9488", route: "HealthSurvey" },
  { icon: "folder" as const, key: "materials", color: "#F59E0B", route: "Materials" },
  { icon: "heart" as const, key: "favoriteDoctors", color: "#EF4444", route: "FavoriteDoctors" },
  { icon: "bell" as const, key: "notifications", color: "#4A90D9", route: "Notifications" },
  { icon: "message-circle" as const, key: "feedback", color: "#10B981", route: "Feedback" },
  { icon: "settings" as const, key: "settings", color: "#6B7280", route: "Settings" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user, logout } = useAuthContext();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { profile, updateProfile } = useProfile();
  const defaultAvatar = getDefaultAvatar(profile?.gender ?? null, user?.id ?? "default");

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
