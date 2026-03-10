import React from "react";
import { StyleSheet, View, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useTestResults, useAlerts } from "@/hooks/useLocalData";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QUICK_ACTIONS = [
  { id: "toothmap", name: "Карта зубов", icon: "map-pin" as const, bgColor: "#EBF5FF", iconColor: "#4A90D9", route: "ToothMapTab" },
  { id: "test", name: "Пройти тест", icon: "clipboard" as const, bgColor: "#F3EAFF", iconColor: "#9333EA", route: "TestFlow" },
  { id: "recommendations", name: "ИИ советы", icon: "sun" as const, bgColor: "#FFF8E1", iconColor: "#F59E0B", route: "AIRecommendations" },
  { id: "profile", name: "Профиль", icon: "user" as const, bgColor: "#ECFDF5", iconColor: "#10B981", route: "ProfileTab" },
];

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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthContext();

  const { latestResult: testResult } = useTestResults();
  const { alerts, dismissAlert } = useAlerts();

  const userName = user?.email?.split("@")[0] || "Пациент";
  
  const urgentAlerts = alerts.filter((a) => a.type === "urgent" || a.priority === "urgent");
  const teethAtRiskAlerts = alerts.filter((a) => a.type === "teeth_at_risk");
  const reminderAlerts = alerts.filter((a) => a.type === "reminder");

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
              <LinearGradient
                colors={["#5B9FE3", "#4A90D9"]}
                style={styles.avatar}
              >
                <ThemedText style={styles.avatarText}>
                  {userName.charAt(0).toUpperCase()}
                </ThemedText>
              </LinearGradient>
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Привет 👋
                </ThemedText>
                <ThemedText style={styles.userName}>{userName}</ThemedText>
              </View>
            </View>
            <Pressable 
              style={styles.notificationButton}
              onPress={() => navigation.navigate("Feedback")}
            >
              <AppIcon name="bell" size={20} color={theme.textSecondary} />
              <View style={styles.notificationDot} />
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
                  <ThemedText style={styles.promoTagText}>АКЦИЯ</ThemedText>
                </View>
                <ThemedText style={styles.promoTitle}>
                  Бесплатная{"\n"}диагностика
                </ThemedText>
                <ThemedText style={styles.promoSubtitle}>
                  Пройдите тест и получите рекомендации
                </ThemedText>
                <View style={styles.promoButton}>
                  <AppIcon name="phone" size={14} color="#4A90D9" />
                  <ThemedText style={styles.promoButtonText}>Начать тест</ThemedText>
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
            <ThemedText type="h4" style={{ marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg }}>Зубы под риском</ThemedText>
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
            <ThemedText type="h4" style={{ marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg }}>Напоминания</ThemedText>
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
            Быстрые действия
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
                <ThemedText type="body" style={{ fontWeight: "600" }}>Ваше здоровье</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Последняя проверка
                </ThemedText>
              </View>
              <AppIcon name="chevron-right" size={24} color={theme.textSecondary} />
            </View>
            <View style={styles.healthScores}>
              <View style={styles.healthScore}>
                <ThemedText type="h3" style={{ color: "#4A90D9" }}>{testResult.teethRiskScore}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Зубы</ThemedText>
              </View>
              <View style={[styles.healthDivider, { backgroundColor: theme.border }]} />
              <View style={styles.healthScore}>
                <ThemedText type="h3" style={{ color: "#4A90D9" }}>{testResult.gumsRiskScore}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Дёсны</ThemedText>
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
            <ThemedText type="body" style={{ fontWeight: "500" }}>Бета-версия</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Помогите улучшить приложение
            </ThemedText>
          </View>
          <AppIcon name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </ScrollView>
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
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4A90D9",
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
});
