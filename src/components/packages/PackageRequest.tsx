"use client";
import type {PackageLocale} from "@/lib/package-offers";
import {usePackageRequest} from "./usePackageRequest";
import PackageSelection from "./PackageSelection";
import PackageWizard from "./PackageWizard";

export default function PackageRequest({lang}:{lang:PackageLocale}) {
 const model=usePackageRequest(lang);
 const {t,step}=model;
return <section className="package-page" dir={lang==="ar"?"rtl":"ltr"}>
<header className="package-heading"><p className="eyebrow">INVESTMENT PACKAGES / 10</p><h1>{t.title}</h1><p>{t.intro}</p></header>
 {step===0?<PackageSelection lang={model.lang} t={model.t} license={model.license} setLicense={model.setLicense} offerIndex={model.offerIndex} setOfferIndex={model.setOfferIndex} step={model.step} setStep={model.setStep} group={model.group} offer={model.offer} selectedPackage={model.selectedPackage} groupCopy={model.groupCopy} labels={model.labels} options={model.options}/>:<PackageWizard step={model.step} lang={model.lang} t={model.t} group={model.group} offer={model.offer} selectedPackage={model.selectedPackage} form={model.form} update={model.update} error={model.error} valid={model.valid} setError={model.setError} setStep={model.setStep} website={model.website} setWebsite={model.setWebsite} submitError={model.submitError} submitting={model.submitting} submitRequest={model.submitRequest} savedReference={model.savedReference} setOfferIndex={model.setOfferIndex}/>}
 </section>;
}
