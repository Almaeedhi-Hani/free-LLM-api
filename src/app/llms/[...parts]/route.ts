import {parseKnowledgePath} from '@/lib/llm-knowledge';
import {serveKnowledge} from '@/lib/llm-knowledge-response';
export const dynamic='force-dynamic';
export const GET=(req:Request,{params}:{params:{parts:string[]}})=>{
 const sel=parseKnowledgePath(params.parts);
 if(!sel)return new Response('Not found\n',{status:404,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
 return serveKnowledge(req,sel,'/llms/'+params.parts.join('/'));
};
export const HEAD=GET;
