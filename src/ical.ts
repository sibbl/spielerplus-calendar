import icalGenerator, { type ICalCalendarMethod } from "ical-generator";
import type { CalendarEvent } from "./types.js";

interface GenerateICalOptions {
  calendarName?: string;
  calendarUrl?: string;
  startMode?: "start" | "meet";
  showResponses?: boolean;
  showOpenResponse?: boolean;
}

function parseDateTime(date: string, time: string | null): Date | null {
  if (!time) return null;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) return null;

  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }

  return d;
}

export function generateICal(
  events: CalendarEvent[],
  options: string | GenerateICalOptions = {},
): string {
  const normalizedOptions = typeof options === "string" ? { calendarName: options } : options;
  const calendarName = normalizedOptions.calendarName ?? "SpielerPlus";
  const startMode = normalizedOptions.startMode ?? "start";
  const showResponses = normalizedOptions.showResponses ?? true;
  const showOpenResponse = normalizedOptions.showOpenResponse ?? true;

  const calendar = icalGenerator({
    name: calendarName,
    prodId: { company: "spielerplus-calendar", product: "scraper" },
    method: "PUBLISH" as unknown as ICalCalendarMethod,
    timezone: "Europe/Berlin",
    url: normalizedOptions.calendarUrl ?? null,
  });

  for (const event of events) {
    const eventStart = parseDateTime(event.date, event.startTime);
    const meetStart = parseDateTime(event.date, event.meetTime);
    const start = startMode === "meet" ? meetStart || eventStart : eventStart;
    let end = parseDateTime(event.date, event.endTime);

    if (!start) continue;

    if (!end) {
      end = new Date(start.getTime() + 90 * 60 * 1000);
    } else if (end < start) {
      // SpielerPlus only provides a time, so an earlier end means the event crosses midnight.
      end.setDate(end.getDate() + 1);
    }

    const response = event.response?.trim();
    const summaryParts = !showResponses
      ? [event.title]
      : response
        ? [response.toUpperCase(), event.title]
        : showOpenResponse
          ? ["ANTWORT OFFEN", event.title]
          : [event.title];
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
      end,
      location: event.address || undefined,
      url: event.url || undefined,
    });
  }

  return calendar.toString();
}
