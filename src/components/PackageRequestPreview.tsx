"use client";
import { useState, type FormEvent } from "react";
type Step = 1 | 2 | 3 | 4;
const budgets = [
  ["undecided","لم أحدد الميزانية بعد"],
  ["under5","أقل من 5,000 دولار"],
  ["5to20","5,000 – 20,000 دولار"],
  ["20to50","20,000 – 50,000 دولار"],
  ["over50","أكثر من 50,000 دولار"],
] as const;
const services = ["المساعدة في إجراءات ترخيص الاستثمار","إعداد عقد التأسيس والسجل التجاري","حجز الاسم التجاري والتسجيل في المنصات","المساعدة في إجراءات الحساب البنكي والإقامة","دليل دخول السوق ودعم ما بعد التأسيس"];
export default function PackageRequestPreview() {
  const [step,setStep] = useState<Step>(1);
  const [data,setData] = useState({name:"",email:"",phone:"",country:"السعودية",foreignCompany:"yes",activity:"",budget:"undecided",notes:""});
  const [consent,setConsent] = useState(false);
  const update=(key:keyof typeof data,value:string)=>setData(prev=>({...prev,[key]:value}));
  const goNext=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setStep(step===1?2:3)};
  const field=(label:string,key:keyof typeof data,type="text",required=true)=><label className="pkg-field">{label}<input type={type} required={required} value={data[key]} onChange={e=>update(key,e.target.value)} maxLength={key==="notes"?1500:180}/></label>;
  return <div className="pkg-shell">
    <div className="pkg-head"><span className="pkg-kicker">INVESTOR SERVICES / معاينة تجريبية</span><h1>طلب تأسيس شركة في السعودية</h1><p>نموذج توضيحي للمستثمر الذي يمتلك شركة خارج المملكة. لا تُرسل البيانات أو تُحفظ.</p><div className="pkg-progress">{[1,2,3].map(n=><span key={n} className={n<=step?"active":""}>{["بيانات المستثمر","تفاصيل الاستثمار","المراجعة"][n-1]}</span>)}</div></div>
    {step===1&&<form className="pkg-body" onSubmit={goNext}><h2>بيانات المستثمر</h2>{field("الاسم الكامل *","name")}{field("البريد الإلكتروني *","email","email")}{field("رقم الهاتف مع مفتاح الدولة *","phone","tel")}<label className="pkg-field">دولة الإقامة<select value={data.country} onChange={e=>update("country",e.target.value)}>{["السعودية","الإمارات","مصر","الصين","دولة أخرى"].map(x=><option key={x}>{x}</option>)}</select></label><button className="pkg-button">التالي: تفاصيل الاستثمار ←</button></form>}
    {step===2&&<form className="pkg-body" onSubmit={goNext}><h2>تفاصيل الاستثمار</h2><fieldset><legend>هل تمتلك شركة قائمة خارج السعودية؟</legend>{[["yes","نعم"],["no","لا"],["unsure","لست متأكدًا"]].map(([value,label])=><label className="pkg-choice" key={value}><input type="radio" checked={data.foreignCompany===value} onChange={()=>update("foreignCompany",value)}/>{label}</label>)}</fieldset>{data.foreignCompany==="no"&&<p className="pkg-note">قد تكون باقة تأسيس كيان سعودي جديد أنسب؛ يرجى مراجعة الأهلية.</p>}{field("النشاط التجاري المقترح *","activity")}<fieldset><legend>الميزانية الاستثمارية المتوقعة</legend>{budgets.map(([value,label])=><label className="pkg-choice" key={value}><input type="radio" checked={data.budget===value} onChange={()=>update("budget",value)}/>{label}</label>)}</fieldset><p className="pkg-muted">الميزانية الاستثمارية منفصلة عن رسوم الخدمة.</p><label className="pkg-field">معلومات إضافية (اختياري)<textarea value={data.notes} maxLength={1500} onChange={e=>update("notes",e.target.value)} rows={4}/></label><div className="pkg-actions"><button type="button" className="pkg-secondary" onClick={()=>setStep(1)}>السابق</button><button className="pkg-button">مراجعة الطلب ←</button></div></form>}
    {step===3&&<div className="pkg-body"><h2>مراجعة الطلب</h2><div className="pkg-review"><h3>تأسيس شركة في السعودية</h3><p>السعر: يحدد لاحقًا</p>{[["الاسم",data.name],["البريد",data.email],["الهاتف",data.phone],["الدولة",data.country],["شركة أجنبية",data.foreignCompany==="yes"?"نعم":data.foreignCompany==="no"?"لا":"غير متأكد"],["النشاط",data.activity],["الميزانية",budgets.find(b=>b[0]===data.budget)?.[1]||""],["ملاحظات",data.notes||"—"]].map(([k,v])=><div className="pkg-review-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}</div><h3>الخدمات الأساسية المقترحة</h3><ul className="pkg-services">{services.map(s=><li key={s}>{s}</li>)}</ul><p className="pkg-muted">الأهلية والرسوم والخدمات النهائية تخضع للمراجعة والاتفاق.</p><label className="pkg-choice"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>أفهم أن هذه معاينة فقط ولن يُرسل طلب حقيقي.</label><div className="pkg-actions"><button className="pkg-secondary" onClick={()=>setStep(2)}>تعديل</button><button className="pkg-button" disabled={!consent} onClick={()=>setStep(4)}>إتمام المعاينة ✓</button></div></div>}
    {step===4&&<div className="pkg-body pkg-done"><h2>اكتملت المعاينة</h2><p>لم يتم إرسال الطلب أو تخزين أي بيانات. ستُفعّل الطلبات الحقيقية بعد اعتماد نظام الحفظ ولوحة الإدارة.</p><button className="pkg-button" onClick={()=>{setStep(1);setConsent(false)}}>العودة للنموذج</button></div>}
  </div>;
}
