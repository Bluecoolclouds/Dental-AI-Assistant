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
  Dimensions,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import AppIcon from "@/components/Icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CalendarEvent } from "@shared/schema";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 800;

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const EVENT_COLORS: Record<string, string> = {
  appointment:   "#4A90D9",
  reminder:      "#F59E0B",
  ai_suggestion: "#8B5CF6",
  personal:      "#10B981",
};

const EVENT_ICONS: Record<string, string> = {
  appointment:   "user",
  reminder:      "bell",
  ai_suggestion: "cpu",
  personal:      "heart",
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
  dateDay: string;
  dateMonth: string;
  dateYear: string;
  timeHour: string;
  timeMinute: string;
  type: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  dateDay: "",
  dateMonth: "",
  dateYear: "",
  timeHour: "",
  timeMinute: "",
  type: "personal",
};

function parseDateToForm(dateStr: string): { dateDay: string; dateMonth: string; dateYear: string } {
  if (!dateStr) return { dateDay: "", dateMonth: "", dateYear: "" };
  const [y, m, d] = dateStr.split("-");
  return { dateDay: d ? String(parseInt(d)) : "", dateMonth: m ? String(parseInt(m)) : "", dateYear: y || "" };
}

function parseTimeToForm(timeStr?: string | null): { timeHour: string; timeMinute: string } {
  if (!timeStr) return { timeHour: "", timeMinute: "" };
  const [h, m] = timeStr.split(":");
  return { timeHour: h ? String(parseInt(h)) : "", timeMinute: m || "" };
}

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

  const sheetY = useSharedValue(SCREEN_HEIGHT);

  const hideSheet = () => setModalVisible(false);

  const animateOpen = () => {
    sheetY.value = SCREEN_HEIGHT;
    sheetY.value = withSpring(0, { damping: 22, stiffness: 280, mass: 0.9 });
  };

  const animateClose = (onDone?: () => void) => {
    sheetY.value = withTiming(SCREEN_HEIGHT, { duration: 260 }, (finished) => {
      if (finished) {
        if (onDone) runOnJS(onDone)();
        else runOnJS(hideSheet)();
      }
    });
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        sheetY.value = e.translationY;
      } else {
        sheetY.value = e.translationY * 0.05;
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY) {
        sheetY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, (finished) => {
          if (finished) runOnJS(hideSheet)();
        });
      } else {
        sheetY.value = withSpring(0, { damping: 22, stiffness: 300 });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

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

  const closeModal = useCallback(() => {
    animateClose(() => {
      setModalVisible(false);
      setEditingEvent(null);
      setForm(EMPTY_FORM);
    });
  }, []);

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
    setForm({ ...EMPTY_FORM, ...parseDateToForm(selectedDate) });
    setModalVisible(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || "",
      ...parseDateToForm(event.date),
      ...parseTimeToForm(event.time),
      type: event.type,
    });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      Alert.alert("Ошибка", "Введите название события");
      return;
    }
    if (!form.dateDay || !form.dateMonth || !form.dateYear) {
      Alert.alert("Ошибка", "Укажите дату");
      return;
    }
    const dateStr = `${form.dateYear}-${form.dateMonth.padStart(2, "0")}-${form.dateDay.padStart(2, "0")}`;
    const timeStr = form.timeHour
      ? `${form.timeHour.padStart(2, "0")}:${(form.timeMinute || "00").padStart(2, "0")}`
      : undefined;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      date: dateStr,
      time: timeStr,
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
  const currentTodayStr = todayStr();
  const selectedDateLabel = selectedDate === currentTodayStr ? "Сегодня" : formatDateLabel(selectedDate);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 80 }}
      >
        {/* Gradient calendar header — scrolls with content */}
        <LinearGradient
          colors={["#4A90D9", "#357ABD"]}
          style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
        >
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
              <AppIcon name="chevron-left" size={22} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <ThemedText style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </ThemedText>
            <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
              <AppIcon name="chevron-right" size={22} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {DAYS.map((d, i) => (
              <ThemedText key={d} style={[styles.weekDay, (i === 5 || i === 6) && styles.weekendDay]}>
                {d}
              </ThemedText>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;
              const dateStr = toDateStr(year, month, day);
              const isToday = dateStr === currentTodayStr;
              const isSelected = dateStr === selectedDate;
              const dayEvents = eventsByDate[dateStr] || [];
              const isWeekend = (idx % 7 === 5) || (idx % 7 === 6);

              return (
                <Pressable
                  key={dateStr}
                  style={styles.cell}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <View style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                    isToday && !isSelected && styles.dayCircleToday,
                  ]}>
                    <ThemedText style={[
                      styles.dayNum,
                      isWeekend && !isSelected && styles.weekendNum,
                      isSelected && styles.dayNumSelected,
                      isToday && !isSelected && styles.dayNumToday,
                    ]}>
                      {day}
                    </ThemedText>
                  </View>
                  {dayEvents.length > 0 && (
                    <View style={styles.dotsRow}>
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            { backgroundColor: isSelected ? "rgba(255,255,255,0.7)" : (EVENT_COLORS[e.type] || "#4A90D9") },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.headerBottom} />
        </LinearGradient>

        {/* Events section */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <View>
              <ThemedText style={[styles.selectedDateLabel, { color: theme.text }]}>
                {selectedDateLabel}
              </ThemedText>
              {selectedEvents.length > 0 && (
                <ThemedText style={[styles.eventsCount, { color: theme.textSecondary }]}>
                  {selectedEvents.length} {selectedEvents.length === 1 ? "событие" : selectedEvents.length < 5 ? "события" : "событий"}
                </ThemedText>
              )}
            </View>
          </View>

          {eventsQuery.isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing["3xl"] }} />
          ) : selectedEvents.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: theme.primary + "15" }]}>
                <AppIcon name="calendar" size={28} color={theme.primary} />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>Нет событий</ThemedText>
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                На этот день ничего не запланировано
              </ThemedText>
              <Pressable onPress={openAddModal} style={[styles.emptyAddBtn, { backgroundColor: theme.primary + "15" }]}>
                <AppIcon name="plus" size={14} color={theme.primary} />
                <ThemedText style={[styles.emptyAddText, { color: theme.primary }]}>Добавить</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.timeline}>
              {selectedEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  theme={theme}
                  isLast={index === selectedEvents.length - 1}
                  onEdit={() => openEditModal(event)}
                  onDelete={() => handleDelete(event)}
                  onToggle={() => handleToggleComplete(event)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating add button */}
      <Pressable
        onPress={openAddModal}
        style={[styles.fab, { backgroundColor: theme.primary, bottom: tabBarHeight + Spacing.lg }]}
      >
        <AppIcon name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      {/* Animated bottom sheet modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
        statusBarTranslucent
        onShow={animateOpen}
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.sheetWrapper}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.sheet,
                { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.xl },
                animatedSheetStyle,
              ]}
            >
              <GestureDetector gesture={panGesture}>
                <View style={styles.dragArea}>
                  <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
                  <ThemedText style={[styles.sheetTitle, { color: theme.text }]}>
                    {editingEvent ? "Редактировать событие" : "Новое событие"}
                  </ThemedText>
                </View>
              </GestureDetector>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
              >
                {/* Title */}
                <View style={styles.formField}>
                  <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Название *</ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                    placeholder="Например: Приём у стоматолога"
                    placeholderTextColor={theme.textSecondary}
                    value={form.title}
                    onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                  />
                </View>

                {/* Date row */}
                <View style={styles.formField}>
                  <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Дата *</ThemedText>
                  <View style={styles.dateRow}>
                    <TextInput
                      style={[styles.datePartInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      placeholder="ДД"
                      placeholderTextColor={theme.textSecondary}
                      value={form.dateDay}
                      onChangeText={(v) => setForm((f) => ({ ...f, dateDay: v.replace(/\D/g, "").slice(0, 2) }))}
                      keyboardType="numeric"
                      maxLength={2}
                      textAlign="center"
                    />
                    <ThemedText style={[styles.dateSep, { color: theme.textSecondary }]}>/</ThemedText>
                    <TextInput
                      style={[styles.datePartInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      placeholder="ММ"
                      placeholderTextColor={theme.textSecondary}
                      value={form.dateMonth}
                      onChangeText={(v) => setForm((f) => ({ ...f, dateMonth: v.replace(/\D/g, "").slice(0, 2) }))}
                      keyboardType="numeric"
                      maxLength={2}
                      textAlign="center"
                    />
                    <ThemedText style={[styles.dateSep, { color: theme.textSecondary }]}>/</ThemedText>
                    <TextInput
                      style={[styles.yearInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      placeholder="ГГГГ"
                      placeholderTextColor={theme.textSecondary}
                      value={form.dateYear}
                      onChangeText={(v) => setForm((f) => ({ ...f, dateYear: v.replace(/\D/g, "").slice(0, 4) }))}
                      keyboardType="numeric"
                      maxLength={4}
                      textAlign="center"
                    />
                  </View>
                </View>

                {/* Time row */}
                <View style={styles.formField}>
                  <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Время (необязательно)</ThemedText>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={[styles.timePartInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      placeholder="ЧЧ"
                      placeholderTextColor={theme.textSecondary}
                      value={form.timeHour}
                      onChangeText={(v) => setForm((f) => ({ ...f, timeHour: v.replace(/\D/g, "").slice(0, 2) }))}
                      keyboardType="numeric"
                      maxLength={2}
                      textAlign="center"
                    />
                    <ThemedText style={[styles.dateSep, { color: theme.textSecondary }]}>:</ThemedText>
                    <TextInput
                      style={[styles.timePartInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      placeholder="ММ"
                      placeholderTextColor={theme.textSecondary}
                      value={form.timeMinute}
                      onChangeText={(v) => setForm((f) => ({ ...f, timeMinute: v.replace(/\D/g, "").slice(0, 2) }))}
                      keyboardType="numeric"
                      maxLength={2}
                      textAlign="center"
                    />
                  </View>
                </View>

                {/* Description */}
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

                {/* Event type */}
                <View style={styles.formField}>
                  <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Тип события</ThemedText>
                  <View style={styles.typeRow}>
                    {Object.entries(EVENT_LABELS).filter(([k]) => k !== "ai_suggestion").map(([key, label]) => {
                      const active = form.type === key;
                      const color = EVENT_COLORS[key];
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setForm((f) => ({ ...f, type: key }))}
                          style={[
                            styles.typeChip,
                            { borderColor: active ? color : theme.border },
                            active && { backgroundColor: color + "18" },
                          ]}
                        >
                          <AppIcon name={EVENT_ICONS[key] as any} size={13} color={active ? color : theme.textSecondary} />
                          <ThemedText style={[styles.typeChipText, { color: active ? color : theme.textSecondary }]}>
                            {label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Save button */}
                <Pressable
                  onPress={handleSave}
                  disabled={isMutating}
                  style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: isMutating ? 0.7 : 1 }]}
                >
                  {isMutating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.saveBtnText}>
                      {editingEvent ? "Сохранить изменения" : "Добавить событие"}
                    </ThemedText>
                  )}
                </Pressable>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

function EventCard({
  event,
  theme,
  isLast,
  onEdit,
  onDelete,
  onToggle,
}: {
  event: CalendarEvent;
  theme: any;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const color = EVENT_COLORS[event.type] || "#4A90D9";
  const icon = EVENT_ICONS[event.type] || "calendar";
  const isAI = event.source === "ai";

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        {event.time ? (
          <ThemedText style={[styles.timelineTime, { color: theme.textSecondary }]}>{event.time}</ThemedText>
        ) : (
          <ThemedText style={[styles.timelineTime, { color: "transparent" }]}>—</ThemedText>
        )}
        <View style={[styles.timelineDot, { backgroundColor: color }]}>
          <AppIcon name={icon as any} size={10} color="#FFFFFF" />
        </View>
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
      </View>

      <View style={[styles.eventCard, { backgroundColor: theme.background }]}>
        <View style={[styles.eventCardAccent, { backgroundColor: color }]} />
        <View style={styles.eventCardInner}>
          <View style={styles.eventCardTop}>
            <View style={[styles.eventTypePill, { backgroundColor: color + "18" }]}>
              {isAI && <AppIcon name="cpu" size={9} color={color} />}
              <ThemedText style={[styles.eventTypePillText, { color }]}>
                {EVENT_LABELS[event.type] || event.type}
              </ThemedText>
            </View>
            <View style={styles.eventActions}>
              <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
                <AppIcon name="edit-2" size={14} color={theme.textSecondary} />
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
                <AppIcon name="trash-2" size={14} color={theme.danger} />
              </Pressable>
            </View>
          </View>

          <Pressable onPress={onToggle} style={styles.eventTitleRow}>
            <View style={[
              styles.checkbox,
              { borderColor: color },
              event.isCompleted && { backgroundColor: color },
            ]}>
              {event.isCompleted && <AppIcon name="check" size={10} color="#FFFFFF" />}
            </View>
            <ThemedText
              style={[
                styles.eventTitle,
                { color: theme.text },
                event.isCompleted && styles.strikethrough,
              ]}
              numberOfLines={2}
            >
              {event.title}
            </ThemedText>
          </Pressable>

          {event.description ? (
            <ThemedText style={[styles.eventDesc, { color: theme.textSecondary }]} numberOfLines={2}>
              {event.description}
            </ThemedText>
          ) : null}
        </View>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: 0,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  navBtn: { padding: Spacing.xs },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    minWidth: 160,
    textAlign: "center",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  weekendDay: {
    color: "rgba(255,200,200,0.85)",
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
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: { backgroundColor: "#FFFFFF" },
  dayCircleToday: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  dayNum: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
  },
  weekendNum: { color: "rgba(255,200,200,0.9)" },
  dayNumSelected: { color: "#4A90D9", fontWeight: "700" },
  dayNumToday: { color: "#FFFFFF", fontWeight: "700" },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 4,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  headerBottom: { height: Spacing.lg },

  eventsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  eventsSectionHeader: { marginBottom: Spacing.lg },
  selectedDateLabel: {
    fontSize: 18,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  eventsCount: { fontSize: 13, marginTop: 2 },

  emptyCard: {
    alignItems: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
  },
  emptyAddText: { fontSize: 14, fontWeight: "600" },

  timeline: { gap: 0 },
  timelineRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  timelineLeft: {
    alignItems: "center",
    width: 44,
    paddingTop: 2,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    borderRadius: 1,
    minHeight: 16,
  },
  eventCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    flexDirection: "row",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  eventCardAccent: { width: 4 },
  eventCardInner: {
    flex: 1,
    padding: Spacing.md,
    gap: 6,
  },
  eventCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  eventTypePillText: { fontSize: 11, fontWeight: "600" },
  eventActions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 4 },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  strikethrough: { textDecorationLine: "line-through", opacity: 0.5 },
  eventDesc: { fontSize: 12, lineHeight: 16, paddingLeft: 26 },

  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },

  modalRoot: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: "box-none",
  } as any,
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  dragArea: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  formContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  formField: { marginBottom: Spacing.lg },
  formRow: { flexDirection: "row", marginBottom: Spacing.lg },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  typeChipText: { fontSize: 13, fontWeight: "500" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  datePartInput: {
    width: 52,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  yearInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  dateSep: {
    fontSize: 18,
    fontWeight: "700",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timePartInput: {
    width: 64,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  saveBtn: {
    borderRadius: BorderRadius.xl,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
