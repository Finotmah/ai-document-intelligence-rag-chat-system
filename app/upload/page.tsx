"use client"

import PDFUpload from "@/app/components/PDFUpload"

export default function UploadPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        UniCollab AI
                    </h1>
                    <p className="text-gray-600">
                        Phase 2 + Phase 3: PDF Upload → Text Extraction → Semantic Chunking → Embeddings
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-8">
                    <PDFUpload />
                </div>

                <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Full Pipeline (Phase 2 + Phase 3)
                    </h3>
                    <ul className="text-gray-700 space-y-2 text-sm">
                        <li>✓ Upload any PDF document (max 10MB)</li>
                        <li>✓ Automatic text extraction from all pages</li>
                        <li>✓ Semantic chunking into 300-500 word segments</li>
                        <li>✓ Embedding generation using all-MiniLM-L6-v2</li>
                        <li>✓ Persistent storage in PostgreSQL with pgvector</li>
                        <li>✓ Ready for Phase 4: RAG System</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
