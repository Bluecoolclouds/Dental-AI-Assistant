// Per-user Google Calendar OAuth integration
import { google } from "googleapis";
import { db } from "./db";
import { googleCalendarTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function getOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    redirectUri
  );
}

function getRedirectUri(req: { headers: { host?: string; "x-forwarded-host"?: string; "x-forwarded-proto"?: string }; protocol?: string }): string {
  const host =
    process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `${req.headers["x-forwarded-proto"] || req.protocol || "https"}://${req.headers["x-forwarded-host"] || req.headers.host}`;
  return `${host}/api/gcal/callback`;
}

export function isGoogleOAuthConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function getAuthUrl(userId: string, req: any): string {
  const oauth2Client = getOAuth2Client(getRedirectUri(req));
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state: userId,
  });
}

export async function handleOAuthCallback(
  code: string,
  userId: string,
  req: any
): Promise<void> {
  const oauth2Client = getOAuth2Client(getRedirectUri(req));
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) throw new Error("No access token received");

  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  await db
    .insert(googleCalendarTokens)
    .values({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      calendarId: "primary",
    })
    .onConflictDoUpdate({
      target: googleCalendarTokens.userId,
      set: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function getUserTokens(userId: string) {
  const [row] = await db
    .select()
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId));
  return row || null;
}

export async function isUserConnected(userId: string): Promise<boolean> {
  const tokens = await getUserTokens(userId);
  return !!tokens;
}

export async function disconnectUser(userId: string): Promise<void> {
  await db
    .delete(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId));
}

async function refreshIfNeeded(userId: string): Promise<string> {
  const tokenRow = await getUserTokens(userId);
  if (!tokenRow) throw new Error("Google Calendar не подключён");

  const now = Date.now();
  const expiresAt = tokenRow.expiresAt ? tokenRow.expiresAt.getTime() : 0;

  if (tokenRow.refreshToken && expiresAt > 0 && expiresAt - now < 5 * 60 * 1000) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: tokenRow.refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newAccess = credentials.access_token!;
    const newExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : null;

    await db
      .update(googleCalendarTokens)
      .set({ accessToken: newAccess, expiresAt: newExpiry, updatedAt: new Date() })
      .where(eq(googleCalendarTokens.userId, userId));

    return newAccess;
  }

  return tokenRow.accessToken;
}

export async function getCalendarClientForUser(userId: string) {
  const accessToken = await refreshIfNeeded(userId);
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export interface GCalEventParams {
  title: string;
  description?: string;
  date: string;
  time?: string;
}

export async function createEventForUser(
  userId: string,
  params: GCalEventParams
): Promise<string> {
  const tokenRow = await getUserTokens(userId);
  if (!tokenRow) throw new Error("Google Calendar не подключён");

  const client = await getCalendarClientForUser(userId);
  const calendarId = tokenRow.calendarId || "primary";

  let start: any;
  let end: any;

  if (params.time) {
    const startDt = new Date(`${params.date}T${params.time}:00`);
    const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
    start = { dateTime: startDt.toISOString(), timeZone: "UTC" };
    end = { dateTime: endDt.toISOString(), timeZone: "UTC" };
  } else {
    start = { date: params.date };
    end = { date: params.date };
  }

  const response = await client.events.insert({
    calendarId,
    requestBody: {
      summary: params.title,
      description: params.description,
      start,
      end,
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 30 }],
      },
    },
  });

  if (!response.data.id) throw new Error("Event created but no ID returned");
  return response.data.id;
}

export async function deleteEventForUser(
  userId: string,
  googleEventId: string
): Promise<void> {
  const tokenRow = await getUserTokens(userId);
  if (!tokenRow) throw new Error("Google Calendar не подключён");

  const client = await getCalendarClientForUser(userId);
  await client.events.delete({
    calendarId: tokenRow.calendarId || "primary",
    eventId: googleEventId,
  });
}

export async function listCalendarsForUser(userId: string) {
  const client = await getCalendarClientForUser(userId);
  const res = await client.calendarList.list();
  return (res.data.items || []).map((c) => ({
    id: c.id || "primary",
    name: c.summary || "Без названия",
    primary: c.primary || false,
  }));
}

export async function setPreferredCalendar(userId: string, calendarId: string): Promise<void> {
  await db
    .update(googleCalendarTokens)
    .set({ calendarId, updatedAt: new Date() })
    .where(eq(googleCalendarTokens.userId, userId));
}
