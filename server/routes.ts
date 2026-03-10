import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { pool } from "./db";
import { 
  insertUserSchema, 
  insertUserProfileSchema, 
  insertToothDataSchema,
  insertTestResultSchema,
  insertFeedbackSchema,
  insertToothHistorySchema,
  insertToothFileSchema,
  insertCalendarEventSchema,
} from "@shared/schema";
import { createHash, randomInt } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { sendVerificationEmail } from "./email";

function getClaude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const CLAUDE_MAIN = "claude-opus-4-5";
const CLAUDE_FAST = "claude-haiku-4-5";

interface UploadedFile {
  name: string;
  mimeType: string;
  base64Data: string;
  size?: number;
}

function detectFileTypeFromMime(mimeType: string, name: string): string {
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "document";
  if (mimeType.startsWith("image/")) return "photo";
  const lower = name.toLowerCase();
  if (lower.includes("кт") || lower.includes("ct") || lower.includes("томо")) return "ct";
  if (lower.includes("рент") || lower.includes("xray") || lower.includes("x-ray")) return "xray";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "document";
  return "other";
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Send email verification code
  app.post("/api/auth/send-code", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Укажите email" });
      }
      const emailLower = email.trim().toLowerCase();

      const code = String(randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await pool.query(
        `DELETE FROM email_verifications WHERE email = $1`,
        [emailLower]
      );
      await pool.query(
        `INSERT INTO email_verifications (email, code, expires_at, used) VALUES ($1, $2, $3, false)`,
        [emailLower, code, expiresAt]
      );

      try {
        await sendVerificationEmail(emailLower, code);
      } catch (emailErr: any) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`\n[DEV] Email не отправлен (Resend ограничение). Код для ${emailLower}: ${code}\n`);
          return res.status(200).json({ sent: true, devMode: true });
        }
        throw emailErr;
      }
      return res.status(200).json({ sent: true });
    } catch (err: any) {
      console.error("send-code error:", err);
      return res.status(500).json({ error: "Ошибка отправки письма. Проверьте email и попробуйте снова." });
    }
  });

  // Verify email code (check only, don't consume)
  app.post("/api/auth/verify-code", async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "Укажите email и код" });
      }
      const emailLower = email.trim().toLowerCase();

      const result = await pool.query(
        `SELECT * FROM email_verifications WHERE email = $1 AND code = $2 AND used = false ORDER BY created_at DESC LIMIT 1`,
        [emailLower, String(code).trim()]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: "Неверный код" });
      }
      const row = result.rows[0];
      if (new Date(row.expires_at) < new Date()) {
        return res.status(400).json({ error: "Код истёк. Запросите новый" });
      }

      return res.status(200).json({ verified: true });
    } catch (err: any) {
      console.error("verify-code error:", err);
      return res.status(500).json({ error: "Ошибка проверки кода" });
    }
  });

  // Auth Routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }

      const { email, password } = parsed.data;
      const verificationCode = req.body.verificationCode;

      const emailLower = email.trim().toLowerCase();

      // Verify the email code
      if (!verificationCode) {
        return res.status(400).json({ error: "Требуется код подтверждения email" });
      }
      const verifyResult = await pool.query(
        `SELECT * FROM email_verifications WHERE email = $1 AND code = $2 AND used = false ORDER BY created_at DESC LIMIT 1`,
        [emailLower, String(verificationCode).trim()]
      );
      if (verifyResult.rows.length === 0) {
        return res.status(400).json({ error: "Неверный или истёкший код" });
      }
      if (new Date(verifyResult.rows[0].expires_at) < new Date()) {
        return res.status(400).json({ error: "Код истёк" });
      }

      const existingUser = await storage.getUserByEmail(emailLower);
      if (existingUser) {
        return res.status(409).json({ error: "Пользователь уже существует" });
      }

      const hashedPassword = hashPassword(password);
      const user = await storage.createUser({ email: emailLower, password: hashedPassword });
      await storage.createProfile({ userId: user.id });

      // Mark code as used
      await pool.query(
        `UPDATE email_verifications SET used = true WHERE email = $1 AND code = $2`,
        [emailLower, String(verificationCode).trim()]
      );

      return res.status(201).json({ 
        id: user.id, 
        email: user.email 
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Введите email и пароль" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }

      const hashedPassword = hashPassword(password);
      if (user.password !== hashedPassword) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }

      return res.json({ 
        id: user.id, 
        email: user.email 
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // Profile Routes
  app.get("/api/profile/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: "Профиль не найден" });
      }

      return res.json(profile);
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/profile", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }

      const profile = await storage.createProfile(parsed.data);
      return res.status(201).json(profile);
    } catch (error) {
      console.error("Create profile error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.patch("/api/profile/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const profile = await storage.updateProfile(userId, req.body);
      
      if (!profile) {
        return res.status(404).json({ error: "Профиль не найден" });
      }

      return res.json(profile);
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // Tooth Data Routes
  app.get("/api/tooth-data/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const data = await storage.getToothData(userId);
      return res.json(data);
    } catch (error) {
      console.error("Get tooth data error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/tooth-data", async (req: Request, res: Response) => {
    try {
      const parsed = insertToothDataSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }

      const data = await storage.upsertToothData(parsed.data);
      return res.status(201).json(data);
    } catch (error) {
      console.error("Create tooth data error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.delete("/api/tooth-data/:userId/:toothNumber", async (req: Request, res: Response) => {
    try {
      const { userId, toothNumber } = req.params;
      await storage.deleteToothData(userId, parseInt(toothNumber, 10));
      return res.status(204).send();
    } catch (error) {
      console.error("Delete tooth data error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // Test Results Routes
  app.get("/api/test-results/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const results = await storage.getTestResults(userId);
      return res.json(results);
    } catch (error) {
      console.error("Get test results error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.get("/api/test-results/:userId/latest", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const result = await storage.getLatestTestResult(userId);
      
      if (!result) {
        return res.status(404).json({ error: "Результаты не найдены" });
      }

      return res.json(result);
    } catch (error) {
      console.error("Get latest test result error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/test-results", async (req: Request, res: Response) => {
    try {
      const parsed = insertTestResultSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }

      const result = await storage.createTestResult(parsed.data);
      return res.status(201).json(result);
    } catch (error) {
      console.error("Create test result error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // AI Recommendations Route - using Claude
  app.post("/api/recommendations", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "Требуется userId" });

      const latestTest = await storage.getLatestTestResult(userId);
      if (!latestTest) {
        return res.status(400).json({ 
          error: "Сначала пройдите тест",
          recommendations: [],
          summary: "Пройдите тест здоровья зубов, чтобы получить персонализированные рекомендации.",
          urgentAction: null
        });
      }

      if (latestTest.aiRecommendations) {
        return res.json(latestTest.aiRecommendations);
      }

      const claude = getClaude();
      if (!claude) {
        return res.status(503).json({ 
          error: "AI недоступен", 
          recommendations: [],
          summary: "AI-рекомендации временно недоступны.",
          urgentAction: null
        });
      }

      const [profile, toothData] = await Promise.all([
        storage.getProfile(userId),
        storage.getToothData(userId),
      ]);

      const response = await claude.messages.create({
        model: CLAUDE_MAIN,
        max_tokens: 2048,
        system: `Ты виртуальный стоматологический консультант. Анализируй данные о здоровье зубов и давай персонализированные рекомендации на русском языке.
ВАЖНО: В полях title, description, summary и urgentAction — простой текст БЕЗ Markdown-форматирования, без *, жирного, заголовков, нумерации. Только обычные предложения. Эмодзи можно.
Ответь ТОЛЬКО валидным JSON без пояснений:
{"recommendations":[{"title":"string","description":"string","priority":"high"|"medium"|"low","category":"hygiene"|"diet"|"visit"|"treatment"|"prevention"}],"summary":"string","urgentAction":"string|null"}`,
        messages: [{
          role: "user",
          content: `Данные пользователя:
- Возраст: ${profile?.age || "не указан"}
- Частота чистки: ${profile?.brushingFrequency || "не указано"}
- Нить: ${profile?.usesFloss ? "да" : "нет"}, ирригатор: ${profile?.usesIrrigator ? "да" : "нет"}
- Брекеты: ${profile?.hasBraces ? "да" : "нет"}, чувствительность: ${profile?.hasSensitivity ? "да" : "нет"}, кровоточивость: ${profile?.hasGumBleeding ? "да" : "нет"}
Проблемные зубы: ${JSON.stringify((toothData || []).filter((t: any) => (t.problems as string[]).length > 0))}
Тест: риск зубов ${latestTest.teethRiskScore}%, дёсен ${latestTest.gumsRiskScore}%, уровень: ${latestTest.overallRiskLevel}
Ответь ТОЛЬКО JSON.`
        }],
      });

      const raw = (response.content[0] as any).text || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || "{}");
      await storage.updateTestResultAIRecommendations(latestTest.id, parsed);
      return res.json(parsed);
    } catch (error) {
      console.error("AI recommendations error:", error);
      return res.status(500).json({ error: "Ошибка получения рекомендаций" });
    }
  });

  // AI Chat Route - using Claude
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const claude = getClaude();
      if (!claude) {
        return res.status(503).json({ 
          error: "AI недоступен", 
          response: "AI-консультант временно недоступен. Пожалуйста, попробуйте позже."
        });
      }

      const { message, history, userId, files: incomingFiles, userContext } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Требуется сообщение" });
      }

      const localMode = !!userContext;

      let userProfile = null;
      let toothData: any[] = [];
      let latestTest = null;
      let upcomingEvents: any[] = [];
      let existingFiles: any[] = [];

      if (localMode) {
        userProfile = userContext.profile || null;
        toothData = userContext.toothData || [];
        latestTest = userContext.latestTest || null;
        upcomingEvents = userContext.upcomingEvents || [];
        existingFiles = (userContext.existingFiles || []).map((f: any) => ({
          fileName: f.fileName,
          aiDescription: f.aiDescription,
          description: f.aiDescription,
        }));
      } else if (userId) {
        try {
          [userProfile, toothData, latestTest, existingFiles] = await Promise.all([
            storage.getProfile(userId),
            storage.getToothData(userId),
            storage.getLatestTestResult(userId),
            storage.getToothFiles(userId),
          ]);
          const allEvents = await storage.getCalendarEvents(userId);
          const today = new Date();
          const in90days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
          const todayStr = today.toISOString().split("T")[0];
          const limitStr = in90days.toISOString().split("T")[0];
          upcomingEvents = allEvents
            .filter((e) => e.date >= todayStr && e.date <= limitStr && !e.isCompleted)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 20);
        } catch (e) {
          console.error("Error fetching user data for chat:", e);
        }
      }

      // Auto-describe new files — in local mode, return descriptions without saving to server DB
      const savedNewFiles: any[] = [];
      if (Array.isArray(incomingFiles) && incomingFiles.length > 0) {
        for (const f of incomingFiles as UploadedFile[]) {
          try {
            const isImage = f.mimeType?.startsWith("image/");
            const isPdf = f.mimeType === "application/pdf";
            if (!isImage && !isPdf) {
              if (!localMode && userId) {
                const saved = await storage.createToothFile({
                  userId,
                  fileName: f.name,
                  fileType: detectFileTypeFromMime(f.mimeType, f.name),
                  fileUrl: `chat-upload://${f.name}`,
                  fileSize: f.size ?? null,
                  description: null,
                  aiDescription: null,
                  relatedTeeth: [],
                });
                savedNewFiles.push(saved);
              } else {
                savedNewFiles.push({ fileName: f.name, aiDescription: null, _base64: f.base64Data, _mimeType: f.mimeType });
              }
              continue;
            }
            // Generate AI description using fast model
            const descContent: any[] = [];
            if (isImage) {
              const supportedMime = ["image/jpeg","image/png","image/gif","image/webp"];
              const mime = supportedMime.includes(f.mimeType) ? f.mimeType : "image/jpeg";
              descContent.push({ type: "image", source: { type: "base64", media_type: mime, data: f.base64Data } });
            } else {
              descContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64Data } });
            }
            descContent.push({ type: "text", text: 'Кратко опиши этот медицинский документ в 1-2 предложениях: что за документ, дата если есть, ключевые показатели или тема. Пиши по-русски, без форматирования.' });
            const descResp = await claude.messages.create({
              model: CLAUDE_FAST,
              max_tokens: 200,
              messages: [{ role: "user", content: descContent }],
            });
            const aiDesc = (descResp.content[0] as any).text?.trim() || null;
            if (!localMode && userId) {
              const saved = await storage.createToothFile({
                userId,
                fileName: f.name,
                fileType: detectFileTypeFromMime(f.mimeType, f.name),
                fileUrl: `chat-upload://${f.name}`,
                fileSize: f.size ?? null,
                description: null,
                aiDescription: aiDesc,
                relatedTeeth: [],
              });
              savedNewFiles.push({ ...saved, _base64: f.base64Data, _mimeType: f.mimeType });
            } else {
              savedNewFiles.push({ fileName: f.name, aiDescription: aiDesc, _base64: f.base64Data, _mimeType: f.mimeType });
            }
          } catch (e) {
            console.error("File auto-describe error:", e);
          }
        }
      }

      // Build file manifest for system prompt
      const manifestFiles = [...existingFiles, ...savedNewFiles.map(f => ({ ...f, aiDescription: f.aiDescription }))];
      const fileManifest = manifestFiles.length > 0
        ? `\n\nУ пользователя есть загруженные медицинские документы (файл-индекс):\n` +
          manifestFiles.map((f, i) => `${i + 1}. ${f.fileName} — ${f.aiDescription || f.description || "без описания"}`).join("\n") +
          `\n\nЕсли пользователь просит проанализировать файл или задаёт вопрос по документам, используй информацию из индекса. Файлы, загруженные в этом сообщении, прикреплены ниже.`
        : "";

      const systemPrompt = `Ты — виртуальный стоматологический консультант внутри мобильного приложения Toothy.
Твоя задача — помогать пользователю понимать состояние зубов и дёсен, объяснять возможные причины симптомов простым языком и мотивировать своевременно обращаться к стоматологу. Ты НЕ ставишь диагноз и НЕ назначаешь лечение. Вся информация носит справочный характер.

Тематика и контекст
Отвечай ТОЛЬКО по теме стоматологии и полости рта: зубы, дёсны, слизистая, прикус, брекеты, гигиена. Если вопрос не по теме (домашка, программирование, общая медицина, финансы и т.п.) — вежливо откажись и скажи, что можешь помогать только по зубам и дёснам.

В контекст тебе передаётся:
- карта зубов (по каждому зубу: боль, скол, пломба, кариес, кровоточивость, чувствительность и т.д.);
- анкета здоровья (возраст, привычки гигиены, брекеты, кровоточивость дёсен, чувствительность и т.п.);
- результаты теста состояния (риски для зубов/дёсен);
- календарь: ближайшие запланированные события (приёмы, напоминания, события от ИИ) на 90 дней вперёд;
- текущие жалобы и история чата.${fileManifest}

Если пользователь спрашивает о своих планах, записях к стоматологу или напоминаниях — используй данные из поля calendar. Если календарь пустой — сообщи об этом и предложи добавить событие через раздел «Календарь» или нажав кнопку ИИ там.

Стиль общения
Пиши по-русски, дружелюбно, на «ты», простыми словами.
Объясняй по шагам, без «воды», максимально конкретно: что это может быть, что можно сделать дома (только безопасное) и когда нужно к врачу.
Избегай пугающих формулировок, но не занижай серьёзность.

Безопасность и ограничения
Не ставь окончательный диагноз, не обещай исход лечения; подчёркивай, что решение принимает стоматолог после осмотра.
Не давай схем лечения, не назначай лекарства, дозировки, уколы, антибиотики, обезболивающие и т.п.
При признаках опасного состояния (сильная боль, отёк лица/шеи, затруднённое дыхание/глотание, высокая температура, травма с подозрением на перелом) — чётко рекомендуй срочно обратиться к врачу/в неотложку и помечай, что ситуация может быть срочной.
Не обсуждай юридические, финансовые темы и не спорь с реальными врачами.
Пиши простой текст БЕЗ форматирования: не используй *, жирный текст, заголовки, списки Markdown, нумерацию. Не вставляй ссылки и квадратные скобки. Просто обычные предложения в несколько абзацев, только при просьбе ссылки можно выдавать. Эмодзи иногда можешь использовать для дружелюбности.

Работа с симптомами и картой зубов
Всегда уточняй детали: когда началось, от чего усиливается (холодное/горячее/накусывание), как часто, были ли недавние лечения или травмы.
Если клиент неясно описывает, какой зуб болит, обязательно уточни расположение человеческим языком.
Используй карту зубов и анкету:
- при боли в пломбированном зубе опиши возможные причины в общих чертах и порекомендуй визит в разумные сроки;
- при кариесе, сколе, кровоточивости — объясни риски и необходимость лечения/контроля.
Если тест и анкета показывают высокий риск (плохая гигиена, частая кровь, курение и т.п.) — подчёркивай профилактику и более частые визиты.

ВАЖНО: Нумерация зубов
Используй ТОЛЬКО стандартную стоматологическую нумерацию FDI (двузначные числа):
- Верхняя правая четверть: 18, 17, 16, 15, 14, 13, 12, 11 (от зуба мудрости к центру)
- Верхняя левая четверть: 21, 22, 23, 24, 25, 26, 27, 28 (от центра к зубу мудрости)
- Нижняя левая четверть: 38, 37, 36, 35, 34, 33, 32, 31 (от зуба мудрости к центру)
- Нижняя правая четверть: 41, 42, 43, 44, 45, 46, 47, 48 (от центра к зубу мудрости)
В поле tooth_id указывай ТОЛЬКО эти двузначные номера (например "26", "11", "36"). Никогда не используй текстовые описания вроде "upper_right_2" или однозначные номера вроде "6".

Структура ответа для пользователя
Внутри assistant_message (текст для чата) придерживайся структуры:
1. Коротко переформулируй проблему пользователя.
2. Объясни, что это МОЖЕТ означать (1–2 вероятные группы причин, без конкретных диагнозов).
3. Дай безопасные рекомендации:
   - что можно сделать дома по гигиене и снижению риска (без лекарств и процедур);
   - в какие сроки и к какому специалисту обратиться.
4. Укажи, когда требуется срочно обратиться к врачу, если есть или могут появиться тревожные признаки.
5. При необходимости предложи пользователю отметить проблему на карте зубов или обновить тест состояния.

Структурированный вывод для обновления состояния
Отвечай СТРОГО одним валидным JSON-объектом БЕЗ текста вне JSON. Структура:

{
  "assistant_message": "string — ответ пользователю на русском языке",
  "state_updates": {
    "teeth_updates": [
      {
        "tooth_id": "26",
        "mark_for_check": true,
        "reason": "string — почему этот зуб нужно проверить",
        "priority": "routine|soon|urgent"
      }
    ],
    "reminders": [
      {
        "reminder_id": "string, например 'check_tooth_26'",
        "title": "string — коротко, что сделать",
        "description": "string — подробнее, что и зачем делать",
        "due_time": "ISO8601, напр. '2025-12-20T09:00:00Z'",
        "repeat": "none|daily|weekly|monthly",
        "related_teeth": ["26"]
      }
    ]
  },
  "safety": {
    "needs_urgent_care": false,
    "urgent_reason": "string или null",
    "disclaimer": "string — напоминание, что это не диагноз и нужна консультация врача"
  }
}

Правила генерации:
- assistant_message заполняй ВСЕГДА.
- Если нет зубов для отметки — "teeth_updates": [].
- Если нет напоминаний — "reminders": [].
- priority выбирай по серьёзности симптомов (обычный осмотр / в ближайшее время / срочно).
- due_time:
  - острые проблемы — ближайшие 24 часа;
  - дискомфорт без срочности — 3–7 дней;
  - плановый осмотр/чистка — 1–6 месяцев;
  - привычки гигиены — repeat = "daily" с удобным временем.
- При тревожных симптомах поставь needs_urgent_care = true, кратко опиши причину в urgent_reason и явно напомни о необходимости срочного визита в assistant_message.
- Всегда заполняй disclaimer кратким текстом, что это не диагноз и нужен врач.
- JSON должен быть строго валидным: без комментариев, без лишнего текста до или после объекта.

История зубов
Приложение хранит историю по каждому зубу (события). Твоя задача — подсказывать, какие новые события записать.

В JSON-ответе в поле state_updates.teeth_updates заполняй не только mark_for_check, но и причину как событие истории.
Если по ходу разговора становится ясно, что:
- у конкретного зуба появилась новая жалоба (боль, чувствительность, скол, кровоточивость и т.п.);
- проблема уменьшилась или прошла;
- ты рекомендуешь проверку или лечение конкретного зуба;
— обязательно добавь это в teeth_updates как новое событие.

Формат элемента в teeth_updates:
{
  "tooth_id": "string (FDI номер, например 26)",
  "mark_for_check": true/false,
  "resolved": true/false,
  "reason": "краткое описание события для истории",
  "priority": "routine|soon|urgent"
}

Правила заполнения:
- mark_for_check = true — когда появилась новая проблема или нужен осмотр
- resolved = true — когда пользователь сообщил что зуб вылечен, проблема прошла, боль исчезла, лечение завершено
- Оба поля могут быть false для обычных заметок

Причину пиши так, чтобы её можно было сохранить в истории зуба без изменений текста.
Примеры:
- Новая проблема: "Пользователь жалуется на острую боль от холодного"
- Вылечен: "Пользователь сообщил что зуб вылечен у стоматолога"
- Прошло само: "Боль прошла, проблема больше не беспокоит"

Каждую запись из teeth_updates бэкенд сохраняет как событие истории для соответствующего tooth_id и, если mark_for_check = true, ещё и создаёт напоминание.`;

      const claudeUserContext = {
        user_profile: userProfile ? {
          age: userProfile.age,
          oral_hygiene: {
            brush_frequency_per_day: userProfile.brushingFrequency === "twice" ? 2 : userProfile.brushingFrequency === "more" ? 3 : 1,
            uses_floss: userProfile.usesFloss,
            uses_irrigator: userProfile.usesIrrigator,
            has_braces: userProfile.hasBraces,
            sensitivity: userProfile.hasSensitivity ? "moderate" : "none",
            bleeding_gums: userProfile.hasGumBleeding ? "sometimes" : "never"
          }
        } : null,
        tooth_map: {
          teeth: toothData.map((t: any) => ({
            tooth_id: String(t.toothNumber || t.tooth_number),
            problems: t.problems,
            notes: t.notes
          }))
        },
        analysis: latestTest ? {
          gum_risk: (latestTest.gumsRiskScore ?? latestTest.gums_risk_score) > 60 ? "high" : (latestTest.gumsRiskScore ?? latestTest.gums_risk_score) > 30 ? "medium" : "low",
          tooth_risk: (latestTest.teethRiskScore ?? latestTest.teeth_risk_score) > 60 ? "high" : (latestTest.teethRiskScore ?? latestTest.teeth_risk_score) > 30 ? "medium" : "low"
        } : null,
        calendar: upcomingEvents.length > 0 ? upcomingEvents.map((e) => ({
          title: e.title,
          date: e.date,
          time: e.time || null,
          type: e.type,
          description: e.description || null,
          source: e.source,
        })) : [],
      };

      // Build Claude message history
      const claudeMessages: Array<{ role: "user" | "assistant"; content: any }> = [];

      if (Array.isArray(history) && history.length > 0) {
        const validHistory = history.slice(-6);
        const alternating: Array<{ role: "user" | "assistant"; content: string }> = [];
        for (const msg of validHistory) {
          if (msg.role === "user" || msg.role === "assistant") {
            const last = alternating[alternating.length - 1];
            if (!last || last.role !== msg.role) {
              alternating.push({ role: msg.role, content: msg.content });
            }
          }
        }
        if (alternating.length > 0) {
          if (alternating[0].role === "assistant") alternating.shift();
          if (alternating.length > 0 && alternating[alternating.length - 1].role === "user") {
            alternating.push({ role: "assistant", content: "Понял, продолжаем." });
          }
          claudeMessages.push(...alternating);
        }
      }

      // Build current user message with optional file attachments
      const userContentBlocks: any[] = [];

      // Attach files uploaded in this turn with prompt caching
      for (const f of savedNewFiles) {
        if (!f._base64) continue;
        const isImg = f._mimeType?.startsWith("image/");
        const supportedMimes = ["image/jpeg","image/png","image/gif","image/webp"];
        if (isImg) {
          const mime = supportedMimes.includes(f._mimeType) ? f._mimeType : "image/jpeg";
          userContentBlocks.push({
            type: "image",
            source: { type: "base64", media_type: mime, data: f._base64 },
            cache_control: { type: "ephemeral" },
          });
        } else if (f._mimeType === "application/pdf") {
          userContentBlocks.push({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: f._base64 },
            cache_control: { type: "ephemeral" },
          });
        }
      }

      userContentBlocks.push({
        type: "text",
        text: `Контекст пользователя:\n${JSON.stringify(claudeUserContext, null, 2)}\n\nСообщение: ${message}`,
      });

      claudeMessages.push({ role: "user", content: userContentBlocks });

      const response = await claude.messages.create({
        model: CLAUDE_MAIN,
        max_tokens: 2048,
        system: systemPrompt,
        messages: claudeMessages,
      });

      const rawContent = (response.content[0] as any).text || "";

      let content = rawContent.trim();
      content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      content = content.trim();

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      try {
        const parsed = JSON.parse(content);
        // Also attach saved file info to response
        (parsed as any)._savedFiles = savedNewFiles.map(f => ({
          id: f.id, fileName: f.fileName, fileType: f.fileType, aiDescription: f.aiDescription
        }));
        
        if (!localMode && userId && parsed.state_updates) {
          const { teeth_updates, reminders } = parsed.state_updates;
          
          if (Array.isArray(teeth_updates) && teeth_updates.length > 0) {
            const validToothNumbers = [
              11, 12, 13, 14, 15, 16, 17, 18,
              21, 22, 23, 24, 25, 26, 27, 28,
              31, 32, 33, 34, 35, 36, 37, 38,
              41, 42, 43, 44, 45, 46, 47, 48
            ].map(String);
            
            const getToothName = (toothId: string): string => {
              const num = parseInt(toothId, 10);
              if (isNaN(num)) return toothId;
              const quadrant = Math.floor(num / 10);
              const position = num % 10;
              const quadrantNames: Record<number, string> = {
                1: "верхний правый",
                2: "верхний левый", 
                3: "нижний левый",
                4: "нижний правый"
              };
              return `${quadrantNames[quadrant] || ""} ${position}`;
            };
            
            for (const tooth of teeth_updates) {
              const toothId = String(tooth.tooth_id);
              if (!validToothNumbers.includes(toothId)) {
                console.warn(`Invalid tooth_id from AI: ${toothId}, skipping`);
                continue;
              }
              
              // Determine event type based on resolved/mark_for_check flags
              let eventType = "note";
              if (tooth.resolved) {
                eventType = "resolved";
              } else if (tooth.mark_for_check) {
                eventType = "check_recommended";
              }
              
              // Always save to tooth history
              await storage.createToothHistoryEvent({
                userId,
                toothId,
                eventType,
                reason: tooth.reason || "Событие от ИИ-консультанта",
                priority: tooth.priority || "routine",
                markForCheck: tooth.mark_for_check || false,
                source: "ai",
              });
              
              // Create alert if mark_for_check is true
              if (tooth.mark_for_check) {
                await storage.createAlert({
                  userId,
                  type: "teeth_at_risk",
                  title: `Зуб ${toothId} (${getToothName(toothId)}) требует внимания`,
                  description: tooth.reason || "ИИ рекомендует проверить этот зуб",
                  priority: tooth.priority || "routine",
                  relatedTeeth: [toothId],
                });
              }
            }
          }
          
          if (Array.isArray(reminders) && reminders.length > 0) {
            for (const reminder of reminders) {
              await storage.createAlert({
                userId,
                type: "reminder",
                title: reminder.title,
                description: reminder.description,
                priority: "routine",
                relatedTeeth: reminder.related_teeth || [],
                dueTime: reminder.due_time ? new Date(reminder.due_time) : undefined,
              });
            }
          }
        }
        
        if (!localMode && userId && parsed.safety?.needs_urgent_care) {
          await storage.createAlert({
            userId,
            type: "urgent",
            title: "Требуется срочная консультация",
            description: parsed.safety.urgent_reason || "ИИ рекомендует срочно обратиться к врачу",
            priority: "urgent",
            relatedTeeth: [],
          });
        }
        
        return res.json({ 
          response: parsed.assistant_message || content,
          state_updates: parsed.state_updates,
          safety: parsed.safety
        });
      } catch {
        const msgMatch = rawContent.match(/"assistant_message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const fallbackMessage = msgMatch
          ? msgMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
          : rawContent.replace(/```json\s*/gi, "").replace(/```/g, "").replace(/[{}[\]"]/g, "").trim();
        return res.json({ response: fallbackMessage || "Извините, не удалось обработать ответ. Попробуйте перефразировать вопрос." });
      }
    } catch (error) {
      console.error("AI chat error:", error);
      return res.status(500).json({ error: "Ошибка чата" });
    }
  });

  // Alerts Routes
  app.get("/api/alerts/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const alerts = await storage.getActiveAlerts(userId);
      return res.json(alerts);
    } catch (error) {
      console.error("Get alerts error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/alerts/:alertId/dismiss", async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      await storage.dismissAlert(alertId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Dismiss alert error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/alerts/:alertId/read", async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      await storage.markAlertRead(alertId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Mark alert read error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // Feedback Route
  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const parsed = insertFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }

      const feedback = await storage.createFeedback(parsed.data);
      return res.status(201).json(feedback);
    } catch (error) {
      console.error("Create feedback error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // Tooth History Routes
  app.get("/api/tooth-history/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const history = await storage.getToothHistory(userId);
      return res.json(history);
    } catch (error) {
      console.error("Get tooth history error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.get("/api/tooth-history/:userId/:toothId", async (req: Request, res: Response) => {
    try {
      const { userId, toothId } = req.params;
      const history = await storage.getToothHistoryByTooth(userId, toothId);
      return res.json(history);
    } catch (error) {
      console.error("Get tooth history by tooth error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/tooth-history", async (req: Request, res: Response) => {
    try {
      const parsed = insertToothHistorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }

      const event = await storage.createToothHistoryEvent(parsed.data);
      return res.status(201).json(event);
    } catch (error) {
      console.error("Create tooth history error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.patch("/api/tooth-history/:eventId", async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const { doctorName, clinicName, treatmentDetails } = req.body;
      
      const event = await storage.updateToothHistoryEvent(eventId, {
        doctorName,
        clinicName,
        treatmentDetails,
      });
      
      if (!event) {
        return res.status(404).json({ error: "Запись не найдена" });
      }
      
      return res.json(event);
    } catch (error) {
      console.error("Update tooth history error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // Tooth Files Routes
  app.get("/api/tooth-files/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const files = await storage.getToothFiles(userId);
      return res.json(files);
    } catch (error) {
      console.error("Get tooth files error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/tooth-files", async (req: Request, res: Response) => {
    try {
      const parsed = insertToothFileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }

      const file = await storage.createToothFile(parsed.data);
      return res.status(201).json(file);
    } catch (error) {
      console.error("Create tooth file error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.delete("/api/tooth-files/:fileId", async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      await storage.deleteToothFile(fileId);
      return res.status(204).send();
    } catch (error) {
      console.error("Delete tooth file error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // Calendar Events Routes
  app.get("/api/calendar/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { year, month } = req.query;
      let events;
      if (year && month) {
        events = await storage.getCalendarEventsByMonth(userId, parseInt(year as string), parseInt(month as string));
      } else {
        events = await storage.getCalendarEvents(userId);
      }
      return res.json(events);
    } catch (error) {
      console.error("Get calendar events error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/calendar", async (req: Request, res: Response) => {
    try {
      const parsed = insertCalendarEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }
      const event = await storage.createCalendarEvent(parsed.data);
      return res.status(201).json(event);
    } catch (error) {
      console.error("Create calendar event error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.patch("/api/calendar/:eventId", async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const event = await storage.updateCalendarEvent(eventId, req.body);
      if (!event) {
        return res.status(404).json({ error: "Событие не найдено" });
      }
      return res.json(event);
    } catch (error) {
      console.error("Update calendar event error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.delete("/api/calendar/:eventId", async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      await storage.deleteCalendarEvent(eventId);
      return res.status(204).send();
    } catch (error) {
      console.error("Delete calendar event error:", error);
      return res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  app.post("/api/calendar/ai-suggest/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const claude = getClaude();
      if (!claude) {
        return res.status(503).json({ error: "AI сервис недоступен" });
      }

      const [profile, toothDataArr, testResult, history] = await Promise.all([
        storage.getProfile(userId),
        storage.getToothData(userId),
        storage.getLatestTestResult(userId),
        storage.getToothHistory(userId),
      ]);

      const teethWithProblems = toothDataArr
        .filter((t) => (t.problems as string[]).length > 0)
        .map((t) => `Зуб ${t.toothNumber}: ${(t.problems as string[]).join(", ")}`);

      const contextText = [
        profile ? `Возраст: ${profile.age || "неизвестно"}, Чистка: ${profile.brushingFrequency || "неизвестно"}` : "",
        teethWithProblems.length > 0 ? `Проблемные зубы: ${teethWithProblems.join("; ")}` : "Явных проблем с зубами нет",
        testResult ? `Риск зубов: ${testResult.teethRiskScore}/100, Риск дёсен: ${testResult.gumsRiskScore}/100` : "",
        history.length > 0 ? `Последние события: ${history.slice(0, 5).map((h) => h.reason).join("; ")}` : "",
      ].filter(Boolean).join("\n");

      const today = new Date().toISOString().split("T")[0];

      const completion = await claude.messages.create({
        model: CLAUDE_FAST,
        max_tokens: 1024,
        system: `Ты стоматологический ассистент. На основе данных пациента предложи 3-5 событий для календаря (визиты, напоминания, процедуры). Ответь ТОЛЬКО валидным JSON массивом без пояснений. Каждый объект: { "title": string, "description": string, "date": "YYYY-MM-DD", "time": "HH:MM" (опционально), "type": "appointment"|"reminder"|"ai_suggestion" }. Даты начиная с ${today} на ближайшие 6 месяцев. Используй русский язык.`,
        messages: [{
          role: "user",
          content: `Данные пациента:\n${contextText}\n\nПредложи события для стоматологического календаря.`,
        }],
      });

      const raw = (completion.content[0] as any).text || "[]";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "Не удалось получить предложения от ИИ" });
      }

      const suggestions = JSON.parse(jsonMatch[0]);
      const created: any[] = [];

      for (const s of suggestions) {
        if (s.title && s.date) {
          const event = await storage.createCalendarEvent({
            userId,
            title: s.title,
            description: s.description || null,
            date: s.date,
            time: s.time || null,
            type: s.type || "ai_suggestion",
            source: "ai",
            relatedTeeth: [],
            isCompleted: false,
          });
          created.push(event);
        }
      }

      return res.json({ created, count: created.length });
    } catch (error) {
      console.error("AI calendar suggest error:", error);
      return res.status(500).json({ error: "Ошибка ИИ" });
    }
  });

  app.post("/api/audience", async (req: Request, res: Response) => {
    try {
      const { birthYear, gender, goal } = req.body;
      if (!goal) {
        return res.status(400).json({ error: "goal is required" });
      }
      await pool.query(
        `INSERT INTO audience_analytics (birth_year, gender, goal) VALUES ($1, $2, $3)`,
        [birthYear ? Number(birthYear) : null, gender ?? null, String(goal)]
      );
      return res.json({ ok: true });
    } catch (error) {
      console.error("Audience analytics error:", error);
      return res.status(500).json({ error: "Ошибка записи аналитики" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
