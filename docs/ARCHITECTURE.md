# AI Document Intelligence & RAG Chat System Architecture

## Overview

Unicollab is a **Retrieval-Augmented Generation (RAG)** system that enables users to upload PDF documents and ask questions about them. The system extracts text, chunks it semantically, embeds chunks using transformers, stores them in a vector database, and generates grounded answers using an LLM.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌──────────────────────┐          ┌──────────────────────┐    │
│  │   Upload Page        │          │   Chat Page          │    │
│  │  (app/upload/)       │          │  (app/chat/)         │    │
│  └──────────────────────┘          └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                    ↓                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ /api/upload/pdf  │  │ /api/documents   │  │ /api/chat    │ │
│  │ (PDF extraction) │  │ /ingest          │  │ (RAG query)  │ │
│  │                  │  │ (text ingestion) │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING PIPELINE                           │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │   Text     │  │ Semantic │  │ Embedding│  │  Vector    │  │
│  │ Extraction │→ │ Chunking │→ │Generation│→ │  Storage   │  │
│  │(pdf-parse) │  │(300-500) │  │(Xenova)  │  │(PostgreSQL)│  │
│  └────────────┘  └──────────┘  └──────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │     PostgreSQL + pgvector Extension                     │   │
│  │  ┌──────────────────┐        ┌──────────────────────┐  │   │
│  │  │  documents       │        │  document_chunks     │  │   │
│  │  │  - id            │        │  - id                │  │   │
│  │  │  - fileName      │        │  - documentId        │  │   │
│  │  │  - sourceText    │        │  - chunkIndex        │  │   │
│  │  │  - pageCount     │        │  - text              │  │   │
│  │  │  - fileSize      │        │  - wordCount         │  │   │
│  │  │  - createdAt     │        │  - embedding(384)    │  │   │
│  │  │  - chunkCount    │        │  - createdAt         │  │   │
│  │  └──────────────────┘        └──────────────────────┘  │   │
│  │                                                         │   │
│  │  Index: ivfflat on embedding (vector_cosine_ops)       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RETRIEVAL & GENERATION                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Embed Question   │  │ Vector Similarity│  │  Retrieve    │ │
│  │ (Same model)     │→ │ Search (pgvector)│→ │  Top-K       │ │
│  │                  │  │ (with fallback)  │  │  Chunks      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                ↓                                │
│                    ┌──────────────────────┐                     │
│                    │  Build Context from  │                     │
│                    │  Retrieved Chunks    │                     │
│                    └──────────────────────┘                     │
│                                ↓                                │
│                    ┌──────────────────────┐                     │
│                    │  Call LLM (Groq) with│                     │
│                    │  Context + Question  │                     │
│                    └──────────────────────┘                     │
│                                ↓                                │
│                    ┌──────────────────────┐                     │
│                    │  Generate Grounded   │                     │
│                    │  Answer + Sources    │                     │
│                    └──────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Document Upload & Ingestion

```
User uploads PDF
    ↓
POST /api/upload/pdf
    ↓
extract text using pdf-parse
    ↓
POST /api/documents/ingest with { fileName, extractedText, fileSize, pageCount }
    ↓
Semantic chunking (300-500 word chunks)
    ↓
Generate embeddings for each chunk (Xenova, 384-dim)
    ↓
Insert into PostgreSQL:
  - documents table (1 row)
  - document_chunks table (N rows, one per chunk)
    ↓
Create ivfflat index for vector similarity
    ↓
Return chunk metadata to UI
```

### 2. Question & RAG Response

```
User asks question in /chat
    ↓
POST /api/chat { message: "question" }
    ↓
Embed question (Xenova, same model as chunks)
    ↓
Execute vector similarity search on document_chunks:
  - Query: ORDER BY embedding <=> question_embedding LIMIT topK
  - Index: ivfflat (with probes=100 for small datasets)
  - Fallback: If 0 rows, disable index scans and retry
    ↓
Retrieve top-K chunks with original text
    ↓
Build context string from chunks
    ↓
Call Groq API (llama-3.3-70b-versatile) with:
  - System: "Answer based on the provided context"
  - Context: Retrieved chunks
  - Question: User's message
    ↓
Parse response
    ↓
Return { reply, usedRAG: true, sources: [...] }
    ↓
UI displays answer + source attribution
```

## Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Frontend | Next.js | 16.2.6 | React UI framework, API routes |
| Backend | Node.js | Built-in | API servers |
| Database | PostgreSQL | 16 | Structured data + vectors |
| Vector Extension | pgvector | Latest | Vector similarity search |
| Text Extraction | pdf-parse | 1.1.1 | PDF → text conversion |
| Embeddings | @xenova/transformers | 2.17.2 | In-process embedding generation |
| LLM | Groq API | N/A | Fast inference for text generation |
| HTTP Client | OpenAI SDK | 6.37.0 | Groq client (OpenAI-compatible) |

## Key Design Decisions

### 1. **In-Process Embeddings (Xenova)**
- No external embedding service → no latency/cost overhead
- `all-MiniLM-L6-v2` model (384-dim) balances quality and speed
- Normalized embeddings for cosine similarity

### 2. **Semantic Chunking (300–500 words)**
- Preserves semantic units (sentences not split mid-word)
- Small enough for context window, large enough for meaning
- Overlap strategy prevents information loss at chunk boundaries

### 3. **PostgreSQL + pgvector**
- Single database for documents and vectors (no separate vector store)
- ivfflat index for approximate nearest neighbor search
- Fallback to exact search for reliability on small datasets

### 4. **RAG with Groq LLM**
- Fast inference (70B model in ~1s)
- Grounded answers (sources provided)
- Cost-effective (low token pricing)

### 5. **Stateless API Design**
- No session state → scalable horizontally
- Each request is independent
- Chat history not stored (can be added in Phase 5)

## Environment Variables

```
DATABASE_URL=postgresql://postgres:password@localhost:5435/UnicollabAi
GROQ_API_KEY=your-groq-api-key-here
```

## Project Structure

```
unicollab-reccomendation-ai/
├── app/
│   ├── api/
│   │   ├── upload/pdf/route.ts           # Upload endpoint
│   │   ├── documents/ingest/route.ts     # Ingest endpoint
│   │   └── chat/route.ts                 # RAG chat endpoint
│   ├── chat/
│   │   └── page.tsx                      # Chat UI
│   ├── upload/
│   │   └── page.tsx                      # Upload UI
│   ├── components/
│   │   └── PDFUpload.tsx                 # Upload component
│   ├── lib/
│   │   ├── pdf-parser.ts                 # PDF extraction
│   │   ├── phase3/
│   │   │   ├── chunker.ts                # Semantic chunking
│   │   │   ├── embedding.ts              # Embedding generation
│   │   │   ├── db.ts                     # DB operations
│   │   │   ├── document-store.ts         # Orchestration
│   │   │   └── types.ts                  # Type definitions
│   │   └── phase4/
│   │       ├── retrieval.ts              # Vector search
│   │       └── rag-chat.ts               # RAG response generation
│   ├── types/
│   │   └── upload.ts                     # Upload types
│   ├── layout.tsx                        # Root layout
│   ├── page.tsx                          # Home page
│   └── globals.css                       # Global styles
├── db/
│   └── schema.sql                        # Database schema + indexes
├── scripts/
│   └── integration/
│       ├── test-chat-rag.js              # Integration test
│       └── README.md                     # Test documentation
├── docs/
│   ├── ARCHITECTURE.md                   # This file
│   ├── SETUP.md                          # Development setup
│   ├── API.md                            # API documentation
│   ├── DATABASE.md                       # Database design
│   ├── PHASES.md                         # Phase details
│   ├── DEVELOPMENT.md                    # Developer guide
│   └── DEPLOYMENT.md                     # Production setup
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md                             # Project README
```

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| PDF upload + extraction | 1–3s | Depends on PDF size (pdf-parse) |
| Text ingestion (chunking + embedding) | 2–5s | Xenova embedding is CPU-bound |
| Vector search (retrieval) | 50–200ms | ivfflat ANN; ~1ms per chunk comparison |
| LLM response generation | 1–3s | Groq API latency |
| **Total Q&A latency** | **2–5s** | Dominated by LLM call |

## Scalability & Limitations

### Current Limitations
- **Single-user session:** No session management (each request is independent)
- **Document limit:** Tested up to ~50 documents with 1000s of chunks; no hard limit
- **Chunk limit:** ivfflat performance degrades with > 100K chunks (can tune lists parameter)
- **No chat history:** Questions don't influence future answers

### To Scale To Production
1. Add connection pooling (already using pg pool)
2. Tune ivfflat parameters (lists, probes) based on dataset size
3. Add caching (Redis) for frequent queries
4. Implement request rate limiting
5. Monitor vector search latency with observability tools
6. Add authentication + multi-tenancy support

## Future Enhancements (Phase 5+)

1. **Recommendation System:** Use chat history to recommend relevant documents
2. **Multi-turn conversations:** Store chat context and maintain conversation state
3. **Fine-tuned embeddings:** Optimize embeddings for your domain
4. **Semantic search UI:** Let users search by keywords + filters
5. **Analytics dashboard:** Monitor usage, top questions, document popularity
6. **Export/sharing:** Share chat conversations or summaries

## Related Documentation

- [SETUP.md](SETUP.md) – How to run locally
- [API.md](API.md) – Endpoint specifications
- [DATABASE.md](DATABASE.md) – Database schema and design
- [PHASES.md](PHASES.md) – Detailed breakdown of each phase
- [DEVELOPMENT.md](DEVELOPMENT.md) – Developer guide
- [DEPLOYMENT.md](DEPLOYMENT.md) – Production deployment
