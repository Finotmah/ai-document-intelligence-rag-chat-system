import { Pool, PoolClient } from "pg"
import {
  DocumentIngestInput,
  IngestDocumentResult,
  StoredChunkRecord,
  StoredDocumentRecord,
} from "@/app/lib/phase3/types"

const globalForPg = globalThis as unknown as {
  pgPool?: Pool
  pgConnectionString?: string
}

function createPool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  })
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Phase 3 document storage")
  }

  if (!globalForPg.pgPool || globalForPg.pgConnectionString !== connectionString) {
    const previousPool = globalForPg.pgPool
    globalForPg.pgPool = createPool(connectionString)
    globalForPg.pgConnectionString = connectionString

    if (previousPool) {
      void previousPool.end().catch(() => {
        // Ignore pool shutdown errors during hot reloads.
      })
    }
  }

  return globalForPg.pgPool
}

export function embeddingToVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`
}

async function runTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()

  try {
    await client.query("BEGIN")
    const result = await handler(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function insertDocumentWithChunks({
  fileName,
  fileSize,
  extractedText,
  pageCount,
  sourceType = "pdf",
  embeddingModel,
  chunks,
}: DocumentIngestInput & {
  embeddingModel: string
  chunks: Array<{
    text: string
    wordCount: number
    embedding: number[]
  }>
}): Promise<IngestDocumentResult> {
  return runTransaction(async (client) => {
    const documentResult = await client.query<StoredDocumentRecord>(
      `INSERT INTO documents (
        source_file_name,
        source_file_size,
        page_count,
        source_type,
        extracted_text,
        embedding_model,
        chunk_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, source_file_name AS "sourceFileName", source_file_size AS "sourceFileSize", page_count AS "pageCount", source_type AS "sourceType", extracted_text AS "extractedText", embedding_model AS "embeddingModel", chunk_count AS "chunkCount", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [fileName, fileSize, pageCount ?? null, sourceType, extractedText, embeddingModel, chunks.length]
    )

    const document = documentResult.rows[0]

    const storedChunks: StoredChunkRecord[] = []

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]
      const chunkResult = await client.query<StoredChunkRecord>(
        `INSERT INTO document_chunks (
          document_id,
          chunk_index,
          chunk_text,
          word_count,
          embedding
        ) VALUES ($1, $2, $3, $4, $5::vector)
        RETURNING id, document_id AS "documentId", chunk_index AS "chunkIndex", chunk_text AS "chunkText", word_count AS "wordCount", created_at AS "createdAt"`,
        [document.id, index, chunk.text, chunk.wordCount, embeddingToVectorLiteral(chunk.embedding)]
      )

      storedChunks.push(chunkResult.rows[0])
    }

    return {
      document,
      chunks: storedChunks,
    }
  })
}
