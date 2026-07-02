"use client"

import { useState, type ReactElement } from "react"

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <h1 className="text-2xl font-bold text-slate-900">AI Document Intelligence & RAG Chat System</h1>
                    <p className="text-sm text-slate-600 mt-1">Ask questions about your uploaded documents</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Chat Messages */}
                <div className="space-y-6 mb-8">
                    {reply && (
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
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
                                    <div className="space-y-3">
                                        {sources.map((source, index) => (
                                            <div
                                                key={`${source.documentId}-${source.chunkIndex}-${index}`}
                                                className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <p className="font-medium text-slate-900">{source.sourceFileName}</p>
                                                        <p className="text-xs text-slate-600 mt-1">
                                                            Chunk #{source.chunkIndex} • Relevance:{" "}
                                                            <span className="font-semibold">
                                                                {(source.similarity * 100).toFixed(0)}%
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-1 rounded">
                                                            Source {index + 1}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                            <p className="text-red-900 font-semibold mb-1">Error</p>
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {loading && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
                                <p className="text-blue-900 font-medium">Thinking...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 sticky bottom-0">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Your Question
                    </label>
                    <div className="flex gap-3">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask a question about your documents... (Shift+Enter for new line)"
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !message.trim()}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition h-fit"
                        >
                            Send
                        </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">💡 Tip: Ask specific questions about your uploaded documents for the best results.</p>
                </div>
            </main>
        </div>
    )
}