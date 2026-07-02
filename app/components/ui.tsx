import Link from "next/link"
import type { ReactNode } from "react"

function joinClassNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function AppShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinClassNames(
        "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.08),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_72%,_#eef2ff_100%)] text-slate-900",
        className
      )}
    >
      {children}
    </div>
  )
}

export function AppContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinClassNames("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinClassNames(
        "rounded-[1.5rem] border border-slate-200/80 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={joinClassNames("flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="max-w-3xl space-y-3">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="max-w-2xl text-base leading-7 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={joinClassNames("space-y-1", className)}>
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  )
}

const buttonBase =
  "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50"

export function buttonStyles(variant: "primary" | "secondary" | "ghost" = "primary") {
  if (variant === "secondary") {
    return joinClassNames(buttonBase, "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50")
  }

  if (variant === "ghost") {
    return joinClassNames(buttonBase, "text-slate-600 hover:bg-slate-100 hover:text-slate-950")
  }

  return joinClassNames(buttonBase, "bg-slate-950 text-white shadow-sm hover:bg-slate-800")
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost"
}) {
  return (
    <button className={joinClassNames(buttonStyles(variant), className)} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  className?: string
}) {
  return (
    <Link href={href} className={joinClassNames(buttonStyles(variant), className)}>
      {children}
    </Link>
  )
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: "neutral" | "success" | "info" | "warning" | "danger" | "brand"
  className?: string
}) {
  const tones: Record<string, string> = {
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-indigo-200 bg-indigo-50 text-indigo-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    brand: "border-slate-200 bg-slate-950 text-white",
  }

  return (
    <span
      className={joinClassNames(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatCard({
  label,
  value,
  helperText,
  className,
}: {
  label: string
  value: string
  helperText?: string
  className?: string
}) {
  return (
    <Surface className={joinClassNames("p-5", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {helperText ? <p className="mt-2 text-sm leading-6 text-slate-600">{helperText}</p> : null}
    </Surface>
  )
}

export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: ReactNode
  htmlFor?: string
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">
        {children}
      </label>
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </div>
  )
}

const fieldBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={joinClassNames(fieldBase, props.className)} {...props} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={joinClassNames(fieldBase, "min-h-[120px] resize-none", props.className)} {...props} />
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M7 17h10M9 12h6M8 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-slate-950 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function InlineIcon({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={joinClassNames(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600",
        className
      )}
    >
      {children}
    </span>
  )
}
