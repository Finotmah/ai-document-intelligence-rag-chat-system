import { validatePDFFile } from "@/app/lib/validators/pdf"
import { extractTextFromPDF } from "@/app/lib/pdf-parser"
import { ingestDocument } from "@/app/lib/phase3/document-store"
import { UploadResponse } from "@/app/types/upload"

export const runtime = "nodejs"

export async function POST(req: Request): Promise<Response> {
  try {
    // Parse FormData
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json(
        {
          success: false,
          error: {
            code: "NO_FILE",
            message: "No file provided",
          },
        } as UploadResponse,
        { status: 400 }
      )
    }

    // Validate file
    const validation = validatePDFFile(file)
    if (!validation.valid) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_FILE",
            message: validation.error || "File validation failed",
          },
        } as UploadResponse,
        { status: 400 }
      )
    }

    // Convert file to ArrayBuffer
    const buffer = await file.arrayBuffer()

    // Extract text from PDF
    const extractionResult = await extractTextFromPDF(buffer)

    // Phase 3: Ingest extracted text into document store
    let ingestResult: any = undefined
    try {
      const ingestOutput = await ingestDocument({
        fileName: file.name,
        fileSize: file.size,
        extractedText: extractionResult.text,
        pageCount: extractionResult.pageCount,
        sourceType: "pdf",
      })

      ingestResult = {
        documentId: ingestOutput.document.id,
        chunkCount: ingestOutput.document.chunkCount,
        embeddingModel: ingestOutput.embeddingModel,
      }
    } catch (ingestError: unknown) {
      const ingestMessage = ingestError instanceof Error ? ingestError.message : "Unknown ingest error"
      console.error("Phase 3 ingest failed:", ingestMessage)

      return Response.json(
        {
          success: false,
          error: {
            code: "INGEST_ERROR",
            message: `PDF was extracted, but indexing failed: ${ingestMessage}`,
          },
        } as UploadResponse,
        { status: 500 }
      )
    }

    // Return success response
    const response: UploadResponse = {
      success: true,
      data: {
        fileName: file.name,
        pageCount: extractionResult.pageCount,
        extractedText: extractionResult.text,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        ingest: ingestResult,
      },
    }

    return Response.json(response, { status: 200 })
  } catch (error: any) {
    console.error("PDF Upload Error:", error)

    return Response.json(
      {
        success: false,
        error: {
          code: "EXTRACTION_ERROR",
          message: error.message || "Failed to process PDF file",
        },
      } as UploadResponse,
      { status: 500 }
    )
  }
}
