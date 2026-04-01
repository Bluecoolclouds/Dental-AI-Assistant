const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export interface GCalStatus {
  connected: boolean;
}

export interface GCalCalendar {
  id: string;
  name: string;
  primary: boolean;
}

export interface SyncResult {
  success: boolean;
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

export async function getGCalStatus(): Promise<GCalStatus> {
  const res = await fetch(`${BASE_URL}/api/gcal/status`);
  return res.json();
}

export async function getGCalCalendars(): Promise<GCalCalendar[]> {
  const res = await fetch(`${BASE_URL}/api/gcal/calendars`);
  if (!res.ok) throw new Error("Не удалось получить список календарей");
  return res.json();
}

export async function syncEventToGCal(
  eventId: string,
  calendarId = "primary"
): Promise<SyncResult> {
  const res = await fetch(`${BASE_URL}/api/gcal/sync/${eventId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarId }),
  });
  return res.json();
}

export async function unsyncEventFromGCal(
  eventId: string,
  calendarId = "primary"
): Promise<SyncResult> {
  const res = await fetch(`${BASE_URL}/api/gcal/sync/${eventId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarId }),
  });
  return res.json();
}

export async function syncAllEventsToGCal(
  userId: string,
  calendarId = "primary"
): Promise<BulkSyncResult> {
  const res = await fetch(`${BASE_URL}/api/gcal/sync-all/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendarId }),
  });
  return res.json();
}
