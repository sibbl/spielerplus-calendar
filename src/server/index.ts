import type { Config } from "../config.js";
import { createServerFilters } from "./filtering.js";
import { createServerHandler } from "./handler.js";

export { createServerHandler } from "./handler.js";

export function startServer(config: Config): ReturnType<typeof Bun.serve> {
  const filters = createServerFilters(config.filters);
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
