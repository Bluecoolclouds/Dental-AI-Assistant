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
        background: "linear-gradient(180deg, #4A90D9 0%, #7AADE6 100%)",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: 110,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -40,
          width: 180,
          height: 180,
          borderRadius: 90,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      />

      {/* Header */}
      <div
        style={{
          paddingTop: insetTop + 20,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <ToothLogo />
          <div>
            <div style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 700, lineHeight: "26px" }}>
              Toothy
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 10,
                letterSpacing: 3,
                fontWeight: 500,
              }}
            >
              DENTAL CARE
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          flex: 1,
          paddingLeft: 32,
          paddingRight: 32,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: 36,
            fontWeight: 700,
            lineHeight: "44px",
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Следите за здоровьем зубов
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 14,
            lineHeight: "20px",
            maxWidth: 280,
            textAlign: "center",
          }}
        >
          Войдите, чтобы продолжить заботу о здоровье зубов
        </div>
      </div>

      {/* Tooth illustration */}
      <div
        className="flex items-center justify-center"
        style={{ gap: 20, marginBottom: 32 }}
      >
        <div
          style={{
            width: 117,
            height: 148,
            background: "rgba(255,255,255,0.15)",
            borderTopLeftRadius: 60,
            borderTopRightRadius: 60,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        />
        <div
          style={{
            width: 117,
            height: 148,
            background: "rgba(255,255,255,0.15)",
            borderTopLeftRadius: 60,
            borderTopRightRadius: 60,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        />
      </div>

      {/* Footer button */}
      <div
        className="flex items-center justify-center"
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: insetBottom + 20,
        }}
      >
        <button
          type="button"
          className="flex items-center justify-center"
          style={{
            background: "#FFFFFF",
            paddingLeft: 48,
            paddingRight: 48,
            height: 60,
            borderRadius: 30,
            minWidth: 200,
            color: "#4A90D9",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          Начать
        </button>
      </div>
    </div>
  );
}
