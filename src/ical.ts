import icalGenerator, { type ICalCalendarMethod } from "ical-generator";
import type { CalendarEvent } from "./types.js";

interface GenerateICalOptions {
  calendarName?: string;
  calendarUrl?: string;
  startMode?: "start" | "meet";
}

function parseDateTime(date: string, time: string | null): Date | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined) return null;
  const d = new Date(`${date}T00:00:00`);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function generateICal(
  events: CalendarEvent[],
  options: string | GenerateICalOptions = {},
): string {
  const normalizedOptions = typeof options === "string" ? { calendarName: options } : options;
  const calendarName = normalizedOptions.calendarName ?? "SpielerPlus";
  const startMode = normalizedOptions.startMode ?? "start";

  const calendar = icalGenerator({
    name: calendarName,
    prodId: { company: "spielerplus-calendar", product: "scraper" },
    method: "PUBLISH" as unknown as ICalCalendarMethod,
    timezone: "Europe/Berlin",
    url: normalizedOptions.calendarUrl ?? null,
  });

  for (const event of events) {
    const startSource = startMode === "meet" ? event.meetTime || event.startTime : event.startTime;
    const start = parseDateTime(event.date, startSource);
    const end = parseDateTime(event.date, event.endTime);

    if (!start) continue;

    const summaryParts = [event.title];
    if (event.subtitle) summaryParts.push(event.subtitle);

    const descriptionParts: string[] = [];
    if (event.description) descriptionParts.push(event.description);
    if (event.meetTime) descriptionParts.push(`Treffen: ${event.meetTime}`);
    if (event.url) descriptionParts.push(event.url);

    calendar.createEvent({
      id: `spielerplus-${event.type}-${event.id}@spielerplus-calendar`,
      summary: summaryParts.join(" - "),
      description: descriptionParts.join("\n"),
      start,
      end: end || new Date(start.getTime() + 90 * 60 * 1000), // Default 90 min
      location: event.address || undefined,
      url: event.url || undefined,
    });
  }

  return calendar.toString();
}
