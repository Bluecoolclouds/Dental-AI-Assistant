import React, { useState } from "react";
import { StyleSheet, View, TextInput, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Auth">;
type RoutePropType = RouteProp<OnboardingStackParamList, "Auth">;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const { login, register } = useAuthContext();

  const mode = route.params?.mode || "register";
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    
    if (!email.trim() || !password.trim()) {
      setError("Заполните все поля");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsLoading(true);
    try {
      const result = isLogin
        ? await login(email.trim(), password)
        : await register(email.trim(), password);

      if (!result.success) {
        setError(result.error || "Произошла ошибка");
      } else if (!isLogin) {
        navigation.navigate("Questionnaire");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setError("");
    navigation.setParams({ mode: isLogin ? "register" : "login" });
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing["2xl"] }
        ]}
      >
        <ThemedText type="h2" style={styles.title}>
          {isLogin ? "Вход в аккаунт" : "Создание аккаунта"}
        </ThemedText>
        
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isLogin
            ? "Войдите, чтобы продолжить"
            : "Зарегистрируйтесь, чтобы сохранить данные"
          }
        </ThemedText>

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.danger + "15" }]}>
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <ThemedText type="small" style={styles.label}>Email</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                }
              ]}
              placeholder="example@email.com"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" style={styles.label}>Пароль</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                }
              ]}
              placeholder="Минимум 6 символов"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </View>

          {!isLogin ? (
            <View style={styles.inputContainer}>
              <ThemedText type="small" style={styles.label}>Подтвердите пароль</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundDefault,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Повторите пароль"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>
          ) : null}
        </View>

        <Button onPress={handleSubmit} disabled={isLoading} style={styles.button}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : isLogin ? (
            "Войти"
          ) : (
            "Зарегистрироваться"
          )}
        </Button>

        <Pressable onPress={switchMode} style={styles.switchLink}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
          </ThemedText>
          <ThemedText type="link">
            {isLogin ? "Регистрация" : "Войти"}
          </ThemedText>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing["2xl"],
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    marginBottom: Spacing.lg,
  },
  switchLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
});
