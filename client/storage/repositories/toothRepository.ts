import { getDatabase } from "../database";

export interface ToothData {
  id: string;
  userId: string;
  toothNumber: number;
  problems: string[];
  notes: string | null;
  updatedAt: string;
}

export interface CreateToothInput {
  userId: string;
  toothNumber: number;
  problems?: string[];
  notes?: string;
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

function rowToTooth(row: any): ToothData {
  return {
    id: row.id,
    userId: row.user_id,
    toothNumber: row.tooth_number,
    problems: JSON.parse(row.problems || "[]"),
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export async function createOrUpdateTooth(input: CreateToothInput): Promise<ToothData> {
  const db = await getDatabase();
  const id = generateId();
  const problems = JSON.stringify(input.problems || []);
  
  await db.runAsync(
    `INSERT INTO tooth_data (id, user_id, tooth_number, problems, notes)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, tooth_number) DO UPDATE SET
       problems = excluded.problems,
       notes = excluded.notes,
       updated_at = datetime('now')`,
    [id, input.userId, input.toothNumber, problems, input.notes || null]
  );
  
  const tooth = await getToothByNumber(input.userId, input.toothNumber);
  if (!tooth) throw new Error("Failed to create/update tooth");
  return tooth;
}

export async function getToothByNumber(userId: string, toothNumber: number): Promise<ToothData | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM tooth_data WHERE user_id = ? AND tooth_number = ?`,
    [userId, toothNumber]
  );
  
  if (!row) return null;
  return rowToTooth(row);
}

export async function getAllTeeth(userId: string): Promise<ToothData[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM tooth_data WHERE user_id = ? ORDER BY tooth_number`,
    [userId]
  );
  
  return rows.map(rowToTooth);
}

export async function updateToothProblems(userId: string, toothNumber: number, problems: string[]): Promise<ToothData | null> {
  const db = await getDatabase();
  
  await db.runAsync(
    `UPDATE tooth_data SET problems = ?, updated_at = datetime('now') WHERE user_id = ? AND tooth_number = ?`,
    [JSON.stringify(problems), userId, toothNumber]
  );
  
  return await getToothByNumber(userId, toothNumber);
}

export async function deleteTooth(userId: string, toothNumber: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM tooth_data WHERE user_id = ? AND tooth_number = ?`,
    [userId, toothNumber]
  );
}

export async function deleteAllTeeth(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM tooth_data WHERE user_id = ?`, [userId]);
}
