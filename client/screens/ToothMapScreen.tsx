import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, useWindowDimensions, Platform, TextInput, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Svg, { Ellipse, G } from "react-native-svg";
import * as DocumentPicker from "expo-document-picker";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { PROBLEM_TYPES, ProblemType, ToothHistory, ToothFile } from "@shared/schema";

type DataTab = "history" | "files";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const PROBLEM_CONFIG: Record<ProblemType, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  pain: { label: "Боль", icon: "zap", color: "#F44336" },
  chip: { label: "Скол", icon: "slash", color: "#9C27B0" },
  filling: { label: "Пломба", icon: "square", color: "#2196F3" },
  bleeding: { label: "Кровоточ.", icon: "droplet", color: "#E91E63" },
  sensitivity: { label: "Чувствит.", icon: "wind", color: "#FF9800" },
  cavity: { label: "Кариес", icon: "circle", color: "#795548" },
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
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [hasCustomNote, setHasCustomNote] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [activeTab, setActiveTab] = useState<DataTab>("history");

  const { data: toothData = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/tooth-data/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: historyData = [] } = useQuery<ToothHistory[]>({
    queryKey: [`/api/tooth-history/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: filesData = [] } = useQuery<ToothFile[]>({
    queryKey: [`/api/tooth-files/${user?.id}`],
    enabled: !!user?.id,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: { fileName: string; fileType: string; fileUrl: string; fileSize?: number }) => {
      return apiRequest("POST", "/api/tooth-files", { userId: user?.id, ...file });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tooth-files/${user?.id}`] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest("DELETE", `/api/tooth-files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tooth-files/${user?.id}`] });
    },
  });

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const fileType = asset.mimeType?.includes("pdf") ? "document" : 
                         asset.mimeType?.includes("image") ? "photo" : "other";
        
        await uploadFileMutation.mutateAsync({
          fileName: asset.name,
          fileType,
          fileUrl: asset.uri,
          fileSize: asset.size,
        });
      }
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось загрузить файл");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
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

  const saveMutation = useMutation({
    mutationFn: async ({ toothNumber, problems, notes }: { toothNumber: number; problems: string[]; notes?: string }) => {
      return apiRequest("POST", "/api/tooth-data", { userId: user?.id, toothNumber, problems, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tooth-data/${user?.id}`] });
    },
  });

  const getToothProblems = useCallback((toothNumber: number): string[] => {
    const tooth = toothData.find((t: any) => t.toothNumber === toothNumber);
    return (tooth?.problems as string[]) || [];
  }, [toothData]);

  const getToothProblemColor = useCallback((toothNumber: number): string => {
    const problems = getToothProblems(toothNumber);
    if (problems.length === 0) return theme.border;
    const firstProblem = problems[0] as ProblemType;
    return PROBLEM_CONFIG[firstProblem]?.color || theme.border;
  }, [getToothProblems, theme]);

  const handleToothPress = (toothNumber: number) => {
    setSelectedTooth(selectedTooth === toothNumber ? null : toothNumber);
  };

  const handleProblemToggle = async (problem: ProblemType) => {
    if (!selectedTooth) return;

    const currentProblems = getToothProblems(selectedTooth);
    const newProblems = currentProblems.includes(problem)
      ? currentProblems.filter((p) => p !== problem)
      : [...currentProblems, problem];

    const notes = hasCustomNote ? customNote : undefined;
    await saveMutation.mutateAsync({ toothNumber: selectedTooth, problems: newProblems, notes });
  };

  const handleSaveNotes = async () => {
    if (!selectedTooth) return;
    const currentProblems = getToothProblems(selectedTooth);
    const notes = hasCustomNote ? customNote : "";
    await saveMutation.mutateAsync({ toothNumber: selectedTooth, problems: currentProblems, notes });
  };

  const handleToggleCustomNote = async (enabled: boolean) => {
    setHasCustomNote(enabled);
    if (!enabled && selectedTooth) {
      const currentProblems = getToothProblems(selectedTooth);
      await saveMutation.mutateAsync({ toothNumber: selectedTooth, problems: currentProblems, notes: "" });
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
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          }
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h3" style={styles.cardTitle}>Ваша карта зубов</ThemedText>
          
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Было лечение
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#2196F3" }]} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Требует внимания
              </ThemedText>
            </View>
          </View>

          <View style={styles.archContainer}>
            <ThemedText type="small" style={[styles.archLabel, { color: theme.textSecondary }]}>
              Верхняя челюсть
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
              Нижняя челюсть
            </ThemedText>
          </View>
        </View>

        {selectedTooth ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText type="h4">Зуб {selectedTooth % 10}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Позиция: {selectedTooth}
                </ThemedText>
              </View>
              <Pressable 
                onPress={() => setSelectedTooth(null)}
                style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              Отметьте проблемы:
            </ThemedText>

            <View style={styles.problemsGrid}>
              {PROBLEM_TYPES.map((problem) => {
                const config = PROBLEM_CONFIG[problem];
                const isActive = getToothProblems(selectedTooth).includes(problem);
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
                    <Feather name={config.icon} size={18} color={isActive ? config.color : theme.textSecondary} />
                    <ThemedText
                      type="small"
                      style={{ color: isActive ? config.color : theme.text }}
                    >
                      {config.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

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
                    <Feather name="check" size={14} color="#FFF" />
                  ) : null}
                </View>
                <ThemedText type="body" style={{ flex: 1 }}>
                  Описать проблему своими словами
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
                    placeholder="Опишите что беспокоит, когда началось, как проявляется..."
                    placeholderTextColor={theme.textSecondary}
                    value={customNote}
                    onChangeText={setCustomNote}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Pressable
                    onPress={handleSaveNotes}
                    disabled={saveMutation.isPending}
                    style={({ pressed }) => [
                      styles.saveNoteButton,
                      {
                        backgroundColor: theme.primary,
                        opacity: pressed || saveMutation.isPending ? 0.7 : 1,
                      }
                    ]}
                  >
                    <Feather name="save" size={16} color="#FFF" />
                    <ThemedText type="small" style={{ color: "#FFF", fontWeight: "600" }}>
                      Сохранить
                    </ThemedText>
                  </Pressable>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Эта информация будет использоваться ИИ-консультантом
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {saveMutation.isPending ? (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Сохранение...
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.hintCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.hintIcon, { backgroundColor: theme.primary + "15" }]}>
              <Feather name="info" size={20} color={theme.primary} />
            </View>
            <View style={styles.hintContent}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>Как использовать</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Нажмите на зуб, чтобы добавить или отметить проблему
              </ThemedText>
            </View>
          </View>
        )}

        <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.primary }}>{treatedCount}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Зубов отмечено</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.warning }}>{totalProblems}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Всего проблем</ThemedText>
          </View>
        </View>

        <View style={styles.legendSection}>
          <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>
            Типы проблем
          </ThemedText>
          <View style={styles.legendGrid}>
            {PROBLEM_TYPES.map((problem) => {
              const config = PROBLEM_CONFIG[problem];
              return (
                <View key={problem} style={styles.legendGridItem}>
                  <View style={[styles.legendColor, { backgroundColor: config.color + "20" }]}>
                    <Feather name={config.icon} size={14} color={config.color} />
                  </View>
                  <ThemedText type="small">{config.label}</ThemedText>
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
              <Feather 
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
                История
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("files")}
              style={[
                styles.tabButton,
                activeTab === "files" && { backgroundColor: theme.primary + "15" }
              ]}
            >
              <Feather 
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
                Файлы
              </ThemedText>
            </Pressable>
          </View>

          {activeTab === "history" ? (
            <View style={styles.tabContent}>
              {historyData.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="clock" size={32} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    История пуста
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    События будут появляться здесь по мере использования приложения
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
                            borderLeftColor: event.priority === "urgent" ? "#F44336" : 
                                            event.priority === "soon" ? "#FF9800" : theme.primary
                          }
                        ]}
                      >
                        <View style={styles.historyItemHeader}>
                          <View style={[styles.toothBadge, { backgroundColor: theme.primary + "20" }]}>
                            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                              {event.toothId}
                            </ThemedText>
                          </View>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {event.source === "ai" ? "ИИ" : "Вы"}
                          </ThemedText>
                        </View>
                        <ThemedText type="body" style={{ marginTop: Spacing.xs }}>
                          {event.reason}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          ) : (
            <View style={styles.tabContent}>
              <Pressable
                onPress={handlePickDocument}
                disabled={uploadFileMutation.isPending}
                style={({ pressed }) => [
                  styles.uploadButton,
                  { 
                    backgroundColor: theme.primary,
                    opacity: pressed || uploadFileMutation.isPending ? 0.7 : 1
                  }
                ]}
              >
                <Feather name="upload" size={18} color="#FFF" />
                <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600" }}>
                  {uploadFileMutation.isPending ? "Загрузка..." : "Загрузить файл"}
                </ThemedText>
              </Pressable>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
                КТ-снимки, рентген, фото зубов, документы
              </ThemedText>

              {filesData.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="folder" size={32} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    Нет загруженных файлов
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.filesList}>
                  {filesData.map((file) => (
                    <View 
                      key={file.id} 
                      style={[styles.fileItem, { backgroundColor: theme.backgroundSecondary }]}
                    >
                      <View style={[styles.fileIcon, { backgroundColor: theme.primary + "15" }]}>
                        <Feather 
                          name={file.fileType === "document" ? "file-text" : "image"} 
                          size={20} 
                          color={theme.primary} 
                        />
                      </View>
                      <View style={styles.fileInfo}>
                        <ThemedText type="body" numberOfLines={1}>
                          {file.fileName}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {formatDate(file.createdAt as unknown as string)} {formatFileSize(file.fileSize ?? undefined)}
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Удалить файл?",
                            file.fileName,
                            [
                              { text: "Отмена", style: "cancel" },
                              { 
                                text: "Удалить", 
                                style: "destructive",
                                onPress: () => deleteFileMutation.mutate(file.id)
                              }
                            ]
                          );
                        }}
                        style={styles.deleteFileButton}
                      >
                        <Feather name="trash-2" size={18} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
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
    padding: Spacing.xl,
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
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
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
});
