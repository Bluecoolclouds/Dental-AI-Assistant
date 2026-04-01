const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export interface GCalStatus {
  configured: boolean;
  connected: boolean;
  preferredCalendar?: string;
}

export interface GCalCalendar {
  id: string;
  name: string;
  primary: boolean;
}

export interface SyncResult {
  success?: boolean;
  googleEventId?: string;
  alreadySynced?: boolean;
  error?: string;
}

export interface BulkSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  total: number;
}

export async function getGCalStatus(userId: string): Promise<GCalStatus> {
  const res = await fetch(`${BASE_URL}/api/gcal/status/${userId}`);
  return res.json();
}

export function getConnectUrl(userId: string): string {
  return `${BASE_URL}/api/gcal/connect/${userId}`;
}

export async function disconnectGCal(userId: string): Promise<void> {
  await fetch(`${BASE_URL}/api/gcal/connect/${userId}`, { method: "DELETE" });
}

export async function getGCalCalendars(userId: string): Promise<GCalCalendar[]> {
  const res = await fetch(`${BASE_URL}/api/gcal/calendars/${userId}`);
  if (!res.ok) throw new Error("Не удалось получить список календарей");
  return res.json();
}

export async function setPreferredCalendar(userId: string, calendarId: string): Promise<void> {
  await fetch(`${BASE_URL}/api/gcal/calendar/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarId }),
  });
}

export async function syncEventToGCal(userId: string, eventId: string): Promise<SyncResult> {
  const res = await fetch(`${BASE_URL}/api/gcal/sync/${userId}/${eventId}`, { method: "POST" });
  return res.json();
}

export async function unsyncEventFromGCal(userId: string, eventId: string): Promise<SyncResult> {
  const res = await fetch(`${BASE_URL}/api/gcal/sync/${userId}/${eventId}`, { method: "DELETE" });
  return res.json();
}

export async function syncAllEventsToGCal(userId: string): Promise<BulkSyncResult> {
  const res = await fetch(`${BASE_URL}/api/gcal/sync-all/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}
