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
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import AppIcon from "@/components/Icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

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

function ToothIllustration({ style }: { style?: any }) {
  return (
    <Svg width={80} height={100} viewBox="0 0 80 100" style={style}>
      <Defs>
        <RadialGradient id="toothGrad" cx="50%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#E8E8E8" />
        </RadialGradient>
      </Defs>
      <Path
        d="M20,35 C20,15 30,5 40,5 C50,5 60,15 60,35 L58,70 C58,80 55,95 50,95 C48,95 46,90 45,85 L40,85 L35,85 C34,90 32,95 30,95 C25,95 22,80 22,70 Z"
        fill="url(#toothGrad)"
        stroke="#D0D0D0"
        strokeWidth={1}
      />
      <Circle cx="35" cy="30" r="3" fill="#F0F0F0" opacity={0.8} />
    </Svg>
  );
}

function DentcorLogo() {
  return (
    <View style={styles.logoContainer}>
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Circle cx="20" cy="20" r="18" fill="#FFFFFF" opacity={0.2} />
        <Path
          d="M12,18 C12,10 15,6 20,6 C25,6 28,10 28,18 L27,28 C27,32 25,36 23,36 C22,36 21,34 20.5,32 L20,32 L19.5,32 C19,34 18,36 17,36 C15,36 13,32 13,28 Z"
          fill="#FFFFFF"
          stroke="#E0F7FA"
          strokeWidth={0.5}
        />
      </Svg>
      <View>
        <ThemedText style={styles.logoText}>Dentcor</ThemedText>
        <ThemedText style={styles.logoSubtext}>DENTAL CARE</ThemedText>
      </View>
    </View>
  );
}

export default function AuthScreen() {
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
  const codeRefs = useRef<(TextInput | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const translateY = useSharedValue(0);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
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

  const animatedCardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const sendCode = async (): Promise<boolean> => {
    try {
      const resp = await apiRequest("POST", "/api/auth/send-code", { email: email.trim() });
      const data = await resp.json();
      if (!data.sent) { setError(data.error || "Ошибка отправки кода"); return false; }
      return true;
    } catch (err: any) {
      const msg = err?.message || "";
      const jsonMatch = msg.match(/\{.*\}/);
      if (jsonMatch) {
        try { const parsed = JSON.parse(jsonMatch[0]); setError(parsed.error || "Ошибка отправки"); return false; } catch {}
      }
      setError("Нет соединения с сервером");
      return false;
    }
  };

  const handleSendCode = async () => {
    setError("");
    if (!email.trim()) { setError("Введите email"); return; }
    if (!password.trim() || password.length < 6) { setError("Пароль должен быть не менее 6 символов"); return; }
    if (password !== confirmPassword) { setError("Пароли не совпадают"); return; }

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
    if (code.length < CODE_LENGTH) { setError("Введите все 6 цифр кода"); return; }
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
          try { const p = JSON.parse(jsonMatch[0]); setError(p.error || "Неверный код"); return; } catch {}
        }
        setError("Нет соединения с сервером");
        return;
      }
      if (!verifyData.verified) { setError(verifyData.error || "Неверный код"); return; }

      const result = await register(email.trim(), password, code);
      if (!result.success) { setError(result.error || "Ошибка регистрации"); return; }
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
    if (!email.trim() || !password.trim()) { setError("Заполните все поля"); return; }
    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) setError(result.error || "Неверный email или пароль");
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
      >
        <View style={[styles.headerSection, { paddingTop: insets.top + Spacing.xl }]}>
          <DentcorLogo />
          <View style={styles.heroContent}>
            <ThemedText style={styles.heroTitle}>
              {step === "verify" ? "Проверьте почту" : isLogin ? "С возвращением!" : "Почувствуйте себя уверенно"}
            </ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {step === "verify"
                ? `Код отправлен на ${email}`
                : isLogin
                ? "Войдите, чтобы продолжить заботу о здоровье зубов"
                : "Клиническое мастерство — приоритет для любого стоматологического сервиса"}
            </ThemedText>
          </View>
          <View style={styles.teethDecoration}>
            <ToothIllustration style={[styles.tooth, styles.tooth1]} />
            <ToothIllustration style={[styles.tooth, styles.tooth2]} />
            <ToothIllustration style={[styles.tooth, styles.tooth3]} />
          </View>
        </View>
      </LinearGradient>

      <Animated.View style={[styles.formCard, animatedCardStyle]}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>
        </GestureDetector>

        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {step === "verify" ? (
            <>
              <ThemedText type="h3" style={styles.formTitle}>Введите код</ThemedText>

              <View style={styles.verifyHint}>
                <AppIcon name="mail" size={18} color={theme.primary} />
                <ThemedText type="small" style={[styles.verifyHintText, { color: theme.textSecondary }]}>
                  Мы отправили 6-значный код на{"\n"}
                  <ThemedText type="small" style={{ color: theme.text, fontWeight: "600" }}>{email}</ThemedText>
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
                    <ThemedText style={styles.submitButtonText}>Подтвердить</ThemedText>
                    <View style={styles.buttonArrows}>
                      <AppIcon name="chevron-right" size={16} color="#FFFFFF" />
                      <AppIcon name="chevron-right" size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: -8 }} />
                    </View>
                  </>
                )}
              </Pressable>

              <View style={styles.resendRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Не получили письмо?{" "}
                </ThemedText>
                <Pressable onPress={handleResend} disabled={resendCooldown > 0 || isLoading}>
                  <ThemedText
                    type="small"
                    style={{ color: resendCooldown > 0 ? theme.textSecondary : theme.primary, fontWeight: "600" }}
                  >
                    {resendCooldown > 0 ? `Повторно через ${resendCooldown}с` : "Отправить повторно"}
                  </ThemedText>
                </Pressable>
              </View>

              <Pressable onPress={() => { setStep("form"); setError(""); }} style={styles.backRow}>
                <AppIcon name="arrow-left" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Изменить email</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText type="h3" style={styles.formTitle}>
                {isLogin ? "Вход" : "Регистрация"}
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
                  <AppIcon name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
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
                    <AppIcon name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>

                {!isLogin ? (
                  <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <AppIcon name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
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
                      {isLogin ? "Войти" : "Начать"}
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
                  {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
                </ThemedText>
                <Pressable onPress={switchMode}>
                  <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                    {isLogin ? "Регистрация" : "Войти"}
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
  gradientBackground: { height: "42%", paddingHorizontal: Spacing.xl, overflow: "hidden" },
  headerSection: { flex: 1, overflow: "hidden" },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  logoText: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", letterSpacing: 0.5 },
  logoSubtext: { color: "rgba(255,255,255,0.7)", fontSize: 10, letterSpacing: 2, fontWeight: "500" },
  heroContent: { marginTop: Spacing.lg, maxWidth: "70%" },
  heroTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", lineHeight: 30, marginBottom: Spacing.sm },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 20 },
  teethDecoration: { position: "absolute", right: -20, bottom: 40, flexDirection: "row", alignItems: "flex-end" },
  tooth: { opacity: 0.9 },
  tooth1: { transform: [{ rotate: "-10deg" }] },
  tooth2: { marginLeft: -30, marginBottom: -10 },
  tooth3: { marginLeft: -30, transform: [{ rotate: "10deg" }] },
  formCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
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
