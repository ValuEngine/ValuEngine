import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/analyze", "/portfolio", "/screener", "/compare", "/api"],
      },
    ],
    sitemap: "https://valuengine.fr/sitemap.xml",
  };
}
