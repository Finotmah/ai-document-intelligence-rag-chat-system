export interface UploadResponse {
  success: boolean
  data?: {
    fileName: string
    pageCount: number
    extractedText: string
    fileSize: number
    uploadedAt: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export interface PDFExtractionResult {
  text: string
  pageCount: number
}
