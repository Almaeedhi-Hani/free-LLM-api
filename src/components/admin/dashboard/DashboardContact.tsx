'use client';
import type {ContactForm} from "@/lib/admin/dashboard/contact-form";
type Props={contactForm:ContactForm;setContactForm:(value:ContactForm)=>void;saveContact:()=>void;saving:boolean};

export default function DashboardContact({contactForm,setContactForm,saveContact,saving}:Props) {
  return <>
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-2">بيانات التواصل للزوار</h2><p className="text-sm text-slate-500 mb-4">تُطبّق التغييرات على معلومات التواصل المعروضة في الموقع بعد الحفظ.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="الهاتف" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="رقم الهاتف المعروض للزوار" aria-label="الهاتف المعروض" value={contactForm.phoneDisplay} onChange={(e) => setContactForm({ ...contactForm, phoneDisplay: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="https://wa.me/9665XXXXXXXX" aria-label="رابط واتساب" value={contactForm.whatsapp} onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="name@example.com" aria-label="البريد الإلكتروني" type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <div className="mt-5 rounded-2xl border border-[#d7d5c4] bg-[#fafaf5] p-4 sm:p-5">
                  <h3 className="text-lg font-bold text-[#193e37]">المستشارون والمتحدثون باللغات</h3>
                  <p className="mt-1 text-sm leading-7 text-slate-600">أدخل اسم المسؤول، منصبه، ورقم واتساب الخاص به لكل لغة. ستظهر البيانات في بطاقة مستقلة بالقائمة العائمة. يمكن ترك الاسم أو المنصب فارغًا حتى إدخال البيانات الحقيقية. رقم اللغة الفارغ يستخدم الرقم العام.</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {([
                      {lang:'العربية',nameKey:'advisorNameAr',titleKey:'advisorTitleAr',numberKey:'whatsappAr',accent:'AR'},
                      {lang:'English',nameKey:'advisorNameEn',titleKey:'advisorTitleEn',numberKey:'whatsappEn',accent:'EN'},
                      {lang:'中文',nameKey:'advisorNameZh',titleKey:'advisorTitleZh',numberKey:'whatsappZh',accent:'ZH'}
                    ] as const).map(({lang,nameKey,titleKey,numberKey,accent})=>
                      <div key={accent} className="rounded-xl border border-[#d7dfd6] bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-lg bg-[#173f38] px-2 py-1 text-xs font-bold text-white">{accent}</span>
                          <strong className="text-sm text-[#173f38]">متحدث باللغة {lang}</strong>
                        </div>
                        <label className="block text-xs font-semibold text-[#426056]">
                          اسم المسؤول
                          <input type="text" maxLength={80} aria-label={'اسم المسؤول - '+lang}
                            placeholder="اسم المستشار" value={contactForm[nameKey]}
                            onChange={e=>setContactForm({...contactForm,[nameKey]:e.target.value})}
                            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900" />
                        </label>
                        <label className="mt-3 block text-xs font-semibold text-[#426056]">
                          المنصب / المسمى الوظيفي
                          <input type="text" maxLength={100} aria-label={'منصب المسؤول - '+lang}
                            placeholder="مثال: مستشار خدمات المستثمرين" value={contactForm[titleKey]}
                            onChange={e=>setContactForm({...contactForm,[titleKey]:e.target.value})}
                            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900" />
                        </label>
                        <label className="mt-3 block text-xs font-semibold text-[#426056]">
                          رقم واتساب الدولي
                          <input type="tel" dir="ltr" inputMode="tel" autoComplete="off"
                            aria-label={'رقم واتساب '+lang} placeholder="+9665XXXXXXXX"
                            value={contactForm[numberKey]}
                            onChange={e=>setContactForm({...contactForm,[numberKey]:e.target.value})}
                            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-left text-sm text-slate-900" />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={saveContact} className="btn-primary mt-4" disabled={saving}>حفظ التواصل</button>
                <p className="text-xs text-slate-500 mt-2">أدخل رابط WhatsApp كاملاً بصيغة https://wa.me/966... حتى يعمل زر التواصل في الموقع.</p>
              </section>
  </>;
}
