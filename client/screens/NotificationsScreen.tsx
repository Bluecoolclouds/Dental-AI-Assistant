import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Pressable, FlatList, ActivityIndicator, Alert as RNAlert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import AppIcon from "@/components/Icons";
import { useFocusEffect } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { addEventToCalendar } from "@/utils/calendar";
import {
  Alert,
  getActiveAlerts,
  getAllAlerts,
  markAlertAsRead,
  dismissAlert,
  deleteAlert,
} from "@/storage/repositories/alertsRepository";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDismissed, setShowDismissed] = useState(false);

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
      "Удалить уведомление",
      "Вы уверены, что хотите удалить это уведомление?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
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
      return "Сегодня";
    } else if (diffDays === 1) {
      return "Вчера";
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString("ru-RU", {
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
        item.isDismissed ? { opacity: 0.6 } : null,
        !item.isRead ? { borderLeftWidth: 3, borderLeftColor: getPriorityColor(item.priority) } : null,
      ]}
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
              type={item.isRead ? "body" : "bodyBold"}
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
            onPress={() => {
              const startDate = item.dueTime ? new Date(item.dueTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
              addEventToCalendar({
                title: item.title,
                notes: item.description || undefined,
                startDate,
                alarmMinutesBefore: 30,
              });
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <AppIcon name="calendar" size={18} color={theme.primary} />
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
        Нет уведомлений
      </ThemedText>
      <ThemedText
        type="body"
        style={{ color: theme.textSecondary, textAlign: "center" }}
      >
        {showDismissed
          ? "У вас нет уведомлений"
          : "Активных уведомлений пока нет"}
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
            Активные
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
            Все
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
});
