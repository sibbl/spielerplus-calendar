import { getCachedEvents, getLastUpdated } from "./cache.js";
import { generateICal } from "./ical.js";
import type { Config, FilteredEndpoint } from "./config.js";
import type { CalendarEvent } from "./types.js";

interface ServerFilter extends FilteredEndpoint {
  path: string;
  token: string;
}

function normalizeFilterPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function getFilterToken(path: string): string {
  return normalizeFilterPath(path)
    .replace(/^\/+/, "")
    .replace(/\.ics$/i, "");
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

function filterEvents(events: CalendarEvent[], filter: FilteredEndpoint): CalendarEvent[] {
  return events.filter((event) => matchesFilter(event, filter));
}

function combineFilteredEvents(
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

function getFirstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const firstValue = value.split(",")[0]?.trim();
  return firstValue || null;
}

function parseForwardedHeader(header: string | null): Record<string, string> {
  const firstValue = getFirstHeaderValue(header);
  if (!firstValue) {
    return {};
  }

  const pairs = firstValue.split(";");
  return Object.fromEntries(
    pairs
      .map((pair) => {
        const [rawKey, rawValue] = pair.split("=", 2);
        if (!rawKey || !rawValue) {
          return null;
        }

        const key = rawKey.trim().toLowerCase();
        const value = rawValue.trim().replace(/^"|"$/g, "");
        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null),
  );
}

function normalizeForwardedPrefix(prefix: string | null): string {
  if (!prefix) {
    return "";
  }

  const normalized = prefix.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}

function getPublicRequestUrl(req: Request): URL {
  const requestUrl = new URL(req.url);
  const forwarded = parseForwardedHeader(req.headers.get("forwarded"));
  const protocol =
    getFirstHeaderValue(req.headers.get("x-forwarded-proto")) ||
    forwarded["proto"] ||
    requestUrl.protocol.replace(/:$/, "");
  const host =
    getFirstHeaderValue(req.headers.get("x-forwarded-host")) ||
    forwarded["host"] ||
    req.headers.get("host") ||
    requestUrl.host;
  const forwardedUri = getFirstHeaderValue(req.headers.get("x-forwarded-uri"));
  const forwardedPrefix = normalizeForwardedPrefix(
    getFirstHeaderValue(req.headers.get("x-forwarded-prefix")),
  );

  let pathname = requestUrl.pathname;
  let search = requestUrl.search;

  if (forwardedUri) {
    const publicUrl = new URL(forwardedUri, `${requestUrl.protocol}//${requestUrl.host}`);
    pathname = publicUrl.pathname;
    search = publicUrl.search;
  } else if (
    forwardedPrefix &&
    pathname !== forwardedPrefix &&
    !pathname.startsWith(`${forwardedPrefix}/`)
  ) {
    pathname = `${forwardedPrefix}${pathname === "/" ? "/" : pathname}`;
  }

  return new URL(`${protocol}://${host}${pathname}${search}`);
}

function getPublicBasePath(publicRootUrl: URL): string {
  return publicRootUrl.pathname === "/" ? "" : publicRootUrl.pathname.replace(/\/$/, "");
}

function buildPublicUrl(publicRootUrl: URL, routePath: string): string {
  return new URL(
    `${getPublicBasePath(publicRootUrl)}${normalizeFilterPath(routePath)}`,
    publicRootUrl.origin,
  ).toString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function describeFilter(filter: FilteredEndpoint): string {
  return [
    filter.titleRegex ? `title ${filter.titleRegex}` : null,
    filter.nameRegex ? `name ${filter.nameRegex}` : null,
    filter.addressRegex ? `address ${filter.addressRegex}` : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

function renderHomePage(filters: ServerFilter[], publicRootUrl: URL): string {
  const fullCalendarUrl = buildPublicUrl(publicRootUrl, "/calendar.ics");
  const rootUrl = publicRootUrl.toString();
  const filterCards = filters
    .map((filter) => {
      const filterUrl = buildPublicUrl(publicRootUrl, filter.path);
      const description = describeFilter(filter) || "Matches all events";

      return `
        <label class="group flex cursor-pointer items-start gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white">
          <input
            type="checkbox"
            name="filters"
            value="${escapeHtml(filter.token)}"
            class="mt-1 h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span class="min-w-0">
            <span class="block text-sm font-semibold text-slate-900">${escapeHtml(filter.token)}</span>
            <span class="mt-1 block text-sm text-slate-600">${escapeHtml(description)}</span>
            <span class="mt-2 block truncate font-mono text-xs text-slate-500">${escapeHtml(
              filterUrl,
            )}</span>
          </span>
        </label>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en" data-root-url="${escapeHtml(rootUrl)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SpielerPlus Calendar</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
            },
          },
        },
      };
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] text-slate-900">
    <main class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <section class="overflow-hidden rounded-[2rem] border border-white/70 bg-white/65 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.12)] backdrop-blur">
        <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">SpielerPlus Calendar</p>
            <h1 class="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Build a clean subscription feed from your configured filters.
            </h1>
            <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Select one or more filter feeds below. Combined feeds use a <span class="rounded bg-slate-900/5 px-2 py-1 font-mono text-sm text-slate-800">+</span>
              in the URL, and events that match multiple filters are included only once.
            </p>
            <div class="mt-6 flex flex-wrap gap-3 text-sm">
              <a
                href="${escapeHtml(fullCalendarUrl)}"
                class="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
              >
                Open full calendar
              </a>
              <span class="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-slate-600">
                Proxy-aware URLs supported via forwarded headers
              </span>
            </div>
          </div>
          <div class="rounded-[1.75rem] border border-sky-200/60 bg-slate-950 p-6 text-slate-50 shadow-[0_20px_70px_rgba(15,23,42,0.32)]">
            <p class="text-xs uppercase tracking-[0.3em] text-sky-200">Generated URL</p>
            <code id="generated-url" class="mt-4 block break-all text-sm leading-7 text-sky-100">${escapeHtml(
              fullCalendarUrl,
            )}</code>
            <div class="mt-6 flex flex-wrap gap-3">
              <a
                id="subscribe-link"
                href="${escapeHtml(fullCalendarUrl)}"
                class="inline-flex items-center rounded-full bg-sky-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-sky-300"
              >
                Open feed
              </a>
              <button
                id="copy-button"
                type="button"
                class="inline-flex items-center rounded-full border border-white/15 px-4 py-2 font-medium text-white/90 transition hover:border-white/30 hover:bg-white/5"
              >
                Copy URL
              </button>
            </div>
            <p id="copy-status" class="mt-4 text-sm text-slate-400"></p>
          </div>
        </div>
      </section>

      <section class="mt-8">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-950">Available filters</h2>
            <p class="mt-1 text-sm text-slate-600">Pick any combination. Single filters keep working on their own paths.</p>
          </div>
        </div>
        <form id="filter-form" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          ${filterCards || '<p class="text-sm text-slate-600">No custom filters configured.</p>'}
        </form>
      </section>
    </main>

    <script>
      const rootUrl = new URL(document.documentElement.dataset.rootUrl);
      const basePath =
        rootUrl.pathname === "/" ? "" : rootUrl.pathname.replace(/\\/$/, "");
      const checkboxes = Array.from(
        document.querySelectorAll('input[name="filters"]'),
      );
      const urlEl = document.getElementById("generated-url");
      const linkEl = document.getElementById("subscribe-link");
      const copyButton = document.getElementById("copy-button");
      const copyStatus = document.getElementById("copy-status");

      function buildFeedUrl(tokens) {
        const suffix = tokens.length ? "/" + tokens.join("+") + ".ics" : "/calendar.ics";
        return new URL(basePath + suffix, rootUrl.origin).toString();
      }

      function updateGeneratedUrl() {
        const selectedTokens = checkboxes
          .filter((checkbox) => checkbox.checked)
          .map((checkbox) => checkbox.value);
        const nextUrl = buildFeedUrl(selectedTokens);
        urlEl.textContent = nextUrl;
        linkEl.href = nextUrl;
      }

      for (const checkbox of checkboxes) {
        checkbox.addEventListener("change", updateGeneratedUrl);
      }

      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(urlEl.textContent || "");
          copyStatus.textContent = "Copied to clipboard.";
        } catch (_error) {
          copyStatus.textContent = "Clipboard access failed. Copy the URL manually.";
        }
      });

      updateGeneratedUrl();
    </script>
  </body>
</html>`;
}

export function createServerHandler(config: Config): (req: Request) => Response {
  const filters: ServerFilter[] = config.filters.map((filter) => ({
    ...filter,
    path: normalizeFilterPath(filter.path),
    token: getFilterToken(filter.path),
  }));
  const filterMap = new Map(filters.map((filter) => [filter.path, filter]));
  const filterTokenMap = new Map(filters.map((filter) => [filter.token, filter]));

  return (req: Request): Response => {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (pathname === "/health") {
      const lastUpdated = getLastUpdated();
      return Response.json({
        status: "ok",
        lastUpdated: lastUpdated?.toISOString() || null,
        eventCount: getCachedEvents().length,
      });
    }

    if (pathname === "/calendar.ics") {
      const events = getCachedEvents();
      const ical = generateICal(events, {
        calendarUrl: getPublicRequestUrl(req).toString(),
      });
      return new Response(ical, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": 'attachment; filename="calendar.ics"',
        },
      });
    }

    const filter = filterMap.get(pathname);
    if (filter) {
      const events = filterEvents(getCachedEvents(), filter);
      const ical = generateICal(events, {
        calendarName: `SpielerPlus - ${filter.token}`,
        calendarUrl: getPublicRequestUrl(req).toString(),
      });
      return new Response(ical, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filter.token}.ics"`,
        },
      });
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
        .filter((entry): entry is ServerFilter => Boolean(entry));

      if (combinedFilters.length !== uniqueTokens.length || combinedFilters.length === 0) {
        return new Response("Not Found", { status: 404 });
      }

      const events = combineFilteredEvents(getCachedEvents(), combinedFilters);
      const ical = generateICal(events, {
        calendarName: `SpielerPlus - ${uniqueTokens.join(" + ")}`,
        calendarUrl: getPublicRequestUrl(req).toString(),
      });
      return new Response(ical, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="${uniqueTokens.join("+")}.ics"`,
        },
      });
    }

    if (pathname === "/") {
      const publicRootUrl = getPublicRequestUrl(req);
      const html = renderHomePage(filters, publicRootUrl);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  };
}

export function startServer(config: Config): ReturnType<typeof Bun.serve> {
  const filters = config.filters.map((filter) => ({
    ...filter,
    path: normalizeFilterPath(filter.path),
    token: getFilterToken(filter.path),
  }));
  const server = Bun.serve({
    port: config.server.port,
    fetch: createServerHandler(config),
  });

  console.log(`[server] Listening on http://localhost:${config.server.port}`);
  console.log(`[server] Calendar URL: http://localhost:${config.server.port}/calendar.ics`);
  if (filters.length > 0) {
    console.log("[server] Filtered endpoints:");
    for (const filter of filters) {
      console.log(`  - http://localhost:${config.server.port}${filter.path}`);
    }
  }

  return server;
}
