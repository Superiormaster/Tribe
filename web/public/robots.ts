import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/contact", "/terms", "/privacy"],
      disallow: [
        "/api/",
        "/settings/",
        "/notifications/",
        "/messages/",
        "/chat/",
        "/admin/",
      ],
    },
    sitemap: "https://www.tribe-app.app/sitemap.xml",
  };
}