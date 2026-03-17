import { CronJob } from "cron";
import { scrapeEvents } from "./scraper.js";
import { updateCache } from "./cache.js";
import type { Config } from "./config.js";

let job: CronJob | null = null;

async function runScrape(config: Config): Promise<void> {
  try {
    console.log(`[scheduler] Starting scrape at ${new Date().toISOString()}`);
    const events = await scrapeEvents(
      config.spielerplus.email,
      config.spielerplus.password,
      config.spielerplus.teamId
    );
    updateCache(events);
  } catch (error) {
    console.error("[scheduler] Scrape failed:", error);
  }
}

export function startScheduler(config: Config): void {
  // Run immediately on start
  runScrape(config);

  // Then schedule recurring
  job = new CronJob(
    config.schedule.cron,
    () => {
      runScrape(config);
    },
    null,
    true,
    "Europe/Berlin"
  );

  console.log(`[scheduler] Scheduled with cron: ${config.schedule.cron}`);
}

export function stopScheduler(): void {
  if (job) {
    job.stop();
    job = null;
  }
}
