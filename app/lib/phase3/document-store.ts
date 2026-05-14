import { chunkSemanticText } from "@/app/lib/phase3/chunker"
import { generateEmbedding, getEmbeddingModelName } from "@/app/lib/phase3/embedding"
import { insertDocumentWithChunks } from "@/app/lib/phase3/db"
import { DocumentIngestInput, IngestDocumentResult } from "@/app/lib/phase3/types"

export async function ingestDocument(input: DocumentIngestInput): Promise<IngestDocumentResult & { embeddingModel: string }> {
  const extractedText = input.extractedText.trim()

  if (!extractedText) {
    throw new Error("Extracted text is required for Phase 3 ingestion")
  }

  const chunks = chunkSemanticText(extractedText, {
    minWords: 300,
    targetWords: 400,
    maxWords: 500,
    overlapWords: 40,
  })

  if (chunks.length === 0) {
    throw new Error("No chunks could be generated from the extracted text")
  }

  const embeddingModel = getEmbeddingModelName()

  const enrichedChunks = [] as Array<{
    text: string
    wordCount: number
    embedding: number[]
  }>

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text)
    enrichedChunks.push({
      text: chunk.text,
      wordCount: chunk.wordCount,
      embedding,
    })
  }

  const result = await insertDocumentWithChunks({
    ...input,
    sourceType: input.sourceType ?? "pdf",
    embeddingModel,
    chunks: enrichedChunks,
  })

  return {
    ...result,
    embeddingModel,
  }
}
