import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: body.message,
        },
      ],
    })

    return Response.json({
      reply: completion.choices[0].message.content,
    })
  } catch (error: unknown) {
    console.error(error)

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}