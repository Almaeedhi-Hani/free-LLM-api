import {getSupabaseCredentials} from "@/lib/storage-mode";
import type {InvestorSignal} from "@/lib/investor-events";
import type {InvestorReport} from "@/lib/investor-report";
async function rpc(name:string,body:Record<string,unknown>){
 const credentials=getSupabaseCredentials();if(!credentials)throw Error("analytics_storage_unavailable");
 const response=await fetch(credentials.url+"/rest/v1/rpc/"+name,{method:"POST",headers:{apikey:credentials.key,Authorization:"Bearer "+credentials.key,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error("analytics_storage_unavailable");return response;
}
export async function saveInvestorSignal(signal:InvestorSignal){
 // Preserve the no-credentials isolated browser fixture. Never pretend to persist in production.
 if(!getSupabaseCredentials()&&process.env.NODE_ENV!=="production"){console.info("investor_signal_fixture",JSON.stringify(signal));return}
 await rpc("increment_investor_daily_signal",{p_page:signal.page,p_locale:signal.locale,p_event:signal.event});
}
export async function readInvestorReport(days:number,locale:string,page:string):Promise<InvestorReport>{
 const response=await rpc("read_investor_daily_report",{p_days:days,p_locale:locale,p_page:page});
 const report=await response.json();
 if(!report||!Array.isArray(report.signals)||!Array.isArray(report.requests)||typeof report.from!=="string"||typeof report.to!=="string")throw Error("invalid_report");
 return report;
}
