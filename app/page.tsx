import packageJson from "../package.json" assert { type: "json" };

const { version } = packageJson as { version?: string };

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.25),_transparent_55%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 800 600">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="800" height="600" fill="url(#grid)" />
        </svg>
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16 md:px-12">
        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="shimmer text-4xl font-semibold tracking-tight text-transparent bg-gradient-to-r from-cyan-300 via-white to-indigo-300 bg-clip-text drop-shadow-[0_0_25px_rgba(59,130,246,0.45)] animate-pulse-slow md:text-6xl">
            Data Mapper
          </h1>
          {version && (
            <p className="text-sm font-medium text-slate-300 md:text-base">Versione {version}</p>
          )}
        </header>

        <section className="mt-16 flex flex-1 flex-col justify-center">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex items-center rounded-full bg-slate-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-slate-300">
              Documentazione
            </span>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              La mappa per trasformare i tuoi dati in insight scalabili.
            </h2>
            <p className="text-lg leading-relaxed text-slate-300 md:text-xl">
              La documentazione sarà presto disponibile.
            </p>
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-700/40 pt-6 text-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} SDS Analytics Service · Data Mapper Platform</p>
        </footer>
      </main>
    </div>
  );
}
