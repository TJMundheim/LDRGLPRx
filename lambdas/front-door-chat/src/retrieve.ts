// In-memory retrieval over the pre-built Titan embedding index.
// The index is loaded once per cold start from disk (bundled) or S3 (fallback
// for bundles that would exceed the 50 MB Lambda zip limit).
import { readFile } from 'node:fs/promises';
import { embedQuery } from './bedrock';
import { INDEX_PATH, INDEX_S3_BUCKET, INDEX_S3_KEY, REGION, TOP_K } from './config';

export interface Chunk {
  id: string;
  source: 'book' | 'logbook' | 'site' | 'faq';
  title: string;
  url: string | null;
  text: string;
  vec: number[];
}

export interface ChunkIndex { model: string; dims: number; builtAt: string; chunks: Chunk[] }

let cached: Promise<ChunkIndex> | null = null;

async function readIndex(): Promise<ChunkIndex> {
  if (INDEX_S3_BUCKET && INDEX_S3_KEY) {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({ region: REGION });
    const res = await s3.send(new GetObjectCommand({ Bucket: INDEX_S3_BUCKET, Key: INDEX_S3_KEY }));
    return JSON.parse(await res.Body!.transformToString()) as ChunkIndex;
  }
  return JSON.parse(await readFile(INDEX_PATH, 'utf8')) as ChunkIndex;
}

/** Loads (and memoises) the index. Exported for tests to reset via resetIndex(). */
export function loadIndex(): Promise<ChunkIndex> {
  if (!cached) cached = readIndex();
  return cached;
}

export function resetIndex(): void { cached = null; }

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Ranks chunks by cosine against a query vector, then dedupes by title. */
export function rank(index: ChunkIndex, queryVec: number[], k = TOP_K): Chunk[] {
  const scored = index.chunks
    .map((c) => ({ c, s: cosine(queryVec, c.vec) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, k);

  const seen = new Set<string>();
  const out: Chunk[] = [];
  for (const { c } of scored) {
    if (seen.has(c.title)) continue;
    seen.add(c.title);
    out.push(c);
  }
  return out;
}

/** Embeds the question and returns the deduped top-k chunks. */
export async function retrieve(question: string): Promise<Chunk[]> {
  const index = await loadIndex();
  const vec = await embedQuery(question, index.dims);
  return rank(index, vec);
}
