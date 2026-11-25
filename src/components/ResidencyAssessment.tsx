"use client";
import {useState} from "react";
import {products} from "@/lib/premium-residency-content";
import styles from "./PremiumResidencyPage.module.css";
const copy={
ar:{title:"ابدأ تقييم مسارك",intro:"ثلاثة أسئلة لتحديد المسار الذي يستحق الدراسة.",goal:"ما هدفك؟",location:"أين تقيم حاليًا؟",timing:"متى ترغب في التقديم؟",inside:"داخل السعودية",outside:"خارج السعودية",soon:"في أقرب وقت",later:"خلال 3 أشهر",research:"أستكشف الخيارات",choose:"اختر إجابتك",submit:"اعرض المسار المقترح",result:"نتيجة تقييمك الأولي",notice:"تقييم استرشادي لا يؤكد الأهلية ولا يضمن الموافقة.",cta:"تواصل مع مستشار الإقامة المميزة",edit:"تعديل الإجابات",ready:"ناقش جاهزية مستنداتك ومتطلبات المسار مع فريقنا.",lawful:"عند التقديم من داخل المملكة يلزم إثبات الإقامة النظامية.",message:"مرحبًا، أرغب في استشارة بشأن الإقامة المميزة."},
en:{title:"Find your residency route",intro:"Three questions to identify a route worth exploring.",goal:"What is your goal?",location:"Where do you live?",timing:"When do you plan to apply?",inside:"Inside Saudi Arabia",outside:"Outside Saudi Arabia",soon:"As soon as possible",later:"Within 3 months",research:"Exploring options",choose:"Select an answer",submit:"Show suggested route",result:"Your preliminary assessment",notice:"Indicative guidance only; eligibility and approval are not guaranteed.",cta:"Contact a residency adviser",edit:"Edit answers",ready:"Discuss document readiness and route requirements with our team.",lawful:"Applicants inside Saudi Arabia must demonstrate lawful residency.",message:"Hello, I would like advice on Saudi Premium Residency."},
zh:{title:"评估您的居留路径",intro:"回答三个问题，了解值得进一步研究的路径。",goal:"您的目标是什么？",location:"您目前居住在哪里？",timing:"您计划何时申请？",inside:"沙特境内",outside:"沙特境外",soon:"尽快",later:"三个月内",research:"了解选项",choose:"请选择",submit:"查看建议路径",result:"您的初步评估",notice:"仅供参考，不确认资格或保证获批。",cta:"联系高级居留顾问",edit:"修改答案",ready:"与我们的团队讨论材料准备和路径要求。",lawful:"在沙特境内申请须证明合法居留。",message:"您好，我想咨询沙特高级居留。"}
};
export default function ResidencyAssessment({lang,whatsapp}:{lang:"ar"|"en"|"zh";whatsapp?:string|null}){
const t=copy[lang];const [goal,setGoal]=useState("");const [location,setLocation]=useState("");const [timing,setTiming]=useState("");const [show,setShow]=useState(false);
const product=products.find(p=>p.id===goal);
const place=location==="inside"?t.inside:t.outside;
const when=timing==="soon"?t.soon:timing==="later"?t.later:t.research;
let href:string|undefined;
if(whatsapp&&product){const u=new URL(whatsapp);u.searchParams.set("text",[t.message,t.goal+" "+product.name[lang],t.location+" "+place,t.timing+" "+when,t.ready].join("\n"));href=u.toString();}
return <section id="assessment" className={styles.assessment}><h2>{t.title}</h2><p>{t.intro}</p>
{!show?<form onSubmit={e=>{e.preventDefault();if(product&&location&&timing){setShow(true);window.dispatchEvent(new Event("investor-assessment-complete"));}}} className={styles.assessmentForm}>
<label>{t.goal}<select required value={goal} onChange={e=>setGoal(e.target.value)}><option value="">{t.choose}</option>{products.map(p=><option key={p.id} value={p.id}>{p.name[lang]}</option>)}</select></label>
<label>{t.location}<select required value={location} onChange={e=>setLocation(e.target.value)}><option value="">{t.choose}</option><option value="inside">{t.inside}</option><option value="outside">{t.outside}</option></select></label>
<label>{t.timing}<select required value={timing} onChange={e=>setTiming(e.target.value)}><option value="">{t.choose}</option><option value="soon">{t.soon}</option><option value="later">{t.later}</option><option value="research">{t.research}</option></select></label>
<button className="action-primary" type="submit">{t.submit}</button></form>:product&&<div className={styles.assessmentResult} aria-live="polite"><p>{t.result}</p><h3>{product.name[lang]}</h3><dl><dt>{t.goal}</dt><dd>{product.name[lang]}</dd><dt>{t.location}</dt><dd>{place}</dd><dt>{t.timing}</dt><dd>{when}</dd></dl><p>{product.eligibility[lang]}</p>{location==="inside"&&<p>{t.lawful}</p>}<p>{t.ready}</p><div className={styles.actions}>{href&&<a className="action-primary" href={href} target="_blank" rel="noopener noreferrer">{t.cta}</a>}<button type="button" className={styles.secondary} onClick={()=>setShow(false)}>{t.edit}</button></div></div>}
<p className={styles.note}>{t.notice}</p></section>;
}
