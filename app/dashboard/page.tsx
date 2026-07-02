"use client"

import { useState, useEffect, type ReactElement } from "react"

interface ChatSource {
    documentId: string
    sourceFileName: string
    chunkIndex: number
    similarity: number
}

interface UploadedDocument {
    id: string
    fileName: string
    fileSize: number
    uploadedAt: string
    updatedAt?: string
    chunkCount: number
    sourceType?: string
    status: "processing" | "ready" | "error"
}

function MarkdownContent({ content }: { content: string }) {
    const renderContent = () => {
        const parts: ReactElement[] = []
        const lines = content.split("\n")
        let currentPart = ""

        for (const line of lines) {
            if (line.startsWith("```")) {
                if (currentPart) {
                    parts.push(
                        <p key={parts.length} className="text-slate-700 mb-2">
                            {currentPart}
                        </p>
                    )
                    currentPart = ""
                }

                const codeMatch = content.match(/```(\w+)?\n([\s\S]*?)\n```/g)
                if (codeMatch) {
                    codeMatch.forEach((block) => {
                        const lang = block.match(/```(\w+)?/)?.[1] || "text"
                        const code = block.replace(/```\w*\n/, "").replace(/\n```/, "")
                        parts.push(
                            <pre
                                key={parts.length}
                                className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto mb-4 text-sm font-mono"
                            >
                                <code>{code}</code>
                            </pre>
                        )
                    })
                }
                break
            } else if (line.startsWith("## ")) {
                if (currentPart) {
                    parts.push(
                        <p key={parts.length} className="text-slate-700 mb-2">
                            {currentPart}
                        </p>
                    )
                    currentPart = ""
                }
                const heading = line.replace(/^#+\s/, "")
                parts.push(
                    <h2 key={parts.length} className="text-lg font-bold text-slate-900 mt-4 mb-3">
                        {heading}
                    </h2>
                )
            } else if (line.startsWith("### ")) {
                if (currentPart) {
                    parts.push(
                        <p key={parts.length} className="text-slate-700 mb-2">
                            {currentPart}
                        </p>
                    )
                    currentPart = ""
                }
                const heading = line.replace(/^#+\s/, "")
                parts.push(
                    <h3 key={parts.length} className="text-base font-semibold text-slate-800 mt-3 mb-2">
                        {heading}
                    </h3>
                )
            } else if (line.startsWith("- ")) {
                if (currentPart) {
                    parts.push(
                        <p key={parts.length} className="text-slate-700 mb-2">
                            {currentPart}
                        </p>
                    )
                    currentPart = ""
                }
                const item = line.replace(/^-\s/, "")
                parts.push(
                    <li key={parts.length} className="text-slate-700 ml-4 mb-1 list-disc">
                        {item}
                    </li>
                )
            } else if (line.trim()) {
                currentPart += (currentPart ? " " : "") + line
            }
        }

        if (currentPart) {
            parts.push(
                <p key={parts.length} className="text-slate-700">
                    {currentPart}
                </p>
            )
        }

        return parts
    }

    return <div className="space-y-2">{renderContent()}</div>
}

export default function DashboardPage() {
    const [message, setMessage] = useState("")
    const [reply, setReply] = useState("")
    const [sources, setSources] = useState<ChatSource[]>([])
    const [chatError, setChatError] = useState("")
    const [chatLoading, setchatLoading] = useState(false)

    const [uploadFiles, setUploadFiles] = useState<File[]>([])
    const [uploadError, setUploadError] = useState("")
    const [uploadLoading, setUploadLoading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
    const [uploadedCount, setUploadedCount] = useState(0)
    const [documents, setDocuments] = useState<UploadedDocument[]>([])
    const [documentsLoading, setDocumentsLoading] = useState(false)
    const [documentsError, setDocumentsError] = useState("")

    // Load documents on mount
    useEffect(() => {
        void loadDocuments()
    }, [])

    async function loadDocuments() {
        setDocumentsLoading(true)
        setDocumentsError("")

        try {
            const res = await fetch("/api/documents", {
                cache: "no-store",
            })

            const data = await readResponseData(res)

            if (!res.ok) {
                throw new Error(data.error || "Failed to load documents")
            }

            setDocuments(Array.isArray(data.documents) ? data.documents : [])
        } catch (error) {
            setDocuments([])
            setDocumentsError(error instanceof Error ? error.message : "Failed to load documents")
            console.error("Failed to load documents:", error)
        } finally {
            setDocumentsLoading(false)
        }
    }

    async function readResponseData(res: Response) {
        const contentType = res.headers.get("content-type") || ""

        if (contentType.includes("application/json")) {
            return await res.json()
        }

        const text = await res.text()

        try {
            return JSON.parse(text)
        } catch {
            return { error: text || "Unexpected non-JSON response from server" }
        }
    }

    async function handleUpload() {
        if (uploadFiles.length === 0) return

        setUploadLoading(true)
        setUploadError("")
        setUploadProgress({})
        setUploadedCount(0)

        try {
            let successCount = 0
            const errors: string[] = []

            for (let i = 0; i < uploadFiles.length; i++) {
                const file = uploadFiles[i]
                setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))

                try {
                    const formData = new FormData()
                    formData.append("file", file)

                    const res = await fetch("/api/upload/pdf", {
                        method: "POST",
                        body: formData,
                    })

                    const data = await readResponseData(res)

                    if (!res.ok) {
                        throw new Error(data.error || `Failed to upload ${file.name}`)
                    }

                    successCount++
                    setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
                    setUploadedCount(successCount)
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error"
                    errors.push(`${file.name}: ${errorMessage}`)
                }
            }

            // Reset file input
            setUploadFiles([])
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
            if (fileInput) fileInput.value = ""

            // Show success or partial error message
            if (errors.length > 0) {
                setUploadError(`Uploaded ${successCount}/${uploadFiles.length} files. Errors: ${errors.join("; ")}`)
            } else {
                setUploadError("")
            }

            // Reload documents after uploads finish
            await loadDocuments()
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            setUploadError(errorMessage)
        } finally {
            setUploadLoading(false)
        }
    }

    async function sendMessage() {
        setchatLoading(true)
        setChatError("")

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message,
                }),
            })

            const data = await readResponseData(res)

            if (!res.ok) {
                throw new Error(data.error || "Failed to get response")
            }

            setReply(data.reply)
            setSources(data.sources || [])
            setMessage("")
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            setChatError(errorMessage)
            setReply("")
            setSources([])
        } finally {
            setchatLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_24%,_#f8fafc_100%)] flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm px-6 py-4 sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">AI Document Intelligence & RAG Chat System Dashboard</h1>
                        <p className="text-sm text-slate-600 mt-1">Upload documents and ask intelligent questions</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">{documents.length}</p>
                        <p className="text-xs text-slate-600">Documents uploaded</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex gap-6 p-6">
                {/* Left Panel: Upload */}
                <div className="w-96 flex flex-col gap-4 overflow-y-auto">
                    {/* Upload Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">📄 Upload Document</h2>

                        {/* File Input */}
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Choose PDFs
                            </label>
                            <input
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                                disabled={uploadLoading}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-600 mt-1">
                                {uploadFiles.length > 0
                                    ? `${uploadFiles.length} file${uploadFiles.length !== 1 ? "s" : ""} selected`
                                    : "Select one or more PDFs (Max 10MB each)"}
                            </p>
                        </div>

                        {/* Selected Files Preview */}
                        {uploadFiles.length > 0 && (
                            <div className="mb-4 space-y-2 max-h-32 overflow-y-auto">
                                {uploadFiles.map((file) => (
                                    <div
                                        key={file.name}
                                        className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200 text-xs"
                                    >
                                        <span className="text-slate-700 truncate flex-1">{file.name}</span>
                                        <span className="text-slate-600 ml-2">
                                            {(file.size / 1024 / 1024).toFixed(1)}MB
                                        </span>
                                        {uploadProgress[file.name] === 100 && (
                                            <span className="text-emerald-600 ml-2">✓</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Button */}
                        <button
                            onClick={handleUpload}
                            disabled={uploadFiles.length === 0 || uploadLoading}
                            className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                        >
                            {uploadLoading ? `Uploading... (${uploadedCount}/${uploadFiles.length})` : `Upload ${uploadFiles.length > 0 ? uploadFiles.length : ""} PDF${uploadFiles.length !== 1 ? "s" : ""}`}
                        </button>

                        {/* Error/Success Message */}
                        {uploadError && (
                            <div className={`mt-4 rounded-lg p-3 border ${uploadError.includes("Uploaded") && uploadError.includes("0/") ? "bg-red-50 border-red-200" : uploadError.includes("Uploaded") ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
                                <p className={`text-sm font-medium ${uploadError.includes("Uploaded") && uploadError.includes("0/") ? "text-red-700" : uploadError.includes("Uploaded") ? "text-blue-700" : "text-red-700"}`}>
                                    {uploadError.includes("Uploaded") ? "Upload Summary" : "Error"}
                                </p>
                                <p className={`text-xs mt-1 ${uploadError.includes("Uploaded") && uploadError.includes("0/") ? "text-red-600" : uploadError.includes("Uploaded") ? "text-blue-600" : "text-red-600"}`}>
                                    {uploadError}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Documents List */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex-1 overflow-y-auto">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">📚 Your Documents</h2>

                        {documentsLoading && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                Loading documents...
                            </div>
                        )}

                        {documentsError && (
                            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                {documentsError}
                            </div>
                        )}

                        {!documentsLoading && documents.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-600 text-sm mb-2">No documents uploaded yet</p>
                                <p className="text-slate-500 text-xs">Upload a PDF to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900 text-sm truncate">
                                                    {doc.fileName}
                                                </p>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    {doc.chunkCount} chunks • {new Date(doc.uploadedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span
                                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                                    doc.status === "ready"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : doc.status === "processing"
                                                          ? "bg-blue-100 text-blue-800"
                                                          : "bg-red-100 text-red-800"
                                                }`}
                                            >
                                                {doc.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Chat */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {/* Response Area */}
                    <div className="flex-1 overflow-y-auto">
                        {chatLoading && (
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                                <div className="flex items-center">
                                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
                                    <p className="text-blue-900 font-medium">Thinking...</p>
                                </div>
                            </div>
                        )}

                        {chatError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                <p className="text-red-900 font-semibold mb-1">Error</p>
                                <p className="text-red-700 text-sm">{chatError}</p>
                            </div>
                        )}

                        {reply && (
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                                        Response
                                    </h2>
                                    <MarkdownContent content={reply} />
                                </div>

                                {/* Sources */}
                                {sources.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-4">
                                            📚 Retrieved Sources ({sources.length})
                                        </h3>
                                        <div className="space-y-3 max-h-48 overflow-y-auto">
                                            {sources.map((source, index) => (
                                                <div
                                                    key={`${source.documentId}-${source.chunkIndex}-${index}`}
                                                    className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-slate-300 transition"
                                                >
                                                    <div className="flex items-start justify-between mb-1">
                                                        <p className="font-medium text-slate-900 text-sm">
                                                            {source.sourceFileName}
                                                        </p>
                                                        <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded">
                                                            {(source.similarity * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600">
                                                        Chunk #{source.chunkIndex}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!reply && !chatError && !chatLoading && (
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 text-center">
                                <p className="text-slate-600 text-sm">
                                    💡 Ask a question about your uploaded documents
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask a question about your documents..."
                            disabled={chatLoading}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-slate-100 disabled:cursor-not-allowed text-sm"
                            rows={3}
                        />
                        <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-slate-600">
                                Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-900 font-mono text-xs">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-900 font-mono text-xs">Shift+Enter</kbd> for new line
                            </p>
                            <button
                                onClick={sendMessage}
                                disabled={chatLoading || !message.trim()}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition text-sm"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
