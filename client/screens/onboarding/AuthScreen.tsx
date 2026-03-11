import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ActivityIndicator,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import AppIcon from "@/components/Icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuthContext } from "@/contexts/AuthContext";
import { OnboardingStackParamList } from "@/navigation/OnboardingNavigator";
import { apiRequest } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Auth">;
type RoutePropType = RouteProp<OnboardingStackParamList, "Auth">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const DISMISS_THRESHOLD = 160;
const DISMISS_VELOCITY = 900;
const CODE_LENGTH = 6;


export default function AuthScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { theme } = useTheme();
  const { login, register } = useAuthContext();

  const mode = route.params?.mode || "register";
  const isLogin = mode === "login";

  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [codeDigits, setCodeDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isDevMode, setIsDevMode] = useState(false);
  const codeRefs = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const translateY = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const dismiss = () => { navigation.goBack(); };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
      else translateY.value = e.translationY * 0.08;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 280 }, (finished) => {
          if (finished) runOnJS(dismiss)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.8 });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const sendCode = async (): Promise<boolean> => {
    try {
      const resp = await apiRequest("POST", "/api/auth/send-code", { email: email.trim() });
      const data = await resp.json();
      if (!data.sent) { setError(data.error || t("auth.errors.sendError")); return false; }
      setIsDevMode(!!data.devMode);
      return true;
    } catch (err: any) {
      const msg = err?.message || "";
      const jsonMatch = msg.match(/\{.*\}/);
      if (jsonMatch) {
        try { const parsed = JSON.parse(jsonMatch[0]); setError(parsed.error || t("auth.errors.sendFailed")); return false; } catch {}
      }
      setError(t("auth.errors.noConnection"));
      return false;
    }
  };

  const handleSendCode = async () => {
    setError("");
    if (!email.trim()) { setError(t("auth.errors.emptyEmail")); return; }
    if (!password.trim() || password.length < 6) { setError(t("auth.errors.shortPassword")); return; }
    if (password !== confirmPassword) { setError(t("auth.errors.passwordMismatch")); return; }

    setIsLoading(true);
    try {
      const ok = await sendCode();
      if (!ok) return;
      setCodeDigits(Array(CODE_LENGTH).fill(""));
      setStep("verify");
      startCooldown();
      setTimeout(() => codeRefs.current[0]?.focus(), 300);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setIsLoading(true);
    try {
      const ok = await sendCode();
      if (!ok) return;
      setCodeDigits(Array(CODE_LENGTH).fill(""));
      startCooldown();
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndRegister = async (digits: string[]) => {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) { setError(t("auth.errors.invalidCode")); return; }
    setError("");
    setIsLoading(true);
    try {
      let verifyData: any;
      try {
        const resp = await apiRequest("POST", "/api/auth/verify-code", { email: email.trim(), code });
        verifyData = await resp.json();
      } catch (err: any) {
        const msg = err?.message || "";
        const jsonMatch = msg.match(/\{.*\}/);
        if (jsonMatch) {
          try { const p = JSON.parse(jsonMatch[0]); setError(p.error || t("auth.errors.wrongCode")); return; } catch {}
        }
        setError(t("auth.errors.noConnection"));
        return;
      }
      if (!verifyData.verified) { setError(verifyData.error || t("auth.errors.wrongCode")); return; }

      const result = await register(email.trim(), password, code);
      if (!result.success) { setError(result.error || t("auth.errors.registerError")); return; }
      navigation.navigate("ProfileSetup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = () => verifyAndRegister(codeDigits);

  const handleCodeInput = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);
    setError("");
    if (digit && index < CODE_LENGTH - 1) {
      codeRefs.current[index + 1]?.focus();
    }
    if (digit && index === CODE_LENGTH - 1) {
      const fullCode = newDigits.join("");
      if (fullCode.length === CODE_LENGTH) verifyAndRegister(newDigits);
    }
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !codeDigits[index] && index > 0) {
      const newDigits = [...codeDigits];
      newDigits[index - 1] = "";
      setCodeDigits(newDigits);
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleLoginSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) { setError(t("auth.errors.fillAll")); return; }
    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) setError(result.error || t("auth.errors.wrongCredentials"));
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setError("");
    setStep("form");
    setCodeDigits(Array(CODE_LENGTH).fill(""));
    navigation.setParams({ mode: isLogin ? "register" : "login" });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0097A7", "#00ACC1", "#4DD0E1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      <Animated.View style={[styles.formCard, animatedCardStyle, { marginTop: insets.top }]}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>
        </GestureDetector>

        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          bottomOffset={24}
          scrollEnabled
        >
          {step === "verify" ? (
            <>
              <ThemedText type="h3" style={styles.formTitle}>{t("auth.enterCode")}</ThemedText>

              <View style={styles.verifyHint}>
                <AppIcon name="mail" size={18} color={theme.primary} />
                <ThemedText type="small" style={[styles.verifyHintText, { color: theme.textSecondary }]}>
                  {isDevMode
                    ? t("auth.devMode")
                    : <>Мы отправили 6-значный код на{"\n"}
                        <ThemedText type="small" style={{ color: theme.text, fontWeight: "600" }}>{email}</ThemedText>
                      </>
                  }
                </ThemedText>
              </View>

              {error ? (
                <View style={[styles.errorContainer, { backgroundColor: theme.danger + "15" }]}>
                  <AppIcon name="alert-circle" size={18} color={theme.danger} />
                  <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>{error}</ThemedText>
                </View>
              ) : null}

              <View style={styles.codeRow}>
                {Array(CODE_LENGTH).fill(null).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { codeRefs.current[i] = r; }}
                    style={[
                      styles.codeBox,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: codeDigits[i] ? theme.primary : theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={codeDigits[i]}
                    onChangeText={(t) => handleCodeInput(t, i)}
                    onKeyPress={(e) => handleCodeKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              <Pressable
                onPress={handleVerifyAndRegister}
                disabled={isLoading || codeDigits.join("").length < CODE_LENGTH}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed || isLoading || codeDigits.join("").length < CODE_LENGTH ? 0.6 : 1,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <ThemedText style={styles.submitButtonText}>{t("auth.confirm")}</ThemedText>
                    <View style={styles.buttonArrows}>
                      <AppIcon name="chevron-right" size={16} color="#FFFFFF" />
                      <AppIcon name="chevron-right" size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: -8 }} />
                    </View>
                  </>
                )}
              </Pressable>

              <View style={styles.resendRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t("auth.notReceived")}{" "}
                </ThemedText>
                <Pressable onPress={handleResend} disabled={resendCooldown > 0 || isLoading}>
                  <ThemedText
                    type="small"
                    style={{ color: resendCooldown > 0 ? theme.textSecondary : theme.primary, fontWeight: "600" }}
                  >
                    {resendCooldown > 0 ? t("auth.resendIn", { seconds: resendCooldown }) : t("auth.resend")}
                  </ThemedText>
                </Pressable>
              </View>

              <Pressable onPress={() => { setStep("form"); setError(""); }} style={styles.backRow}>
                <AppIcon name="arrow-left" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{t("auth.changeEmail")}</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText type="h3" style={styles.formTitle}>
                {isLogin ? t("auth.loginTitle") : t("auth.registerTitle")}
              </ThemedText>

              {error ? (
                <View style={[styles.errorContainer, { backgroundColor: theme.danger + "15" }]}>
                  <AppIcon name="alert-circle" size={18} color={theme.danger} />
                  <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>{error}</ThemedText>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <AppIcon name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={t("auth.email")}
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <AppIcon name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder={t("auth.password")}
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <AppIcon name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>

                {!isLogin ? (
                  <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <AppIcon name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder={t("auth.confirmPassword")}
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
                onPress={isLogin ? handleLoginSubmit : handleSendCode}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: theme.primary, opacity: pressed || isLoading ? 0.8 : 1 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <ThemedText style={styles.submitButtonText}>
                      {isLogin ? t("auth.loginBtn") : t("auth.start")}
                    </ThemedText>
                    <View style={styles.buttonArrows}>
                      <AppIcon name="chevron-right" size={16} color="#FFFFFF" />
                      <AppIcon name="chevron-right" size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: -8 }} />
                    </View>
                  </>
                )}
              </Pressable>

              <View style={styles.switchContainer}>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  {isLogin ? t("auth.noAccount") : t("auth.alreadyHaveAccount")}
                </ThemedText>
                <Pressable onPress={switchMode}>
                  <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                    {isLogin ? t("auth.switchToRegister") : t("auth.switchToLogin")}
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.bottomNav}>
                <Pressable style={styles.navArrow}>
                  <AppIcon name="chevron-left" size={24} color={theme.textSecondary} />
                </Pressable>
                <Pressable style={[styles.navArrow, { marginLeft: Spacing.sm }]}>
                  <AppIcon name="chevron-right" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>
            </>
          )}
        </KeyboardAwareScrollViewCompat>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0097A7" },
  gradientBackground: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  formCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  dragHandleArea: { alignItems: "center", paddingTop: Spacing.md, paddingBottom: Spacing.sm, paddingHorizontal: Spacing["2xl"] },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },
  formContent: { padding: Spacing.xl, paddingTop: Spacing.lg },
  formTitle: { textAlign: "center", marginBottom: Spacing.xl },
  errorContainer: {
    flexDirection: "row", alignItems: "center", padding: Spacing.md,
    borderRadius: BorderRadius.md, marginBottom: Spacing.lg, gap: Spacing.sm,
  },
  inputGroup: { gap: Spacing.md, marginBottom: Spacing.xl },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", height: 56,
    borderRadius: BorderRadius.lg, borderWidth: 1, paddingHorizontal: Spacing.lg,
  },
  inputIcon: { marginRight: Spacing.md },
  input: { flex: 1, fontSize: 16, height: "100%" },
  eyeButton: { padding: Spacing.sm, marginRight: -Spacing.sm },
  submitButton: {
    height: 56, borderRadius: BorderRadius.xl, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: Spacing.md, marginBottom: Spacing.xl,
  },
  submitButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  buttonArrows: { flexDirection: "row", alignItems: "center" },
  switchContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: Spacing["2xl"] },
  bottomNav: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  navArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  verifyHint: {
    flexDirection: "row", alignItems: "flex-start", gap: Spacing.md,
    marginBottom: Spacing.xl, paddingHorizontal: Spacing.sm,
  },
  verifyHintText: { flex: 1, lineHeight: 20 },
  codeRow: {
    flexDirection: "row", justifyContent: "center", gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  codeBox: {
    width: 46, height: 58, borderRadius: BorderRadius.md, borderWidth: 2,
    fontSize: 26, fontWeight: "700",
    ...Platform.select({ ios: {}, android: { paddingVertical: 0 } }),
  },
  resendRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: Spacing.lg },
  backRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: Spacing.sm },
});
