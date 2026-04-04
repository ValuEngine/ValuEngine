import { MetadataRoute } from "next";

const BASE = "https://valuengine.fr";

const SEO_TICKERS = [
  "MC.PA", "TTE.PA", "BNP.PA", "AIR.PA", "OR.PA", "SAN.PA", "SU.PA", "DG.PA",
  "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "ASML.AS", "SAP.DE",
  "NESN", "LVMH", "JPM", "V", "JNJ", "NOVO-B.CO",
];

const BLOG_SLUGS = [
  "investir-actions-europeennes-2026",
  "marge-de-securite-graham",
  "fcf-yield-indicateur",
  "comprendre-dcf-guide-pratique",
  "bull-bear-case-analyse",
  "wacc-cout-capital",
  "comment-analyser-une-action-bourse",
  "quest-ce-que-le-dcf-valorisation",
  "analyse-apple-aapl-2025",
  "comment-lire-bull-bear-case",
  "investir-bourse-francaise-cac40",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                      lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/analyze`,         lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/track-record`,    lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/about`,           lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/methodology`,     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/blog`,            lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/compare`,         lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/screener`,        lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/legal`,           lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const tickerPages: MetadataRoute.Sitemap = SEO_TICKERS.map((ticker) => ({
    url: `${BASE}/analyse-action/${ticker}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const blogPages: MetadataRoute.Sitemap = BLOG_SLUGS.map((slug) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...tickerPages, ...blogPages];
}
