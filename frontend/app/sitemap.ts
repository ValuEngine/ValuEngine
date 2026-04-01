import { MetadataRoute } from "next";

const BASE = "https://valuengine.io";

const SEO_TICKERS = [
  "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META", "JPM", "V", "JNJ",
  "ASML", "LVMH", "TTE", "BNP", "AIR", "OR", "SAN", "MC", "CAC", "DAX",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                    lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/track-record`,  lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/blog`,          lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/legal`,         lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const tickerPages: MetadataRoute.Sitemap = SEO_TICKERS.map((ticker) => ({
    url: `${BASE}/analyse-action/${ticker}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [...staticPages, ...tickerPages];
}
