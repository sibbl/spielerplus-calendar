import type { FilteredEndpoint } from "../config.js";
import type { CalendarEvent } from "../types.js";

export interface ServerFilter extends FilteredEndpoint {
  path: string;
  token: string;
  kind: "configured" | "other";
}

export function normalizeFilterPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getFilterToken(path: string): string {
  return normalizeFilterPath(path)
    .replace(/^\/+/, "")
    .replace(/\.ics$/i, "");
}

export function createServerFilters(filters: FilteredEndpoint[]): ServerFilter[] {
  const configuredFilters = filters.map((filter) => ({
    ...filter,
    path: normalizeFilterPath(filter.path),
    token: getFilterToken(filter.path),
    kind: "configured" as const,
  }));

  if (configuredFilters.length === 0) {
    return configuredFilters;
  }

  return [
    ...configuredFilters,
    {
      path: "/other.ics",
      token: "other",
      kind: "other",
    },
  ];
}

function matchesFilter(event: CalendarEvent, filter: FilteredEndpoint): boolean {
  if (filter.titleRegex) {
    const re = new RegExp(filter.titleRegex, "i");
    if (!re.test(event.title)) return false;
  }

  if (filter.nameRegex) {
    const re = new RegExp(filter.nameRegex, "i");
    const nameField = [event.title, event.subtitle].join(" ");
    if (!re.test(nameField)) return false;
  }

  if (filter.addressRegex) {
    const re = new RegExp(filter.addressRegex, "i");
    if (!event.address || !re.test(event.address)) return false;
  }

  return true;
}

function isConfiguredServerFilter(filter: FilteredEndpoint): filter is ServerFilter {
  return "kind" in filter;
}

function matchesServerFilter(
  event: CalendarEvent,
  filter: FilteredEndpoint,
  filters: FilteredEndpoint[],
): boolean {
  if (isConfiguredServerFilter(filter) && filter.kind === "other") {
    const configuredFilters = filters.filter(
      (entry): entry is ServerFilter =>
        isConfiguredServerFilter(entry) && entry.kind === "configured",
    );
    return !configuredFilters.some((entry) => matchesFilter(event, entry));
  }

  return matchesFilter(event, filter);
}

export function filterEvents(
  events: CalendarEvent[],
  filter: FilteredEndpoint,
  filters: FilteredEndpoint[] = [filter],
): CalendarEvent[] {
  return events.filter((event) => matchesServerFilter(event, filter, filters));
}

export function combineFilteredEvents(
  events: CalendarEvent[],
  filters: FilteredEndpoint[],
): CalendarEvent[] {
  const seenIds = new Set<string>();

  return events.filter((event) => {
    if (!filters.some((filter) => matchesServerFilter(event, filter, filters))) {
      return false;
    }

    if (seenIds.has(event.id)) {
      return false;
    }

    seenIds.add(event.id);
    return true;
  });
}
