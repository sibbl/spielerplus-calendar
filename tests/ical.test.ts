import { describe, test, expect } from "bun:test";
import { generateICal } from "../src/ical.js";
import type { CalendarEvent } from "../src/types.js";

const mockEvents: CalendarEvent[] = [
  {
    id: "10001",
    type: "training",
    title: "Training",
    subtitle: "",
    description: "",
    date: "2026-04-15",
    meetTime: "19:00",
    startTime: "19:15",
    endTime: "20:45",
    address: "Musterweg 42, 04000 Beispielstadt, Deutschland",
    url: "https://www.spielerplus.de/training/view?id=10001",
  },
  {
    id: "20001",
    type: "game",
    title: "Testspiel bei Phantomkicker (Auswärtsspiel)",
    subtitle: "Phantomkicker",
    description: "Phantomkicker - freundschaftlich",
    date: "2026-04-17",
    meetTime: "18:30",
    startTime: "19:00",
    endTime: "21:00",
    address: "Fiktivstraße 7, 04100 Beispielstadt, Deutschland",
    url: "https://www.spielerplus.de/game/view?id=20001",
  },
  {
    id: "20002",
    type: "game",
    title: "Galaxie.Volley",
    subtitle: "3. Spieltag - Heimspiel",
    description: "3. Spieltag - Heimspiel",
    date: "2026-04-19",
    meetTime: "14:00",
    startTime: "14:30",
    endTime: "17:00",
    address: "Hauptplatz 1, 04000 Beispielstadt, Deutschland\nSporthalle Nord",
    url: "https://www.spielerplus.de/game/view?id=20002",
  },
  {
    id: "30001",
    type: "other",
    title: "Teamfeier",
    subtitle: "",
    description: "",
    date: "2026-04-27",
    meetTime: "16:00",
    startTime: "16:00",
    endTime: "22:00",
    address: null,
    url: "https://www.spielerplus.de/event/view?id=30001",
  },
];

describe("generateICal", () => {
  test("generates valid iCal output", () => {
    const ical = generateICal(mockEvents);
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).toContain("BEGIN:VEVENT");
    expect(ical).toContain("END:VEVENT");
  });

  test("includes all events with start times", () => {
    const ical = generateICal(mockEvents);
    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(4);
  });

  test("includes event summaries", () => {
    const ical = generateICal(mockEvents);
    expect(ical).toContain("Training");
    expect(ical).toContain("Phantomkicker");
    expect(ical).toContain("Galaxie.Volley");
    expect(ical).toContain("Teamfeier");
  });

  test("prefixes summaries with the response status", () => {
    const ical = generateICal([
      { ...mockEvents[0]!, response: "Zugesagt" },
      { ...mockEvents[1]!, response: null },
    ]);

    expect(ical).toContain("SUMMARY:ZUGESAGT - Training");
    expect(ical).toContain("SUMMARY:ANTWORT OFFEN - Testspiel bei Phantomkicker");
  });

  test("can hide the open-response prefix without hiding real responses", () => {
    const ical = generateICal(
      [
        { ...mockEvents[0]!, response: "Zugesagt" },
        { ...mockEvents[1]!, response: null },
      ],
      { showOpenResponse: false },
    );

    expect(ical).toContain("SUMMARY:ZUGESAGT - Training");
    expect(ical).toContain("SUMMARY:Testspiel bei Phantomkicker");
    expect(ical).not.toContain("ANTWORT OFFEN");
  });

  test("can hide all response prefixes", () => {
    const ical = generateICal(
      [
        { ...mockEvents[0]!, response: "Absagen / Abwesend" },
        { ...mockEvents[1]!, response: null },
      ],
      { showResponses: false },
    );

    expect(ical).toContain("SUMMARY:Training\r\n");
    expect(ical).toContain("SUMMARY:Testspiel bei Phantomkicker");
    expect(ical).not.toContain("ABSAGEN / ABWESEND");
    expect(ical).not.toContain("ANTWORT OFFEN");
  });

  test("includes location for events with addresses", () => {
    const ical = generateICal(mockEvents);
    expect(ical).toContain("Musterweg 42");
    expect(ical).toContain("Fiktivstraße 7");
  });

  test("includes meet time in description", () => {
    const ical = generateICal(mockEvents);
    expect(ical).toContain("Treffen: 19:00");
    expect(ical).toContain("Treffen: 18:30");
  });

  test("uses custom calendar name", () => {
    const ical = generateICal(mockEvents, "My Custom Calendar");
    expect(ical).toContain("My Custom Calendar");
  });

  test("includes the public calendar URL when configured", () => {
    const ical = generateICal(mockEvents, {
      calendarUrl: "https://calendar.example.com/team/training+games.ics",
    });
    expect(ical).toContain("URL:https://calendar.example.com/team/training+games.ics");
  });

  test("uses meet time as start when configured", () => {
    const ical = generateICal([mockEvents[0]!], {
      startMode: "meet",
    });
    expect(ical).toContain("DTSTART:20260415T190000");
    expect(ical).toContain("DTEND:20260415T204500");
  });

  test("falls back to the event start for an invalid meet time", () => {
    const ical = generateICal([{ ...mockEvents[0]!, meetTime: "-:-" }], {
      startMode: "meet",
    });

    expect(ical).toContain("DTSTART:20260415T191500");
  });

  test("skips events without start time", () => {
    const firstEvent = mockEvents[0];
    expect(firstEvent).toBeDefined();
    if (!firstEvent) throw new Error("Expected first mock event");

    const eventsWithNull: CalendarEvent[] = [
      {
        ...firstEvent,
        startTime: null,
      },
    ];
    const ical = generateICal(eventsWithNull);
    const eventCount = (ical.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(0);
  });

  test("falls back to 90 minutes for an invalid end time", () => {
    const event = { ...mockEvents[0]!, endTime: "-:-" };
    const ical = generateICal([event]);

    expect(ical).toContain("DTSTART:20260415T191500");
    expect(ical).toContain("DTEND:20260415T204500");
  });

  test("skips events with invalid dates or start times", () => {
    const ical = generateICal([
      { ...mockEvents[0]!, date: "2026-02-31" },
      { ...mockEvents[1]!, startTime: "abgesagt" },
    ]);

    expect(ical).not.toContain("BEGIN:VEVENT");
  });

  test("moves an earlier end time to the next day", () => {
    const event = { ...mockEvents[0]!, startTime: "23:30", endTime: "01:00" };
    const ical = generateICal([event]);

    expect(ical).toContain("DTSTART:20260415T233000");
    expect(ical).toContain("DTEND:20260416T010000");
  });

  test("includes unique UIDs per event", () => {
    const ical = generateICal(mockEvents);
    expect(ical).toContain("spielerplus-training-10001@spielerplus-calendar");
    expect(ical).toContain("spielerplus-game-20001@spielerplus-calendar");
  });

  test("publishes with PUBLISH method", () => {
    const ical = generateICal(mockEvents);
    expect(ical).toContain("METHOD:PUBLISH");
  });
});
