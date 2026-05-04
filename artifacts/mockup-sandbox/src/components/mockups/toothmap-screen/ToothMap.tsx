import { useState } from "react";
import { MapPin, X, CheckCircle, Zap, Slash, Square, Droplet, Wind, Circle } from "lucide-react";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const PROBLEM_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  pain:        { label: "Боль",          color: "#F44336", Icon: Zap },
  chip:        { label: "Скол",          color: "#9C27B0", Icon: Slash },
  filling:     { label: "Пломба",        color: "#2196F3", Icon: Square },
  bleeding:    { label: "Кровоточивость", color: "#E91E63", Icon: Droplet },
  sensitivity: { label: "Чувствит.",     color: "#FF9800", Icon: Wind },
  cavity:      { label: "Кариес",        color: "#795548", Icon: Circle },
};

const SAMPLE_PROBLEMS: Record<number, { problems: string[] }> = {
  16: { problems: ["cavity"] },
  11: { problems: ["pain"] },
  26: { problems: ["filling"] },
  36: { problems: ["treated"] },
  46: { problems: ["sensitivity"] },
  44: { problems: ["bleeding"] },
};

type ToothType = "incisor" | "canine" | "premolar" | "molar";

function getToothType(toothNum: number): ToothType {
  const pos = toothNum % 10;
  if (pos <= 2) return "incisor";
  if (pos === 3) return "canine";
  if (pos <= 5) return "premolar";
  return "molar";
}

function getToothPath(type: ToothType, w: number, h: number): string {
  switch (type) {
    case "incisor":
      return `M ${w*0.15} ${h*0.1} Q ${w*0.5} ${-h*0.05} ${w*0.85} ${h*0.1} Q ${w} ${h*0.3} ${w*0.95} ${h*0.55} Q ${w*0.85} ${h*0.85} ${w*0.5} ${h*0.95} Q ${w*0.15} ${h*0.85} ${w*0.05} ${h*0.55} Q 0 ${h*0.3} ${w*0.15} ${h*0.1} Z`;
    case "canine":
      return `M ${w*0.2} ${h*0.15} Q ${w*0.5} ${-h*0.08} ${w*0.8} ${h*0.15} Q ${w} ${h*0.35} ${w*0.9} ${h*0.6} Q ${w*0.75} ${h*0.9} ${w*0.5} ${h} Q ${w*0.25} ${h*0.9} ${w*0.1} ${h*0.6} Q 0 ${h*0.35} ${w*0.2} ${h*0.15} Z`;
    case "premolar":
      return `M ${w*0.1} ${h*0.15} Q ${w*0.3} 0 ${w*0.5} ${h*0.05} Q ${w*0.7} 0 ${w*0.9} ${h*0.15} Q ${w*1.05} ${h*0.4} ${w*0.95} ${h*0.65} Q ${w*0.8} ${h*0.95} ${w*0.5} ${h} Q ${w*0.2} ${h*0.95} ${w*0.05} ${h*0.65} Q ${-w*0.05} ${h*0.4} ${w*0.1} ${h*0.15} Z`;
    case "molar":
      return `M ${w*0.08} ${h*0.2} Q ${w*0.2} ${h*0.02} ${w*0.35} ${h*0.05} Q ${w*0.5} ${-h*0.02} ${w*0.65} ${h*0.05} Q ${w*0.8} ${h*0.02} ${w*0.92} ${h*0.2} Q ${w*1.05} ${h*0.45} ${w*0.95} ${h*0.7} Q ${w*0.82} ${h*0.95} ${w*0.5} ${h} Q ${w*0.18} ${h*0.95} ${w*0.05} ${h*0.7} Q ${-w*0.05} ${h*0.45} ${w*0.08} ${h*0.2} Z`;
  }
}

function getToothDims(type: ToothType, scale: number): { w: number; h: number } {
  switch (type) {
    case "incisor":  return { w: 14 * scale, h: 18 * scale };
    case "canine":   return { w: 15 * scale, h: 20 * scale };
    case "premolar": return { w: 16 * scale, h: 18 * scale };
    case "molar":    return { w: 20 * scale, h: 20 * scale };
  }
}

function calculateArchPositions(
  teeth: number[], isUpper: boolean, svgWidth: number,
  centerY: number, archRadiusX: number, archRadiusY: number
) {
  const total = teeth.length;
  return teeth.map((toothNum, index) => {
    const t = index / (total - 1);
    const angle = Math.PI * (0.12 + t * 0.76);
    const cx = svgWidth / 2;
    const x = cx - Math.cos(angle) * archRadiusX;
    const y = isUpper
      ? centerY - Math.sin(angle) * archRadiusY
      : centerY + Math.sin(angle) * archRadiusY;
    const rotation = isUpper
      ? (angle * 180) / Math.PI - 90
      : -((angle * 180) / Math.PI - 90);
    return { toothNum, x, y, angle: rotation };
  });
}

function getProblemColor(problems: string[]): string {
  if (!problems || problems.length === 0) return "";
  if (problems.includes("treated")) return "#4CAF50";
  const p = problems[0];
  return PROBLEM_CONFIG[p]?.color || "#888";
}

function ToothMapSvg({
  selectedTooth,
  onToothPress,
  toothData,
}: {
  selectedTooth: number | null;
  onToothPress: (n: number) => void;
  toothData: typeof SAMPLE_PROBLEMS;
}) {
  const svgWidth = 310;
  const svgHeight = 300;
  const scale = 0.9;
  const archRadiusX = svgWidth * 0.38;
  const archRadiusY = svgHeight * 0.22;
  const upperCenterY = svgHeight * 0.38;
  const lowerCenterY = svgHeight * 0.62;
  const primary = "#4A90D9";

  const upperPositions = calculateArchPositions(UPPER_TEETH, true, svgWidth, upperCenterY, archRadiusX, archRadiusY);
  const lowerPositions = calculateArchPositions(LOWER_TEETH, false, svgWidth, lowerCenterY, archRadiusX, archRadiusY);

  const renderTooth = (toothNum: number, x: number, y: number, angle: number, isUpper: boolean) => {
    const type = getToothType(toothNum);
    const dims = getToothDims(type, scale);
    const entry = toothData[toothNum];
    const problems = entry?.problems || [];
    const hasProblems = problems.length > 0;
    const isSelected = selectedTooth === toothNum;
    const problemColor = getProblemColor(problems);
    const path = getToothPath(type, dims.w, dims.h);
    const labelY = isUpper ? dims.h + 9 * scale : -5 * scale;
    const gradId = `g${toothNum}`;

    return (
      <g
        key={toothNum}
        onClick={() => onToothPress(toothNum)}
        transform={`translate(${x - dims.w / 2}, ${y - dims.h / 2}) rotate(${angle}, ${dims.w / 2}, ${dims.h / 2})`}
        style={{ cursor: "pointer" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hasProblems ? problemColor : "#FAFAFA"} stopOpacity={hasProblems ? 0.3 : 1} />
            <stop offset="1" stopColor={hasProblems ? problemColor : "#D5D5D5"} stopOpacity={hasProblems ? 0.35 : 0.85} />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill={`url(#${gradId})`}
          stroke={isSelected ? primary : hasProblems ? problemColor : "#C0C0C0"}
          strokeWidth={isSelected ? 2.5 : 1}
          strokeOpacity={isSelected ? 1 : 0.7}
        />
        {isSelected && (
          <path d={path} fill="none" stroke={primary} strokeWidth={3} strokeOpacity={0.35} />
        )}
        <text
          x={dims.w / 2}
          y={labelY}
          fontSize={9 * scale}
          fill={isSelected ? primary : "#999"}
          fontWeight={isSelected ? "700" : "500"}
          textAnchor="middle"
          transform={`rotate(${-angle}, ${dims.w / 2}, ${labelY})`}
          style={{ userSelect: "none" }}
        >
          {toothNum % 10}
        </text>
      </g>
    );
  };

  return (
    <div style={{ borderRadius: 12, background: `${primary}15`, padding: 8 }}>
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill={`${primary}08`} rx="12" />
        {upperPositions.map((p) => renderTooth(p.toothNum, p.x, p.y, p.angle, true))}
        {lowerPositions.map((p) => renderTooth(p.toothNum, p.x, p.y, p.angle, false))}
        <text x={svgWidth / 2} y={upperCenterY - archRadiusY - 12} textAnchor="middle" fontSize={10} fill="#999" style={{ userSelect: "none" }}>
          Верхняя челюсть
        </text>
        <text x={svgWidth / 2} y={lowerCenterY + archRadiusY + 18} textAnchor="middle" fontSize={10} fill="#999" style={{ userSelect: "none" }}>
          Нижняя челюсть
        </text>
      </svg>
    </div>
  );
}

export function ToothMap() {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(16);
  const [toothData] = useState(SAMPLE_PROBLEMS);

  const insetTop = 47;
  const primary = "#4A90D9";

  const selectedEntry = selectedTooth ? toothData[selectedTooth] : null;
  const selectedProblems = selectedEntry?.problems || [];

  const handleToothPress = (n: number) => {
    setSelectedTooth(selectedTooth === n ? null : n);
  };

  const affectedCount = Object.keys(toothData).filter(
    k => (toothData[Number(k)].problems || []).some(p => p !== "treated")
  ).length;
  const treatedCount = Object.keys(toothData).filter(
    k => (toothData[Number(k)].problems || []).includes("treated")
  ).length;

  return (
    <div className="w-full min-h-screen" style={{ backgroundColor: "#F1F5F9", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* HEADER */}
        <div style={{
          background: "white",
          paddingTop: insetTop + 16,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 16,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: `linear-gradient(135deg, ${primary} 0%, #5BA3E5 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MapPin size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1A2B4A" }}>Карта зубов</div>
              <div style={{ fontSize: 12, color: "#8FA3BF" }}>Нажмите на зуб, чтобы отметить проблему</div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <div style={{
              flex: 1, background: "#FFF3F3", borderRadius: 12, padding: "8px 12px",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#F44336" }}>{affectedCount}</div>
              <div style={{ fontSize: 11, color: "#888" }}>с проблемами</div>
            </div>
            <div style={{
              flex: 1, background: "#F0FAF4", borderRadius: 12, padding: "8px 12px",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#4CAF50" }}>{treatedCount}</div>
              <div style={{ fontSize: 11, color: "#888" }}>вылечено</div>
            </div>
            <div style={{
              flex: 1, background: "#EBF5FF", borderRadius: 12, padding: "8px 12px",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: primary }}>32</div>
              <div style={{ fontSize: 11, color: "#888" }}>всего зубов</div>
            </div>
          </div>
        </div>

        {/* LEGEND */}
        <div style={{
          marginLeft: 16, marginRight: 16,
          background: "white", borderRadius: 16, padding: "10px 14px",
          display: "flex", gap: 16, flexWrap: "wrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          {Object.entries(PROBLEM_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: cfg.color }} />
              <span style={{ fontSize: 11, color: "#666" }}>{cfg.label}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: "#4CAF50" }} />
            <span style={{ fontSize: 11, color: "#666" }}>Вылечен</span>
          </div>
        </div>

        {/* TOOTH MAP */}
        <div style={{
          marginLeft: 16, marginRight: 16,
          background: "white", borderRadius: 20, padding: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex", justifyContent: "center",
        }}>
          <ToothMapSvg
            selectedTooth={selectedTooth}
            onToothPress={handleToothPress}
            toothData={toothData}
          />
        </div>

        {/* SELECTED TOOTH PANEL */}
        {selectedTooth ? (
          <div style={{
            marginLeft: 16, marginRight: 16,
            background: "white", borderRadius: 20, padding: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2B4A" }}>
                  Зуб {selectedTooth % 10}
                </div>
                <div style={{ fontSize: 12, color: "#8FA3BF" }}>Позиция: {selectedTooth}</div>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  background: "#F1F5F9", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={16} color="#8FA3BF" />
              </button>
            </div>

            {selectedProblems.includes("treated") && (
              <div style={{
                background: "#E8F5E9", borderRadius: 10, padding: "8px 12px",
                border: "1px solid #4CAF50", display: "flex", alignItems: "center",
                gap: 8, marginBottom: 12,
              }}>
                <CheckCircle size={16} color="#4CAF50" />
                <span style={{ fontSize: 12, color: "#2E7D32" }}>
                  Зуб вылечен
                </span>
              </div>
            )}

            <div style={{ fontSize: 12, color: "#8FA3BF", marginBottom: 10 }}>Отметьте проблемы:</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {Object.entries(PROBLEM_CONFIG).map(([key, cfg]) => {
                const isActive = selectedProblems.filter(p => p !== "treated").includes(key);
                return (
                  <div
                    key={key}
                    style={{
                      borderRadius: 12,
                      padding: "10px 8px",
                      background: isActive ? cfg.color + "18" : "#F8FAFC",
                      border: `1.5px solid ${isActive ? cfg.color : "transparent"}`,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 4, cursor: "pointer",
                    }}
                  >
                    <cfg.Icon size={16} color={isActive ? cfg.color : "#B0BEC5"} />
                    <span style={{ fontSize: 10, color: isActive ? cfg.color : "#888", textAlign: "center", lineHeight: 1.2 }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {!selectedProblems.includes("treated") && (
              <button style={{
                marginTop: 12, width: "100%", padding: "10px 0",
                borderRadius: 12, border: "1.5px solid #4CAF50",
                background: "#F0FAF4", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <CheckCircle size={16} color="#4CAF50" />
                <span style={{ fontSize: 13, color: "#2E7D32", fontWeight: 600 }}>Отметить как вылеченный</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{
            marginLeft: 16, marginRight: 16,
            background: "white", borderRadius: 20, padding: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <MapPin size={28} color="#D0DAEC" />
            <div style={{ fontSize: 14, color: "#B0BEC5", textAlign: "center" }}>
              Выберите зуб на схеме, чтобы просмотреть или отметить проблемы
            </div>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
