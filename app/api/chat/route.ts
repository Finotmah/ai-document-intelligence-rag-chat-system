import { answerWithRAG } from "@/app/lib/phase4/rag-chat"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!message) {
      return Response.json(
        {
          error: "Message is required",
        },
        { status: 400 }
      )
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