import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import AppIcon from "@/components/Icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CalendarEvent } from "@shared/schema";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const EVENT_COLORS: Record<string, string> = {
  appointment: "#4A90D9",
  reminder:    "#F59E0B",
  ai_suggestion: "#8B5CF6",
  personal:    "#10B981",
};

const EVENT_LABELS: Record<string, string> = {
  appointment:   "Приём",
  reminder:      "Напоминание",
  ai_suggestion: "ИИ",
  personal:      "Личное",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

type FormState = {
  title: string;
  description: string;
  date: string;
  time: string;
  type: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  date: "",
  time: "",
  type: "personal",
};

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const qc = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const eventsQuery = useQuery<CalendarEvent[]>({
    queryKey: [`/api/calendar/${user?.id}`, year, month],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/calendar/${user?.id}?year=${year}&month=${month + 1}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const events = eventsQuery.data || [];

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = useMemo(
    () => (eventsByDate[selectedDate] || []).sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [eventsByDate, selectedDate]
  );

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CalendarEvent>) => {
      const res = await apiRequest("POST", "/api/calendar", { ...data, userId: user?.id });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/calendar/${user?.id}`] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CalendarEvent> }) => {
      const res = await apiRequest("PATCH", `/api/calendar/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/calendar/${user?.id}`] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/calendar/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/calendar/${user?.id}`] });
    },
  });

  const aiSuggestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/calendar/ai-suggest/${user?.id}`);
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [`/api/calendar/${user?.id}`] });
      Alert.alert("ИИ добавил события", `Добавлено событий: ${data.count}`);
    },
    onError: () => {
      Alert.alert("Ошибка", "Не удалось получить предложения от ИИ");
    },
  });

  const prevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) { setYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const openAddModal = () => {
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM, date: selectedDate });
    setModalVisible(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || "",
      date: event.date,
      time: event.time || "",
      type: event.type,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      Alert.alert("Ошибка", "Введите название события");
      return;
    }
    if (!form.date) {
      Alert.alert("Ошибка", "Укажите дату");
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      date: form.date,
      time: form.time.trim() || undefined,
      type: form.type,
      source: "user" as const,
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (event: CalendarEvent) => {
    Alert.alert("Удалить событие?", event.title, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => deleteMutation.mutate(event.id) },
    ]);
  };

  const handleToggleComplete = (event: CalendarEvent) => {
    updateMutation.mutate({ id: event.id, data: { isCompleted: !event.isCompleted } });
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Календарь</ThemedText>
        <Pressable
          onPress={() => aiSuggestMutation.mutate()}
          disabled={aiSuggestMutation.isPending}
          style={[styles.aiButton, { backgroundColor: "#8B5CF6" + "18" }]}
        >
          {aiSuggestMutation.isPending ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <>
              <AppIcon name="cpu" size={16} color="#8B5CF6" />
              <ThemedText style={styles.aiButtonText}>ИИ</ThemedText>
            </>
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }}
      >
        <View style={[styles.calendarCard, { backgroundColor: theme.background }]}>
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} style={styles.navBtn} hitSlop={8}>
              <AppIcon name="chevron-left" size={22} color={theme.text} />
            </Pressable>
            <ThemedText style={[styles.monthTitle, { color: theme.text }]}>
              {MONTHS[month]} {year}
            </ThemedText>
            <Pressable onPress={nextMonth} style={styles.navBtn} hitSlop={8}>
              <AppIcon name="chevron-right" size={22} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {DAYS.map((d) => (
              <ThemedText key={d} style={[styles.weekDay, { color: theme.textSecondary }]}>{d}</ThemedText>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;
              const dateStr = toDateStr(year, month, day);
              const isToday = dateStr === todayStr();
              const isSelected = dateStr === selectedDate;
              const dayEvents = eventsByDate[dateStr] || [];
              return (
                <Pressable
                  key={dateStr}
                  style={[
                    styles.cell,
                    isSelected && { backgroundColor: theme.primary },
                    isToday && !isSelected && { borderColor: theme.primary, borderWidth: 1.5 },
                  ]}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <ThemedText
                    style={[
                      styles.dayNum,
                      { color: isSelected ? "#FFFFFF" : theme.text },
                      isToday && !isSelected && { color: theme.primary, fontWeight: "700" },
                    ]}
                  >
                    {day}
                  </ThemedText>
                  {dayEvents.length > 0 && (
                    <View style={styles.dotsRow}>
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            { backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : EVENT_COLORS[e.type] || theme.primary },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <ThemedText style={[styles.eventsSectionTitle, { color: theme.text }]}>
              {selectedDate === todayStr() ? "Сегодня" : formatDateLabel(selectedDate)}
            </ThemedText>
            <Pressable onPress={openAddModal} style={[styles.addBtn, { backgroundColor: theme.primary }]}>
              <AppIcon name="plus" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {eventsQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.xl }} />
          ) : selectedEvents.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.background }]}>
              <AppIcon name="calendar" size={32} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Нет событий на этот день
              </ThemedText>
              <Pressable onPress={openAddModal}>
                <ThemedText style={[styles.emptyLink, { color: theme.primary }]}>Добавить событие</ThemedText>
              </Pressable>
            </View>
          ) : (
            selectedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                theme={theme}
                onEdit={() => openEditModal(event)}
                onDelete={() => handleDelete(event)}
                onToggle={() => handleToggleComplete(event)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal} />
        <View style={[styles.modalSheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.modalHandle} />
          <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
            {editingEvent ? "Редактировать" : "Новое событие"}
          </ThemedText>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.formField}>
              <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Название *</ThemedText>
              <TextInput
                style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                placeholder="Название события"
                placeholderTextColor={theme.textSecondary}
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              />
            </View>

            <View style={styles.formField}>
              <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Описание</ThemedText>
              <TextInput
                style={[styles.textInput, styles.textArea, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                placeholder="Дополнительная информация"
                placeholderTextColor={theme.textSecondary}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1, marginRight: Spacing.sm }]}>
                <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Дата *</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                  placeholder="ГГГГ-ММ-ДД"
                  placeholderTextColor={theme.textSecondary}
                  value={form.date}
                  onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Время</ThemedText>
                <TextInput
                  style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                  placeholder="ЧЧ:ММ"
                  placeholderTextColor={theme.textSecondary}
                  value={form.time}
                  onChangeText={(v) => setForm((f) => ({ ...f, time: v }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formField}>
              <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Тип</ThemedText>
              <View style={styles.typeRow}>
                {Object.entries(EVENT_LABELS).filter(([k]) => k !== "ai_suggestion").map(([key, label]) => (
                  <Pressable
                    key={key}
                    onPress={() => setForm((f) => ({ ...f, type: key }))}
                    style={[
                      styles.typeChip,
                      { borderColor: EVENT_COLORS[key] },
                      form.type === key && { backgroundColor: EVENT_COLORS[key] },
                    ]}
                  >
                    <ThemedText style={[styles.typeChipText, { color: form.type === key ? "#FFFFFF" : EVENT_COLORS[key] }]}>
                      {label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={isMutating}
              style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: isMutating ? 0.7 : 1 }]}
            >
              {isMutating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.saveBtnText}>{editingEvent ? "Сохранить" : "Добавить"}</ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function EventCard({
  event,
  theme,
  onEdit,
  onDelete,
  onToggle,
}: {
  event: CalendarEvent;
  theme: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const color = EVENT_COLORS[event.type] || "#4A90D9";
  const isAI = event.source === "ai";

  return (
    <View style={[styles.eventCard, { backgroundColor: theme.background, borderLeftColor: color }]}>
      <Pressable onPress={onToggle} style={styles.eventCheckbox}>
        <View style={[
          styles.checkbox,
          { borderColor: color },
          event.isCompleted && { backgroundColor: color },
        ]}>
          {event.isCompleted && <AppIcon name="check" size={12} color="#FFFFFF" />}
        </View>
      </Pressable>

      <View style={styles.eventContent}>
        <View style={styles.eventTopRow}>
          <View style={[styles.eventTypeBadge, { backgroundColor: color + "20" }]}>
            {isAI && <AppIcon name="cpu" size={10} color={color} style={{ marginRight: 3 }} />}
            <ThemedText style={[styles.eventTypeBadgeText, { color }]}>
              {EVENT_LABELS[event.type] || event.type}
            </ThemedText>
          </View>
          {event.time ? (
            <ThemedText style={[styles.eventTime, { color: theme.textSecondary }]}>{event.time}</ThemedText>
          ) : null}
        </View>

        <ThemedText
          style={[styles.eventTitle, { color: theme.text }, event.isCompleted && styles.strikethrough]}
          numberOfLines={2}
        >
          {event.title}
        </ThemedText>

        {event.description ? (
          <ThemedText style={[styles.eventDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {event.description}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.eventActions}>
        <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
          <AppIcon name="edit-2" size={16} color={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
          <AppIcon name="trash-2" size={16} color={theme.danger} />
        </Pressable>
      </View>
    </View>
  );
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontSize: 24, fontWeight: "700" },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  aiButtonText: { color: "#8B5CF6", fontSize: 13, fontWeight: "600" },
  calendarCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  navBtn: { padding: Spacing.sm },
  monthTitle: { fontSize: 18, fontWeight: "700" },
  weekRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    marginVertical: 1,
  },
  dayNum: { fontSize: 14, fontWeight: "500" },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  eventsSection: { marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  eventsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  eventsSectionTitle: { fontSize: 17, fontWeight: "700" },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  emptyText: { fontSize: 14, textAlign: "center" },
  emptyLink: { fontSize: 14, fontWeight: "600" },
  eventCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  eventCheckbox: { marginRight: Spacing.md, paddingTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  eventContent: { flex: 1 },
  eventTopRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: 4 },
  eventTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eventTypeBadgeText: { fontSize: 11, fontWeight: "600" },
  eventTime: { fontSize: 12 },
  eventTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  eventDesc: { fontSize: 13, lineHeight: 18 },
  strikethrough: { textDecorationLine: "line-through", opacity: 0.5 },
  eventActions: { flexDirection: "column", gap: Spacing.sm, marginLeft: Spacing.sm },
  actionBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    maxHeight: "85%",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: Spacing.xl },
  formField: { marginBottom: Spacing.lg },
  formRow: { flexDirection: "row" },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: Spacing.sm },
  textInput: {
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 15,
  },
  textArea: { height: 80, paddingTop: Spacing.md, textAlignVertical: "top" },
  typeRow: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
  typeChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  typeChipText: { fontSize: 13, fontWeight: "600" },
  saveBtn: {
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
