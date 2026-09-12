import "dotenv/config";
import { runSupportAgent, VERSION } from "./runSupportAgent.js";

async function main(): Promise<void> {
  const message = process.argv.slice(2).join(" ").trim();
  if (!message) {
    console.log(`[${VERSION}] usage: npm run agent -- "My iPhone won't connect to WiFi"`);
    process.exit(1);
  }
  const result = await runSupportAgent(message);
  console.log(`intent: ${result.intent} (confidence ${result.confidence.toFixed(2)})`);
  console.log(`escalated: ${result.escalated}${result.escalationReasons.length > 0 ? ` [${result.escalationReasons.join(",")}]` : ""}`);
  console.log(`examples: ${result.examples.map((e) => e.exampleId).join(", ") || "(none)"}`);
  console.log("---");
  console.log(result.response);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
