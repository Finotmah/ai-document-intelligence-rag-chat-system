import { answerWithRAG } from "@/app/lib/phase4/rag-chat"

function isGreeting(message: string): boolean {
  const normalized = message.trim().toLowerCase()

  return /^(hi|hello|hey|hiya|good morning|good afternoon|good evening|howdy|thanks|thank you)[!.?\s]*$/.test(normalized)
}

async function readJsonBody(req: Request): Promise<{ message?: unknown } | null> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req)

    if (!body) {
      return Response.json(
        {
          error: "Invalid JSON payload",
        },
        { status: 400 }
      )
    }

    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!message) {
      return Response.json(
        {
          error: "Message is required",
        },
        { status: 400 }
      )
    }

    if (isGreeting(message)) {
      return Response.json({
        reply: "Hi! Upload a PDF first, then ask me a question about its contents.",
        usedRAG: false,
        sources: [],
      })
    }

    const ragResult = await answerWithRAG(message)

    return Response.json({
      reply: ragResult.reply,
      usedRAG: ragResult.usedRAG,
      sources: ragResult.sources,
    })
  } catch (error: unknown) {
    console.error(error)

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}