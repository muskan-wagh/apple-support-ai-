/** Shared retrieval/embedding configuration. Single place for model + index paths. */
import path from "node:path";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMS = 384;

/** LanceDB database directory (git-ignored via *.lancedb/). Apple corpus only. */
export const LANCEDB_DIR = path.resolve("data/processed/apple-support.lancedb");
export const LANCEDB_TABLE = "apple_examples";

/** Local Transformers.js model cache (git-ignored). Keeps the download measurable. */
export const TRANSFORMERS_CACHE_DIR = path.resolve("models/transformers-cache");

export const CONVERSATIONS_JSONL = path.resolve("data/processed/conversations.jsonl");
export const EMBEDDINGS_STATS_JSON = path.resolve("data/processed/embeddings.stats.json");
