import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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

// Problem types enum
export const PROBLEM_TYPES = [
  "pain",
  "chip",
  "filling",
  "bleeding",
  "sensitivity",
  "cavity",
] as const;

export type ProblemType = typeof PROBLEM_TYPES[number];
