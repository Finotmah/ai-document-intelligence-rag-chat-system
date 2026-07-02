"use client"

import { useState, useEffect, type ReactElement } from "react"
import {
    AppContainer,
    AppShell,
    Badge,
    Button,
    ButtonLink,
    EmptyState,
    PageHeader,
    SectionHeading,
    Surface,
    StatCard,
    ProgressBar,
    TextArea,
} from "@/app/components/ui"

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
    pageCount?: number | null
    chunkCount: number
    sourceType?: string
    status: "processing" | "ready" | "error"
}

type DocumentListResponse = {
    documents?: UploadedDocument[]
    warning?: string
    error?: string
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
    const [documentsWarning, setDocumentsWarning] = useState("")

    // Load documents on mount
    useEffect(() => {
        void loadDocuments()
    }, [])

    async function loadDocuments() {
        setDocumentsLoading(true)
        setDocumentsError("")
        setDocumentsWarning("")

        try {
            const res = await fetch("/api/documents", {
                cache: "no-store",
            })

            const data = (await readResponseData(res)) as DocumentListResponse

            if (!res.ok) {
                throw new Error(data.error || "Failed to load documents")
            }

            setDocuments(Array.isArray(data.documents) ? data.documents : [])
            if (data.warning) {
                setDocumentsWarning(data.warning)
            }
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
        <AppShell>
            <AppContainer className="py-6 sm:py-8 lg:py-10">
                <PageHeader
                    eyebrow="Dashboard"
                    title="Upload, index, and chat from a single workspace"
                    description="Manage documents, monitor indexing, and ask grounded questions without leaving the dashboard."
                    actions={
                        <div className="flex flex-wrap gap-3">
                            <ButtonLink href="/upload" variant="secondary">
                                Upload page
                            </ButtonLink>
                            <ButtonLink href="/chat" variant="ghost">
                                Focused chat
                            </ButtonLink>
                        </div>
                    }
                />

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Documents indexed" value={String(documents.length)} helperText="Stored documents currently available for retrieval" />
                    <StatCard label="Selected files" value={String(uploadFiles.length)} helperText="Files waiting to be uploaded" />
                    <StatCard label="Upload status" value={uploadLoading ? "Uploading" : "Idle"} helperText="Current upload activity" />
                    <StatCard label="Chat status" value={chatLoading ? "Thinking" : "Ready"} helperText="Current assistant state" />
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1.35fr)]">
                    <div className="space-y-6">
                        <Surface className="p-6">
                            <SectionHeading
                                title="Upload documents"
                                description="Choose one or more PDFs and let the system process them in the background."
                            />

                            <div className="mt-5 space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-800">
                                        Choose PDFs
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        multiple
                                        onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                                        disabled={uploadLoading}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-400"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        {uploadFiles.length > 0
                                            ? `${uploadFiles.length} file${uploadFiles.length !== 1 ? "s" : ""} selected`
                                            : "Select one or more PDFs (Max 10MB each)"}
                                    </p>
                                </div>

                                {uploadFiles.length > 0 ? (
                                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                                        {uploadFiles.map((file) => (
                                            <div key={file.name} className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-slate-950">{file.name}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                                                    </div>
                                                    <Badge tone={uploadProgress[file.name] === 100 ? "success" : "neutral"}>
                                                        {uploadProgress[file.name] === 100 ? "Done" : "Queued"}
                                                    </Badge>
                                                </div>
                                                <div className="mt-3">
                                                    <ProgressBar value={uploadProgress[file.name] ?? 0} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                <Button
                                    onClick={handleUpload}
                                    disabled={uploadFiles.length === 0 || uploadLoading}
                                    className="w-full"
                                >
                                    {uploadLoading ? `Uploading... (${uploadedCount}/${uploadFiles.length})` : `Upload ${uploadFiles.length > 0 ? uploadFiles.length : ""} PDF${uploadFiles.length !== 1 ? "s" : ""}`}
                                </Button>

                                {uploadError ? (
                                    <div className={`rounded-2xl border p-4 ${uploadError.includes("Uploaded") && uploadError.includes("0/") ? "border-rose-200 bg-rose-50/70" : uploadError.includes("Uploaded") ? "border-indigo-200 bg-indigo-50/70" : "border-rose-200 bg-rose-50/70"}`}>
                                        <p className={`text-sm font-medium ${uploadError.includes("Uploaded") && uploadError.includes("0/") ? "text-rose-900" : uploadError.includes("Uploaded") ? "text-indigo-900" : "text-rose-900"}`}>
                                            {uploadError.includes("Uploaded") ? "Upload summary" : "Upload error"}
                                        </p>
                                        <p className={`mt-1 text-xs leading-6 ${uploadError.includes("Uploaded") && uploadError.includes("0/") ? "text-rose-700" : uploadError.includes("Uploaded") ? "text-indigo-700" : "text-rose-700"}`}>
                                            {uploadError}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        </Surface>

                        <Surface className="p-6">
                            <SectionHeading
                                title="Document library"
                                description="Recently indexed files and their current availability for retrieval."
                            />

                            <div className="mt-5 space-y-4">
                                {documentsLoading ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-600">
                                        Loading documents...
                                    </div>
                                ) : null}

                                {documentsError ? (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-800">
                                        {documentsError}
                                    </div>
                                ) : null}

                                {documentsWarning ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                                        {documentsWarning}
                                    </div>
                                ) : null}

                                {!documentsLoading && documents.length === 0 ? (
                                    <EmptyState
                                        title="No documents yet"
                                        description="Upload a PDF to populate the library and make the chat experience useful."
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        {documents.map((doc) => (
                                            <article key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-slate-950">{doc.fileName}</p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {doc.chunkCount} chunks • {doc.pageCount ?? "?"} pages • {new Date(doc.uploadedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <Badge tone={doc.status === "ready" ? "success" : doc.status === "processing" ? "info" : "danger"}>
                                                        {doc.status}
                                                    </Badge>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Surface>
                    </div>

                    <div className="space-y-6">
                        <Surface className="p-6">
                            <SectionHeading
                                title="Chat with indexed documents"
                                description="Ask questions based on the currently indexed library and review the retrieved sources below the answer."
                            />

                            <div className="mt-5 space-y-4">
                                {chatLoading ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-950">Thinking</p>
                                                <p className="text-sm text-slate-600">Retrieving relevant chunks and generating a response.</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {chatError ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-4">
                                        <p className="text-sm font-semibold text-rose-900">Response failed</p>
                                        <p className="mt-1 text-sm leading-6 text-rose-700">{chatError}</p>
                                    </div>
                                ) : null}

                                {reply ? (
                                    <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                                        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Response</p>
                                                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Grounded answer</h2>
                                                </div>
                                                <Badge tone="success">Retrieved context used</Badge>
                                            </div>
                                        </div>

                                        <div className="px-5 py-5 sm:px-6">
                                            <MarkdownContent content={reply} />
                                        </div>

                                        {sources.length > 0 ? (
                                            <div className="border-t border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
                                                <div className="flex items-center justify-between gap-3">
                                                    <h3 className="text-sm font-semibold tracking-tight text-slate-950">Retrieved sources</h3>
                                                    <Badge tone="info">{sources.length} matches</Badge>
                                                </div>

                                                <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
                                                    {sources.map((source, index) => (
                                                        <div key={`${source.documentId}-${source.chunkIndex}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-medium text-slate-950">{source.sourceFileName}</p>
                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                        Chunk #{source.chunkIndex} • Relevance {(source.similarity * 100).toFixed(0)}%
                                                                    </p>
                                                                </div>
                                                                <Badge tone="neutral">Source {index + 1}</Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <EmptyState
                                        title="No response yet"
                                        description="Ask a question to see the assistant response and retrieved sources in this workspace."
                                    />
                                )}
                            </div>
                        </Surface>

                        <Surface className="p-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm font-medium text-slate-800" htmlFor="dashboard-chat-message">
                                        Your question
                                    </label>
                                    <span className="text-xs text-slate-500">Shift+Enter for a new line</span>
                                </div>
                                <TextArea
                                    id="dashboard-chat-message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask a question about your documents..."
                                    disabled={chatLoading}
                                    rows={4}
                                />
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-6 text-slate-500">
                                    Use precise questions to improve retrieval quality and answer relevance.
                                </p>
                                <Button onClick={sendMessage} disabled={chatLoading || !message.trim()} className="w-full sm:w-auto sm:px-6">
                                    Send message
                                </Button>
                            </div>
                        </Surface>
                    </div>
                </div>
            </AppContainer>
        </AppShell>
    )
}
