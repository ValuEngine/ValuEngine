import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center mx-auto">
          <span className="text-3xl font-black text-[#C9A84C]">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Page introuvable</h1>
        <p className="text-[#71717a] text-sm">
          Cette page n&apos;existe pas ou a &eacute;t&eacute; d&eacute;plac&eacute;e.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold px-6 py-3 rounded-xl hover:shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all"
        >
          Retour au dashboard
        </Link>
      </div>
    </main>
  );
}
