import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { initializeCache, updateCache } from "../src/cache.js";
import { startServer } from "../src/server.js";
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
  {
    id: "30001",
    type: "game",
    title: "Trainingsspiel gegen Phantomkicker",
    subtitle: "Phantomkicker",
    description: "Testmatch unter Trainingsbedingungen",
    date: "2026-04-19",
    meetTime: "17:30",
    startTime: "18:00",
    endTime: "20:00",
    address: "Nebenplatz 3, 04100 Beispielstadt, Deutschland",
    url: "https://www.spielerplus.de/game/view?id=30001",
  },
  {
    id: "40001",
    type: "other",
    title: "Sommerfest",
    subtitle: "",
    description: "Gemeinsamer Saisonabschluss",
    date: "2026-07-04",
    meetTime: "17:00",
    startTime: "17:00",
    endTime: "23:30",
    address: "Jahnallee, 04000 Beispielstadt, Deutschland",
    url: "https://www.spielerplus.de/event/view?id=40001",
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
  calendar: { startMode: "start" },
  filters: [
    { path: "/training.ics", titleRegex: "Training" },
    { path: "/games.ics", titleRegex: "spiel" },
  ],
};

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  initializeCache(testConfig.cache.file);
  updateCache(mockEvents);
  server = startServer(testConfig);
});

afterAll(() => {
  server?.stop();
});

describe("server endpoints", () => {
  test("GET /health returns status", async () => {
    const res = await fetch(`http://localhost:${server.port}/health`);
    const data = (await res.json()) as { status: string; eventCount: number };
    expect(data.status).toBe("ok");
    expect(data.eventCount).toBe(4);
  });

  test("GET /calendar.ics returns valid iCal", async () => {
    const res = await fetch(`http://localhost:${server.port}/calendar.ics`);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("Training");
    expect(body).toContain("Phantomkicker");
  });

  test("GET /calendar.ics?start=meet uses meet time", async () => {
    const res = await fetch(`http://localhost:${server.port}/calendar.ics?start=meet`);
    const body = await res.text();

    expect(body).toContain("DTSTART:20260415T190000");
    expect(body).not.toContain("DTSTART:20260415T191500");
  });

  test("GET /training.ics returns only training events", async () => {
    const res = await fetch(`http://localhost:${server.port}/training.ics`);
    const body = await res.text();
    expect(body).toContain("SUMMARY:Training");
    expect(body).toContain("SUMMARY:Trainingsspiel gegen Phantomkicker - Phantomkicker");
    expect(body).not.toContain(
      "SUMMARY:Testspiel bei Phantomkicker (Auswärtsspiel) - Phantomkicker",
    );
  });

  test("GET /games.ics returns only game events", async () => {
    const res = await fetch(`http://localhost:${server.port}/games.ics`);
    const body = await res.text();
    expect(body).toContain("SUMMARY:Testspiel bei Phantomkicker (Auswärtsspiel) - Phantomkicker");
    expect(body).toContain("SUMMARY:Trainingsspiel gegen Phantomkicker - Phantomkicker");
    expect(body).not.toContain("SUMMARY:Training\r\n");
  });

  test("GET /training+games.ics combines filters without duplicates", async () => {
    const res = await fetch(`http://localhost:${server.port}/training+games.ics`, {
      headers: {
        "x-forwarded-host": "calendar.example.com",
        "x-forwarded-prefix": "/team",
        "x-forwarded-proto": "https",
      },
    });
    const body = await res.text();

    expect(body).toContain("SUMMARY:Training");
    expect(body).toContain("SUMMARY:Testspiel bei Phantomkicker (Auswärtsspiel) - Phantomkicker");
    expect(body).toContain("SUMMARY:Trainingsspiel gegen Phantomkicker - Phantomkicker");
    expect(body).not.toContain("SUMMARY:Sommerfest");
    expect((body.match(/BEGIN:VEVENT/g) || []).length).toBe(3);
    expect(
      (body.match(/SUMMARY:Trainingsspiel gegen Phantomkicker - Phantomkicker/g) || []).length,
    ).toBe(1);
    expect(body).toContain("URL:https://calendar.example.com/team/training+games.ics");
  });

  test("GET /other.ics returns only events unmatched by configured filters", async () => {
    const res = await fetch(`http://localhost:${server.port}/other.ics`);
    const body = await res.text();

    expect(body).toContain("SUMMARY:Sommerfest");
    expect(body).not.toContain("SUMMARY:Training\r\n");
    expect(body).not.toContain(
      "SUMMARY:Testspiel bei Phantomkicker (Auswärtsspiel) - Phantomkicker",
    );
    expect((body.match(/BEGIN:VEVENT/g) || []).length).toBe(1);
  });

  test("GET / returns landing page", async () => {
    const res = await fetch(`http://localhost:${server.port}/`);
    const body = await res.text();
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("cdn.tailwindcss.com");
    expect(body).toContain('value="training"');
    expect(body).toContain('value="games"');
    expect(body).toContain('value="other"');
    expect(body).toContain("Build your feed.");
    expect(body).not.toContain("Proxy-aware URLs supported via forwarded headers");
    expect(body).toContain('id="apple-link"');
    expect(body).toContain('id="android-link"');
    expect(body).toContain('id="google-link"');
    expect(body).toContain('id="outlook-link"');
    expect(body).toContain('name="start-mode"');
    expect(body).toContain('value="start"');
    expect(body).toContain('value="meet"');
    expect(body).toContain('data-default-start-mode="start"');
    expect(body).toContain('data-selected-start-mode="start"');
    expect(body).toContain(`href="webcal://localhost:${server.port}/calendar.ics"`);
    expect(body).toContain(
      `https://www.google.com/calendar/render?cid=${encodeURIComponent(
        `webcal://localhost:${server.port}/calendar.ics`,
      )}`,
    );
  });

  test("GET /?start=meet preselects Treff and keeps the override in generated links", async () => {
    const res = await fetch(`http://localhost:${server.port}/?start=meet`);
    const body = await res.text();

    expect(body).toContain('data-default-start-mode="start"');
    expect(body).toContain('data-selected-start-mode="meet"');
    expect(body).toContain(`href="http://localhost:${server.port}/calendar.ics?start=meet"`);
    expect(body).toContain(`href="webcal://localhost:${server.port}/calendar.ics?start=meet"`);
  });

  test("GET / respects forwarded subpath on the landing page", async () => {
    const res = await fetch(`http://localhost:${server.port}/`, {
      headers: {
        "x-forwarded-host": "calendar.example.com",
        "x-forwarded-prefix": "/team",
        "x-forwarded-proto": "https",
      },
    });
    const body = await res.text();
    expect(body).toContain('data-root-url="https://calendar.example.com/team/"');
    expect(body).toContain("https://calendar.example.com/team/calendar.ics");
  });

  test("GET /unknown returns 404", async () => {
    const res = await fetch(`http://localhost:${server.port}/unknown`);
    expect(res.status).toBe(404);
  });
});
