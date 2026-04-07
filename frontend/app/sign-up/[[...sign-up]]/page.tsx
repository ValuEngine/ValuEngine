import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#e8c55a] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <span className="text-xl font-black text-white">ValuEngine</span>
          </div>
          <p className="text-[#7a8fa3] text-sm">Crée ton compte gratuit — 3 analyses/jour</p>
        </div>
        <SignUp />
        <p className="text-xs text-center mt-4 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          En créant un compte, tu confirmes comprendre que ValuEngine est un outil éducatif
          et ne constitue pas un conseil en investissement au sens de la directive MIF II.
        </p>
      </div>
    </main>
  );
}
