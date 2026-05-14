import { generateEmbedding } from "@/app/lib/phase3/embedding"
import { embeddingToVectorLiteral, getPool } from "@/app/lib/phase3/db"

export interface RetrievedChunk {
  id: string
  documentId: string
  sourceFileName: string
  chunkIndex: number
  chunkText: string
  wordCount: number
  similarity: number
}

export async function retrieveRelevantChunks(question: string, topK = 5): Promise<RetrievedChunk[]> {
  const normalizedQuestion = question.trim()

  if (!normalizedQuestion) {
    throw new Error("Question is required for retrieval")
  }

  const questionEmbedding = await generateEmbedding(normalizedQuestion)

  const embeddingLiteral = embeddingToVectorLiteral(questionEmbedding)
  const safeTopK = Number.isFinite(topK) && topK > 0 ? Math.min(Math.floor(topK), 20) : 5
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // ivfflat may return too few rows on small datasets unless probes is high.
    await client.query("SET LOCAL ivfflat.probes = 100")

    const indexedResult = await client.query<RetrievedChunk>(
      `SELECT
        dc.id,
        dc.document_id AS "documentId",
        d.source_file_name AS "sourceFileName",
        dc.chunk_index AS "chunkIndex",
        dc.chunk_text AS "chunkText",
        dc.word_count AS "wordCount",
        1 - (dc.embedding <=> $1::vector) AS "similarity"
      FROM document_chunks dc
      INNER JOIN documents d ON d.id = dc.document_id
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $2`,
      [embeddingLiteral, safeTopK]
    )

    if (indexedResult.rows.length > 0) {
      await client.query("COMMIT")
      return indexedResult.rows
    }

    // Fallback to exact search if ANN path yields no rows.
    await client.query("SET LOCAL enable_indexscan = off")
    await client.query("SET LOCAL enable_bitmapscan = off")

    const exactResult = await client.query<RetrievedChunk>(
      `SELECT
        dc.id,
        dc.document_id AS "documentId",
        d.source_file_name AS "sourceFileName",
        dc.chunk_index AS "chunkIndex",
        dc.chunk_text AS "chunkText",
        dc.word_count AS "wordCount",
        1 - (dc.embedding <=> $1::vector) AS "similarity"
      FROM document_chunks dc
      INNER JOIN documents d ON d.id = dc.document_id
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $2`,
      [embeddingLiteral, safeTopK]
    )

    await client.query("COMMIT")
    return exactResult.rows
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
