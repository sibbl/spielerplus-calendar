import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { initializeCache, updateCache, getCachedEvents, getLastUpdated } from "../src/cache.js";
import type { CalendarEvent } from "../src/types.js";

const mockEvent: CalendarEvent = {
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
};

const secondMockEvent: CalendarEvent = {
  ...mockEvent,
  id: "10002",
  title: "Auswaertsspiel",
  type: "game",
  date: "2026-04-17",
  meetTime: "18:30",
  startTime: "19:00",
  endTime: "21:00",
  address: "Fiktivstrasse 7, 04100 Beispielstadt, Deutschland",
  url: "https://www.spielerplus.de/game/view?id=10002",
};

let tempDir: string;
let cacheFile: string;

describe("cache", () => {
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "spielerplus-cache-test-"));
    cacheFile = join(tempDir, "events.json");
    initializeCache(cacheFile);
    updateCache([]);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("stores events", () => {
    updateCache([mockEvent]);
    const events = getCachedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe("10001");
  });

  test("updates lastUpdated timestamp", () => {
    const before = new Date();
    updateCache([mockEvent]);
    const lastUpdated = getLastUpdated();
    expect(lastUpdated).not.toBeNull();
    expect(lastUpdated?.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  test("detects no changes", () => {
    updateCache([mockEvent]);
    const changed = updateCache([mockEvent]);
    expect(changed).toBe(false);
  });

  test("detects changes", () => {
    updateCache([mockEvent]);
    const modified = { ...mockEvent, title: "Modified Training" };
    const changed = updateCache([modified]);
    expect(changed).toBe(true);
  });

  test("removes deleted events from cache and disk", () => {
    updateCache([mockEvent, secondMockEvent]);

    const changed = updateCache([secondMockEvent]);
    const persisted = JSON.parse(readFileSync(cacheFile, "utf-8")) as {
      lastUpdated: string | null;
      events: CalendarEvent[];
    };

    expect(changed).toBe(true);
    expect(getCachedEvents()).toHaveLength(1);
    expect(getCachedEvents()[0]?.id).toBe("10002");
    expect(persisted.events).toHaveLength(1);
    expect(persisted.events[0]?.id).toBe("10002");
  });

  test("persists cache to disk", () => {
    updateCache([mockEvent]);
    const persisted = JSON.parse(readFileSync(cacheFile, "utf-8")) as {
      lastUpdated: string | null;
      events: CalendarEvent[];
    };

    expect(persisted.events).toHaveLength(1);
    expect(persisted.events[0]?.id).toBe("10001");
    expect(persisted.lastUpdated).not.toBeNull();
  });

  test("loads persisted cache from disk", () => {
    updateCache([mockEvent]);

    initializeCache(cacheFile);

    expect(getCachedEvents()).toHaveLength(1);
    expect(getCachedEvents()[0]?.title).toBe("Training");
    expect(getLastUpdated()).not.toBeNull();
  });
});
