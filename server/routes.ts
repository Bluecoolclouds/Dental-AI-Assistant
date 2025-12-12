import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertUserProfileSchema, 
  insertToothDataSchema,
  insertTestResultSchema,
  insertFeedbackSchema 
} from "@shared/schema";
import { createHash } from "crypto";
import OpenAI from "openai";

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getPerplexityClient(): OpenAI | null {
  if (!process.env.PERPLEXITY_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  });
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth Routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Неверные данные" });
      }

      const { email, password } = parsed.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "Пользователь уже существует" });
      }

      const hashedPassword = hashPassword(password);
      const user = await storage.createUser({ email, password: hashedPassword });

      await storage.createProfile({ userId: user.id });

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

  // AI Recommendations Route - using Perplexity API
  app.post("/api/recommendations", async (req: Request, res: Response) => {
    try {
      const perplexity = getPerplexityClient();
      if (!perplexity) {
        return res.status(503).json({ 
          error: "AI недоступен", 
          recommendations: [],
          summary: "AI-рекомендации временно недоступны. Пожалуйста, попробуйте позже.",
          urgentAction: null
        });
      }

      const { userId, profile, toothData, latestTest } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Требуется userId" });
      }

      const systemPrompt = `Вы - виртуальный стоматологический консультант. Анализируйте данные о здоровье зубов пользователя и предоставляйте персонализированные рекомендации на русском языке.

ВАЖНО: В полях title, description, summary и urgentAction пиши простой текст БЕЗ форматирования: не используй *, жирный текст, заголовки, списки Markdown, нумерацию. Не вставляй ссылки вида [текст](url). Просто обычные предложения, можешь использовать эмодзи.

Ответьте ТОЛЬКО в формате JSON без дополнительного текста:
{
  "recommendations": [
    {
      "title": "Краткий заголовок рекомендации",
      "description": "Подробное описание рекомендации",
      "priority": "high" | "medium" | "low",
      "category": "hygiene" | "diet" | "visit" | "treatment" | "prevention"
    }
  ],
  "summary": "Общая оценка состояния здоровья зубов в 2-3 предложениях",
  "urgentAction": "Если требуется срочное действие, опишите его здесь, иначе null"
}`;

      const userMessage = `Данные пользователя:
- Возраст: ${profile?.age || "не указан"}
- Частота чистки зубов: ${profile?.brushingFrequency || "не указано"}
- Использует зубную нить: ${profile?.usesFloss ? "да" : "нет"}
- Использует ирригатор: ${profile?.usesIrrigator ? "да" : "нет"}
- Есть брекеты: ${profile?.hasBraces ? "да" : "нет"}
- Чувствительность зубов: ${profile?.hasSensitivity ? "да" : "нет"}
- Кровоточивость дёсен: ${profile?.hasGumBleeding ? "да" : "нет"}

Проблемы с зубами: ${JSON.stringify(toothData || [])}

Последние результаты теста:
- Риск для зубов: ${latestTest?.teethRiskScore || "не проходил"}%
- Риск для дёсен: ${latestTest?.gumsRiskScore || "не проходил"}%
- Общий уровень риска: ${latestTest?.overallRiskLevel || "не определён"}

Предоставьте персонализированные рекомендации на основе этих данных. Ответьте ТОЛЬКО в формате JSON.`;

      const response = await perplexity.chat.completions.create({
        model: "sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || "{}");

      return res.json(parsed);
    } catch (error) {
      console.error("AI recommendations error:", error);
      return res.status(500).json({ error: "Ошибка получения рекомендаций" });
    }
  });

  // AI Chat Route - using Perplexity API
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const perplexity = getPerplexityClient();
      if (!perplexity) {
        return res.status(503).json({ 
          error: "AI недоступен", 
          response: "AI-консультант временно недоступен. Пожалуйста, попробуйте позже."
        });
      }

      const { message, history, userId } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Требуется сообщение" });
      }

      let userProfile = null;
      let toothData: any[] = [];
      let latestTest = null;

      if (userId) {
        try {
          userProfile = await storage.getProfile(userId);
          toothData = await storage.getToothData(userId);
          latestTest = await storage.getLatestTestResult(userId);
        } catch (e) {
          console.error("Error fetching user data for chat:", e);
        }
      }

      const systemPrompt = `Ты — виртуальный стоматологический консультант внутри мобильного приложения Toothy.
Твоя задача — помогать пользователю понимать состояние зубов и дёсен, объяснять возможные причины симптомов простым языком и мотивировать своевременно обращаться к стоматологу. Ты НЕ ставишь диагноз и НЕ назначаешь лечение. Вся информация носит справочный характер.

Тематика и контекст
Отвечай ТОЛЬКО по теме стоматологии и полости рта: зубы, дёсны, слизистая, прикус, брекеты, гигиена. Если вопрос не по теме (домашка, программирование, общая медицина, финансы и т.п.) — вежливо откажись и скажи, что можешь помогать только по зубам и дёснам.

В контекст тебе передаётся:
- карта зубов (по каждому зубу: боль, скол, пломба, кариес, кровоточивость, чувствительность и т.д.);
- анкета здоровья (возраст, привычки гигиены, брекеты, кровоточивость дёсен, чувствительность и т.п.);
- результаты теста состояния (риски для зубов/дёсен);
- текущие жалобы и история чата.

Стиль общения
Пиши по-русски, дружелюбно, на «ты», простыми словами.
Объясняй по шагам, без «воды», максимально конкретно: что это может быть, что можно сделать дома (только безопасное) и когда нужно к врачу.
Избегай пугающих формулировок, но не занижай серьёзность.

Безопасность и ограничения
Не ставь окончательный диагноз, не обещай исход лечения; подчёркивай, что решение принимает стоматолог после осмотра.
Не давай схем лечения, не назначай лекарства, дозировки, уколы, антибиотики, обезболивающие и т.п.
При признаках опасного состояния (сильная боль, отёк лица/шеи, затруднённое дыхание/глотание, высокая температура, травма с подозрением на перелом) — чётко рекомендуй срочно обратиться к врачу/в неотложку и помечай, что ситуация может быть срочной.
Не проси файлы (фото, КТ и т.п.), если это запрещено политикой приложения; используй только данные, которые даёт система.
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
- JSON должен быть строго валидным: без комментариев, без лишнего текста до или после объекта.`;

      const userContext = {
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
            tooth_id: String(t.toothNumber),
            problems: t.problems,
            notes: t.notes
          }))
        },
        analysis: latestTest ? {
          gum_risk: latestTest.gumsRiskScore > 60 ? "high" : latestTest.gumsRiskScore > 30 ? "medium" : "low",
          tooth_risk: latestTest.teethRiskScore > 60 ? "high" : latestTest.teethRiskScore > 30 ? "medium" : "low"
        } : null,
        chat_context: {
          history: Array.isArray(history) ? history.slice(-8) : [],
          user_message: message
        }
      };

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      if (Array.isArray(history) && history.length > 0) {
        const validHistory = history.slice(-6);
        const alternatingMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
        
        for (const msg of validHistory) {
          if (msg.role === "user" || msg.role === "assistant") {
            const lastMsg = alternatingMessages[alternatingMessages.length - 1];
            if (!lastMsg || lastMsg.role !== msg.role) {
              alternatingMessages.push({ role: msg.role, content: msg.content });
            }
          }
        }
        
        if (alternatingMessages.length > 0) {
          if (alternatingMessages[0].role === "assistant") {
            alternatingMessages.shift();
          }
          
          if (alternatingMessages.length > 0) {
            const last = alternatingMessages[alternatingMessages.length - 1];
            if (last.role === "user") {
              alternatingMessages.push({ 
                role: "assistant", 
                content: "Понял, продолжаем." 
              });
            }
          }
          
          messages.push(...alternatingMessages);
        }
      }

      messages.push({ 
        role: "user", 
        content: `Контекст пользователя:\n${JSON.stringify(userContext, null, 2)}\n\nСообщение: ${message}` 
      });

      const response = await perplexity.chat.completions.create({
        model: "sonar",
        messages,
      });

      const content = response.choices[0].message.content || "";
      
      try {
        const parsed = JSON.parse(content);
        
        if (userId && parsed.state_updates) {
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
              if (tooth.mark_for_check && tooth.tooth_id) {
                const toothId = String(tooth.tooth_id);
                if (!validToothNumbers.includes(toothId)) {
                  console.warn(`Invalid tooth_id from AI: ${toothId}, skipping`);
                  continue;
                }
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
        
        if (userId && parsed.safety?.needs_urgent_care) {
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
        return res.json({ response: content });
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

  const httpServer = createServer(app);

  return httpServer;
}
