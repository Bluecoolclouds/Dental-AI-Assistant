import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";

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

const MIME_TO_TYPE: Record<string, string> = {
  "image/jpeg": "photo",
  "image/png":  "photo",
  "image/heic": "photo",
  "image/webp": "photo",
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
};

function detectFileType(mimeType?: string, name?: string): string {
  if (mimeType && MIME_TO_TYPE[mimeType]) return MIME_TO_TYPE[mimeType];
  const lower = (name || "").toLowerCase();
  if (lower.includes("кт") || lower.includes("ct") || lower.includes("томо")) return "ct";
  if (lower.includes("рент") || lower.includes("xray") || lower.includes("x-ray")) return "xray";
  if (mimeType?.startsWith("image/")) return "photo";
  if (lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx")) return "document";
  return "other";
}

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

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [fileType, setFileType] = useState("other");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filesQuery = useQuery<ToothFile[]>({
    queryKey: [`/api/tooth-files/${user?.id}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tooth-files/${user?.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tooth-files", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/tooth-files/${user?.id}`] });
      closeAddModal();
    },
    onError: () => Alert.alert("Ошибка", "Не удалось сохранить файл"),
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

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPickedFile(asset);
      setFileType(detectFileType(asset.mimeType ?? undefined, asset.name));
      setAddModalVisible(true);
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть файл");
    }
  };

  const handleSave = () => {
    if (!pickedFile) return;
    createMutation.mutate({
      userId: user?.id,
      fileName: pickedFile.name,
      fileType,
      fileUrl: pickedFile.uri,
      fileSize: pickedFile.size ?? null,
      description: description.trim() || null,
      relatedTeeth: [],
    });
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setPickedFile(null);
    setDescription("");
    setFileType("other");
  };

  const handleOpenFile = async (file: ToothFile) => {
    try {
      const can = await Linking.canOpenURL(file.fileUrl);
      if (can) {
        await Linking.openURL(file.fileUrl);
      } else {
        Alert.alert("Ошибка", "Не удалось открыть файл. Возможно, приложение для этого типа не установлено.");
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
              Добавьте рентгеновские снимки, КТ, фотографии и другие медицинские документы
            </ThemedText>
            <Pressable
              onPress={handlePickFile}
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            >
              <AppIcon name="upload" size={16} color="#FFFFFF" />
              <ThemedText style={styles.emptyButtonText}>Добавить файл</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            {groupedFiles.map(({ type, info, files: groupFiles }) => (
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
            ))}
          </>
        )}
      </ScrollView>

      {files.length > 0 && (
        <Pressable
          onPress={handlePickFile}
          style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + Spacing.xl }]}
        >
          <AppIcon name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeAddModal} />
        <View style={[styles.modalSheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.modalHandle} />
          <ThemedText style={[styles.modalTitle, { color: theme.text }]}>Добавить файл</ThemedText>

          {pickedFile && (
            <View style={[styles.pickedFileCard, { backgroundColor: theme.backgroundSecondary }]}>
              <AppIcon name="file" size={20} color={FILE_TYPES[fileType]?.color || theme.primary} />
              <View style={styles.pickedFileInfo}>
                <ThemedText style={[styles.pickedFileName, { color: theme.text }]} numberOfLines={1}>
                  {pickedFile.name}
                </ThemedText>
                {pickedFile.size ? (
                  <ThemedText style={[styles.pickedFileSize, { color: theme.textSecondary }]}>
                    {formatSize(pickedFile.size)}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          )}

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Тип файла</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            <View style={styles.typeRow}>
              {typeKeys.map((type) => {
                const info = FILE_TYPES[type];
                const active = fileType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setFileType(type)}
                    style={[
                      styles.typeChip,
                      { borderColor: active ? info.color : theme.border },
                      active && { backgroundColor: info.color },
                    ]}
                  >
                    <AppIcon name={info.icon as any} size={13} color={active ? "#FFFFFF" : info.color} />
                    <ThemedText style={[styles.typeChipText, { color: active ? "#FFFFFF" : info.color }]}>
                      {info.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: Spacing.lg }]}>
            Описание (необязательно)
          </ThemedText>
          <TextInput
            style={[styles.descInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            placeholder="Например: Рентген зуба 26, апрель 2025"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />

          <Pressable
            onPress={handleSave}
            disabled={createMutation.isPending || !pickedFile}
            style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: createMutation.isPending ? 0.7 : 1 }]}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.saveBtnText}>Сохранить</ThemedText>
            )}
          </Pressable>
        </View>
      </Modal>
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
          {file.description ? (
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
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
  },
  emptyButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  group: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  groupIconBg: {
    width: 28,
    height: 28,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  fileMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  fileSizeText: { fontSize: 12 },
  fileDot: { fontSize: 12 },
  fileDescription: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  deleteBtn: {
    padding: Spacing.lg,
    paddingLeft: 0,
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
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
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: Spacing.lg },
  pickedFileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  pickedFileInfo: { flex: 1 },
  pickedFileName: { fontSize: 14, fontWeight: "600" },
  pickedFileSize: { fontSize: 12, marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: Spacing.sm },
  typeScroll: { marginBottom: Spacing.sm },
  typeRow: { flexDirection: "row", gap: Spacing.sm },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  typeChipText: { fontSize: 12, fontWeight: "600" },
  descInput: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: "top",
  },
  saveBtn: {
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
