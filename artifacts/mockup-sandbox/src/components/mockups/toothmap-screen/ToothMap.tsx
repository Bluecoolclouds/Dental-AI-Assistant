import { useState } from "react";
import {
  Zap, Slash, Square, Droplet, Wind, Circle, CheckCircle,
  Info, Clock, Folder, Plus, ChevronRight, X
} from "lucide-react";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const primary = "#4A90D9";

const PROBLEM_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  pain:        { label: "Боль",            color: "#F44336", Icon: Zap },
  chip:        { label: "Скол",            color: "#9C27B0", Icon: Slash },
  filling:     { label: "Пломба",          color: "#2196F3", Icon: Square },
  bleeding:    { label: "Кровоточивость",  color: "#E91E63", Icon: Droplet },
  sensitivity: { label: "Чувствительность",color: "#FF9800", Icon: Wind },
  cavity:      { label: "Кариес",          color: "#795548", Icon: Circle },
  treated:     { label: "Вылечен",         color: "#4CAF50", Icon: CheckCircle },
};

const SAMPLE_PROBLEMS: Record<number, string[]> = {
  16: ["cavity"],
  11: ["pain"],
  26: ["filling"],
  36: ["treated"],
  46: ["sensitivity"],
  44: ["bleeding"],
};

const SAMPLE_HISTORY = [
  { id: 1, toothId: "16", reason: "Обнаружен кариес на жевательной поверхности", eventType: "treatment", source: "ai", priority: "urgent", date: "3 мая 2026", doctorName: "", clinicName: "" },
  { id: 2, toothId: "36", reason: "Пломбирование завершено успешно", eventType: "resolved", source: "user", priority: "routine", date: "28 апр. 2026", doctorName: "Иванова А.В.", clinicName: "Dental City" },
];

function calculateArchPosition(index: number, total: number, isUpper: boolean, archWidth: number, archHeight: number) {
  const normalizedIndex = index / (total - 1);
  const angle = Math.PI * (0.15 + normalizedIndex * 0.7);
  const radiusX = archWidth / 2 - 20;
  const radiusY = archHeight - 30;
  const x = archWidth / 2 - Math.cos(angle) * radiusX;
  const y = isUpper
    ? archHeight - Math.sin(angle) * radiusY - 10
    : Math.sin(angle) * radiusY + 10;
  const isBackTooth = index < 3 || index > total - 4;
  const size = isBackTooth ? 24 : 20;
  return { x, y, size };
}

function ToothArch({ teeth, isUpper, archWidth, archHeight, selectedTooth, onToothPress, problems }:
  { teeth: number[]; isUpper: boolean; archWidth: number; archHeight: number;
    selectedTooth: number | null; onToothPress: (n: number) => void;
    problems: Record<number, string[]> }) {

  return (
    <div style={{ position: "relative", width: archWidth, height: archHeight }}>
      <svg width={archWidth} height={archHeight} viewBox={`0 0 ${archWidth} ${archHeight}`} style={{ position: "absolute", top: 0, left: 0 }}>
        {teeth.map((toothNum, index) => {
          const pos = calculateArchPosition(index, teeth.length, isUpper, archWidth, archHeight);
          const toothProblems = problems[toothNum] || [];
          const hasProblems = toothProblems.length > 0;
          const isSelected = selectedTooth === toothNum;
          let fill = "#FFFFFF";
          let stroke = "#D0D0D0";
          if (isSelected) stroke = primary;
          if (hasProblems) {
            const p = toothProblems[0];
            const color = PROBLEM_CONFIG[p]?.color || primary;
            fill = color + "40";
            stroke = isSelected ? primary : color;
          }
          return (
            <g key={toothNum} onClick={() => onToothPress(toothNum)} style={{ cursor: "pointer" }}>
              <ellipse
                cx={pos.x} cy={pos.y}
                rx={pos.size / 2} ry={pos.size / 2 * 1.2}
                fill={fill}
                stroke={stroke}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {hasProblems && (
                <ellipse
                  cx={pos.x} cy={pos.y}
                  rx={4} ry={4}
                  fill={PROBLEM_CONFIG[toothProblems[0]]?.color || primary}
                />
              )}
            </g>
          );
        })}
      </svg>
      {/* Tooth numbers overlay */}
      <div style={{ position: "absolute", top: 0, left: 0, width: archWidth, height: archHeight }}>
        {teeth.map((toothNum, index) => {
          const pos = calculateArchPosition(index, teeth.length, isUpper, archWidth, archHeight);
          const isSelected = selectedTooth === toothNum;
          return (
            <button
              key={toothNum}
              onClick={() => onToothPress(toothNum)}
              style={{
                position: "absolute",
                left: pos.x - 12, top: pos.y - 12,
                width: 24, height: 24,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? primary : "#888",
              }}
            >
              {toothNum % 10}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ToothMap() {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [problems] = useState(SAMPLE_PROBLEMS);
  const [activeTab, setActiveTab] = useState<"history" | "files">("history");
  const [hasNote, setHasNote] = useState(false);
  const [note, setNote] = useState("");

  const archWidth = 320;
  const archHeight = 120;

  const handleToothPress = (n: number) => setSelectedTooth(selectedTooth === n ? null : n);

  const selectedProblems = selectedTooth ? (problems[selectedTooth] || []) : [];
  const markedCount = Object.keys(problems).length;
  const totalProblems = Object.values(problems).reduce((acc, arr) => acc + arr.filter(p => p !== "treated").length, 0);

  return (
    <div style={{ backgroundColor: "#F1F5F9", minHeight: "100vh", width: "100%", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 80 }}>

        {/* ── TOOTH MAP CARD ── */}
        <div style={card}>
          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "row", gap: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FBBF24" }} />
              <span style={{ fontSize: 11, color: "#888" }}>Вылечен</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#4A90D9" }} />
              <span style={{ fontSize: 11, color: "#888" }}>Боль</span>
            </div>
          </div>

          {/* Arch container */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: "#8FA3BF", textTransform: "uppercase", letterSpacing: 1.5 }}>
              Верхняя челюсть
            </span>

            <ToothArch
              teeth={UPPER_TEETH}
              isUpper={true}
              archWidth={archWidth}
              archHeight={archHeight}
              selectedTooth={selectedTooth}
              onToothPress={handleToothPress}
              problems={problems}
            />

            {/* Separator */}
            <div style={{ width: "100%", height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "60%", height: 2, borderRadius: 1, backgroundColor: "#E8EDF3" }} />
            </div>

            <ToothArch
              teeth={LOWER_TEETH}
              isUpper={false}
              archWidth={archWidth}
              archHeight={archHeight}
              selectedTooth={selectedTooth}
              onToothPress={handleToothPress}
              problems={problems}
            />

            <span style={{ fontSize: 10, fontWeight: 500, color: "#8FA3BF", textTransform: "uppercase", letterSpacing: 1.5 }}>
              Нижняя челюсть
            </span>
          </div>
        </div>

        {/* ── SELECTED TOOTH CARD ── */}
        {selectedTooth ? (
          <div style={card}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1A2B4A" }}>Зуб {selectedTooth % 10}</div>
                <div style={{ fontSize: 12, color: "#8FA3BF" }}>Позиция: {selectedTooth}</div>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                style={{ width: 32, height: 32, borderRadius: 16, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} color="#8FA3BF" />
              </button>
            </div>

            {/* Treated banner */}
            {selectedProblems.includes("treated") && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid #4CAF50", background: "#E8F5E9", marginBottom: 12 }}>
                <CheckCircle size={18} color="#4CAF50" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "#2E7D32", lineHeight: 1.4 }}>
                  Зуб вылечен. Чтобы снова отмечать проблемы, выберите их ниже — статус «вылечен» будет снят.
                </span>
              </div>
            )}

            <div style={{ fontSize: 12, color: "#8FA3BF", marginBottom: 10 }}>Отметьте проблемы:</div>

            {/* Problem buttons */}
            <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(PROBLEM_CONFIG).filter(([k]) => k !== "treated").map(([key, cfg]) => {
                const isActive = selectedProblems.filter(p => p !== "treated").includes(key);
                return (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    paddingTop: 7, paddingBottom: 7, paddingLeft: 12, paddingRight: 12,
                    borderRadius: 10, borderWidth: 1.5, borderStyle: "solid",
                    borderColor: isActive ? cfg.color : "transparent",
                    backgroundColor: isActive ? cfg.color + "18" : "#F1F5F9",
                    cursor: "pointer",
                  }}>
                    <cfg.Icon size={16} color={isActive ? cfg.color : "#B0BEC5"} />
                    <span style={{ fontSize: 13, color: isActive ? cfg.color : "#555" }}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Mark as healed */}
            {!selectedProblems.includes("treated") && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 14, paddingTop: 11, paddingBottom: 11,
                borderRadius: 10, border: "1.5px solid #4CAF50", background: "#E8F5E9",
                cursor: "pointer",
              }}>
                <CheckCircle size={18} color="#4CAF50" />
                <span style={{ fontSize: 13, color: "#2E7D32", fontWeight: 600 }}>Отметить как вылеченный</span>
              </div>
            )}

            {/* Custom note checkbox */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                onClick={() => setHasNote(!hasNote)}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  border: `2px solid ${hasNote ? primary : "#D0D9E5"}`,
                  backgroundColor: hasNote ? primary : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {hasNote && <span style={{ color: "#fff", fontSize: 14, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, color: "#1A2B4A" }}>Описать проблему своими словами</span>
              </div>

              {hasNote && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Опишите жалобы..."
                    rows={4}
                    style={{
                      width: "100%", boxSizing: "border-box", padding: 12,
                      borderRadius: 10, border: "1px solid #D0D9E5",
                      backgroundColor: "#F8FAFC", color: "#1A2B4A",
                      fontSize: 14, lineHeight: 1.5, resize: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <button style={{
                    marginTop: 8, display: "flex", alignItems: "center", gap: 6,
                    paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16,
                    borderRadius: 8, border: "none", backgroundColor: primary,
                    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    Сохранить
                  </button>
                  <div style={{ fontSize: 11, color: "#8FA3BF", marginTop: 6 }}>
                    Эта информация будет использоваться ИИ-консультантом
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── HINT CARD when nothing selected ── */
          <div style={{ ...card, display: "flex", flexDirection: "row", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: primary + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Info size={20} color={primary} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2B4A", marginBottom: 3 }}>Как использовать</div>
              <div style={{ fontSize: 12, color: "#8FA3BF", lineHeight: 1.4 }}>Нажмите на зуб на схеме, чтобы выбрать его и отметить проблемы</div>
            </div>
          </div>
        )}

        {/* ── STATS CARD ── */}
        <div style={{ ...card, display: "flex", flexDirection: "row", alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: primary, lineHeight: 1 }}>{markedCount}</div>
            <div style={{ fontSize: 12, color: "#8FA3BF" }}>Зубов отмечено</div>
          </div>
          <div style={{ width: 1, height: 48, backgroundColor: "#E8EDF3", margin: "0 16px" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#FF9800", lineHeight: 1 }}>{totalProblems}</div>
            <div style={{ fontSize: 12, color: "#8FA3BF" }}>Всего проблем</div>
          </div>
        </div>

        {/* ── LEGEND SECTION ── */}
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2B4A", marginBottom: 12 }}>Типы проблем</div>
          <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {Object.entries(PROBLEM_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, width: "44%" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: cfg.color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <cfg.Icon size={14} color={cfg.color} />
                </div>
                <span style={{ fontSize: 12, color: "#1A2B4A" }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── HISTORY / FILES TABS CARD ── */}
        <div style={card}>
          {/* Tabs */}
          <div style={{ display: "flex", flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {(["history", "files"] as const).map(tab => {
              const isActive = activeTab === tab;
              const Icon = tab === "history" ? Clock : Folder;
              const label = tab === "history" ? "История" : "Файлы";
              return (
                <div
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    paddingTop: 10, paddingBottom: 10,
                    borderRadius: 10, cursor: "pointer",
                    backgroundColor: isActive ? primary + "18" : "transparent",
                  }}
                >
                  <Icon size={16} color={isActive ? primary : "#8FA3BF"} />
                  <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? primary : "#8FA3BF" }}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === "history" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Add button */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                paddingTop: 12, paddingBottom: 12,
                borderRadius: 10, backgroundColor: primary, cursor: "pointer",
              }}>
                <Plus size={18} color="#fff" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Добавить запись</span>
              </div>

              {/* History items */}
              {SAMPLE_HISTORY.map((item, i) => {
                const isResolved = item.eventType === "resolved";
                const borderColor = isResolved ? "#4CAF50" : item.priority === "urgent" ? "#F44336" : primary;
                return (
                  <div key={item.id}>
                    {i === 0 || SAMPLE_HISTORY[i - 1].date !== item.date ? (
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#8FA3BF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: i > 0 ? 8 : 0 }}>
                        {item.date}
                      </div>
                    ) : null}
                    <div style={{
                      padding: 12, borderRadius: 10,
                      backgroundColor: "#F8FAFC",
                      borderLeft: `3px solid ${borderColor}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: primary, backgroundColor: primary + "20", borderRadius: 6, padding: "2px 8px" }}>
                            {item.toothId}
                          </span>
                          {isResolved && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#4CAF50", backgroundColor: "#4CAF5020", borderRadius: 6, padding: "2px 8px" }}>
                              Вылечен
                            </span>
                          )}
                          {item.priority === "urgent" && !isResolved && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#F44336", backgroundColor: "#F4433620", borderRadius: 6, padding: "2px 8px" }}>
                              Срочно
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "#8FA3BF" }}>{item.source === "ai" ? "ИИ" : "Вы"}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#1A2B4A", lineHeight: 1.4 }}>{item.reason}</div>
                      {(item.doctorName || item.clinicName) && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #E8EDF3" }}>
                          {item.doctorName && <div style={{ fontSize: 11, color: "#8FA3BF" }}>Врач: {item.doctorName}</div>}
                          {item.clinicName && <div style={{ fontSize: 11, color: "#8FA3BF" }}>Клиника: {item.clinicName}</div>}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, backgroundColor: "#F1F5F9", cursor: "pointer" }}>
                          <ChevronRight size={14} color="#8FA3BF" />
                          <span style={{ fontSize: 12, color: "#8FA3BF" }}>Подробнее</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 32, paddingBottom: 32, gap: 8 }}>
              <Folder size={32} color="#D0DAEC" />
              <div style={{ fontSize: 14, color: "#8FA3BF", textAlign: "center" }}>Нет файлов</div>
              <div style={{ fontSize: 12, color: "#B0BEC5", textAlign: "center" }}>Добавьте снимки, КТ или документы</div>
            </div>
          )}
        </div>

      </div>

      {/* Bottom tab bar simulation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: 70, backgroundColor: "#fff",
        borderTop: "1px solid #E8EDF3",
        display: "flex", alignItems: "flex-start", justifyContent: "space-around",
        paddingTop: 10,
      }}>
        {[
          { icon: "🏠", label: "Главная" },
          { icon: "🦷", label: "Карта", active: true },
          { icon: "💬", label: "ИИ" },
          { icon: "👤", label: "Профиль" },
        ].map(tab => (
          <div key={tab.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab.active ? 600 : 400, color: tab.active ? primary : "#8FA3BF" }}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  margin: "0 16px",
  backgroundColor: "#fff",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
