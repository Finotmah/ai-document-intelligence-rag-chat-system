import { getPool } from "@/app/lib/phase3/db"

export const runtime = "nodejs"

type DocumentRow = {
  id: string
  source_file_name: string
  source_file_size: string | number
  page_count: number | null
  source_type: string
  chunk_count: number
  created_at: string
  updated_at: string
}

export async function GET(): Promise<Response> {
  try {
    const pool = getPool()
    const result = await pool.query<DocumentRow>(
      `SELECT
        id,
        source_file_name,
        source_file_size,
        page_count,
        source_type,
        chunk_count,
        created_at,
        updated_at
      FROM documents
      ORDER BY created_at DESC
      LIMIT 50`
    )

    return Response.json({
      documents: (result.rows as DocumentRow[]).map((row: DocumentRow) => ({
        id: row.id,
        fileName: row.source_file_name,
        fileSize: Number(row.source_file_size),
        pageCount: row.page_count,
        sourceType: row.source_type,
        chunkCount: row.chunk_count,
        uploadedAt: row.created_at,
        updatedAt: row.updated_at,
        status: "ready" as const,
      })),
    })
  } catch (error: unknown) {
    const errorCode =
      error instanceof Error && "code" in error
        ? String((error as { code?: unknown }).code)
        : ""

    if (errorCode === "ECONNREFUSED") {
      console.warn("Document list unavailable: PostgreSQL connection refused")

      return Response.json({
        documents: [],
        warning: "Document storage is unavailable. Start PostgreSQL to load saved documents.",
      })
    }

    console.error("Document list error:", error)

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to load documents",
      },
      { status: 500 }
    )
  }
}