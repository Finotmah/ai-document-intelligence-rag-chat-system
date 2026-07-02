import Link from "next/link"
import {
  AppContainer,
  AppShell,
  Badge,
  ButtonLink,
  SectionHeading,
  StatCard,
  Surface,
} from "@/app/components/ui"

const featureCards = [
  {
    title: "Upload PDFs",
    description: "Drop in a document and let the system extract clean text automatically.",
  },
  {
    title: "Search semantically",
    description: "Chunked text and embeddings make retrieval accurate even when wording changes.",
  },
  {
    title: "Get grounded answers",
    description: "RAG responses cite the most relevant chunks so users can trust the output.",
  },
];

const workflow = [
  "Upload a PDF",
  "Extract and chunk text",
  "Generate embeddings",
  "Store vectors in PostgreSQL",
  "Ask questions in chat",
  "Receive grounded answers",
];

const metrics = [
  { value: "4 phases", label: "implemented and documented" },
  { value: "384-dim", label: "embedding vectors" },
  { value: "pgvector", label: "semantic retrieval layer" },
  { value: "RAG-ready", label: "answer generation pipeline" },
];

export default function Home() {
  return (
    <AppShell>
      <AppContainer className="py-6 sm:py-8 lg:py-10">
        <header className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/80 bg-white/85 px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">
              AI Document Intelligence & RAG Chat System
            </p>
            <p className="mt-1 text-sm text-slate-600">Document intelligence for uploaded PDFs</p>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/upload">
              Upload
            </Link>
            <Link className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" href="/chat">
              Chat
            </Link>
          </nav>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] lg:items-start lg:gap-8 lg:py-10">
          <div className="space-y-8">
            <div className="max-w-3xl space-y-5">
              <Badge tone="brand">Upload PDFs. Ask questions. Get grounded answers.</Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Turn your PDF library into an answer engine.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                AI Document Intelligence & RAG Chat System ingests PDFs, extracts text, builds semantic chunks,
                stores embeddings in PostgreSQL, and answers questions with grounded context from your own documents.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/upload" variant="primary">
                  Upload a PDF
                </ButtonLink>
                <ButtonLink href="/chat" variant="secondary">
                  Open Chat
                </ButtonLink>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <StatCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  className="shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                />
              ))}
            </div>

            <Surface className="p-6">
              <SectionHeading
                title="Designed for a document-first workflow"
                description="The experience stays focused on uploading, indexing, and querying documents with minimal friction."
              />

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {featureCards.map((card) => (
                  <article key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                    <div className="mb-4 h-10 w-10 rounded-2xl bg-slate-950/95" />
                    <h2 className="text-base font-semibold text-slate-950">{card.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                  </article>
                ))}
              </div>
            </Surface>
          </div>

          <Surface className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">System flow</p>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">From upload to grounded answer</h2>
                </div>
                <Badge tone="info">Live pipeline</Badge>
              </div>
            </div>

            <div className="space-y-3 px-6 py-6">
              {workflow.map((step, index) => (
                <div key={step} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium text-slate-800">{step}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-5">
              <p className="text-sm leading-7 text-slate-600">
                Vector retrieval uses pgvector with an ANN index and exact-search fallback, so smaller datasets still return relevant chunks reliably.
              </p>
            </div>
          </Surface>
        </section>
      </AppContainer>
    </AppShell>
  )
}
