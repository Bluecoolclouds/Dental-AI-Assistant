import { getDatabase } from "../database";

export interface ToothHistory {
  id: string;
  userId: string;
  toothId: string;
  eventType: string;
  reason: string;
  priority: string;
  markForCheck: boolean;
  source: string;
  doctorName: string | null;
  clinicName: string | null;
  treatmentDetails: string | null;
  createdAt: string;
}

export interface CreateToothHistoryInput {
  userId: string;
  toothId: string;
  eventType: string;
  reason: string;
  priority?: string;
  markForCheck?: boolean;
  source?: string;
  doctorName?: string;
  clinicName?: string;
  treatmentDetails?: string;
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

function rowToHistory(row: any): ToothHistory {
  return {
    id: row.id,
    userId: row.user_id,
    toothId: row.tooth_id,
    eventType: row.event_type,
    reason: row.reason,
    priority: row.priority,
    markForCheck: !!row.mark_for_check,
    source: row.source,
    doctorName: row.doctor_name,
    clinicName: row.clinic_name,
    treatmentDetails: row.treatment_details,
    createdAt: row.created_at,
  };
}

export async function createToothHistory(input: CreateToothHistoryInput): Promise<ToothHistory> {
  const db = await getDatabase();
  const id = generateId();
  
  await db.runAsync(
    `INSERT INTO tooth_history (id, user_id, tooth_id, event_type, reason, priority, mark_for_check, source, doctor_name, clinic_name, treatment_details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.toothId,
      input.eventType,
      input.reason,
      input.priority || "routine",
      input.markForCheck ? 1 : 0,
      input.source || "user",
      input.doctorName || null,
      input.clinicName || null,
      input.treatmentDetails || null,
    ]
  );
  
  const history = await getToothHistoryById(id);
  if (!history) throw new Error("Failed to create tooth history");
  return history;
}

export async function getToothHistoryById(id: string): Promise<ToothHistory | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`SELECT * FROM tooth_history WHERE id = ?`, [id]);
  
  if (!row) return null;
  return rowToHistory(row);
}

export async function getHistoryByTooth(userId: string, toothId: string): Promise<ToothHistory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM tooth_history WHERE user_id = ? AND tooth_id = ? ORDER BY created_at DESC`,
    [userId, toothId]
  );
  
  return rows.map(rowToHistory);
}

export async function getAllHistory(userId: string): Promise<ToothHistory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM tooth_history WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  
  return rows.map(rowToHistory);
}

export async function getTeethMarkedForCheck(userId: string): Promise<ToothHistory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM tooth_history WHERE user_id = ? AND mark_for_check = 1 ORDER BY created_at DESC`,
    [userId]
  );
  
  return rows.map(rowToHistory);
}

export async function updateToothHistory(id: string, updates: Partial<CreateToothHistoryInput>): Promise<ToothHistory | null> {
  const db = await getDatabase();
  
  const setClauses: string[] = [];
  const values: any[] = [];
  
  if (updates.eventType !== undefined) {
    setClauses.push("event_type = ?");
    values.push(updates.eventType);
  }
  if (updates.reason !== undefined) {
    setClauses.push("reason = ?");
    values.push(updates.reason);
  }
  if (updates.priority !== undefined) {
    setClauses.push("priority = ?");
    values.push(updates.priority);
  }
  if (updates.markForCheck !== undefined) {
    setClauses.push("mark_for_check = ?");
    values.push(updates.markForCheck ? 1 : 0);
  }
  if (updates.doctorName !== undefined) {
    setClauses.push("doctor_name = ?");
    values.push(updates.doctorName);
  }
  if (updates.clinicName !== undefined) {
    setClauses.push("clinic_name = ?");
    values.push(updates.clinicName);
  }
  if (updates.treatmentDetails !== undefined) {
    setClauses.push("treatment_details = ?");
    values.push(updates.treatmentDetails);
  }
  
  if (setClauses.length === 0) {
    return await getToothHistoryById(id);
  }
  
  values.push(id);
  await db.runAsync(
    `UPDATE tooth_history SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );
  
  return await getToothHistoryById(id);
}

export async function deleteToothHistory(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM tooth_history WHERE id = ?`, [id]);
}
