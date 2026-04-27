import welcomeBg from "@/assets/welcome-bg.png";
import toothLogo from "@/assets/tooth-logo.png";

function ToothLogo() {
  return (
    <img
      src={toothLogo}
      alt="Toothy"
      style={{
        width: 48,
        height: 48,
        objectFit: "contain",
        filter: "drop-shadow(0 2px 6px rgba(0,40,70,0.25))",
      }}
    />
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
      {/* Header — centered horizontally */}
      <div
        className="flex items-center justify-center"
        style={{
          paddingTop: insetTop - 8,
          paddingLeft: 20,
          paddingRight: 20,
          position: "relative",
          zIndex: 2,
          gap: 12,
        }}
      >
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

      {/* Hero text — centered vertically */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          flex: 1,
          position: "relative",
          zIndex: 2,
          paddingLeft: 32,
          paddingRight: 32,
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
            textShadow: "0 2px 12px rgba(0,40,70,0.5)",
          }}
        >
          Следите за здоровьем зубов
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.95)",
            fontSize: 14,
            lineHeight: "20px",
            maxWidth: 280,
            textAlign: "center",
            textShadow: "0 1px 8px rgba(0,40,70,0.45)",
          }}
        >
          Войдите, чтобы продолжить заботу о здоровье зубов
        </div>
      </div>

      {/* Button at bottom */}
      <div
        className="flex items-center justify-center"
        style={{
          position: "relative",
          zIndex: 2,
          paddingLeft: 32,
          paddingRight: 32,
          paddingBottom: insetBottom + 24,
        }}
      >
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
