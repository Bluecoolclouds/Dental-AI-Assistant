import { Bell, MapPin, ClipboardList, Sun, User, Phone, Activity, MessageCircle, ChevronRight, AlertTriangle, AlertCircle } from "lucide-react";

function ToothMascot() {
  return (
    <svg width={60} height={70} viewBox="0 0 60 70" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mascotGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E0E0E0" />
        </radialGradient>
      </defs>
      <path
        d="M15,25 C15,10 22,3 30,3 C38,3 45,10 45,25 L43,50 C43,58 40,67 36,67 C34,67 32,64 31,60 L30,60 L29,60 C28,64 26,67 24,67 C20,67 17,58 17,50 Z"
        fill="url(#mascotGrad)"
        stroke="#BDBDBD"
        strokeWidth={1}
      />
      <circle cx="24" cy="20" r="3" fill="#333" />
      <circle cx="36" cy="20" r="3" fill="#333" />
      <circle cx="25" cy="21" r="1" fill="#FFF" />
      <circle cx="37" cy="21" r="1" fill="#FFF" />
      <path d="M24,30 Q30,36 36,30" fill="none" stroke="#E91E63" strokeWidth={2} strokeLinecap="round" />
      <circle cx="18" cy="25" r="4" fill="#FFCDD2" opacity={0.6} />
      <circle cx="42" cy="25" r="4" fill="#FFCDD2" opacity={0.6} />
    </svg>
  );
}

const QUICK_ACTIONS = [
  { id: "toothmap", name: "Карта зубов", Icon: MapPin, bgColor: "#EBF5FF", iconColor: "#4A90D9" },
  { id: "test", name: "Пройти тест", Icon: ClipboardList, bgColor: "#F3EAFF", iconColor: "#9333EA" },
  { id: "ai", name: "ИИ советы", Icon: Sun, bgColor: "#FFF8E1", iconColor: "#F59E0B" },
  { id: "profile", name: "Профиль", Icon: User, bgColor: "#ECFDF5", iconColor: "#10B981" },
];

export function Home() {
  const insetTop = 47;
  const userName = "patient";
  const unreadCount = 3;
  const teeth = 82;
  const gums = 76;

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F1F5F9" }}>
      <div className="flex flex-col" style={{ gap: 20 }}>
        {/* HEADER CARD */}
        <div
          className="bg-white"
          style={{
            paddingTop: insetTop + 16,
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: 20,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Top row: avatar + name | bell */}
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: 12 }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: "linear-gradient(135deg, #4A90D9 0%, #5BA3E5 100%)",
                }}
              >
                <User size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 12 }}>Привет 👋</div>
                <div style={{ color: "#4A90D9", fontSize: 18, fontWeight: 700 }}>{userName}</div>
              </div>
            </div>
            <button
              type="button"
              className="relative flex items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                border: "2px solid #E2E8F0",
                background: "#FFFFFF",
              }}
            >
              <Bell size={20} color="#64748B" />
              {unreadCount > 0 && (
                <span
                  className="absolute flex items-center justify-center"
                  style={{
                    top: 6,
                    right: 6,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 7,
                    background: "#EF4444",
                    color: "#FFFFFF",
                    fontSize: 8,
                    fontWeight: 700,
                    paddingLeft: 3,
                    paddingRight: 3,
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Promo banner */}
          <div
            className="relative overflow-hidden flex items-center"
            style={{
              borderRadius: 30,
              padding: 20,
              minHeight: 170,
              background: "linear-gradient(135deg, #5B9FE3 0%, #4A8FD3 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -20,
                width: 130,
                height: 130,
                borderRadius: 65,
                background: "rgba(255,255,255,0.1)",
              }}
            />
            <div className="flex flex-col" style={{ flex: 1, zIndex: 1 }}>
              <div
                className="self-start"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 4,
                  paddingBottom: 4,
                  borderRadius: 9999,
                  marginBottom: 12,
                }}
              >
                <span style={{ color: "#FFFFFF", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>АКЦИЯ</span>
              </div>
              <div style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 700, lineHeight: "28px", marginBottom: 4, whiteSpace: "pre-line" }}>
                {"Бесплатная\nдиагностика"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginBottom: 16 }}>
                Пройдите тест и получите рекомендации
              </div>
              <button
                type="button"
                className="self-start flex items-center"
                style={{
                  background: "#FFFFFF",
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingTop: 8,
                  paddingBottom: 8,
                  borderRadius: 9999,
                  gap: 8,
                }}
              >
                <Phone size={14} color="#4A90D9" />
                <span style={{ color: "#4A90D9", fontSize: 14, fontWeight: 600 }}>Начать тест</span>
              </button>
            </div>
            <div style={{ position: "absolute", right: 16, bottom: 16 }}>
              <ToothMascot />
            </div>
          </div>
        </div>

        {/* Urgent alert (sample) */}
        <div className="flex flex-col" style={{ gap: 8, paddingLeft: 16, paddingRight: 16 }}>
          <div
            style={{
              borderRadius: 24,
              padding: 12,
              borderLeft: "4px solid #EF5350",
              background: "#FFEBEE",
            }}
          >
            <div className="flex items-start" style={{ gap: 12 }}>
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 36, height: 36, borderRadius: 18, background: "#EF5350" }}
              >
                <AlertTriangle size={20} color="#FFF" />
              </div>
              <div className="flex flex-col" style={{ flex: 1, gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#C62828" }}>Срочно: запишитесь к стоматологу</div>
                <div style={{ fontSize: 12, color: "#C62828", opacity: 0.8 }}>Обнаружены признаки кариеса</div>
              </div>
            </div>
          </div>
        </div>

        {/* Teeth at risk */}
        <div className="flex flex-col" style={{ gap: 8 }}>
          <div style={{ paddingLeft: 16, paddingRight: 16, fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>Зубы под риском</div>
          <div style={{ paddingLeft: 16, paddingRight: 16 }}>
            <div
              style={{
                borderRadius: 24,
                padding: 12,
                borderLeft: "4px solid #FF9800",
                background: "#FFF3E0",
              }}
            >
              <div className="flex items-start" style={{ gap: 12 }}>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 36, height: 36, borderRadius: 18, background: "#FF9800" }}
                >
                  <AlertCircle size={20} color="#FFF" />
                </div>
                <div className="flex flex-col" style={{ flex: 1, gap: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#E65100" }}>3 зуба требуют внимания</div>
                  <div style={{ fontSize: 12, color: "#E65100", opacity: 0.8 }}>Зубы 16, 26, 36 — повышенный риск</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col" style={{ gap: 12 }}>
          <div style={{ paddingLeft: 16, paddingRight: 16, fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>Быстрые действия</div>
          <div className="flex" style={{ paddingLeft: 16, paddingRight: 16, gap: 12 }}>
            {QUICK_ACTIONS.map(({ id, name, Icon, bgColor, iconColor }) => (
              <div
                key={id}
                className="flex flex-col items-center"
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 18,
                  background: "#FFFFFF",
                  gap: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: 56, height: 56, borderRadius: 12, background: bgColor }}
                >
                  <Icon size={24} color={iconColor} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, textAlign: "center", color: "#1A1A2E" }}>{name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Health card */}
        <div
          style={{
            marginLeft: 16,
            marginRight: 16,
            background: "#FFFFFF",
            borderRadius: 30,
            padding: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
            <div
              className="flex items-center justify-center"
              style={{ width: 48, height: 48, borderRadius: 24, background: "#ECFDF5" }}
            >
              <Activity size={24} color="#10B981" />
            </div>
            <div className="flex flex-col" style={{ flex: 1, gap: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E" }}>Ваше здоровье</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>Последняя проверка</div>
            </div>
            <ChevronRight size={24} color="#64748B" />
          </div>
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center" style={{ flex: 1, gap: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#4A90D9" }}>{teeth}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>Зубы</div>
            </div>
            <div style={{ width: 1, height: 40, marginLeft: 20, marginRight: 20, background: "#E2E8F0" }} />
            <div className="flex flex-col items-center" style={{ flex: 1, gap: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#4A90D9" }}>{gums}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>Дёсны</div>
            </div>
          </div>
        </div>

        {/* Feedback banner */}
        <div
          className="flex items-center"
          style={{
            marginLeft: 16,
            marginRight: 16,
            background: "#FFFFFF",
            borderRadius: 30,
            padding: 16,
            gap: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 22, background: "#ECFDF5" }}
          >
            <MessageCircle size={20} color="#10B981" />
          </div>
          <div className="flex flex-col" style={{ flex: 1, gap: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A2E" }}>Бета-версия</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>Помогите улучшить приложение</div>
          </div>
          <ChevronRight size={20} color="#64748B" />
        </div>

        <div style={{ height: 96 }} />
      </div>
    </div>
  );
}
