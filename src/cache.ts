import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type { CalendarEvent } from "./types.js";

let cachedEvents: CalendarEvent[] = [];
let lastUpdated: Date | null = null;
let cacheFilePath: string | null = null;

function persistCache(): void {
  if (!cacheFilePath) {
    return;
  }

  mkdirSync(dirname(cacheFilePath), { recursive: true });
  writeFileSync(
    cacheFilePath,
    JSON.stringify(
      {
        lastUpdated: lastUpdated?.toISOString() ?? null,
        events: cachedEvents,
      },
      null,
      2
    ),
    "utf-8"
  );
}

export function initializeCache(filePath: string): void {
  cacheFilePath = filePath;
  cachedEvents = [];
  lastUpdated = null;

  if (!existsSync(filePath)) {
    mkdirSync(dirname(filePath), { recursive: true });
    console.log(`[cache] No cache file found at ${filePath}, starting fresh.`);
    return;
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as {
      lastUpdated?: string | null;
      events?: CalendarEvent[];
    };

    cachedEvents = parsed.events ?? [];
    lastUpdated = parsed.lastUpdated ? new Date(parsed.lastUpdated) : null;

    console.log(
      `[cache] Loaded ${cachedEvents.length} events from ${filePath}`
    );
  } catch (error) {
    console.error(`[cache] Failed to load cache file ${filePath}:`, error);
    cachedEvents = [];
    lastUpdated = null;
  }
}

export function getCachedEvents(): CalendarEvent[] {
  return cachedEvents;
}

export function getLastUpdated(): Date | null {
  return lastUpdated;
}

export function updateCache(events: CalendarEvent[]): boolean {
  const newJson = JSON.stringify(events);
  const oldJson = JSON.stringify(cachedEvents);

  if (newJson === oldJson) {
    console.log("[cache] No changes detected, keeping existing cache.");
    return false;
  }

  cachedEvents = events;
  lastUpdated = new Date();
  persistCache();
  console.log(
    `[cache] Updated with ${events.length} events at ${lastUpdated.toISOString()}`
  );
  return true;
}
