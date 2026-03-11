import React, { useState, useRef, useCallback, useEffect } from "react";
import { StyleSheet, View, ScrollView, Pressable, Platform, Image, Modal, Animated, TouchableWithoutFeedback, FlatList, ActivityIndicator, Alert as RNAlert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/Icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useProfile, useTestResults, useAlerts } from "@/hooks/useLocalData";
import { markAlertAsRead, deleteAlert, Alert as AlertType } from "@/storage/repositories/alertsRepository";
import { getDefaultAvatar } from "@/utils/defaultAvatar";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function ToothMascot() {
  return (
    <Svg width={60} height={70} viewBox="0 0 60 70">
      <Defs>
        <RadialGradient id="mascotGrad" cx="50%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#E0E0E0" />
        </RadialGradient>
      </Defs>
      <Path
        d="M15,25 C15,10 22,3 30,3 C38,3 45,10 45,25 L43,50 C43,58 40,67 36,67 C34,67 32,64 31,60 L30,60 L29,60 C28,64 26,67 24,67 C20,67 17,58 17,50 Z"
        fill="url(#mascotGrad)"
        stroke="#BDBDBD"
        strokeWidth={1}
      />
      <Circle cx="24" cy="20" r="3" fill="#333" />
      <Circle cx="36" cy="20" r="3" fill="#333" />
      <Circle cx="25" cy="21" r="1" fill="#FFF" />
      <Circle cx="37" cy="21" r="1" fill="#FFF" />
      <Path
        d="M24,30 Q30,36 36,30"
        fill="none"
        stroke="#E91E63"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx="18" cy="25" r="4" fill="#FFCDD2" opacity={0.6} />
      <Circle cx="42" cy="25" r="4" fill="#FFCDD2" opacity={0.6} />
    </Svg>
  );
}


export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const { profile } = useProfile();

  const { latestResult: testResult } = useTestResults();
  const { alerts, dismissAlert, refetch } = useAlerts();

  const QUICK_ACTIONS = [
    { id: "toothmap", name: t("home.toothMap"), icon: "map-pin" as const, bgColor: "#EBF5FF", iconColor: "#4A90D9", route: "ToothMapTab" },
    { id: "test", name: t("home.runTest"), icon: "clipboard" as const, bgColor: "#F3EAFF", iconColor: "#9333EA", route: "TestFlow" },
    { id: "recommendations", name: t("home.aiAdvice"), icon: "sun" as const, bgColor: "#FFF8E1", iconColor: "#F59E0B", route: "AIRecommendations" },
    { id: "profile", name: t("home.profile"), icon: "user" as const, bgColor: "#ECFDF5", iconColor: "#10B981", route: "ProfileTab" },
  ];

  const userName = user?.email?.split("@")[0] || t("common.patient");
  const defaultAvatar = getDefaultAvatar(profile?.gender ?? null, user?.id ?? "default");
  
  const urgentAlerts = alerts.filter((a) => a.type === "urgent" || a.priority === "urgent");
  const teethAtRiskAlerts = alerts.filter((a) => a.type === "teeth_at_risk");
  const reminderAlerts = alerts.filter((a) => a.type === "reminder");

  const [showNotifSheet, setShowNotifSheet] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const unreadCount = alerts.filter((a) => !a.isRead && !a.isDismissed).length;

  const openSheet = useCallback(() => {
    setShowNotifSheet(true);
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }, [slideAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setShowNotifSheet(false));
  }, [slideAnim]);

  const handleMarkRead = useCallback(async (id: string) => {
    await markAlertAsRead(id);
    refetch();
  }, []);

  const handleDismissNotif = useCallback(async (id: string) => {
    await dismissAlert(id);
  }, [dismissAlert]);

  const handleDeleteNotif = useCallback((id: string) => {
    RNAlert.alert(t("notifications.deleteTitle"), t("notifications.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => { await deleteAlert(id); refetch(); } },
    ]);
  }, [t]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.xl + 80,
          }
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerCard, { paddingTop: insets.top + Spacing.lg }]}>
          <View style={styles.header}>
            <View style={styles.userInfo}>
              {profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient
                  colors={defaultAvatar.colors}
                  style={styles.avatar}
                >
                  <AppIcon name={defaultAvatar.icon as any} size={22} color="#FFFFFF" />
                </LinearGradient>
              )}
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t("home.greeting")}
                </ThemedText>
                <ThemedText style={styles.userName}>{userName}</ThemedText>
              </View>
            </View>
            <Pressable 
              style={styles.notificationButton}
              onPress={openSheet}
            >
              <AppIcon name="bell" size={20} color={theme.textSecondary} />
              {unreadCount > 0 && (
                <View style={styles.notificationDot}>
                  {unreadCount > 1 && (
                    <ThemedText style={styles.notificationDotText}>{unreadCount > 9 ? "9+" : unreadCount}</ThemedText>
                  )}
                </View>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => navigation.navigate("TestFlow")}>
            <LinearGradient
              colors={["#5B9FE3", "#4A8FD3"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoBanner}
            >
              <View style={styles.promoDecorCircle} />
              <View style={styles.promoContent}>
                <View style={styles.promoTag}>
                  <ThemedText style={styles.promoTagText}>{t("home.promo")}</ThemedText>
                </View>
                <ThemedText style={styles.promoTitle}>
                  {t("home.promoTitle")}
                </ThemedText>
                <ThemedText style={styles.promoSubtitle}>
                  {t("home.promoSubtitle")}
                </ThemedText>
                <View style={styles.promoButton}>
                  <AppIcon name="phone" size={14} color="#4A90D9" />
                  <ThemedText style={styles.promoButtonText}>{t("home.startTest")}</ThemedText>
                </View>
              </View>
              <View style={styles.promoMascot}>
                <ToothMascot />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {urgentAlerts.length > 0 ? (
          <View style={styles.alertsSection}>
            {urgentAlerts.map((alert) => (
              <View 
                key={alert.id}
                style={[styles.urgentAlertCard, { backgroundColor: "#FFEBEE" }]}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.alertIcon, { backgroundColor: "#EF5350" }]}>
                    <AppIcon name="alert-triangle" size={20} color="#FFF" />
                  </View>
                  <View style={styles.alertContent}>
                    <ThemedText type="body" style={{ fontWeight: "600", color: "#C62828" }}>
                      {alert.title}
                    </ThemedText>
                    {alert.description ? (
                      <ThemedText type="small" style={{ color: "#C62828", opacity: 0.8 }}>
                        {alert.description}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable 
                    onPress={() => dismissAlert(alert.id)}
                    style={styles.dismissButton}
                  >
                    <AppIcon name="x" size={18} color="#C62828" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {teethAtRiskAlerts.length > 0 ? (
          <View style={styles.alertsSection}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg }}>{t("home.teethAtRisk")}</ThemedText>
            {teethAtRiskAlerts.map((alert) => (
              <Pressable 
                key={alert.id}
                onPress={() => navigation.navigate("ToothMapTab" as any)}
                style={[styles.teethRiskCard, { backgroundColor: "#FFF3E0" }]}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.alertIcon, { backgroundColor: "#FF9800" }]}>
                    <AppIcon name="alert-circle" size={20} color="#FFF" />
                  </View>
                  <View style={styles.alertContent}>
                    <ThemedText type="body" style={{ fontWeight: "600", color: "#E65100" }}>
                      {alert.title}
                    </ThemedText>
                    {alert.description ? (
                      <ThemedText type="small" style={{ color: "#E65100", opacity: 0.8 }} numberOfLines={2}>
                        {alert.description}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable 
                    onPress={(e) => {
                      e.stopPropagation();
                      dismissAlert(alert.id);
                    }}
                    style={styles.dismissButton}
                  >
                    <AppIcon name="x" size={18} color="#E65100" />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {reminderAlerts.length > 0 ? (
          <View style={styles.alertsSection}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg }}>{t("home.reminders")}</ThemedText>
            {reminderAlerts.slice(0, 3).map((alert) => (
              <View 
                key={alert.id}
                style={[styles.reminderCard, { backgroundColor: "#EBF5FF" }]}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.alertIcon, { backgroundColor: "#4A90D9" }]}>
                    <AppIcon name="bell" size={18} color="#FFF" />
                  </View>
                  <View style={styles.alertContent}>
                    <ThemedText type="body" style={{ fontWeight: "500", color: "#1565C0" }}>
                      {alert.title}
                    </ThemedText>
                    {alert.description ? (
                      <ThemedText type="small" style={{ color: "#1565C0", opacity: 0.8 }} numberOfLines={2}>
                        {alert.description}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable 
                    onPress={() => dismissAlert(alert.id)}
                    style={styles.dismissButton}
                  >
                    <AppIcon name="check" size={18} color="#1565C0" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md, paddingHorizontal: Spacing.lg }}>
            {t("home.quickActions")}
          </ThemedText>
          
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                onPress={() => {
                  navigation.navigate(action.route as any);
                }}
                style={({ pressed }) => [
                  styles.actionCard,
                  { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <View style={[styles.actionIconWrapper, { backgroundColor: action.bgColor }]}>
                  <AppIcon name={action.icon} size={24} color={action.iconColor} />
                </View>
                <ThemedText type="small" style={styles.actionName}>{action.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {testResult ? (
          <Pressable
            onPress={() => navigation.navigate("AIRecommendations")}
            style={[styles.healthCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.healthCardHeader}>
              <View style={[styles.healthIcon, { backgroundColor: "#ECFDF5" }]}>
                <AppIcon name="activity" size={24} color="#10B981" />
              </View>
              <View style={styles.healthInfo}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{t("home.yourHealth")}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t("home.lastCheck")}
                </ThemedText>
              </View>
              <AppIcon name="chevron-right" size={24} color={theme.textSecondary} />
            </View>
            <View style={styles.healthScores}>
              <View style={styles.healthScore}>
                <ThemedText type="h3" style={{ color: "#4A90D9" }}>{testResult.teethRiskScore}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{t("home.teeth")}</ThemedText>
              </View>
              <View style={[styles.healthDivider, { backgroundColor: theme.border }]} />
              <View style={styles.healthScore}>
                <ThemedText type="h3" style={{ color: "#4A90D9" }}>{testResult.gumsRiskScore}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{t("home.gums")}</ThemedText>
              </View>
            </View>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate("Feedback")}
          style={({ pressed }) => [
            styles.feedbackBanner,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.9 : 1 }
          ]}
        >
          <View style={[styles.feedbackIcon, { backgroundColor: "#ECFDF5" }]}>
            <AppIcon name="message-circle" size={20} color="#10B981" />
          </View>
          <View style={styles.feedbackContent}>
            <ThemedText type="body" style={{ fontWeight: "500" }}>{t("home.beta")}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {t("home.helpImprove")}
            </ThemedText>
          </View>
          <AppIcon name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </ScrollView>

      <Modal visible={showNotifSheet} transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.sheetOverlay} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.lg },
            {
              transform: [{
                translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }),
              }],
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <ThemedText type="h3">{t("notifications.title", "Уведомления")}</ThemedText>
            <Pressable onPress={closeSheet} hitSlop={12}>
              <AppIcon name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          {alerts.filter((a) => !a.isDismissed).length === 0 ? (
            <View style={styles.sheetEmpty}>
              <AppIcon name="bell-off" size={40} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                {t("notifications.noActive")}
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={alerts.filter((a) => !a.isDismissed)}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.md }}
              renderItem={({ item }) => {
                const priorityColor = item.priority === "urgent" ? theme.danger : item.priority === "important" ? theme.warning : theme.primary;
                return (
                  <Pressable
                    onPress={() => !item.isRead && handleMarkRead(item.id)}
                    style={[
                      styles.notifItem,
                      { backgroundColor: theme.backgroundRoot, borderLeftWidth: item.isRead ? 0 : 3, borderLeftColor: priorityColor },
                    ]}
                  >
                    <View style={[styles.notifIcon, { backgroundColor: priorityColor + "18" }]}>
                      <AppIcon
                        name={item.type === "reminder" ? "bell" : item.type === "warning" ? "alert-triangle" : item.type === "recommendation" ? "star" : item.type === "checkup" ? "calendar" : "info"}
                        size={18}
                        color={priorityColor}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type={item.isRead ? "body" : "h4"} numberOfLines={1}>{item.title}</ThemedText>
                      {item.description ? (
                        <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={2}>{item.description}</ThemedText>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: "row", gap: Spacing.xs }}>
                      <Pressable hitSlop={8} onPress={() => handleDismissNotif(item.id)}>
                        <AppIcon name="x" size={16} color={theme.textSecondary} />
                      </Pressable>
                      <Pressable hitSlop={8} onPress={() => handleDeleteNotif(item.id)}>
                        <AppIcon name="trash-2" size={16} color={theme.danger} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </Animated.View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.xl,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
    gap: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4A90D9",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  notificationDotText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
    lineHeight: 10,
  },
  promoBanner: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 170,
    overflow: "hidden",
  },
  promoDecorCircle: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  promoContent: {
    flex: 1,
    zIndex: 1,
  },
  promoTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginBottom: Spacing.md,
  },
  promoTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  promoTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: Spacing.xs,
  },
  promoSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginBottom: Spacing.lg,
  },
  promoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  promoButtonText: {
    color: "#4A90D9",
    fontSize: 14,
    fontWeight: "600",
  },
  promoMascot: {
    position: "absolute",
    right: Spacing.lg,
    bottom: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  actionsGrid: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  actionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  actionName: {
    textAlign: "center",
    fontWeight: "500",
    fontSize: 11,
  },
  healthCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  healthCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  healthIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  healthInfo: {
    flex: 1,
  },
  healthScores: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  healthScore: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  healthDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.xl,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  feedbackIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  alertsSection: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  urgentAlertCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: "#EF5350",
  },
  teethRiskCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  reminderCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: "#4A90D9",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  alertContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  dismissButton: {
    padding: Spacing.xs,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: "78%",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  sheetEmpty: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
