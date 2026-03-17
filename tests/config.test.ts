import { describe, test, expect } from "bun:test";
import { loadConfig } from "../src/config.js";

const mockSecretValue = ["mock", "password", "value"].join("-");

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

describe("loadConfig", () => {
  test("throws when required env vars are missing", () => {
    const origEmail = process.env["SPIELERPLUS_EMAIL"];
    const origPassword = process.env["SPIELERPLUS_PASSWORD"];
    const origTeamId = process.env["SPIELERPLUS_TEAM_ID"];

    delete process.env["SPIELERPLUS_EMAIL"];
    delete process.env["SPIELERPLUS_PASSWORD"];
    delete process.env["SPIELERPLUS_TEAM_ID"];

    // Point to non-existent config to avoid loading from file
    process.env["CONFIG_FILE"] = "/tmp/nonexistent-config.json";

    try {
      expect(() => loadConfig()).toThrow("Missing required config");
    } finally {
      // Restore
      restoreEnv("SPIELERPLUS_EMAIL", origEmail);
      restoreEnv("SPIELERPLUS_PASSWORD", origPassword);
      restoreEnv("SPIELERPLUS_TEAM_ID", origTeamId);
      delete process.env["CONFIG_FILE"];
    }
  });

  test("loads config from env vars", () => {
    const origEmail = process.env["SPIELERPLUS_EMAIL"];
    const origPassword = process.env["SPIELERPLUS_PASSWORD"];
    const origTeamId = process.env["SPIELERPLUS_TEAM_ID"];
    const origPort = process.env["PORT"];
    const origCron = process.env["SCHEDULE_CRON"];
    const origCacheFile = process.env["CACHE_FILE"];
    const origStartMode = process.env["ICAL_START_MODE"];

    process.env["SPIELERPLUS_EMAIL"] = "test@example.com";
    process.env["SPIELERPLUS_PASSWORD"] = mockSecretValue;
    process.env["SPIELERPLUS_TEAM_ID"] = "12345";
    process.env["PORT"] = "4000";
    process.env["SCHEDULE_CRON"] = "0 0 * * * *";
    process.env["CACHE_FILE"] = "/tmp/cache/events.json";
    process.env["ICAL_START_MODE"] = "meet";
    process.env["CONFIG_FILE"] = "/tmp/nonexistent-config.json";

    try {
      const config = loadConfig();
      expect(config.spielerplus.email).toBe("test@example.com");
      expect(config.spielerplus.password).toBe(mockSecretValue);
      expect(config.spielerplus.teamId).toBe("12345");
      expect(config.server.port).toBe(4000);
      expect(config.schedule.cron).toBe("0 0 * * * *");
      expect(config.cache.file).toBe("/tmp/cache/events.json");
      expect(config.calendar.startMode).toBe("meet");
    } finally {
      restoreEnv("SPIELERPLUS_EMAIL", origEmail);
      restoreEnv("SPIELERPLUS_PASSWORD", origPassword);
      restoreEnv("SPIELERPLUS_TEAM_ID", origTeamId);
      restoreEnv("PORT", origPort);
      restoreEnv("SCHEDULE_CRON", origCron);
      restoreEnv("CACHE_FILE", origCacheFile);
      restoreEnv("ICAL_START_MODE", origStartMode);
      delete process.env["CONFIG_FILE"];
    }
  });

  test("loads filters from env var", () => {
    const origEmail = process.env["SPIELERPLUS_EMAIL"];
    const origPassword = process.env["SPIELERPLUS_PASSWORD"];
    const origTeamId = process.env["SPIELERPLUS_TEAM_ID"];
    const origFilters = process.env["FILTERS"];

    process.env["SPIELERPLUS_EMAIL"] = "test@example.com";
    process.env["SPIELERPLUS_PASSWORD"] = mockSecretValue;
    process.env["SPIELERPLUS_TEAM_ID"] = "12345";
    process.env["FILTERS"] = '[{"path":"/training.ics","titleRegex":"Training"}]';
    process.env["CONFIG_FILE"] = "/tmp/nonexistent-config.json";

    try {
      const config = loadConfig();
      expect(config.filters).toHaveLength(1);
      expect(config.filters[0]?.path).toBe("/training.ics");
      expect(config.filters[0]?.titleRegex).toBe("Training");
    } finally {
      restoreEnv("SPIELERPLUS_EMAIL", origEmail);
      restoreEnv("SPIELERPLUS_PASSWORD", origPassword);
      restoreEnv("SPIELERPLUS_TEAM_ID", origTeamId);
      restoreEnv("FILTERS", origFilters);
      delete process.env["CONFIG_FILE"];
    }
  });
});
