import { normalizeFilterPath } from "./filtering.js";

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

function getPublicBasePath(publicRootUrl: URL): string {
  return publicRootUrl.pathname === "/" ? "" : publicRootUrl.pathname.replace(/\/$/, "");
}

export function getPublicRequestUrl(req: Request): URL {
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

export function buildPublicUrl(publicRootUrl: URL, routePath: string): string {
  return new URL(
    `${getPublicBasePath(publicRootUrl)}${normalizeFilterPath(routePath)}`,
    publicRootUrl.origin,
  ).toString();
}
