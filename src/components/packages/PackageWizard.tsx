"use client";
import type {PackageRequestModel} from "./usePackageRequest";
import {money} from "@/lib/packages/request-catalog";
import PackageContactStep from "./PackageContactStep";
import PackageInvestmentStep from "./PackageInvestmentStep";
import PackageReviewStep from "./PackageReviewStep";
import PackageSuccessStep from "./PackageSuccessStep";
export default function PackageWizard({step,lang,t,group,offer,selectedPackage,form,update,error,valid,setError,setStep,website,setWebsite,submitError,submitting,submitRequest,savedReference,setOfferIndex}:Pick<PackageRequestModel,"step"|"lang"|"t"|"group"|"offer"|"selectedPackage"|"form"|"update"|"error"|"valid"|"setError"|"setStep"|"website"|"setWebsite"|"submitError"|"submitting"|"submitRequest"|"savedReference"|"setOfferIndex">) {
 const steps=[t.contact,t.investment,t.review];const title=selectedPackage?.title[lang]||(lang==="ar"?offer.ar:offer.name);
 return <section className="package-form"><ol className="investor-wizard-steps" aria-label={lang==="ar"?"مراحل الطلب":lang==="zh"?"申请步骤":"Request steps"}>{steps.map((label,i)=><li key={label} data-complete={step>i+1} aria-current={step===i+1?"step":undefined}><span aria-hidden="true">{step>i+1?"✓":i+1}</span>{label}</li>)}</ol><div className="package-progress"><span>{Math.min(step,3)} / 3</span><strong>{group[lang]} — {title}</strong><span dir="ltr">{money(offer.price)} SAR</span></div>
{step===1?<PackageContactStep t={t} form={form} update={update} error={error} valid={valid} setError={setError} setStep={setStep}/>:null}
{step===2?<PackageInvestmentStep t={t} form={form} update={update} setStep={setStep}/>:null}
{step===3?<PackageReviewStep lang={lang} t={t} form={form} group={group} offer={offer} selectedPackage={selectedPackage} website={website} setWebsite={setWebsite} submitError={submitError} submitting={submitting} setStep={setStep} submitRequest={submitRequest}/>:null}
{step===4?<PackageSuccessStep lang={lang} t={t} savedReference={savedReference} setStep={setStep} setOfferIndex={setOfferIndex}/>:null}
 </section>;
}
