# Implementation Phases

Detailed breakdown of each phase: what was built, why, and how.

## Phase 1: PDF Upload & Text Extraction

**Goal:** Enable users to upload PDFs and extract text.

### Components

| File | Purpose |
|------|---------|
| `app/upload/page.tsx` | Upload UI page |
| `app/components/PDFUpload.tsx` | Upload form component |
| `app/api/upload/pdf/route.ts` | Upload handler endpoint |
| `app/lib/pdf-parser.ts` | PDF → text extraction logic |
| `app/types/upload.ts` | TypeScript types |

### How It Works

1. **User uploads PDF via UI** (`app/upload/page.tsx`)
   ```tsx
   import PDFUpload from '@/app/components/PDFUpload'
   
   export default function UploadPage() {
     return <PDFUpload />
   }
   ```

2. **Upload component creates FormData** (`app/components/PDFUpload.tsx`)
   ```tsx
   const formData = new FormData()
   formData.append('file', file)
   
   const response = await fetch('/api/upload/pdf', {
     method: 'POST',
     body: formData
   })
   ```

3. **Endpoint receives file and extracts text** (`app/api/upload/pdf/route.ts`)
   ```typescript
   export async function POST(req: Request) {
     const formData = await req.formData()
     const file = formData.get('file') as File
     
     const arrayBuffer = await file.arrayBuffer()
     const { text, pageCount } = await extractTextFromPDF(arrayBuffer)
     
     return Response.json({
       fileName: file.name,
       fileSize: file.size,
       textLength: text.length,
       extractedText: text,
       pageCount
     })
   }
   ```

4. **PDF parser extracts text** (`app/lib/pdf-parser.ts`)
   ```typescript
   import * as pdfParse from 'pdf-parse'
   
   export async function extractTextFromPDF(buffer: ArrayBuffer) {
     const data = await pdfParse(buffer)
     return {
       text: data.text,
       pageCount: data.numpages
     }
   }
   ```

### Technologies Used

- **pdf-parse:** Industry standard for PDF text extraction
- **FormData API:** Browser-native file upload
- **Next.js API Routes:** Serverless function handlers

### Requirements Fulfilled

✅ Accept PDF file uploads from users  
✅ Extract text content from PDFs  
✅ Return extracted text and metadata (page count, file size)  
✅ Handle errors gracefully  
✅ Display results to user

---

## Phase 2: Document Ingestion & Storage

**Goal:** Take extracted text and prepare it for search (chunking + embedding + storage).

### Components

| File | Purpose |
|------|---------|
| `app/lib/phase3/document-store.ts` | Orchestrate chunking, embedding, storage |
| `app/api/documents/ingest/route.ts` | Ingest API endpoint |
| `db/schema.sql` | Database schema + indexes |

### How It Works

1. **Upload endpoint calls ingest API** (`app/api/upload/pdf/route.ts`)
   ```typescript
   // After extraction, call ingest
   const ingestResult = await ingestDocument({
     fileName: file.name,
     fileSize: file.size,
     extractedText: text,
     pageCount
   })
   ```

2. **Ingest orchestrator handles the pipeline** (`app/lib/phase3/document-store.ts`)
   ```typescript
   export async function ingestDocument(input: IngestInput) {
     // 1. Semantic chunking
     const chunks = chunkSemanticText(input.extractedText)
     
     // 2. Generate embeddings for each chunk
     const chunksWithEmbeddings = await Promise.all(
       chunks.map(async (chunk) => ({
         ...chunk,
         embedding: await generateEmbedding(chunk.text)
       }))
     )
     
     // 3. Store in database
     await insertDocumentWithChunks(
       input.fileName,
       chunksWithEmbeddings,
       input.fileSize
     )
   }
   ```

3. **API endpoint validates and calls orchestrator** (`app/api/documents/ingest/route.ts`)
   ```typescript
   export async function POST(req: Request) {
     const body = await req.json()
     
     // Validate inputs
     if (!body.fileName || !body.extractedText) {
       return Response.json({ error: '...' }, { status: 400 })
     }
     
     const result = await ingestDocument({
       fileName: body.fileName,
       extractedText: body.extractedText,
       fileSize: body.fileSize,
       pageCount: body.pageCount
     })
     
     return Response.json({ success: true, data: result }, { status: 201 })
   }
   ```

### Database Schema

**documents table:**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sourceFileName VARCHAR(255) NOT NULL,
  sourceType VARCHAR(50) DEFAULT 'pdf',
  fileSize INTEGER,
  pageCount INTEGER,
  totalWordCount INTEGER,
  chunkCount INTEGER,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**document_chunks table:**
```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentId UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunkIndex INTEGER NOT NULL,
  text TEXT NOT NULL,
  wordCount INTEGER,
  embedding VECTOR(384) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Index for fast search:**
```sql
CREATE INDEX idx_document_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### Requirements Fulfilled

✅ Store document metadata (name, file size, page count)  
✅ Prepare text for indexing (chunking)  
✅ Generate vector embeddings  
✅ Store embeddings in vector database  
✅ Create efficient search index  
✅ Return chunk metadata to user

---

## Phase 3: Semantic Chunking & Embedding

**Goal:** Split text intelligently and generate high-quality embeddings.

### Components

| File | Purpose |
|------|---------|
| `app/lib/phase3/chunker.ts` | Semantic text chunking |
| `app/lib/phase3/embedding.ts` | Embedding generation |
| `app/lib/phase3/db.ts` | Database operations |
| `app/lib/phase3/types.ts` | Type definitions |

### Semantic Chunking

**Problem:** How to split text without losing meaning?

**Solution:** Chunk by sentences, not fixed token count

```typescript
// app/lib/phase3/chunker.ts
export function chunkSemanticText(
  text: string,
  options: ChunkerOptions = {}
): Chunk[] {
  const targetSize = options.targetChunkSize ?? 400  // words
  const maxChunkSize = options.maxChunkSize ?? 500
  const minChunkSize = options.minChunkSize ?? 300

  // Split by sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  
  const chunks: Chunk[] = []
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const tentative = currentChunk + sentence
    const wordCount = tentative.split(/\s+/).length
    
    // If adding sentence exceeds max, start new chunk
    if (wordCount > maxChunkSize) {
      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          wordCount: currentChunk.split(/\s+/).length
        })
      }
      currentChunk = sentence
    } else {
      currentChunk = tentative
      
      // If we've reached target size, finalize
      if (wordCount >= targetSize) {
        chunks.push({
          text: currentChunk.trim(),
          wordCount: wordCount
        })
        currentChunk = ''
      }
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      wordCount: currentChunk.split(/\s+/).length
    })
  }
  
  return chunks
}
```

**Example:**
```
Input: "This is sentence one. This is sentence two. This is sentence three."

Chunks (300-500 words target):
1. "This is sentence one. This is sentence two." (7 words)
2. "This is sentence three." (4 words)

Note: In real use, sentences are much longer!
```

**Benefits:**
- Preserves semantic coherence (no split mid-concept)
- Easier for LLM to reason about
- Natural boundaries between chunks

### Embedding Generation

**Model:** Xenova/all-MiniLM-L6-v2

```typescript
// app/lib/phase3/embedding.ts
import { env } from '@xenova/transformers'

export async function generateEmbedding(text: string): Promise<number[]> {
  // Use ONNX runtime (CPU-based, no GPU required)
  env.backends.onnx.wasm.numThreads = 1

  // Load model (cached after first use)
  const model = await AutoModel.from_pretrained(
    'Xenova/all-MiniLM-L6-v2'
  )
  
  // Tokenize and embed
  const input = await tokenizer(text, {
    truncation: true,
    max_length: 384
  })
  
  const output = await model(input)
  
  // Mean pooling: average token embeddings
  const embedding = Array.from(
    output.last_hidden_state.data
  ).slice(0, 384)
  
  // L2 normalization: scale to unit length
  return normalize(embedding)
}

function normalize(embedding: number[]): number[] {
  const norm = Math.sqrt(
    embedding.reduce((sum, x) => sum + x * x, 0)
  )
  return embedding.map(x => x / norm)
}
```

**Why Xenova?**
- Runs in-process (no API calls)
- Deterministic (same input = same embedding)
- No latency overhead
- Works offline

**Why L2 normalization?**
- Enables cosine similarity: (A · B) = cos(θ)
- Works with pgvector's `<=>` operator
- Better for measuring angle between vectors

### Database Operations

```typescript
// app/lib/phase3/db.ts
import { Pool } from 'pg'

let pool: Pool

export function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL
  if (!pool || pool.options.connectionString !== databaseUrl) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5
    })
  }
  return pool
}

export function embeddingToVectorLiteral(embedding: number[]): string {
  return '[' + embedding.map(x => x.toFixed(6)).join(',') + ']'
}

export async function insertDocumentWithChunks(
  fileName: string,
  chunks: ChunkWithEmbedding[],
  fileSize: number,
  pageCount?: number
) {
  const pool = getPool()
  
  // 1. Insert document record
  const docResult = await pool.query(
    `INSERT INTO documents 
       (sourceFileName, fileSize, pageCount, chunkCount) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id`,
    [fileName, fileSize, pageCount, chunks.length]
  )
  
  const documentId = docResult.rows[0].id
  
  // 2. Insert chunks with embeddings
  for (const chunk of chunks) {
    const vectorLiteral = embeddingToVectorLiteral(chunk.embedding)
    
    await pool.query(
      `INSERT INTO document_chunks 
         (documentId, chunkIndex, text, wordCount, embedding) 
       VALUES ($1, $2, $3, $4, $5::vector)`,
      [
        documentId,
        chunk.index,
        chunk.text,
        chunk.wordCount,
        vectorLiteral  // Cast string to vector
      ]
    )
  }
  
  return { documentId, chunks: chunks.length }
}
```

**Key insight:** `::vector` cast in SQL converts bracket-delimited string to pgvector type.

### Requirements Fulfilled

✅ Split text by semantic units (sentences)  
✅ Generate deterministic embeddings (same text = same embedding)  
✅ Normalize embeddings for cosine similarity  
✅ Store embeddings in correct format  
✅ Handle connection pooling + database reconnection

---

## Phase 4: RAG Retrieval & Grounded Answers

**Goal:** Answer user questions using document content (Retrieval-Augmented Generation).

### Components

| File | Purpose |
|------|---------|
| `app/lib/phase4/retrieval.ts` | Vector similarity search |
| `app/lib/phase4/rag-chat.ts` | RAG answer generation |
| `app/api/chat/route.ts` | Chat API endpoint |
| `app/chat/page.tsx` | Chat UI |

### Retrieval Flow

**Step 1: Embed the question**

```typescript
// app/lib/phase4/retrieval.ts
const questionEmbedding = await generateEmbedding(question)
// Example: [0.123, -0.456, 0.789, ..., -0.234]  (384 values)
```

**Step 2: Search vector database**

```typescript
const vectorLiteral = embeddingToVectorLiteral(questionEmbedding)
// Example: "[0.123000,-0.456000,0.789000,...,-0.234000]"

// Query with ANN (approximate nearest neighbor) using ivfflat
const rows = await pool.query(`
  SET LOCAL ivfflat.probes = 100;
  SELECT 
    dc.id,
    dc.documentId,
    dc.chunkIndex,
    dc.text,
    dc.wordCount,
    dc.embedding <=> $1::vector AS similarity,
    d.sourceFileName
  FROM document_chunks dc
  JOIN documents d ON dc.documentId = d.id
  ORDER BY dc.embedding <=> $1::vector
  LIMIT $2;
`, [vectorLiteral, topK])
```

**Distance metric:**
- `<=>` operator: cosine distance (0 = identical, 2 = opposite)
- Sorted ascending (smallest distance first = most similar)

**Example result:**
```
id: 660e8400-...
text: "This is the first chunk..."
similarity: 0.15      -- Very low distance = high similarity
sourceFileName: "research_paper.pdf"
```

**Step 3: Handle edge case (ivfflat returning 0 rows)**

Problem: With small datasets, ANN might return 0 results if question is in a distant cluster.

Solution: Fallback to exact search:

```typescript
if (rows.rows.length === 0) {
  // Disable index scans and do full table scan
  rows = await pool.query(`
    SET LOCAL enable_indexscan = off;
    SET LOCAL enable_bitmapscan = off;
    SELECT 
      dc.id, dc.documentId, dc.chunkIndex, dc.text, 
      dc.wordCount, dc.embedding <=> $1::vector AS similarity,
      d.sourceFileName
    FROM document_chunks dc
    JOIN documents d ON dc.documentId = d.id
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $2;
  `, [vectorLiteral, topK])
}
```

### RAG Answer Generation

```typescript
// app/lib/phase4/rag-chat.ts
export async function answerWithRAG(question: string) {
  // 1. Retrieve relevant chunks
  const chunks = await retrieveRelevantChunks(question, topK = 3)
  
  if (chunks.length === 0) {
    return {
      reply: "I could not find any indexed document chunks yet.",
      usedRAG: false,
      sources: []
    }
  }
  
  // 2. Build context string
  const context = chunks
    .map((c, i) => `[Document ${i+1}] ${c.text}`)
    .join('\n\n')
  
  // 3. Call LLM with context
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Answer based on the provided context.'
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}`
      }
    ],
    max_tokens: 500,
    temperature: 0.7
  })
  
  const reply = completion.choices[0].message.content
  
  // 4. Return answer with sources
  return {
    reply,
    usedRAG: true,
    sources: chunks.map(c => ({
      id: c.id,
      documentId: c.documentId,
      fileName: c.sourceFileName,
      text: c.text.slice(0, 200) + '...'  // Preview
    }))
  }
}
```

### Chat API

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { message } = await req.json()
  
  if (!message || message.trim().length === 0) {
    return Response.json({ error: 'Message required' }, { status: 400 })
  }
  
  const ragResult = await answerWithRAG(message)
  
  return Response.json({
    reply: ragResult.reply,
    usedRAG: ragResult.usedRAG,
    sources: ragResult.sources
  })
}
```

### Chat UI

```tsx
// app/chat/page.tsx
'use client'

import { useState } from 'react'

export default function ChatPage() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  
  async function handleChat() {
    setLoading(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    const data = await res.json()
    setResponse(data)
    setLoading(false)
  }
  
  return (
    <div>
      <input 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a question..."
      />
      <button onClick={handleChat} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask'}
      </button>
      
      {response && (
        <div>
          <p><strong>Answer:</strong> {response.reply}</p>
          {response.usedRAG && response.sources.length > 0 && (
            <div>
              <strong>Sources:</strong>
              {response.sources.map(s => (
                <div key={s.id}>
                  <p>{s.fileName} - Chunk {s.index}</p>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### Requirements Fulfilled

✅ Retrieve document chunks most relevant to question  
✅ Handle edge cases (no documents, ANN returning 0)  
✅ Generate grounded answers using retrieved context  
✅ Provide source attribution  
✅ Maintain response latency < 5s  

---

## Summary Table

| Phase | Goal | Key Files | Requirements |
|-------|------|-----------|--------------|
| 1 | Extract text from PDF | `pdf-parser.ts`, `upload/` | ✅ PDF → text |
| 2 | Store documents | `document-store.ts`, `schema.sql` | ✅ Documents in DB |
| 3 | Chunk & embed | `chunker.ts`, `embedding.ts` | ✅ Chunks + vectors |
| 4 | RAG answers | `retrieval.ts`, `rag-chat.ts` | ✅ Grounded Q&A |

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – System overview
- [DATABASE.md](DATABASE.md) – Database schema
- [DEVELOPMENT.md](DEVELOPMENT.md) – Code patterns
- [API.md](API.md) – Endpoint reference
