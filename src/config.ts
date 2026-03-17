import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface FilteredEndpoint {
  path: string;
  titleRegex?: string;
  nameRegex?: string;
  addressRegex?: string;
}

export interface Config {
  spielerplus: {
    email: string;
    password: string;
    teamId: string;
  };
  server: {
    port: number;
  };
  schedule: {
    cron: string;
  };
  cache: {
    file: string;
  };
  filters: FilteredEndpoint[];
}

function loadJsonConfig(filePath: string): Partial<Config> | null {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Partial<Config>;
}

export function loadConfig(): Config {
  const jsonPath =
    process.env["CONFIG_FILE"] || join(process.cwd(), "config.json");
  const jsonConfig = loadJsonConfig(jsonPath);

  const email =
    process.env["SPIELERPLUS_EMAIL"] ||
    jsonConfig?.spielerplus?.email ||
    "";
  const password =
    process.env["SPIELERPLUS_PASSWORD"] ||
    jsonConfig?.spielerplus?.password ||
    "";
  const teamId =
    process.env["SPIELERPLUS_TEAM_ID"] ||
    jsonConfig?.spielerplus?.teamId ||
    "";
  const port = Number.parseInt(
    process.env["PORT"] || String(jsonConfig?.server?.port || 3000),
    10
  );
  const cron =
    process.env["SCHEDULE_CRON"] ||
    jsonConfig?.schedule?.cron ||
    "0 */15 * * * *";
  const cacheFile =
    process.env["CACHE_FILE"] ||
    jsonConfig?.cache?.file ||
    join(process.cwd(), "cache", "events.json");

  let filters: FilteredEndpoint[] = jsonConfig?.filters || [];
  if (process.env["FILTERS"]) {
    filters = JSON.parse(process.env["FILTERS"]) as FilteredEndpoint[];
  }

  if (!email || !password || !teamId) {
    throw new Error(
      "Missing required config: SPIELERPLUS_EMAIL, SPIELERPLUS_PASSWORD, SPIELERPLUS_TEAM_ID"
    );
  }

  return {
    spielerplus: { email, password, teamId },
    server: { port },
    schedule: { cron },
    cache: { file: cacheFile },
    filters,
  };
}
