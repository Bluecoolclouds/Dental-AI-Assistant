/**
 * User Memory System — нейронная память клиентов
 * Двойное хранение: PostgreSQL (быстрый доступ) + OpenClaw файлы (агентская рефлексия)
 */
import fs from "fs";
import path from "path";
import { pool } from "./db.js";

const OPENCLAW_PATIENTS_DIR = path.join(
  process.env.HOME || "/home/runner",
  ".openclaw/workspace/patients"
);

export interface MemoryNode {
  segment: string;
  category: string;
  content: string;
  relatedTeeth?: string[];
  confidence?: number;
  source?: string;
}

export interface MemoryUpdate extends MemoryNode {
  action: "upsert" | "delete";
}

// Загрузить все узлы памяти пользователя из БД
export async function loadUserMemory(userId: string): Promise<MemoryNode[]> {
  try {
    const result = await pool.query(
      `SELECT segment, category, content, related_teeth, confidence, source
       FROM user_memory_nodes
       WHERE user_id = $1
       ORDER BY category, segment`,
      [userId]
    );
    return result.rows.map((row) => ({
      segment: row.segment,
      category: row.category,
      content: row.content,
      relatedTeeth: row.related_teeth || [],
      confidence: row.confidence,
      source: row.source,
    }));
  } catch (err) {
    console.error("[Memory] loadUserMemory error:", err);
    return [];
  }
}

// Сохранить/обновить узлы памяти (upsert по userId+segment)
export async function saveMemoryUpdates(
  userId: string,
  updates: MemoryUpdate[]
): Promise<void> {
  if (!updates || updates.length === 0) return;

  for (const upd of updates) {
    try {
      if (upd.action === "delete") {
        await pool.query(
          `DELETE FROM user_memory_nodes WHERE user_id = $1 AND segment = $2`,
          [userId, upd.segment]
        );
      } else {
        await pool.query(
          `INSERT INTO user_memory_nodes
             (user_id, segment, category, content, related_teeth, confidence, source, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (user_id, segment)
           DO UPDATE SET
             content = EXCLUDED.content,
             category = EXCLUDED.category,
             related_teeth = EXCLUDED.related_teeth,
             confidence = EXCLUDED.confidence,
             updated_at = NOW()`,
          [
            userId,
            upd.segment,
            upd.category,
            upd.content,
            JSON.stringify(upd.relatedTeeth || []),
            upd.confidence ?? 80,
            upd.source || "ai",
          ]
        );
      }
    } catch (err) {
      console.error(`[Memory] saveMemoryUpdates error for segment ${upd.segment}:`, err);
    }
  }

  // Синхронизируем с файлами OpenClaw
  syncToOpenClawFiles(userId, updates).catch((e) =>
    console.error("[Memory] syncToOpenClawFiles error:", e)
  );
}

// Синхронизировать узлы памяти в OpenClaw skill файлы
async function syncToOpenClawFiles(
  userId: string,
  updates: MemoryUpdate[]
): Promise<void> {
  const userDir = path.join(OPENCLAW_PATIENTS_DIR, userId);

  try {
    fs.mkdirSync(userDir, { recursive: true });

    for (const upd of updates) {
      const safeSegment = upd.segment.replace(/[^a-z0-9_-]/gi, "_");
      const filePath = path.join(userDir, `${safeSegment}.md`);

      if (upd.action === "delete") {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        continue;
      }

      const teeth =
        upd.relatedTeeth && upd.relatedTeeth.length > 0
          ? `\nrelated_teeth: [${upd.relatedTeeth.join(", ")}]`
          : "";

      const content = `---
title: ${upd.segment}
category: ${upd.category}
confidence: ${upd.confidence ?? 80}
source: ${upd.source || "ai"}
updated: ${new Date().toISOString().split("T")[0]}${teeth}
---

# ${upd.segment}

${upd.content}

## Observations
- [${upd.category}] ${upd.content}

## Relations
- belongs_to [[patients/${userId}/profile]]
${(upd.relatedTeeth || []).map((t) => `- relates_to [[patients/${userId}/tooth_${t}_health]]`).join("\n")}
`;
      fs.writeFileSync(filePath, content, "utf-8");
    }
  } catch (err) {
    console.error("[Memory] sync error:", err);
  }
}

// Форматировать узлы памяти для системного промпта ИИ
export function formatMemoryForPrompt(nodes: MemoryNode[]): string {
  if (!nodes || nodes.length === 0) return "";

  // Группировка по категориям
  const grouped: Record<string, MemoryNode[]> = {};
  for (const node of nodes) {
    if (!grouped[node.category]) grouped[node.category] = [];
    grouped[node.category].push(node);
  }

  const categoryLabels: Record<string, string> = {
    tooth: "Состояние зубов",
    gum: "Дёсны",
    hygiene: "Гигиена",
    behavior: "Поведение / привычки",
    preference: "Предпочтения и страхи",
    history: "История лечения",
    general: "Общее",
  };

  const lines: string[] = ["ДОЛГОСРОЧНАЯ ПАМЯТЬ ПАЦИЕНТА (накоплена из предыдущих сессий):"];

  for (const [cat, catNodes] of Object.entries(grouped)) {
    const label = categoryLabels[cat] || cat;
    lines.push(`\n[${label}]`);
    for (const n of catNodes) {
      const teethStr =
        n.relatedTeeth && n.relatedTeeth.length > 0
          ? ` (зубы: ${n.relatedTeeth.join(", ")})`
          : "";
      lines.push(`• ${n.segment}${teethStr}: ${n.content}`);
    }
  }

  lines.push(
    "\nИспользуй эту память чтобы помнить историю пациента. Обновляй или добавляй узлы если узнал что-то новое важное."
  );

  return lines.join("\n");
}
