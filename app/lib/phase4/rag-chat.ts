import OpenAI from "openai"
import { retrieveRelevantChunks, RetrievedChunk } from "@/app/lib/phase4/retrieval"

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
})

const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || "llama-3.3-8b-instant"
const MAX_CONTEXT_CHARS = 5500
const MAX_CHUNK_CHARS = 1600

export interface RAGAnswer {
  reply: string
  sources: Array<{
    documentId: string
    sourceFileName: string
    chunkIndex: number
    similarity: number
  }>
  usedRAG: boolean
}

function buildContext(chunks: RetrievedChunk[]): string {
  const formattedContext = chunks
    .map(
      (chunk, index) =>
        `Context ${index + 1}\nDocument: ${chunk.sourceFileName}\nDocument ID: ${chunk.documentId}\nChunk Index: ${chunk.chunkIndex}\nSimilarity: ${chunk.similarity.toFixed(4)}\nText:\n${chunk.chunkText.slice(0, MAX_CHUNK_CHARS)}`
    )
    .join("\n\n---\n\n")

  return formattedContext.length > MAX_CONTEXT_CHARS
    ? `${formattedContext.slice(0, MAX_CONTEXT_CHARS)}\n\n[Context truncated to stay within model limits.]`
    : formattedContext
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as {
    status?: unknown
    code?: unknown
    message?: unknown
  }

  return (
    candidate.status === 429 ||
    candidate.code === "rate_limit_exceeded" ||
    candidate.code === "429" ||
    (typeof candidate.message === "string" && candidate.message.includes("Rate limit reached"))
  )
}

function buildSources(chunks: RetrievedChunk[]) {
  return chunks.map((chunk) => ({
    documentId: chunk.documentId,
    sourceFileName: chunk.sourceFileName,
    chunkIndex: chunk.chunkIndex,
    similarity: Number(chunk.similarity.toFixed(4)),
  }))
}

export async function answerWithRAG(question: string): Promise<RAGAnswer> {
  const normalizedQuestion = question.trim()

  if (!normalizedQuestion) {
    throw new Error("Question is required")
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required for chat completions")
  }

  console.log("[RAG-CHAT] Starting RAG answer generation for:", normalizedQuestion)

  let chunks: RetrievedChunk[] = []

  try {
    chunks = await retrieveRelevantChunks(normalizedQuestion, 3)
  } catch (error: unknown) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : ""

    if (errorCode === "ECONNREFUSED") {
      console.warn("[RAG-CHAT] Retrieval unavailable (DB connection refused):", error)
      return {
        reply:
          "I cannot reach the document index right now. Please start your PostgreSQL/pgvector service, upload a PDF, and try again.",
        sources: [],
        usedRAG: false,
      }
    }

    throw error
  }

  console.log("[RAG-CHAT] Retrieved chunks count:", chunks.length)

  if (chunks.length === 0) {
    return {
      reply:
        "I could not find any indexed document chunks yet. Upload a PDF first, then ask your question again.",
      sources: [],
      usedRAG: false,
    }
  }

  const context = buildContext(chunks)
  const sources = buildSources(chunks)

  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: `You are AI Document Intelligence & RAG Chat System, a professional technical assistant. Provide concise, well-structured answers based only on the provided document context.

RESPONSE FORMAT GUIDELINES:
- Start with a 1-2 sentence summary
- Use markdown for professional formatting
- Include examples or code snippets only when relevant
- Organize information with headings and bullet points
- Cite the specific sections or documents referenced

CRITICAL RULES:
1. ONLY answer based on the provided document context
2. If context is insufficient, explicitly state: "The provided documents do not contain sufficient information to fully answer this question."
3. Be factual, concise, and professional
4. Prefer shorter answers to reduce token usage`,
        },
        {
          role: "user",
          content: `Question:\n${normalizedQuestion}\n\nRetrieved Context:\n${context}`,
        },
      ],
    })

    return {
      reply: completion.choices[0]?.message?.content ?? "No response generated.",
      usedRAG: true,
      sources,
    }
  } catch (error: unknown) {
    if (isRateLimitError(error)) {
      console.warn("[RAG-CHAT] Groq rate limit reached, returning graceful fallback.")
      return {
        reply:
          "The chat model is temporarily rate limited. Please try again in a few minutes, or set GROQ_CHAT_MODEL to a smaller model such as llama-3.3-8b-instant to reduce usage.",
        usedRAG: false,
        sources,
      }
    }

    throw error
  }
}
