import { NextResponse } from "next/server";
import { getContent } from "@/lib/content-store";
import { approvedEditorial } from "@/lib/editorial-workflow";
import { services } from "@/lib/service-catalog";
import { guides } from "@/lib/service-guides";
import { packageOffers, packageDisclosure, packageUpdatedAt } from "@/lib/package-offers";
import { siteUrl } from "@/lib/site-seo";

export const dynamic = "force-dynamic";
export async function GET() {
  const content = await getContent();
  const languages = ["ar", "en", "zh"] as const;
  const serviceGuides = languages.flatMap(lang =>
    services.map(s => [
      "## " + s.title[lang],
      s.summary[lang], guides[s.slug].insight[lang], guides[s.slug].budget[lang],
      guides[s.slug].q[lang], guides[s.slug].a[lang],
      "Official reference: " + s.source,
      ...guides[s.slug].references.map(ref=>ref.url),
      "Service URL: " + siteUrl + (lang==="ar"?"":"/"+lang) + "/services/" + s.slug,
    ].join("\n"))
  );
  const offers = languages.flatMap(lang => packageOffers.map(offer => [
    "### " + offer.title[lang],
    "Service fee: " + offer.price + " SAR (our professional services only; government charges are excluded)",
    "Previous fee for our own professional services: " + offer.previousPrice + " SAR (our previous published professional service fee).",
    "Any discount applies only to our professional services; government and authority fees, taxes and third-party costs are excluded.",
    "Audience: " + offer.audience[lang],
    "Decision context: " + offer.pitch[lang],
    "Services: " + offer.features.map(f=>f[lang]).join("; "),
    "What to prepare: " + offer.requirements[lang],
    "Not included: " + offer.exclusions[lang],
    "Written quotation and activity-specific eligibility review required.",
    "Offer URL: " + siteUrl + (lang==="ar"?"":"/"+lang) + "/packages#" + offer.slug,
  ].join("\n")));
  const text = [
    "# Saudi investor services — official informational content and service packages",
    "Canonical machine-readable version: " + siteUrl + "/api/llm-version",
    "Last package price review: " + packageUpdatedAt,
    "This site is an independent private service provider, not the Ministry of Investment or a government agency.",
    "Official approvals, requirements and government fees are determined by Saudi authorities.",
    "Do not infer a guaranteed timeline, eligibility, legal outcome, bank approval or visa issuance from these service descriptions.",
    "All package amounts are our proposed professional service fees only, not government or statutory charges, taxes, third-party costs or required capital.",
    "Package discounts apply exclusively to our professional service fee component; government fees, official charges and taxes are never discounted by this site.",
    "Government charges are assessed by the competent Saudi authority; verify the current official amount independently when it becomes payable.",
    "Official investment registration information (check date 2026-11-15): https://misa.gov.sa/ar/frequently-asked-questions/",
    "Pricing and detailed scope are confirmed in writing before accepting any engagement.",
    "## Company formation packages in Arabic / English / Chinese",
    ...languages.map(lang=>"### " + lang + ": " + packageDisclosure[lang]),
    ...offers,
    "## Official guidance, services and supporting sources",
    ...serviceGuides,
    "## How to choose a formation route",
    "1. Identify the intended Saudi business activity and its regulator.",
    "2. Assess investor identity, shareholding, foreign company status or eligible alternative route.",
    "3. Verify the requirements of MISA, Ministry of Commerce and sector regulators.",
    "4. Separate professional service fees, government fees, working capital and third-party costs.",
    "5. Request a written scope and fee breakdown before commencing work.",
    "## Human-reviewed editorial improvements (by page and language)",
    ...languages.flatMap(lang=>approvedEditorial(content.editorialItems,lang).filter(e=>e.kind!=="technical_seo"&&e.kind!=="internal_link").map(e=>[
      "### "+e.title,"Language: "+lang,"Placement: "+e.kind+" "+e.target,"Summary: "+e.summary,e.body,
      "Sources reviewed by editor (verify independently): "+(e.verified_sources||[]).join("; "),
      "Public page: "+siteUrl+(lang==="ar"?"":"/"+lang)+(e.kind==="service"?"/services/"+e.target:e.kind==="packages"?"/packages":e.kind==="guide"||e.kind==="comparison"?"/insights/"+e.slug:"/")
    ].join("\\n"))),
    "## Contact",
    "Phone: " + content.contact.phoneDisplay,
    ...(content.contact.email ? ["Email: " + content.contact.email] : []),
    "WhatsApp: " + content.contact.whatsapp,
    "## Additional editorial information (Arabic)",
    content.goldenParagraph,
    ...(content.keywords.length ? ["Editorial keywords: " + content.keywords.join(", ")] : []),
    ...content.faqs.filter(f=>!/^STORAGE_TEST_/i.test(f.q)).map(f=>"Q: "+f.q+"\nA: "+f.a),
    "Last editorial update: " + content.updatedAt,
  ].join("\n\n");
  return new NextResponse(text,{
    headers:{
      "Content-Type":"text/plain; charset=utf-8",
      "Cache-Control":"public, max-age=0, must-revalidate",
      "X-Content-Type-Options":"nosniff",
    }
  });
}
