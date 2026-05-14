export interface ChunkingOptions {
  minWords?: number
  targetWords?: number
  maxWords?: number
  overlapWords?: number
}

export interface ChunkResult {
  index: number
  text: string
  wordCount: number
}

export interface DocumentIngestInput {
  fileName: string
  fileSize: number
  extractedText: string
  pageCount?: number
  sourceType?: string
}

export interface StoredDocumentRecord {
  id: string
  sourceFileName: string
  sourceFileSize: number
  pageCount: number | null
  sourceType: string
  extractedText: string
  embeddingModel: string
  chunkCount: number
  createdAt: string
  updatedAt: string
}

export interface StoredChunkRecord {
  id: string
  documentId: string
  chunkIndex: number
  chunkText: string
  wordCount: number
  createdAt: string
}

export interface IngestDocumentResult {
  document: StoredDocumentRecord
  chunks: StoredChunkRecord[]
}
