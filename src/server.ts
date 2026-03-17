import { getCachedEvents, getLastUpdated } from "./cache.js";
import { generateICal } from "./ical.js";
import type { Config, FilteredEndpoint } from "./config.js";
import type { CalendarEvent } from "./types.js";

function filterEvents(
  events: CalendarEvent[],
  filter: FilteredEndpoint
): CalendarEvent[] {
  return events.filter((event) => {
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
  });
}

export function startServer(config: Config): void {
  const filterMap = new Map<string, FilteredEndpoint>();
  for (const f of config.filters) {
    const path = f.path.startsWith("/") ? f.path : `/${f.path}`;
    filterMap.set(path, f);
  }

  Bun.serve({
    port: config.server.port,
    fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Health endpoint
      if (pathname === "/health") {
        const lastUpdated = getLastUpdated();
        return Response.json({
          status: "ok",
          lastUpdated: lastUpdated?.toISOString() || null,
          eventCount: getCachedEvents().length,
        });
      }

      // Main calendar endpoint
      if (pathname === "/calendar.ics") {
        const events = getCachedEvents();
        const ical = generateICal(events);
        return new Response(ical, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'attachment; filename="calendar.ics"',
          },
        });
      }

      // Filtered endpoints
      const filter = filterMap.get(pathname);
      if (filter) {
        const events = filterEvents(getCachedEvents(), filter);
        const calName = `SpielerPlus - ${filter.path}`;
        const ical = generateICal(events, calName);
        return new Response(ical, {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filter.path.replaceAll("/", "_")}.ics"`,
          },
        });
      }

      // List available endpoints
      if (pathname === "/") {
        const endpoints = [
          { path: "/calendar.ics", description: "All events" },
          { path: "/health", description: "Health check" },
          ...config.filters.map((f) => ({
            path: f.path.startsWith("/") ? f.path : `/${f.path}`,
            description: `Filtered: title=${f.titleRegex || "*"}, name=${f.nameRegex || "*"}, address=${f.addressRegex || "*"}`,
          })),
        ];
        return Response.json({ endpoints });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`[server] Listening on http://localhost:${config.server.port}`);
  console.log(`[server] Calendar URL: http://localhost:${config.server.port}/calendar.ics`);
  if (config.filters.length > 0) {
    console.log("[server] Filtered endpoints:");
    for (const f of config.filters) {
      const path = f.path.startsWith("/") ? f.path : `/${f.path}`;
      console.log(`  - http://localhost:${config.server.port}${path}`);
    }
  }
}
