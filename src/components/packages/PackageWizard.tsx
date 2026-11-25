"use client";
import type {PackageRequestModel} from "./usePackageRequest";
import {money} from "@/lib/packages/request-catalog";
import PackageContactStep from "./PackageContactStep";
import PackageInvestmentStep from "./PackageInvestmentStep";
import PackageReviewStep from "./PackageReviewStep";
import PackageSuccessStep from "./PackageSuccessStep";
export default function PackageWizard({step,lang,t,group,offer,form,update,error,valid,setError,setStep,website,setWebsite,submitError,submitting,submitRequest,savedReference,setOfferIndex}:Pick<PackageRequestModel,"step"|"lang"|"t"|"group"|"offer"|"form"|"update"|"error"|"valid"|"setError"|"setStep"|"website"|"setWebsite"|"submitError"|"submitting"|"submitRequest"|"savedReference"|"setOfferIndex">) {
 return <section className="package-form"><div className="package-progress"><span>{Math.min(step,3)} / 3</span><strong>{group[lang]} — {lang==="ar"?offer.ar:offer.name}</strong><span dir="ltr">{money(offer.price)} SAR</span></div>
{step===1?<PackageContactStep t={t} form={form} update={update} error={error} valid={valid} setError={setError} setStep={setStep}/>:null}
{step===2?<PackageInvestmentStep t={t} form={form} update={update} setStep={setStep}/>:null}
{step===3?<PackageReviewStep lang={lang} t={t} form={form} group={group} offer={offer} website={website} setWebsite={setWebsite} submitError={submitError} submitting={submitting} setStep={setStep} submitRequest={submitRequest}/>:null}
{step===4?<PackageSuccessStep lang={lang} t={t} savedReference={savedReference} setStep={setStep} setOfferIndex={setOfferIndex}/>:null}
 </section>;
}
