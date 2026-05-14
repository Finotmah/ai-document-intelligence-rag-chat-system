import { pipeline } from "@xenova/transformers"

const DEFAULT_MODEL = process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2"

let embeddingPipelinePromise: Promise<any> | null = null

async function getEmbeddingPipeline(): Promise<any> {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = pipeline("feature-extraction", DEFAULT_MODEL)
  }

  return embeddingPipelinePromise
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const normalizedText = text.trim()

  if (!normalizedText) {
    throw new Error("Cannot generate embeddings for empty text")
  }

  const extractor = await getEmbeddingPipeline()
  const output = await extractor(normalizedText, {
    pooling: "mean",
    normalize: true,
  })

  const embedding = Array.from(output.data as Float32Array | number[])

  if (embedding.length === 0) {
    throw new Error("Embedding model returned an empty vector")
  }

  return embedding
}

export function getEmbeddingModelName(): string {
  return DEFAULT_MODEL
}
