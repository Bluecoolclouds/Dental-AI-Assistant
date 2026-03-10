import * as Calendar from "expo-calendar";
import { Platform, Alert } from "react-native";

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  const defaultCalendar = calendars.find(
    (cal) =>
      cal.allowsModifications &&
      (cal.isPrimary || cal.source?.name === "Google" || cal.source?.name === "iCloud")
  );

  if (defaultCalendar) return defaultCalendar.id;

  const writableCalendar = calendars.find((cal) => cal.allowsModifications);
  if (writableCalendar) return writableCalendar.id;

  if (Platform.OS === "android") {
    const newCalendarId = await Calendar.createCalendarAsync({
      title: "Toothy",
      color: "#4A90D9",
      entityType: Calendar.EntityTypes.EVENT,
      source: {
        isLocalAccount: true,
        name: "Toothy",
        type: Calendar.CalendarType.LOCAL,
      },
      name: "Toothy",
      ownerAccount: "toothy",
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    return newCalendarId;
  }

  return null;
}

export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

export async function addEventToCalendar(params: {
  title: string;
  notes?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  alarmMinutesBefore?: number;
}): Promise<boolean> {
  try {
    const granted = await requestCalendarPermission();
    if (!granted) {
      Alert.alert(
        "Нет доступа",
        "Разрешите доступ к календарю в настройках, чтобы добавлять события."
      );
      return false;
    }

    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      Alert.alert("Ошибка", "Не удалось найти доступный календарь.");
      return false;
    }

    const endDate = params.endDate || new Date(params.startDate.getTime() + 60 * 60 * 1000);

    await Calendar.createEventAsync(calendarId, {
      title: params.title,
      notes: params.notes,
      startDate: params.startDate,
      endDate: endDate,
      location: params.location,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      alarms: [{ relativeOffset: -(params.alarmMinutesBefore || 30) }],
    });

    Alert.alert("Готово", "Событие добавлено в календарь");
    return true;
  } catch (error) {
    console.log("Calendar error:", error);
    Alert.alert("Ошибка", "Не удалось добавить событие в календарь.");
    return false;
  }
}
