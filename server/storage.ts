// Database storage using javascript_database blueprint
import {
  users,
  userProfiles,
  toothData,
  testResults,
  feedback,
  alerts,
  toothHistory,
  toothFiles,
  calendarEvents,
  chatSessions,
  chatMessages,
  type User,
  type InsertUser,
  type UserProfile,
  type InsertUserProfile,
  type ToothData,
  type InsertToothData,
  type TestResult,
  type InsertTestResult,
  type Feedback,
  type InsertFeedback,
  type Alert,
  type InsertAlert,
  type ToothHistory,
  type InsertToothHistory,
  type ToothFile,
  type InsertToothFile,
  type CalendarEvent,
  type InsertCalendarEvent,
  type ChatSession,
  type ChatMessage,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc } from "drizzle-orm";

// ─── App Settings helpers ────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const res = await pool.query(
    "SELECT value FROM app_settings WHERE key = $1",
    [key]
  );
  return res.rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  );
}

export async function seedDefaultSettings(): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES
       ('daily_message_limit', '20', NOW()),
       ('daily_file_limit', '2', NOW())
     ON CONFLICT (key) DO NOTHING`
  );
}

// ─── AI Usage helpers ────────────────────────────────────────────────────────

export interface DayUsage {
  messagesCount: number;
  filesCount: number;
}

export async function getOrCreateUsage(userId: string, date: string): Promise<DayUsage> {
  await pool.query(
    `INSERT INTO ai_usage (user_id, date, messages_count, files_count)
     VALUES ($1, $2, 0, 0)
     ON CONFLICT (user_id, date) DO NOTHING`,
    [userId, date]
  );
  const res = await pool.query(
    "SELECT messages_count, files_count FROM ai_usage WHERE user_id = $1 AND date = $2",
    [userId, date]
  );
  return {
    messagesCount: res.rows[0]?.messages_count ?? 0,
    filesCount: res.rows[0]?.files_count ?? 0,
  };
}

export async function incrementUsage(
  userId: string,
  date: string,
  field: "messages" | "files"
): Promise<void> {
  const col = field === "messages" ? "messages_count" : "files_count";
  await pool.query(
    `INSERT INTO ai_usage (user_id, date, messages_count, files_count, input_tokens, output_tokens)
     VALUES ($1, $2, ${field === "messages" ? 1 : 0}, ${field === "files" ? 1 : 0}, 0, 0)
     ON CONFLICT (user_id, date) DO UPDATE SET ${col} = ai_usage.${col} + 1`,
    [userId, date]
  );
}

export async function addTokenUsage(
  userId: string,
  date: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  await pool.query(
    `INSERT INTO ai_usage (user_id, date, messages_count, files_count, input_tokens, output_tokens)
     VALUES ($1, $2, 0, 0, $3, $4)
     ON CONFLICT (user_id, date) DO UPDATE SET
       input_tokens = ai_usage.input_tokens + EXCLUDED.input_tokens,
       output_tokens = ai_usage.output_tokens + EXCLUDED.output_tokens`,
    [userId, date, inputTokens, outputTokens]
  );
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // User Profiles
  getProfile(userId: string): Promise<UserProfile | undefined>;
  createProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;

  // Tooth Data
  getToothData(userId: string): Promise<ToothData[]>;
  getToothDataByNumber(userId: string, toothNumber: number): Promise<ToothData | undefined>;
  upsertToothData(data: InsertToothData): Promise<ToothData>;
  deleteToothData(userId: string, toothNumber: number): Promise<void>;

  // Test Results
  getTestResults(userId: string): Promise<TestResult[]>;
  getLatestTestResult(userId: string): Promise<TestResult | undefined>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  updateTestResultAIRecommendations(testResultId: string, aiRecommendations: any): Promise<void>;

  // Feedback
  createFeedback(data: InsertFeedback): Promise<Feedback>;

  // Alerts
  getAlerts(userId: string): Promise<Alert[]>;
  getActiveAlerts(userId: string): Promise<Alert[]>;
  createAlert(data: InsertAlert): Promise<Alert>;
  dismissAlert(alertId: string): Promise<void>;
  markAlertRead(alertId: string): Promise<void>;

  // Tooth History
  getToothHistory(userId: string): Promise<ToothHistory[]>;
  getToothHistoryByTooth(userId: string, toothId: string): Promise<ToothHistory[]>;
  createToothHistoryEvent(data: InsertToothHistory): Promise<ToothHistory>;

  // Tooth Files
  getToothFiles(userId: string): Promise<ToothFile[]>;
  createToothFile(data: InsertToothFile): Promise<ToothFile>;
  updateToothFile(fileId: string, data: Partial<InsertToothFile>): Promise<ToothFile | undefined>;
  deleteToothFile(fileId: string): Promise<void>;

  // Calendar Events
  getCalendarEvents(userId: string): Promise<CalendarEvent[]>;
  getCalendarEventsByMonth(userId: string, year: number, month: number): Promise<CalendarEvent[]>;
  getCalendarEvent(eventId: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(eventId: string, data: Partial<InsertCalendarEvent> & { googleCalendarEventId?: string | null }): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(eventId: string): Promise<void>;

  // Chat Sessions & Messages
  getOrCreateActiveSession(userId: string): Promise<ChatSession>;
  createNewSession(userId: string): Promise<ChatSession>;
  updateSessionSummary(sessionId: string, summary: string): Promise<void>;
  getChatHistory(userId: string): Promise<ChatMessage[]>;
  getSessionMessages(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  saveChatMessage(data: { chatId: string; userId: string; role: string; content: string; metadata?: Record<string, unknown> | null }): Promise<ChatMessage>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // User Profiles
  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  // Tooth Data
  async getToothData(userId: string): Promise<ToothData[]> {
    return db.select().from(toothData).where(eq(toothData.userId, userId));
  }

  async getToothDataByNumber(userId: string, toothNumber: number): Promise<ToothData | undefined> {
    const [data] = await db
      .select()
      .from(toothData)
      .where(and(eq(toothData.userId, userId), eq(toothData.toothNumber, toothNumber)));
    return data || undefined;
  }

  async upsertToothData(data: InsertToothData): Promise<ToothData> {
    const existing = await this.getToothDataByNumber(data.userId, data.toothNumber);
    if (existing) {
      const [updated] = await db
        .update(toothData)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(toothData.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(toothData).values(data).returning();
    return created;
  }

  async deleteToothData(userId: string, toothNumber: number): Promise<void> {
    await db
      .delete(toothData)
      .where(and(eq(toothData.userId, userId), eq(toothData.toothNumber, toothNumber)));
  }

  // Test Results
  async getTestResults(userId: string): Promise<TestResult[]> {
    return db
      .select()
      .from(testResults)
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.createdAt));
  }

  async getLatestTestResult(userId: string): Promise<TestResult | undefined> {
    const [result] = await db
      .select()
      .from(testResults)
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.createdAt))
      .limit(1);
    return result || undefined;
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const [created] = await db.insert(testResults).values(result).returning();
    return created;
  }

  async updateTestResultAIRecommendations(testResultId: string, aiRecommendations: any): Promise<void> {
    await db
      .update(testResults)
      .set({ aiRecommendations })
      .where(eq(testResults.id, testResultId));
  }

  // Feedback
  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [created] = await db.insert(feedback).values(data).returning();
    return created;
  }

  // Alerts
  async getAlerts(userId: string): Promise<Alert[]> {
    return db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));
  }

  async getActiveAlerts(userId: string): Promise<Alert[]> {
    return db
      .select()
      .from(alerts)
      .where(and(eq(alerts.userId, userId), eq(alerts.isDismissed, false)))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(data: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(data).returning();
    return created;
  }

  async dismissAlert(alertId: string): Promise<void> {
    await db.update(alerts).set({ isDismissed: true }).where(eq(alerts.id, alertId));
  }

  async markAlertRead(alertId: string): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, alertId));
  }

  // Tooth History
  async getToothHistory(userId: string): Promise<ToothHistory[]> {
    return db
      .select()
      .from(toothHistory)
      .where(eq(toothHistory.userId, userId))
      .orderBy(desc(toothHistory.createdAt));
  }

  async getToothHistoryByTooth(userId: string, toothId: string): Promise<ToothHistory[]> {
    return db
      .select()
      .from(toothHistory)
      .where(and(eq(toothHistory.userId, userId), eq(toothHistory.toothId, toothId)))
      .orderBy(desc(toothHistory.createdAt));
  }

  async createToothHistoryEvent(data: InsertToothHistory): Promise<ToothHistory> {
    const [created] = await db.insert(toothHistory).values(data).returning();
    return created;
  }

  async updateToothHistoryEvent(
    eventId: string,
    data: { doctorName?: string; clinicName?: string; treatmentDetails?: string }
  ): Promise<ToothHistory | null> {
    const [updated] = await db
      .update(toothHistory)
      .set(data)
      .where(eq(toothHistory.id, eventId))
      .returning();
    return updated || null;
  }

  // Tooth Files
  async getToothFiles(userId: string): Promise<ToothFile[]> {
    return db
      .select()
      .from(toothFiles)
      .where(eq(toothFiles.userId, userId))
      .orderBy(desc(toothFiles.createdAt));
  }

  async createToothFile(data: InsertToothFile): Promise<ToothFile> {
    const [created] = await db.insert(toothFiles).values(data).returning();
    return created;
  }

  async updateToothFile(fileId: string, data: Partial<InsertToothFile>): Promise<ToothFile | undefined> {
    const [updated] = await db
      .update(toothFiles)
      .set(data)
      .where(eq(toothFiles.id, fileId))
      .returning();
    return updated;
  }

  async deleteToothFile(fileId: string): Promise<void> {
    await db.delete(toothFiles).where(eq(toothFiles.id, fileId));
  }

  // Calendar Events
  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .orderBy(desc(calendarEvents.date));
  }

  async getCalendarEvent(eventId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, eventId));
    return event || undefined;
  }

  async getCalendarEventsByMonth(userId: string, year: number, month: number): Promise<CalendarEvent[]> {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const all = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId));
    return all.filter((e) => e.date.startsWith(prefix));
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const [created] = await db.insert(calendarEvents).values(data).returning();
    return created;
  }

  async updateCalendarEvent(eventId: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const [updated] = await db
      .update(calendarEvents)
      .set(data)
      .where(eq(calendarEvents.id, eventId))
      .returning();
    return updated || undefined;
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  }

  // Chat Sessions & Messages
  async getOrCreateActiveSession(userId: string): Promise<ChatSession> {
    const [existing] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.createdAt))
      .limit(1);
    if (existing) return existing;
    return this.createNewSession(userId);
  }

  async createNewSession(userId: string): Promise<ChatSession> {
    const [created] = await db
      .insert(chatSessions)
      .values({ userId })
      .returning();
    return created;
  }

  async updateSessionSummary(sessionId: string, summary: string): Promise<void> {
    await db
      .update(chatSessions)
      .set({ summary, updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
  }

  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    const session = await this.getOrCreateActiveSession(userId);
    return this.getSessionMessages(session.id);
  }

  async getSessionMessages(sessionId: string, limit = 1000): Promise<ChatMessage[]> {
    if (limit >= 1000) {
      return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chatId, sessionId))
        .orderBy(chatMessages.createdAt);
    }
    // Fetch latest N messages in desc order, then reverse to get chronological order
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.chatId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async saveChatMessage(data: { chatId: string; userId: string; role: string; content: string; metadata?: Record<string, unknown> | null }): Promise<ChatMessage> {
    const [created] = await db
      .insert(chatMessages)
      .values({
        chatId: data.chatId,
        userId: data.userId,
        role: data.role,
        content: data.content,
        metadata: data.metadata ?? null,
      })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
