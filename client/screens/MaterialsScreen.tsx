import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import AppIcon from "@/components/Icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ToothFile } from "@shared/schema";

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
  const navigation = useNavigation();
  const qc = useQueryClient();

  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filesQuery = useQuery<ToothFile[]>({
    queryKey: [`/api/tooth-files/${user?.id}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tooth-files/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tooth-files/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/tooth-files/${user?.id}`] });
    },
  });

  const files = filesQuery.data || [];
  const filteredFiles = selectedType ? files.filter((f) => f.fileType === selectedType) : files;
  const groupedFiles = Object.entries(FILE_TYPES).map(([type, info]) => ({
    type,
    info,
    files: filteredFiles.filter((f) => f.fileType === type),
  })).filter((g) => g.files.length > 0);

  const handleOpenFile = async (file: ToothFile) => {
    try {
      if (file.fileUrl.startsWith("chat-upload://")) {
        Alert.alert("Файл загружен через чат", "Этот файл был загружен через AI-чат и хранится на сервере.");
        return;
      }
      const can = await Linking.canOpenURL(file.fileUrl);
      if (can) {
        await Linking.openURL(file.fileUrl);
      } else {
        Alert.alert("Ошибка", "Не удалось открыть файл.");
      }
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть файл");
    }
  };

  const handleDelete = (file: ToothFile) => {
    Alert.alert("Удалить файл?", file.fileName, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => deleteMutation.mutate(file.id) },
    ]);
  };

  const typeKeys = Object.keys(FILE_TYPES);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing["3xl"] }]}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}>
          <AppIcon name="cpu" size={18} color={theme.primary} />
          <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
            Файлы добавляются через AI-чат — прикрепите снимок или документ прямо в диалоге, и я сохраню его здесь.
          </ThemedText>
        </View>

        {/* Type filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setSelectedType(null)}
            style={[
              styles.filterChip,
              { borderColor: theme.border },
              selectedType === null && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
          >
            <ThemedText style={[styles.filterChipText, { color: selectedType === null ? "#FFFFFF" : theme.textSecondary }]}>
              Все
            </ThemedText>
          </Pressable>
          {typeKeys.map((type) => {
            const info = FILE_TYPES[type];
            const active = selectedType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setSelectedType(active ? null : type)}
                style={[
                  styles.filterChip,
                  { borderColor: active ? info.color : theme.border },
                  active && { backgroundColor: info.color },
                ]}
              >
                <AppIcon name={info.icon as any} size={13} color={active ? "#FFFFFF" : info.color} />
                <ThemedText style={[styles.filterChipText, { color: active ? "#FFFFFF" : theme.textSecondary }]}>
                  {info.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {filesQuery.isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing["3xl"] }} />
        ) : files.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: theme.primary + "15" }]}>
              <AppIcon name="folder" size={40} color={theme.primary} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>Нет материалов</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Прикрепите рентгеновский снимок, КТ, фото или другой документ в AI-чате — они появятся здесь
            </ThemedText>
          </View>
        ) : (
          groupedFiles.map(({ type, info, files: groupFiles }) => (
            <View key={type} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupIconBg, { backgroundColor: info.color + "18" }]}>
                  <AppIcon name={info.icon as any} size={16} color={info.color} />
                </View>
                <ThemedText style={[styles.groupTitle, { color: theme.text }]}>{info.label}</ThemedText>
                <ThemedText style={[styles.groupCount, { color: theme.textSecondary }]}>{groupFiles.length}</ThemedText>
              </View>

              {groupFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  info={info}
                  theme={theme}
                  onOpen={() => handleOpenFile(file)}
                  onDelete={() => handleDelete(file)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function FileCard({
  file,
  info,
  theme,
  onOpen,
  onDelete,
}: {
  file: ToothFile;
  info: { label: string; icon: string; color: string };
  theme: any;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const isChat = file.fileUrl.startsWith("chat-upload://");

  return (
    <View style={[styles.fileCard, { backgroundColor: theme.background }]}>
      <Pressable style={styles.fileCardMain} onPress={onOpen}>
        <View style={[styles.fileIconBg, { backgroundColor: info.color + "18" }]}>
          <AppIcon name={info.icon as any} size={22} color={info.color} />
        </View>
        <View style={styles.fileInfo}>
          <ThemedText style={[styles.fileName, { color: theme.text }]} numberOfLines={2}>
            {file.fileName}
          </ThemedText>
          <View style={styles.fileMeta}>
            {isChat && (
              <View style={[styles.chatBadge, { backgroundColor: theme.primary + "18" }]}>
                <AppIcon name="cpu" size={10} color={theme.primary} />
                <ThemedText style={[styles.chatBadgeText, { color: theme.primary }]}>Чат</ThemedText>
              </View>
            )}
            {file.fileSize ? (
              <ThemedText style={[styles.fileSizeText, { color: theme.textSecondary }]}>
                {formatSize(file.fileSize)}
              </ThemedText>
            ) : null}
            {file.fileSize ? (
              <ThemedText style={[styles.fileDot, { color: theme.textSecondary }]}>·</ThemedText>
            ) : null}
            <ThemedText style={[styles.fileSizeText, { color: theme.textSecondary }]}>
              {formatDate(file.createdAt.toString())}
            </ThemedText>
          </View>
          {(file as any).aiDescription ? (
            <ThemedText style={[styles.fileDescription, { color: theme.textSecondary }]} numberOfLines={3}>
              {(file as any).aiDescription}
            </ThemedText>
          ) : file.description ? (
            <ThemedText style={[styles.fileDescription, { color: theme.textSecondary }]} numberOfLines={2}>
              {file.description}
            </ThemedText>
          ) : null}
        </View>
        <AppIcon name="external-link" size={16} color={theme.textSecondary} />
      </Pressable>
      <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
        <AppIcon name="trash-2" size={16} color={theme.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: Spacing.lg },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, lineHeight: 18, flex: 1 },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
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
  emptyState: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing["3xl"],
    alignItems: "center",
    gap: Spacing.lg,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  group: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
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
  chatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chatBadgeText: { fontSize: 10, fontWeight: "600" },
  fileSizeText: { fontSize: 12 },
  fileDot: { fontSize: 12 },
  fileDescription: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  deleteBtn: { padding: Spacing.lg, paddingLeft: 0 },
});
