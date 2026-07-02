"use client"

import { useState, useRef } from "react"
import { UploadResponse } from "@/app/types/upload"
import {
    Badge,
    Button,
    EmptyState,
    FieldLabel,
    ProgressBar,
    SectionHeading,
    Surface,
} from "@/app/components/ui"

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
        <div className="space-y-6">
            <SectionHeading
                title="Upload a PDF"
                description="Files are extracted, chunked, embedded, and stored automatically for downstream retrieval."
            />

            <Surface className={dragActive ? "border-indigo-300 ring-4 ring-indigo-500/10" : undefined}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={loading}
                    className="hidden"
                />

                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`rounded-[1.5rem] border-2 border-dashed px-6 py-10 text-center transition sm:px-8 ${dragActive
                            ? "border-indigo-300 bg-indigo-50/60"
                            : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
                        } ${loading ? "opacity-70" : "cursor-pointer"}`}
                >
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="flex w-full flex-col items-center justify-center gap-4"
                    >
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                            <svg className="h-7 w-7" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path
                                    d="M28 8H12a4 4 0 00-4 4v24a4 4 0 004 4h24a4 4 0 004-4V20m-14-8v16m0 0l-4-4m4 4l4-4"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </span>

                        <div className="space-y-2">
                            <p className="text-lg font-semibold tracking-tight text-slate-950">
                                {loading ? "Processing PDF..." : "Drag and drop your PDF here"}
                            </p>
                            <p className="text-sm leading-6 text-slate-600">
                                or click to browse. The file will be indexed automatically for RAG.
                            </p>
                        </div>

                        <Badge tone="neutral">Max 10MB</Badge>
                    </button>
                </div>
            </Surface>

            {error ? (
                <Surface className="border-rose-200 bg-rose-50/70 p-5">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                            !
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-rose-900">Upload failed</p>
                            <p className="mt-1 text-sm leading-6 text-rose-700">{error}</p>
                        </div>
                    </div>
                </Surface>
            ) : null}

            {uploadedFile && uploadedFile.data ? (
                <div className="space-y-6">
                    <Surface className="border-emerald-200 bg-emerald-50/60 p-5">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                ✓
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-emerald-900">Upload successful</p>
                                <p className="mt-1 text-sm leading-6 text-emerald-700">
                                    PDF processed successfully and is ready for question answering.
                                </p>
                            </div>
                        </div>
                    </Surface>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">File name</p>
                            <p className="mt-2 break-words text-sm font-medium text-slate-950">{uploadedFile.data.fileName}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">File size</p>
                            <p className="mt-2 text-sm font-medium text-slate-950">
                                {(uploadedFile.data.fileSize / 1024).toFixed(2)} KB
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">Pages</p>
                            <p className="mt-2 text-sm font-medium text-slate-950">{uploadedFile.data.pageCount}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">Uploaded at</p>
                            <p className="mt-2 text-sm font-medium text-slate-950">
                                {new Date(uploadedFile.data.uploadedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <Surface className="p-5">
                        <FieldLabel hint="Preview">Extracted text preview</FieldLabel>
                        <div className="mt-3 max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                {uploadedFile.data.extractedText.substring(0, 500)}
                                {uploadedFile.data.extractedText.length > 500 && "..."}
                            </p>
                        </div>
                    </Surface>

                    {uploadedFile.data.ingest ? (
                        <Surface className="border-indigo-200 bg-indigo-50/60 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-indigo-900">Indexing complete</p>
                                    <p className="mt-1 text-sm leading-6 text-indigo-700">
                                        The document has been embedded and stored in PostgreSQL with pgvector for retrieval.
                                    </p>
                                </div>
                                <Badge tone="info">RAG-ready</Badge>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-indigo-200 bg-white/80 px-4 py-4">
                                    <p className="text-xs font-medium uppercase tracking-[0.28em] text-indigo-500">Document ID</p>
                                    <p className="mt-2 break-all text-xs leading-6 text-slate-700">{uploadedFile.data.ingest.documentId}</p>
                                </div>
                                <div className="rounded-2xl border border-indigo-200 bg-white/80 px-4 py-4">
                                    <p className="text-xs font-medium uppercase tracking-[0.28em] text-indigo-500">Chunks</p>
                                    <p className="mt-2 text-sm font-medium text-slate-950">
                                        {uploadedFile.data.ingest.chunkCount} semantic chunks
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-indigo-200 bg-white/80 px-4 py-4">
                                    <p className="text-xs font-medium uppercase tracking-[0.28em] text-indigo-500">Embedding model</p>
                                    <p className="mt-2 break-words text-xs leading-6 text-slate-700">{uploadedFile.data.ingest.embeddingModel}</p>
                                </div>
                            </div>
                        </Surface>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button onClick={resetUpload} className="w-full sm:w-auto sm:flex-1">
                            Upload another PDF
                        </Button>
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto sm:flex-1">
                            Choose another file
                        </Button>
                    </div>
                </div>
            ) : (
                <EmptyState
                    title="No upload yet"
                    description="Choose a PDF to see extraction, chunking, and indexing details here."
                />
            )}
        </div>
    )
}
