import { FileValidationResult } from "@/app/types/upload"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ["application/pdf"]
const ALLOWED_EXTENSIONS = [".pdf"]

export function validatePDFFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    }
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Only PDF files are allowed",
    }
  }

  // Check file extension
  const fileName = file.name.toLowerCase()
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  )

  if (!hasValidExtension) {
    return {
      valid: false,
      error: "Invalid file extension. Only .pdf files are allowed",
    }
  }

  return { valid: true }
}
