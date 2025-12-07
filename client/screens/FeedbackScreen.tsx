import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";

const CATEGORIES = [
  { value: "bug", label: "Ошибка", icon: "alert-circle" as const },
  { value: "feature", label: "Идея", icon: "lightbulb" as const },
  { value: "other", label: "Другое", icon: "message-circle" as const },
];

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [category, setCategory] = useState("other");
  const [message, setMessage] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (data: { category: string; message: string }) => {
      return apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      Alert.alert(
        "Спасибо!",
        "Ваш отзыв успешно отправлен. Мы ценим вашу обратную связь!",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    },
    onError: () => {
      Alert.alert("Ошибка", "Не удалось отправить отзыв. Попробуйте позже.");
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, введите сообщение");
      return;
    }
    submitMutation.mutate({ category, message: message.trim() });
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] }
        ]}
      >
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          Это бета-версия приложения. Ваши отзывы помогут нам сделать его лучше!
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>Тип отзыва</ThemedText>
          <View style={styles.categories}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={({ pressed }) => [
                    styles.categoryButton,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                      borderColor: isSelected ? theme.primary : theme.border,
                      opacity: pressed ? 0.7 : 1,
                    }
                  ]}
                >
                  <Feather
                    name={cat.icon}
                    size={20}
                    color={isSelected ? "#FFFFFF" : theme.text}
                  />
                  <ThemedText
                    type="body"
                    style={{ color: isSelected ? "#FFFFFF" : theme.text }}
                  >
                    {cat.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="small" style={styles.label}>Сообщение</ThemedText>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            placeholder="Опишите проблему или идею..."
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <Button onPress={handleSubmit} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            "Отправить"
          )}
        </Button>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing["2xl"],
  },
  description: {
    textAlign: "center",
  },
  section: {
    gap: Spacing.md,
  },
  label: {
    fontWeight: "500",
    marginLeft: Spacing.xs,
  },
  categories: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  categoryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 150,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
});
