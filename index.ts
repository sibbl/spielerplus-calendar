import { loadConfig } from "./src/config.js";
import { initializeCache } from "./src/cache.js";
import { startServer } from "./src/server.js";
import { startScheduler } from "./src/scheduler.js";

const config = loadConfig();
initializeCache(config.cache.file);
startServer(config);
startScheduler(config);