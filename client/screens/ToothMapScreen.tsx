import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, useWindowDimensions, Platform, TextInput, Alert, Modal } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTranslation } from "react-i18next";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "@/components/Icons";
import Svg, { Ellipse, G } from "react-native-svg";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useNavigation } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useToothData, useToothHistory, useToothFiles } from "@/hooks/useLocalData";
import { addEventToCalendar } from "@/utils/calendar";
import { PROBLEM_TYPES, ProblemType } from "@shared/schema";
import type { ToothHistory } from "@/storage/repositories/toothHistoryRepository";
import type { ToothFile } from "@/storage/repositories/toothFilesRepository";

const VALID_TOOTH_IDS = [
  "18", "17", "16", "15", "14", "13", "12", "11",
  "21", "22", "23", "24", "25", "26", "27", "28",
  "31", "32", "33", "34", "35", "36", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48",
];

const FILE_TYPES: Record<string, { labelKey: string; icon: string; color: string }> = {
  ct:       { labelKey: "toothMap.ct",       icon: "layers",      color: "#8B5CF6" },
  xray:     { labelKey: "toothMap.xray",     icon: "aperture",    color: "#3B82F6" },
  photo:    { labelKey: "toothMap.photo",    icon: "image",       color: "#10B981" },
  document: { labelKey: "toothMap.document", icon: "file-text",   color: "#F59E0B" },
  other:    { labelKey: "toothMap.other",    icon: "paperclip",   color: "#6B7280" },
};

type DataTab = "history" | "files";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const PROBLEM_CONFIG: Record<ProblemType, { labelKey: string; icon: keyof typeof AppIcon.glyphMap; color: string }> = {
  pain:        { labelKey: "toothMap.pain",        icon: "zap",          color: "#F44336" },
  chip:        { labelKey: "toothMap.chip",        icon: "slash",        color: "#9C27B0" },
  filling:     { labelKey: "toothMap.filling",     icon: "square",       color: "#2196F3" },
  bleeding:    { labelKey: "toothMap.bleeding",    icon: "droplet",      color: "#E91E63" },
  sensitivity: { labelKey: "toothMap.sensitivity", icon: "wind",         color: "#FF9800" },
  cavity:      { labelKey: "toothMap.cavity",      icon: "circle",       color: "#795548" },
  treated:     { labelKey: "toothMap.treated",     icon: "check-circle", color: "#4CAF50" },
};

interface ToothPosition {
  x: number;
  y: number;
  size: number;
}

function calculateArchPosition(index: number, total: number, isUpper: boolean, archWidth: number, archHeight: number): ToothPosition {
  const normalizedIndex = index / (total - 1);
  const angle = Math.PI * (0.15 + normalizedIndex * 0.7);
  
  const radiusX = archWidth / 2 - 20;
  const radiusY = archHeight - 30;
  
  const x = archWidth / 2 - Math.cos(angle) * radiusX;
  const y = isUpper 
    ? archHeight - Math.sin(angle) * radiusY - 10
    : Math.sin(angle) * radiusY + 10;
  
  const isBackTooth = index < 3 || index > total - 4;
  const size = isBackTooth ? 24 : 20;
  
  return { x, y, size };
}

function ToothShape({ 
  x, 
  y, 
  size, 
  isSelected, 
  hasProblems, 
  problemColor, 
  theme,
  onPress 
}: { 
  x: number; 
  y: number; 
  size: number;
  isSelected: boolean;
  hasProblems: boolean;
  problemColor: string;
  theme: any;
  onPress: () => void;
}) {
  const fill = hasProblems ? problemColor + "60" : theme.backgroundDefault;
  const stroke = isSelected ? theme.primary : hasProblems ? problemColor : theme.border;
  const strokeWidth = isSelected ? 2.5 : 1.5;
  
  return (
    <G onPress={onPress}>
      <Ellipse
        cx={x}
        cy={y}
        rx={size / 2}
        ry={size / 2 * 1.2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {hasProblems ? (
        <Ellipse
          cx={x}
          cy={y}
          rx={4}
          ry={4}
          fill={problemColor}
        />
      ) : null}
    </G>
  );
}

export default function ToothMapScreen() {
  const { t, i18n } = useTranslation();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [hasCustomNote, setHasCustomNote] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [activeTab, setActiveTab] = useState<DataTab>("history");
  
  const [showAddHistoryModal, setShowAddHistoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<ToothHistory | null>(null);
  
  const [newHistoryToothId, setNewHistoryToothId] = useState("");
  const [newHistoryReason, setNewHistoryReason] = useState("");
  const [newHistoryEventType, setNewHistoryEventType] = useState<"treatment" | "resolved" | "note">("treatment");
  
  const [detailsDoctorName, setDetailsDoctorName] = useState("");
  const [detailsClinicName, setDetailsClinicName] = useState("");
  const [detailsTreatment, setDetailsTreatment] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingHistory, setIsCreatingHistory] = useState(false);
  const [isUpdatingHistory, setIsUpdatingHistory] = useState(false);
  const { toothData, isLoading, saveTooth, markToothAsHealed } = useToothData();
  const { history: historyData, createHistory, updateHistory, refetch: refetchHistory } = useToothHistory();
  const { files: filesData, deleteFile } = useToothFiles();

  const handleOpenDetails = (event: ToothHistory) => {
    setSelectedHistoryEvent(event);
    setDetailsDoctorName(event.doctorName || "");
    setDetailsClinicName(event.clinicName || "");
    setDetailsTreatment(event.treatmentDetails || "");
    setShowDetailsModal(true);
  };

  const handleSaveDetails = async () => {
    if (!selectedHistoryEvent) return;
    setIsUpdatingHistory(true);
    try {
      await updateHistory(selectedHistoryEvent.id, {
        doctorName: detailsDoctorName || undefined,
        clinicName: detailsClinicName || undefined,
        treatmentDetails: detailsTreatment || undefined,
      });
      setShowDetailsModal(false);
      setSelectedHistoryEvent(null);
    } catch (error) {
      Alert.alert(t("common.error"), t("toothMap.saveFailed"));
    } finally {
      setIsUpdatingHistory(false);
    }
  };

  const handleAddHistory = async () => {
    if (!newHistoryToothId || !newHistoryReason) {
      Alert.alert(t("common.error"), t("toothMap.specifyToothAndDesc"));
      return;
    }
    if (!VALID_TOOTH_IDS.includes(newHistoryToothId)) {
      Alert.alert(t("common.error"), t("toothMap.invalidToothNumber"));
      return;
    }
    setIsCreatingHistory(true);
    try {
      await createHistory({
        toothId: newHistoryToothId,
        reason: newHistoryReason,
        eventType: newHistoryEventType,
        source: "user",
        priority: "routine",
      });
      setShowAddHistoryModal(false);
      setNewHistoryToothId("");
      setNewHistoryReason("");
      setNewHistoryEventType("treatment");
    } catch (error) {
      Alert.alert(t("common.error"), t("toothMap.addFailed"));
    } finally {
      setIsCreatingHistory(false);
    }
  };

  const handleOpenFile = async (file: ToothFile) => {
    try {
      const fileUri = file.fileUrl.startsWith("file://") ? file.fileUrl : `${FileSystem.documentDirectory}${file.fileUrl}`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        Alert.alert(t("toothMap.fileNotFound"), t("toothMap.fileMovedOrDeleted"));
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert(t("common.error"), t("toothMap.fileOpenNotSupported"));
      }
    } catch {
      Alert.alert(t("common.error"), t("toothMap.fileOpenFailed"));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} ${i18n.language === 'ru' ? 'Б' : 'B'}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${i18n.language === 'ru' ? 'КБ' : 'KB'}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${i18n.language === 'ru' ? 'МБ' : 'MB'}`;
  };

  const groupHistoryByDate = (history: ToothHistory[]) => {
    const groups: Record<string, ToothHistory[]> = {};
    history.forEach(item => {
      const date = formatDate(item.createdAt as unknown as string);
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.entries(groups);
  };

  const getToothNotes = useCallback((toothNumber: number): string => {
    const tooth = toothData.find((t: any) => t.toothNumber === toothNumber);
    return tooth?.notes || "";
  }, [toothData]);

  useEffect(() => {
    if (selectedTooth) {
      const notes = getToothNotes(selectedTooth);
      setCustomNote(notes);
      setHasCustomNote(!!notes);
    } else {
      setCustomNote("");
      setHasCustomNote(false);
    }
  }, [selectedTooth, getToothNotes]);

  const getToothProblems = useCallback((toothNumber: number): string[] => {
    const tooth = toothData.find((t: any) => t.toothNumber === toothNumber);
    return (tooth?.problems as string[]) || [];
  }, [toothData]);

  const getToothProblemColor = useCallback((toothNumber: number): string => {
    const problems = getToothProblems(toothNumber);
    if (problems.length === 0) return theme.border;
    if (problems.includes("treated")) return PROBLEM_CONFIG.treated.color;
    const firstProblem = problems[0] as ProblemType;
    return PROBLEM_CONFIG[firstProblem]?.color || theme.border;
  }, [getToothProblems, theme]);

  const handleToothPress = (toothNumber: number) => {
    setSelectedTooth(selectedTooth === toothNumber ? null : toothNumber);
  };

  const handleProblemToggle = async (problem: ProblemType) => {
    if (!selectedTooth) return;

    const currentProblems = getToothProblems(selectedTooth).filter((p) => p !== "treated");
    const newProblems = currentProblems.includes(problem)
      ? currentProblems.filter((p) => p !== problem)
      : [...currentProblems, problem];

    const notes = hasCustomNote ? customNote : undefined;
    setIsSaving(true);
    try {
      await saveTooth(selectedTooth, newProblems, notes);
      await refetchHistory();
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsHealed = async () => {
    if (!selectedTooth) return;
    setIsSaving(true);
    try {
      await markToothAsHealed(selectedTooth);
      await refetchHistory();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTooth) return;
    const currentProblems = getToothProblems(selectedTooth);
    const notes = hasCustomNote ? customNote : "";
    setIsSaving(true);
    try {
      await saveTooth(selectedTooth, currentProblems, notes);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCustomNote = async (enabled: boolean) => {
    setHasCustomNote(enabled);
    if (!enabled && selectedTooth) {
      const currentProblems = getToothProblems(selectedTooth);
      setIsSaving(true);
      try {
        await saveTooth(selectedTooth, currentProblems, "");
      } finally {
        setIsSaving(false);
      }
      setCustomNote("");
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const archWidth = Math.min(screenWidth - Spacing.xl * 2, 340);
  const archHeight = 120;

  const treatedCount = toothData.filter((t: any) => t.problems?.length > 0).length;
  const totalProblems = toothData.reduce((acc: number, t: any) => acc + (t.problems?.length || 0), 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          }
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#FBBF24" }]} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t("toothMap.treated")}
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#4A90D9" }]} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t("toothMap.pain")}
              </ThemedText>
            </View>
          </View>

          <View style={styles.archContainer}>
              <ThemedText type="small" style={[styles.archLabel, { color: theme.textSecondary }]}>
                {t("toothDetail.upperJaw") || "Верхняя челюсть"}
              </ThemedText>
              
              <View style={[styles.archWrapper, { width: archWidth, height: archHeight }]}>
                <Svg width={archWidth} height={archHeight} viewBox={`0 0 ${archWidth} ${archHeight}`}>
                  {UPPER_TEETH.map((toothNum, index) => {
                    const pos = calculateArchPosition(index, UPPER_TEETH.length, true, archWidth, archHeight);
                    const problems = getToothProblems(toothNum);
                    const hasProblems = problems.length > 0;
                    const isSelected = selectedTooth === toothNum;
                    
                    return (
                      <ToothShape
                        key={toothNum}
                        x={pos.x}
                        y={pos.y}
                        size={pos.size}
                        isSelected={isSelected}
                        hasProblems={hasProblems}
                        problemColor={getToothProblemColor(toothNum)}
                        theme={theme}
                        onPress={() => handleToothPress(toothNum)}
                      />
                    );
                  })}
                </Svg>
                
                <View style={styles.toothNumbers}>
                  {UPPER_TEETH.map((toothNum, index) => {
                    const pos = calculateArchPosition(index, UPPER_TEETH.length, true, archWidth, archHeight);
                    const isSelected = selectedTooth === toothNum;
                    return (
                      <Pressable
                        key={toothNum}
                        onPress={() => handleToothPress(toothNum)}
                        style={[
                          styles.toothNumberButton,
                          { left: pos.x - 12, top: pos.y - 12 }
                        ]}
                      >
                        <ThemedText 
                          type="small" 
                          style={[
                            styles.toothNumber,
                            isSelected && { color: theme.primary, fontWeight: "700" }
                          ]}
                        >
                          {toothNum % 10}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.archSeparator}>
                <View style={[styles.separatorLine, { backgroundColor: theme.border }]} />
              </View>

              <View style={[styles.archWrapper, { width: archWidth, height: archHeight }]}>
                <Svg width={archWidth} height={archHeight} viewBox={`0 0 ${archWidth} ${archHeight}`}>
                  {LOWER_TEETH.map((toothNum, index) => {
                    const pos = calculateArchPosition(index, LOWER_TEETH.length, false, archWidth, archHeight);
                    const problems = getToothProblems(toothNum);
                    const hasProblems = problems.length > 0;
                    const isSelected = selectedTooth === toothNum;
                    
                    return (
                      <ToothShape
                        key={toothNum}
                        x={pos.x}
                        y={pos.y}
                        size={pos.size}
                        isSelected={isSelected}
                        hasProblems={hasProblems}
                        problemColor={getToothProblemColor(toothNum)}
                        theme={theme}
                        onPress={() => handleToothPress(toothNum)}
                      />
                    );
                  })}
                </Svg>
                
                <View style={styles.toothNumbers}>
                  {LOWER_TEETH.map((toothNum, index) => {
                    const pos = calculateArchPosition(index, LOWER_TEETH.length, false, archWidth, archHeight);
                    const isSelected = selectedTooth === toothNum;
                    return (
                      <Pressable
                        key={toothNum}
                        onPress={() => handleToothPress(toothNum)}
                        style={[
                          styles.toothNumberButton,
                          { left: pos.x - 12, top: pos.y - 12 }
                        ]}
                      >
                        <ThemedText 
                          type="small" 
                          style={[
                            styles.toothNumber,
                            isSelected && { color: theme.primary, fontWeight: "700" }
                          ]}
                        >
                          {toothNum % 10}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <ThemedText type="small" style={[styles.archLabel, { color: theme.textSecondary }]}>
                {t("toothDetail.lowerJaw") || "Нижняя челюсть"}
              </ThemedText>
            </View>
        </View>

        {selectedTooth ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText type="h4">{t("home.teeth")} {selectedTooth % 10}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t("toothMap.position") || "Позиция"}: {selectedTooth}
                </ThemedText>
              </View>
              <Pressable 
                onPress={() => setSelectedTooth(null)}
                style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <AppIcon name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            {getToothProblems(selectedTooth).includes("treated") ? (
              <View style={[styles.treatedBanner, { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" }]}>
                <AppIcon name="check-circle" size={18} color="#4CAF50" />
                <ThemedText type="small" style={{ color: "#2E7D32", flex: 1 }}>
                  {t("toothMap.treatedBanner") || "Зуб вылечен. Чтобы снова отмечать проблемы, выберите их ниже — статус \"вылечен\" будет снят."}
                </ThemedText>
              </View>
            ) : null}

            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              {t("toothMap.markProblems") || "Отметьте проблемы:"}
            </ThemedText>

            <View style={styles.problemsGrid}>
              {PROBLEM_TYPES.filter((p) => p !== "treated").map((problem) => {
                const config = PROBLEM_CONFIG[problem];
                const isActive = getToothProblems(selectedTooth).filter((p) => p !== "treated").includes(problem);
                return (
                  <Pressable
                    key={problem}
                    onPress={() => handleProblemToggle(problem)}
                    style={({ pressed }) => [
                      styles.problemButton,
                      {
                        backgroundColor: isActive ? config.color + "15" : theme.backgroundSecondary,
                        borderColor: isActive ? config.color : "transparent",
                        opacity: pressed ? 0.7 : 1,
                      }
                    ]}
                  >
                    <AppIcon name={config.icon} size={18} color={isActive ? config.color : theme.textSecondary} />
                    <ThemedText
                      type="small"
                      style={{ color: isActive ? config.color : theme.text }}
                    >
                      {t(config.labelKey)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {!getToothProblems(selectedTooth).includes("treated") && (
              <Pressable
                onPress={handleMarkAsHealed}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.healedButton,
                  { opacity: pressed || isSaving ? 0.7 : 1 }
                ]}
              >
                <AppIcon name="check-circle" size={18} color="#4CAF50" />
                <ThemedText type="small" style={{ color: "#2E7D32", fontWeight: "600" }}>
                  {t("toothMap.markAsHealed") || "Отметить как вылеченный"}
                </ThemedText>
              </Pressable>
            )}

            <View style={styles.customNoteSection}>
              <Pressable
                onPress={() => handleToggleCustomNote(!hasCustomNote)}
                style={styles.checkboxRow}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    borderColor: hasCustomNote ? theme.primary : theme.border,
                    backgroundColor: hasCustomNote ? theme.primary : "transparent"
                  }
                ]}>
                  {hasCustomNote ? (
                    <AppIcon name="check" size={14} color="#FFF" />
                  ) : null}
                </View>
                <ThemedText type="body" style={{ flex: 1 }}>
                  {t("toothMap.describeOwnWords") || "Описать проблему своими словами"}
                </ThemedText>
              </Pressable>

              {hasCustomNote ? (
                <View style={styles.noteInputContainer}>
                  <TextInput
                    style={[
                      styles.noteInput,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      }
                    ]}
                    placeholder={t("toothMap.complaintsDesc")}
                    placeholderTextColor={theme.textSecondary}
                    value={customNote}
                    onChangeText={setCustomNote}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Pressable
                    onPress={handleSaveNotes}
                    disabled={isSaving}
                    style={({ pressed }) => [
                      styles.saveNoteButton,
                      {
                        backgroundColor: theme.primary,
                        opacity: pressed || isSaving ? 0.7 : 1,
                      }
                    ]}
                  >
                    <AppIcon name="save" size={16} color="#FFF" />
                    <ThemedText type="small" style={{ color: "#FFF", fontWeight: "600" }}>
                      {t("common.save")}
                    </ThemedText>
                  </Pressable>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    {t("toothMap.aiUseNote") || "Эта информация будет использоваться ИИ-консультантом"}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {isSaving ? (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t("toothMap.saving")}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.hintCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.hintIcon, { backgroundColor: theme.primary + "15" }]}>
              <AppIcon name="info" size={20} color={theme.primary} />
            </View>
            <View style={styles.hintContent}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>{t("toothMap.howToUse") || "Как использовать"}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t("onboarding.toothMapIntro.tapToSelect")}
              </ThemedText>
            </View>
          </View>
        )}

        <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.primary }}>{treatedCount}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{t("toothMap.teethMarked") || "Зубов отмечено"}</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.warning }}>{totalProblems}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{t("toothMap.totalProblems") || "Всего проблем"}</ThemedText>
          </View>
        </View>

        <View style={styles.legendSection}>
          <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>
            {t("toothMap.problemTypes") || "Типы проблем"}
          </ThemedText>
          <View style={styles.legendGrid}>
            {PROBLEM_TYPES.map((problem) => {
              const config = PROBLEM_CONFIG[problem];
              return (
                <View key={problem} style={styles.legendGridItem}>
                  <View style={[styles.legendColor, { backgroundColor: config.color + "20" }]}>
                    <AppIcon name={config.icon} size={14} color={config.color} />
                  </View>
                  <ThemedText type="small">{t(config.labelKey)}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.tabsContainer}>
            <Pressable
              onPress={() => setActiveTab("history")}
              style={[
                styles.tabButton,
                activeTab === "history" && { backgroundColor: theme.primary + "15" }
              ]}
            >
              <AppIcon 
                name="clock" 
                size={18} 
                color={activeTab === "history" ? theme.primary : theme.textSecondary} 
              />
              <ThemedText 
                type="body" 
                style={{ 
                  color: activeTab === "history" ? theme.primary : theme.textSecondary,
                  fontWeight: activeTab === "history" ? "600" : "400"
                }}
              >
                {t("toothMap.history") || "История"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("files")}
              style={[
                styles.tabButton,
                activeTab === "files" && { backgroundColor: theme.primary + "15" }
              ]}
            >
              <AppIcon 
                name="folder" 
                size={18} 
                color={activeTab === "files" ? theme.primary : theme.textSecondary} 
              />
              <ThemedText 
                type="body" 
                style={{ 
                  color: activeTab === "files" ? theme.primary : theme.textSecondary,
                  fontWeight: activeTab === "files" ? "600" : "400"
                }}
              >
                {t("toothMap.files") || "Файлы"}
              </ThemedText>
            </Pressable>
          </View>

          {activeTab === "history" ? (
            <View style={styles.tabContent}>
              <Pressable
                onPress={() => setShowAddHistoryModal(true)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { 
                    backgroundColor: theme.primary,
                    opacity: pressed ? 0.7 : 1,
                    marginTop: 0,
                  }
                ]}
              >
                <AppIcon name="plus" size={18} color="#FFF" />
                <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600" }}>
                  {t("toothMap.addRecord") || "Добавить запись"}
                </ThemedText>
              </Pressable>

              {historyData.length === 0 ? (
                <View style={styles.emptyState}>
                  <AppIcon name="clock" size={32} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    {t("toothMap.historyEmpty") || "История пуста"}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    {t("toothMap.historyEmptyDesc") || "События будут появляться здесь по мере использования приложения"}
                  </ThemedText>
                </View>
              ) : (
                groupHistoryByDate(historyData).map(([date, events]) => (
                  <View key={date} style={styles.historyDateGroup}>
                    <ThemedText type="small" style={[styles.historyDate, { color: theme.textSecondary }]}>
                      {date}
                    </ThemedText>
                    {events.map((event) => (
                      <View 
                        key={event.id} 
                        style={[
                          styles.historyItem, 
                          { 
                            backgroundColor: theme.backgroundSecondary,
                            borderLeftColor: (event.eventType === "resolved" || event.eventType === "treated") ? "#4CAF50" :
                                            event.eventType === "problem_removed" ? "#9E9E9E" :
                                            event.priority === "urgent" ? "#F44336" : 
                                            event.priority === "soon" ? "#FF9800" : theme.primary
                          }
                        ]}
                      >
                        <View style={styles.historyItemHeader}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                            <View style={[styles.toothBadge, { backgroundColor: theme.primary + "20" }]}>
                              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                                {event.toothId}
                              </ThemedText>
                            </View>
                            {(event.eventType === "resolved" || event.eventType === "treated") ? (
                              <View style={[styles.toothBadge, { backgroundColor: "#4CAF50" + "20" }]}>
                                <ThemedText type="small" style={{ color: "#4CAF50", fontWeight: "600" }}>
                                  {t("toothMap.treated")}
                                </ThemedText>
                              </View>
                            ) : event.eventType === "problem_noted" ? (
                              <View style={[styles.toothBadge, { backgroundColor: theme.primary + "20" }]}>
                                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                                  {t("toothMap.noted") || "Отмечено"}
                                </ThemedText>
                              </View>
                            ) : event.eventType === "problem_removed" ? (
                              <View style={[styles.toothBadge, { backgroundColor: "#9E9E9E20" }]}>
                                <ThemedText type="small" style={{ color: "#757575", fontWeight: "600" }}>
                                  {t("toothMap.removed") || "Снято"}
                                </ThemedText>
                              </View>
                            ) : null}
                          </View>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {event.source === "ai" ? t("toothMap.ai") : t("toothMap.you")}
                          </ThemedText>
                        </View>
                        <ThemedText type="body" style={{ marginTop: Spacing.xs }}>
                          {event.reason}
                        </ThemedText>
                        {(event.doctorName || event.clinicName || event.treatmentDetails) ? (
                          <View style={{ marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: theme.border }}>
                            {event.doctorName ? (
                              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                                {t("toothMap.doctorName")}: {event.doctorName}
                              </ThemedText>
                            ) : null}
                            {event.clinicName ? (
                              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                                {t("toothMap.clinicName")}: {event.clinicName}
                              </ThemedText>
                            ) : null}
                            {event.treatmentDetails ? (
                              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                                {t("toothMap.treatmentDetails") || "Процедура"}: {event.treatmentDetails}
                              </ThemedText>
                            ) : null}
                          </View>
                        ) : null}
                        <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md }}>
                          <Pressable
                            onPress={() => handleOpenDetails(event)}
                            style={({ pressed }) => [
                              styles.detailsButton,
                              { 
                                backgroundColor: theme.primary + "15",
                                opacity: pressed ? 0.7 : 1,
                                flex: 1,
                                marginTop: 0,
                              }
                            ]}
                          >
                            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                              {t("common.details") || "Подробнее"}
                            </ThemedText>
                            <AppIcon name="chevron-right" size={14} color={theme.primary} />
                          </Pressable>
                          {Platform.OS !== "web" ? (
                            <Pressable
                              onPress={() => {
                                const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                                startDate.setHours(10, 0, 0, 0);
                                const notes = [
                                  event.reason,
                                  event.doctorName ? `${t("toothMap.doctorName")}: ${event.doctorName}` : "",
                                  event.clinicName ? `${t("toothMap.clinicName")}: ${event.clinicName}` : "",
                                ].filter(Boolean).join("\n");
                                addEventToCalendar({
                                  title: `${t("home.teeth")} ${event.toothId}: ${event.reason}`,
                                  notes,
                                  startDate,
                                  location: event.clinicName || undefined,
                                  alarmMinutesBefore: 60,
                                });
                              }}
                              style={({ pressed }) => [
                                styles.detailsButton,
                                {
                                  backgroundColor: theme.primary + "15",
                                  opacity: pressed ? 0.7 : 1,
                                  marginTop: 0,
                                  paddingHorizontal: Spacing.md,
                                }
                              ]}
                            >
                              <AppIcon name="calendar" size={14} color={theme.primary} />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          ) : (
            <View style={styles.tabContent}>
              <View style={[styles.filesInfoBanner, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}>
                <AppIcon name="info" size={16} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, flex: 1 }}>
                  {t("materials.fromChatNote")}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => navigation.navigate("Materials")}
                style={({ pressed }) => [
                  styles.materialsNavButton,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <AppIcon name="folder" size={18} color={theme.primary} />
                <ThemedText type="body" style={{ color: theme.primary, flex: 1 }}>
                  {t("toothMap.openAllMaterials") || "Открыть все материалы"}
                </ThemedText>
                <AppIcon name="chevron-right" size={18} color={theme.primary} />
              </Pressable>

              {filesData.length === 0 ? (
                <View style={styles.emptyState}>
                  <AppIcon name="folder" size={32} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    {t("toothMap.noFiles") || "Нет загруженных файлов"}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    {t("toothMap.filesEmptyDesc") || "Отправьте снимок в ИИ-чате — он появится здесь"}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.filesList}>
                  {filesData.map((file) => {
                    const ft = FILE_TYPES[file.fileType] ?? FILE_TYPES.other;
                    return (
                      <Pressable
                        key={file.id}
                        onPress={() => handleOpenFile(file)}
                        style={({ pressed }) => [
                          styles.fileItem,
                          { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 }
                        ]}
                      >
                        <View style={[styles.fileIcon, { backgroundColor: ft.color + "18" }]}>
                          <AppIcon name={ft.icon as any} size={20} color={ft.color} />
                        </View>
                        <View style={styles.fileInfo}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View style={[styles.fileTypeBadge, { backgroundColor: ft.color + "18" }]}>
                              <ThemedText type="small" style={{ color: ft.color, fontWeight: "600", fontSize: 10 }}>
                                {t(ft.labelKey)}
                              </ThemedText>
                            </View>
                          </View>
                          <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "500" }}>
                            {file.fileName}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {formatDate(file.createdAt as unknown as string)}{file.fileSize ? `  ·  ${formatFileSize(file.fileSize ?? undefined)}` : ""}
                          </ThemedText>
                        </View>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                              t("toothMap.deleteFile"),
                              file.fileName,
                              [
                                { text: t("common.cancel"), style: "cancel" },
                                { text: t("common.delete"), style: "destructive", onPress: () => deleteFile(file.id) }
                              ]
                            );
                          }}
                          style={styles.deleteFileButton}
                          hitSlop={8}
                        >
                          <AppIcon name="trash-2" size={18} color={theme.textSecondary} />
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">{t("toothMap.addRecord") || "Новая запись"}</ThemedText>
              <Pressable onPress={() => setShowAddHistoryModal(false)} style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}>
                <AppIcon name="x" size={20} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                  {t("toothMap.toothNumber") || "Номер зуба (FDI)"}
                </ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={newHistoryToothId}
                  onChangeText={setNewHistoryToothId}
                  placeholder={t("toothMap.toothNumberPlaceholder")}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                  {t("toothMap.eventType") || "Тип события"}
                </ThemedText>
                <View style={styles.eventTypeButtons}>
                  {([
                    { value: "treatment", label: t("toothMap.treatment") },
                    { value: "resolved", label: t("toothMap.treated") },
                    { value: "note", label: t("toothMap.note") },
                  ] as const).map((type) => (
                    <Pressable
                      key={type.value}
                      onPress={() => setNewHistoryEventType(type.value)}
                      style={[
                        styles.eventTypeButton,
                        { 
                          backgroundColor: newHistoryEventType === type.value ? theme.primary : theme.backgroundSecondary,
                          borderColor: newHistoryEventType === type.value ? theme.primary : theme.border,
                        }
                      ]}
                    >
                      <ThemedText 
                        type="small" 
                        style={{ 
                          color: newHistoryEventType === type.value ? "#FFF" : theme.text,
                          fontWeight: "600"
                        }}
                      >
                        {type.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                  {t("common.description")}
                </ThemedText>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={newHistoryReason}
                  onChangeText={setNewHistoryReason}
                  placeholder={t("toothMap.toothNote")}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <Pressable
                onPress={handleAddHistory}
                disabled={isCreatingHistory}
                style={({ pressed }) => [
                  styles.modalButton,
                  { 
                    backgroundColor: theme.primary,
                    opacity: pressed || isCreatingHistory ? 0.7 : 1
                  }
                ]}
              >
                <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600" }}>
                  {isCreatingHistory ? t("common.saving") : t("common.save")}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">{t("common.details") || "Детали визита"}</ThemedText>
              <Pressable onPress={() => setShowDetailsModal(false)} style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}>
                <AppIcon name="x" size={20} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {selectedHistoryEvent ? (
                <View style={[styles.historyItem, { backgroundColor: theme.backgroundSecondary, borderLeftColor: theme.primary, marginBottom: Spacing.lg }]}>
                  <View style={styles.historyItemHeader}>
                    <View style={[styles.toothBadge, { backgroundColor: theme.primary + "20" }]}>
                      <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                        {selectedHistoryEvent.toothId}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText type="body" style={{ marginTop: Spacing.xs }}>
                    {selectedHistoryEvent.reason}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                  {t("toothMap.doctorName") || "Врач"}
                </ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={detailsDoctorName}
                  onChangeText={setDetailsDoctorName}
                  placeholder={t("toothMap.doctorName")}
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                  {t("toothMap.clinicName") || "Клиника"}
                </ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={detailsClinicName}
                  onChangeText={setDetailsClinicName}
                  placeholder={t("toothMap.clinicName")}
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                  {t("toothMap.treatmentDetails") || "Что было сделано"}
                </ThemedText>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={detailsTreatment}
                  onChangeText={setDetailsTreatment}
                  placeholder={t("toothMap.procedureDesc")}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <Pressable
                onPress={handleSaveDetails}
                disabled={isUpdatingHistory}
                style={({ pressed }) => [
                  styles.modalButton,
                  { 
                    backgroundColor: theme.primary,
                    opacity: pressed || isUpdatingHistory ? 0.7 : 1
                  }
                ]}
              >
                <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600" }}>
                  {isUpdatingHistory ? t("toothMap.saving") : t("common.save")}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  archContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  archLabel: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: 10,
    fontWeight: "500",
  },
  archWrapper: {
    position: "relative",
  },
  toothNumbers: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toothNumberButton: {
    position: "absolute",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  toothNumber: {
    fontSize: 10,
    fontWeight: "500",
  },
  archSeparator: {
    width: "100%",
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  separatorLine: {
    width: "60%",
    height: 2,
    borderRadius: 1,
  },
  problemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  problemButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  treatedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  healedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
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
  hintIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  hintContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
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
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 48,
    marginHorizontal: Spacing.lg,
  },
  legendSection: {
    padding: Spacing.lg,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  legendGridItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    width: "45%",
  },
  legendColor: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  customNoteSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  noteInputContainer: {
    marginTop: Spacing.md,
  },
  noteInput: {
    minHeight: 100,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  saveNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    alignSelf: "flex-start",
  },
  tabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  tabContent: {
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  historyDateGroup: {
    gap: Spacing.sm,
  },
  historyDate: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
    marginTop: Spacing.md,
  },
  historyItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toothBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  filesInfoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  materialsNavButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fileTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  filesList: {
    gap: Spacing.sm,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: {
    flex: 1,
    gap: 2,
  },
  deleteFileButton: {
    padding: Spacing.sm,
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  eventTypeButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  eventTypeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
