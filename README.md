# Unicollab AI — Retrieval-Augmented Generation (RAG) System

A full-stack RAG system for document ingestion and intelligent Q&A using PDF uploads, semantic chunking, embeddings, and an LLM (Groq).

## Features

- 📄 **PDF Upload & Extraction** – Upload PDFs and extract text using pdf-parse
- 🔀 **Semantic Chunking** – Split text into 300–500 word chunks preserving meaning
- 🧠 **Embeddings** – Generate 384-dimensional embeddings using Xenova (in-process, no API calls)
- 🗃️ **Vector Database** – Store and search embeddings using PostgreSQL + pgvector
- 🎯 **RAG Chat** – Ask questions and get grounded answers with source attribution
- 🧪 **Integration Tests** – Automated tests for the entire pipeline
- 📚 **Comprehensive Docs** – Full documentation for developers and operators

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- Groq API Key (free at https://console.groq.com)

### Setup (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL with pgvector
docker run -d \
  --name unicollab-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=UnicollabAi \
  -p 5435:5432 \
  pgvector/pgvector:pg16

# Wait for container to start
sleep 5

# 3. Initialize database
docker exec unicollab-pg psql -U postgres -d UnicollabAi < db/schema.sql

# 4. Create .env.local
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5435/UnicollabAi" > .env.local
echo "GROQ_API_KEY=your-groq-api-key-here" >> .env.local

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000/upload](http://localhost:3000/upload) in your browser.

### Test the System

**Browser:** Upload a PDF at `/upload`, then ask a question at `/chat`

**Command line:**
```bash
npm run integration:test
```

## Documentation

**Comprehensive guides for understanding and extending the system:**

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, tech stack overview |
| [docs/SETUP.md](docs/SETUP.md) | Local development setup and troubleshooting |
| [docs/API.md](docs/API.md) | Complete API endpoint documentation |
| [docs/DATABASE.md](docs/DATABASE.md) | Database schema, vector storage, optimization |
| [docs/PHASES.md](docs/PHASES.md) | Detailed breakdown of each implementation phase |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Developer guide for extending the system |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment and scaling |

## Architecture Overview

```
User Upload PDF
    ↓
Extract Text (pdf-parse)
    ↓
Semantic Chunking (300-500 words)
    ↓
Embedding Generation (Xenova, 384-dim)
    ↓
Vector Storage (PostgreSQL + pgvector)
    ↓
User Asks Question
    ↓
Vector Similarity Search
    ↓
Retrieve Top-K Relevant Chunks
    ↓
LLM Generates Grounded Answer (Groq)
    ↓
Return Answer + Sources to User
```

## Implementation Status

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | PDF Upload & Text Extraction | ✅ Complete |
| 2 | Document Ingestion | ✅ Complete |
| 3 | Semantic Chunking & Embeddings | ✅ Complete |
| 4 | RAG Retrieval & Chat | ✅ Complete |
| 4.5 | Integration Testing | ✅ Complete |
| 5 | Recommendation System | 🔄 Planned |

## Key Technologies

- **Frontend:** Next.js 16, React 19, TailwindCSS
- **Backend:** Node.js, TypeScript
- **Database:** PostgreSQL 16 + pgvector extension
- **Embeddings:** Xenova/all-MiniLM-L6-v2 (384-dim, in-process)
- **LLM:** Groq API (llama-3.3-70b-versatile)
- **PDF Extraction:** pdf-parse library

## Environment Variables

Create `.env.local` in project root:

```env
# PostgreSQL with pgvector
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/UnicollabAi

# Groq API (get from https://console.groq.com)
GROQ_API_KEY=your-api-key-here
```

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run integration:test # Run integration tests
```

## Directory Structure

```
app/
├── api/                    # API Routes
│   ├── upload/pdf/        # PDF upload endpoint
│   ├── documents/ingest/  # Text ingestion endpoint
│   └── chat/              # RAG chat endpoint
├── chat/                  # Chat UI
├── upload/                # Upload UI
├── lib/                   # Core business logic
│   ├── phase3/           # Chunking, embedding, storage
│   ├── phase4/           # Retrieval, RAG generation
│   └── pdf-parser.ts     # PDF extraction
└── components/           # React components

db/
└── schema.sql            # Database schema + indexes

docs/
├── ARCHITECTURE.md       # System design
├── SETUP.md             # Local setup guide
├── API.md               # API documentation
├── DATABASE.md          # Database design
├── PHASES.md            # Implementation details
├── DEVELOPMENT.md       # Developer guide
└── DEPLOYMENT.md        # Production setup

scripts/
└── integration/         # Integration tests
    ├── test-chat-rag.js
    └── README.md
```

## Common Tasks

### Add a new API endpoint
See [docs/DEVELOPMENT.md#add-a-new-api-endpoint](docs/DEVELOPMENT.md#add-a-new-api-endpoint)

### Query the database
See [docs/DEVELOPMENT.md#query-the-database](docs/DEVELOPMENT.md#query-the-database)

### Deploy to production
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Troubleshoot issues
See [docs/SETUP.md#troubleshooting](docs/SETUP.md#troubleshooting)

## Performance

Typical latencies (on local machine):

| Operation | Time |
|-----------|------|
| PDF upload (10MB) | 5–10s |
| Semantic chunking | 1–2s |
| Embedding generation | 3–5s |
| Vector similarity search | 50–200ms |
| LLM response | 2–4s |
| **Total Q&A** | **2–5s** |

## Testing

```bash
# Run integration test (uploads sample doc, asks question)
npm run integration:test

# Test specific endpoint with curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Summarize the document"}'
```

## Next Steps

1. **Read the docs:** Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. **Set up locally:** Follow [docs/SETUP.md](docs/SETUP.md)
3. **Understand the code:** Read [docs/PHASES.md](docs/PHASES.md) for implementation details
4. **Extend the system:** See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for patterns
5. **Deploy:** Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production

## License

MIT

## Support

For issues or questions, see the relevant documentation file or open an issue on GitHub.
