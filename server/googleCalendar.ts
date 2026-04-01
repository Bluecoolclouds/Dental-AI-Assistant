// Google Calendar integration via Replit connector
import { google } from "googleapis";

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (
    connectionSettings &&
    connectionSettings.settings?.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Google Calendar: Replit connector not available");
  }

  const data = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=google-calendar",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((d) => d.items?.[0]);

  connectionSettings = data;

  const accessToken =
    data?.settings?.access_token ||
    data?.settings?.oauth?.credentials?.access_token;

  if (!data || !accessToken) {
    throw new Error("Google Calendar not connected");
  }

  return accessToken;
}

// WARNING: Never cache this client. Tokens expire.
export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function isGoogleCalendarConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export interface GCalEventParams {
  title: string;
  description?: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // "HH:MM"
  calendarId?: string;
}

export async function createGoogleCalendarEvent(
  params: GCalEventParams
): Promise<string> {
  const client = await getUncachableGoogleCalendarClient();

  const calendarId = params.calendarId || "primary";

  let start: any;
  let end: any;

  if (params.time) {
    const startDateTime = new Date(`${params.date}T${params.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    start = { dateTime: startDateTime.toISOString(), timeZone: "UTC" };
    end = { dateTime: endDateTime.toISOString(), timeZone: "UTC" };
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

  if (!response.data.id) {
    throw new Error("Google Calendar: event created but no ID returned");
  }

  return response.data.id;
}

export async function deleteGoogleCalendarEvent(
  googleEventId: string,
  calendarId = "primary"
): Promise<void> {
  const client = await getUncachableGoogleCalendarClient();
  await client.events.delete({ calendarId, eventId: googleEventId });
}

export async function listGoogleCalendars(): Promise<
  { id: string; name: string; primary: boolean }[]
> {
  const client = await getUncachableGoogleCalendarClient();
  const res = await client.calendarList.list();
  return (res.data.items || []).map((c) => ({
    id: c.id || "primary",
    name: c.summary || "Без названия",
    primary: c.primary || false,
  }));
}
