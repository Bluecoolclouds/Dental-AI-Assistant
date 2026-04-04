import { getDatabase } from "../database";

export interface FavoriteDoctor {
  id: string;
  userId: string;
  doctorName: string;
  clinicName: string;
  createdAt: string;
}

export interface CreateFavoriteDoctorInput {
  userId: string;
  doctorName: string;
  clinicName: string;
}

export interface HistoryDoctor {
  doctorName: string;
  clinicName: string;
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

function rowToDoctor(row: any): FavoriteDoctor {
  return {
    id: row.id,
    userId: row.user_id,
    doctorName: row.doctor_name,
    clinicName: row.clinic_name ?? "",
    createdAt: row.created_at,
  };
}

export async function getFavoriteDoctors(userId: string): Promise<FavoriteDoctor[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM favorite_doctors WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return (rows as any[]).map(rowToDoctor);
}

export async function addFavoriteDoctor(input: CreateFavoriteDoctorInput): Promise<FavoriteDoctor> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync(
    `SELECT * FROM favorite_doctors WHERE user_id = ? AND lower(trim(doctor_name)) = lower(trim(?))`,
    [input.userId, input.doctorName]
  );
  if (existing) return rowToDoctor(existing);
  const id = generateId();
  await db.runAsync(
    `INSERT INTO favorite_doctors (id, user_id, doctor_name, clinic_name) VALUES (?, ?, ?, ?)`,
    [id, input.userId, input.doctorName, input.clinicName]
  );
  const row = await db.getFirstAsync(
    `SELECT * FROM favorite_doctors WHERE id = ?`,
    [id]
  );
  if (!row) throw new Error("Failed to create favorite doctor");
  return rowToDoctor(row);
}

export async function deleteFavoriteDoctor(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM favorite_doctors WHERE id = ?`, [id]);
}

export async function getDoctorsFromHistory(userId: string): Promise<HistoryDoctor[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT DISTINCT doctor_name, clinic_name
     FROM tooth_history
     WHERE user_id = ? AND doctor_name IS NOT NULL AND trim(doctor_name) != ''
     ORDER BY doctor_name ASC`,
    [userId]
  );
  return (rows as any[]).map((row) => ({
    doctorName: row.doctor_name as string,
    clinicName: (row.clinic_name as string | null) ?? "",
  }));
}
