# AI Document Intelligence & RAG Chat System

AI Document Intelligence & RAG Chat System is a full-stack Next.js application for uploading PDFs, extracting and chunking text, generating embeddings, storing vectors in PostgreSQL, and answering questions with retrieval-augmented generation.

## Highlights

- PDF upload and extraction with `pdf-parse`
- Semantic chunking for better retrieval quality
- In-process 384-dimensional embeddings with `@xenova/transformers`
- PostgreSQL + pgvector for document storage and similarity search
- RAG chat with grounded answers and source attribution
- Deployment-ready API routes and documentation

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL 16 + pgvector
- Groq API for chat completions

## Architecture Overview

The system is organized as a document intelligence pipeline with clearly separated presentation, processing, storage, and generation layers. PDFs are uploaded through the UI, processed by API routes, indexed into PostgreSQL with pgvector, and queried through a retrieval-augmented chat flow.

```mermaid
flowchart TD
  A[User Interface\nUpload, Dashboard, Chat] --> B[API Layer\nUpload and Ingest Routes]
  B --> C[Document Processing\nPDF Extraction and Chunking]
  C --> D[Embedding Layer\nXenova 384-dim Vectors]
  D --> E[Data Layer\nPostgreSQL + pgvector]
  E --> F[Retrieval Layer\nSemantic Similarity Search]
  F --> G[Generation Layer\nGroq LLM with Retrieved Context]
  G --> H[Answer Delivery\nGrounded Response + Sources]
```

### Core Flow

1. A user uploads a PDF from the upload page.
2. The backend extracts text and splits it into semantically meaningful chunks.
3. Each chunk is embedded and stored in PostgreSQL with vector metadata.
4. When a question is submitted in chat, the system retrieves the most relevant chunks.
5. The Groq model generates a grounded answer using only the retrieved context.
6. The response is returned with source attribution for transparency.

## Project Structure

```text
app/
├── api/
│   ├── chat/
│   ├── documents/
│   └── upload/pdf/
├── chat/
├── dashboard/
├── upload/
├── components/
└── lib/

db/
└── schema.sql

docs/
└── *.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker
- Groq API key from https://console.groq.com

### Install

```bash
npm install
```

### Set Up PostgreSQL

```bash
docker run -d \
  --name unicollab-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=UnicollabAi \
  -p 5435:5432 \
  pgvector/pgvector:pg16

docker exec unicollab-pg psql -U postgres -d UnicollabAi < db/schema.sql
```

### Configure Environment

Create `.env.local` in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/UnicollabAi
GROQ_API_KEY=your-groq-api-key-here
```

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Usage

1. Go to `/upload` and upload a PDF.
2. Wait for extraction, chunking, and embedding generation.
3. Open `/chat` and ask a question about the uploaded documents.
4. Review the response and cited sources.

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run integration:test # Run integration tests
```

## API Routes

- `POST /api/upload/pdf` - upload and index a PDF
- `POST /api/documents/ingest` - ingest extracted text directly
- `GET /api/documents` - list stored documents
- `POST /api/chat` - ask a question against the indexed documents

## Documentation

| Document | Purpose |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and data flow |
| [docs/SETUP.md](docs/SETUP.md) | Local setup and troubleshooting |
| [docs/API.md](docs/API.md) | API reference |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema and vector storage details |
| [docs/PHASES.md](docs/PHASES.md) | Implementation breakdown |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Developer guide |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |

## Testing

```bash
npm run integration:test
```

You can also test the chat endpoint directly:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Summarize the uploaded document"}'
```

## Deployment

Before making the repository public, make sure these are configured in your deployment environment:

- `DATABASE_URL`
- `GROQ_API_KEY`

The project is designed to run with a Node.js deployment target and a PostgreSQL database with pgvector enabled.

## License

MIT
