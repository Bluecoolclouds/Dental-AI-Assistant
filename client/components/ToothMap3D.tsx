import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Svg, { Path, G, Defs, LinearGradient, Stop, Text as SvgText, Rect } from "react-native-svg";
import { Spacing, BorderRadius } from "@/constants/theme";

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

interface ToothMap3DProps {
  selectedTooth: number | null;
  onToothPress: (toothNumber: number) => void;
  getToothProblems: (toothNumber: number) => string[];
  getToothProblemColor: (toothNumber: number) => string;
  theme: any;
  archWidth: number;
}

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
      return `M ${w * 0.15} ${h * 0.1} Q ${w * 0.5} ${-h * 0.05} ${w * 0.85} ${h * 0.1} Q ${w * 1.0} ${h * 0.3} ${w * 0.95} ${h * 0.55} Q ${w * 0.85} ${h * 0.85} ${w * 0.5} ${h * 0.95} Q ${w * 0.15} ${h * 0.85} ${w * 0.05} ${h * 0.55} Q ${0} ${h * 0.3} ${w * 0.15} ${h * 0.1} Z`;
    case "canine":
      return `M ${w * 0.2} ${h * 0.15} Q ${w * 0.5} ${-h * 0.08} ${w * 0.8} ${h * 0.15} Q ${w * 1.0} ${h * 0.35} ${w * 0.9} ${h * 0.6} Q ${w * 0.75} ${h * 0.9} ${w * 0.5} ${h} Q ${w * 0.25} ${h * 0.9} ${w * 0.1} ${h * 0.6} Q ${0} ${h * 0.35} ${w * 0.2} ${h * 0.15} Z`;
    case "premolar":
      return `M ${w * 0.1} ${h * 0.15} Q ${w * 0.3} ${0} ${w * 0.5} ${h * 0.05} Q ${w * 0.7} ${0} ${w * 0.9} ${h * 0.15} Q ${w * 1.05} ${h * 0.4} ${w * 0.95} ${h * 0.65} Q ${w * 0.8} ${h * 0.95} ${w * 0.5} ${h} Q ${w * 0.2} ${h * 0.95} ${w * 0.05} ${h * 0.65} Q ${-w * 0.05} ${h * 0.4} ${w * 0.1} ${h * 0.15} Z`;
    case "molar":
      return `M ${w * 0.08} ${h * 0.2} Q ${w * 0.2} ${h * 0.02} ${w * 0.35} ${h * 0.05} Q ${w * 0.5} ${-h * 0.02} ${w * 0.65} ${h * 0.05} Q ${w * 0.8} ${h * 0.02} ${w * 0.92} ${h * 0.2} Q ${w * 1.05} ${h * 0.45} ${w * 0.95} ${h * 0.7} Q ${w * 0.82} ${h * 0.95} ${w * 0.5} ${h} Q ${w * 0.18} ${h * 0.95} ${w * 0.05} ${h * 0.7} Q ${-w * 0.05} ${h * 0.45} ${w * 0.08} ${h * 0.2} Z`;
  }
}

function getToothSurfacePath(type: ToothType, w: number, h: number): string {
  switch (type) {
    case "incisor":
      return `M ${w * 0.3} ${h * 0.25} Q ${w * 0.5} ${h * 0.15} ${w * 0.7} ${h * 0.25} Q ${w * 0.75} ${h * 0.45} ${w * 0.65} ${h * 0.6} Q ${w * 0.5} ${h * 0.65} ${w * 0.35} ${h * 0.6} Q ${w * 0.25} ${h * 0.45} ${w * 0.3} ${h * 0.25} Z`;
    case "canine":
      return `M ${w * 0.3} ${h * 0.25} Q ${w * 0.5} ${h * 0.12} ${w * 0.7} ${h * 0.25} Q ${w * 0.72} ${h * 0.45} ${w * 0.6} ${h * 0.6} Q ${w * 0.5} ${h * 0.65} ${w * 0.4} ${h * 0.6} Q ${w * 0.28} ${h * 0.45} ${w * 0.3} ${h * 0.25} Z`;
    case "premolar":
      return `M ${w * 0.25} ${h * 0.22} Q ${w * 0.4} ${h * 0.15} ${w * 0.5} ${h * 0.2} Q ${w * 0.6} ${h * 0.15} ${w * 0.75} ${h * 0.22} Q ${w * 0.8} ${h * 0.42} ${w * 0.7} ${h * 0.58} Q ${w * 0.5} ${h * 0.62} ${w * 0.3} ${h * 0.58} Q ${w * 0.2} ${h * 0.42} ${w * 0.25} ${h * 0.22} Z`;
    case "molar":
      return `M ${w * 0.2} ${h * 0.25} Q ${w * 0.35} ${h * 0.15} ${w * 0.5} ${h * 0.2} Q ${w * 0.65} ${h * 0.15} ${w * 0.8} ${h * 0.25} Q ${w * 0.85} ${h * 0.45} ${w * 0.75} ${h * 0.6} Q ${w * 0.5} ${h * 0.65} ${w * 0.25} ${h * 0.6} Q ${w * 0.15} ${h * 0.45} ${w * 0.2} ${h * 0.25} Z`;
  }
}

function getToothDimensions(type: ToothType, scale: number): { w: number; h: number } {
  switch (type) {
    case "incisor":
      return { w: 14 * scale, h: 18 * scale };
    case "canine":
      return { w: 15 * scale, h: 20 * scale };
    case "premolar":
      return { w: 16 * scale, h: 18 * scale };
    case "molar":
      return { w: 20 * scale, h: 20 * scale };
  }
}

function calculateArchPositions(
  teeth: number[],
  isUpper: boolean,
  svgWidth: number,
  centerY: number,
  archRadiusX: number,
  archRadiusY: number
): { toothNum: number; x: number; y: number; angle: number }[] {
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

export default function ToothMap3D({
  selectedTooth,
  onToothPress,
  getToothProblems,
  getToothProblemColor,
  theme,
  archWidth,
}: ToothMap3DProps) {
  const svgWidth = archWidth;
  const svgHeight = 340;
  const scale = Math.min(archWidth / 340, 1.1);
  const archRadiusX = svgWidth * 0.38;
  const archRadiusY = svgHeight * 0.22;
  const upperCenterY = svgHeight * 0.38;
  const lowerCenterY = svgHeight * 0.62;

  const upperPositions = calculateArchPositions(UPPER_TEETH, true, svgWidth, upperCenterY, archRadiusX, archRadiusY);
  const lowerPositions = calculateArchPositions(LOWER_TEETH, false, svgWidth, lowerCenterY, archRadiusX, archRadiusY);

  const renderTooth = (
    toothNum: number,
    x: number,
    y: number,
    angle: number,
    isUpper: boolean
  ) => {
    const type = getToothType(toothNum);
    const dims = getToothDimensions(type, scale);
    const problems = getToothProblems(toothNum);
    const hasProblems = problems.length > 0;
    const isSelected = selectedTooth === toothNum;
    const problemColor = hasProblems ? getToothProblemColor(toothNum) : "";

    const gradId = `grad_${toothNum}`;
    const surfaceGradId = `sgrad_${toothNum}`;
    const problemGradId = `pgrad_${toothNum}`;

    const outlinePath = getToothPath(type, dims.w, dims.h);
    const surfacePath = getToothSurfacePath(type, dims.w, dims.h);

    const labelY = isUpper ? dims.h + 10 * scale : -6 * scale;

    return (
      <G
        key={toothNum}
        onPress={() => onToothPress(toothNum)}
        transform={`translate(${x - dims.w / 2}, ${y - dims.h / 2}) rotate(${angle}, ${dims.w / 2}, ${dims.h / 2})`}
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hasProblems ? problemColor : "#FAFAFA"} stopOpacity={hasProblems ? "0.3" : "1"} />
            <Stop offset="0.3" stopColor={hasProblems ? problemColor : "#F5F5F5"} stopOpacity={hasProblems ? "0.15" : "0.95"} />
            <Stop offset="0.7" stopColor={hasProblems ? problemColor : "#E8E8E8"} stopOpacity={hasProblems ? "0.2" : "0.9"} />
            <Stop offset="1" stopColor={hasProblems ? problemColor : "#D5D5D5"} stopOpacity={hasProblems ? "0.35" : "0.85"} />
          </LinearGradient>
          <LinearGradient id={surfaceGradId} x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
            <Stop offset="0.5" stopColor="#F0F0F0" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#E0E0E0" stopOpacity="0.2" />
          </LinearGradient>
          {hasProblems ? (
            <LinearGradient id={problemGradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={problemColor} stopOpacity="0.4" />
              <Stop offset="1" stopColor={problemColor} stopOpacity="0.15" />
            </LinearGradient>
          ) : null}
        </Defs>
        <Path
          d={outlinePath}
          fill={`url(#${gradId})`}
          stroke={isSelected ? theme.primary : hasProblems ? problemColor : "#C0C0C0"}
          strokeWidth={isSelected ? 2.5 : 1}
          strokeOpacity={isSelected ? 1 : 0.7}
        />
        <Path
          d={surfacePath}
          fill={hasProblems ? `url(#${problemGradId})` : `url(#${surfaceGradId})`}
          stroke="none"
        />
        {isSelected ? (
          <Path
            d={outlinePath}
            fill="none"
            stroke={theme.primary}
            strokeWidth={3}
            strokeOpacity={0.4}
          />
        ) : null}
        <SvgText
          x={dims.w / 2}
          y={labelY}
          fontSize={9 * scale}
          fill={isSelected ? theme.primary : theme.textSecondary || "#888"}
          fontWeight={isSelected ? "700" : "500"}
          textAnchor="middle"
          transform={`rotate(${-angle}, ${dims.w / 2}, ${labelY})`}
        >
          {toothNum % 10}
        </SvgText>
      </G>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary + "15", borderRadius: BorderRadius.md }]}>
      <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.primary} stopOpacity="0.08" />
            <Stop offset="0.5" stopColor={theme.primary} stopOpacity="0.03" />
            <Stop offset="1" stopColor={theme.primary} stopOpacity="0.08" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={svgWidth} height={svgHeight} fill="url(#bgGrad)" rx={BorderRadius.md} />
        {upperPositions.map((pos) =>
          renderTooth(pos.toothNum, pos.x, pos.y, pos.angle, true)
        )}
        {lowerPositions.map((pos) =>
          renderTooth(pos.toothNum, pos.x, pos.y, pos.angle, false)
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    overflow: "hidden",
  },
});
