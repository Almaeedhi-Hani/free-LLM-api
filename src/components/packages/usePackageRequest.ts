"use client";
import {useState} from "react";
import {packageOffers,packageGroups,type PackageLocale} from "@/lib/package-offers";
import {catalog,words,editorialLabels,start,type License} from "@/lib/packages/request-catalog";

export function usePackageRequest(lang:PackageLocale) {
const t=words[lang];const [license,setLicense]=useState<License|null>(null);const [offerIndex,setOfferIndex]=useState(0);const [step,setStep]=useState(0);const [form,setForm]=useState(start);const [error,setError]=useState(false);const [submitting,setSubmitting]=useState(false);const [submitError,setSubmitError]=useState("");const [savedReference,setSavedReference]=useState("");const [website,setWebsite]=useState("");
const group=catalog[license||"services"];const offer=group.offers[offerIndex]||group.offers[0];const selectedPackage=license ? packageOffers.find(o=>o.slug===license+"-"+offer.id) : null;const groupCopy=license ? packageGroups.find(g=>g.id===license)?.description[lang] : null;const labels=editorialLabels[lang];const update=(key:keyof typeof start,value:string)=>setForm(f=>({...f,[key]:value}));
const valid=!!(form.name.trim()&&form.phone.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email));
async function submitRequest(){
 if(!selectedPackage||submitting)return;
 setSubmitting(true);setSubmitError("");
 try{
  const response=await fetch("/api/package-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,packageSlug:selectedPackage.slug,locale:lang,website,
   sourcePath:new URLSearchParams(window.location.search).get('from')||null})});
  const result=await response.json();
  if(!response.ok||!result.saved)throw Error("save_failed");
  setSavedReference(result.reference);
  setStep(4);
  setForm(start);
 }catch{
  setSubmitError(lang==="ar"?"تعذر حفظ الطلب؛ حاول مرة أخرى.":lang==="zh"?"无法保存申请，请重试。":"Could not save the request; please retry.");
 }finally{setSubmitting(false)}
}
const options:License[]=["services","trading","professional"];
 return {lang,t,license,setLicense,offerIndex,setOfferIndex,step,setStep,form,error,setError,submitting,submitError,savedReference,website,setWebsite,group,offer,selectedPackage,groupCopy,labels,update,valid,submitRequest,options};
}
export type PackageRequestModel=ReturnType<typeof usePackageRequest>;
