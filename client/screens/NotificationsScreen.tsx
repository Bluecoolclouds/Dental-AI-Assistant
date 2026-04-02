import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Pressable, FlatList, ActivityIndicator, Alert as RNAlert, Platform, Modal, TextInput, TouchableWithoutFeedback, ActionSheetIOS } from "react-native";
import Constants from "expo-constants";

const getNotifications = (): typeof import("expo-notifications") | null => {
  if (Constants.executionEnvironment === "storeClient") return null;
  try { return require("expo-notifications"); } catch { return null; }
};
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/Icons";
import { useFocusEffect } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { addEventToCalendar } from "@/utils/calendar";
import type { RecurrenceFrequency } from "@/utils/calendar";
import {
  Alert,
  getActiveAlerts,
  getAllAlerts,
  markAlertAsRead,
  dismissAlert,
  deleteAlert,
} from "@/storage/repositories/alertsRepository";

const ALARM_PRESETS = [10, 30, 60, 1440] as const;

type AlarmEntry = {
  preset: number | "custom";
  customValue: string;
};

function AlarmPickerModal({
  visible,
  onClose,
  onConfirm,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (alarms: number[], recurrence: RecurrenceFrequency) => void;
  theme: typeof Colors.light;
}) {
  const { t } = useTranslation();
  const [alarms, setAlarms] = useState<AlarmEntry[]>([{ preset: 30, customValue: "" }]);
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(null);

  useEffect(() => {
    if (visible) {
      setAlarms([{ preset: 30, customValue: "" }]);
      setRecurrence(null);
    }
  }, [visible]);

  const handleConfirm = () => {
    const minutes = alarms
      .map((a) => {
        if (a.preset === "custom") {
          const v = parseInt(a.customValue);
          return isNaN(v) || v <= 0 ? null : v;
        }
        return a.preset as number;
      })
      .filter((v): v is number => v !== null);
    onConfirm(minutes.length > 0 ? minutes : [30], recurrence);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.pickerOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.pickerSheet, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.pickerTitle, { color: theme.text }]}>
                {t("calendar.alarmPickerTitle")}
              </ThemedText>

              {alarms.map((alarm, idx) => (
                <View key={idx} style={styles.alarmBlock}>
                  <View style={styles.alarmPresets}>
                    {ALARM_PRESETS.map((min) => {
                      const active = alarm.preset === min;
                      return (
                        <Pressable
                          key={min}
                          onPress={() => setAlarms((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], preset: min, customValue: "" };
                            return next;
                          })}
                          style={[
                            styles.alarmChip,
                            { borderColor: active ? theme.primary : theme.border },
                            active && { backgroundColor: theme.primary + "18" },
                          ]}
                        >
                          <ThemedText style={[styles.alarmChipText, { color: active ? theme.primary : theme.textSecondary }]}>
                            {t(`calendar.alarm${min}`)}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      onPress={() => setAlarms((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], preset: "custom" };
                        return next;
                      })}
                      style={[
                        styles.alarmChip,
                        { borderColor: alarm.preset === "custom" ? theme.primary : theme.border },
                        alarm.preset === "custom" && { backgroundColor: theme.primary + "18" },
                      ]}
                    >
                      <ThemedText style={[styles.alarmChipText, { color: alarm.preset === "custom" ? theme.primary : theme.textSecondary }]}>
                        {t("calendar.alarmCustom")}
                      </ThemedText>
                    </Pressable>
                  </View>
                  {alarm.preset === "custom" && (
                    <View style={styles.alarmCustomRow}>
                      <TextInput
                        style={[styles.alarmCustomInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                        placeholder={t("calendar.alarmCustomPlaceholder")}
                        placeholderTextColor={theme.textSecondary}
                        value={alarm.customValue}
                        onChangeText={(v) => setAlarms((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], customValue: v.replace(/\D/g, "") };
                          return next;
                        })}
                        keyboardType="numeric"
                      />
                      <ThemedText style={[{ color: theme.textSecondary, fontSize: 13 }]}>
                        {t("calendar.alarmCustomLabel")}
                      </ThemedText>
                    </View>
                  )}
                  {alarms.length > 1 && (
                    <Pressable
                      onPress={() => setAlarms((prev) => prev.filter((_, i) => i !== idx))}
                      style={styles.removeBtn}
                    >
                      <AppIcon name="x" size={12} color={theme.danger} />
                      <ThemedText style={[{ color: theme.danger, fontSize: 12 }]}>{t("calendar.removeReminder")}</ThemedText>
                    </Pressable>
                  )}
                </View>
              ))}

              {alarms.length < 3 && (
                <Pressable
                  onPress={() => setAlarms((prev) => [...prev, { preset: 30, customValue: "" }])}
                  style={[styles.addAlarmBtn, { borderColor: theme.primary + "50" }]}
                >
                  <AppIcon name="plus" size={14} color={theme.primary} />
                  <ThemedText style={[{ color: theme.primary, fontSize: 13, fontWeight: "500" }]}>{t("calendar.addReminder")}</ThemedText>
                </Pressable>
              )}

              <ThemedText style={[styles.pickerTitle, { color: theme.text, fontSize: 13, marginTop: 8 }]}>
                {t("calendar.recurrence")}
              </ThemedText>
              <View style={styles.alarmPresets}>
                {([null, "weekly", "monthly", "sixMonths", "yearly"] as RecurrenceFrequency[]).map((freq) => {
                  const active = recurrence === freq;
                  const label = t(`calendar.recurrence${freq ? freq.charAt(0).toUpperCase() + freq.slice(1) : "None"}`);
                  return (
                    <Pressable
                      key={String(freq)}
                      onPress={() => setRecurrence(freq)}
                      style={[
                        styles.alarmChip,
                        { borderColor: active ? theme.primary : theme.border },
                        active && { backgroundColor: theme.primary + "18" },
                      ]}
                    >
                      <ThemedText style={[styles.alarmChipText, { color: active ? theme.primary : theme.textSecondary }]}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.pickerActions}>
                <Pressable onPress={onClose} style={[styles.pickerBtn, { borderColor: theme.border, borderWidth: 1 }]}>
                  <ThemedText style={{ color: theme.textSecondary, fontWeight: "600" }}>{t("common.cancel")}</ThemedText>
                </Pressable>
                <Pressable onPress={handleConfirm} style={[styles.pickerBtn, { backgroundColor: theme.primary }]}>
                  <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>{t("common.confirm")}</ThemedText>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDismissed, setShowDismissed] = useState(false);

  const [alarmPickerAlert, setAlarmPickerAlert] = useState<Alert | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const data = showDismissed 
        ? await getAllAlerts(user.id) 
        : await getActiveAlerts(user.id);
      setAlerts(data);
    } catch (error) {
      console.log("Error loading alerts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, showDismissed]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAlertAsRead(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
    } catch (error) {
      console.log("Error marking as read:", error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissAlert(id);
      if (!showDismissed) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      } else {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isDismissed: true } : a))
        );
      }
    } catch (error) {
      console.log("Error dismissing alert:", error);
    }
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      t("notifications.deleteTitle"),
      t("notifications.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAlert(id);
              setAlerts((prev) => prev.filter((a) => a.id !== id));
            } catch (error) {
              console.log("Error deleting alert:", error);
            }
          },
        },
      ]
    );
  };

  const handleAddToCalendar = (item: Alert) => {
    setAlarmPickerAlert(item);
  };

  const handleSnooze = (item: Alert) => {
    const snoozeOptions = [
      t("profile.snooze10"),
      t("profile.snooze30"),
      t("common.cancel"),
    ];

    const scheduleSnooze = async (minutes: number) => {
      const Notifications = getNotifications();
      if (!Notifications) {
        RNAlert.alert(t("profile.notAvailableExpo"), t("profile.notificationsExpoNote"));
        return;
      }
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: item.title,
            body: item.description || item.title,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: minutes * 60,
          },
        });
        RNAlert.alert(t("common.done"), `${t("profile.snooze")}: ${minutes} ${t("calendar.alarmCustomLabel")}`);
      } catch (e) {
        console.log("Snooze error:", e);
      }
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: snoozeOptions, cancelButtonIndex: 2, title: t("profile.snooze") },
        (idx) => {
          if (idx === 0) scheduleSnooze(10);
          else if (idx === 1) scheduleSnooze(30);
        }
      );
    } else {
      RNAlert.alert(t("profile.snooze"), undefined, [
        { text: t("profile.snooze10"), onPress: () => scheduleSnooze(10) },
        { text: t("profile.snooze30"), onPress: () => scheduleSnooze(30) },
        { text: t("common.cancel"), style: "cancel" },
      ]);
    }
  };

  const handleAlarmPickerConfirm = (alarmMinutes: number[], recurrence: RecurrenceFrequency) => {
    if (!alarmPickerAlert) return;
    const startDate = alarmPickerAlert.dueTime
      ? new Date(alarmPickerAlert.dueTime)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    addEventToCalendar({
      title: alarmPickerAlert.title,
      notes: alarmPickerAlert.description || undefined,
      startDate,
      alarmMinutesBefore: alarmMinutes,
      recurrence,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return theme.danger;
      case "important":
        return theme.warning;
      default:
        return theme.primary;
    }
  };

  const getTypeIcon = (type: string): keyof typeof AppIcon.glyphMap => {
    switch (type) {
      case "reminder":
        return "bell";
      case "warning":
        return "alert-triangle";
      case "recommendation":
        return "star";
      case "checkup":
        return "calendar";
      default:
        return "info";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t("notifications.today");
    } else if (diffDays === 1) {
      return t("notifications.yesterday");
    } else if (diffDays < 7) {
      return `${diffDays} ${t("common.daysAgo", "дн. назад")}`;
    } else {
      return date.toLocaleDateString(t("common.locale", "ru-RU"), {
        day: "numeric",
        month: "short",
      });
    }
  };

  const renderAlert = ({ item }: { item: Alert }) => (
    <Card
      elevation={item.isRead ? 0 : 1}
      style={[
        styles.alertCard,
        item.isDismissed ? { opacity: 0.6 } : {},
        !item.isRead ? { borderLeftWidth: 3, borderLeftColor: getPriorityColor(item.priority) } : {},
      ] as any}
    >
      <Pressable
        onPress={() => !item.isRead && handleMarkAsRead(item.id)}
        style={styles.alertContent}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getPriorityColor(item.priority) + "15" },
          ]}
        >
          <AppIcon
            name={getTypeIcon(item.type)}
            size={20}
            color={getPriorityColor(item.priority)}
          />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <ThemedText
              type={item.isRead ? "body" : "h4"}
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {item.title}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatDate(item.createdAt)}
            </ThemedText>
          </View>
          {item.description ? (
            <ThemedText
              type="small"
              numberOfLines={2}
              style={{ color: theme.textSecondary }}
            >
              {item.description}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.actions}>
        {Platform.OS !== "web" ? (
          <Pressable
            onPress={() => handleAddToCalendar(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <AppIcon name="calendar" size={18} color={theme.primary} />
          </Pressable>
        ) : null}
        {Platform.OS !== "web" ? (
          <Pressable
            onPress={() => handleSnooze(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <AppIcon name="clock" size={18} color={theme.warning || "#F59E0B"} />
          </Pressable>
        ) : null}
        {!item.isDismissed ? (
          <Pressable
            onPress={() => handleDismiss(item.id)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <AppIcon name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => handleDelete(item.id)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.actionButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <AppIcon name="trash-2" size={18} color={theme.danger} />
        </Pressable>
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: theme.primary + "15" },
        ]}
      >
        <AppIcon name="bell-off" size={48} color={theme.primary} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        {t("notifications.noNotifications")}
      </ThemedText>
      <ThemedText
        type="body"
        style={{ color: theme.textSecondary, textAlign: "center" }}
      >
        {showDismissed
          ? t("notifications.noNotifications")
          : t("notifications.noActive")}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.filterRow,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Pressable
          onPress={() => setShowDismissed(false)}
          style={[
            styles.filterButton,
            !showDismissed
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <ThemedText
            type="small"
            style={{ color: !showDismissed ? "#FFFFFF" : theme.text }}
          >
            {t("notifications.active", "Активные")}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setShowDismissed(true)}
          style={[
            styles.filterButton,
            showDismissed
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <ThemedText
            type="small"
            style={{ color: showDismissed ? "#FFFFFF" : theme.text }}
          >
            {t("common.all", "Все")}
          </ThemedText>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
            alerts.length === 0 ? { flex: 1 } : null,
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AlarmPickerModal
        visible={alarmPickerAlert !== null}
        onClose={() => setAlarmPickerAlert(null)}
        onConfirm={handleAlarmPickerConfirm}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  listContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  alertCard: {
    padding: Spacing.md,
  },
  alertContent: {
    flexDirection: "row",
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    textAlign: "center",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  pickerSheet: {
    width: "100%",
    borderRadius: 20,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  alarmBlock: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    marginBottom: Spacing.sm,
  },
  alarmPresets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  alarmChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  alarmChipText: { fontSize: 12, fontWeight: "500" },
  alarmCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  alarmCustomInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: 15,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
  },
  addAlarmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  pickerActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  pickerBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
