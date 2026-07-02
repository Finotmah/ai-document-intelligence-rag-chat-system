"use client"

import PDFUpload from "@/app/components/PDFUpload"
import { AppContainer, AppShell, Badge, ButtonLink, PageHeader, Surface } from "@/app/components/ui"

export default function UploadPage() {
    return (
        <AppShell>
            <AppContainer className="py-6 sm:py-8 lg:py-10">
                <PageHeader
                    eyebrow="Upload"
                    title="Index documents for semantic search"
                    description="Upload a PDF to extract text, generate embeddings, and make it available for grounded chat responses."
                    actions={
                        <div className="flex flex-wrap gap-3">
                            <ButtonLink href="/dashboard" variant="secondary">
                                Open Dashboard
                            </ButtonLink>
                            <ButtonLink href="/chat" variant="ghost">
                                Go to Chat
                            </ButtonLink>
                        </div>
                    }
                />

                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <Surface className="p-6 sm:p-7">
                        <Badge tone="info">Phase 2 + Phase 3</Badge>
                        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                            A single upload triggers the full indexing pipeline.
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                            The upload flow extracts text, chunks the content semantically, generates embeddings, and stores the document in PostgreSQL with pgvector for retrieval.
                        </p>

                        <div className="mt-6 space-y-3">
                            {[
                                "Upload any PDF document (max 10MB)",
                                "Automatic extraction from all pages",
                                "Semantic chunking into 300-500 word segments",
                                "Embedding generation using all-MiniLM-L6-v2",
                                "Persistent storage in PostgreSQL with pgvector",
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                        ✓
                                    </span>
                                    <span className="leading-6">{item}</span>
                                </div>
                            ))}
                        </div>
                    </Surface>

                    <Surface className="p-4 sm:p-6">
                        <PDFUpload />
                    </Surface>
                </div>
            </AppContainer>
        </AppShell>
    )
}
