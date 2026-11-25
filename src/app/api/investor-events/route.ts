import {NextRequest,NextResponse} from "next/server";
import {CONSENT_NAME,parseConsent,validateInvestorSignal} from "@/lib/investor-events";
import {saveInvestorSignal} from "@/lib/investor-report-store";
import {getContent} from "@/lib/content-store";
export const dynamic="force-dynamic";
let minute=-1,accepted=0;
const empty=(status:number)=>new NextResponse(null,{status,headers:{"Cache-Control":"no-store"}});
async function boundedBody(req:NextRequest){
 if(Number(req.headers.get("content-length")||0)>256||!req.body)return null;
 const reader=req.body.getReader();let total=0;const decoder=new TextDecoder();let body="";
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>256){await reader.cancel();return null}body+=decoder.decode(value,{stream:true})}return body+decoder.decode()}
 finally{reader.releaseLock()}
}
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 let configuredOrigin:string|null=null;try{configuredOrigin=new URL(process.env.SITE_URL||"https://free-llm-api-1-didl.onrender.com").origin}catch{}
 if(!origin||(origin!==req.nextUrl.origin&&origin!==configuredOrigin)||req.headers.get("sec-fetch-site")==="cross-site")return empty(403);
 if(!parseConsent(req.cookies.get(CONSENT_NAME)?.value))return empty(403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return empty(415);
 let signal;try{const raw=await boundedBody(req);if(!raw)return empty(413);signal=validateInvestorSignal(JSON.parse(raw))}catch{return empty(400)}
 if(!signal)return empty(400);
 const now=Math.floor(Date.now()/60000);if(minute!==now){minute=now;accepted=0}
 if(accepted>=120)return empty(429);
 accepted++;
 try{const content=await getContent();if(!content.cookiePolicy.analyticsAvailable)return empty(403)}catch{return empty(503)}
 try{await saveInvestorSignal(signal)}catch{console.warn("investor_signal_storage_unavailable");return empty(503)}
 return empty(204);
}
