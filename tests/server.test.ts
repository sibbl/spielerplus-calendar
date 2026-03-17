import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { updateCache } from "../src/cache.js";
import type { CalendarEvent } from "../src/types.js";
import type { Config } from "../src/config.js";

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
];

const testConfig: Config = {
  spielerplus: {
    email: "x",
    password: ["place", "holder"].join(""),
    teamId: "x",
  },
  server: { port: 0 },
  schedule: { cron: "0 0 * * * *" },
  cache: { file: "/tmp/spielerplus-calendar-test-cache.json" },
  filters: [
    { path: "/training.ics", titleRegex: "Training" },
    { path: "/games.ics", titleRegex: "spiel" },
  ],
};

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  updateCache(mockEvents);

  const filterMap = new Map(
    testConfig.filters.map((f) => [
      f.path.startsWith("/") ? f.path : `/${f.path}`,
      f,
    ])
  );

  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      if (pathname === "/health") {
        return Response.json({
          status: "ok",
          eventCount: mockEvents.length,
        });
      }

      if (pathname === "/calendar.ics") {
        const { generateICal } = require("../src/ical.js");
        const { getCachedEvents } = require("../src/cache.js");
        return new Response(generateICal(getCachedEvents()), {
          headers: { "Content-Type": "text/calendar; charset=utf-8" },
        });
      }

      const filter = filterMap.get(pathname);
      if (filter) {
        const { generateICal } = require("../src/ical.js");
        const { getCachedEvents } = require("../src/cache.js");
        const events = getCachedEvents().filter((e: CalendarEvent) => {
          if (filter.titleRegex) {
            return new RegExp(filter.titleRegex, "i").test(e.title);
          }
          return true;
        });
        return new Response(generateICal(events, filter.path), {
          headers: { "Content-Type": "text/calendar; charset=utf-8" },
        });
      }

      if (pathname === "/") {
        return Response.json({ endpoints: [] });
      }

      return new Response("Not Found", { status: 404 });
    },
  });
});

afterAll(() => {
  server?.stop();
});

describe("server endpoints", () => {
  test("GET /health returns status", async () => {
    const res = await fetch(`http://localhost:${server.port}/health`);
    const data = (await res.json()) as { status: string; eventCount: number };
    expect(data.status).toBe("ok");
    expect(data.eventCount).toBe(2);
  });

  test("GET /calendar.ics returns valid iCal", async () => {
    const res = await fetch(`http://localhost:${server.port}/calendar.ics`);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("Training");
    expect(body).toContain("Phantomkicker");
  });

  test("GET /training.ics returns only training events", async () => {
    const res = await fetch(`http://localhost:${server.port}/training.ics`);
    const body = await res.text();
    expect(body).toContain("Training");
    expect(body).not.toContain("Phantomkicker");
  });

  test("GET /games.ics returns only game events", async () => {
    const res = await fetch(`http://localhost:${server.port}/games.ics`);
    const body = await res.text();
    expect(body).toContain("Phantomkicker");
    expect(body).not.toContain("SUMMARY:Training");
  });

  test("GET / returns endpoint list", async () => {
    const res = await fetch(`http://localhost:${server.port}/`);
    const data = await res.json();
    expect(data).toHaveProperty("endpoints");
  });

  test("GET /unknown returns 404", async () => {
    const res = await fetch(`http://localhost:${server.port}/unknown`);
    expect(res.status).toBe(404);
  });
});
