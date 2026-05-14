This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Phase 3: Text Chunking + Embeddings

This project now includes a production-ready Phase 3 backend for document ingestion.

### What is implemented

- Semantic chunking for extracted PDF text with 300-500 word chunks
- Embedding generation using the free `Xenova/all-MiniLM-L6-v2` model
- PostgreSQL storage with `pgvector`
- Document and chunk schema for RAG
- Ingest API at `/api/documents/ingest`

### Environment variables

Add these values to `.env.local` before using Phase 3:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

### Database schema

Apply the schema in [db/schema.sql](db/schema.sql) to a PostgreSQL database with the `vector` extension enabled.

### Ingest API request

POST `/api/documents/ingest`

```json
{
	"fileName": "sample.pdf",
	"fileSize": 1234567,
	"pageCount": 12,
	"sourceType": "pdf",
	"extractedText": "..."
}
```

### Expected response

```json
{
	"success": true,
	"data": {
		"documentId": "...",
		"chunkCount": 4,
		"embeddingModel": "Xenova/all-MiniLM-L6-v2"
	}
}
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
