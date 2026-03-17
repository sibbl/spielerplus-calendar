import { getCachedEvents, getLastUpdated } from "../cache.js";
import type { Config } from "../config.js";
import { generateICal } from "../ical.js";
import { combineFilteredEvents, createServerFilters, filterEvents } from "./filtering.js";
import { renderHomePage } from "./pages/home.js";
import { getPublicRequestUrl } from "./proxy.js";

function resolveStartMode(
  requestedMode: string | null,
  defaultMode: "start" | "meet",
): "start" | "meet" {
  if (requestedMode === "meet" || requestedMode === "treff") {
    return "meet";
  }

  if (requestedMode === "start" || requestedMode === "real") {
    return "start";
  }

  return defaultMode;
}

function createCalendarResponse(body: string, fileName: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export function createServerHandler(config: Config): (req: Request) => Response {
  const filters = createServerFilters(config.filters);
  const filterMap = new Map(filters.map((filter) => [filter.path, filter]));
  const filterTokenMap = new Map(filters.map((filter) => [filter.token, filter]));

  return (req: Request): Response => {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const publicRequestUrl = getPublicRequestUrl(req).toString();
    const startMode = resolveStartMode(url.searchParams.get("start"), config.calendar.startMode);

    if (pathname === "/health") {
      const lastUpdated = getLastUpdated();
      return Response.json({
        status: "ok",
        lastUpdated: lastUpdated?.toISOString() || null,
        eventCount: getCachedEvents().length,
      });
    }

    if (pathname === "/calendar.ics") {
      const ical = generateICal(getCachedEvents(), {
        calendarUrl: publicRequestUrl,
        startMode,
      });
      return createCalendarResponse(ical, "calendar.ics");
    }

    const filter = filterMap.get(pathname);
    if (filter) {
      const events = filterEvents(getCachedEvents(), filter);
      const ical = generateICal(events, {
        calendarName: `SpielerPlus - ${filter.token}`,
        calendarUrl: publicRequestUrl,
        startMode,
      });
      return createCalendarResponse(ical, `${filter.token}.ics`);
    }

    if (pathname.endsWith(".ics") && pathname.includes("+")) {
      const combinedTokens = pathname
        .replace(/^\/+/, "")
        .replace(/\.ics$/i, "")
        .split("+")
        .filter(Boolean);
      const uniqueTokens = Array.from(new Set(combinedTokens));
      const combinedFilters = uniqueTokens
        .map((token) => filterTokenMap.get(token))
        .filter((entry) => entry !== undefined);

      if (combinedFilters.length !== uniqueTokens.length || combinedFilters.length === 0) {
        return new Response("Not Found", { status: 404 });
      }

      const events = combineFilteredEvents(getCachedEvents(), combinedFilters);
      const ical = generateICal(events, {
        calendarName: `SpielerPlus - ${uniqueTokens.join(" + ")}`,
        calendarUrl: publicRequestUrl,
        startMode,
      });
      return createCalendarResponse(ical, `${uniqueTokens.join("+")}.ics`);
    }

    if (pathname === "/") {
      const html = renderHomePage(
        filters,
        getPublicRequestUrl(req),
        config.calendar.startMode,
        startMode,
      );
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };
}
