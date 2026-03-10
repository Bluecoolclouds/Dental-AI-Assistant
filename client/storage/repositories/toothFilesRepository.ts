import { getDatabase } from "../database";

export interface ToothFile {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number | null;
  description: string | null;
  aiDescription: string | null;
  relatedTeeth: string[];
  createdAt: string;
}

export interface CreateToothFileInput {
  userId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize?: number;
  description?: string;
  aiDescription?: string;
  relatedTeeth?: string[];
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

function rowToFile(row: any): ToothFile {
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    description: row.description,
    aiDescription: row.ai_description || null,
    relatedTeeth: JSON.parse(row.related_teeth || "[]"),
    createdAt: row.created_at,
  };
}

export async function createToothFile(input: CreateToothFileInput): Promise<ToothFile> {
  const db = await getDatabase();
  const id = generateId();
  
  await db.runAsync(
    `INSERT INTO tooth_files (id, user_id, file_name, file_type, file_url, file_size, description, ai_description, related_teeth)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.fileName,
      input.fileType,
      input.fileUrl,
      input.fileSize || null,
      input.description || null,
      input.aiDescription || null,
      JSON.stringify(input.relatedTeeth || []),
    ]
  );
  
  const file = await getToothFileById(id);
  if (!file) throw new Error("Failed to create tooth file");
  return file;
}

export async function getToothFileById(id: string): Promise<ToothFile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`SELECT * FROM tooth_files WHERE id = ?`, [id]);
  
  if (!row) return null;
  return rowToFile(row);
}

export async function getAllToothFiles(userId: string): Promise<ToothFile[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM tooth_files WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  
  return rows.map(rowToFile);
}

export async function getFilesByType(userId: string, fileType: string): Promise<ToothFile[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM tooth_files WHERE user_id = ? AND file_type = ? ORDER BY created_at DESC`,
    [userId, fileType]
  );
  
  return rows.map(rowToFile);
}

export async function updateToothFile(id: string, updates: Partial<CreateToothFileInput>): Promise<ToothFile | null> {
  const db = await getDatabase();
  
  const setClauses: string[] = [];
  const values: any[] = [];
  
  if (updates.fileName !== undefined) {
    setClauses.push("file_name = ?");
    values.push(updates.fileName);
  }
  if (updates.description !== undefined) {
    setClauses.push("description = ?");
    values.push(updates.description);
  }
  if (updates.relatedTeeth !== undefined) {
    setClauses.push("related_teeth = ?");
    values.push(JSON.stringify(updates.relatedTeeth));
  }
  
  if (setClauses.length === 0) {
    return await getToothFileById(id);
  }
  
  values.push(id);
  await db.runAsync(
    `UPDATE tooth_files SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );
  
  return await getToothFileById(id);
}

export async function deleteToothFile(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM tooth_files WHERE id = ?`, [id]);
}
