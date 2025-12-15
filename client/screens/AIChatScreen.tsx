import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToothData } from "@/hooks/useLocalData";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { createAlert, getActiveAlerts } from "@/storage/repositories/alertsRepository";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  isAlert?: boolean;
}

const PROBLEM_LABELS: Record<string, string> = {
  cavity: "кариес",
  filling: "пломба",
  crown: "коронка",
  implant: "имплант",
  missing: "отсутствует",
  root_canal: "удаление нерва",
  sensitivity: "чувствительность",
  gum_issue: "проблемы с деснами",
  pain: "боль",
  crack: "трещина",
};

const LAST_REMINDER_KEY = "toothy_last_reminder";

const CHAT_STORAGE_KEY = "toothy_chat_history";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Здравствуйте! Я ваш виртуальный стоматологический консультант. Задайте мне любой вопрос о здоровье зубов и полости рта, и я постараюсь помочь.",
  timestamp: new Date().toISOString(),
};

export default function AIChatScreen() {
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const flatListRef = useRef<FlatList>(null);
  const { toothData, refetch: refetchTeeth } = useToothData();
  
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (stored) {
          const parsed: Message[] = JSON.parse(stored);
          if (parsed.length > 0) {
            setMessages([WELCOME_MESSAGE, ...parsed]);
          }
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadChatHistory();
  }, []);

  const generateTreatmentReminder = useCallback(async () => {
    if (!user?.id || !isLoaded) return;

    const teethWithProblems = toothData.filter((t) => 
      t.problems.some((p) => ["cavity", "pain", "crack", "sensitivity", "gum_issue"].includes(p))
    );

    if (teethWithProblems.length === 0) return;

    try {
      const lastReminder = await AsyncStorage.getItem(LAST_REMINDER_KEY);
      const now = Date.now();
      
      if (lastReminder) {
        const lastTime = parseInt(lastReminder, 10);
        const hoursSinceLast = (now - lastTime) / (1000 * 60 * 60);
        if (hoursSinceLast < 24) return;
      }

      const problemsList = teethWithProblems.map((t) => {
        const problemNames = t.problems
          .filter((p) => PROBLEM_LABELS[p])
          .map((p) => PROBLEM_LABELS[p])
          .join(", ");
        return `зуб ${t.toothNumber} (${problemNames})`;
      }).slice(0, 3);

      const reminderContent = `Напоминаю о необходимости лечения: ${problemsList.join("; ")}.\n\nВажно: раннее лечение значительно дешевле и проще. Если откладывать, проблема может усугубиться — лечение станет дороже, болезненнее, и в худшем случае зуб придётся удалить.\n\nЗапишитесь к стоматологу как можно скорее!`;

      const reminderMessage: Message = {
        id: `reminder_${now}`,
        role: "assistant",
        content: reminderContent,
        timestamp: new Date().toISOString(),
        isAlert: true,
      };

      setMessages((prev) => {
        const hasThisReminder = prev.some((m) => m.id === reminderMessage.id);
        if (hasThisReminder) return prev;
        return [...prev, reminderMessage];
      });

      await AsyncStorage.setItem(LAST_REMINDER_KEY, now.toString());

      await createAlert({
        userId: user.id,
        type: "warning",
        title: "Напоминание о лечении зубов",
        description: `У вас ${teethWithProblems.length} зуб(ов) требуют внимания. Раннее лечение дешевле и проще!`,
        priority: "important",
        relatedTeeth: teethWithProblems.map((t) => t.toothNumber.toString()),
      });

    } catch (error) {
      console.log("Error generating reminder:", error);
    }
  }, [user?.id, toothData, isLoaded]);

  useFocusEffect(
    useCallback(() => {
      refetchTeeth();
    }, [refetchTeeth])
  );

  useEffect(() => {
    if (isLoaded && toothData.length > 0) {
      generateTreatmentReminder();
    }
  }, [isLoaded, toothData, generateTreatmentReminder]);

  useEffect(() => {
    if (!isLoaded) return;
    const saveChatHistory = async () => {
      try {
        const toSave = messages.filter((m) => m.id !== "welcome");
        await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    };
    saveChatHistory();
  }, [messages, isLoaded]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const chatHistory = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));
      
      const response = await apiRequest("POST", new URL("/api/chat", getApiUrl()).toString(), {
        message,
        userId: user?.id,
        history: chatHistory,
      });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Извините, произошла ошибка. Пожалуйста, попробуйте ещё раз.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    chatMutation.mutate(text);
  }, [inputText, chatMutation]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user";
      const isAlert = item.isAlert;
      return (
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
          ]}
        >
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: isAlert ? theme.warning : theme.primary }]}>
              <Feather name={isAlert ? "alert-triangle" : "cpu"} size={16} color="#FFFFFF" />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser
                ? { backgroundColor: theme.primary }
                : isAlert 
                  ? { backgroundColor: theme.warning + "20", borderWidth: 1, borderColor: theme.warning }
                  : { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            {isAlert ? (
              <ThemedText type="small" style={{ color: theme.warning, fontWeight: "600", marginBottom: Spacing.xs }}>
                Напоминание от ИИ
              </ThemedText>
            ) : null}
            <ThemedText
              style={[
                styles.messageText,
                isUser && { color: "#FFFFFF" },
              ]}
            >
              {item.content}
            </ThemedText>
          </View>
        </View>
      );
    },
    [theme]
  );

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
            paddingBottom: tabBarHeight + 80,
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
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Задайте вопрос..."
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
              {
                backgroundColor: inputText.trim() ? theme.primary : theme.backgroundTertiary,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || chatMutation.isPending}
          >
            {chatMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather
                name="send"
                size={18}
                color={inputText.trim() ? "#FFFFFF" : theme.textSecondary}
              />
            )}
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  assistantMessageContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
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
