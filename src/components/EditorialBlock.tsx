import type { EditorialItem,EditorialKind,EditorialLocale } from "@/lib/editorial-workflow";
import {approvedEditorial} from "@/lib/editorial-workflow";
import {topicRelatedLiveNodes,siteTopicPath} from "@/lib/content-tree";
import {localizedPath} from "@/lib/site-language";
import {DiscoveryLink} from "@/components/discovery/DiscoveryCard";
/** Editorial placements reuse existing site classes and do not alter original cards. */
export function EditorialBlock({items,lang,kind,target,inside=false}:{items:EditorialItem[]|undefined;lang:EditorialLocale;kind:EditorialKind;target:string;inside?:boolean}){
 const active=approvedEditorial(items,lang,kind,target);
 if(active.length===0)return null;
 return <section className={inside?"service-context-band":"editorial-note section-wrap"} aria-label={lang==='ar'?'محتوى تحريري وإرشادي':lang==='zh'?'编辑与参考资料':'Editorial guidance'}>
  {active.map(e=><article key={e.id}>
   <p className="eyebrow">{lang==='ar'?'دليل عملي':lang==='zh'?'实用指南':'PRACTICAL GUIDANCE'}</p>
   <h2>{e.title}</h2><p>{e.summary}</p>
   {e.body.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}
   {(e.sections||[]).map((section,i)=><section key={i}><h2>{section.h2}</h2><p>{section.body}</p>{(section.subsections||[]).map((sub,j)=><div key={j}><h3>{sub.h3}</h3><p>{sub.body}</p></div>)}</section>)}
   {e.internal_links?.filter((link,index,all)=>{
     const route=siteTopicPath(link.node_id);
     if(!route||route===target||route==='/services/'+target||all.findIndex(other=>other.node_id===link.node_id)!==index)return false;
     if(route==='/insights'&&!approvedEditorial(items,lang).some(a=>a.kind==='guide'||a.kind==='comparison'))return false;
     return true;
   }).slice(0,4).map(link=><DiscoveryLink key={link.node_id} href={localizedPath(lang,siteTopicPath(link.node_id)!)} title={link.anchor}/>)}
   {(!e.internal_links||e.internal_links.length===0)&&e.topic_node_id&&topicRelatedLiveNodes(e.topic_node_id).filter(node=>node.route!==target&&node.route!=='/services/'+target&&(node.route!=='/insights'||approvedEditorial(items,lang).some(a=>a.kind==='guide'||a.kind==='comparison'))).slice(0,3).map(node=><DiscoveryLink key={node.id} href={localizedPath(lang,node.route!)} title={node.primary_keyword[lang]}/>)}
   <p><small>{e.approval_method==='automated'?
    (lang==='ar'?'نُشر هذا المحتوى آليًا، وقد لا تكون مصادره متحققة استقلاليًا. تحقّق من الجهات الرسمية قبل اتخاذ أي قرار استثماري.':lang==='zh'?'本文由自动系统发布，参考资料可能未经独立核实；决策前请咨询主管机关。':'Automatically published; references may not be independently verified. Check with official authorities before investment decisions.'):
    (lang==='ar'?'مراجع تمت مراجعتها قبل النشر؛ تحقّق من المتطلبات الحالية لدى الجهة المختصة.':lang==='zh'?'发布前已审核相关参考资料；请再次核对主管部门的现行要求。':'References reviewed before publishing; verify current rules with the competent authority.')}</small></p>
   {(e.approval_method==='automated'?(e.cited_sources||[]):(e.verified_sources||[])).map((url,i)=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer nofollow">{e.approval_method==='automated'?(lang==='ar'?'مرجع مرتبط غير متحقق':lang==='zh'?'未经核验的参考资料':'Unverified related reference'):(lang==='ar'?'المصدر المراجع':lang==='zh'?'已审核来源':'Reviewed source')} {i+1}</a></p>)}
  </article>)}
 </section>;
}
