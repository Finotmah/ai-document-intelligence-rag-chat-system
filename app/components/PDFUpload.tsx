"use client"

import { useState, useRef } from "react"
import { UploadResponse } from "@/app/types/upload"

export default function PDFUpload() {
    const [loading, setLoading] = useState(false)
    const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function handleFileUpload(file: File) {
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/upload/pdf", {
                method: "POST",
                body: formData,
            })

            const data: UploadResponse = await res.json()

            if (!res.ok || !data.success) {
                setError(data.error?.message || "Upload failed")
                setUploadedFile(null)
            } else {
                setUploadedFile(data)
                setError(null)
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during upload")
            setUploadedFile(null)
        } finally {
            setLoading(false)
        }
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files
        if (files && files[0]) {
            handleFileUpload(files[0])
        }
    }

    function handleDrag(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const files = e.dataTransfer.files
        if (files && files[0]) {
            handleFileUpload(files[0])
        }
    }

    function resetUpload() {
        setUploadedFile(null)
        setError(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Upload PDF Document</h2>

            {/* Upload Area */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${dragActive
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={loading}
                    className="hidden"
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="w-full"
                >
                    <svg
                        className="mx-auto h-12 w-12 text-gray-400 mb-4"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                    >
                        <path
                            d="M28 8H12a4 4 0 00-4 4v24a4 4 0 004 4h24a4 4 0 004-4V20m-14-8v16m0 0l-4-4m4 4l4-4"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>

                    <p className="text-lg font-semibold text-gray-700 mb-2">
                        {loading ? "Processing..." : "Drag and drop your PDF here"}
                    </p>
                    <p className="text-sm text-gray-500">
                        or click to browse (Max 10MB)
                    </p>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-semibold">Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {uploadedFile && uploadedFile.data && (
                <div className="mt-6 space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 font-semibold">✓ Upload Successful</p>
                        <p className="text-green-700 text-sm">PDF processed successfully</p>
                    </div>

                    {/* File Details */}
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-semibold text-gray-600">File Name</p>
                            <p className="text-gray-800">{uploadedFile.data.fileName}</p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-600">File Size</p>
                            <p className="text-gray-800">
                                {(uploadedFile.data.fileSize / 1024).toFixed(2)} KB
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-600">Pages</p>
                            <p className="text-gray-800">{uploadedFile.data.pageCount}</p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-600">
                                Extracted Text Preview
                            </p>
                            <div className="mt-2 p-3 bg-white border border-gray-200 rounded max-h-48 overflow-y-auto">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {uploadedFile.data.extractedText.substring(0, 500)}
                                    {uploadedFile.data.extractedText.length > 500 && "..."}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-600">Uploaded At</p>
                            <p className="text-gray-800 text-sm">
                                {new Date(uploadedFile.data.uploadedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {uploadedFile.data.ingest && (
                        <div className="mt-6 space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div>
                                <p className="text-lg font-semibold text-purple-900 mb-3">✓ Phase 3: Document Ingestion Complete</p>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm font-semibold text-purple-700">Document ID</p>
                                        <p className="text-purple-900 text-xs font-mono break-all mt-1">{uploadedFile.data.ingest.documentId}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-purple-700">Semantic Chunks Generated</p>
                                        <p className="text-purple-900 mt-1">{uploadedFile.data.ingest.chunkCount} chunks (300-500 words each)</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-purple-700">Embedding Model</p>
                                        <p className="text-purple-900 text-xs mt-1">{uploadedFile.data.ingest.embeddingModel}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-purple-700 mt-4">✓ Stored in PostgreSQL with pgvector embeddings for RAG</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-6">
                    <button
                        onClick={resetUpload}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
                    >
                        Upload Another PDF
                    </button>
                    </div>
                </div>
            )}
        </div>
    )
}
