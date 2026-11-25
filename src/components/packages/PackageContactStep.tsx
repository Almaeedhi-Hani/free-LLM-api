"use client";
import PackageArrow from "./PackageArrow";
import type {PackageRequestModel} from "./usePackageRequest";

export default function PackageContactStep({t,form,update,error,valid,setError,setStep}:Pick<PackageRequestModel,"t"|"form"|"update"|"error"|"valid"|"setError"|"setStep">) {
 return <form onSubmit={e=>{e.preventDefault();setError(true);if(valid){setStep(2);setError(false)}}}><h2>{t.contact}</h2><label>{t.name} *<input autoComplete="name" required maxLength={120} value={form.name} onChange={e=>update("name",e.target.value)}/></label><label>{t.email} *<input type="email" autoComplete="email" required maxLength={200} value={form.email} onChange={e=>update("email",e.target.value)}/></label><label>{t.phone} *<input type="tel" autoComplete="tel" required maxLength={30} value={form.phone} onChange={e=>update("phone",e.target.value)}/></label><label>{t.country}<input autoComplete="country-name" maxLength={100} value={form.country} onChange={e=>update("country",e.target.value)}/></label>{error&&!valid&&<p role="alert">{t.valid}</p>}<div className="package-buttons"><button type="button" className="package-secondary" onClick={()=>setStep(0)}><PackageArrow direction="back"/> {t.back}</button><button type="submit">{t.next} <PackageArrow direction="forward"/></button></div></form>;
}
