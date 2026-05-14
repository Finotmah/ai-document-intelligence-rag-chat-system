export interface IngestResult {
  documentId: string
  chunkCount: number
  embeddingModel: string
}

export interface UploadResponse {
  success: boolean
  data?: {
    fileName: string
    pageCount: number
    extractedText: string
    fileSize: number
    uploadedAt: string
    ingest?: IngestResult
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
