import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Email verification codes
export const emailVerifications = pgTable("email_verifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User profiles with health questionnaire data
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  age: integer("age"),
  brushingFrequency: text("brushing_frequency"), // "once", "twice", "more"
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tooth map data - stores problems for each tooth
export const toothData = pgTable("tooth_data", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toothNumber: integer("tooth_number").notNull(), // 1-32 tooth numbering
  problems: jsonb("problems").default([]).notNull(), // Array of problem types
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Health test results
export const testResults = pgTable("test_results", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teethRiskScore: integer("teeth_risk_score").notNull(), // 0-100
  gumsRiskScore: integer("gums_risk_score").notNull(), // 0-100
  overallRiskLevel: text("overall_risk_level").notNull(), // "low", "moderate", "high"
  recommendations: jsonb("recommendations").default([]).notNull(),
  aiRecommendations: jsonb("ai_recommendations"), // Cached AI recommendations
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User feedback
export const feedback = pgTable("feedback", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  category: text("category").notNull(), // "bug", "feature", "other"
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI-generated alerts for teeth at risk
export const alerts = pgTable("alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "teeth_at_risk", "reminder", "urgent"
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("routine"), // "routine", "soon", "urgent"
  relatedTeeth: jsonb("related_teeth").default([]), // Array of tooth IDs
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  dueTime: timestamp("due_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tooth history - timeline of events for each tooth
export const toothHistory = pgTable("tooth_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toothId: text("tooth_id").notNull(), // FDI notation e.g. "26", "11"
  eventType: text("event_type").notNull(), // "complaint", "resolved", "check_recommended", "treatment", "note"
  reason: text("reason").notNull(), // Description of the event
  priority: text("priority").default("routine"), // "routine", "soon", "urgent"
  markForCheck: boolean("mark_for_check").default(false),
  source: text("source").default("user"), // "user", "ai", "system"
  doctorName: text("doctor_name"), // Doctor who performed treatment
  clinicName: text("clinic_name"), // Clinic where treatment was done
  treatmentDetails: text("treatment_details"), // What was done
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Calendar events - dental appointments, reminders, AI suggestions
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // "YYYY-MM-DD"
  time: text("time"), // "HH:MM" optional
  type: text("type").notNull().default("personal"), // "appointment", "reminder", "ai_suggestion", "personal"
  source: text("source").notNull().default("user"), // "user", "ai"
  relatedTeeth: jsonb("related_teeth").default([]),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tooth files - uploaded files related to dental health (CT scans, X-rays, etc.)
export const toothFiles = pgTable("tooth_files", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // "ct", "xray", "photo", "document", "other"
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"), // Size in bytes
  description: text("description"),
  aiDescription: text("ai_description"), // Auto-generated by Claude on upload
  relatedTeeth: jsonb("related_teeth").default([]), // Array of tooth IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  toothData: many(toothData),
  testResults: many(testResults),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const toothDataRelations = relations(toothData, ({ one }) => ({
  user: one(users, {
    fields: [toothData.userId],
    references: [users.id],
  }),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  user: one(users, {
    fields: [testResults.userId],
    references: [users.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
}));

export const toothHistoryRelations = relations(toothHistory, ({ one }) => ({
  user: one(users, {
    fields: [toothHistory.userId],
    references: [users.id],
  }),
}));

export const toothFilesRelations = relations(toothFiles, ({ one }) => ({
  user: one(users, {
    fields: [toothFiles.userId],
    references: [users.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  updatedAt: true,
});

export const insertToothDataSchema = createInsertSchema(toothData).omit({
  id: true,
  updatedAt: true,
});

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertToothHistorySchema = createInsertSchema(toothHistory).omit({
  id: true,
  createdAt: true,
});

export const insertToothFileSchema = createInsertSchema(toothFiles).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type ToothData = typeof toothData.$inferSelect;
export type InsertToothData = z.infer<typeof insertToothDataSchema>;
export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type ToothHistory = typeof toothHistory.$inferSelect;
export type InsertToothHistory = z.infer<typeof insertToothHistorySchema>;
export type ToothFile = typeof toothFiles.$inferSelect;
export type InsertToothFile = z.infer<typeof insertToothFileSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

// Problem types enum
export const PROBLEM_TYPES = [
  "pain",
  "chip",
  "filling",
  "bleeding",
  "sensitivity",
  "cavity",
  "treated",
] as const;

export type ProblemType = typeof PROBLEM_TYPES[number];
