import { VERSION } from "./runSupportAgent.js";

const message = process.argv.slice(2).join(" ") || "My iPhone won't connect to WiFi (demo — full agent lands in later phase).";
console.log(`[${VERSION}] agent stub received: ${message}`);
console.log("Full pipeline (intent -> retrieval -> escalation -> generation) lands after Phase 1.");
