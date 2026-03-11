var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  PROBLEM_TYPES: () => PROBLEM_TYPES,
  aiUsage: () => aiUsage,
  alerts: () => alerts,
  alertsRelations: () => alertsRelations,
  appSettings: () => appSettings,
  calendarEvents: () => calendarEvents,
  calendarEventsRelations: () => calendarEventsRelations,
  emailVerifications: () => emailVerifications,
  feedback: () => feedback,
  insertAlertSchema: () => insertAlertSchema,
  insertCalendarEventSchema: () => insertCalendarEventSchema,
  insertFeedbackSchema: () => insertFeedbackSchema,
  insertTestResultSchema: () => insertTestResultSchema,
  insertToothDataSchema: () => insertToothDataSchema,
  insertToothFileSchema: () => insertToothFileSchema,
  insertToothHistorySchema: () => insertToothHistorySchema,
  insertUserProfileSchema: () => insertUserProfileSchema,
  insertUserSchema: () => insertUserSchema,
  testResults: () => testResults,
  testResultsRelations: () => testResultsRelations,
  toothData: () => toothData,
  toothDataRelations: () => toothDataRelations,
  toothFiles: () => toothFiles,
  toothFilesRelations: () => toothFilesRelations,
  toothHistory: () => toothHistory,
  toothHistoryRelations: () => toothHistoryRelations,
  userProfiles: () => userProfiles,
  userProfilesRelations: () => userProfilesRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var emailVerifications = pgTable("email_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  birthDate: text("birth_date"),
  gender: text("gender"),
  goals: text("goals"),
  location: text("location"),
  allergyToAnesthetics: text("allergy_to_anesthetics"),
  seriousIllnesses: text("serious_illnesses"),
  age: integer("age"),
  brushingFrequency: text("brushing_frequency"),
  // "once", "twice", "more"
  usesFloss: boolean("uses_floss").default(false),
  usesIrrigator: boolean("uses_irrigator").default(false),
  hasBraces: boolean("has_braces").default(false),
  hasSensitivity: boolean("has_sensitivity").default(false),
  hasGumBleeding: boolean("has_gum_bleeding").default(false),
  hasCrownsVeneers: boolean("has_crowns_veneers").default(false),
  hasRemovableDentures: boolean("has_removable_dentures").default(false),
  hasImplants: boolean("has_implants").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  disclaimerAccepted: boolean("disclaimer_accepted").default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var toothData = pgTable("tooth_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toothNumber: integer("tooth_number").notNull(),
  // 1-32 tooth numbering
  problems: jsonb("problems").default([]).notNull(),
  // Array of problem types
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var testResults = pgTable("test_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teethRiskScore: integer("teeth_risk_score").notNull(),
  // 0-100
  gumsRiskScore: integer("gums_risk_score").notNull(),
  // 0-100
  overallRiskLevel: text("overall_risk_level").notNull(),
  // "low", "moderate", "high"
  recommendations: jsonb("recommendations").default([]).notNull(),
  aiRecommendations: jsonb("ai_recommendations"),
  // Cached AI recommendations
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  // "bug", "feature", "other"
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // "teeth_at_risk", "reminder", "urgent"
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("routine"),
  // "routine", "soon", "urgent"
  relatedTeeth: jsonb("related_teeth").default([]),
  // Array of tooth IDs
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  dueTime: timestamp("due_time"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var toothHistory = pgTable("tooth_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toothId: text("tooth_id").notNull(),
  // FDI notation e.g. "26", "11"
  eventType: text("event_type").notNull(),
  // "complaint", "resolved", "check_recommended", "treatment", "note"
  reason: text("reason").notNull(),
  // Description of the event
  priority: text("priority").default("routine"),
  // "routine", "soon", "urgent"
  markForCheck: boolean("mark_for_check").default(false),
  source: text("source").default("user"),
  // "user", "ai", "system"
  doctorName: text("doctor_name"),
  // Doctor who performed treatment
  clinicName: text("clinic_name"),
  // Clinic where treatment was done
  treatmentDetails: text("treatment_details"),
  // What was done
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  // "YYYY-MM-DD"
  time: text("time"),
  // "HH:MM" optional
  type: text("type").notNull().default("personal"),
  // "appointment", "reminder", "ai_suggestion", "personal"
  source: text("source").notNull().default("user"),
  // "user", "ai"
  relatedTeeth: jsonb("related_teeth").default([]),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var toothFiles = pgTable("tooth_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  // "ct", "xray", "photo", "document", "other"
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  // Size in bytes
  description: text("description"),
  aiDescription: text("ai_description"),
  // Auto-generated by Claude on upload
  relatedTeeth: jsonb("related_teeth").default([]),
  // Array of tooth IDs
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  // "YYYY-MM-DD"
  messagesCount: integer("messages_count").default(0).notNull(),
  filesCount: integer("files_count").default(0).notNull()
}, (table) => ({
  userDateIdx: uniqueIndex("ai_usage_user_date_idx").on(table.userId, table.date)
}));
var usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  }),
  toothData: many(toothData),
  testResults: many(testResults)
}));
var userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id]
  })
}));
var toothDataRelations = relations(toothData, ({ one }) => ({
  user: one(users, {
    fields: [toothData.userId],
    references: [users.id]
  })
}));
var testResultsRelations = relations(testResults, ({ one }) => ({
  user: one(users, {
    fields: [testResults.userId],
    references: [users.id]
  })
}));
var alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id]
  })
}));
var toothHistoryRelations = relations(toothHistory, ({ one }) => ({
  user: one(users, {
    fields: [toothHistory.userId],
    references: [users.id]
  })
}));
var toothFilesRelations = relations(toothFiles, ({ one }) => ({
  user: one(users, {
    fields: [toothFiles.userId],
    references: [users.id]
  })
}));
var calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true
});
var insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  updatedAt: true
});
var insertToothDataSchema = createInsertSchema(toothData).omit({
  id: true,
  updatedAt: true
});
var insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  createdAt: true
});
var insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true
});
var insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true
});
var insertToothHistorySchema = createInsertSchema(toothHistory).omit({
  id: true,
  createdAt: true
});
var insertToothFileSchema = createInsertSchema(toothFiles).omit({
  id: true,
  createdAt: true
});
var insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true
});
var PROBLEM_TYPES = [
  "pain",
  "chip",
  "filling",
  "bleeding",
  "sensitivity",
  "cavity",
  "treated"
];

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, desc } from "drizzle-orm";
async function getSetting(key) {
  const res = await pool.query(
    "SELECT value FROM app_settings WHERE key = $1",
    [key]
  );
  return res.rows[0]?.value ?? null;
}
async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  );
}
async function seedDefaultSettings() {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES
       ('daily_message_limit', '20', NOW()),
       ('daily_file_limit', '2', NOW())
     ON CONFLICT (key) DO NOTHING`
  );
}
async function getOrCreateUsage(userId, date) {
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
    filesCount: res.rows[0]?.files_count ?? 0
  };
}
async function incrementUsage(userId, date, field) {
  const col = field === "messages" ? "messages_count" : "files_count";
  await pool.query(
    `INSERT INTO ai_usage (user_id, date, messages_count, files_count)
     VALUES ($1, $2, ${field === "messages" ? 1 : 0}, ${field === "files" ? 1 : 0})
     ON CONFLICT (user_id, date) DO UPDATE SET ${col} = ai_usage.${col} + 1`,
    [userId, date]
  );
}
var DatabaseStorage = class {
  // Users
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // User Profiles
  async getProfile(userId) {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || void 0;
  }
  async createProfile(profile) {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }
  async updateProfile(userId, profile) {
    const [updated] = await db.update(userProfiles).set({ ...profile, updatedAt: /* @__PURE__ */ new Date() }).where(eq(userProfiles.userId, userId)).returning();
    return updated || void 0;
  }
  // Tooth Data
  async getToothData(userId) {
    return db.select().from(toothData).where(eq(toothData.userId, userId));
  }
  async getToothDataByNumber(userId, toothNumber) {
    const [data] = await db.select().from(toothData).where(and(eq(toothData.userId, userId), eq(toothData.toothNumber, toothNumber)));
    return data || void 0;
  }
  async upsertToothData(data) {
    const existing = await this.getToothDataByNumber(data.userId, data.toothNumber);
    if (existing) {
      const [updated] = await db.update(toothData).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(toothData.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(toothData).values(data).returning();
    return created;
  }
  async deleteToothData(userId, toothNumber) {
    await db.delete(toothData).where(and(eq(toothData.userId, userId), eq(toothData.toothNumber, toothNumber)));
  }
  // Test Results
  async getTestResults(userId) {
    return db.select().from(testResults).where(eq(testResults.userId, userId)).orderBy(desc(testResults.createdAt));
  }
  async getLatestTestResult(userId) {
    const [result] = await db.select().from(testResults).where(eq(testResults.userId, userId)).orderBy(desc(testResults.createdAt)).limit(1);
    return result || void 0;
  }
  async createTestResult(result) {
    const [created] = await db.insert(testResults).values(result).returning();
    return created;
  }
  async updateTestResultAIRecommendations(testResultId, aiRecommendations) {
    await db.update(testResults).set({ aiRecommendations }).where(eq(testResults.id, testResultId));
  }
  // Feedback
  async createFeedback(data) {
    const [created] = await db.insert(feedback).values(data).returning();
    return created;
  }
  // Alerts
  async getAlerts(userId) {
    return db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt));
  }
  async getActiveAlerts(userId) {
    return db.select().from(alerts).where(and(eq(alerts.userId, userId), eq(alerts.isDismissed, false))).orderBy(desc(alerts.createdAt));
  }
  async createAlert(data) {
    const [created] = await db.insert(alerts).values(data).returning();
    return created;
  }
  async dismissAlert(alertId) {
    await db.update(alerts).set({ isDismissed: true }).where(eq(alerts.id, alertId));
  }
  async markAlertRead(alertId) {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, alertId));
  }
  // Tooth History
  async getToothHistory(userId) {
    return db.select().from(toothHistory).where(eq(toothHistory.userId, userId)).orderBy(desc(toothHistory.createdAt));
  }
  async getToothHistoryByTooth(userId, toothId) {
    return db.select().from(toothHistory).where(and(eq(toothHistory.userId, userId), eq(toothHistory.toothId, toothId))).orderBy(desc(toothHistory.createdAt));
  }
  async createToothHistoryEvent(data) {
    const [created] = await db.insert(toothHistory).values(data).returning();
    return created;
  }
  async updateToothHistoryEvent(eventId, data) {
    const [updated] = await db.update(toothHistory).set(data).where(eq(toothHistory.id, eventId)).returning();
    return updated || null;
  }
  // Tooth Files
  async getToothFiles(userId) {
    return db.select().from(toothFiles).where(eq(toothFiles.userId, userId)).orderBy(desc(toothFiles.createdAt));
  }
  async createToothFile(data) {
    const [created] = await db.insert(toothFiles).values(data).returning();
    return created;
  }
  async updateToothFile(fileId, data) {
    const [updated] = await db.update(toothFiles).set(data).where(eq(toothFiles.id, fileId)).returning();
    return updated;
  }
  async deleteToothFile(fileId) {
    await db.delete(toothFiles).where(eq(toothFiles.id, fileId));
  }
  // Calendar Events
  async getCalendarEvents(userId) {
    return db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(desc(calendarEvents.date));
  }
  async getCalendarEventsByMonth(userId, year, month) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const all = await db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId));
    return all.filter((e) => e.date.startsWith(prefix));
  }
  async createCalendarEvent(data) {
    const [created] = await db.insert(calendarEvents).values(data).returning();
    return created;
  }
  async updateCalendarEvent(eventId, data) {
    const [updated] = await db.update(calendarEvents).set(data).where(eq(calendarEvents.id, eventId)).returning();
    return updated || void 0;
  }
  async deleteCalendarEvent(eventId) {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  }
};
var storage = new DatabaseStorage();

// server/admin.ts
async function getAdminStats() {
  const [
    totalUsers,
    registrationsByDay,
    testStats,
    riskDistribution,
    toothProblems,
    feedbackList,
    activeUsers,
    feedbackCategories,
    aiToday,
    aiWeek,
    aiMonth,
    aiByDay,
    aiTopUsers,
    msgLimitSetting,
    fileLimitSetting
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM users`),
    pool.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        ROUND(AVG(teeth_risk_score))::int AS avg_teeth,
        ROUND(AVG(gums_risk_score))::int AS avg_gums
      FROM test_results
    `),
    pool.query(`
      SELECT overall_risk_level, COUNT(*)::int AS count
      FROM test_results
      GROUP BY overall_risk_level
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT
        problem,
        COUNT(*)::int AS count
      FROM test_results tr,
        jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(tr.recommendations) = 'array' THEN tr.recommendations
            ELSE '[]'::jsonb
          END
        ) AS problem
      GROUP BY problem
      ORDER BY count DESC
      LIMIT 10
    `).catch(() => ({ rows: [] })),
    pool.query(`
      SELECT
        f.category,
        f.message,
        f.created_at,
        u.email
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT 30
    `),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM test_results
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `),
    pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM feedback
      GROUP BY category
      ORDER BY count DESC
    `),
    // AI usage today
    pool.query(`
      SELECT COALESCE(SUM(messages_count),0)::int AS messages, COALESCE(SUM(files_count),0)::int AS files
      FROM ai_usage
      WHERE date = TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ messages: 0, files: 0 }] })),
    // AI usage last 7 days
    pool.query(`
      SELECT COALESCE(SUM(messages_count),0)::int AS messages, COALESCE(SUM(files_count),0)::int AS files
      FROM ai_usage
      WHERE date >= TO_CHAR(NOW() AT TIME ZONE 'UTC' - INTERVAL '6 days', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ messages: 0, files: 0 }] })),
    // AI usage last 30 days
    pool.query(`
      SELECT COALESCE(SUM(messages_count),0)::int AS messages, COALESCE(SUM(files_count),0)::int AS files
      FROM ai_usage
      WHERE date >= TO_CHAR(NOW() AT TIME ZONE 'UTC' - INTERVAL '29 days', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ messages: 0, files: 0 }] })),
    // AI messages by day (last 30 days)
    pool.query(`
      SELECT date, COALESCE(SUM(messages_count),0)::int AS messages
      FROM ai_usage
      WHERE date >= TO_CHAR(NOW() AT TIME ZONE 'UTC' - INTERVAL '29 days', 'YYYY-MM-DD')
      GROUP BY date
      ORDER BY date
    `).catch(() => ({ rows: [] })),
    // Top 10 users by AI messages
    pool.query(`
      SELECT u.email,
             COALESCE(SUM(a.messages_count),0)::int AS total_messages,
             COALESCE(SUM(a.files_count),0)::int    AS total_files
      FROM ai_usage a
      JOIN users u ON u.id = a.user_id
      GROUP BY u.email
      ORDER BY total_messages DESC
      LIMIT 10
    `).catch(() => ({ rows: [] })),
    getSetting("daily_message_limit"),
    getSetting("daily_file_limit")
  ]);
  const toothDataProblems = await pool.query(`
    SELECT
      problem,
      COUNT(*)::int AS count
    FROM tooth_data,
      jsonb_array_elements_text(problems) AS problem
    WHERE problem != 'treated'
    GROUP BY problem
    ORDER BY count DESC
    LIMIT 10
  `).catch(() => ({ rows: [] }));
  return {
    totalUsers: totalUsers.rows[0].count,
    registrationsByDay: registrationsByDay.rows,
    testStats: testStats.rows[0],
    riskDistribution: riskDistribution.rows,
    toothProblems: toothDataProblems.rows,
    feedbackList: feedbackList.rows,
    activeUsers: activeUsers.rows[0].count,
    feedbackCategories: feedbackCategories.rows,
    aiToday: aiToday.rows[0] ?? { messages: 0, files: 0 },
    aiWeek: aiWeek.rows[0] ?? { messages: 0, files: 0 },
    aiMonth: aiMonth.rows[0] ?? { messages: 0, files: 0 },
    aiByDay: aiByDay.rows,
    aiTopUsers: aiTopUsers.rows,
    settings: {
      daily_message_limit: msgLimitSetting ?? "20",
      daily_file_limit: fileLimitSetting ?? "2"
    }
  };
}
function renderAdminPage(stats, adminKey, saved) {
  const regLabels = JSON.stringify(stats.registrationsByDay.map((r) => r.day));
  const regData = JSON.stringify(stats.registrationsByDay.map((r) => r.count));
  const aiDayLabels = JSON.stringify(stats.aiByDay.map((r) => r.date));
  const aiDayData = JSON.stringify(stats.aiByDay.map((r) => r.messages));
  const riskLabels = JSON.stringify(stats.riskDistribution.map((r) => r.overall_risk_level));
  const riskData = JSON.stringify(stats.riskDistribution.map((r) => r.count));
  const riskColors = JSON.stringify(stats.riskDistribution.map((r) => {
    if (r.overall_risk_level === "low") return "#22c55e";
    if (r.overall_risk_level === "moderate") return "#f59e0b";
    return "#ef4444";
  }));
  const probLabels = JSON.stringify(stats.toothProblems.map((p) => p.problem));
  const probData = JSON.stringify(stats.toothProblems.map((p) => p.count));
  const fbCatLabels = JSON.stringify(stats.feedbackCategories.map((f) => f.category));
  const fbCatData = JSON.stringify(stats.feedbackCategories.map((f) => f.count));
  const CATEGORY_RU = {
    bug: "\u041E\u0448\u0438\u0431\u043A\u0430",
    feature: "\u0418\u0434\u0435\u044F",
    other: "\u0414\u0440\u0443\u0433\u043E\u0435"
  };
  const PROBLEM_RU = {
    cavity: "\u041A\u0430\u0440\u0438\u0435\u0441",
    pain: "\u0411\u043E\u043B\u044C",
    crack: "\u0422\u0440\u0435\u0449\u0438\u043D\u0430",
    sensitivity: "\u0427\u0443\u0432\u0441\u0442\u0432\u0438\u0442-\u0442\u044C",
    gum_issue: "\u0414\u0451\u0441\u043D\u044B",
    bleeding: "\u041A\u0440\u043E\u0432\u043E\u0442\u043E\u0447-\u0442\u044C",
    chip: "\u0421\u043A\u043E\u043B",
    filling: "\u041F\u043B\u043E\u043C\u0431\u0430",
    treated: "\u0412\u044B\u043B\u0435\u0447\u0435\u043D"
  };
  const RISK_RU = { low: "\u041D\u0438\u0437\u043A\u0438\u0439", moderate: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439", high: "\u0412\u044B\u0441\u043E\u043A\u0438\u0439" };
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Toothy \u2014 \u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#1e293b}
  header{background:#4A90D9;color:#fff;padding:18px 32px;display:flex;align-items:center;gap:12px}
  header h1{font-size:20px;font-weight:700}
  header span{font-size:13px;opacity:.8}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;padding:24px 32px 0}
  .stat-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .stat-card .label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .stat-card .value{font-size:32px;font-weight:700;color:#4A90D9}
  .stat-card .sub{font-size:12px;color:#94a3b8;margin-top:2px}
  .charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;padding:20px 32px}
  .chart-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .chart-card h2{font-size:14px;font-weight:600;color:#475569;margin-bottom:16px}
  .chart-wrap{position:relative;height:220px}
  .table-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin:0 32px 32px}
  .table-card h2{font-size:14px;font-weight:600;color:#475569;margin-bottom:12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:8px 12px;background:#f8fafc;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0}
  td{padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#334155}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-bug{background:#fee2e2;color:#b91c1c}
  .badge-feature{background:#dbeafe;color:#1d4ed8}
  .badge-other{background:#f1f5f9;color:#475569}
  .ts{color:#94a3b8;font-size:12px}
  footer{text-align:center;padding:16px;color:#94a3b8;font-size:12px}
  .section-title{font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;padding:20px 32px 0}
  .ai-stat-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08);border-left:4px solid #4A90D9}
  .ai-stat-card .label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .ai-stat-card .value{font-size:28px;font-weight:700;color:#4A90D9}
  .ai-stat-card .sub{font-size:12px;color:#94a3b8;margin-top:2px}
  .settings-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin:0 32px 16px}
  .settings-card h2{font-size:14px;font-weight:600;color:#475569;margin-bottom:16px}
  .settings-form{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end}
  .settings-field{display:flex;flex-direction:column;gap:4px}
  .settings-field label{font-size:12px;color:#64748b;font-weight:500}
  .settings-field input{padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;width:120px;color:#1e293b}
  .settings-field input:focus{outline:none;border-color:#4A90D9}
  .settings-btn{padding:9px 20px;background:#4A90D9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500}
  .settings-btn:hover{background:#3b7ec8}
  .saved-banner{background:#dcfce7;color:#166534;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;display:inline-block;margin-left:12px}
</style>
</head>
<body>
<header>
  <svg width="28" height="28" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="white"/><path d="M13,18 C13,12 16,9 20,9 C24,9 27,12 27,18 L26,28 C26,31 25,34 23,34 C22,34 21,32 20.5,30 L20,30 L19.5,30 C19,32 18,34 17,34 C15,34 14,31 14,28 Z" fill="#4A90D9"/></svg>
  <div>
    <h1>Toothy Admin</h1>
    <span>\u041F\u0430\u043D\u0435\u043B\u044C \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0438 \xB7 ${(/* @__PURE__ */ new Date()).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
  </div>
</header>

<div class="grid">
  <div class="stat-card">
    <div class="label">\u0412\u0441\u0435\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439</div>
    <div class="value">${stats.totalUsers}</div>
  </div>
  <div class="stat-card">
    <div class="label">\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 (30 \u0434\u043D\u0435\u0439)</div>
    <div class="value">${stats.activeUsers}</div>
    <div class="sub">\u043F\u0440\u043E\u0448\u043B\u0438 \u0442\u0435\u0441\u0442 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F</div>
  </div>
  <div class="stat-card">
    <div class="label">\u0422\u0435\u0441\u0442\u043E\u0432 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E</div>
    <div class="value">${stats.testStats?.total ?? 0}</div>
  </div>
  <div class="stat-card">
    <div class="label">\u0421\u0440. \u0440\u0438\u0441\u043A \u0437\u0443\u0431\u043E\u0432 / \u0434\u0451\u0441\u0435\u043D</div>
    <div class="value">${stats.testStats?.avg_teeth ?? "\u2014"}<span style="font-size:16px;color:#94a3b8"> / ${stats.testStats?.avg_gums ?? "\u2014"}</span></div>
    <div class="sub">\u0431\u0430\u043B\u043B\u043E\u0432 \u0438\u0437 100</div>
  </div>
  <div class="stat-card">
    <div class="label">\u041E\u0442\u0437\u044B\u0432\u043E\u0432 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E</div>
    <div class="value">${stats.feedbackList.length}</div>
    <div class="sub">\u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 30</div>
  </div>
</div>

<p class="section-title">\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u0418\u0418</p>
<div class="grid" style="padding-top:12px">
  <div class="ai-stat-card">
    <div class="label">\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u0441\u0435\u0433\u043E\u0434\u043D\u044F</div>
    <div class="value">${stats.aiToday.messages}</div>
    <div class="sub">\u0444\u0430\u0439\u043B\u043E\u0432: ${stats.aiToday.files} \xB7 \u043B\u0438\u043C\u0438\u0442: ${stats.settings.daily_message_limit}/\u0434\u0435\u043D\u044C</div>
  </div>
  <div class="ai-stat-card">
    <div class="label">\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u0437\u0430 7 \u0434\u043D\u0435\u0439</div>
    <div class="value">${stats.aiWeek.messages}</div>
    <div class="sub">\u0444\u0430\u0439\u043B\u043E\u0432: ${stats.aiWeek.files}</div>
  </div>
  <div class="ai-stat-card">
    <div class="label">\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u0437\u0430 30 \u0434\u043D\u0435\u0439</div>
    <div class="value">${stats.aiMonth.messages}</div>
    <div class="sub">\u0444\u0430\u0439\u043B\u043E\u0432: ${stats.aiMonth.files}</div>
  </div>
</div>

<div class="charts" style="padding-top:16px">
  <div class="chart-card" style="grid-column:1/-1">
    <h2>\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u0432 \u0434\u0435\u043D\u044C (\u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 30 \u0434\u043D\u0435\u0439)</h2>
    <div class="chart-wrap"><canvas id="aiChart"></canvas></div>
  </div>
</div>

<div class="settings-card">
  <h2>\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043B\u0438\u043C\u0438\u0442\u043E\u0432 \u0418\u0418 (\u0432 \u0434\u0435\u043D\u044C \u043D\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F)</h2>
  <form class="settings-form" method="POST" action="/admin/settings">
    <input type="hidden" name="key" value="${adminKey ?? ""}" />
    <div class="settings-field">
      <label>\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 (\u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E)</label>
      <input type="number" name="daily_message_limit" value="${stats.settings.daily_message_limit}" min="0" max="9999" />
    </div>
    <div class="settings-field">
      <label>\u0424\u0430\u0439\u043B\u043E\u0432 (\u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u043E)</label>
      <input type="number" name="daily_file_limit" value="${stats.settings.daily_file_limit}" min="0" max="99" />
    </div>
    <button type="submit" class="settings-btn">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>
    ${saved ? `<span class="saved-banner">\u2713 \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E</span>` : ""}
  </form>
</div>

<div class="table-card">
  <h2>\u0422\u043E\u043F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u043F\u043E \u0418\u0418</h2>
  <table>
    <thead><tr><th>Email</th><th>\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 (\u0432\u0441\u0435\u0433\u043E)</th><th>\u0424\u0430\u0439\u043B\u043E\u0432 (\u0432\u0441\u0435\u0433\u043E)</th></tr></thead>
    <tbody>
      ${stats.aiTopUsers.map((u) => `
      <tr>
        <td>${u.email}</td>
        <td><strong>${u.total_messages}</strong></td>
        <td>${u.total_files}</td>
      </tr>`).join("") || `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:24px">\u0414\u0430\u043D\u043D\u044B\u0445 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442</td></tr>`}
    </tbody>
  </table>
</div>

<div class="charts">
  <div class="chart-card" style="grid-column:1/-1">
    <h2>\u041D\u043E\u0432\u044B\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 (\u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 30 \u0434\u043D\u0435\u0439)</h2>
    <div class="chart-wrap"><canvas id="regChart"></canvas></div>
  </div>
  <div class="chart-card">
    <h2>\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0440\u0438\u0441\u043A\u0430 \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u043E\u0432</h2>
    <div class="chart-wrap"><canvas id="riskChart"></canvas></div>
  </div>
  <div class="chart-card">
    <h2>\u0427\u0430\u0441\u0442\u044B\u0435 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u0441 \u0437\u0443\u0431\u0430\u043C\u0438</h2>
    <div class="chart-wrap"><canvas id="probChart"></canvas></div>
  </div>
  <div class="chart-card">
    <h2>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 \u043E\u0442\u0437\u044B\u0432\u043E\u0432</h2>
    <div class="chart-wrap"><canvas id="fbChart"></canvas></div>
  </div>
</div>

<div class="table-card">
  <h2>\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043E\u0442\u0437\u044B\u0432\u044B \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439</h2>
  <table>
    <thead><tr><th>\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F</th><th>\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435</th><th>Email</th><th>\u0414\u0430\u0442\u0430</th></tr></thead>
    <tbody>
      ${stats.feedbackList.map((f) => `
      <tr>
        <td><span class="badge badge-${f.category}">${CATEGORY_RU[f.category] ?? f.category}</span></td>
        <td>${f.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td>${f.email ?? "<i style='color:#94a3b8'>\u0430\u043D\u043E\u043D\u0438\u043C</i>"}</td>
        <td class="ts">${new Date(f.created_at).toLocaleDateString("ru-RU")}</td>
      </tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:24px">\u041E\u0442\u0437\u044B\u0432\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442</td></tr>`}
    </tbody>
  </table>
</div>

<footer>Toothy Admin \xB7 \u0414\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u043F\u0440\u0438 \u043A\u0430\u0436\u0434\u043E\u043C \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B</footer>

<script>
const PROB_RU = ${JSON.stringify(PROBLEM_RU)};
const RISK_RU = ${JSON.stringify(RISK_RU)};

new Chart(document.getElementById('aiChart'), {
  type: 'line',
  data: {
    labels: ${aiDayLabels},
    datasets: [{ label: '\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439', data: ${aiDayData}, borderColor: '#4A90D9', backgroundColor: 'rgba(74,144,217,0.1)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3 }]
  },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: false }
});

new Chart(document.getElementById('regChart'), {
  type: 'bar',
  data: {
    labels: ${regLabels},
    datasets: [{ label: '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0439', data: ${regData}, backgroundColor: '#4A90D9', borderRadius: 4 }]
  },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: false }
});

new Chart(document.getElementById('riskChart'), {
  type: 'doughnut',
  data: {
    labels: ${riskLabels}.map(l => RISK_RU[l] || l),
    datasets: [{ data: ${riskData}, backgroundColor: ${riskColors}, borderWidth: 2 }]
  },
  options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
});

new Chart(document.getElementById('probChart'), {
  type: 'bar',
  data: {
    labels: ${probLabels}.map(l => PROB_RU[l] || l),
    datasets: [{ label: '\u0421\u043B\u0443\u0447\u0430\u0435\u0432', data: ${probData}, backgroundColor: '#7AADE6', borderRadius: 4 }]
  },
  options: { plugins: { legend: { display: false } }, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: false }
});

new Chart(document.getElementById('fbChart'), {
  type: 'pie',
  data: {
    labels: ${fbCatLabels}.map(l => ({ bug: '\u041E\u0448\u0438\u0431\u043A\u0430', feature: '\u0418\u0434\u0435\u044F', other: '\u0414\u0440\u0443\u0433\u043E\u0435' })[l] || l),
    datasets: [{ data: ${fbCatData}, backgroundColor: ['#ef4444','#3b82f6','#94a3b8'], borderWidth: 2 }]
  },
  options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
});
</script>
</body>
</html>`;
}

// server/routes.ts
import { createHash, randomInt } from "crypto";
import Anthropic from "@anthropic-ai/sdk";

// server/email.ts
import { Resend } from "resend";
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}
async function sendVerificationEmail(to, code) {
  const resend = getResend();
  if (!resend) throw new Error("RESEND_API_KEY \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D");
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 email \u2014 Toothy</title>
</head>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FA;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4A90D9,#7AADE6);padding:36px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-block;line-height:40px;text-align:center;font-size:20px;">\u{1F9B7}</div>
                <span style="color:#FFFFFF;font-size:24px;font-weight:700;letter-spacing:0.5px;">Toothy</span>
              </div>
              <div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;margin-top:4px;">DENTAL CARE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#1A1A2E;font-size:22px;font-weight:700;">\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438</h2>
              <p style="margin:0 0 28px;color:#64748B;font-size:15px;line-height:1.6;">
                \u0414\u043B\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0432 Toothy \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438:
              </p>
              <div style="background:#F0F4FA;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <div style="letter-spacing:14px;font-size:42px;font-weight:800;color:#4A90D9;font-family:'Courier New',monospace;">${code}</div>
                <div style="color:#94A3B8;font-size:13px;margin-top:12px;">\u041A\u043E\u0434 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u0435\u043D 10 \u043C\u0438\u043D\u0443\u0442</div>
              </div>
              <p style="margin:0;color:#94A3B8;font-size:13px;line-height:1.6;">
                \u0415\u0441\u043B\u0438 \u0432\u044B \u043D\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043B\u0438\u0441\u044C \u0432 Toothy, \u043F\u0440\u043E\u0441\u0442\u043E \u043F\u0440\u043E\u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u044D\u0442\u043E \u043F\u0438\u0441\u044C\u043C\u043E.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:20px 40px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="margin:0;color:#CBD5E1;font-size:12px;">\xA9 2026 Toothy. \u0412\u0430\u0448 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
  const result = await resend.emails.send({
    from: "Toothy <noreply@artificecheat.ru>",
    to,
    subject: `${code} \u2014 \u0432\u0430\u0448 \u043A\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F Toothy`,
    html
  });
  if (result.error) {
    throw new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043F\u0438\u0441\u044C\u043C\u0430: ${result.error.message}`);
  }
}

// server/routes.ts
function getClaude() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
var CLAUDE_MAIN = "claude-opus-4-5";
var CLAUDE_FAST = "claude-haiku-4-5";
function detectFileTypeFromMime(mimeType, name) {
  if (mimeType === "application/pdf" || name.endsWith(".pdf")) return "document";
  if (mimeType.startsWith("image/")) return "photo";
  const lower = name.toLowerCase();
  if (lower.includes("\u043A\u0442") || lower.includes("ct") || lower.includes("\u0442\u043E\u043C\u043E")) return "ct";
  if (lower.includes("\u0440\u0435\u043D\u0442") || lower.includes("xray") || lower.includes("x-ray")) return "xray";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "document";
  return "other";
}
function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}
function getTodayUTC() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
async function checkDailyLimits(userId, hasFiles) {
  const date = getTodayUTC();
  const [messageLimitStr, fileLimitStr, usage] = await Promise.all([
    getSetting("daily_message_limit"),
    getSetting("daily_file_limit"),
    getOrCreateUsage(userId, date)
  ]);
  const messageLimit = parseInt(messageLimitStr ?? "20", 10);
  const fileLimit = parseInt(fileLimitStr ?? "2", 10);
  if (usage.messagesCount >= messageLimit) {
    return { limited: true, reason: "messages", used: usage.messagesCount, limit: messageLimit };
  }
  if (hasFiles && usage.filesCount >= fileLimit) {
    return { limited: true, reason: "files", used: usage.filesCount, limit: fileLimit };
  }
  return { limited: false };
}
async function registerRoutes(app2) {
  seedDefaultSettings().catch((e) => console.error("Settings seed error:", e));
  app2.post("/api/auth/send-code", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 email" });
      }
      const emailLower = email.trim().toLowerCase();
      const code = String(randomInt(1e5, 999999));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
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
      } catch (emailErr) {
        if (process.env.NODE_ENV !== "production") {
          console.log(`
[DEV] Email \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D (Resend \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435). \u041A\u043E\u0434 \u0434\u043B\u044F ${emailLower}: ${code}
`);
          return res.status(200).json({ sent: true, devMode: true });
        }
        throw emailErr;
      }
      return res.status(200).json({ sent: true });
    } catch (err) {
      console.error("send-code error:", err);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043F\u0438\u0441\u044C\u043C\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 email \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430." });
    }
  });
  app2.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 email \u0438 \u043A\u043E\u0434" });
      }
      const emailLower = email.trim().toLowerCase();
      const result = await pool.query(
        `SELECT * FROM email_verifications WHERE email = $1 AND code = $2 AND used = false ORDER BY created_at DESC LIMIT 1`,
        [emailLower, String(code).trim()]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043E\u0434" });
      }
      const row = result.rows[0];
      if (new Date(row.expires_at) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "\u041A\u043E\u0434 \u0438\u0441\u0442\u0451\u043A. \u0417\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439" });
      }
      return res.status(200).json({ verified: true });
    } catch (err) {
      console.error("verify-code error:", err);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043A\u043E\u0434\u0430" });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const { email, password } = parsed.data;
      const verificationCode = req.body.verificationCode;
      const emailLower = email.trim().toLowerCase();
      if (!verificationCode) {
        return res.status(400).json({ error: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043A\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F email" });
      }
      const verifyResult = await pool.query(
        `SELECT * FROM email_verifications WHERE email = $1 AND code = $2 AND used = false ORDER BY created_at DESC LIMIT 1`,
        [emailLower, String(verificationCode).trim()]
      );
      if (verifyResult.rows.length === 0) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0438\u043B\u0438 \u0438\u0441\u0442\u0451\u043A\u0448\u0438\u0439 \u043A\u043E\u0434" });
      }
      if (new Date(verifyResult.rows[0].expires_at) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "\u041A\u043E\u0434 \u0438\u0441\u0442\u0451\u043A" });
      }
      const existingUser = await storage.getUserByEmail(emailLower);
      if (existingUser) {
        return res.status(409).json({ error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442" });
      }
      const hashedPassword = hashPassword(password);
      const user = await storage.createUser({ email: emailLower, password: hashedPassword });
      await storage.createProfile({ userId: user.id });
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
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 email \u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 email \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
      }
      const hashedPassword = hashPassword(password);
      if (user.password !== hashedPassword) {
        return res.status(401).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 email \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
      }
      return res.json({
        id: user.id,
        email: user.email
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.get("/api/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      return res.json(profile);
    } catch (error) {
      console.error("Get profile error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/profile", async (req, res) => {
    try {
      const parsed = insertUserProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const profile = await storage.createProfile(parsed.data);
      return res.status(201).json(profile);
    } catch (error) {
      console.error("Create profile error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.patch("/api/profile/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.updateProfile(userId, req.body);
      if (!profile) {
        return res.status(404).json({ error: "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      return res.json(profile);
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.get("/api/tooth-data/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const data = await storage.getToothData(userId);
      return res.json(data);
    } catch (error) {
      console.error("Get tooth data error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/tooth-data", async (req, res) => {
    try {
      const parsed = insertToothDataSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const data = await storage.upsertToothData(parsed.data);
      return res.status(201).json(data);
    } catch (error) {
      console.error("Create tooth data error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.delete("/api/tooth-data/:userId/:toothNumber", async (req, res) => {
    try {
      const { userId, toothNumber } = req.params;
      await storage.deleteToothData(userId, parseInt(toothNumber, 10));
      return res.status(204).send();
    } catch (error) {
      console.error("Delete tooth data error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.get("/api/test-results/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const results = await storage.getTestResults(userId);
      return res.json(results);
    } catch (error) {
      console.error("Get test results error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.get("/api/test-results/:userId/latest", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await storage.getLatestTestResult(userId);
      if (!result) {
        return res.status(404).json({ error: "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" });
      }
      return res.json(result);
    } catch (error) {
      console.error("Get latest test result error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/test-results", async (req, res) => {
    try {
      const parsed = insertTestResultSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const result = await storage.createTestResult(parsed.data);
      return res.status(201).json(result);
    } catch (error) {
      console.error("Create test result error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/recommendations", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F userId" });
      const latestTest = await storage.getLatestTestResult(userId);
      if (!latestTest) {
        return res.status(400).json({
          error: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u0442\u0435\u0441\u0442",
          recommendations: [],
          summary: "\u041F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u0442\u0435\u0441\u0442 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F \u0437\u0443\u0431\u043E\u0432, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438.",
          urgentAction: null
        });
      }
      if (latestTest.aiRecommendations) {
        return res.json(latestTest.aiRecommendations);
      }
      const claude = getClaude();
      if (!claude) {
        return res.status(503).json({
          error: "AI \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
          recommendations: [],
          summary: "AI-\u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.",
          urgentAction: null
        });
      }
      const [profile, toothData2] = await Promise.all([
        storage.getProfile(userId),
        storage.getToothData(userId)
      ]);
      const response = await claude.messages.create({
        model: CLAUDE_MAIN,
        max_tokens: 2048,
        system: `\u0422\u044B \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u043D\u0442. \u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u0435 \u0437\u0443\u0431\u043E\u0432 \u0438 \u0434\u0430\u0432\u0430\u0439 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043D\u0430 \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u044F\u0437\u044B\u043A\u0435.
\u0412\u0410\u0416\u041D\u041E: \u0412 \u043F\u043E\u043B\u044F\u0445 title, description, summary \u0438 urgentAction \u2014 \u043F\u0440\u043E\u0441\u0442\u043E\u0439 \u0442\u0435\u043A\u0441\u0442 \u0411\u0415\u0417 Markdown-\u0444\u043E\u0440\u043C\u0430\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F, \u0431\u0435\u0437 *, \u0436\u0438\u0440\u043D\u043E\u0433\u043E, \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432, \u043D\u0443\u043C\u0435\u0440\u0430\u0446\u0438\u0438. \u0422\u043E\u043B\u044C\u043A\u043E \u043E\u0431\u044B\u0447\u043D\u044B\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F. \u042D\u043C\u043E\u0434\u0437\u0438 \u043C\u043E\u0436\u043D\u043E.
\u041E\u0442\u0432\u0435\u0442\u044C \u0422\u041E\u041B\u042C\u041A\u041E \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u043C JSON \u0431\u0435\u0437 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0439:
{"recommendations":[{"title":"string","description":"string","priority":"high"|"medium"|"low","category":"hygiene"|"diet"|"visit"|"treatment"|"prevention"}],"summary":"string","urgentAction":"string|null"}`,
        messages: [{
          role: "user",
          content: `\u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:
- \u0412\u043E\u0437\u0440\u0430\u0441\u0442: ${profile?.age || "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"}
- \u0427\u0430\u0441\u0442\u043E\u0442\u0430 \u0447\u0438\u0441\u0442\u043A\u0438: ${profile?.brushingFrequency || "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"}
- \u041D\u0438\u0442\u044C: ${profile?.usesFloss ? "\u0434\u0430" : "\u043D\u0435\u0442"}, \u0438\u0440\u0440\u0438\u0433\u0430\u0442\u043E\u0440: ${profile?.usesIrrigator ? "\u0434\u0430" : "\u043D\u0435\u0442"}
- \u0411\u0440\u0435\u043A\u0435\u0442\u044B: ${profile?.hasBraces ? "\u0434\u0430" : "\u043D\u0435\u0442"}, \u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C: ${profile?.hasSensitivity ? "\u0434\u0430" : "\u043D\u0435\u0442"}, \u043A\u0440\u043E\u0432\u043E\u0442\u043E\u0447\u0438\u0432\u043E\u0441\u0442\u044C: ${profile?.hasGumBleeding ? "\u0434\u0430" : "\u043D\u0435\u0442"}
\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u043D\u044B\u0435 \u0437\u0443\u0431\u044B: ${JSON.stringify((toothData2 || []).filter((t) => t.problems.length > 0))}
\u0422\u0435\u0441\u0442: \u0440\u0438\u0441\u043A \u0437\u0443\u0431\u043E\u0432 ${latestTest.teethRiskScore}%, \u0434\u0451\u0441\u0435\u043D ${latestTest.gumsRiskScore}%, \u0443\u0440\u043E\u0432\u0435\u043D\u044C: ${latestTest.overallRiskLevel}
\u041E\u0442\u0432\u0435\u0442\u044C \u0422\u041E\u041B\u042C\u041A\u041E JSON.`
        }]
      });
      const raw = response.content[0].text || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || "{}");
      await storage.updateTestResultAIRecommendations(latestTest.id, parsed);
      return res.json(parsed);
    } catch (error) {
      console.error("AI recommendations error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0439" });
    }
  });
  app2.post("/api/chat", async (req, res) => {
    try {
      const claude = getClaude();
      if (!claude) {
        return res.status(503).json({
          error: "AI \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
          response: "AI-\u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u043D\u0442 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435."
        });
      }
      const { message, history, userId, files: incomingFiles, userContext } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435" });
      }
      if (userId) {
        const hasFiles = Array.isArray(incomingFiles) && incomingFiles.length > 0;
        const limitResult = await checkDailyLimits(userId, hasFiles);
        if (limitResult.limited) {
          return res.status(429).json({
            error: "daily_limit_reached",
            reason: limitResult.reason,
            used: limitResult.used,
            limit: limitResult.limit
          });
        }
      }
      const localMode = !!userContext;
      let userProfile = null;
      let toothData2 = [];
      let latestTest = null;
      let upcomingEvents = [];
      let existingFiles = [];
      if (localMode) {
        userProfile = userContext.profile || null;
        toothData2 = userContext.toothData || [];
        latestTest = userContext.latestTest || null;
        upcomingEvents = userContext.upcomingEvents || [];
        existingFiles = (userContext.existingFiles || []).map((f) => ({
          fileName: f.fileName,
          aiDescription: f.aiDescription,
          description: f.aiDescription
        }));
      } else if (userId) {
        try {
          [userProfile, toothData2, latestTest, existingFiles] = await Promise.all([
            storage.getProfile(userId),
            storage.getToothData(userId),
            storage.getLatestTestResult(userId),
            storage.getToothFiles(userId)
          ]);
          const allEvents = await storage.getCalendarEvents(userId);
          const today = /* @__PURE__ */ new Date();
          const in90days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1e3);
          const todayStr = today.toISOString().split("T")[0];
          const limitStr = in90days.toISOString().split("T")[0];
          upcomingEvents = allEvents.filter((e) => e.date >= todayStr && e.date <= limitStr && !e.isCompleted).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 20);
        } catch (e) {
          console.error("Error fetching user data for chat:", e);
        }
      }
      const savedNewFiles = [];
      if (Array.isArray(incomingFiles) && incomingFiles.length > 0) {
        for (const f of incomingFiles) {
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
                  relatedTeeth: []
                });
                savedNewFiles.push(saved);
              } else {
                savedNewFiles.push({ fileName: f.name, aiDescription: null, _base64: f.base64Data, _mimeType: f.mimeType });
              }
              continue;
            }
            const descContent = [];
            if (isImage) {
              const supportedMime = ["image/jpeg", "image/png", "image/gif", "image/webp"];
              const mime = supportedMime.includes(f.mimeType) ? f.mimeType : "image/jpeg";
              descContent.push({ type: "image", source: { type: "base64", media_type: mime, data: f.base64Data } });
            } else {
              descContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64Data } });
            }
            descContent.push({ type: "text", text: "\u041A\u0440\u0430\u0442\u043A\u043E \u043E\u043F\u0438\u0448\u0438 \u044D\u0442\u043E\u0442 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0432 1-2 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F\u0445: \u0447\u0442\u043E \u0437\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442, \u0434\u0430\u0442\u0430 \u0435\u0441\u043B\u0438 \u0435\u0441\u0442\u044C, \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438 \u0438\u043B\u0438 \u0442\u0435\u043C\u0430. \u041F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u0431\u0435\u0437 \u0444\u043E\u0440\u043C\u0430\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F." });
            const descResp = await claude.messages.create({
              model: CLAUDE_FAST,
              max_tokens: 200,
              messages: [{ role: "user", content: descContent }]
            });
            const aiDesc = descResp.content[0].text?.trim() || null;
            if (!localMode && userId) {
              const saved = await storage.createToothFile({
                userId,
                fileName: f.name,
                fileType: detectFileTypeFromMime(f.mimeType, f.name),
                fileUrl: `chat-upload://${f.name}`,
                fileSize: f.size ?? null,
                description: null,
                aiDescription: aiDesc,
                relatedTeeth: []
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
      const manifestFiles = [...existingFiles, ...savedNewFiles.map((f) => ({ ...f, aiDescription: f.aiDescription }))];
      const fileManifest = manifestFiles.length > 0 ? `

\u0423 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0435\u0441\u0442\u044C \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0435 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B (\u0444\u0430\u0439\u043B-\u0438\u043D\u0434\u0435\u043A\u0441):
` + manifestFiles.map((f, i) => `${i + 1}. ${f.fileName} \u2014 ${f.aiDescription || f.description || "\u0431\u0435\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F"}`).join("\n") + `

\u0415\u0441\u043B\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043F\u0440\u043E\u0441\u0438\u0442 \u043F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0444\u0430\u0439\u043B \u0438\u043B\u0438 \u0437\u0430\u0434\u0430\u0451\u0442 \u0432\u043E\u043F\u0440\u043E\u0441 \u043F\u043E \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u043C, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044E \u0438\u0437 \u0438\u043D\u0434\u0435\u043A\u0441\u0430. \u0424\u0430\u0439\u043B\u044B, \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0435 \u0432 \u044D\u0442\u043E\u043C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0438, \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u044B \u043D\u0438\u0436\u0435.` : "";
      const systemPrompt = `\u0422\u044B \u2014 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u043D\u0442 \u0432\u043D\u0443\u0442\u0440\u0438 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F Toothy.
\u0422\u0432\u043E\u044F \u0437\u0430\u0434\u0430\u0447\u0430 \u2014 \u043F\u043E\u043C\u043E\u0433\u0430\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u043F\u043E\u043D\u0438\u043C\u0430\u0442\u044C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u0437\u0443\u0431\u043E\u0432 \u0438 \u0434\u0451\u0441\u0435\u043D, \u043E\u0431\u044A\u044F\u0441\u043D\u044F\u0442\u044C \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u044B \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u043E\u0432 \u043F\u0440\u043E\u0441\u0442\u044B\u043C \u044F\u0437\u044B\u043A\u043E\u043C \u0438 \u043C\u043E\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0432\u043E\u0435\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043E\u0431\u0440\u0430\u0449\u0430\u0442\u044C\u0441\u044F \u043A \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0443. \u0422\u044B \u041D\u0415 \u0441\u0442\u0430\u0432\u0438\u0448\u044C \u0434\u0438\u0430\u0433\u043D\u043E\u0437 \u0438 \u041D\u0415 \u043D\u0430\u0437\u043D\u0430\u0447\u0430\u0435\u0448\u044C \u043B\u0435\u0447\u0435\u043D\u0438\u0435. \u0412\u0441\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043D\u043E\u0441\u0438\u0442 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u044B\u0439 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440.

\u0422\u0435\u043C\u0430\u0442\u0438\u043A\u0430 \u0438 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442
\u041E\u0442\u0432\u0435\u0447\u0430\u0439 \u0422\u041E\u041B\u042C\u041A\u041E \u043F\u043E \u0442\u0435\u043C\u0435 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0438 \u0438 \u043F\u043E\u043B\u043E\u0441\u0442\u0438 \u0440\u0442\u0430: \u0437\u0443\u0431\u044B, \u0434\u0451\u0441\u043D\u044B, \u0441\u043B\u0438\u0437\u0438\u0441\u0442\u0430\u044F, \u043F\u0440\u0438\u043A\u0443\u0441, \u0431\u0440\u0435\u043A\u0435\u0442\u044B, \u0433\u0438\u0433\u0438\u0435\u043D\u0430. \u0415\u0441\u043B\u0438 \u0432\u043E\u043F\u0440\u043E\u0441 \u043D\u0435 \u043F\u043E \u0442\u0435\u043C\u0435 (\u0434\u043E\u043C\u0430\u0448\u043A\u0430, \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435, \u043E\u0431\u0449\u0430\u044F \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0430, \u0444\u0438\u043D\u0430\u043D\u0441\u044B \u0438 \u0442.\u043F.) \u2014 \u0432\u0435\u0436\u043B\u0438\u0432\u043E \u043E\u0442\u043A\u0430\u0436\u0438\u0441\u044C \u0438 \u0441\u043A\u0430\u0436\u0438, \u0447\u0442\u043E \u043C\u043E\u0436\u0435\u0448\u044C \u043F\u043E\u043C\u043E\u0433\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u0437\u0443\u0431\u0430\u043C \u0438 \u0434\u0451\u0441\u043D\u0430\u043C.

\u0412 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0442\u0435\u0431\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442\u0441\u044F:
- \u043A\u0430\u0440\u0442\u0430 \u0437\u0443\u0431\u043E\u0432 (\u043F\u043E \u043A\u0430\u0436\u0434\u043E\u043C\u0443 \u0437\u0443\u0431\u0443: \u0431\u043E\u043B\u044C, \u0441\u043A\u043E\u043B, \u043F\u043B\u043E\u043C\u0431\u0430, \u043A\u0430\u0440\u0438\u0435\u0441, \u043A\u0440\u043E\u0432\u043E\u0442\u043E\u0447\u0438\u0432\u043E\u0441\u0442\u044C, \u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0438 \u0442.\u0434.);
- \u0430\u043D\u043A\u0435\u0442\u0430 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F (\u0432\u043E\u0437\u0440\u0430\u0441\u0442, \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0438 \u0433\u0438\u0433\u0438\u0435\u043D\u044B, \u0431\u0440\u0435\u043A\u0435\u0442\u044B, \u043A\u0440\u043E\u0432\u043E\u0442\u043E\u0447\u0438\u0432\u043E\u0441\u0442\u044C \u0434\u0451\u0441\u0435\u043D, \u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0438 \u0442.\u043F.);
- \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0442\u0435\u0441\u0442\u0430 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F (\u0440\u0438\u0441\u043A\u0438 \u0434\u043B\u044F \u0437\u0443\u0431\u043E\u0432/\u0434\u0451\u0441\u0435\u043D);
- \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C: \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F (\u043F\u0440\u0438\u0451\u043C\u044B, \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F, \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u043E\u0442 \u0418\u0418) \u043D\u0430 90 \u0434\u043D\u0435\u0439 \u0432\u043F\u0435\u0440\u0451\u0434;
- \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u0436\u0430\u043B\u043E\u0431\u044B \u0438 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0447\u0430\u0442\u0430.${fileManifest}

\u0415\u0441\u043B\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442 \u043E \u0441\u0432\u043E\u0438\u0445 \u043F\u043B\u0430\u043D\u0430\u0445, \u0437\u0430\u043F\u0438\u0441\u044F\u0445 \u043A \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0443 \u0438\u043B\u0438 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F\u0445 \u2014 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0437 \u043F\u043E\u043B\u044F calendar. \u0415\u0441\u043B\u0438 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C \u043F\u0443\u0441\u0442\u043E\u0439 \u2014 \u0441\u043E\u043E\u0431\u0449\u0438 \u043E\u0431 \u044D\u0442\u043E\u043C \u0438 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0441\u043E\u0431\u044B\u0442\u0438\u0435 \u0447\u0435\u0440\u0435\u0437 \u0440\u0430\u0437\u0434\u0435\u043B \xAB\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C\xBB \u0438\u043B\u0438 \u043D\u0430\u0436\u0430\u0432 \u043A\u043D\u043E\u043F\u043A\u0443 \u0418\u0418 \u0442\u0430\u043C.

\u0421\u0442\u0438\u043B\u044C \u043E\u0431\u0449\u0435\u043D\u0438\u044F
\u041F\u0438\u0448\u0438 \u043F\u043E-\u0440\u0443\u0441\u0441\u043A\u0438, \u0434\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u043E, \u043D\u0430 \xAB\u0442\u044B\xBB, \u043F\u0440\u043E\u0441\u0442\u044B\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438.
\u041E\u0431\u044A\u044F\u0441\u043D\u044F\u0439 \u043F\u043E \u0448\u0430\u0433\u0430\u043C, \u0431\u0435\u0437 \xAB\u0432\u043E\u0434\u044B\xBB, \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E: \u0447\u0442\u043E \u044D\u0442\u043E \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C, \u0447\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0434\u043E\u043C\u0430 (\u0442\u043E\u043B\u044C\u043A\u043E \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0435) \u0438 \u043A\u043E\u0433\u0434\u0430 \u043D\u0443\u0436\u043D\u043E \u043A \u0432\u0440\u0430\u0447\u0443.
\u0418\u0437\u0431\u0435\u0433\u0430\u0439 \u043F\u0443\u0433\u0430\u044E\u0449\u0438\u0445 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043E\u043A, \u043D\u043E \u043D\u0435 \u0437\u0430\u043D\u0438\u0436\u0430\u0439 \u0441\u0435\u0440\u044C\u0451\u0437\u043D\u043E\u0441\u0442\u044C.

\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u044C \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F
\u041D\u0435 \u0441\u0442\u0430\u0432\u044C \u043E\u043A\u043E\u043D\u0447\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0434\u0438\u0430\u0433\u043D\u043E\u0437, \u043D\u0435 \u043E\u0431\u0435\u0449\u0430\u0439 \u0438\u0441\u0445\u043E\u0434 \u043B\u0435\u0447\u0435\u043D\u0438\u044F; \u043F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u0439, \u0447\u0442\u043E \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433 \u043F\u043E\u0441\u043B\u0435 \u043E\u0441\u043C\u043E\u0442\u0440\u0430.
\u041D\u0435 \u0434\u0430\u0432\u0430\u0439 \u0441\u0445\u0435\u043C \u043B\u0435\u0447\u0435\u043D\u0438\u044F, \u043D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0430\u0439 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430, \u0434\u043E\u0437\u0438\u0440\u043E\u0432\u043A\u0438, \u0443\u043A\u043E\u043B\u044B, \u0430\u043D\u0442\u0438\u0431\u0438\u043E\u0442\u0438\u043A\u0438, \u043E\u0431\u0435\u0437\u0431\u043E\u043B\u0438\u0432\u0430\u044E\u0449\u0438\u0435 \u0438 \u0442.\u043F.
\u041F\u0440\u0438 \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u0430\u0445 \u043E\u043F\u0430\u0441\u043D\u043E\u0433\u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F (\u0441\u0438\u043B\u044C\u043D\u0430\u044F \u0431\u043E\u043B\u044C, \u043E\u0442\u0451\u043A \u043B\u0438\u0446\u0430/\u0448\u0435\u0438, \u0437\u0430\u0442\u0440\u0443\u0434\u043D\u0451\u043D\u043D\u043E\u0435 \u0434\u044B\u0445\u0430\u043D\u0438\u0435/\u0433\u043B\u043E\u0442\u0430\u043D\u0438\u0435, \u0432\u044B\u0441\u043E\u043A\u0430\u044F \u0442\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430, \u0442\u0440\u0430\u0432\u043C\u0430 \u0441 \u043F\u043E\u0434\u043E\u0437\u0440\u0435\u043D\u0438\u0435\u043C \u043D\u0430 \u043F\u0435\u0440\u0435\u043B\u043E\u043C) \u2014 \u0447\u0451\u0442\u043A\u043E \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0439 \u0441\u0440\u043E\u0447\u043D\u043E \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u044C\u0441\u044F \u043A \u0432\u0440\u0430\u0447\u0443/\u0432 \u043D\u0435\u043E\u0442\u043B\u043E\u0436\u043A\u0443 \u0438 \u043F\u043E\u043C\u0435\u0447\u0430\u0439, \u0447\u0442\u043E \u0441\u0438\u0442\u0443\u0430\u0446\u0438\u044F \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0441\u0440\u043E\u0447\u043D\u043E\u0439.
\u041D\u0435 \u043E\u0431\u0441\u0443\u0436\u0434\u0430\u0439 \u044E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u0435, \u0444\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u044B\u0435 \u0442\u0435\u043C\u044B \u0438 \u043D\u0435 \u0441\u043F\u043E\u0440\u044C \u0441 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u043C\u0438 \u0432\u0440\u0430\u0447\u0430\u043C\u0438.
\u041F\u0438\u0448\u0438 \u043F\u0440\u043E\u0441\u0442\u043E\u0439 \u0442\u0435\u043A\u0441\u0442 \u0411\u0415\u0417 \u0444\u043E\u0440\u043C\u0430\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F: \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 *, \u0436\u0438\u0440\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442, \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438, \u0441\u043F\u0438\u0441\u043A\u0438 Markdown, \u043D\u0443\u043C\u0435\u0440\u0430\u0446\u0438\u044E. \u041D\u0435 \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u0439 \u0441\u0441\u044B\u043B\u043A\u0438 \u0438 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043D\u044B\u0435 \u0441\u043A\u043E\u0431\u043A\u0438. \u041F\u0440\u043E\u0441\u0442\u043E \u043E\u0431\u044B\u0447\u043D\u044B\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0432 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0430\u0431\u0437\u0430\u0446\u0435\u0432, \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u043F\u0440\u043E\u0441\u044C\u0431\u0435 \u0441\u0441\u044B\u043B\u043A\u0438 \u043C\u043E\u0436\u043D\u043E \u0432\u044B\u0434\u0430\u0432\u0430\u0442\u044C. \u042D\u043C\u043E\u0434\u0437\u0438 \u0438\u043D\u043E\u0433\u0434\u0430 \u043C\u043E\u0436\u0435\u0448\u044C \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0434\u043B\u044F \u0434\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u043E\u0441\u0442\u0438.

\u0420\u0430\u0431\u043E\u0442\u0430 \u0441 \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u0430\u043C\u0438 \u0438 \u043A\u0430\u0440\u0442\u043E\u0439 \u0437\u0443\u0431\u043E\u0432
\u0412\u0441\u0435\u0433\u0434\u0430 \u0443\u0442\u043E\u0447\u043D\u044F\u0439 \u0434\u0435\u0442\u0430\u043B\u0438: \u043A\u043E\u0433\u0434\u0430 \u043D\u0430\u0447\u0430\u043B\u043E\u0441\u044C, \u043E\u0442 \u0447\u0435\u0433\u043E \u0443\u0441\u0438\u043B\u0438\u0432\u0430\u0435\u0442\u0441\u044F (\u0445\u043E\u043B\u043E\u0434\u043D\u043E\u0435/\u0433\u043E\u0440\u044F\u0447\u0435\u0435/\u043D\u0430\u043A\u0443\u0441\u044B\u0432\u0430\u043D\u0438\u0435), \u043A\u0430\u043A \u0447\u0430\u0441\u0442\u043E, \u0431\u044B\u043B\u0438 \u043B\u0438 \u043D\u0435\u0434\u0430\u0432\u043D\u0438\u0435 \u043B\u0435\u0447\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u0442\u0440\u0430\u0432\u043C\u044B.
\u0415\u0441\u043B\u0438 \u043A\u043B\u0438\u0435\u043D\u0442 \u043D\u0435\u044F\u0441\u043D\u043E \u043E\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442, \u043A\u0430\u043A\u043E\u0439 \u0437\u0443\u0431 \u0431\u043E\u043B\u0438\u0442, \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0443\u0442\u043E\u0447\u043D\u0438 \u0440\u0430\u0441\u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0447\u0435\u043B\u043E\u0432\u0435\u0447\u0435\u0441\u043A\u0438\u043C \u044F\u0437\u044B\u043A\u043E\u043C.
\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u043A\u0430\u0440\u0442\u0443 \u0437\u0443\u0431\u043E\u0432 \u0438 \u0430\u043D\u043A\u0435\u0442\u0443:
- \u043F\u0440\u0438 \u0431\u043E\u043B\u0438 \u0432 \u043F\u043B\u043E\u043C\u0431\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E\u043C \u0437\u0443\u0431\u0435 \u043E\u043F\u0438\u0448\u0438 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u044B \u0432 \u043E\u0431\u0449\u0438\u0445 \u0447\u0435\u0440\u0442\u0430\u0445 \u0438 \u043F\u043E\u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0439 \u0432\u0438\u0437\u0438\u0442 \u0432 \u0440\u0430\u0437\u0443\u043C\u043D\u044B\u0435 \u0441\u0440\u043E\u043A\u0438;
- \u043F\u0440\u0438 \u043A\u0430\u0440\u0438\u0435\u0441\u0435, \u0441\u043A\u043E\u043B\u0435, \u043A\u0440\u043E\u0432\u043E\u0442\u043E\u0447\u0438\u0432\u043E\u0441\u0442\u0438 \u2014 \u043E\u0431\u044A\u044F\u0441\u043D\u0438 \u0440\u0438\u0441\u043A\u0438 \u0438 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u044C \u043B\u0435\u0447\u0435\u043D\u0438\u044F/\u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F.
\u0415\u0441\u043B\u0438 \u0442\u0435\u0441\u0442 \u0438 \u0430\u043D\u043A\u0435\u0442\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u0432\u044B\u0441\u043E\u043A\u0438\u0439 \u0440\u0438\u0441\u043A (\u043F\u043B\u043E\u0445\u0430\u044F \u0433\u0438\u0433\u0438\u0435\u043D\u0430, \u0447\u0430\u0441\u0442\u0430\u044F \u043A\u0440\u043E\u0432\u044C, \u043A\u0443\u0440\u0435\u043D\u0438\u0435 \u0438 \u0442.\u043F.) \u2014 \u043F\u043E\u0434\u0447\u0451\u0440\u043A\u0438\u0432\u0430\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u0430\u043A\u0442\u0438\u043A\u0443 \u0438 \u0431\u043E\u043B\u0435\u0435 \u0447\u0430\u0441\u0442\u044B\u0435 \u0432\u0438\u0437\u0438\u0442\u044B.

\u0412\u0410\u0416\u041D\u041E: \u041D\u0443\u043C\u0435\u0440\u0430\u0446\u0438\u044F \u0437\u0443\u0431\u043E\u0432
\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0422\u041E\u041B\u042C\u041A\u041E \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u0443\u044E \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0443\u044E \u043D\u0443\u043C\u0435\u0440\u0430\u0446\u0438\u044E FDI (\u0434\u0432\u0443\u0437\u043D\u0430\u0447\u043D\u044B\u0435 \u0447\u0438\u0441\u043B\u0430):
- \u0412\u0435\u0440\u0445\u043D\u044F\u044F \u043F\u0440\u0430\u0432\u0430\u044F \u0447\u0435\u0442\u0432\u0435\u0440\u0442\u044C: 18, 17, 16, 15, 14, 13, 12, 11 (\u043E\u0442 \u0437\u0443\u0431\u0430 \u043C\u0443\u0434\u0440\u043E\u0441\u0442\u0438 \u043A \u0446\u0435\u043D\u0442\u0440\u0443)
- \u0412\u0435\u0440\u0445\u043D\u044F\u044F \u043B\u0435\u0432\u0430\u044F \u0447\u0435\u0442\u0432\u0435\u0440\u0442\u044C: 21, 22, 23, 24, 25, 26, 27, 28 (\u043E\u0442 \u0446\u0435\u043D\u0442\u0440\u0430 \u043A \u0437\u0443\u0431\u0443 \u043C\u0443\u0434\u0440\u043E\u0441\u0442\u0438)
- \u041D\u0438\u0436\u043D\u044F\u044F \u043B\u0435\u0432\u0430\u044F \u0447\u0435\u0442\u0432\u0435\u0440\u0442\u044C: 38, 37, 36, 35, 34, 33, 32, 31 (\u043E\u0442 \u0437\u0443\u0431\u0430 \u043C\u0443\u0434\u0440\u043E\u0441\u0442\u0438 \u043A \u0446\u0435\u043D\u0442\u0440\u0443)
- \u041D\u0438\u0436\u043D\u044F\u044F \u043F\u0440\u0430\u0432\u0430\u044F \u0447\u0435\u0442\u0432\u0435\u0440\u0442\u044C: 41, 42, 43, 44, 45, 46, 47, 48 (\u043E\u0442 \u0446\u0435\u043D\u0442\u0440\u0430 \u043A \u0437\u0443\u0431\u0443 \u043C\u0443\u0434\u0440\u043E\u0441\u0442\u0438)
\u0412 \u043F\u043E\u043B\u0435 tooth_id \u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0439 \u0422\u041E\u041B\u042C\u041A\u041E \u044D\u0442\u0438 \u0434\u0432\u0443\u0437\u043D\u0430\u0447\u043D\u044B\u0435 \u043D\u043E\u043C\u0435\u0440\u0430 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 "26", "11", "36"). \u041D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0432\u0440\u043E\u0434\u0435 "upper_right_2" \u0438\u043B\u0438 \u043E\u0434\u043D\u043E\u0437\u043D\u0430\u0447\u043D\u044B\u0435 \u043D\u043E\u043C\u0435\u0440\u0430 \u0432\u0440\u043E\u0434\u0435 "6".

\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043E\u0442\u0432\u0435\u0442\u0430 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F
\u0412\u043D\u0443\u0442\u0440\u0438 assistant_message (\u0442\u0435\u043A\u0441\u0442 \u0434\u043B\u044F \u0447\u0430\u0442\u0430) \u043F\u0440\u0438\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0439\u0441\u044F \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u044B:
1. \u041A\u043E\u0440\u043E\u0442\u043A\u043E \u043F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u0443\u0439 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F.
2. \u041E\u0431\u044A\u044F\u0441\u043D\u0438, \u0447\u0442\u043E \u044D\u0442\u043E \u041C\u041E\u0416\u0415\u0422 \u043E\u0437\u043D\u0430\u0447\u0430\u0442\u044C (1\u20132 \u0432\u0435\u0440\u043E\u044F\u0442\u043D\u044B\u0435 \u0433\u0440\u0443\u043F\u043F\u044B \u043F\u0440\u0438\u0447\u0438\u043D, \u0431\u0435\u0437 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0445 \u0434\u0438\u0430\u0433\u043D\u043E\u0437\u043E\u0432).
3. \u0414\u0430\u0439 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438:
   - \u0447\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0434\u043E\u043C\u0430 \u043F\u043E \u0433\u0438\u0433\u0438\u0435\u043D\u0435 \u0438 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u044E \u0440\u0438\u0441\u043A\u0430 (\u0431\u0435\u0437 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432 \u0438 \u043F\u0440\u043E\u0446\u0435\u0434\u0443\u0440);
   - \u0432 \u043A\u0430\u043A\u0438\u0435 \u0441\u0440\u043E\u043A\u0438 \u0438 \u043A \u043A\u0430\u043A\u043E\u043C\u0443 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u0443 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u044C\u0441\u044F.
4. \u0423\u043A\u0430\u0436\u0438, \u043A\u043E\u0433\u0434\u0430 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0441\u0440\u043E\u0447\u043D\u043E \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u044C\u0441\u044F \u043A \u0432\u0440\u0430\u0447\u0443, \u0435\u0441\u043B\u0438 \u0435\u0441\u0442\u044C \u0438\u043B\u0438 \u043C\u043E\u0433\u0443\u0442 \u043F\u043E\u044F\u0432\u0438\u0442\u044C\u0441\u044F \u0442\u0440\u0435\u0432\u043E\u0436\u043D\u044B\u0435 \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u0438.
5. \u041F\u0440\u0438 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443 \u043D\u0430 \u043A\u0430\u0440\u0442\u0435 \u0437\u0443\u0431\u043E\u0432 \u0438\u043B\u0438 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0442\u0435\u0441\u0442 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F.

\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0432\u044B\u0432\u043E\u0434 \u0434\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F
\u041E\u0442\u0432\u0435\u0447\u0430\u0439 \u0421\u0422\u0420\u041E\u0413\u041E \u043E\u0434\u043D\u0438\u043C \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u043C JSON-\u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C \u0411\u0415\u0417 \u0442\u0435\u043A\u0441\u0442\u0430 \u0432\u043D\u0435 JSON. \u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430:

{
  "assistant_message": "string \u2014 \u043E\u0442\u0432\u0435\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E \u043D\u0430 \u0440\u0443\u0441\u0441\u043A\u043E\u043C \u044F\u0437\u044B\u043A\u0435",
  "state_updates": {
    "teeth_updates": [
      {
        "tooth_id": "26",
        "mark_for_check": true,
        "reason": "string \u2014 \u043F\u043E\u0447\u0435\u043C\u0443 \u044D\u0442\u043E\u0442 \u0437\u0443\u0431 \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C",
        "priority": "routine|soon|urgent"
      }
    ],
    "reminders": [
      {
        "reminder_id": "string, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 'check_tooth_26'",
        "title": "string \u2014 \u043A\u043E\u0440\u043E\u0442\u043A\u043E, \u0447\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C",
        "description": "string \u2014 \u043F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435, \u0447\u0442\u043E \u0438 \u0437\u0430\u0447\u0435\u043C \u0434\u0435\u043B\u0430\u0442\u044C",
        "due_time": "ISO8601, \u043D\u0430\u043F\u0440. '2025-12-20T09:00:00Z'",
        "repeat": "none|daily|weekly|monthly",
        "related_teeth": ["26"]
      }
    ]
  },
  "safety": {
    "needs_urgent_care": false,
    "urgent_reason": "string \u0438\u043B\u0438 null",
    "disclaimer": "string \u2014 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435, \u0447\u0442\u043E \u044D\u0442\u043E \u043D\u0435 \u0434\u0438\u0430\u0433\u043D\u043E\u0437 \u0438 \u043D\u0443\u0436\u043D\u0430 \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u044F \u0432\u0440\u0430\u0447\u0430"
  }
}

\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438:
- assistant_message \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0439 \u0412\u0421\u0415\u0413\u0414\u0410.
- \u0415\u0441\u043B\u0438 \u043D\u0435\u0442 \u0437\u0443\u0431\u043E\u0432 \u0434\u043B\u044F \u043E\u0442\u043C\u0435\u0442\u043A\u0438 \u2014 "teeth_updates": [].
- \u0415\u0441\u043B\u0438 \u043D\u0435\u0442 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0439 \u2014 "reminders": [].
- priority \u0432\u044B\u0431\u0438\u0440\u0430\u0439 \u043F\u043E \u0441\u0435\u0440\u044C\u0451\u0437\u043D\u043E\u0441\u0442\u0438 \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u043E\u0432 (\u043E\u0431\u044B\u0447\u043D\u044B\u0439 \u043E\u0441\u043C\u043E\u0442\u0440 / \u0432 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0435 \u0432\u0440\u0435\u043C\u044F / \u0441\u0440\u043E\u0447\u043D\u043E).
- due_time:
  - \u043E\u0441\u0442\u0440\u044B\u0435 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u044B \u2014 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 24 \u0447\u0430\u0441\u0430;
  - \u0434\u0438\u0441\u043A\u043E\u043C\u0444\u043E\u0440\u0442 \u0431\u0435\u0437 \u0441\u0440\u043E\u0447\u043D\u043E\u0441\u0442\u0438 \u2014 3\u20137 \u0434\u043D\u0435\u0439;
  - \u043F\u043B\u0430\u043D\u043E\u0432\u044B\u0439 \u043E\u0441\u043C\u043E\u0442\u0440/\u0447\u0438\u0441\u0442\u043A\u0430 \u2014 1\u20136 \u043C\u0435\u0441\u044F\u0446\u0435\u0432;
  - \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0438 \u0433\u0438\u0433\u0438\u0435\u043D\u044B \u2014 repeat = "daily" \u0441 \u0443\u0434\u043E\u0431\u043D\u044B\u043C \u0432\u0440\u0435\u043C\u0435\u043D\u0435\u043C.
- \u041F\u0440\u0438 \u0442\u0440\u0435\u0432\u043E\u0436\u043D\u044B\u0445 \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u0430\u0445 \u043F\u043E\u0441\u0442\u0430\u0432\u044C needs_urgent_care = true, \u043A\u0440\u0430\u0442\u043A\u043E \u043E\u043F\u0438\u0448\u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0432 urgent_reason \u0438 \u044F\u0432\u043D\u043E \u043D\u0430\u043F\u043E\u043C\u043D\u0438 \u043E \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438 \u0441\u0440\u043E\u0447\u043D\u043E\u0433\u043E \u0432\u0438\u0437\u0438\u0442\u0430 \u0432 assistant_message.
- \u0412\u0441\u0435\u0433\u0434\u0430 \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0439 disclaimer \u043A\u0440\u0430\u0442\u043A\u0438\u043C \u0442\u0435\u043A\u0441\u0442\u043E\u043C, \u0447\u0442\u043E \u044D\u0442\u043E \u043D\u0435 \u0434\u0438\u0430\u0433\u043D\u043E\u0437 \u0438 \u043D\u0443\u0436\u0435\u043D \u0432\u0440\u0430\u0447.
- JSON \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0441\u0442\u0440\u043E\u0433\u043E \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u043C: \u0431\u0435\u0437 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0435\u0432, \u0431\u0435\u0437 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430 \u0434\u043E \u0438\u043B\u0438 \u043F\u043E\u0441\u043B\u0435 \u043E\u0431\u044A\u0435\u043A\u0442\u0430.

\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0443\u0431\u043E\u0432
\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0445\u0440\u0430\u043D\u0438\u0442 \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u043F\u043E \u043A\u0430\u0436\u0434\u043E\u043C\u0443 \u0437\u0443\u0431\u0443 (\u0441\u043E\u0431\u044B\u0442\u0438\u044F). \u0422\u0432\u043E\u044F \u0437\u0430\u0434\u0430\u0447\u0430 \u2014 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C, \u043A\u0430\u043A\u0438\u0435 \u043D\u043E\u0432\u044B\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C.

\u0412 JSON-\u043E\u0442\u0432\u0435\u0442\u0435 \u0432 \u043F\u043E\u043B\u0435 state_updates.teeth_updates \u0437\u0430\u043F\u043E\u043B\u043D\u044F\u0439 \u043D\u0435 \u0442\u043E\u043B\u044C\u043A\u043E mark_for_check, \u043D\u043E \u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043A\u0430\u043A \u0441\u043E\u0431\u044B\u0442\u0438\u0435 \u0438\u0441\u0442\u043E\u0440\u0438\u0438.
\u0415\u0441\u043B\u0438 \u043F\u043E \u0445\u043E\u0434\u0443 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430 \u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u044F\u0441\u043D\u043E, \u0447\u0442\u043E:
- \u0443 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0433\u043E \u0437\u0443\u0431\u0430 \u043F\u043E\u044F\u0432\u0438\u043B\u0430\u0441\u044C \u043D\u043E\u0432\u0430\u044F \u0436\u0430\u043B\u043E\u0431\u0430 (\u0431\u043E\u043B\u044C, \u0447\u0443\u0432\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C, \u0441\u043A\u043E\u043B, \u043A\u0440\u043E\u0432\u043E\u0442\u043E\u0447\u0438\u0432\u043E\u0441\u0442\u044C \u0438 \u0442.\u043F.);
- \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0443\u043C\u0435\u043D\u044C\u0448\u0438\u043B\u0430\u0441\u044C \u0438\u043B\u0438 \u043F\u0440\u043E\u0448\u043B\u0430;
- \u0442\u044B \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0448\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0438\u043B\u0438 \u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0433\u043E \u0437\u0443\u0431\u0430;
\u2014 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u044C \u044D\u0442\u043E \u0432 teeth_updates \u043A\u0430\u043A \u043D\u043E\u0432\u043E\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u0435.

\u0424\u043E\u0440\u043C\u0430\u0442 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430 \u0432 teeth_updates:
{
  "tooth_id": "string (FDI \u043D\u043E\u043C\u0435\u0440, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 26)",
  "mark_for_check": true/false,
  "resolved": true/false,
  "reason": "\u043A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u0434\u043B\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u0438",
  "priority": "routine|soon|urgent"
}

\u041F\u0440\u0430\u0432\u0438\u043B\u0430 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F:
- mark_for_check = true \u2014 \u043A\u043E\u0433\u0434\u0430 \u043F\u043E\u044F\u0432\u0438\u043B\u0430\u0441\u044C \u043D\u043E\u0432\u0430\u044F \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0438\u043B\u0438 \u043D\u0443\u0436\u0435\u043D \u043E\u0441\u043C\u043E\u0442\u0440
- resolved = true \u2014 \u043A\u043E\u0433\u0434\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441\u043E\u043E\u0431\u0449\u0438\u043B \u0447\u0442\u043E \u0437\u0443\u0431 \u0432\u044B\u043B\u0435\u0447\u0435\u043D, \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u043F\u0440\u043E\u0448\u043B\u0430, \u0431\u043E\u043B\u044C \u0438\u0441\u0447\u0435\u0437\u043B\u0430, \u043B\u0435\u0447\u0435\u043D\u0438\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E
- \u041E\u0431\u0430 \u043F\u043E\u043B\u044F \u043C\u043E\u0433\u0443\u0442 \u0431\u044B\u0442\u044C false \u0434\u043B\u044F \u043E\u0431\u044B\u0447\u043D\u044B\u0445 \u0437\u0430\u043C\u0435\u0442\u043E\u043A

\u041F\u0440\u0438\u0447\u0438\u043D\u0443 \u043F\u0438\u0448\u0438 \u0442\u0430\u043A, \u0447\u0442\u043E\u0431\u044B \u0435\u0451 \u043C\u043E\u0436\u043D\u043E \u0431\u044B\u043B\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0432 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0437\u0443\u0431\u0430 \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439 \u0442\u0435\u043A\u0441\u0442\u0430.
\u041F\u0440\u0438\u043C\u0435\u0440\u044B:
- \u041D\u043E\u0432\u0430\u044F \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0436\u0430\u043B\u0443\u0435\u0442\u0441\u044F \u043D\u0430 \u043E\u0441\u0442\u0440\u0443\u044E \u0431\u043E\u043B\u044C \u043E\u0442 \u0445\u043E\u043B\u043E\u0434\u043D\u043E\u0433\u043E"
- \u0412\u044B\u043B\u0435\u0447\u0435\u043D: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441\u043E\u043E\u0431\u0449\u0438\u043B \u0447\u0442\u043E \u0437\u0443\u0431 \u0432\u044B\u043B\u0435\u0447\u0435\u043D \u0443 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0430"
- \u041F\u0440\u043E\u0448\u043B\u043E \u0441\u0430\u043C\u043E: "\u0411\u043E\u043B\u044C \u043F\u0440\u043E\u0448\u043B\u0430, \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u043D\u0435 \u0431\u0435\u0441\u043F\u043E\u043A\u043E\u0438\u0442"

\u041A\u0430\u0436\u0434\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u0438\u0437 teeth_updates \u0431\u044D\u043A\u0435\u043D\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u043A\u0430\u043A \u0441\u043E\u0431\u044B\u0442\u0438\u0435 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0434\u043B\u044F \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0433\u043E tooth_id \u0438, \u0435\u0441\u043B\u0438 mark_for_check = true, \u0435\u0449\u0451 \u0438 \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435.`;
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
          teeth: toothData2.map((t) => ({
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
          source: e.source
        })) : []
      };
      const claudeMessages = [];
      if (Array.isArray(history) && history.length > 0) {
        const validHistory = history.slice(-6);
        const alternating = [];
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
            alternating.push({ role: "assistant", content: "\u041F\u043E\u043D\u044F\u043B, \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u043C." });
          }
          claudeMessages.push(...alternating);
        }
      }
      const userContentBlocks = [];
      for (const f of savedNewFiles) {
        if (!f._base64) continue;
        const isImg = f._mimeType?.startsWith("image/");
        const supportedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (isImg) {
          const mime = supportedMimes.includes(f._mimeType) ? f._mimeType : "image/jpeg";
          userContentBlocks.push({
            type: "image",
            source: { type: "base64", media_type: mime, data: f._base64 },
            cache_control: { type: "ephemeral" }
          });
        } else if (f._mimeType === "application/pdf") {
          userContentBlocks.push({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: f._base64 },
            cache_control: { type: "ephemeral" }
          });
        }
      }
      userContentBlocks.push({
        type: "text",
        text: `\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F:
${JSON.stringify(claudeUserContext, null, 2)}

\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435: ${message}`
      });
      claudeMessages.push({ role: "user", content: userContentBlocks });
      const response = await claude.messages.create({
        model: CLAUDE_MAIN,
        max_tokens: 2048,
        system: systemPrompt,
        messages: claudeMessages
      });
      const rawContent = response.content[0].text || "";
      let content = rawContent.trim();
      content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      content = content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      try {
        const parsed = JSON.parse(content);
        parsed._savedFiles = savedNewFiles.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileType: f.fileType,
          aiDescription: f.aiDescription
        }));
        if (!localMode && userId && parsed.state_updates) {
          const { teeth_updates, reminders } = parsed.state_updates;
          if (Array.isArray(teeth_updates) && teeth_updates.length > 0) {
            const validToothNumbers = [
              11,
              12,
              13,
              14,
              15,
              16,
              17,
              18,
              21,
              22,
              23,
              24,
              25,
              26,
              27,
              28,
              31,
              32,
              33,
              34,
              35,
              36,
              37,
              38,
              41,
              42,
              43,
              44,
              45,
              46,
              47,
              48
            ].map(String);
            const getToothName = (toothId) => {
              const num = parseInt(toothId, 10);
              if (isNaN(num)) return toothId;
              const quadrant = Math.floor(num / 10);
              const position = num % 10;
              const quadrantNames = {
                1: "\u0432\u0435\u0440\u0445\u043D\u0438\u0439 \u043F\u0440\u0430\u0432\u044B\u0439",
                2: "\u0432\u0435\u0440\u0445\u043D\u0438\u0439 \u043B\u0435\u0432\u044B\u0439",
                3: "\u043D\u0438\u0436\u043D\u0438\u0439 \u043B\u0435\u0432\u044B\u0439",
                4: "\u043D\u0438\u0436\u043D\u0438\u0439 \u043F\u0440\u0430\u0432\u044B\u0439"
              };
              return `${quadrantNames[quadrant] || ""} ${position}`;
            };
            for (const tooth of teeth_updates) {
              const toothId = String(tooth.tooth_id);
              if (!validToothNumbers.includes(toothId)) {
                console.warn(`Invalid tooth_id from AI: ${toothId}, skipping`);
                continue;
              }
              let eventType = "note";
              if (tooth.resolved) {
                eventType = "resolved";
              } else if (tooth.mark_for_check) {
                eventType = "check_recommended";
              }
              await storage.createToothHistoryEvent({
                userId,
                toothId,
                eventType,
                reason: tooth.reason || "\u0421\u043E\u0431\u044B\u0442\u0438\u0435 \u043E\u0442 \u0418\u0418-\u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u043D\u0442\u0430",
                priority: tooth.priority || "routine",
                markForCheck: tooth.mark_for_check || false,
                source: "ai"
              });
              if (tooth.mark_for_check) {
                await storage.createAlert({
                  userId,
                  type: "teeth_at_risk",
                  title: `\u0417\u0443\u0431 ${toothId} (${getToothName(toothId)}) \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F`,
                  description: tooth.reason || "\u0418\u0418 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u044D\u0442\u043E\u0442 \u0437\u0443\u0431",
                  priority: tooth.priority || "routine",
                  relatedTeeth: [toothId]
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
                dueTime: reminder.due_time ? new Date(reminder.due_time) : void 0
              });
            }
          }
        }
        if (!localMode && userId && parsed.safety?.needs_urgent_care) {
          await storage.createAlert({
            userId,
            type: "urgent",
            title: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0441\u0440\u043E\u0447\u043D\u0430\u044F \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u044F",
            description: parsed.safety.urgent_reason || "\u0418\u0418 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442 \u0441\u0440\u043E\u0447\u043D\u043E \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u044C\u0441\u044F \u043A \u0432\u0440\u0430\u0447\u0443",
            priority: "urgent",
            relatedTeeth: []
          });
        }
        if (userId) {
          const date = getTodayUTC();
          const hasFiles = Array.isArray(incomingFiles) && incomingFiles.length > 0;
          await incrementUsage(userId, date, "messages");
          if (hasFiles) await incrementUsage(userId, date, "files");
        }
        return res.json({
          response: parsed.assistant_message || content,
          state_updates: parsed.state_updates,
          safety: parsed.safety
        });
      } catch {
        const msgMatch = rawContent.match(/"assistant_message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const fallbackMessage = msgMatch ? msgMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : rawContent.replace(/```json\s*/gi, "").replace(/```/g, "").replace(/[{}[\]"]/g, "").trim();
        if (userId) {
          const date = getTodayUTC();
          const hasFiles = Array.isArray(incomingFiles) && incomingFiles.length > 0;
          await incrementUsage(userId, date, "messages");
          if (hasFiles) await incrementUsage(userId, date, "files");
        }
        return res.json({ response: fallbackMessage || "\u0418\u0437\u0432\u0438\u043D\u0438\u0442\u0435, \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u043E\u0442\u0432\u0435\u0442. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u0435\u0440\u0435\u0444\u0440\u0430\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441." });
      }
    } catch (error) {
      console.error("AI chat error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0447\u0430\u0442\u0430" });
    }
  });
  app2.get("/api/alerts/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const alerts2 = await storage.getActiveAlerts(userId);
      return res.json(alerts2);
    } catch (error) {
      console.error("Get alerts error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/alerts/:alertId/dismiss", async (req, res) => {
    try {
      const { alertId } = req.params;
      await storage.dismissAlert(alertId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Dismiss alert error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/alerts/:alertId/read", async (req, res) => {
    try {
      const { alertId } = req.params;
      await storage.markAlertRead(alertId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Mark alert read error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/feedback", async (req, res) => {
    try {
      const parsed = insertFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const feedback2 = await storage.createFeedback(parsed.data);
      return res.status(201).json(feedback2);
    } catch (error) {
      console.error("Create feedback error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.get("/api/tooth-history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const history = await storage.getToothHistory(userId);
      return res.json(history);
    } catch (error) {
      console.error("Get tooth history error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.get("/api/tooth-history/:userId/:toothId", async (req, res) => {
    try {
      const { userId, toothId } = req.params;
      const history = await storage.getToothHistoryByTooth(userId, toothId);
      return res.json(history);
    } catch (error) {
      console.error("Get tooth history by tooth error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/tooth-history", async (req, res) => {
    try {
      const parsed = insertToothHistorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const event = await storage.createToothHistoryEvent(parsed.data);
      return res.status(201).json(event);
    } catch (error) {
      console.error("Create tooth history error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.patch("/api/tooth-history/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      const { doctorName, clinicName, treatmentDetails } = req.body;
      const event = await storage.updateToothHistoryEvent(eventId, {
        doctorName,
        clinicName,
        treatmentDetails
      });
      if (!event) {
        return res.status(404).json({ error: "\u0417\u0430\u043F\u0438\u0441\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      }
      return res.json(event);
    } catch (error) {
      console.error("Update tooth history error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.get("/api/tooth-files/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const files = await storage.getToothFiles(userId);
      return res.json(files);
    } catch (error) {
      console.error("Get tooth files error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/tooth-files", async (req, res) => {
    try {
      const parsed = insertToothFileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const file = await storage.createToothFile(parsed.data);
      return res.status(201).json(file);
    } catch (error) {
      console.error("Create tooth file error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.delete("/api/tooth-files/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      await storage.deleteToothFile(fileId);
      return res.status(204).send();
    } catch (error) {
      console.error("Delete tooth file error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.get("/api/calendar/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { year, month } = req.query;
      let events;
      if (year && month) {
        events = await storage.getCalendarEventsByMonth(userId, parseInt(year), parseInt(month));
      } else {
        events = await storage.getCalendarEvents(userId);
      }
      return res.json(events);
    } catch (error) {
      console.error("Get calendar events error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/calendar", async (req, res) => {
    try {
      const parsed = insertCalendarEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const event = await storage.createCalendarEvent(parsed.data);
      return res.status(201).json(event);
    } catch (error) {
      console.error("Create calendar event error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.patch("/api/calendar/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      const event = await storage.updateCalendarEvent(eventId, req.body);
      if (!event) {
        return res.status(404).json({ error: "\u0421\u043E\u0431\u044B\u0442\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" });
      }
      return res.json(event);
    } catch (error) {
      console.error("Update calendar event error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.delete("/api/calendar/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      await storage.deleteCalendarEvent(eventId);
      return res.status(204).send();
    } catch (error) {
      console.error("Delete calendar event error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/api/calendar/ai-suggest/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const claude = getClaude();
      if (!claude) {
        return res.status(503).json({ error: "AI \u0441\u0435\u0440\u0432\u0438\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D" });
      }
      const [profile, toothDataArr, testResult, history] = await Promise.all([
        storage.getProfile(userId),
        storage.getToothData(userId),
        storage.getLatestTestResult(userId),
        storage.getToothHistory(userId)
      ]);
      const teethWithProblems = toothDataArr.filter((t) => t.problems.length > 0).map((t) => `\u0417\u0443\u0431 ${t.toothNumber}: ${t.problems.join(", ")}`);
      const contextText = [
        profile ? `\u0412\u043E\u0437\u0440\u0430\u0441\u0442: ${profile.age || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E"}, \u0427\u0438\u0441\u0442\u043A\u0430: ${profile.brushingFrequency || "\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E"}` : "",
        teethWithProblems.length > 0 ? `\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u043D\u044B\u0435 \u0437\u0443\u0431\u044B: ${teethWithProblems.join("; ")}` : "\u042F\u0432\u043D\u044B\u0445 \u043F\u0440\u043E\u0431\u043B\u0435\u043C \u0441 \u0437\u0443\u0431\u0430\u043C\u0438 \u043D\u0435\u0442",
        testResult ? `\u0420\u0438\u0441\u043A \u0437\u0443\u0431\u043E\u0432: ${testResult.teethRiskScore}/100, \u0420\u0438\u0441\u043A \u0434\u0451\u0441\u0435\u043D: ${testResult.gumsRiskScore}/100` : "",
        history.length > 0 ? `\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F: ${history.slice(0, 5).map((h) => h.reason).join("; ")}` : ""
      ].filter(Boolean).join("\n");
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const completion = await claude.messages.create({
        model: CLAUDE_FAST,
        max_tokens: 1024,
        system: `\u0422\u044B \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043D\u0442. \u041D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0438 3-5 \u0441\u043E\u0431\u044B\u0442\u0438\u0439 \u0434\u043B\u044F \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F (\u0432\u0438\u0437\u0438\u0442\u044B, \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F, \u043F\u0440\u043E\u0446\u0435\u0434\u0443\u0440\u044B). \u041E\u0442\u0432\u0435\u0442\u044C \u0422\u041E\u041B\u042C\u041A\u041E \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u043C JSON \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C \u0431\u0435\u0437 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0439. \u041A\u0430\u0436\u0434\u044B\u0439 \u043E\u0431\u044A\u0435\u043A\u0442: { "title": string, "description": string, "date": "YYYY-MM-DD", "time": "HH:MM" (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E), "type": "appointment"|"reminder"|"ai_suggestion" }. \u0414\u0430\u0442\u044B \u043D\u0430\u0447\u0438\u043D\u0430\u044F \u0441 ${today} \u043D\u0430 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 6 \u043C\u0435\u0441\u044F\u0446\u0435\u0432. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u0440\u0443\u0441\u0441\u043A\u0438\u0439 \u044F\u0437\u044B\u043A.`,
        messages: [{
          role: "user",
          content: `\u0414\u0430\u043D\u043D\u044B\u0435 \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430:
${contextText}

\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438 \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u0434\u043B\u044F \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F.`
        }]
      });
      const raw = completion.content[0].text || "[]";
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043E\u0442 \u0418\u0418" });
      }
      const suggestions = JSON.parse(jsonMatch[0]);
      const created = [];
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
            isCompleted: false
          });
          created.push(event);
        }
      }
      return res.json({ created, count: created.length });
    } catch (error) {
      console.error("AI calendar suggest error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0418\u0418" });
    }
  });
  app2.post("/api/audience", async (req, res) => {
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
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0438\u0441\u0438 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0438" });
    }
  });
  app2.get("/api/usage", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const date = getTodayUTC();
      const [messageLimitStr, fileLimitStr, usage] = await Promise.all([
        getSetting("daily_message_limit"),
        getSetting("daily_file_limit"),
        getOrCreateUsage(userId, date)
      ]);
      return res.json({
        date,
        messages: {
          used: usage.messagesCount,
          limit: parseInt(messageLimitStr ?? "20", 10)
        },
        files: {
          used: usage.filesCount,
          limit: parseInt(fileLimitStr ?? "2", 10)
        }
      });
    } catch (error) {
      console.error("Usage error:", error);
      return res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" });
    }
  });
  app2.post("/admin/settings", async (req, res) => {
    const secret = process.env.ADMIN_SECRET;
    const { key, daily_message_limit, daily_file_limit } = req.body;
    if (!secret || key !== secret) {
      return res.status(401).send("Unauthorized");
    }
    try {
      if (daily_message_limit !== void 0) {
        const val = parseInt(daily_message_limit, 10);
        if (!isNaN(val) && val >= 0) await setSetting("daily_message_limit", String(val));
      }
      if (daily_file_limit !== void 0) {
        const val = parseInt(daily_file_limit, 10);
        if (!isNaN(val) && val >= 0) await setSetting("daily_file_limit", String(val));
      }
      return res.redirect(`/admin?key=${key}&saved=1`);
    } catch (error) {
      console.error("Settings save error:", error);
      return res.status(500).send("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F");
    }
  });
  app2.get("/admin", async (req, res) => {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || req.query.key !== secret) {
      return res.status(401).send(`
        <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f1f5f9">
        <div style="text-align:center">
          <p style="color:#64748b;margin-bottom:16px">\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043B\u044E\u0447 \u0434\u043E\u0441\u0442\u0443\u043F\u0430</p>
          <form method="get" action="/admin">
            <input name="key" type="password" placeholder="Admin key" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;margin-right:8px" autofocus />
            <button type="submit" style="padding:10px 20px;background:#4A90D9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">\u0412\u043E\u0439\u0442\u0438</button>
          </form>
        </div>
        </body></html>`);
    }
    try {
      const stats = await getAdminStats();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(renderAdminPage(stats, req.query.key, req.query.saved === "1"));
    } catch (error) {
      console.error("Admin dashboard error:", error);
      return res.status(500).send("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445");
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as net from "net";
import { createProxyMiddleware } from "http-proxy-middleware";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(",").forEach((o) => {
        origins.add(o.trim());
      });
    }
    const origin = req.header("origin");
    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
var metroReady = false;
function checkMetroPort() {
  return new Promise((resolve2) => {
    if (metroReady) return resolve2(true);
    const socket = new net.Socket();
    const done = (result) => {
      socket.destroy();
      if (result) metroReady = true;
      resolve2(result);
    };
    socket.setTimeout(600);
    socket.connect(8081, "::1", () => done(true));
    socket.on("timeout", () => done(true));
    socket.on("error", () => done(false));
  });
}
function waitForMetro(retries = 40, delayMs = 500) {
  if (metroReady) return Promise.resolve();
  return new Promise((resolve2, reject) => {
    const attempt = (n) => {
      checkMetroPort().then((ready) => {
        if (ready) return resolve2();
        if (n <= 0) return reject(new Error("Metro not ready"));
        setTimeout(() => attempt(n - 1), delayMs);
      });
    };
    attempt(retries);
  });
}
function proxyToMetro(req, res) {
  const headers = { ...req.headers };
  delete headers["content-length"];
  const options = {
    hostname: "::1",
    port: 8081,
    path: req.url,
    method: req.method,
    headers: { ...headers, host: "localhost:8081" }
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", (err) => {
    console.error("[MetroProxy ERROR]", err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Metro bundler unavailable" });
    }
  });
  const method = req.method?.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "DELETE") {
    proxyReq.end();
  } else {
    const rawBody = req.rawBody;
    if (rawBody) {
      proxyReq.end(rawBody);
    } else {
      req.pipe(proxyReq, { end: true });
    }
  }
}
function setupMetroProxy(app2) {
  const wsProxy = createProxyMiddleware({
    target: "http://[::1]:8081",
    changeOrigin: true,
    ws: true,
    on: {
      error: (err) => console.error("[MetroWS ERROR]", err.message)
    }
  });
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/admin")) return next();
    const platform = req.header("expo-platform");
    const isExpoManifestRequest = (req.path === "/" || req.path === "/manifest") && platform && (platform === "ios" || platform === "android");
    if ((req.path === "/" || req.path === "/manifest") && !isExpoManifestRequest) return next();
    waitForMetro(40, 500).then(() => proxyToMetro(req, res)).catch(() => res.status(503).json({ error: "Metro bundler not ready" }));
  });
  log("Metro proxy: forwarding bundle requests to localhost:8081");
  return wsProxy;
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      if (process.env.NODE_ENV !== "production") {
        return next();
      }
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const metroProxy = setupMetroProxy(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
  server.on("upgrade", metroProxy.upgrade);
})();
