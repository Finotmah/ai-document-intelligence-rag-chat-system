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
                        Phase 2: PDF Upload & Text Extraction
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-8">
                    <PDFUpload />
                </div>

                <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        How it works
                    </h3>
                    <ul className="text-gray-700 space-y-2 text-sm">
                        <li>✓ Upload any PDF document (max 10MB)</li>
                        <li>✓ Automatic text extraction from all pages</li>
                        <li>✓ Preview extracted content</li>
                        <li>✓ Ready for Phase 3: Chunking & Embeddings</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
