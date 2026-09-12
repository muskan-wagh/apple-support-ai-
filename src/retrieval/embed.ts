/**
 * Local embedding loader (Transformers.js, all-MiniLM-L6-v2).
 * Lazy singleton: the model downloads ONLY when embedTexts/embedQuery is first called.
 * Unit tests never touch this module's loader (they use the lexical fallback).
 */
import { EMBEDDING_DIMS, EMBEDDING_MODEL, TRANSFORMERS_CACHE_DIR } from "./config.js";

type FeatureExtractionPipeline = (
  texts: string | string[],
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ tolist: () => number[] | number[][] }>;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

export function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      // Imported lazily so tests/CLI paths that never embed pay zero cost.
      const { env, pipeline } = await import("@xenova/transformers");
      env.cacheDir = TRANSFORMERS_CACHE_DIR;
      const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL);
      return extractor as unknown as FeatureExtractionPipeline;
    })();
  }
  return extractorPromise;
}

/** Embed one query string -> normalized 384-d vector. */
export async function embedQuery(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const out = await extractor(text, { pooling: "mean", normalize: true });
  const vec = out.tolist() as number[];
  assertDims(vec);
  return vec;
}

/** Embed a batch of texts -> one normalized 384-d vector per input, in order. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  const listed = out.tolist() as number[] | number[][];
  // Single-element batches may come back flat; normalize to 2-D.
  const matrix: number[][] =
    texts.length === 1 && typeof (listed as number[])[0] === "number"
      ? [listed as number[]]
      : (listed as number[][]);
  if (matrix.length !== texts.length) {
    throw new Error(`embedBatch: expected ${texts.length} vectors, got ${matrix.length}`);
  }
  for (const vec of matrix) assertDims(vec);
  return matrix;
}

function assertDims(vec: number[]): void {
  if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS) {
    throw new Error(`bad embedding dims: expected ${EMBEDDING_DIMS}, got ${vec?.length}`);
  }
}

/** Split an array into fixed-size chunks (pure, tested). */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
