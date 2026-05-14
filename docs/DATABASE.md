# Database Design & pgvector Configuration

Detailed documentation of the database schema, vector storage, and optimization.

## Overview

Unicollab uses a single PostgreSQL 16 database with the pgvector extension for vector storage and similarity search.

**Key Features:**
- Structured data (documents metadata) + vectors (embeddings) in one database
- ivfflat index for fast approximate nearest neighbor search
- Fallback exact search for reliability
- Vector dimension: 384 (from Xenova embeddings)
- Similarity metric: cosine distance

## Schema

### Tables

#### `documents`

Stores document metadata and aggregates.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sourceFileName VARCHAR(255) NOT NULL,
  sourceType VARCHAR(50) DEFAULT 'pdf',
  fileSize INTEGER,
  pageCount INTEGER,
  totalWordCount INTEGER,
  chunkCount INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key, auto-generated |
| `sourceFileName` | VARCHAR(255) | No | Original file name |
| `sourceType` | VARCHAR(50) | Yes | Source type (pdf, doc, url, etc.) |
| `fileSize` | INTEGER | Yes | File size in bytes |
| `pageCount` | INTEGER | Yes | Number of pages (for PDFs) |
| `totalWordCount` | INTEGER | Yes | Total words in document |
| `chunkCount` | INTEGER | Yes | Number of chunks created |
| `createdAt` | TIMESTAMP | No | Insertion timestamp |
| `updatedAt` | TIMESTAMP | Yes | Last update timestamp |

**Example:**
```
id: 550e8400-e29b-41d4-a716-446655440000
sourceFileName: "research_paper.pdf"
sourceType: "pdf"
fileSize: 45678
pageCount: 5
chunkCount: 8
createdAt: 2024-05-14 10:30:45.123456
```

---

#### `document_chunks`

Stores individual chunks of text with embeddings.

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

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key, auto-generated |
| `documentId` | UUID | No | Foreign key → documents.id |
| `chunkIndex` | INTEGER | No | Chunk sequence within document |
| `text` | TEXT | No | Chunk text content |
| `wordCount` | INTEGER | Yes | Words in chunk |
| `embedding` | VECTOR(384) | No | 384-dimensional embedding (normalized) |
| `createdAt` | TIMESTAMP | No | Insertion timestamp |

**Example:**
```
id: 660e8400-e29b-41d4-a716-446655440001
documentId: 550e8400-e29b-41d4-a716-446655440000
chunkIndex: 0
text: "This is the first chunk of the document..."
wordCount: 487
embedding: [0.123, -0.456, 0.789, ..., 0.234]  (384 values)
createdAt: 2024-05-14 10:30:47.654321
```

---

### Indexes

#### Primary Index: ivfflat for Vector Similarity

```sql
CREATE INDEX idx_document_chunks_embedding_ivfflat 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Purpose:** Fast approximate nearest neighbor (ANN) search using cosine distance

**Parameters:**
- `lists = 100` – Number of clusters for IVF
  - Smaller (10): Faster search, less accurate
  - Larger (100): More accurate, slower search
  - Rule of thumb: `lists = sqrt(total_chunks / 10)`

**Probes:** Set dynamically at query time:
```sql
SET LOCAL ivfflat.probes = 100;
SELECT * FROM document_chunks
ORDER BY embedding <=> $1::vector
LIMIT 3;
```

#### Secondary Indexes (Optional)

```sql
-- For filtering by document
CREATE INDEX idx_document_chunks_documentId ON document_chunks(documentId);

-- For sorting by creation time
CREATE INDEX idx_document_chunks_createdAt ON document_chunks(createdAt DESC);
```

---

## Vector Storage Details

### Embedding Generation

**Model:** Xenova/all-MiniLM-L6-v2
- Dimensionality: 384
- Vocabulary: 30,000 tokens
- Pooling: Mean pooling over token embeddings
- Normalization: L2 normalized (sum of squares = 1)

**In application:**
```typescript
// app/lib/phase3/embedding.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  const session = await env.session()
  const output = await session.onnx_model(
    { last_hidden_state: new Tensor('float32', ...) },
    { pooling: 'mean' }
  )
  const embedding = Array.from(output.sentence_embeddings.data)
  return normalize(embedding)  // L2 normalization
}
```

### Vector Operations

**Cosine Similarity (used for search):**
```sql
-- Find similar chunks
SELECT id, text, (embedding <=> $1::vector) AS distance
FROM document_chunks
ORDER BY embedding <=> $1::vector  -- <=> = cosine distance operator
LIMIT 3;
```

**Distance Metric:**
- `<=>` (cosine distance): Values 0–2 (0 = identical, 2 = opposite)
- Used because embeddings are normalized
- Equivalent to: `1 - cosine_similarity`

**Vector Casting:**
```sql
-- Embedding must be cast as vector
SELECT * FROM document_chunks
WHERE embedding <=> '[0.123, -0.456, ..., 0.234]'::vector < 0.5;
```

---

## Query Patterns

### 1. Retrieve Top-K Similar Chunks (with ANN)

```typescript
// app/lib/phase4/retrieval.ts
async function retrieveRelevantChunks(question: string, topK: number = 3) {
  const questionEmbedding = await generateEmbedding(question)
  const vectorLiteral = embeddingToVectorLiteral(questionEmbedding)

  // Step 1: Try approximate search with increased probes
  let rows = await pool.query(`
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

  // Step 2: Fallback to exact search if ANN returns 0 rows
  if (rows.rows.length === 0) {
    rows = await pool.query(`
      SET LOCAL enable_indexscan = off;
      SET LOCAL enable_bitmapscan = off;
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
  }

  return rows.rows
}
```

**Why fallback is needed:**
- ivfflat ANN divides embeddings into clusters (lists)
- If question is far from all clusters, ANN returns 0 neighbors
- Exact search (disabled index scan) guarantees finding closest vectors
- Trade-off: 50–200ms for 100K chunks vs. instant 0-result ANN

---

### 2. Insert Document with Chunks

```typescript
// app/lib/phase3/db.ts
async function insertDocumentWithChunks(
  fileName: string,
  chunks: ChunkWithEmbedding[],
  fileSize: number,
  pageCount?: number
) {
  const pool = getPool()
  
  // Insert document
  const docResult = await pool.query(
    `INSERT INTO documents (sourceFileName, fileSize, pageCount, chunkCount)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [fileName, fileSize, pageCount, chunks.length]
  )
  
  const documentId = docResult.rows[0].id

  // Insert chunks with embeddings
  for (const chunk of chunks) {
    const vectorLiteral = embeddingToVectorLiteral(chunk.embedding)
    await pool.query(
      `INSERT INTO document_chunks (documentId, chunkIndex, text, wordCount, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)`,
      [documentId, chunk.index, chunk.text, chunk.wordCount, vectorLiteral]
    )
  }

  return documentId
}
```

---

### 3. Count Chunks (for monitoring)

```sql
-- Total chunks across all documents
SELECT COUNT(*) FROM document_chunks;

-- Chunks by document
SELECT 
  d.sourceFileName, 
  COUNT(dc.id) AS chunkCount
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.documentId
GROUP BY d.id
ORDER BY chunkCount DESC;

-- Check embedding dimension
SELECT DISTINCT vector_dims(embedding) FROM document_chunks;
```

---

## Performance Tuning

### Index Configuration

**ivfflat.lists parameter:**

For your use case (small to medium datasets):

| Dataset Size | Recommended `lists` | Search Speed | Accuracy |
|--------------|---------------------|--------------|----------|
| < 1K chunks | 10 | Fast | Good |
| 1K–10K chunks | √(chunks/10) ≈ 30 | Good | Good |
| 10K–100K chunks | √(chunks/10) ≈ 100 | Good | Excellent |
| > 100K chunks | √(chunks/10) ≈ 300+ | Slow | Excellent |

**For Unicollab:** Start with `lists = 100`, adjust based on performance.

### Query Optimization

**Profile slow queries:**
```sql
EXPLAIN ANALYZE
SELECT * FROM document_chunks
ORDER BY embedding <=> '[0.123, ...]'::vector
LIMIT 3;
```

**Typical performance (100 chunks):**
- ANN search: 5–10ms
- Exact search: 10–50ms
- LLM response dominates (2–3s)

---

## Maintenance

### Reindex (if performance degrades)

```sql
-- Rebuild ivfflat index
REINDEX INDEX idx_document_chunks_embedding_ivfflat;
```

### Vacuum (cleanup old data)

```sql
-- Clean up dead rows
VACUUM document_chunks;
ANALYZE document_chunks;
```

### Monitor Table Size

```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size
FROM pg_tables
WHERE tablename IN ('documents', 'document_chunks');
```

---

## Backup & Recovery

### Backup to file

```bash
docker exec unicollab-pg pg_dump -U postgres UnicollabAi > backup.sql
```

### Restore from file

```bash
docker exec -i unicollab-pg psql -U postgres UnicollabAi < backup.sql
```

### Backup with Docker volume

```bash
# Create backup
docker exec unicollab-pg pg_dump -U postgres UnicollabAi > backup_$(date +%Y%m%d).sql

# List all backups
ls -la backup_*.sql
```

---

## Scaling Considerations

### Current Limits

- **Chunks:** Up to 1M chunks per table (tested to 100K)
- **Embeddings:** 384-dim vectors (fixed)
- **Document size:** No hard limit (tested to 100MB PDFs)

### For 10K+ chunks:

1. **Increase ivfflat.lists** from 100 to 300–500
   ```sql
   DROP INDEX idx_document_chunks_embedding_ivfflat;
   CREATE INDEX idx_document_chunks_embedding_ivfflat 
   ON document_chunks 
   USING ivfflat (embedding vector_cosine_ops) 
   WITH (lists = 300);
   ```

2. **Add PostgreSQL connection pooling** (PgBouncer)
   ```yaml
   # pgbouncer.ini
   [databases]
   UnicollabAi = host=localhost port=5432 dbname=UnicollabAi
   ```

3. **Consider separate vector database** (Milvus, Pinecone) for > 1M chunks

---

## Troubleshooting

### "Embedding dimension mismatch"

```
ERROR: vector dimension (384) does not match index dimension (256)
```

**Cause:** Different embedding model or corrupted data

**Solution:**
```bash
# Check actual dimension
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT DISTINCT vector_dims(embedding) FROM document_chunks;"

# If mismatch, regenerate with same model
# Ensure Xenova model is: all-MiniLM-L6-v2 (384-dim)
```

### "ivfflat search returns 0 rows"

**Cause:** ANN with small dataset in distant cluster

**Solution:** Already handled in code with fallback exact search (see retrieval.ts)

### "Out of memory during embedding generation"

**Cause:** Xenova model too large for available RAM

**Solution:**
```bash
# Allocate more Node.js memory
export NODE_OPTIONS=--max-old-space-size=4096
npm run dev
```

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – System overview
- [SETUP.md](SETUP.md) – Database initialization
- [DEVELOPMENT.md](DEVELOPMENT.md) – Code examples
- [DEPLOYMENT.md](DEPLOYMENT.md) – Production setup
