import { MetadataRoute } from "next";
import { services } from "@/lib/service-catalog";
import { localizedPath } from "@/lib/site-language";
import { siteUrl } from "@/lib/site-seo";
import { getContent } from "@/lib/content-store";
import {approvedEditorial} from "@/lib/editorial-workflow";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getContent();
  const paths = ["/", "/packages", ...services.map((s) => `/services/${s.slug}`)];
  const baseEntries = paths.flatMap((path) =>
    (["ar", "en", "zh"] as const).map((lang) => ({
      url: siteUrl + localizedPath(lang, path),
      lastModified: path === "/" ? content.updatedAt : path === "/packages" ? "2026-11-15" : "2026-11-13",
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
  const guideEntries = (["ar","en","zh"] as const).flatMap(lang=>{
    const entries=approvedEditorial(content.editorialItems,lang).filter(x=>(x.kind==="guide"||x.kind==="comparison")&&x.slug);
    return entries.map(e=>({url:siteUrl+localizedPath(lang,"/insights/"+e.slug),lastModified:e.reviewedAt||content.updatedAt,changeFrequency:"monthly" as const,priority:0.7}));
  });
  const hubEntries = (["ar","en","zh"] as const).filter(lang=>approvedEditorial(content.editorialItems,lang).some(e=>e.kind==="guide"||e.kind==="comparison")).map(lang=>({url:siteUrl+localizedPath(lang,"/insights"),lastModified:content.updatedAt,changeFrequency:"weekly" as const,priority:0.75}));
  return [...baseEntries,...hubEntries,...guideEntries];
}
