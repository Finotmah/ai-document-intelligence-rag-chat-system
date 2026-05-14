# API Documentation

Complete reference for all HTTP endpoints in Unicollab.

## Base URL

```
http://localhost:3000
```

## Endpoints

### 1. Upload PDF

**Upload a PDF file and extract text.**

```
POST /api/upload/pdf
```

#### Request

**Headers:**
```
Content-Type: multipart/form-data
```

**Body:**
- `file` (File, required) – PDF file (binary)

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "fileName": "document.pdf",
    "fileSize": 45678,
    "pageCount": 5,
    "extractedText": "Lorem ipsum dolor sit amet...",
    "textLength": 2341,
    "ingest": {
      "documentId": "uuid-here",
      "fileName": "document.pdf",
      "pageCount": 5,
      "chunkCount": 8,
      "embeddingModel": "Xenova/all-MiniLM-L6-v2",
      "chunks": [
        {
          "id": "chunk-id",
          "index": 0,
          "wordCount": 487
        }
        // ... more chunks
      ]
    }
  }
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE",
    "message": "File is not a valid PDF"
  }
}
```

#### Notes
- Automatically calls `/api/documents/ingest` after extraction
- Returns both extracted text and ingestion metadata
- File size limit: Check Next.js server config (default 50MB)

---

### 2. Ingest Document

**Ingest extracted text directly (used internally by upload endpoint).**

```
POST /api/documents/ingest
```

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "fileName": "document.pdf",
  "extractedText": "Full text of the document...",
  "fileSize": 45678,
  "pageCount": 5,
  "sourceType": "pdf"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileName` | string | Yes | Original file name |
| `extractedText` | string | Yes | Extracted text content (min 100 chars) |
| `fileSize` | number | Yes | File size in bytes |
| `pageCount` | number | No | Number of pages (optional) |
| `sourceType` | string | No | Source type (default: "pdf") |

#### Response

**Success (201):**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid-here",
    "fileName": "document.pdf",
    "pageCount": 5,
    "chunkCount": 8,
    "embeddingModel": "Xenova/all-MiniLM-L6-v2",
    "chunks": [
      {
        "id": "chunk-uuid",
        "index": 0,
        "wordCount": 487
      }
      // ... more chunks
    ]
  }
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "fileName is required"
  }
}
```

#### Notes
- Creates a `documents` record
- Semantically chunks the text (300–500 words per chunk)
- Generates embeddings for each chunk (384-dimensional)
- Stores chunks in `document_chunks` table with embeddings
- Automatically creates vector index

---

### 3. Chat with RAG

**Ask a question and get a grounded answer based on uploaded documents.**

```
POST /api/chat
```

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "message": "Summarize the key points from the uploaded document"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User's question (min 5 chars) |

#### Response

**Success (200):**
```json
{
  "reply": "Based on the uploaded document, here are the key points: ...",
  "usedRAG": true,
  "sources": [
    {
      "id": "chunk-uuid",
      "documentId": "doc-uuid",
      "fileName": "document.pdf",
      "chunkIndex": 0,
      "text": "Text excerpt from chunk...",
      "wordCount": 487,
      "similarity": 0.87
    },
    {
      "id": "chunk-uuid-2",
      "documentId": "doc-uuid",
      "fileName": "document.pdf",
      "chunkIndex": 2,
      "text": "Another relevant excerpt...",
      "wordCount": 423,
      "similarity": 0.82
    }
  ]
}
```

**No Documents Found (200):**
```json
{
  "reply": "I could not find any indexed document chunks yet.",
  "usedRAG": false,
  "sources": []
}
```

**Error (400/500):**
```json
{
  "error": "Message is required"
}
```

#### Notes
- Embeds the question using the same model as document chunks (Xenova)
- Searches vector database using cosine similarity
- Retrieves top-3 most relevant chunks by default
- Sends retrieved context + question to Groq LLM
- Returns grounded answer with source attribution
- If no documents exist, returns default message with `usedRAG: false`

---

## Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| `INVALID_FILE` | File is not a valid PDF | 400 |
| `INVALID_INPUT` | Missing/invalid required fields | 400 |
| `INGEST_ERROR` | Error during ingestion (chunking/embedding/storage) | 500 |
| `DATABASE_ERROR` | Error querying database | 500 |
| `LLM_ERROR` | Error calling LLM API | 500 |

## Rate Limiting

Not implemented yet. Future enhancement:
- 10 requests/minute per IP (upload)
- 30 requests/minute per IP (chat)

## Authentication

Not implemented yet. All endpoints are public.

Future: Add JWT-based authentication for multi-tenant setup.

## Example Usage

### Upload & Chat Flow

```bash
# 1. Upload a PDF
curl -X POST http://localhost:3000/api/upload/pdf \
  -F "file=@document.pdf"

# 2. Ask a question (once upload completes)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main topics discussed?"
  }'
```

### Using JavaScript

```javascript
// Upload
const formData = new FormData();
formData.append('file', pdfFile);

const uploadRes = await fetch('/api/upload/pdf', {
  method: 'POST',
  body: formData
});

const uploadData = await uploadRes.json();
console.log(`Uploaded ${uploadData.data.chunkCount} chunks`);

// Chat
const chatRes = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Summarize the document in 3 points'
  })
});

const chatData = await chatRes.json();
console.log(chatData.reply);
console.log(`Retrieved ${chatData.sources.length} sources`);
```

### Using PowerShell

```powershell
# Chat request
$body = @{ message = 'Summarize the document' } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:3000/api/chat' `
  -ContentType 'application/json' `
  -Body $body
```

## Response Times

Typical latencies (on local machine with Postgres + Groq API):

| Endpoint | Latency | Notes |
|----------|---------|-------|
| POST /api/upload/pdf | 2–5s | PDF extraction + ingestion |
| POST /api/documents/ingest | 1–3s | Chunking + embedding |
| POST /api/chat | 2–5s | Retrieval (~100ms) + LLM (~2–3s) |

## Debugging

### Check if documents are ingested

```bash
# Count chunks in database
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT count(*) FROM document_chunks;"
```

### Test vector search directly

```bash
# Retrieve chunks by similarity
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT id, fileName, similarity FROM document_chunks LIMIT 5;"
```

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – System overview
- [DATABASE.md](DATABASE.md) – Database schema
- [DEVELOPMENT.md](DEVELOPMENT.md) – Developer guide
