"use client";
import PackageArrow from "./PackageArrow";
import type {PackageRequestModel} from "./usePackageRequest";

export default function PackageSuccessStep({lang,t,savedReference,setStep,setOfferIndex}:Pick<PackageRequestModel,"lang"|"t"|"savedReference"|"setStep"|"setOfferIndex">) {
 return <div role="status"><h2>{lang==="ar"?"تم إرسال طلبك بنجاح، وسنتواصل معك قريبًا.":lang==="zh"?"申请已提交成功，我们会尽快联系您。":"Your request was submitted successfully. We will contact you soon."}</h2><p>{savedReference}</p><button type="button" onClick={()=>{setStep(0);setOfferIndex(0)}}><PackageArrow direction="back"/> {t.back}</button></div>;
}
