import * as cheerio from "cheerio";
import type { CalendarEvent } from "./types.js";

const BASE_URL = "https://www.spielerplus.de";

interface CookieJar {
  cookies: Map<string, string>;
  setCookiesFromHeaders(headers: Headers): void;
  getCookieHeader(): string;
}

function createCookieJar(): CookieJar {
  const cookies = new Map<string, string>();
  return {
    cookies,
    setCookiesFromHeaders(headers: Headers) {
      const setCookieHeaders = headers.getSetCookie?.() ?? [];
      for (const header of setCookieHeaders) {
        const match = /^([^=]+)=([^;]*)/.exec(header);
        if (match?.[1] && match[2] !== undefined) {
          cookies.set(match[1], match[2]);
        }
      }
    },
    getCookieHeader() {
      return Array.from(cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    },
  };
}

async function fetchWithCookies(
  jar: CookieJar,
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Cookie", jar.getCookieHeader());
  if (!headers.has("User-Agent")) {
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
  }

  const response = await fetch(url, {
    ...options,
    headers,
    redirect: "manual",
  });

  jar.setCookiesFromHeaders(response.headers);

  // Follow redirects manually to capture cookies
  const location = response.headers.get("Location");
  if (location && (response.status === 301 || response.status === 302)) {
    const redirectUrl = location.startsWith("http") ? location : `${BASE_URL}${location}`;
    return fetchWithCookies(jar, redirectUrl);
  }

  return response;
}

async function login(jar: CookieJar, email: string, password: string): Promise<void> {
  // 1. GET login page to get CSRF token
  const loginPageRes = await fetchWithCookies(jar, `${BASE_URL}/site/login`);
  const loginPageHtml = await loginPageRes.text();
  const $ = cheerio.load(loginPageHtml);
  const csrfToken = $('input[name="_csrf"]').val() as string;

  if (!csrfToken) {
    throw new Error("Failed to get CSRF token from login page");
  }

  // 2. POST login form
  const formData = new URLSearchParams();
  formData.set("_csrf", csrfToken);
  formData.set("LoginForm[email]", email);
  formData.set("LoginForm[password]", password);

  const loginRes = await fetchWithCookies(jar, `${BASE_URL}/site/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const responseText = await loginRes.text();
  if (
    responseText.includes("Einloggen") &&
    !responseText.includes("select-team") &&
    !responseText.includes("dashboard")
  ) {
    throw new Error("Login failed - check credentials");
  }
}

async function selectTeam(jar: CookieJar, teamId: string): Promise<void> {
  await fetchWithCookies(jar, `${BASE_URL}/site/switch-user?id=${encodeURIComponent(teamId)}`);
}

function parseEventsFromHtml(html: string, yearHint: number): Omit<CalendarEvent, "address">[] {
  const $ = cheerio.load(html);
  const events: Omit<CalendarEvent, "address">[] = [];

  $(".list.event").each((_i, el) => {
    const panel = $(el).find(".panel").first();
    const panelId = panel.attr("id") || "";

    // Parse type and id from panel id (e.g., "event-training-68221193")
    const idMatch = /^event-(\w+)-(\d+)$/.exec(panelId);
    const eventType = idMatch?.[1] || "other";
    const eventId = idMatch?.[2] || panelId;

    let type: CalendarEvent["type"] = "other";
    if (eventType === "training") {
      type = "training";
    } else if (eventType === "game") {
      type = "game";
    }

    const title = $(el).find(".panel-heading-text .panel-title").text().trim();
    const subtitle = $(el).find(".panel-heading-text .panel-subtitle").text().trim();
    const dateStr = $(el).find(".panel-heading-info .panel-subtitle").text().trim(); // "DD.MM"

    // Parse times
    let meetTime: string | null = null;
    let startTime: string | null = null;
    let endTime: string | null = null;

    $(el)
      .find(".event-time-item")
      .each((_j, timeEl) => {
        const label = $(timeEl).find(".event-time-label").text().trim();
        const value = $(timeEl).find(".event-time-value").text().trim();
        if (label === "Treffen") meetTime = value || null;
        else if (label === "Beginn") startTime = value || null;
        else if (label === "Ende") endTime = value || null;
      });

    const info = $(el).find(".event-info").text().trim();

    // Build URL from link
    const linkHref = $(el).find(".event-header-border").attr("href") || "";
    const url = linkHref ? `${BASE_URL}${linkHref}` : "";

    // Parse date
    const [day, month] = dateStr.split(".");
    if (!day || !month) return;
    const dateISO = `${yearHint}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    const description = [subtitle, info].filter(Boolean).join(" - ");

    events.push({
      id: eventId,
      type,
      title,
      subtitle,
      description,
      date: dateISO,
      meetTime,
      startTime,
      endTime,
      url,
    });
  });

  return events;
}

async function fetchEventAddress(jar: CookieJar, url: string): Promise<string | null> {
  if (!url) return null;

  const res = await fetchWithCookies(jar, url);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Address is in a link containing h4 "Adresse"
  const addressHeading = $("h4").filter((_i, el) => $(el).text().trim() === "Adresse");
  if (addressHeading.length === 0) return null;

  const container = addressHeading.parent();
  // Get all text content except the heading itself
  const addressText = container
    .contents()
    .filter((_i, el) => el !== addressHeading[0])
    .text()
    .trim();

  return addressText || null;
}

export async function scrapeEvents(
  email: string,
  password: string,
  teamId: string,
): Promise<CalendarEvent[]> {
  const jar = createCookieJar();

  console.log("[scraper] Logging in...");
  await login(jar, email, password);

  console.log("[scraper] Selecting team...");
  await selectTeam(jar, teamId);

  console.log("[scraper] Fetching events page...");
  const eventsPageRes = await fetchWithCookies(jar, `${BASE_URL}/events`);
  const eventsPageHtml = await eventsPageRes.text();

  const currentYear = new Date().getFullYear();
  const allPartialEvents: Omit<CalendarEvent, "address">[] = [];

  // Parse initial events
  const initialEvents = parseEventsFromHtml(eventsPageHtml, currentYear);
  allPartialEvents.push(...initialEvents);

  // Load more events
  let offset = initialEvents.length;
  let hasMore = initialEvents.length >= 5;

  while (hasMore) {
    console.log(`[scraper] Loading more events (offset=${offset})...`);
    const formData = new URLSearchParams();
    formData.set("offset", String(offset));

    const moreRes = await fetchWithCookies(jar, `${BASE_URL}/events/ajaxgetevents`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const moreData = (await moreRes.json()) as {
      html: string;
      count: number;
    };
    const moreEvents = parseEventsFromHtml(moreData.html, currentYear);
    allPartialEvents.push(...moreEvents);

    offset += moreData.count;
    hasMore = moreData.count >= 5;
  }

  console.log(`[scraper] Found ${allPartialEvents.length} events. Fetching addresses...`);

  // Fetch addresses for each event (in batches to avoid overloading)
  const BATCH_SIZE = 5;
  const events: CalendarEvent[] = [];

  for (let i = 0; i < allPartialEvents.length; i += BATCH_SIZE) {
    const batch = allPartialEvents.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (event) => {
        const address = await fetchEventAddress(jar, event.url);
        return { ...event, address };
      }),
    );
    events.push(...results);
  }

  // Handle year rollover: if we see events where month goes from 12 to 1,
  // bump the year for those events
  let lastMonth = 0;
  let yearAdjust = 0;
  for (const event of events) {
    const [, monthPart] = event.date.split("-");
    const month = Number.parseInt(monthPart ?? "0", 10);
    if (lastMonth > 6 && month < 6) {
      yearAdjust++;
    }
    if (yearAdjust > 0) {
      const parts = event.date.split("-");
      event.date = `${currentYear + yearAdjust}-${parts[1]}-${parts[2]}`;
    }
    lastMonth = month;
  }

  console.log(`[scraper] Done. ${events.length} events with addresses.`);
  return events;
}

// Export for testing
export { parseEventsFromHtml, fetchEventAddress, createCookieJar };
