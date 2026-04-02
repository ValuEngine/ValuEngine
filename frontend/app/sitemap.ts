import { MetadataRoute } from "next";

const BASE = "https://valuengine.fr";

const SEO_TICKERS = [
  "MC.PA", "TTE.PA", "BNP.PA", "AIR.PA", "OR.PA", "SAN.PA",
  "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "ASML", "NESN",
  "LVMH", "JPM", "V", "JNJ",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                      lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/track-record`,    lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/about`,           lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/methodology`,     lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/blog`,            lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/legal`,           lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const tickerPages: MetadataRoute.Sitemap = SEO_TICKERS.map((ticker) => ({
    url: `${BASE}/analyse-action/${ticker}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...tickerPages];
}
