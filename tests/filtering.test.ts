import { describe, expect, test } from "bun:test";
import { filterEvents } from "../src/server/filtering.js";
import type { CalendarEvent } from "../src/types.js";

const mockEvents: CalendarEvent[] = [
  {
    id: "game-1",
    type: "game",
    title: "Mintonette",
    subtitle: "Trainingsspiel bei Mintonette - Auswärtsspiel",
    description: "Trainingsspiel bei Mintonette - Auswärtsspiel - für unser 2. Team",
    date: "2026-03-19",
    meetTime: "19:00",
    startTime: "19:15",
    endTime: "21:45",
    address: "Mannheimer Str. 128C, 04209 Leipzig, Deutschland",
    url: "https://www.spielerplus.de/game/view?id=13162623",
  },
  {
    id: "game-2",
    type: "game",
    title: "Mintonette",
    subtitle: "Trainingsspiel bei Mintonette - Auswärtsspiel",
    description: "Trainingsspiel bei Mintonette - Auswärtsspiel",
    date: "2026-03-26",
    meetTime: "19:00",
    startTime: "19:15",
    endTime: "21:45",
    address: "Mannheimer Str. 128C, 04209 Leipzig, Deutschland",
    url: "https://www.spielerplus.de/game/view?id=13162624",
  },
];

describe("filterEvents", () => {
  test("matches nameRegex against detail-page notes in the description", () => {
    const events = filterEvents(mockEvents, {
      path: "/second-team.ics",
      nameRegex: "2\\. Team",
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe("game-1");
  });
});
