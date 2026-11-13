import { MetadataRoute } from "next";
import { services } from "@/lib/service-catalog";
import { localizedPath } from "@/lib/site-language";
import { siteUrl } from "@/lib/site-seo";
import { getContent } from "@/lib/content-store";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getContent();
  const paths = ["/", ...services.map((s) => `/services/${s.slug}`)];
  return paths.flatMap((path) =>
    (["ar", "en", "zh"] as const).map((lang) => ({
      url: siteUrl + localizedPath(lang, path),
      lastModified: path === "/" ? content.updatedAt : "2026-11-13",
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.8,
      alternates: {
        languages: {
          ar: siteUrl + path,
          en: siteUrl + localizedPath("en", path),
          "zh-Hans": siteUrl + localizedPath("zh", path),
        },
      },
    })),
  );
}
