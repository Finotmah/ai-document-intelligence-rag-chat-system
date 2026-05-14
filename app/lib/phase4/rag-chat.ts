import OpenAI from "openai"
import { retrieveRelevantChunks, RetrievedChunk } from "@/app/lib/phase4/retrieval"

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
})

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
  return chunks
    .map(
      (chunk, index) =>
        `Context ${index + 1}\nDocument: ${chunk.sourceFileName}\nDocument ID: ${chunk.documentId}\nChunk Index: ${chunk.chunkIndex}\nSimilarity: ${chunk.similarity.toFixed(4)}\nText:\n${chunk.chunkText}`
    )
    .join("\n\n---\n\n")
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

  const chunks = await retrieveRelevantChunks(normalizedQuestion, 5)

  console.log("[RAG-CHAT] Retrieved chunks count:", chunks.length)

  if (chunks.length === 0) {
    console.log("[RAG-CHAT] No chunks found, returning error message")
    return {
      reply:
        "I could not find any indexed document chunks yet. Upload a PDF first, then ask your question again.",
      sources: [],
      usedRAG: false,
    }
  }

  const context = buildContext(chunks)

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are UniCollab AI RAG assistant. Answer ONLY using the provided context. If context is insufficient, say so clearly. Keep answers concise and factual.",
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
    sources: chunks.map((chunk) => ({
      documentId: chunk.documentId,
      sourceFileName: chunk.sourceFileName,
      chunkIndex: chunk.chunkIndex,
      similarity: Number(chunk.similarity.toFixed(4)),
    })),
  }
}
