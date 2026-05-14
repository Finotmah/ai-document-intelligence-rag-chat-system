# Development Setup Guide

How to set up and run Unicollab locally.

## Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **Docker** (for PostgreSQL + pgvector)
- **Git** (for cloning)
- **Groq API Key** (from https://console.groq.com)

## Step 1: Clone & Install

```bash
cd unicollab-reccomendation-ai
npm install
```

## Step 2: Start PostgreSQL with pgvector

The project uses Docker for the database.

```bash
# Start PostgreSQL 16 + pgvector in Docker
docker run -d \
  --name unicollab-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=UnicollabAi \
  -p 5435:5432 \
  pgvector/pgvector:pg16

# Wait 3-5 seconds for container to start
sleep 5

# Apply database schema
docker exec unicollab-pg psql -U postgres -d UnicollabAi < db/schema.sql

# Verify schema was applied
docker exec unicollab-pg psql -U postgres -d UnicollabAi -c "\dt"
```

**Expected output:**
```
             List of relations
 Schema |        Name        | Type  |  Owner
--------+--------------------+-------+----------
 public | documents          | table | postgres
 public | document_chunks    | table | postgres
```

## Step 3: Configure Environment

Create `.env.local` in the project root:

```env
# Database (PostgreSQL + pgvector)
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/UnicollabAi

# Groq API (for LLM)
GROQ_API_KEY=your-actual-groq-api-key-here
```

Get your Groq API key:
1. Go to https://console.groq.com
2. Sign up or log in
3. Create an API key
4. Copy and paste it into `.env.local`

## Step 4: Start Development Server

```bash
npm run dev
```

Output:
```
> unicollab-reccomendation-ai@0.1.0 dev
> next dev

  ▲ Next.js 16.2.6
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 1234ms
```

## Step 5: Test the System

### Option A: Browser (Easiest)

1. **Upload a document:**
   - Go to http://localhost:3000/upload
   - Click "Upload PDF"
   - Select a sample PDF file (e.g., research paper, article)
   - Wait for upload to complete (2–5 seconds)
   - See chunks created and displayed

2. **Ask a question:**
   - Go to http://localhost:3000/chat
   - Type a question (e.g., "Summarize the document in 3 points")
   - Press Enter
   - See grounded answer with sources

### Option B: Command Line

```bash
# Option 1: Using curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Summarize the uploaded document"}'

# Option 2: Using PowerShell
$body = @{ message = 'Summarize the document' } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri 'http://localhost:3000/api/chat' `
  -ContentType 'application/json' `
  -Body $body

# Option 3: Using integration test
npm run integration:test
```

### Option C: Postman / Insomnia

Import the endpoints:

**POST /api/upload/pdf**
- Body: form-data with file
- Response: Extraction metadata + chunks

**POST /api/documents/ingest**
- Body: JSON with { fileName, extractedText, fileSize, pageCount }
- Response: Document ID + chunk metadata

**POST /api/chat**
- Body: JSON with { message: "question" }
- Response: { reply, usedRAG, sources }

## Troubleshooting

### Error: "Cannot find PostgreSQL"

**Problem:** `connect ECONNREFUSED 127.0.0.1:5435`

**Solution:**
```bash
# Check if container is running
docker ps | grep unicollab-pg

# If not running, start it
docker start unicollab-pg

# If doesn't exist, create it
docker run -d \
  --name unicollab-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=UnicollabAi \
  -p 5435:5432 \
  pgvector/pgvector:pg16
```

### Error: "Groq API Key invalid"

**Problem:** `Error: 401 Unauthorized`

**Solution:**
1. Verify your API key: https://console.groq.com
2. Ensure it's pasted correctly in `.env.local`
3. Ensure no extra spaces/quotes around the key
4. Restart dev server: `npm run dev`

### Error: "No vectors in database after upload"

**Problem:** Upload completes but chat returns "no indexed documents"

**Solution:**
```bash
# 1. Check if documents were created
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT id, fileName, chunkCount FROM documents;"

# 2. Check if chunks exist
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT COUNT(*) FROM document_chunks;"

# 3. Check if embeddings are non-null
docker exec unicollab-pg psql -U postgres -d UnicollabAi \
  -c "SELECT id, vector_dims(embedding) FROM document_chunks LIMIT 5;"

# 4. Check app logs for errors
# Look at terminal running "npm run dev"
```

### Error: "Connection pool exhausted"

**Problem:** Too many simultaneous connections to database

**Solution:**
```bash
# Increase pool size in app/lib/phase3/db.ts
const pool = new Pool({
  max: 20,  // Increase from default
  ...
});

# Or restart dev server and database
npm run dev
docker restart unicollab-pg
```

## Common Development Tasks

### Clear all documents from database

```bash
docker exec unicollab-pg psql -U postgres -d UnicollabAi -c "
  DELETE FROM document_chunks;
  DELETE FROM documents;
"
```

### View database schema

```bash
docker exec unicollab-pg psql -U postgres -d UnicollabAi -c "\d+ documents"
docker exec unicollab-pg psql -U postgres -d UnicollabAi -c "\d+ document_chunks"
```

### View indexes

```bash
docker exec unicollab-pg psql -U postgres -d UnicollabAi -c "\di"
```

### Monitor Groq API usage

```bash
# Go to https://console.groq.com
# Dashboard shows tokens used, cost, quota
```

### Run linting

```bash
npm run lint
```

### Build for production

```bash
npm run build
```

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design
- Read [API.md](API.md) for endpoint documentation
- Read [DATABASE.md](DATABASE.md) for schema details
- Read [DEVELOPMENT.md](DEVELOPMENT.md) for extending the system

## Docker Management

### View PostgreSQL logs

```bash
docker logs unicollab-pg
```

### Connect to PostgreSQL directly

```bash
docker exec -it unicollab-pg psql -U postgres -d UnicollabAi
```

Then run SQL:
```sql
\dt                    -- List tables
SELECT * FROM documents;   -- View documents
\q                     -- Quit
```

### Stop and remove container

```bash
docker stop unicollab-pg
docker rm unicollab-pg
```

### Inspect volume/data persistence

```bash
# Data is stored in Docker volume "unicollab_pg_data" (if named volume used)
# To list volumes:
docker volume ls | grep unicollab

# To remove volume (DELETES all data!):
docker volume rm unicollab_pg_data
```

## Performance Tips

1. **Indexing:** Database uses pgvector's ivfflat index for fast similarity search
2. **Embedding cache:** Xenova caches models in-memory (first run slower)
3. **Connection pooling:** Already enabled (max 5 connections default)
4. **Chunk size:** 300–500 words is optimal for your use case

For production, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – System overview
- [API.md](API.md) – API endpoints
- [DATABASE.md](DATABASE.md) – Database design
- [PHASES.md](PHASES.md) – Implementation details by phase
- [DEVELOPMENT.md](DEVELOPMENT.md) – Developer guide
- [DEPLOYMENT.md](DEPLOYMENT.md) – Production setup
