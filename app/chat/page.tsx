"use client"

import { useState } from "react"

interface ChatSource {
    documentId: string
    sourceFileName: string
    chunkIndex: number
    similarity: number
}

export default function ChatPage() {
    const [message, setMessage] = useState("")
    const [reply, setReply] = useState("")
    const [sources, setSources] = useState<ChatSource[]>([])
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function sendMessage() {
        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to get response")
            }

            setReply(data.reply)
            setSources(data.sources || [])
        } catch (requestError: unknown) {
            const message = requestError instanceof Error ? requestError.message : "Unknown error"
            setError(message)
            setReply("")
            setSources([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-10">
            <h1 className="text-3xl font-bold mb-4">
                UniCollab AI
            </h1>

            <input
                className="border p-2 w-full"
                value={message}
                onChange={(e) =>
                    setMessage(e.target.value)
                }
                placeholder="Ask something..."
            />

            <button
                onClick={sendMessage}
                className="bg-black text-white px-4 py-2 mt-4"
            >
                Ask AI
            </button>

            {loading && <p>Loading...</p>}

            {error && (
                <div className="mt-4 border border-red-300 bg-red-50 p-4 text-red-700">
                    {error}
                </div>
            )}

            {reply && (
                <div className="mt-6 space-y-4">
                    <div className="border p-4">
                        {reply}
                    </div>

                    {sources.length > 0 && (
                        <div className="border p-4 bg-gray-50">
                            <h2 className="text-lg font-semibold mb-3">Retrieved Sources</h2>
                            <div className="space-y-2">
                                {sources.map((source, index) => (
                                    <div key={`${source.documentId}-${source.chunkIndex}-${index}`} className="p-3 bg-white border rounded">
                                        <p className="text-sm font-medium text-gray-800">{source.sourceFileName}</p>
                                        <p className="text-xs text-gray-600">Chunk #{source.chunkIndex} | Similarity: {source.similarity}</p>
                                        <p className="text-xs text-gray-500 break-all">Doc ID: {source.documentId}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}