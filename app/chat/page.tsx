"use client"

import { useState } from "react"

export default function ChatPage() {
    const [message, setMessage] = useState("")
    const [reply, setReply] = useState("")
    const [loading, setLoading] = useState(false)

    async function sendMessage() {
        setLoading(true)

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

        setReply(data.reply)

        setLoading(false)
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

            {reply && (
                <div className="mt-6 border p-4">
                    {reply}
                </div>
            )}
        </div>
    )
}