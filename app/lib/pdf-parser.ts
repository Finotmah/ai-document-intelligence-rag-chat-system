import pdfParse from "pdf-parse"
import { PDFExtractionResult } from "@/app/types/upload"

export async function extractTextFromPDF(
  fileBuffer: ArrayBuffer
): Promise<PDFExtractionResult> {
  try {
    const parsed = await pdfParse(Buffer.from(fileBuffer))
    const fullText = (parsed.text || "").trim()
    const pageCount = Number(parsed.numpages || 0)

    if (!fullText) {
      throw new Error("No text content found in the PDF")
    }

    return {
      text: fullText,
      pageCount,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to extract text from PDF: ${message}`)
  }
}
