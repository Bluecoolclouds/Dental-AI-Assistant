// Database storage using javascript_database blueprint
import {
  users,
  userProfiles,
  toothData,
  testResults,
  feedback,
  alerts,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

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

  // Feedback
  createFeedback(data: InsertFeedback): Promise<Feedback>;

  // Alerts
  getAlerts(userId: string): Promise<Alert[]>;
  getActiveAlerts(userId: string): Promise<Alert[]>;
  createAlert(data: InsertAlert): Promise<Alert>;
  dismissAlert(alertId: string): Promise<void>;
  markAlertRead(alertId: string): Promise<void>;
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
}

export const storage = new DatabaseStorage();
