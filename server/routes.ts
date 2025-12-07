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

  // AI Recommendations Route
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  app.post("/api/recommendations", async (req: Request, res: Response) => {
    try {
      const openai = getOpenAIClient();
      if (!openai) {
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

Ответьте в формате JSON с полями:
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

Предоставьте персонализированные рекомендации на основе этих данных.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content || "{}");

      return res.json(parsed);
    } catch (error) {
      console.error("AI recommendations error:", error);
      return res.status(500).json({ error: "Ошибка получения рекомендаций" });
    }
  });

  // AI Chat Route
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const openai = getOpenAIClient();
      if (!openai) {
        return res.status(503).json({ 
          error: "AI недоступен", 
          response: "AI-консультант временно недоступен. Пожалуйста, попробуйте позже."
        });
      }

      const { message, history } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Требуется сообщение" });
      }

      const systemPrompt = `Вы - виртуальный стоматологический консультант. Ваша задача - отвечать на вопросы о здоровье зубов и полости рта на русском языке.

Правила:
1. Давайте полезные и понятные советы о гигиене полости рта
2. Отвечайте дружелюбно и профессионально
3. При серьёзных симптомах рекомендуйте обратиться к стоматологу
4. Не ставьте диагнозы - только общие рекомендации
5. Отвечайте кратко и по существу (2-4 абзаца максимум)
6. Если вопрос не связан со стоматологией, вежливо напомните, что вы специализируетесь на здоровье зубов`;

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      if (Array.isArray(history)) {
        for (const msg of history.slice(-8)) {
          if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }

      messages.push({ role: "user", content: message });

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages,
        max_completion_tokens: 1024,
      });

      const content = response.choices[0].message.content || "Извините, не удалось получить ответ.";

      return res.json({ response: content });
    } catch (error) {
      console.error("AI chat error:", error);
      return res.status(500).json({ error: "Ошибка чата" });
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
