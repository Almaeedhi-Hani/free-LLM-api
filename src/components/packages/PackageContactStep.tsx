"use client";
import type {PackageRequestModel} from "./usePackageRequest";

export default function PackageContactStep({t,form,update,error,valid,setError,setStep}:Pick<PackageRequestModel,"t"|"form"|"update"|"error"|"valid"|"setError"|"setStep">) {
 return <form onSubmit={e=>{e.preventDefault();setError(true);if(valid){setStep(2);setError(false)}}}><h2>{t.contact}</h2><label>{t.name} *<input required maxLength={120} value={form.name} onChange={e=>update("name",e.target.value)}/></label><label>{t.email} *<input type="email" required maxLength={200} value={form.email} onChange={e=>update("email",e.target.value)}/></label><label>{t.phone} *<input type="tel" required maxLength={30} value={form.phone} onChange={e=>update("phone",e.target.value)}/></label><label>{t.country}<input maxLength={100} value={form.country} onChange={e=>update("country",e.target.value)}/></label>{error&&!valid&&<p role="alert">{t.valid}</p>}<div className="package-buttons"><button type="button" className="package-secondary" onClick={()=>setStep(0)}>{t.back}</button><button type="submit">{t.next}</button></div></form>;
}
