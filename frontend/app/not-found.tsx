import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
      <div className="text-center space-y-6 max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{
            background: "rgba(108,92,231,0.08)",
            border: "1px solid rgba(108,92,231,0.18)",
          }}
        >
          <span className="text-3xl font-black" style={{ color: "var(--accent-primary)" }}>404</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Page introuvable</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Cette page n&apos;existe pas ou a &eacute;t&eacute; d&eacute;plac&eacute;e.
        </p>
        <Link
          href="/dashboard"
          className="btn-pro inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all"
        >
          Retour au dashboard
        </Link>
      </div>
    </main>
  );
}
