/**
 * Adapter registry — single import point for "all known ingest adapters".
 *
 * Importing this file registers every adapter with the IngestAdapter map.
 * The cron /admin endpoint imports from here so it doesn't have to know
 * about each adapter individually.
 */

import { registerAdapter } from "./types";
import { CraigslistAdapter } from "./craigslist";

let registered = false;

export function ensureAdaptersRegistered(): void {
  if (registered) return;
  registered = true;
  registerAdapter(new CraigslistAdapter());
}