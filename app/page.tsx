import Link from "next/link";

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
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#07111f_0%,_#0b1220_46%,_#f8fafc_46%,_#eef2f7_100%)] text-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px] opacity-20" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/8 px-4 py-3 text-white shadow-[0_12px_50px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300/90">
              AI Document Intelligence & RAG Chat System
            </p>
            <p className="text-sm text-slate-200/80">Document intelligence for uploaded PDFs</p>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-200/85 md:flex">
            <Link className="transition hover:text-white" href="/dashboard">
              Dashboard
            </Link>
            <Link className="transition hover:text-white" href="/upload">
              Upload
            </Link>
            <Link className="transition hover:text-white" href="/chat">
              Chat
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="max-w-3xl text-white">
            <div className="mb-6 inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 backdrop-blur">
              Upload PDFs. Ask questions. Get grounded answers.
            </div>

            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Turn your PDF library into an answer engine.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200/85 sm:text-xl">
              AI Document Intelligence & RAG Chat System ingests PDFs, extracts text, builds semantic chunks,
              stores embeddings in PostgreSQL, and answers questions with grounded context from your own documents.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/upload"
                className="inline-flex h-14 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                Upload a PDF
              </Link>
              <Link
                href="/chat"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/15 bg-white/8 px-6 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                Open Chat
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-md"
                >
                  <div className="text-2xl font-semibold text-white">{metric.value}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-200/80">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-8 h-32 w-32 rounded-full bg-emerald-400/25 blur-3xl" />
            <div className="absolute -right-4 bottom-0 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 text-white shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    System flow
                  </p>
                  <p className="mt-2 text-lg font-medium">From upload to grounded answer</p>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Live pipeline
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {workflow.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-slate-950">
                      {index + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-100">{step}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-sky-400/15 bg-sky-400/10 p-4 text-sm leading-7 text-sky-100">
                Vector retrieval uses pgvector with an ANN index and exact-search fallback,
                so small datasets still return relevant chunks reliably.
              </div>
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="grid gap-5 lg:grid-cols-3">
            {featureCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-5 h-12 w-12 rounded-2xl bg-slate-950" />
                <h2 className="text-xl font-semibold text-slate-950">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
