import type { EditorialItem,EditorialKind,EditorialLocale } from "@/lib/editorial-workflow";
import {approvedEditorial} from "@/lib/editorial-workflow";
import {topicRelatedLiveNodes} from "@/lib/content-tree";
import {localizedPath} from "@/lib/site-language";
/** Editorial placements reuse existing site classes and do not alter original cards. */
export function EditorialBlock({items,lang,kind,target,inside=false}:{items:EditorialItem[]|undefined;lang:EditorialLocale;kind:EditorialKind;target:string;inside?:boolean}){
 const active=approvedEditorial(items,lang,kind,target);
 if(active.length===0)return null;
 return <section className={inside?"service-context-band":"editorial-note section-wrap"} aria-label={lang==='ar'?'محتوى تحريري موثّق':lang==='zh'?'已审核的编辑资料':'Reviewed editorial guidance'}>
  {active.map(e=><article key={e.id}>
   <p className="eyebrow">{lang==='ar'?'دليل عملي':lang==='zh'?'实用指南':'PRACTICAL GUIDANCE'}</p>
   <h2>{e.title}</h2><p>{e.summary}</p>
   {e.body.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}
   {(e.sections||[]).map((section,i)=><section key={i}><h3>{section.h2}</h3><p>{section.body}</p>{(section.subsections||[]).map((sub,j)=><div key={j}><h4>{sub.h3}</h4><p>{sub.body}</p></div>)}</section>)}
   {e.topic_node_id&&topicRelatedLiveNodes(e.topic_node_id).filter(node=>node.route!==target&&node.route!=="/insights").slice(0,3).map(node=><p key={node.id}><a href={localizedPath(lang,node.route!)}>{node.primary_keyword[lang]}</a></p>)}
   <p><small>{lang==='ar'?'مراجع تمت مراجعتها قبل النشر؛ تحقّق من المتطلبات الحالية لدى الجهة المختصة.':lang==='zh'?'发布前已审核相关参考资料；请再次核对主管部门的现行要求。':'References reviewed before publishing; verify current rules with the competent authority.'}</small></p>
   {(e.verified_sources||[]).map((url,i)=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer">{lang==='ar'?'المصدر المراجع':lang==='zh'?'已审核来源':'Reviewed source'} {i+1}</a></p>)}
  </article>)}
 </section>;
}
