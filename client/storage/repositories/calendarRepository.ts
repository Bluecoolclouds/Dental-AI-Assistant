import { getDatabase } from "../database";

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  date: string;
  time: string | null;
  type: string;
  source: string;
  description: string | null;
  relatedTeeth: string[];
  isCompleted: boolean;
  createdAt: string;
  alarmMinutes: number[] | null;
  recurrence: string | null;
  systemCalendarEventId: string | null;
}

export interface CreateCalendarEventInput {
  userId: string;
  title: string;
  date: string;
  time?: string;
  type?: string;
  source?: string;
  description?: string;
  relatedTeeth?: string[];
  isCompleted?: boolean;
  alarmMinutes?: number[];
  recurrence?: string | null;
  systemCalendarEventId?: string | null;
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

function rowToEvent(row: any): CalendarEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.date,
    time: row.time || null,
    type: row.type,
    source: row.source,
    description: row.description || null,
    relatedTeeth: JSON.parse(row.related_teeth || "[]"),
    isCompleted: row.is_completed === 1 || row.is_completed === true,
    createdAt: row.created_at,
    alarmMinutes: row.alarm_minutes ? JSON.parse(row.alarm_minutes) : null,
    recurrence: row.recurrence || null,
    systemCalendarEventId: row.system_calendar_event_id || null,
  };
}

export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<CalendarEvent> {
  const db = await getDatabase();
  const id = generateId();

  await db.runAsync(
    `INSERT INTO calendar_events (id, user_id, title, date, time, type, source, description, related_teeth, is_completed, alarm_minutes, recurrence, system_calendar_event_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.title,
      input.date,
      input.time || null,
      input.type || "appointment",
      input.source || "user",
      input.description || null,
      JSON.stringify(input.relatedTeeth || []),
      input.isCompleted ? 1 : 0,
      input.alarmMinutes ? JSON.stringify(input.alarmMinutes) : null,
      input.recurrence || null,
      input.systemCalendarEventId || null,
    ]
  );

  const event = await getCalendarEventById(id);
  if (!event) throw new Error("Failed to create calendar event");
  return event;
}

export async function getCalendarEventById(id: string): Promise<CalendarEvent | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`SELECT * FROM calendar_events WHERE id = ?`, [id]);
  if (!row) return null;
  return rowToEvent(row);
}

export async function getAllCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM calendar_events WHERE user_id = ? ORDER BY date ASC, time ASC`,
    [userId]
  );
  return rows.map(rowToEvent);
}

export async function getCalendarEventsByMonth(
  userId: string,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const db = await getDatabase();
  const pad = (n: number) => String(n).padStart(2, "0");
  const prefix = `${year}-${pad(month)}`;
  const rows = await db.getAllAsync(
    `SELECT * FROM calendar_events WHERE user_id = ? AND date LIKE ? ORDER BY date ASC, time ASC`,
    [userId, `${prefix}%`]
  );
  return rows.map(rowToEvent);
}

export async function getUpcomingCalendarEvents(userId: string, days = 90): Promise<CalendarEvent[]> {
  const db = await getDatabase();
  const today = new Date().toISOString().split("T")[0];
  const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const rows = await db.getAllAsync(
    `SELECT * FROM calendar_events WHERE user_id = ? AND date >= ? AND date <= ? AND is_completed = 0 ORDER BY date ASC, time ASC LIMIT 20`,
    [userId, today, limit]
  );
  return rows.map(rowToEvent);
}

export async function updateCalendarEvent(
  id: string,
  updates: Partial<CreateCalendarEventInput>
): Promise<CalendarEvent | null> {
  const db = await getDatabase();

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) { setClauses.push("title = ?"); values.push(updates.title); }
  if (updates.date !== undefined) { setClauses.push("date = ?"); values.push(updates.date); }
  if (updates.time !== undefined) { setClauses.push("time = ?"); values.push(updates.time || null); }
  if (updates.type !== undefined) { setClauses.push("type = ?"); values.push(updates.type); }
  if (updates.description !== undefined) { setClauses.push("description = ?"); values.push(updates.description); }
  if (updates.relatedTeeth !== undefined) { setClauses.push("related_teeth = ?"); values.push(JSON.stringify(updates.relatedTeeth)); }
  if (updates.isCompleted !== undefined) { setClauses.push("is_completed = ?"); values.push(updates.isCompleted ? 1 : 0); }
  if (updates.alarmMinutes !== undefined) { setClauses.push("alarm_minutes = ?"); values.push(updates.alarmMinutes ? JSON.stringify(updates.alarmMinutes) : null); }
  if ("recurrence" in updates) { setClauses.push("recurrence = ?"); values.push(updates.recurrence || null); }
  if ("systemCalendarEventId" in updates) { setClauses.push("system_calendar_event_id = ?"); values.push(updates.systemCalendarEventId || null); }

  if (setClauses.length === 0) return await getCalendarEventById(id);

  values.push(id);
  await db.runAsync(
    `UPDATE calendar_events SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );

  return await getCalendarEventById(id);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM calendar_events WHERE id = ?`, [id]);
}
