import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CalendarEvent } from "./types.js";

let cachedEvents: CalendarEvent[] = [];
let lastUpdated: Date | null = null;
let cacheFilePath: string | null = null;

interface CacheDiff {
  added: number;
  updated: number;
  removed: number;
  reordered: boolean;
}

function diffEvents(previousEvents: CalendarEvent[], nextEvents: CalendarEvent[]): CacheDiff {
  const previousById = new Map(previousEvents.map((event) => [event.id, event]));
  const nextById = new Map(nextEvents.map((event) => [event.id, event]));

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const [id, event] of nextById) {
    const previousEvent = previousById.get(id);
    if (!previousEvent) {
      added += 1;
      continue;
    }

    if (JSON.stringify(previousEvent) !== JSON.stringify(event)) {
      updated += 1;
    }
  }

  for (const id of previousById.keys()) {
    if (!nextById.has(id)) {
      removed += 1;
    }
  }

  const reordered =
    previousEvents.length === nextEvents.length &&
    previousEvents.some((event, index) => event.id !== nextEvents[index]?.id);

  return { added, updated, removed, reordered };
}

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
      2,
    ),
    "utf-8",
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

    console.log(`[cache] Loaded ${cachedEvents.length} events from ${filePath}`);
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
  const diff = diffEvents(cachedEvents, events);

  if (diff.added === 0 && diff.updated === 0 && diff.removed === 0 && !diff.reordered) {
    console.log("[cache] No changes detected, keeping existing cache.");
    return false;
  }

  cachedEvents = events;
  lastUpdated = new Date();
  persistCache();
  console.log(
    `[cache] Updated with ${events.length} events at ${lastUpdated.toISOString()} (added: ${diff.added}, updated: ${diff.updated}, removed: ${diff.removed}${diff.reordered ? ", reordered: yes" : ""})`,
  );
  return true;
}
