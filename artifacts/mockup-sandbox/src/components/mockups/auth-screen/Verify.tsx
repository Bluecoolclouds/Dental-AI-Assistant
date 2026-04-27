import { useState } from "react";
import { Mail, ChevronRight, ArrowLeft } from "lucide-react";

export function Verify() {
  const [code, setCode] = useState<string[]>(["1", "2", "3", "", "", ""]);
  const email = "patient@example.com";
  const resendCooldown = 42;

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
            Введите код
          </h2>

          {/* Hint */}
          <div
            className="flex items-start"
            style={{ gap: 12, marginBottom: 20, paddingLeft: 8, paddingRight: 8 }}
          >
            <Mail size={18} color={theme.primary} style={{ flexShrink: 0, marginTop: 2 }} />
            <p
              className="flex-1"
              style={{ fontSize: 14, lineHeight: "20px", color: theme.textSecondary }}
            >
              Мы отправили 6-значный код на<br />
              <span style={{ color: theme.text, fontWeight: 600 }}>{email}</span>
            </p>
          </div>

          {/* Code boxes */}
          <div
            className="flex justify-center"
            style={{ gap: 8, marginBottom: 20 }}
          >
            {Array(6).fill(null).map((_, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code[i] || ""}
                onChange={(e) => {
                  const next = [...code];
                  next[i] = e.target.value.replace(/[^0-9]/g, "").slice(-1);
                  setCode(next);
                }}
                className="text-center outline-none"
                style={{
                  width: 46,
                  height: 58,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderStyle: "solid",
                  borderColor: code[i] ? theme.primary : theme.border,
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  fontSize: 26,
                  fontWeight: 700,
                }}
              />
            ))}
          </div>

          {/* Confirm button */}
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
              opacity: 0.6,
            }}
          >
            <span>Подтвердить</span>
            <span className="flex items-center">
              <ChevronRight size={16} color="#FFFFFF" />
              <ChevronRight size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: -8 }} />
            </span>
          </button>

          {/* Resend row */}
          <div className="flex justify-center items-center" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: theme.textSecondary }}>
              Не получили письмо?{" "}
            </span>
            <span
              className="font-semibold"
              style={{
                fontSize: 14,
                color: theme.textSecondary,
              }}
            >
              Повторно через {resendCooldown}с
            </span>
          </div>

          {/* Back to email */}
          <button
            type="button"
            className="flex justify-center items-center"
            style={{ gap: 8 }}
          >
            <ArrowLeft size={16} color={theme.textSecondary} />
            <span style={{ fontSize: 14, color: theme.textSecondary }}>Изменить email</span>
          </button>

          <div className="mt-auto" />

          {/* Safe area bottom */}
          <div style={{ height: 20 }} />
        </div>
      </div>
    </div>
  );
}
