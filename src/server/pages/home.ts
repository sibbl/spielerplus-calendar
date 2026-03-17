import { readFileSync } from "node:fs";
import type { FilteredEndpoint } from "../../config.js";
import { buildPublicUrl } from "../proxy.js";
import type { ServerFilter } from "../filtering.js";

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

function describeFilter(filter: FilteredEndpoint): string {
  return [
    filter.titleRegex ? `title ${filter.titleRegex}` : null,
    filter.nameRegex ? `name ${filter.nameRegex}` : null,
    filter.addressRegex ? `address ${filter.addressRegex}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function renderFilterCards(filters: ServerFilter[], publicRootUrl: URL): string {
  if (filters.length === 0) {
    return '<p class="text-sm text-slate-600">No custom filters configured.</p>';
  }

  return filters
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
            <span class="mt-2 block truncate font-mono text-xs text-slate-500">${escapeHtml(filterUrl)}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

export function renderHomePage(filters: ServerFilter[], publicRootUrl: URL): string {
  const fullCalendarUrl = buildPublicUrl(publicRootUrl, "/calendar.ics");

  return HOME_PAGE_TEMPLATE.replaceAll("__ROOT_URL__", escapeHtml(publicRootUrl.toString()))
    .replaceAll("__FULL_CALENDAR_URL__", escapeHtml(fullCalendarUrl))
    .replace("__FILTER_CARDS__", renderFilterCards(filters, publicRootUrl));
}
