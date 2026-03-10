import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import AppIcon from "@/components/Icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useProfile, useToothData, useTestResults } from "@/hooks/useLocalData";
import * as calendarRepo from "@/storage/repositories/calendarRepository";
import * as filesRepo from "@/storage/repositories/toothFilesRepository";
import * as alertsRepo from "@/storage/repositories/alertsRepository";

interface PendingFile {
  name: string;
  mimeType: string;
  base64Data: string;
  size?: number;
  localUri: string;
}

interface AttachedFile {
  name: string;
  aiDescription?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachedFiles?: AttachedFile[];
}

const CHAT_STORAGE_KEY = "toothy_chat_history";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Здравствуйте! Я ваш виртуальный стоматологический консультант. Задайте мне любой вопрос о здоровье зубов и полости рта. Также вы можете прикрепить снимки, рентген или другие медицинские документы — я их проанализирую.",
  timestamp: new Date().toISOString(),
};

const FILE_ICON: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/heic": "image",
  "image/webp": "image",
  "application/pdf": "file-text",
};

function getFileIcon(mimeType: string): string {
  return FILE_ICON[mimeType] || "paperclip";
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function detectFileType(mimeType: string, name: string): string {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType === "application/pdf") {
    const lower = name.toLowerCase();
    if (lower.includes("кт") || lower.includes("ct") || lower.includes("томо")) return "ct";
    if (lower.includes("рентген") || lower.includes("xray") || lower.includes("рг")) return "xray";
    return "document";
  }
  return "other";
}

async function saveFileLocally(
  userId: string,
  file: PendingFile,
  aiDescription: string | null
): Promise<void> {
  try {
    const docsDir = FileSystem.documentDirectory;
    if (!docsDir) return;

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._\-А-Яа-я]/g, "_");
    const destUri = `${docsDir}tooth_files/${userId}_${Date.now()}_${safeFileName}`;

    const dirInfo = await FileSystem.getInfoAsync(`${docsDir}tooth_files/`);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(`${docsDir}tooth_files/`, { intermediates: true });
    }

    await FileSystem.copyAsync({ from: file.localUri, to: destUri });

    await filesRepo.createToothFile({
      userId,
      fileName: file.name,
      fileType: detectFileType(file.mimeType, file.name),
      fileUrl: destUri,
      fileSize: file.size,
      aiDescription: aiDescription || undefined,
    });
  } catch (err) {
    console.error("Error saving file locally:", err);
  }
}

async function processStateUpdates(
  userId: string,
  stateUpdates: any,
  safety: any
): Promise<void> {
  try {
    if (Array.isArray(stateUpdates?.reminders)) {
      for (const reminder of stateUpdates.reminders) {
        if (!reminder.title) continue;
        await alertsRepo.createAlert({
          userId,
          type: "reminder",
          title: reminder.title,
          description: reminder.description,
          priority: "routine",
          relatedTeeth: reminder.related_teeth || [],
          dueTime: reminder.due_time,
        });
      }
    }

    if (Array.isArray(stateUpdates?.teeth_updates)) {
      for (const update of stateUpdates.teeth_updates) {
        if (!update.tooth_id || !update.mark_for_check) continue;
        await alertsRepo.createAlert({
          userId,
          type: "reminder",
          title: `Зуб ${update.tooth_id}: ${update.reason || "рекомендована проверка"}`,
          priority: update.priority || "routine",
          relatedTeeth: [String(update.tooth_id)],
        });
      }
    }

    if (safety?.needs_urgent_care) {
      await alertsRepo.createAlert({
        userId,
        type: "urgent",
        title: "Требуется срочная консультация",
        description: safety.urgent_reason || "ИИ рекомендует срочно обратиться к врачу",
        priority: "urgent",
        relatedTeeth: [],
      });
    }
  } catch (err) {
    console.error("Error processing state updates:", err);
  }
}

export default function AIChatScreen() {
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const flatListRef = useRef<FlatList>(null);

  const { profile } = useProfile();
  const { toothData } = useToothData();
  const { latestResult: testResult } = useTestResults();

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isPickingFile, setIsPickingFile] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (stored) {
          const parsed: Message[] = JSON.parse(stored);
          if (parsed.length > 0) setMessages([WELCOME_MESSAGE, ...parsed]);
        }
      } catch (e) {
        console.error("Error loading chat history:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const save = async () => {
      try {
        const toSave = messages.filter((m) => m.id !== "welcome");
        await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) {
        console.error("Error saving chat history:", e);
      }
    };
    save();
  }, [messages, isLoaded]);

  const chatMutation = useMutation({
    mutationFn: async ({ text, files }: { text: string; files: PendingFile[] }) => {
      const chatHistory = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const [upcomingEvents, existingFilesList] = await Promise.all([
        user?.id ? calendarRepo.getUpcomingCalendarEvents(user.id) : Promise.resolve([]),
        user?.id ? filesRepo.getAllToothFiles(user.id) : Promise.resolve([]),
      ]);

      const userContext = {
        profile: profile ? {
          age: profile.age,
          brushingFrequency: profile.brushingFrequency,
          usesFloss: profile.usesFloss,
          usesIrrigator: profile.usesIrrigator,
          hasBraces: profile.hasBraces,
          hasSensitivity: profile.hasSensitivity,
          hasGumBleeding: profile.hasGumBleeding,
          hasCrownsVeneers: profile.hasCrownsVeneers,
          hasRemovableDentures: profile.hasRemovableDentures,
          hasImplants: profile.hasImplants,
        } : null,
        toothData: toothData?.map((t) => ({ toothNumber: t.toothNumber, problems: t.problems, notes: t.notes })) || [],
        latestTest: testResult ? {
          teethRiskScore: testResult.teethRiskScore,
          gumsRiskScore: testResult.gumsRiskScore,
          overallRiskLevel: testResult.overallRiskLevel,
        } : null,
        upcomingEvents: upcomingEvents.map((e) => ({
          title: e.title,
          date: e.date,
          time: e.time,
          type: e.type,
          description: e.description,
        })),
        existingFiles: existingFilesList.map((f) => ({
          fileName: f.fileName,
          aiDescription: f.aiDescription || f.description,
          fileType: f.fileType,
        })),
      };

      const payload: any = {
        message: text,
        history: chatHistory,
        userContext,
      };

      if (files.length > 0) {
        payload.files = files.map((f) => ({
          name: f.name,
          mimeType: f.mimeType,
          base64Data: f.base64Data,
          size: f.size,
        }));
      }

      const response = await apiRequest("POST", new URL("/api/chat", getApiUrl()).toString(), payload);
      return response.json();
    },
    onSuccess: async (data, variables) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response || "Извините, не удалось получить ответ.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (user?.id) {
        const savedDescriptions: Record<string, string | null> = {};
        if (Array.isArray(data._savedFiles)) {
          for (const sf of data._savedFiles) {
            savedDescriptions[sf.fileName || sf.file_name] = sf.aiDescription || sf.ai_description || null;
          }
        }

        for (const file of variables.files) {
          const desc = savedDescriptions[file.name] ?? null;
          await saveFileLocally(user.id, file, desc);
        }

        if (data.state_updates || data.safety) {
          await processStateUpdates(user.id, data.state_updates, data.safety);
        }
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Извините, произошла ошибка. Пожалуйста, попробуйте ещё раз.",
          timestamp: new Date().toISOString(),
        },
      ]);
    },
  });

  const handlePickFile = useCallback(async () => {
    if (pendingFiles.length >= 5) {
      Alert.alert("Лимит файлов", "Можно прикрепить не более 5 файлов за раз");
      return;
    }
    setIsPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "application/octet-stream";
      const supported = mimeType.startsWith("image/") || mimeType === "application/pdf";
      if (!supported) {
        Alert.alert(
          "Формат не поддерживается",
          "Для анализа поддерживаются только изображения (JPG, PNG) и PDF-файлы.",
        );
        return;
      }
      const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPendingFiles((prev) => [
        ...prev,
        {
          name: asset.name,
          mimeType,
          base64Data,
          size: asset.size,
          localUri: asset.uri,
        },
      ]);
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось прикрепить файл");
    } finally {
      setIsPickingFile(false);
    }
  }, [pendingFiles.length]);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if ((!text && pendingFiles.length === 0) || chatMutation.isPending) return;

    const displayText = text || (pendingFiles.length > 0 ? "Проанализируй прикреплённые файлы" : "");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayText,
      timestamp: new Date().toISOString(),
      attachedFiles: pendingFiles.map((f) => ({ name: f.name })),
    };

    setMessages((prev) => [...prev, userMessage]);
    const filesToSend = [...pendingFiles];
    setInputText("");
    setPendingFiles([]);
    chatMutation.mutate({ text: displayText, files: filesToSend });
  }, [inputText, pendingFiles, chatMutation]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      return (
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
          ]}
        >
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <AppIcon name="cpu" size={16} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.bubbleColumn}>
            {item.attachedFiles && item.attachedFiles.length > 0 && (
              <View style={styles.attachedFilesRow}>
                {item.attachedFiles.map((f, i) => (
                  <View key={i} style={[styles.attachedChip, { backgroundColor: theme.primary + "22" }]}>
                    <AppIcon name="paperclip" size={12} color={theme.primary} />
                    <ThemedText style={[styles.attachedChipText, { color: theme.primary }]} numberOfLines={1}>
                      {truncate(f.name, 20)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                isUser
                  ? { backgroundColor: theme.primary }
                  : { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText style={[styles.messageText, isUser && { color: "#FFFFFF" }]}>
                {item.content}
              </ThemedText>
            </View>
          </View>
        </View>
      );
    },
    [theme],
  );

  const canSend = (inputText.trim().length > 0 || pendingFiles.length > 0) && !chatMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: tabBarHeight + 100,
          },
        ]}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: tabBarHeight + Spacing.md,
            backgroundColor: theme.backgroundDefault,
            borderTopColor: theme.border,
          },
        ]}
      >
        {pendingFiles.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pendingFilesScroll}
            contentContainerStyle={styles.pendingFilesRow}
          >
            {pendingFiles.map((f, i) => (
              <View key={i} style={[styles.pendingFileChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <AppIcon name={getFileIcon(f.mimeType) as any} size={13} color={theme.primary} />
                <ThemedText style={[styles.pendingFileName, { color: theme.text }]} numberOfLines={1}>
                  {truncate(f.name, 18)}
                </ThemedText>
                <Pressable onPress={() => removePendingFile(i)} hitSlop={8}>
                  <AppIcon name="x" size={13} color={theme.textSecondary} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}

        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={handlePickFile}
            disabled={chatMutation.isPending || isPickingFile}
            style={styles.attachButton}
            hitSlop={6}
          >
            {isPickingFile ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <AppIcon
                name="paperclip"
                size={20}
                color={pendingFiles.length > 0 ? theme.primary : theme.textSecondary}
              />
            )}
          </Pressable>

          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Задайте вопрос или прикрепите файл..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!chatMutation.isPending}
          />
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: canSend ? theme.primary : theme.backgroundTertiary },
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {chatMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <AppIcon name="send" size={18} color={canSend ? "#FFFFFF" : theme.textSecondary} />
            )}
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    alignItems: "flex-end",
  },
  userMessageContainer: { justifyContent: "flex-end" },
  assistantMessageContainer: { justifyContent: "flex-start" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  bubbleColumn: {
    maxWidth: "80%",
    alignItems: "flex-end",
  },
  attachedFilesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
    alignSelf: "flex-end",
  },
  attachedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  attachedChipText: { fontSize: 11, fontWeight: "500" },
  messageBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-end",
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
  },
  pendingFilesScroll: { marginBottom: Spacing.sm },
  pendingFilesRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: 2,
  },
  pendingFileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 180,
  },
  pendingFileName: { fontSize: 12, fontWeight: "500", flex: 1 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: Platform.select({ ios: Spacing.sm, android: Spacing.xs }),
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
