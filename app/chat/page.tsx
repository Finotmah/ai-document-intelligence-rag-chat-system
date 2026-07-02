"use client"

import { useState, type ReactElement } from "react"
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
    TextArea,
} from "@/app/components/ui"

interface ChatSource {
    documentId: string
    sourceFileName: string
    chunkIndex: number
    similarity: number
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
                                className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto mb-4 text-sm"
                            >
                                <code>{code}</code>
                            </pre>
                        )
                    })
                }
                break
            } else if (line.startsWith("##")) {
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
                    <h2 key={parts.length} className="text-xl font-bold text-slate-900 mt-4 mb-3">
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
                    <h3 key={parts.length} className="text-lg font-semibold text-slate-800 mt-3 mb-2">
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
                    <li key={parts.length} className="text-slate-700 ml-4 mb-1">
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

    return (
        <div className="prose prose-sm max-w-none text-slate-900">
            {renderContent()}
        </div>
    )
}

export default function ChatPage() {
    const [message, setMessage] = useState("")
    const [reply, setReply] = useState("")
    const [sources, setSources] = useState<ChatSource[]>([])
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

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

    async function sendMessage() {
        setLoading(true)
        setError("")

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
        } catch (requestError: unknown) {
            const errorMessage = requestError instanceof Error ? requestError.message : "Unknown error"
            setError(errorMessage)
            setReply("")
            setSources([])
        } finally {
            setLoading(false)
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
                    eyebrow="Chat"
                    title="Ask questions across your indexed documents"
                    description="Responses are grounded in your uploaded PDFs and include retrieved source references for transparency."
                    actions={
                        <div className="flex flex-wrap gap-3">
                            <ButtonLink href="/upload" variant="secondary">
                                Upload more PDFs
                            </ButtonLink>
                            <ButtonLink href="/dashboard" variant="ghost">
                                Open Dashboard
                            </ButtonLink>
                        </div>
                    }
                />

                <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
                    <div className="space-y-6">
                        <Surface className="p-6">
                            <SectionHeading
                                title="How to use chat"
                                description="Upload a document first, then ask targeted questions to retrieve grounded answers."
                            />

                            <div className="mt-5 space-y-3">
                                {[
                                    "Ask concise, document-specific questions",
                                    "Use follow-ups to refine the answer",
                                    "Review the source cards to verify the response",
                                ].map((item) => (
                                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[10px] font-semibold text-white">
                                            ✓
                                        </span>
                                        <span className="leading-6">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </Surface>

                        <Surface className="p-6">
                            <SectionHeading title="Need a quick start?" description="Try a question that references the document structure, summary, or a section name." />
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Badge tone="neutral">Summarize the document</Badge>
                                <Badge tone="neutral">List the main sections</Badge>
                                <Badge tone="neutral">What are the key findings?</Badge>
                            </div>
                        </Surface>
                    </div>

                    <div className="space-y-6">
                        {loading ? (
                            <Surface className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-950">Thinking</p>
                                        <p className="text-sm text-slate-600">Retrieving relevant chunks and generating a grounded response.</p>
                                    </div>
                                </div>
                            </Surface>
                        ) : null}

                        {error ? (
                            <Surface className="border-rose-200 bg-rose-50/70 p-5">
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                                        !
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-rose-900">Response failed</p>
                                        <p className="mt-1 text-sm leading-6 text-rose-700">{error}</p>
                                    </div>
                                </div>
                            </Surface>
                        ) : null}

                        {reply ? (
                            <Surface className="overflow-hidden">
                                <div className="border-b border-slate-200 px-6 py-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Response</p>
                                            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">Grounded answer</h2>
                                        </div>
                                        <Badge tone="success">Retrieved context used</Badge>
                                    </div>
                                </div>

                                <div className="px-6 py-6">
                                    <MarkdownContent content={reply} />
                                </div>

                                {sources.length > 0 ? (
                                    <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-semibold tracking-tight text-slate-950">
                                                Retrieved sources
                                            </h3>
                                            <Badge tone="info">{sources.length} matches</Badge>
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            {sources.map((source, index) => (
                                                <div
                                                    key={`${source.documentId}-${source.chunkIndex}-${index}`}
                                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-slate-950">
                                                                {source.sourceFileName}
                                                            </p>
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
                            </Surface>
                        ) : (
                            <Surface className="p-6">
                                <EmptyState
                                    title="No response yet"
                                    description="Ask a question to see a grounded answer and supporting source chunks here."
                                />
                            </Surface>
                        )}

                        <Surface className="p-5 sm:p-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm font-medium text-slate-800" htmlFor="chat-message">
                                        Your question
                                    </label>
                                    <span className="text-xs text-slate-500">Shift+Enter for a new line</span>
                                </div>
                                <TextArea
                                    id="chat-message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask a question about your documents..."
                                    disabled={loading}
                                    rows={4}
                                />
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-6 text-slate-500">
                                    Ask a precise question to improve retrieval quality and response relevance.
                                </p>
                                <Button onClick={sendMessage} disabled={loading || !message.trim()} className="w-full sm:w-auto sm:px-6">
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