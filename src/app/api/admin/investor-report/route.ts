import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {reportFilters} from "@/lib/investor-report";
import {readInvestorReport} from "@/lib/investor-report-store";
export const dynamic="force-dynamic";
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest){
 const expected=Buffer.from(process.env.ADMIN_SECRET||""),supplied=Buffer.from(req.headers.get("x-admin-secret")||"");
 if(!expected.length||expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return reply({error:"unauthorized"},401);
 const q=req.nextUrl.searchParams,days=q.get("days")??"30",locale=q.get("locale")??"all",page=q.get("page")??"all";
 if(!reportFilters(days,locale,page))return reply({error:"invalid_filters"},400);
 try{return reply(await readInvestorReport(Number(days),locale,page))}catch{return reply({error:"storage_unavailable"},503)}
}
