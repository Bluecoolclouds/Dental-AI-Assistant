import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";

const placeholderStyle = `
  .auth-input::placeholder { color: #64748B; opacity: 1; }
`;

export function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  const theme = {
    text: "#1A1A2E",
    textSecondary: "#64748B",
    backgroundSecondary: "#F1F5F9",
    border: "#E2E8F0",
    primary: "#4A90D9",
    danger: "#F44336",
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: "linear-gradient(135deg, #0097A7 0%, #00ACC1 50%, #4DD0E1 100%)" }}
    >
      <style>{placeholderStyle}</style>
      {/* Status bar spacer (safe area top) */}
      <div style={{ height: 47 }} />

      {/* Form card */}
      <div
        className="flex-1 bg-white flex flex-col"
        style={{
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          boxShadow: "0 -4px 12px rgba(0,0,0,0.10)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="rounded-full" style={{ width: 40, height: 4, backgroundColor: "#D1D5DB" }} />
        </div>

        {/* Form content */}
        <div className="flex-1 px-5 pt-4 pb-6 flex flex-col">
          <h2
            className="text-center font-semibold"
            style={{ fontSize: 20, color: theme.text, marginBottom: 20 }}
          >
            {isLogin ? "Вход" : "Регистрация"}
          </h2>

          {/* Inputs */}
          <div className="flex flex-col" style={{ gap: 12, marginBottom: 20 }}>
            {/* Email */}
            <div
              className="flex items-center"
              style={{
                height: 56,
                borderRadius: 24,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              <Mail size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
              <input
                type="email"
                placeholder="Email"
                className="auth-input flex-1 bg-transparent outline-none"
                style={{ fontSize: 16, color: theme.text }}
              />
            </div>

            {/* Password */}
            <div
              className="flex items-center"
              style={{
                height: 56,
                borderRadius: 24,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              <Lock size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Пароль"
                className="auth-input flex-1 bg-transparent outline-none"
                style={{ fontSize: 16, color: theme.text }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 -mr-2"
              >
                {showPassword ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </button>
            </div>

            {/* Confirm password (only register) */}
            {!isLogin && (
              <div
                className="flex items-center"
                style={{
                  height: 56,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSecondary,
                  paddingLeft: 16,
                  paddingRight: 16,
                }}
              >
                <Lock size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Подтвердите пароль"
                  className="auth-input flex-1 bg-transparent outline-none"
                  style={{ fontSize: 16, color: theme.text }}
                />
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            type="button"
            className="flex items-center justify-center text-white font-semibold"
            style={{
              height: 56,
              borderRadius: 30,
              backgroundColor: theme.primary,
              gap: 12,
              marginBottom: 20,
              fontSize: 18,
            }}
          >
            <span>{isLogin ? "Войти" : "Начать"}</span>
            <span className="flex items-center">
              <ChevronRight size={16} color="#FFFFFF" />
              <ChevronRight size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: -8 }} />
            </span>
          </button>

          {/* Switch login/register */}
          <div className="flex justify-center items-center gap-1" style={{ marginBottom: 24 }}>
            <span style={{ color: theme.textSecondary, fontSize: 16 }}>
              {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold"
              style={{ color: theme.primary, fontSize: 16 }}
            >
              {isLogin ? "Регистрация" : "Войти"}
            </button>
          </div>

          {/* Bottom nav arrows */}
          <div className="flex justify-center items-center gap-2 mt-auto">
            <button
              type="button"
              className="flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#F1F5F9",
              }}
            >
              <ChevronLeft size={24} color={theme.textSecondary} />
            </button>
            <button
              type="button"
              className="flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#F1F5F9",
              }}
            >
              <ChevronRight size={24} color={theme.textSecondary} />
            </button>
          </div>

          {/* Safe area bottom */}
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}
