import { getDatabase } from "../database";

export interface Alert {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string | null;
  priority: string;
  relatedTeeth: string[];
  isRead: boolean;
  isDismissed: boolean;
  dueTime: string | null;
  createdAt: string;
}

export interface CreateAlertInput {
  userId: string;
  type: string;
  title: string;
  description?: string;
  priority?: string;
  relatedTeeth?: string[];
  dueTime?: string;
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

function rowToAlert(row: any): Alert {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    priority: row.priority,
    relatedTeeth: JSON.parse(row.related_teeth || "[]"),
    isRead: !!row.is_read,
    isDismissed: !!row.is_dismissed,
    dueTime: row.due_time,
    createdAt: row.created_at,
  };
}

export async function createAlert(input: CreateAlertInput): Promise<Alert> {
  const db = await getDatabase();
  const id = generateId();
  
  await db.runAsync(
    `INSERT INTO alerts (id, user_id, type, title, description, priority, related_teeth, due_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.type,
      input.title,
      input.description || null,
      input.priority || "routine",
      JSON.stringify(input.relatedTeeth || []),
      input.dueTime || null,
    ]
  );
  
  const alert = await getAlertById(id);
  if (!alert) throw new Error("Failed to create alert");
  return alert;
}

export async function getAlertById(id: string): Promise<Alert | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`SELECT * FROM alerts WHERE id = ?`, [id]);
  
  if (!row) return null;
  return rowToAlert(row);
}

export async function getActiveAlerts(userId: string): Promise<Alert[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM alerts WHERE user_id = ? AND is_dismissed = 0 ORDER BY created_at DESC`,
    [userId]
  );
  
  return rows.map(rowToAlert);
}

export async function getAllAlerts(userId: string): Promise<Alert[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  
  return rows.map(rowToAlert);
}

export async function markAlertAsRead(id: string): Promise<Alert | null> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE alerts SET is_read = 1 WHERE id = ?`, [id]);
  return await getAlertById(id);
}

export async function dismissAlert(id: string): Promise<Alert | null> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE alerts SET is_dismissed = 1 WHERE id = ?`, [id]);
  return await getAlertById(id);
}

export async function deleteAlert(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM alerts WHERE id = ?`, [id]);
}

export async function getUnreadAlertsCount(userId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM alerts WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0`,
    [userId]
  );
  return row?.count ?? 0;
}
