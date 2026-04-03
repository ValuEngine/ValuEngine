"use client";
import AppLayout from "../../components/AppLayout";
import Link from "next/link";

const ARTICLES = [
  {
    slug: "investir-actions-europeennes-2026",
    title: "Investir dans les actions européennes en 2026 : ce qu'il faut savoir",
    excerpt: "Le CAC 40 et le DAX affichent des valorisations attractives. On décrypte les opportunités et les risques pour l'investisseur particulier.",
    date: "2 Avril 2026",
    readTime: "5 min",
    category: "Stratégie",
  },
  {
    slug: "marge-de-securite-graham",
    title: "La marge de sécurité : le concept le plus important en investissement",
    excerpt: "Benjamin Graham l'a inventée, Warren Buffett l'a perfectionnée. Comprendre la marge de sécurité, c'est comprendre 80% de l'investissement value.",
    date: "25 Mars 2026",
    readTime: "7 min",
    category: "Éducation",
  },
  {
    slug: "fcf-yield-indicateur",
    title: "Le FCF Yield : l'indicateur que les pros regardent en premier",
    excerpt: "Oubliez le P/E ratio. Le rendement du flux de trésorerie libre est un indicateur bien plus fiable pour évaluer la qualité d'une entreprise.",
    date: "18 Mars 2026",
    readTime: "6 min",
    category: "Finance",
  },
  {
    slug: "comment-lire-un-dcf",
    title: "Comment lire une analyse DCF en 5 minutes",
    excerpt: "Le DCF (Discounted Cash Flow) est la méthode de valorisation préférée de Warren Buffett. On t'explique comment l'interpréter.",
    date: "1 Mars 2026",
    readTime: "5 min",
    category: "Éducation",
  },
  {
    slug: "bull-vs-bear-case",
    title: "Bull Case vs Bear Case : comment trancher ?",
    excerpt: "Face à deux scénarios opposés pour une même action, comment l'investisseur retail doit-il décider ?",
    date: "20 Février 2026",
    readTime: "4 min",
    category: "Stratégie",
  },
  {
    slug: "wacc-explique",
    title: "Le WACC expliqué simplement",
    excerpt: "Le taux d'actualisation est le paramètre le plus sensible du DCF. Une erreur de 1% change tout. Voici comment le choisir.",
    date: "10 Février 2026",
    readTime: "6 min",
    category: "Finance",
  },
];

export default function BlogPage() {
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-2" style={{ color: "var(--text-primary)" }}>Blog</h1>
        <p className="mb-8" style={{ color: "var(--text-secondary)" }}>Éducation financière &amp; stratégie d&apos;investissement</p>
        <div className="grid gap-6">
          {ARTICLES.map(a => (
            <Link key={a.slug} href={`/blog/${a.slug}`}>
              <div className="border rounded-xl p-6 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9A84C]/60 hover:shadow-lg hover:shadow-[#C9A84C]/10 animate-fade-in-up" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#C9A84C]/20 text-[#C9A84C]">{a.category}</span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{a.date}</span>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>· {a.readTime} de lecture</span>
                </div>
                <h2 className="font-bold text-xl mb-2" style={{ color: "var(--text-primary)" }}>{a.title}</h2>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{a.excerpt}</p>
                <span className="text-[#C9A84C] text-sm font-semibold">Lire l&apos;article →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
