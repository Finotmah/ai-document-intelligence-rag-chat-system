import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import { PDFExtractionResult } from "@/app/types/upload"

type PdfTextItem = {
  str?: string
}

type PdfTextContent = {
  items: PdfTextItem[]
}

export async function extractTextFromPDF(
  fileBuffer: ArrayBuffer
): Promise<PDFExtractionResult> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    })

    const pdfDocument = await loadingTask.promise
    const extractedPages: string[] = []

    try {
      for (let pageIndex = 1; pageIndex <= pdfDocument.numPages; pageIndex += 1) {
        const page = await pdfDocument.getPage(pageIndex)
        const textContent = (await page.getTextContent()) as PdfTextContent

        const pageText = textContent.items
          .map((item) => item.str ?? "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()

        if (pageText) {
          extractedPages.push(pageText)
        }
      }
    } finally {
      await pdfDocument.destroy().catch(() => {
        // Ignore cleanup errors.
      })
    }

    const fullText = extractedPages.join("\n\n").trim()
    const pageCount = pdfDocument.numPages

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
