import welcomeBg from "@/assets/welcome-bg.png";

function ToothLogo() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: 40, height: 40 }}
    >
      <svg width={40} height={40} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="white" />
        <path
          d="M13,18 C13,12 16,9 20,9 C24,9 27,12 27,18 L26,28 C26,31 25,34 23,34 C22,34 21,32 20.5,30 L20,30 L19.5,30 C19,32 18,34 17,34 C15,34 14,31 14,28 Z"
          fill="#4A90D9"
        />
      </svg>
    </div>
  );
}

export function Welcome() {
  const insetTop = 47;
  const insetBottom = 34;

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${welcomeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Soft dark gradient at the bottom for text readability */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "55%",
          background:
            "linear-gradient(180deg, rgba(15,42,68,0) 0%, rgba(15,42,68,0.35) 45%, rgba(15,42,68,0.78) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          paddingTop: insetTop + 20,
          paddingLeft: 20,
          paddingRight: 20,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <ToothLogo />
          <div>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontWeight: 700,
                lineHeight: "26px",
                textShadow: "0 1px 6px rgba(0,40,70,0.35)",
              }}
            >
              Toothy
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.95)",
                fontSize: 10,
                letterSpacing: 3,
                fontWeight: 500,
                textShadow: "0 1px 4px rgba(0,40,70,0.35)",
              }}
            >
              DENTAL CARE
            </div>
          </div>
        </div>
      </div>

      {/* Spacer pushes content to bottom */}
      <div style={{ flex: 1 }} />

      {/* Bottom content: hero text + button */}
      <div
        className="flex flex-col items-center"
        style={{
          position: "relative",
          zIndex: 2,
          paddingLeft: 32,
          paddingRight: 32,
          paddingBottom: insetBottom + 24,
          gap: 14,
        }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: 30,
            fontWeight: 700,
            lineHeight: "38px",
            textAlign: "center",
            textShadow: "0 2px 10px rgba(0,40,70,0.45)",
          }}
        >
          Следите за здоровьем зубов
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.92)",
            fontSize: 14,
            lineHeight: "20px",
            maxWidth: 280,
            textAlign: "center",
            textShadow: "0 1px 6px rgba(0,40,70,0.4)",
            marginBottom: 12,
          }}
        >
          Войдите, чтобы продолжить заботу о здоровье зубов
        </div>
        <button
          type="button"
          className="flex items-center justify-center"
          style={{
            background: "#FFFFFF",
            paddingLeft: 48,
            paddingRight: 48,
            height: 58,
            borderRadius: 29,
            minWidth: 240,
            color: "#4A90D9",
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: 0.3,
            boxShadow: "0 10px 28px rgba(0,40,70,0.3)",
          }}
        >
          Начать
        </button>
      </div>
    </div>
  );
}
