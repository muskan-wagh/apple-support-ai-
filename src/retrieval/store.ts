/**
 * LanceDB store for the Apple Support retrieval corpus.
 * One row per verified conversation: real customer message + real support response.
 */
import * as lancedb from "@lancedb/lancedb";
import { LANCEDB_DIR, LANCEDB_TABLE } from "./config.js";

export interface ExampleRow {
  exampleId: string;
  customerMessage: string;
  supportResponse: string;
  vector: number[];
}

export async function openTable() {
  const db = await lancedb.connect(LANCEDB_DIR);
  const names = await db.tableNames();
  if (!names.includes(LANCEDB_TABLE)) {
    throw new Error(
      `LanceDB table "${LANCEDB_TABLE}" not found in ${LANCEDB_DIR}. Run npm run embeddings first.`,
    );
  }
  return db.openTable(LANCEDB_TABLE);
}

/** Create (or overwrite) the table from fully-embedded rows. */
export async function createTable(rows: ExampleRow[]) {
  const db = await lancedb.connect(LANCEDB_DIR);
  return db.createTable(LANCEDB_TABLE, rows as unknown as Record<string, unknown>[], {
    mode: "overwrite",
  });
}

/** Append rows to the existing table (used for batched builds). */
export async function addRows(rows: ExampleRow[]): Promise<void> {
  const table = await openTable();
  await table.add(rows as unknown as Record<string, unknown>[]);
}

/** Cosine similarity from LanceDB L2 distance (vectors are L2-normalized). */
export function cosineFromL2(distance: number): number {
  return 1 - (distance * distance) / 2;
}
