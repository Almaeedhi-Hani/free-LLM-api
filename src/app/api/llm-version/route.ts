import { NextResponse } from "next/server";
import { getContent } from "@/lib/content-store";
import { services } from "@/lib/service-catalog";
import { guides } from "@/lib/service-guides";
export const dynamic = "force-dynamic";
export async function GET() {
  const content = await getContent();
  const localized = (["ar", "en", "zh"] as const).flatMap((lang) =>
    services.map(
      (s) =>
        `## ${s.title[lang]}\n${s.summary[lang]}\n${guides[s.slug].insight[lang]}\n${guides[s.slug].budget[lang]}\n${guides[s.slug].q[lang]}\n${guides[s.slug].a[lang]}\nOfficial source: ${s.source}\n${guides[s.slug].references.map((ref) => ref.url).join("\n")}`,
    ),
  );
  const text = [
    "# Saudi investor services — independent guidance",
    "Approvals are determined by official authorities. Fees and timelines vary by activity.",
    ...localized,
    "## Contact",
    content.contact.phoneDisplay,
    content.contact.email,
    content.contact.whatsapp,
    "## Editorial information (Arabic)",
    content.goldenParagraph,
    'Keywords: ' + content.keywords.join(', '),
    ...content.faqs.filter(f => !/^STORAGE_TEST_/i.test(f.q)).map((f) => `Q: ${f.q}\nA: ${f.a}`),
    `Last editorial update: ${content.updatedAt}`,
  ].join("\n\n");
  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
