import type { FilteredEndpoint } from "../config.js";
import type { CalendarEvent } from "../types.js";

export interface ServerFilter extends FilteredEndpoint {
  path: string;
  token: string;
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
  return filters.map((filter) => ({
    ...filter,
    path: normalizeFilterPath(filter.path),
    token: getFilterToken(filter.path),
  }));
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

export function filterEvents(events: CalendarEvent[], filter: FilteredEndpoint): CalendarEvent[] {
  return events.filter((event) => matchesFilter(event, filter));
}

export function combineFilteredEvents(
  events: CalendarEvent[],
  filters: FilteredEndpoint[],
): CalendarEvent[] {
  const seenIds = new Set<string>();

  return events.filter((event) => {
    if (!filters.some((filter) => matchesFilter(event, filter))) {
      return false;
    }

    if (seenIds.has(event.id)) {
      return false;
    }

    seenIds.add(event.id);
    return true;
  });
}
