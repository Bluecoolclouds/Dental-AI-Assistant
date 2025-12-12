import { getDatabase } from "../database";

export interface Feedback {
  id: string;
  userId: string | null;
  category: string;
  message: string;
  createdAt: string;
}

export interface CreateFeedbackInput {
  userId?: string;
  category: string;
  message: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function rowToFeedback(row: any): Feedback {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function createFeedback(input: CreateFeedbackInput): Promise<Feedback> {
  const db = await getDatabase();
  const id = generateId();
  
  await db.runAsync(
    `INSERT INTO feedback (id, user_id, category, message) VALUES (?, ?, ?, ?)`,
    [id, input.userId || null, input.category, input.message]
  );
  
  const feedback = await getFeedbackById(id);
  if (!feedback) throw new Error("Failed to create feedback");
  return feedback;
}

export async function getFeedbackById(id: string): Promise<Feedback | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`SELECT * FROM feedback WHERE id = ?`, [id]);
  
  if (!row) return null;
  return rowToFeedback(row);
}

export async function getAllFeedback(userId: string): Promise<Feedback[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  
  return rows.map(rowToFeedback);
}

export async function deleteFeedback(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM feedback WHERE id = ?`, [id]);
}
