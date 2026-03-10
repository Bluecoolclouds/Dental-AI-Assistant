function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

interface AvatarConfig {
  icon: string;
  colors: [string, string];
}

const FEMALE_VARIANTS: AvatarConfig[] = [
  { icon: "heart",    colors: ["#FF8FAB", "#E91E63"] },
  { icon: "sun",      colors: ["#F8A5C2", "#D81B60"] },
  { icon: "star",     colors: ["#F48FB1", "#AD1457"] },
  { icon: "smile",    colors: ["#FF80AB", "#C2185B"] },
  { icon: "feather",  colors: ["#FFCDD2", "#E91E63"] },
  { icon: "music",    colors: ["#F06292", "#880E4F"] },
  { icon: "gift",     colors: ["#FF8FA3", "#D81B60"] },
  { icon: "moon",     colors: ["#EF9A9A", "#C62828"] },
  { icon: "umbrella", colors: ["#FCE4EC", "#F06292"] },
];

const MALE_VARIANTS: AvatarConfig[] = [
  { icon: "shield",    colors: ["#5B9FE3", "#1565C0"] },
  { icon: "compass",   colors: ["#64B5F6", "#1976D2"] },
  { icon: "target",    colors: ["#4FC3F7", "#0277BD"] },
  { icon: "anchor",    colors: ["#4DD0E1", "#00838F"] },
  { icon: "activity",  colors: ["#80DEEA", "#00695C"] },
  { icon: "zap",       colors: ["#42A5F5", "#0D47A1"] },
  { icon: "globe",     colors: ["#29B6F6", "#006064"] },
  { icon: "navigation",colors: ["#4FC3F7", "#0288D1"] },
  { icon: "award",     colors: ["#26C6DA", "#00838F"] },
];

const NEUTRAL_VARIANTS: AvatarConfig[] = [
  { icon: "user",   colors: ["#5B9FE3", "#4A90D9"] },
  { icon: "smile",  colors: ["#7986CB", "#3949AB"] },
  { icon: "star",   colors: ["#9575CD", "#4527A0"] },
];

export function getDefaultAvatar(gender: string | null, seed: string): AvatarConfig {
  const hash = simpleHash(seed || "default");

  if (gender === "female") {
    return FEMALE_VARIANTS[hash % FEMALE_VARIANTS.length];
  } else if (gender === "male") {
    return MALE_VARIANTS[hash % MALE_VARIANTS.length];
  }
  return NEUTRAL_VARIANTS[hash % NEUTRAL_VARIANTS.length];
}
