import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
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
  Animated,
  Text,
  Keyboard,
  AppState,
} from "react-native";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/Icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
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

interface ChatPayload {
  message: string;
  userId?: string;
  files?: Array<{ name: string; mimeType: string; base64Data: string; size?: number }>;
}

interface ChatHistoryMessage {
  id: number;
  role: string;
  content: string;
  createdAt: string;
  metadata?: { files?: Array<{ name?: string; fileName?: string }> } | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachedFiles?: AttachedFile[];
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "aiChat.greeting",
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
          title: `Зуб ${update.tooth_id}: ${update.reason || t("aiChat.checkTag")}`,
          priority: update.priority || "routine",
          relatedTeeth: [String(update.tooth_id)],
        });
      }
    }

    if (safety?.needs_urgent_care) {
      await alertsRepo.createAlert({
        userId,
        type: "urgent",
        title: t("aiChat.urgentTag"),
        description: safety.urgent_reason || t("aiChat.urgentAdvice"),
        priority: "urgent",
        relatedTeeth: [],
      });
    }
  } catch (err) {
    console.error("Error processing state updates:", err);
  }
}

export default function AIChatScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const keyboardBottom = useRef(new Animated.Value(0)).current;
  const keyboardPaddingBottom = keyboardBottom.interpolate({
    inputRange: [0, 1],
    outputRange: [tabBarHeight + Spacing.md, Spacing.md],
    extrapolate: "clamp",
  });

  const [messages, setMessages] = useState<Message[]>([
    { ...WELCOME_MESSAGE, content: t(WELCOME_MESSAGE.content) }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStartingNewDialog, setIsStartingNewDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isPickingFile, setIsPickingFile] = useState(false);

  const [usage, setUsage] = useState<{
    messages: { used: number; limit: number };
    files: { used: number; limit: number };
  } | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  const openSearch = useCallback(() => {
    setIsSearching(true);
    Animated.timing(searchBarAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
    }).start(() => searchInputRef.current?.focus());
  }, [searchBarAnim]);

  const closeSearch = useCallback((targetId?: string) => {
    setSearchQuery("");
    if (targetId) setJumpToMessageId(targetId);
    Animated.timing(searchBarAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => setIsSearching(false));
  }, [searchBarAnim]);

  const handleNewDialog = useCallback(async () => {
    if (!user?.id || isStartingNewDialog) return;
    setIsStartingNewDialog(true);
    try {
      await apiRequest("POST", new URL(`/api/chat/session/${user.id}`, getApiUrl()).toString());
      setMessages([{ ...WELCOME_MESSAGE, content: t(WELCOME_MESSAGE.content) }]);
    } catch (e) {
      console.error("Error starting new dialog:", e);
    } finally {
      setIsStartingNewDialog(false);
    }
  }, [user?.id, isStartingNewDialog, t]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginRight: 12 }}>
          <Pressable
            onPress={isSearching ? () => closeSearch() : openSearch}
            hitSlop={8}
          >
            <AppIcon name={isSearching ? "x" : "search"} size={22} color={theme.primary} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, isSearching, openSearch, closeSearch, theme.primary, handleNewDialog, isStartingNewDialog]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const hasQuery = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!jumpToMessageId || isSearching) return;
    const item = messages.find((m) => m.id === jumpToMessageId);
    if (!item) { setJumpToMessageId(null); return; }
    const timer = setTimeout(() => {
      try {
        flatListRef.current?.scrollToItem({ item, animated: true, viewPosition: 0.4 });
      } catch {}
      setHighlightedMessageId(jumpToMessageId);
      setJumpToMessageId(null);
      highlightAnim.setValue(1);
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 1400,
        delay: 400,
        useNativeDriver: false,
      }).start(() => setHighlightedMessageId(null));
    }, 120);
    return () => clearTimeout(timer);
  }, [jumpToMessageId, isSearching, messages, highlightAnim]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUsage = async () => {
      try {
        const res = await apiRequest("GET", `${getApiUrl()}/api/usage?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setUsage(data);
        }
      } catch {}
    };
    fetchUsage();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const res = await apiRequest("GET", `${getApiUrl()}/api/chat/history/${user.id}`);
        if (res.ok) {
          const data: ChatHistoryMessage[] = await res.json();
          if (data.length > 0) {
            const loaded: Message[] = data.map((m) => ({
              id: String(m.id),
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: m.createdAt,
              attachedFiles: Array.isArray(m.metadata?.files)
                ? m.metadata.files.map((f) => ({ name: f.name || f.fileName || "" }))
                : undefined,
            }));
            setMessages([{ ...WELCOME_MESSAGE, content: t(WELCOME_MESSAGE.content) }, ...loaded]);
          }
        }
      } catch (e) {
        console.error("Error loading chat history from server:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: any) => {
      Animated.timing(keyboardBottom, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? e.duration ?? 250 : 200,
        useNativeDriver: false,
      }).start();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const onHide = (e: any) => {
      Animated.timing(keyboardBottom, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration ?? 250 : 200,
        useNativeDriver: false,
      }).start();
    };
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, [tabBarHeight]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        keyboardBottom.setValue(0);
      }
    });
    return () => sub.remove();
  }, []);

  const chatMutation = useMutation({
    mutationFn: async ({ text, files }: { text: string; files: PendingFile[] }) => {
      const payload: ChatPayload = {
        message: text,
        userId: user?.id,
      };

      if (files.length > 0) {
        payload.files = files.map((f) => ({
          name: f.name,
          mimeType: f.mimeType,
          base64Data: f.base64Data,
          size: f.size,
        }));
      }

      let response: Response;
      try {
        response = await apiRequest("POST", new URL("/api/chat", getApiUrl()).toString(), payload);
      } catch (err: any) {
        const msg: string = err?.message || "";
        if (msg.startsWith("429:")) {
          const jsonMatch = msg.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const errData = JSON.parse(jsonMatch[0]);
              throw Object.assign(new Error("daily_limit_reached"), { limitData: errData });
            } catch (parseErr: any) {
              if (parseErr?.limitData) throw parseErr;
            }
          }
        }
        throw err;
      }
      return response.json();
    },
    onSuccess: async (data, variables) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response || t("aiChat.errorResponse"),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      setUsage((prev) => prev ? { ...prev, messages: { ...prev.messages, used: prev.messages.used + 1 } } : prev);
      if (variables.files.length > 0) {
        setUsage((prev) => prev ? { ...prev, files: { ...prev.files, used: prev.files.used + 1 } } : prev);
      }

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
    onError: (error: any) => {
      if (error?.limitData?.error === "daily_limit_reached") {
        const ld = error.limitData;
        const isFiles = ld.reason === "files";
        const limitMsg = isFiles
          ? t("aiChat.fileLimitReached", { limit: ld.limit })
          : t("aiChat.messageLimitReached", { limit: ld.limit });
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: limitMsg,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: t("aiChat.errorGeneral"),
          timestamp: new Date().toISOString(),
        },
      ]);
    },
  });

  const handlePickFile = useCallback(async () => {
    if (pendingFiles.length >= 5) {
      Alert.alert(t("aiChat.fileLimit"), t("aiChat.fileLimitMsg"));
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
          t("aiChat.unsupportedFormat"),
          t("aiChat.supportedFormats"),
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
      Alert.alert(t("common.error"), t("aiChat.attachFailed"));
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

    const displayText = text || (pendingFiles.length > 0 ? t("aiChat.analyzeFiles") : "");

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

  const renderHighlightedText = useCallback(
    (text: string, isUser: boolean) => {
      if (!searchQuery.trim()) {
        return (
          <ThemedText style={[styles.messageText, isUser && { color: "#FFFFFF" }]}>
            {text}
          </ThemedText>
        );
      }
      const q = searchQuery.toLowerCase();
      const parts: { text: string; match: boolean }[] = [];
      let remaining = text;
      let lowerRemaining = remaining.toLowerCase();
      while (true) {
        const idx = lowerRemaining.indexOf(q);
        if (idx === -1) {
          parts.push({ text: remaining, match: false });
          break;
        }
        if (idx > 0) parts.push({ text: remaining.slice(0, idx), match: false });
        parts.push({ text: remaining.slice(idx, idx + q.length), match: true });
        remaining = remaining.slice(idx + q.length);
        lowerRemaining = remaining.toLowerCase();
      }
      return (
        <Text style={[styles.messageText, isUser && { color: "#FFFFFF" }]}>
          {parts.map((part, i) =>
            part.match ? (
              <Text
                key={i}
                style={[
                  styles.highlight,
                  isUser
                    ? { backgroundColor: "rgba(255,255,255,0.35)", color: "#FFFFFF" }
                    : { backgroundColor: "#FFD700", color: "#333333" },
                ]}
              >
                {part.text}
              </Text>
            ) : (
              <Text key={i} style={isUser ? { color: "#FFFFFF" } : {}}>
                {part.text}
              </Text>
            )
          )}
        </Text>
      );
    },
    [searchQuery, theme],
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      const isFlashed = item.id === highlightedMessageId;

      const flashBg = isFlashed
        ? highlightAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ["rgba(74,144,217,0)", "rgba(74,144,217,0.18)"],
          })
        : "transparent";

      const inner = (
        <>
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
              {renderHighlightedText(item.content, isUser)}
            </View>
          </View>
        </>
      );

      return (
        <Animated.View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
            { backgroundColor: flashBg, borderRadius: BorderRadius.md },
          ]}
        >
          {hasQuery ? (
            <Pressable
              style={[
                styles.messageInner,
                isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
              ]}
              onPress={() => closeSearch(item.id)}
            >
              {inner}
            </Pressable>
          ) : (
            inner
          )}
        </Animated.View>
      );
    },
    [theme, renderHighlightedText, hasQuery, highlightedMessageId, highlightAnim, closeSearch],
  );

  const canSend = (inputText.trim().length > 0 || pendingFiles.length > 0) && !chatMutation.isPending;

  const searchBarHeight = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });
  const searchBarOpacity = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const resultCount = hasQuery ? filteredMessages.length : 0;

  return (
    <ThemedView style={styles.container}>
      <Animated.View
        style={[
          styles.searchBar,
          {
            height: searchBarHeight,
            opacity: searchBarOpacity,
            top: 0,
            backgroundColor: theme.backgroundDefault,
            borderBottomColor: theme.border,
          },
        ]}
        pointerEvents={isSearching ? "auto" : "none"}
      >
        <View style={[styles.searchInputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <AppIcon name="search" size={20} color={theme.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t("aiChat.searchPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {hasQuery && (
            <ThemedText style={[styles.searchCount, { color: theme.textSecondary }]}>
              {resultCount > 0 ? `${resultCount}` : "0"}
            </ThemedText>
          )}
          <Pressable onPress={() => closeSearch()} hitSlop={8}>
            <AppIcon name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: isSearching ? 52 + Spacing.sm : Spacing.sm,
            paddingBottom: tabBarHeight + 100,
          },
        ]}
        onContentSizeChange={() => {
          if (!hasQuery) flatListRef.current?.scrollToEnd({ animated: true });
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          hasQuery ? (
            <View style={styles.emptySearch}>
              <AppIcon name="search" size={32} color={theme.textSecondary} />
              <ThemedText style={[styles.emptySearchText, { color: theme.textSecondary }]}>
                {t("common.noResults") || "Ничего не найдено"}
              </ThemedText>
            </View>
          ) : null
        }
      />

      <Animated.View
        style={[
          styles.inputContainer,
          {
            bottom: keyboardBottom,
            paddingBottom: keyboardPaddingBottom,
            backgroundColor: theme.backgroundDefault,
            borderTopColor: theme.border,
          },
        ]}
      >
        {usage && (
          <View style={styles.usageRow}>
            <ThemedText style={[styles.usageText, { color: theme.textSecondary }]}>
              {t("aiChat.usageCounter", {
                msgUsed: usage.messages.used,
                msgLimit: usage.messages.limit,
                fileUsed: usage.files.used,
                fileLimit: usage.files.limit,
              })}
            </ThemedText>
          </View>
        )}

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
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary + "66" },
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
            placeholder={t("aiChat.inputPlaceholder")}
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
      </Animated.View>
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
  usageRow: { paddingBottom: 4 },
  usageText: { fontSize: 11 },
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
    alignItems: "center",
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 0,
    paddingHorizontal: Spacing.sm,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  messageInner: {
    flexDirection: "row",
    flex: 1,
    alignItems: "flex-end",
  },
  searchBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
    overflow: "hidden",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchCount: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 20,
    textAlign: "center",
  },
  searchFab: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  highlight: {
    fontWeight: "700",
    borderRadius: 3,
  },
  emptySearch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingTop: 80,
  },
  emptySearchText: {
    fontSize: 15,
  },
});
