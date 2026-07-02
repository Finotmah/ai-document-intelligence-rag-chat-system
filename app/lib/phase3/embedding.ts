import { pipeline } from "@xenova/transformers"

const DEFAULT_MODEL = process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2"
const EMBEDDING_DIMENSION = 384

let embeddingPipelinePromise: Promise<any> | null = null
let embeddingPipelineFailed = false

async function getEmbeddingPipeline(): Promise<any> {
  if (embeddingPipelineFailed) {
    return null
  }

  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = pipeline("feature-extraction", DEFAULT_MODEL).catch((error) => {
      embeddingPipelineFailed = true
      throw error
    })
  }

  return embeddingPipelinePromise
}

function hashToken(token: string): number {
  let hash = 2166136261

  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function buildFallbackEmbedding(text: string): number[] {
  const embedding = new Array<number>(EMBEDDING_DIMENSION).fill(0)
  const tokens = text.toLowerCase().match(/[a-z0-9']+/g) ?? []

  if (tokens.length === 0) {
    embedding[0] = 1
    return embedding
  }

  for (const token of tokens) {
    const hash = hashToken(token)
    const index = hash % EMBEDDING_DIMENSION
    const sign = hash & 1 ? 1 : -1
    embedding[index] += sign
  }

  const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0)) || 1

  return embedding.map((value) => value / norm)
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const normalizedText = text.trim()

  if (!normalizedText) {
    throw new Error("Cannot generate embeddings for empty text")
  }

  try {
    const extractor = await getEmbeddingPipeline()

    if (!extractor) {
      return buildFallbackEmbedding(normalizedText)
    }

    const output = await extractor(normalizedText, {
      pooling: "mean",
      normalize: true,
    })

    const embedding = Array.from(output.data as Float32Array | number[])

    if (embedding.length === 0) {
      throw new Error("Embedding model returned an empty vector")
    }

    return embedding
  } catch (error) {
    embeddingPipelineFailed = true
    console.warn("Embedding model failed, using deterministic fallback embeddings:", error)
    return buildFallbackEmbedding(normalizedText)
  }
}

export function getEmbeddingModelName(): string {
  return DEFAULT_MODEL
}
