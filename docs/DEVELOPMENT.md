# Developer Guide

How to extend and maintain the Unicollab system.

## Project Layout

```
unicollab-reccomendation-ai/
├── app/
│   ├── api/                      # API Routes
│   │   ├── upload/pdf/           # PDF upload + extraction
│   │   ├── documents/ingest/     # Text ingestion (chunking + embedding)
│   │   └── chat/                 # RAG chat endpoint
│   ├── chat/                     # Chat UI page
│   ├── upload/                   # Upload UI page
│   ├── components/               # React components
│   ├── lib/                      # Core business logic
│   │   ├── pdf-parser.ts         # PDF extraction
│   │   ├── phase3/               # Chunking + embedding + DB
│   │   │   ├── chunker.ts
│   │   │   ├── embedding.ts
│   │   │   ├── db.ts
│   │   │   ├── document-store.ts
│   │   │   └── types.ts
│   │   └── phase4/               # Retrieval + RAG
│   │       ├── retrieval.ts
│   │       └── rag-chat.ts
│   ├── types/                    # TypeScript types
│   └── globals.css               # Global styles
├── db/
│   └── schema.sql                # Database initialization
├── scripts/
│   ├── integration/              # Integration tests
│   │   ├── test-chat-rag.js
│   │   └── README.md
│   └── migrations/               # (Future) Database migrations
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── PHASES.md
│   ├── DEVELOPMENT.md            # This file
│   └── DEPLOYMENT.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
└── README.md
```

## Key Concepts

### 1. Embedding Model (Xenova)

All embeddings are generated using **Xenova/all-MiniLM-L6-v2**:
- Dimensionality: 384
- Runs in-process (CPU, no API)
- L2-normalized output

**Important:** If you change the embedding model, you must:
1. Delete all existing vectors (they'll be incompatible)
2. Re-ingest all documents
3. Update the dimension in `schema.sql`: `VECTOR(new_dim)`

```typescript
// Change model in app/lib/phase3/embedding.ts
const model = await AutoModel.from_pretrained(
  'Xenova/all-MiniLM-L6-v2'  // Change this
)
```

### 2. Chunk Size (300–500 words)

Semantic chunks target 300–500 words. This is configurable in `app/lib/phase3/chunker.ts`:

```typescript
const targetSize = options.targetChunkSize ?? 400
const maxChunkSize = options.maxChunkSize ?? 500
const minChunkSize = options.minChunkSize ?? 300
```

**Why 300–500?**
- Large enough to contain meaningful context
- Small enough to fit in LLM context window
- Matches typical paragraph size in documents

### 3. Vector Database (pgvector)

All vectors use **PostgreSQL + pgvector**:
- Index type: ivfflat (Inverted File Flat)
- Similarity: cosine distance (`<=>` operator)
- Retrieval: Top-K nearest neighbors

**Key settings:**
```sql
-- In db/schema.sql
CREATE INDEX idx_document_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- At query time
SET LOCAL ivfflat.probes = 100;
```

### 4. LLM Integration (Groq)

- **Model:** llama-3.3-70b-versatile
- **Provider:** Groq API (OpenAI-compatible client)
- **Context:** Retrieved chunks + user question

```typescript
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const completion = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: 'Answer based on context...' },
    { role: 'user', content: `Context: ...\n\nQuestion: ...` }
  ]
})
```

## Common Development Tasks

### Add a New API Endpoint

Create a new file in `app/api/your-endpoint/route.ts`:

```typescript
// app/api/your-endpoint/route.ts
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validate input
    if (!body.requiredField) {
      return Response.json(
        { error: 'Missing requiredField' },
        { status: 400 }
      )
    }
    
    // Process
    const result = await yourLogic(body)
    
    // Return response
    return Response.json({ success: true, data: result })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

### Add a New UI Page

Create a new file in `app/your-page/page.tsx`:

```tsx
'use client'

import { useState } from 'react'

export default function YourPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  
  async function handleAction() {
    setLoading(true)
    const res = await fetch('/api/your-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* input */ })
    })
    const result = await res.json()
    setData(result)
    setLoading(false)
  }
  
  return (
    <div>
      <button onClick={handleAction} disabled={loading}>
        {loading ? 'Loading...' : 'Action'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  )
}
```

### Query the Database

Use the existing pool helper in `app/lib/phase3/db.ts`:

```typescript
import { getPool } from '@/app/lib/phase3/db'

const pool = getPool()

// Query
const result = await pool.query(
  `SELECT * FROM documents WHERE id = $1`,
  [documentId]
)

const documents = result.rows
```

### Generate an Embedding

```typescript
import { generateEmbedding } from '@/app/lib/phase3/embedding'

const embedding = await generateEmbedding('Your text here')
// Returns: number[] (length 384)
```

### Search by Vector Similarity

```typescript
import { retrieveRelevantChunks } from '@/app/lib/phase4/retrieval'

const chunks = await retrieveRelevantChunks('Search question', topK = 5)
// Returns: Chunk[] with similarity scores
```

### Test an API

Use the integration test as a template:

```bash
# Run existing test
npm run integration:test

# Create new test
# Copy scripts/integration/test-chat-rag.js
# Modify to test your endpoint
```

## Code Patterns

### Error Handling

**In API routes:**
```typescript
try {
  // Do work
} catch (error: unknown) {
  console.error(error)
  return Response.json(
    {
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error'
    },
    { status: 500 }
  )
}
```

**In React components:**
```tsx
const [error, setError] = useState<string | null>(null)

try {
  const res = await fetch(...)
  if (!res.ok) {
    setError(`Error: ${res.status}`)
    return
  }
  const data = await res.json()
} catch (err) {
  setError(err instanceof Error ? err.message : 'Unknown error')
}
```

### Type Safety

**Create types in dedicated files:**
```typescript
// app/lib/phase3/types.ts
export interface Chunk {
  text: string
  wordCount: number
}

export interface ChunkWithEmbedding extends Chunk {
  embedding: number[]
}
```

**Use in code:**
```typescript
import { ChunkWithEmbedding } from '@/app/lib/phase3/types'

async function processChunk(chunk: ChunkWithEmbedding) {
  // TypeScript knows chunk.embedding is number[]
}
```

### Async Operations

**Don't block on slow operations:**
```typescript
// ❌ Bad: Blocks response
async function POST(req: Request) {
  await ingestDocument(body)  // Takes 3-5 seconds
  return Response.json({ success: true })
}

// ✅ Good: Return quickly, process in background
async function POST(req: Request) {
  ingestDocument(body).catch(err => console.error(err))  // Fire and forget
  return Response.json({ success: true, processing: true })
}
```

## Testing

### Integration Tests

Run the end-to-end test:

```bash
npm run integration:test
```

This test:
1. POSTs sample document to `/api/documents/ingest`
2. Verifies chunks were created
3. POSTs question to `/api/chat`
4. Verifies RAG used and sources returned

### Add a New Test

```javascript
// scripts/integration/my-test.js
async function testMyFeature() {
  console.log('Testing my feature...')
  
  const response = await fetch('http://localhost:3000/api/my-endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* input */ })
  })
  
  const data = await response.json()
  
  if (!data.success) {
    console.error('Test failed:', data)
    process.exitCode = 1
    return
  }
  
  console.log('Test passed!')
}

testMyFeature()
```

### Manual Testing with curl

```bash
# Test chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the main topic?"}'

# Test ingest
curl -X POST http://localhost:3000/api/documents/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.pdf",
    "extractedText": "Document text...",
    "fileSize": 1000,
    "pageCount": 1
  }'
```

## Performance Optimization

### 1. Caching Embeddings

Currently, embeddings are computed on-demand. To cache:

```typescript
// Create cache
const embeddingCache = new Map<string, number[]>()

export async function generateEmbedding(text: string) {
  const hash = crypto.createHash('sha256').update(text).digest('hex')
  
  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash)!
  }
  
  const embedding = await generateEmbeddingUncached(text)
  embeddingCache.set(hash, embedding)
  return embedding
}
```

### 2. Batch Processing

For ingesting large documents, process chunks in parallel:

```typescript
async function ingestDocument(input: IngestInput) {
  const chunks = chunkSemanticText(input.extractedText)
  
  // Process embeddings in batches of 10
  const BATCH_SIZE = 10
  const withEmbeddings = []
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const embeds = await Promise.all(
      batch.map(c => generateEmbedding(c.text))
    )
    withEmbeddings.push(
      ...batch.map((c, j) => ({ ...c, embedding: embeds[j] }))
    )
  }
  
  return insertDocumentWithChunks(...)
}
```

### 3. Connection Pooling

Already enabled in `app/lib/phase3/db.ts`:

```typescript
const pool = new Pool({
  max: 5,  // Max 5 simultaneous connections
  // ...
})
```

Increase if needed, but monitor memory.

## Debugging

### Enable Verbose Logging

Add console logs in retrieval:

```typescript
// app/lib/phase4/retrieval.ts
export async function retrieveRelevantChunks(...) {
  console.log('Embedding question...')
  const questionEmbedding = await generateEmbedding(question)
  console.log('Embedding dimension:', questionEmbedding.length)
  
  console.log('Searching database...')
  const rows = await pool.query(...)
  console.log('Found', rows.rows.length, 'chunks')
  
  return rows.rows
}
```

### Check Database State

```bash
# Count documents
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT COUNT(*) FROM documents;"

# List all documents
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT id, sourceFileName, chunkCount FROM documents;"

# Check embeddings
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT vector_dims(embedding) FROM document_chunks LIMIT 1;"
```

## Future Enhancements

### Phase 5: Recommendation System

Store chat history and use it to recommend documents:

```typescript
// app/lib/phase5/recommendations.ts
interface ChatHistory {
  userId: string
  documentId: string
  question: string
  response: string
  timestamp: Date
}

export function recommendDocuments(userId: string): Promise<Document[]> {
  // Analyze chat history
  // Find frequently accessed documents
  // Recommend similar documents
}
```

### Add Chat History

Store conversations in database:

```typescript
// Add to schema.sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  userId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  sessionId UUID REFERENCES chat_sessions(id),
  role VARCHAR(50),  -- 'user' or 'assistant'
  content TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Multi-tenancy

Support multiple users:

```typescript
// Add to schema.sql
ALTER TABLE documents ADD COLUMN userId VARCHAR(255);
ALTER TABLE chat_sessions ADD CONSTRAINT fk_user FOREIGN KEY (userId);

// In API routes
const userId = req.headers.get('x-user-id')
if (!userId) return Response.json({ error: 'Not authenticated' }, { status: 401 })
```

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – System overview
- [SETUP.md](SETUP.md) – Local setup
- [API.md](API.md) – Endpoints
- [PHASES.md](PHASES.md) – Implementation details
- [DEPLOYMENT.md](DEPLOYMENT.md) – Production setup
