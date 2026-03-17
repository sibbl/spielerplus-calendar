import { readFileSync } from "node:fs";
import type { FilteredEndpoint } from "../../config.js";
import { buildPublicUrl } from "../proxy.js";
import type { ServerFilter } from "../filtering.js";

type StartMode = "start" | "meet";

const HOME_PAGE_TEMPLATE = readFileSync(
  new URL("../templates/home.html", import.meta.url),
  "utf-8",
);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toWebcalUrl(url: string): string {
  return url.replace(/^https?:\/\//, "webcal://");
}

function toGoogleCalendarUrl(url: string): string {
  return `https://www.google.com/calendar/render?cid=${encodeURIComponent(toWebcalUrl(url))}`;
}

function applyStartMode(url: string, startMode: StartMode, defaultStartMode: StartMode): string {
  const nextUrl = new URL(url);

  if (startMode !== defaultStartMode) {
    nextUrl.searchParams.set("start", startMode);
  } else {
    nextUrl.searchParams.delete("start");
  }

  return nextUrl.toString();
}

function describeFilter(filter: FilteredEndpoint): string {
  if ("kind" in filter && filter.kind === "other") {
    return "Entspricht Terminen, die von den anderen Filtern nicht erfasst werden";
  }

  return [
    filter.titleRegex ? `Titel ${filter.titleRegex}` : null,
    filter.nameRegex ? `Name ${filter.nameRegex}` : null,
    filter.addressRegex ? `Adresse ${filter.addressRegex}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function renderFilterCards(filters: ServerFilter[]): string {
  if (filters.length === 0) {
    return '<p class="text-sm text-slate-600">Keine benutzerdefinierten Filter konfiguriert.</p>';
  }

  return filters
    .map((filter) => {
      const description = describeFilter(filter) || "Entspricht allen Terminen";
      const label = filter.kind === "other" ? "Sonstige" : filter.token;

      return `
        <label class="group flex cursor-pointer items-center gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white">
          <input
            type="checkbox"
            name="filters"
            value="${escapeHtml(filter.token)}"
            class="mt-1 h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span class="flex min-w-0 items-center gap-2">
            <span class="block text-sm font-semibold text-slate-900">${escapeHtml(label)}</span>
            <span class="relative flex items-center">
              <span class="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] font-semibold text-slate-500">
                i
              </span>
              <span class="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-2xl bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-100 shadow-lg group-hover:block">
                ${escapeHtml(description)}
              </span>
            </span>
          </span>
        </label>
      `;
    })
    .join("");
}

export function renderHomePage(
  filters: ServerFilter[],
  publicRootUrl: URL,
  defaultStartMode: StartMode,
  selectedStartMode: StartMode = defaultStartMode,
): string {
  const fullCalendarUrl = applyStartMode(
    buildPublicUrl(publicRootUrl, "/calendar.ics"),
    selectedStartMode,
    defaultStartMode,
  );
  const fullCalendarWebcalUrl = toWebcalUrl(fullCalendarUrl);
  const fullCalendarGoogleUrl = toGoogleCalendarUrl(fullCalendarUrl);

  return HOME_PAGE_TEMPLATE.replaceAll("__ROOT_URL__", escapeHtml(publicRootUrl.toString()))
    .replaceAll("__DEFAULT_START_MODE__", escapeHtml(defaultStartMode))
    .replaceAll("__SELECTED_START_MODE__", escapeHtml(selectedStartMode))
    .replaceAll("__FULL_CALENDAR_URL__", escapeHtml(fullCalendarUrl))
    .replaceAll("__FULL_CALENDAR_WEBCAL_URL__", escapeHtml(fullCalendarWebcalUrl))
    .replaceAll("__FULL_CALENDAR_GOOGLE_URL__", escapeHtml(fullCalendarGoogleUrl))
    .replace("__FILTER_CARDS__", renderFilterCards(filters));
}
