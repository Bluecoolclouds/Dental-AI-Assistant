import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Image,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AppIcon from "@/components/Icons";
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { useTranslation } from "react-i18next";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";
import { apiRequest } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 800;

function ToothLogo() {
  return (
    <Image
      source={require("../../../assets/images/tooth-logo.png")}
      style={styles.logoContainer}
      resizeMode="contain"
    />
  );
}

type AuthMode = "register" | "login";

export default function WelcomeScreen() {
  const { t } = useTranslation();
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

  const [registerStep, setRegisterStep] = useState<"form" | "code">("form");
  const [verificationCode, setVerificationCode] = useState("");
  const [devMode, setDevMode] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = (seconds: number) => {
    setResendCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sheetY = useSharedValue(SCREEN_HEIGHT);
  const sheetHeight = useSharedValue(0);
  const sheetRadius = useSharedValue(28);
  const isFullScreen = useRef(false);

  const hideSheet = () => {
    isFullScreen.current = false;
    setSheetVisible(false);
  };

  const animateOpen = () => {
    sheetY.value = SCREEN_HEIGHT;
    sheetHeight.value = 0;
    sheetRadius.value = 28;
    sheetY.value = withSpring(0, { damping: 22, stiffness: 280, mass: 0.9 });
  };

  const animateToFullScreen = () => {
    if (isFullScreen.current) return;
    isFullScreen.current = true;
    sheetHeight.value = withSpring(SCREEN_HEIGHT, { damping: 24, stiffness: 240, mass: 1 });
    sheetRadius.value = withTiming(0, { duration: 320 });
  };

  const animateClose = (onDone?: () => void) => {
    sheetY.value = withTiming(SCREEN_HEIGHT, { duration: 260 }, (finished) => {
      if (finished) {
        if (onDone) runOnJS(onDone)();
        else runOnJS(hideSheet)();
      }
    });
  };

  const switchMode = () => {
    setError("");
    setRegisterStep("form");
    setVerificationCode("");
    setDevMode(false);
    setAuthMode((prev) => (prev === "login" ? "register" : "login"));
  };

  const openSheet = (mode: AuthMode) => {
    isFullScreen.current = false;
    sheetY.value = SCREEN_HEIGHT;
    sheetHeight.value = 0;
    sheetRadius.value = 28;
    setAuthMode(mode);
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setRegisterStep("form");
    setVerificationCode("");
    setDevMode(false);
    setSheetVisible(true);
  };

  const closeSheet = () => animateClose();

  const sendCode = async () => {
    setError("");
    setIsLoading(true);
    try {
      const resp = await apiRequest("POST", "/api/auth/send-code", { email: email.trim() });
      const data = await resp.json();
      if (data.devMode) setDevMode(true);
      setRegisterStep("code");
      startCountdown(60);
    } catch (err: any) {
      const raw = err?.message || "";
      const statusMatch = raw.match(/^(\d+):\s*([\s\S]*)/);
      if (statusMatch) {
        const body = statusMatch[2].trim();
        try {
          const parsed = JSON.parse(body);
          setError(parsed.error || t("auth.errors.sendError"));
          return;
        } catch {}
        setError(body || t("auth.errors.sendError"));
        return;
      }
      setError(raw || t("auth.errors.sendError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");

    if (authMode === "login") {
      if (!email.trim() || !password.trim()) {
        setError(t("auth.errors.fillAll"));
        return;
      }
      if (password.length < 6) {
        setError(t("auth.errors.shortPassword"));
        return;
      }
      setIsLoading(true);
      try {
        const result = await login(email.trim(), password);
        if (!result.success) {
          setError(result.error || t("common.error"));
        } else {
          animateClose(() => setSheetVisible(false));
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Register — step 1: validate form and send code
    if (registerStep === "form") {
      if (!email.trim() || !password.trim()) {
        setError(t("auth.errors.fillAll"));
        return;
      }
      if (password !== confirmPassword) {
        setError(t("auth.errors.passwordMismatch"));
        return;
      }
      if (password.length < 6) {
        setError(t("auth.errors.shortPassword"));
        return;
      }
      await sendCode();
      return;
    }

    // Register — step 2: verify code and register
    if (verificationCode.trim().length !== 6) {
      setError(t("auth.errors.invalidCode"));
      return;
    }
    setIsLoading(true);
    try {
      const result = await register(email.trim(), password, verificationCode.trim());
      if (!result.success) {
        setError(result.error || t("common.error"));
      } else {
        animateClose(() => {
          setSheetVisible(false);
          navigation.navigate("ProfileSetup");
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        sheetY.value = e.translationY;
      } else {
        sheetY.value = e.translationY * 0.05;
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY) {
        sheetY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, (finished) => {
          if (finished) runOnJS(hideSheet)();
        });
      } else {
        sheetY.value = withSpring(0, { damping: 22, stiffness: 300 });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => {
    const base = {
      transform: [{ translateY: sheetY.value }] as const,
      borderTopLeftRadius: sheetRadius.value,
      borderTopRightRadius: sheetRadius.value,
    };
    if (sheetHeight.value > 0) {
      return {
        ...base,
        height: sheetHeight.value,
        maxHeight: sheetHeight.value,
      };
    }
    return { ...base, maxHeight: SCREEN_HEIGHT * 0.78 };
  });

  const isLogin = authMode === "login";

  return (
    <ImageBackground
      source={require("../../../assets/images/welcome-bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.brandRow}>
          <ToothLogo />
          <View>
            <ThemedText style={styles.brandName}>Toothy</ThemedText>
            <ThemedText style={styles.brandSub}>DENTAL CARE</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ThemedText style={styles.heroTitle}>
          {t("welcome.tagline")}
        </ThemedText>
        <ThemedText style={styles.heroSubtitle}>
          {t("auth.loginSubtitle")}
        </ThemedText>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={() => openSheet("register")} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>{t("auth.start")}</ThemedText>
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
        <GestureHandlerRootView style={styles.modalRoot}>
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
              animatedSheetStyle,
            ]}
          >
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragArea}>
                <View style={styles.sheetHandle} />
                <ThemedText style={styles.sheetTitle}>
                  {isLogin ? t("auth.loginTitle") : t("auth.registerTitle")}
                </ThemedText>
              </View>
            </GestureDetector>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={!isLogin && registerStep === "code" ? { flex: 1 } : undefined}
              contentContainerStyle={[
                styles.sheetScroll,
                !isLogin && registerStep === "code" && styles.codeScrollContent,
              ]}
            >
              {error ? (
                <View style={[styles.errorContainer, { backgroundColor: theme.danger + "15" }]}>
                  <AppIcon name="alert-circle" size={16} color={theme.danger} />
                  <ThemedText style={[styles.errorText, { color: theme.danger }]}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}

              {!isLogin && registerStep === "code" ? (
                <View style={styles.codeContentWrapper}>
                  <ThemedText style={[styles.codeHint, { color: theme.textSecondary }]}>
                    {t("auth.codeSentTo", { email })}
                  </ThemedText>
                  {devMode ? (
                    <ThemedText style={[styles.devHint, { color: theme.textSecondary }]}>
                      {t("auth.devMode")}
                    </ThemedText>
                  ) : null}
                  <View style={styles.inputGroup}>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                      ]}
                    >
                      <AppIcon name="shield" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: theme.text, letterSpacing: 6, textAlign: "center" }]}
                        placeholder="_ _ _ _ _ _"
                        placeholderTextColor={theme.textSecondary}
                        value={verificationCode}
                        onChangeText={(v) => setVerificationCode(v.replace(/\D/g, "").slice(0, 6))}
                        keyboardType="number-pad"
                        autoFocus
                        maxLength={6}
                        onFocus={animateToFullScreen}
                      />
                    </View>
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
                        {t("auth.enterCode")}
                      </ThemedText>
                    )}
                  </Pressable>

                  <View style={styles.switchContainer}>
                    {resendCountdown > 0 ? (
                      <ThemedText style={[styles.switchText, { color: theme.textSecondary }]}>
                        {t("auth.resendIn", { seconds: resendCountdown })}
                      </ThemedText>
                    ) : (
                      <Pressable onPress={sendCode} disabled={isLoading}>
                        <ThemedText style={[styles.switchLink, { color: theme.primary }]}>
                          {t("auth.resend")}
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                      ]}
                    >
                      <AppIcon name="mail" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder={t("auth.email")}
                        placeholderTextColor={theme.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        onFocus={animateToFullScreen}
                      />
                    </View>

                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                      ]}
                    >
                      <AppIcon name="lock" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder={t("auth.password")}
                        placeholderTextColor={theme.textSecondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        onFocus={animateToFullScreen}
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                        <AppIcon
                          name={showPassword ? "eye-off" : "eye"}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </Pressable>
                    </View>

                    {!isLogin ? (
                      <View
                        style={[
                          styles.inputWrapper,
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                        ]}
                      >
                        <AppIcon name="lock" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, { color: theme.text }]}
                          placeholder={t("auth.confirmPassword")}
                          placeholderTextColor={theme.textSecondary}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showPassword}
                          autoComplete="new-password"
                          onFocus={animateToFullScreen}
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
                        {isLogin ? t("auth.loginBtn") : t("welcome.register")}
                      </ThemedText>
                    )}
                  </Pressable>

                  <View style={styles.switchContainer}>
                    <ThemedText style={[styles.switchText, { color: theme.textSecondary }]}>
                      {isLogin ? t("welcome.noAccount") : t("welcome.haveAccount")}
                    </ThemedText>
                    <Pressable onPress={switchMode}>
                      <ThemedText style={[styles.switchLink, { color: theme.primary }]}>
                        {isLogin ? t("auth.registerTitle") : t("auth.loginBtn")}
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: Spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,40,70,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "500",
    textShadowColor: "rgba(0,40,70,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: Spacing.md,
    textShadowColor: "rgba(0,40,70,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
    textShadowColor: "rgba(0,40,70,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 48,
    height: 58,
    borderRadius: 29,
    minWidth: 240,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0,40,70,0.6)",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  primaryButtonText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#4A90D9",
    letterSpacing: 0.3,
  },
  modalRoot: {
    flex: 1,
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
  },
  sheetScroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  codeScrollContent: {
    flexGrow: 1,
  },
  codeContentWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: SCREEN_HEIGHT * 0.22,
    gap: Spacing.md,
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
    marginTop: Spacing.lg,
  },
  switchText: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  codeHint: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  devHint: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    opacity: 0.7,
  },
});
