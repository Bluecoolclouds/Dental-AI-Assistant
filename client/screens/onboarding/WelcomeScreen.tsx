import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 0.5;

function ToothLogo() {
  return (
    <View style={styles.logoContainer}>
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="20" fill="white" />
        <Path
          d="M13,18 C13,12 16,9 20,9 C24,9 27,12 27,18 L26,28 C26,31 25,34 23,34 C22,34 21,32 20.5,30 L20,30 L19.5,30 C19,32 18,34 17,34 C15,34 14,31 14,28 Z"
          fill="#4A90D9"
        />
      </Svg>
    </View>
  );
}

type AuthMode = "register" | "login";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { login, register } = useAuthContext();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("register");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const animateOpen = () => {
    translateY.setValue(SCREEN_HEIGHT);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 280,
      mass: 0.9,
    }).start();
  };

  const animateClose = (onDone?: () => void) => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      onDone?.();
    });
  };

  const openSheet = (mode: AuthMode) => {
    setAuthMode(mode);
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setSheetVisible(true);
  };

  const closeSheet = () => {
    animateClose(() => setSheetVisible(false));
  };

  const switchMode = () => {
    setError("");
    setAuthMode((prev) => (prev === "login" ? "register" : "login"));
  };

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Заполните все поля");
      return;
    }
    if (authMode === "register" && password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }
    setIsLoading(true);
    try {
      const result =
        authMode === "login"
          ? await login(email.trim(), password)
          : await register(email.trim(), password);

      if (!result.success) {
        setError(result.error || "Произошла ошибка");
      } else if (authMode === "register") {
        animateClose(() => {
          setSheetVisible(false);
          navigation.navigate("Questionnaire");
        });
      } else {
        animateClose(() => setSheetVisible(false));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_, g) =>
        g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          translateY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy > DISMISS_VELOCITY) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            useNativeDriver: true,
          }).start(() => setSheetVisible(false));
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 300,
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const isLogin = authMode === "login";

  return (
    <LinearGradient colors={["#4A90D9", "#7AADE6"]} style={styles.container}>
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.brandRow}>
          <ToothLogo />
          <View>
            <ThemedText style={styles.brandName}>Dentcor</ThemedText>
            <ThemedText style={styles.brandSub}>DENTAL CARE</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ThemedText style={styles.heroTitle}>
          Следите за{"\n"}здоровьем{"\n"}ваших зубов
        </ThemedText>
        <ThemedText style={styles.heroSubtitle}>
          Контролируйте здоровье зубов и дёсен с помощью ИИ-рекомендаций
        </ThemedText>
      </View>

      <View style={styles.toothIllustration}>
        <View style={styles.toothShape1} />
        <View style={styles.toothShape2} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={() => openSheet("register")} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>Начать</ThemedText>
        </Pressable>
      </View>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
        onShow={animateOpen}
      >
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheetWrapper}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + Spacing.xl },
              { transform: [{ translateY }] },
            ]}
          >
            <View style={styles.dragArea} {...panResponder.panHandlers}>
              <View style={styles.sheetHandle} />
              <ThemedText style={styles.sheetTitle}>
                {isLogin ? "Вход" : "Регистрация"}
              </ThemedText>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              {error ? (
                <View style={[styles.errorContainer, { backgroundColor: theme.danger + "15" }]}>
                  <AppIcon name="alert-circle" size={16} color={theme.danger} />
                  <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <AppIcon name="mail" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Email"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <AppIcon name="lock" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Пароль"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <AppIcon name={showPassword ? "eye-off" : "eye"} size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>

                {!isLogin ? (
                  <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <AppIcon name="lock" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Подтвердите пароль"
                      placeholderTextColor={theme.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                    />
                  </View>
                ) : null}
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: theme.primary, opacity: pressed || isLoading ? 0.8 : 1 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    {isLogin ? "Войти" : "Создать аккаунт"}
                  </ThemedText>
                )}
              </Pressable>

              <View style={styles.switchContainer}>
                <ThemedText style={[styles.switchText, { color: theme.textSecondary }]}>
                  {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
                </ThemedText>
                <Pressable onPress={switchMode}>
                  <ThemedText style={[styles.switchLink, { color: theme.primary }]}>
                    {isLogin ? "Регистрация" : "Войти"}
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  decorativeCircle1: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  header: {
    paddingHorizontal: Spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  logoContainer: {
    width: 40,
    height: 40,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: Spacing.lg,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  toothIllustration: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginBottom: Spacing["3xl"],
  },
  toothShape1: {
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.38,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  toothShape2: {
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.38,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 48,
    height: 60,
    borderRadius: 30,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4A90D9",
    letterSpacing: 0.3,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.75,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  dragArea: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: "center",
    minHeight: 72,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  sheetScroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  eyeButton: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
