import * as pdfjsLib from "pdfjs-dist"
import { PDFExtractionResult } from "@/app/types/upload"

// Set up worker for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export async function extractTextFromPDF(
  fileBuffer: ArrayBuffer
): Promise<PDFExtractionResult> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise

    let fullText = ""
    const pageCount = pdf.numPages

    // Extract text from each page
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ")

      fullText += pageText + "\n"
    }

    return {
      text: fullText.trim(),
      pageCount,
    }
  } catch (error: any) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`)
  }
}
