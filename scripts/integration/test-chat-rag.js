// Integration test: ingest sample text, then call /api/chat and assert RAG used
const BASE = process.env.BASE_URL || "http://localhost:3000"

async function postJSON(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, json }
}

function makeLargeText(rep = 40) {
  const paragraph =
    "This is an integration-test document. It contains multiple facts about a fictional project used to verify ingestion and retrieval. The quick brown fox jumps over the lazy dog. "
  return Array.from({ length: rep }).map(() => paragraph).join("\n\n")
}

async function main() {
  console.log("Integration test: ingest -> chat (RAG)")

  const ingestPayload = {
    fileName: "integration-sample.pdf",
    extractedText: makeLargeText(50),
    fileSize: 12345,
    pageCount: 3,
    sourceType: "pdf",
  }

  console.log("Posting ingest...")
  const ingest = await postJSON("/api/documents/ingest", ingestPayload)
  console.log("Ingest response status:", ingest.status)
  if (!ingest.ok || !ingest.json || !ingest.json.success) {
    console.error("Ingest failed:", ingest.json)
    process.exitCode = 2
    return
  }

  const chunkCount = ingest.json.data?.chunkCount ?? 0
  console.log("Ingested chunkCount:", chunkCount)
  if (!chunkCount || chunkCount <= 0) {
    console.error("No chunks were created by ingest")
    process.exitCode = 3
    return
  }

  // brief wait for any async indexing
  await new Promise((r) => setTimeout(r, 1500))

  console.log("Posting chat request...")
  const chat = await postJSON("/api/chat", { message: "Summarize the uploaded document in 3 key points" })
  console.log("Chat response status:", chat.status)
  if (!chat.ok || !chat.json) {
    console.error("Chat request failed:", chat.json)
    process.exitCode = 4
    return
  }

  const { reply, usedRAG, sources } = chat.json

  if (!usedRAG) {
    console.error("RAG was not used by the chat response", chat.json)
    process.exitCode = 5
    return
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    console.error("No sources returned by RAG", chat.json)
    process.exitCode = 6
    return
  }

  console.log("RAG used and returned sources:", sources.length)
  console.log("Reply preview:\n", typeof reply === "string" ? reply.slice(0, 400) : reply)
  console.log("Integration test passed")
  process.exitCode = 0
  return
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 10
})
