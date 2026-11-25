import ArrowUpRight from "@/components/ArrowUpRight";
import { localizedPath } from "@/lib/site-language";
import { EditorialBlock } from "@/components/EditorialBlock";
import { approvedEditorial } from "@/lib/editorial-workflow";
import type { HomeModel } from "@/lib/home/model";

export default function HomeEditorial({lang, content}: Pick<HomeModel, "lang" | "content">) {
  return (
    <>
      <EditorialBlock items={content.editorialItems} lang={lang} kind="home" target="/"/>
      <EditorialBlock items={content.editorialItems} lang={lang} kind="trust" target="/"/>
            {approvedEditorial(content.editorialItems,lang).some(e=>e.kind==='guide'||e.kind==='comparison')&&
        <section className="section-wrap editorial-note">
          <h2>{lang==='ar'?'أدلة المستثمرين المتخصصة':lang==='zh'?'投资者专题指南':'In-depth investor guides'}</h2>
          <p>{lang==='ar'?'أدلة ومقارنات لمساعدتك على اتخاذ قرار مدروس.':lang==='zh'?'实用指南和比较，帮助您规划下一步。':'Original guides and comparisons for informed decisions.'}</p>
          <a href={localizedPath(lang,'/insights')}>{lang==='ar'?'تصفح الأدلة':lang==='zh'?'查看指南':'Browse guides'} <ArrowUpRight /></a>
        </section>}
    </>
  );
}
