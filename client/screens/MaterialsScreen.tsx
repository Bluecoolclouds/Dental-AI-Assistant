import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import AppIcon from "@/components/Icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import * as filesRepo from "@/storage/repositories/toothFilesRepository";
import type { ToothFile } from "@/storage/repositories/toothFilesRepository";

const FILE_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  ct:       { label: "КТ",        icon: "layers",      color: "#8B5CF6" },
  xray:     { label: "Рентген",   icon: "aperture",    color: "#3B82F6" },
  photo:    { label: "Фото",      icon: "image",       color: "#10B981" },
  document: { label: "Документ",  icon: "file-text",   color: "#F59E0B" },
  other:    { label: "Другое",    icon: "paperclip",   color: "#6B7280" },
};

function formatSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function MaterialsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const insets = useSafeAreaInsets();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [files, setFiles] = useState<ToothFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await filesRepo.getAllToothFiles(user.id);
      setFiles(data);
    } catch (err) {
      console.error("Error loading files:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleOpenFile = async (file: ToothFile) => {
    try {
      const docDir = FileSystem.documentDirectory || "";
      const isLocalFile = file.fileUrl.startsWith(docDir) || file.fileUrl.startsWith("file://");
      if (isLocalFile) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.fileUrl);
        } else {
          Alert.alert("Недоступно", "Открытие файлов не поддерживается на этом устройстве.");
        }
        return;
      }
      Alert.alert("Файл из чата", "Этот файл был добавлен через ИИ-чат.");
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть файл");
    }
  };

  const handleDelete = (file: ToothFile) => {
    Alert.alert("Удалить файл?", file.fileName, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            const docDir = FileSystem.documentDirectory || "";
            const isLocalFile = file.fileUrl.startsWith(docDir) || file.fileUrl.startsWith("file://");
            if (isLocalFile) {
              const info = await FileSystem.getInfoAsync(file.fileUrl);
              if (info.exists) {
                await FileSystem.deleteAsync(file.fileUrl, { idempotent: true });
              }
            }
            await filesRepo.deleteToothFile(file.id);
            await loadFiles();
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Ошибка", "Не удалось удалить файл");
          }
        },
      },
    ]);
  };

  const filteredFiles = selectedType ? files.filter((f) => f.fileType === selectedType) : files;
  const groupedFiles = Object.entries(FILE_TYPES).map(([type, info]) => ({
    type,
    info,
    files: filteredFiles.filter((f) => f.fileType === type),
  })).filter((g) => g.files.length > 0);

  const typeKeys = Object.keys(FILE_TYPES);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing["3xl"] }]}
      >
        <View style={[styles.infoBanner, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}>
          <AppIcon name="info" size={16} color={theme.primary} />
          <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
            Файлы добавляются через ИИ-чат. Отправьте снимок или документ — он появится здесь.
          </ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <Pressable
            onPress={() => setSelectedType(null)}
            style={[
              styles.filterChip,
              { borderColor: !selectedType ? theme.primary : theme.border },
              !selectedType && { backgroundColor: theme.primary + "15" },
            ]}
          >
            <ThemedText style={[styles.filterChipText, { color: !selectedType ? theme.primary : theme.textSecondary }]}>
              Все
            </ThemedText>
          </Pressable>
          {typeKeys.map((key) => {
            const info = FILE_TYPES[key];
            const active = selectedType === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedType(active ? null : key)}
                style={[
                  styles.filterChip,
                  { borderColor: active ? info.color : theme.border },
                  active && { backgroundColor: info.color + "15" },
                ]}
              >
                <AppIcon name={info.icon as any} size={13} color={active ? info.color : theme.textSecondary} />
                <ThemedText style={[styles.filterChipText, { color: active ? info.color : theme.textSecondary }]}>
                  {info.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing["3xl"] }} />
        ) : groupedFiles.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: theme.primary + "15" }]}>
              <AppIcon name="folder" size={28} color={theme.primary} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>Нет файлов</ThemedText>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Отправьте снимок или документ в ИИ-чат, и они появятся здесь
            </ThemedText>
          </View>
        ) : (
          groupedFiles.map(({ type, info, files: groupFiles }) => (
            <View key={type} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupIconBg, { backgroundColor: info.color + "20" }]}>
                  <AppIcon name={info.icon as any} size={14} color={info.color} />
                </View>
                <ThemedText style={[styles.groupTitle, { color: theme.text }]}>{info.label}</ThemedText>
                <ThemedText style={[styles.groupCount, { color: theme.textSecondary }]}>
                  {groupFiles.length}
                </ThemedText>
              </View>

              {groupFiles.map((file) => (
                <View key={file.id} style={[styles.fileCard, { backgroundColor: theme.backgroundDefault }]}>
                  <Pressable style={styles.fileCardMain} onPress={() => handleOpenFile(file)}>
                    <View style={[styles.fileIconBg, { backgroundColor: info.color + "15" }]}>
                      <AppIcon name={info.icon as any} size={20} color={info.color} />
                    </View>
                    <View style={styles.fileInfo}>
                      <ThemedText style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                        {file.fileName}
                      </ThemedText>
                      <View style={styles.fileMeta}>
                        <ThemedText style={[styles.fileSizeText, { color: theme.textSecondary }]}>
                          {formatDate(file.createdAt)}
                        </ThemedText>
                        {file.fileSize ? (
                          <>
                            <ThemedText style={[styles.fileDot, { color: theme.textSecondary }]}>·</ThemedText>
                            <ThemedText style={[styles.fileSizeText, { color: theme.textSecondary }]}>
                              {formatSize(file.fileSize)}
                            </ThemedText>
                          </>
                        ) : null}
                      </View>
                      {(file.aiDescription || file.description) ? (
                        <ThemedText style={[styles.fileDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                          {file.aiDescription || file.description}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(file)} style={styles.deleteBtn} hitSlop={4}>
                    <AppIcon name="trash-2" size={16} color={theme.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg },

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  filterScroll: { marginBottom: Spacing.lg },
  filterRow: { gap: Spacing.sm, paddingRight: Spacing.lg },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  filterChipText: { fontSize: 13, fontWeight: "500" },

  emptyCard: {
    alignItems: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    marginTop: Spacing.xl,
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
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  group: { marginBottom: Spacing.xl },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  groupIconBg: {
    width: 28, height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  groupCount: { fontSize: 13 },

  fileCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  fileCardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  fileIconBg: {
    width: 44, height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  fileMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  fileSizeText: { fontSize: 12 },
  fileDot: { fontSize: 12 },
  fileDescription: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  deleteBtn: { padding: Spacing.lg, paddingLeft: 0 },
});
