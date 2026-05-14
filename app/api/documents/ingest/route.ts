import { ingestDocument } from "@/app/lib/phase3/document-store"

export const runtime = "nodejs"

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()

    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : ""
    const extractedText = typeof body.extractedText === "string" ? body.extractedText.trim() : ""
    const fileSize = toNumber(body.fileSize)
    const pageCount = body.pageCount == null ? null : toNumber(body.pageCount)
    const sourceType = typeof body.sourceType === "string" && body.sourceType.trim() ? body.sourceType.trim() : "pdf"

    if (!fileName) {
      return Response.json({ success: false, error: { code: "INVALID_INPUT", message: "fileName is required" } }, { status: 400 })
    }

    if (!extractedText) {
      return Response.json({ success: false, error: { code: "INVALID_INPUT", message: "extractedText is required" } }, { status: 400 })
    }

    if (fileSize == null) {
      return Response.json({ success: false, error: { code: "INVALID_INPUT", message: "fileSize is required" } }, { status: 400 })
    }

    const result = await ingestDocument({
      fileName,
      fileSize,
      extractedText,
      pageCount: pageCount ?? undefined,
      sourceType,
    })

    return Response.json(
      {
        success: true,
        data: {
          documentId: result.document.id,
          fileName: result.document.sourceFileName,
          pageCount: result.document.pageCount,
          chunkCount: result.document.chunkCount,
          embeddingModel: result.embeddingModel,
          chunks: result.chunks.map((chunk) => ({
            id: chunk.id,
            index: chunk.chunkIndex,
            wordCount: chunk.wordCount,
          })),
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Document ingest error:", error)

    return Response.json(
      {
        success: false,
        error: {
          code: "INGEST_ERROR",
          message: error instanceof Error ? error.message : "Failed to ingest document",
        },
      },
      { status: 500 }
    )
  }
}
